import type { Role } from "../../generated/prisma/client.js";

export type { TokenPayload } from "../../core/security/jwt.js";

export interface RegisterInput {
  firstName: string;
  middleName?: string | null;
  surname: string;
  email: string;
  phone?: string | null;
  password: string;
  role?: Role;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}
