import type { Role } from "../../generated/prisma/client.js";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  role?: Role;
}

export type UpdateUserInput = Partial<Pick<CreateUserInput, "name" | "email" | "role">>;

export interface ListUsersInput {
  page: number;
  limit: number;
}
