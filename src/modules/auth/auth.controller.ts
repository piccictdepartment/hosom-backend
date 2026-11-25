import type { RequestHandler } from "express";
import type { z } from "zod";
import { sendSuccess } from "../../core/responses/ApiResponse.js";
import { authService } from "./auth.service.js";
import type {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  sessionParamSchema,
} from "./auth.validation.js";

const getRoles: RequestHandler = (_req, res) => {
  sendSuccess(res, [
    { value: "STUDENT", label: "Student" },
    { value: "LECTURER", label: "Lecturer" },
    { value: "SECRETARIAT", label: "Secretariat" },
    { value: "ADMINISTRATION", label: "Administration" },
    { value: "FINANCE", label: "Finance" },
    { value: "HEAD_OF_PROGRAMS", label: "Head of Programs" },
    { value: "HEAD_OF_HOSOM", label: "Head of HOSOM" },
    { value: "DIRECTOR", label: "Director / Chancellor" },
    { value: "MEDIA", label: "ICT / Media" },
    { value: "SYSTEM_ADMIN", label: "System Administrator" },
  ]);
};

const register: RequestHandler = async (req, res) => {
  const { body } = res.locals.validated as z.infer<typeof registerSchema>;
  const { user, token, sessionId, expiresAt } = await authService.register(body, {
    userAgent: req.get("user-agent") ?? null,
    ipAddress: req.ip ?? null,
  });
  res.location(`/api/users/${user.id}`);
  sendSuccess(res, { user, token, sessionId, expiresAt }, 201);
};

const login: RequestHandler = async (req, res) => {
  const { body } = res.locals.validated as z.infer<typeof loginSchema>;
  const { user, token, sessionId, expiresAt } = await authService.login(body, {
    userAgent: req.get("user-agent") ?? null,
    ipAddress: req.ip ?? null,
  });
  sendSuccess(res, { user, token, sessionId, expiresAt });
};

const logout: RequestHandler = async (req, res) => {
  await authService.logout(req.user!.id, req.user!.sessionId);
  res.status(204).end();
};

const logoutAll: RequestHandler = async (req, res) => {
  await authService.logoutAll(req.user!.id);
  res.status(204).end();
};

const listSessions: RequestHandler = async (req, res) => {
  const sessions = await authService.listSessions(req.user!.id);
  sendSuccess(res, sessions);
};

const revokeSession: RequestHandler = async (req, res) => {
  const { params } = res.locals.validated as z.infer<typeof sessionParamSchema>;
  await authService.revokeSession(req.user!.id, params.sessionId);
  res.status(204).end();
};

const me: RequestHandler = async (req, res) => {
  const user = await authService.me(req.user!.id);
  sendSuccess(res, user);
};

const changePassword: RequestHandler = async (req, res) => {
  const { body } = res.locals.validated as z.infer<typeof changePasswordSchema>;
  await authService.changePassword(req.user!.id, body, req.user!.sessionId);
  sendSuccess(res, { message: "Password updated successfully." });
};

const forgotPassword: RequestHandler = async (_req, res) => {
  const { body } = res.locals.validated as z.infer<typeof forgotPasswordSchema>;
  const result = await authService.forgotPassword(body.email);
  sendSuccess(res, result);
};

const resetPassword: RequestHandler = async (_req, res) => {
  const { body } = res.locals.validated as z.infer<typeof resetPasswordSchema>;
  const result = await authService.resetPassword(body);
  sendSuccess(res, result);
};

export const authController = {
  getRoles,
  register,
  login,
  logout,
  logoutAll,
  listSessions,
  revokeSession,
  me,
  changePassword,
  forgotPassword,
  resetPassword,
};
