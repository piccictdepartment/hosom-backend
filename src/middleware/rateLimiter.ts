import { rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";
import { AppError } from "../core/errors/AppError.js";

export const rateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new AppError(429, "RATE_LIMIT_EXCEEDED", "Too many requests; try again later"));
  },
});
