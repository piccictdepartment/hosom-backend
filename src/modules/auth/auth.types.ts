import type { Role } from "../../generated/prisma/client.js";

export type { TokenPayload } from "../../core/security/jwt.js";

export interface AuthSessionContext {
  userAgent?: string | null;
  ipAddress?: string | null;
}

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

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}
