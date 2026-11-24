import { prisma } from "../../config/database.js";
import type { CreateStudentInput, UpdateStudentInput } from "./student.types.js";

const userSelect = {
  id: true,
  firstName: true,
  middleName: true,
  surname: true,
  email: true,
  phone: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const studentRepository = {
  create(data: CreateStudentInput) {
    return prisma.student.create({
      data,
      include: {
        user: { select: userSelect },
      },
    });
  },

  findByUserId(userId: string) {
    return prisma.student.findUnique({
      where: { userId },
      include: {
        user: { select: userSelect },
      },
    });
  },

  findById(id: string) {
    return prisma.student.findUnique({
      where: { id },
      include: {
        user: { select: userSelect },
      },
    });
  },

  findByStudentNumber(studentNumber: string) {
    return prisma.student.findUnique({
      where: { studentNumber },
      include: {
        user: { select: userSelect },
      },
    });
  },

  async findMany({ page = 1, limit = 20 }: { page?: number; limit?: number }) {
    const [students, total] = await prisma.$transaction([
      prisma.student.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          user: { select: userSelect },
        },
      }),
      prisma.student.count(),
    ]);
    return { students, total };
  },

  update(id: string, data: UpdateStudentInput) {
    return prisma.student.update({
      where: { id },
      data,
      include: {
        user: { select: userSelect },
      },
    });
  },

  updateByUserId(userId: string, data: UpdateStudentInput) {
    return prisma.student.update({
      where: { userId },
      data,
      include: {
        user: { select: userSelect },
      },
    });
  },

  delete(id: string) {
    return prisma.student.delete({ where: { id } });
  },
};
