import { prisma } from "../../config/database.js";
import type { CreateUserInput, ListUsersInput, UpdateUserInput } from "./user.types.js";

export const userRepository = {
  create(data: CreateUserInput) {
    return prisma.user.create({ data });
  },

  async findMany({ page, limit }: ListUsersInput) {
    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
      prisma.user.count(),
    ]);
    return { users, total };
  },

  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  update(id: string, data: UpdateUserInput) {
    return prisma.user.update({ where: { id }, data });
  },

  delete(id: string) {
    return prisma.user.delete({ where: { id } });
  },
};
