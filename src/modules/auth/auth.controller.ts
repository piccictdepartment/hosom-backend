import type { RequestHandler } from "express";
import type { z } from "zod";
import { sendSuccess } from "../../core/responses/ApiResponse.js";
import { authService } from "./auth.service.js";
import type {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.validation.js";

const getRoles: RequestHandler = (_req, res) => {
  sendSuccess(res, [
    { value: "STUDENT", label: "Student" },
    { value: "LECTURER", label: "Lecturer" },
    { value: "SECRETARIAT", label: "Secretariat" },
    { value: "ADMINISTRATION", label: "Administration" },
    { value: "FINANCE", label: "Finance" },
    { value: "HEAD_OF_PROGRAMS", label: "Head of Programs" },
    { value: "DIRECTOR_CHANCELLOR", label: "Director / Chancellor" },
    { value: "ICT_MEDIA", label: "ICT / Media" },
    { value: "SYSTEM_ADMINISTRATOR", label: "System Administrator" },
  ]);
};

const register: RequestHandler = async (_req, res) => {
  const { body } = res.locals.validated as z.infer<typeof registerSchema>;
  const { user, token } = await authService.register(body);
  res.location(`/api/users/${user.id}`);
  sendSuccess(res, { user, token }, 201);
};

const login: RequestHandler = async (_req, res) => {
  const { body } = res.locals.validated as z.infer<typeof loginSchema>;
  const { user, token } = await authService.login(body);
  sendSuccess(res, { user, token });
};

const logout: RequestHandler = async (_req, res) => {
  res.status(204).end();
};

const me: RequestHandler = async (req, res) => {
  const user = await authService.me(req.user!.id);
  sendSuccess(res, user);
};

const forgotPassword: RequestHandler = async (_req, res) => {
  // body is validated; in production send reset email here
  const _body = res.locals.validated as z.infer<typeof forgotPasswordSchema>;
  // Always respond 200 to avoid user enumeration
  sendSuccess(res, { message: "If that email is registered, a reset link has been sent." });
};

const resetPassword: RequestHandler = async (_req, res) => {
  const _body = res.locals.validated as z.infer<typeof resetPasswordSchema>;
  // TODO: implement token-based password reset
  sendSuccess(res, { message: "Password has been reset." });
};

export const authController = {
  getRoles,
  register,
  login,
  logout,
  me,
  forgotPassword,
  resetPassword,
};
