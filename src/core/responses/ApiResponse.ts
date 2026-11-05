import type { Response } from "express";

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: unknown) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta === undefined ? {} : { meta }),
  });
}
