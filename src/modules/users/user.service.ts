import { AppError } from "../../core/errors/AppError.js";
import { userRepository } from "./user.repository.js";
import type { CreateUserInput, ListUsersInput, UpdateUserInput } from "./user.types.js";

export const userService = {
  create(input: CreateUserInput) {
    // The database unique constraint also protects concurrent requests.
    return userRepository.create(input);
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

  update(id: string, input: UpdateUserInput) {
    return userRepository.update(id, input);
  },

  async delete(id: string) {
    await userRepository.delete(id);
  },
};
