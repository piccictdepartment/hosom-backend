import type { RequestHandler } from "express";
import type { Role } from "../generated/prisma/client.js";
import { AppError } from "../core/errors/AppError.js";

export function authorize(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, "MISSING_TOKEN", "Authentication required"));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "FORBIDDEN", "You do not have permission to perform this action"));
    }
    next();
  };
}
