import { prisma } from "../../config/database.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { ListStudentsQuery } from "./student.types.js";

const userSelect = {
  id: true,
  firstName: true,
  middleName: true,
  surname: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  loggedInAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const studentInclude = {
  user: { select: userSelect },
  enrollments: {
    select: {
      id: true,
      status: true,
      enrolledAt: true,
      course: {
        select: {
          id: true,
          code: true,
          title: true,
          credits: true,
        },
      },
    },
  },
} as const;

export const studentRepository = {
  findByUserId(userId: string) {
    return prisma.student.findUnique({
      where: { userId },
      include: studentInclude,
    });
  },

  findById(id: string) {
    return prisma.student.findUnique({
      where: { id },
      include: studentInclude,
    });
  },

  findByStudentNumber(studentNumber: string) {
    return prisma.student.findUnique({
      where: { studentNumber },
      include: studentInclude,
    });
  },

  async findMany({ page = 1, limit = 20, search, status, program }: ListStudentsQuery) {
    const where: Prisma.StudentWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (program) {
      where.program = { contains: program };
    }

    if (search) {
      where.OR = [
        { studentNumber: { contains: search } },
        { program: { contains: search } },
        { user: { firstName: { contains: search } } },
        { user: { middleName: { contains: search } } },
        { user: { surname: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
    }

    const [students, total] = await prisma.$transaction([
      prisma.student.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          user: { select: userSelect },
        },
      }),
      prisma.student.count({ where }),
    ]);

    return { students, total };
  },

  updateStudentAndUser(
    id: string,
    studentData: Prisma.StudentUpdateInput,
    userData?: Prisma.UserUpdateInput,
  ) {
    return prisma.student.update({
      where: { id },
      data: {
        ...studentData,
        ...(userData && Object.keys(userData).length > 0
          ? { user: { update: userData } }
          : {}),
      },
      include: studentInclude,
    });
  },

  delete(id: string) {
    return prisma.student.delete({ where: { id } });
  },
};
