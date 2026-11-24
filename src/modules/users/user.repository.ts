import { prisma } from "../../config/database.js";
import type { CreateUserInput, ListUsersInput, UpdateUserInput } from "./user.types.js";

// Fields safe to expose — never includes passwordHash
export const safeUserSelect = {
  id: true,
  firstName: true,
  middleName: true,
  surname: true,
  email: true,
  phone: true,
  role: true,
  loggedInAt: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: {
      id: true,
      studentNumber: true,
      gender: true,
      dateOfBirth: true,
      address: true,
      guardianName: true,
      guardianPhone: true,
      program: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} as const;

export const userRepository = {
  create(data: CreateUserInput) {
    return prisma.user.create({ data, select: safeUserSelect });
  },

  async findMany({ page, limit }: ListUsersInput) {
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        select: safeUserSelect,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
      prisma.user.count(),
    ]);
    return { users, total };
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: safeUserSelect });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, select: safeUserSelect });
  },

  findByEmailWithCredentials(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        student: true,
      },
    });
  },

  update(id: string, data: UpdateUserInput) {
    return prisma.user.update({ where: { id }, data, select: safeUserSelect });
  },

  updateLoggedInAt(id: string, loggedInAt: Date = new Date()) {
    return prisma.user.update({
      where: { id },
      data: { loggedInAt },
      select: { id: true, loggedInAt: true },
    });
  },

  delete(id: string) {
    return prisma.user.delete({ where: { id }, select: { id: true } });
  },
};
