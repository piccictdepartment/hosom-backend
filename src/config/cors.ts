import type { CorsOptions } from "cors";
import { AppError } from "../core/errors/AppError.js";
import { env } from "./env.js";

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || env.CORS_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new AppError(403, "CORS_FORBIDDEN", "Origin is not allowed"));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["X-Request-Id", "RateLimit", "RateLimit-Policy", "Retry-After"],
  maxAge: 600,
};
