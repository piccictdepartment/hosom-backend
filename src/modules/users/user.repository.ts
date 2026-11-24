import { prisma } from "../../config/database.js";
import type { CreateUserInput, ListUsersInput, UpdateUserInput } from "./user.types.js";

// Fields safe to expose — never includes passwordHash or refreshToken
export const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
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
    return prisma.user.findUnique({ where: { email } });
  },

  update(id: string, data: UpdateUserInput) {
    return prisma.user.update({ where: { id }, data, select: safeUserSelect });
  },

  delete(id: string) {
    return prisma.user.delete({ where: { id }, select: { id: true } });
  },
};
