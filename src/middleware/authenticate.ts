import type { RequestHandler } from "express";
import { AppError } from "../core/errors/AppError.js";
import { verifyToken } from "../core/security/jwt.js";

export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError(401, "MISSING_TOKEN", "Authorization header is required"));
  }
  const token = header.slice(7);
  const payload = await verifyToken(token);
  req.user = { id: payload.sub, role: payload.role };
  next();
};
