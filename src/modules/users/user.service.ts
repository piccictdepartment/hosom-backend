import { randomBytes } from "node:crypto";
import { AppError } from "../../core/errors/AppError.js";
import { hashPassword } from "../../core/security/password.js";
import { userRepository } from "./user.repository.js";
import type { ListUsersInput, UpdateUserInput } from "./user.types.js";
import type { Role } from "../../generated/prisma/client.js";

interface AdminCreateUserInput {
  firstName: string;
  middleName?: string | null;
  surname: string;
  email: string;
  phone?: string | null;
  role?: Role;
}

export const userService = {
  async create(input: AdminCreateUserInput) {
    // Admin provisioning: generate a temporary random password
    const tempPassword = randomBytes(16).toString("hex");
    const passwordHash = await hashPassword(tempPassword);
    return userRepository.create({ ...input, passwordHash });
  },

  async list(input: ListUsersInput) {
    const { users, total } = await userRepository.findMany(input);
    return {
      users,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.ceil(total / input.limit),
      },
    };
  },

  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");
    return user;
  },

  async update(id: string, input: UpdateUserInput) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new AppError(404, "USER_NOT_FOUND", "User not found");
    return userRepository.update(id, input);
  },

  async delete(id: string) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new AppError(404, "USER_NOT_FOUND", "User not found");
    await userRepository.delete(id);
  },
};
