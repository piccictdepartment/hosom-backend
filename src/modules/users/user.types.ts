import type { Role } from "../../generated/prisma/client.js";

export interface SafeUser {
  id: string;
  firstName: string;
  middleName: string | null;
  surname: string;
  email: string;
  phone: string | null;
  role: Role;
  loggedInAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  firstName: string;
  middleName?: string | null;
  surname: string;
  email: string;
  phone?: string | null;
  passwordHash: string;
  role?: Role;
}

export type UpdateUserInput = Partial<
  Pick<CreateUserInput, "firstName" | "middleName" | "surname" | "email" | "phone" | "role">
>;

export interface ListUsersInput {
  page: number;
  limit: number;
}
