import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = performance.now();
  req.requestId = randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  res.on("finish", () => {
    if (env.NODE_ENV === "test") return;
    // Log the path only: query strings and bodies may contain personal data.
    console.info(JSON.stringify({
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(performance.now() - startedAt),
    }));
  });
  next();
};
