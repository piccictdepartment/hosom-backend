import type { RequestHandler } from "express";
import { prisma } from "../config/database.js";
import { AppError } from "../core/errors/AppError.js";
import { verifyToken } from "../core/security/jwt.js";
import { env } from "../config/env.js";

export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError(401, "MISSING_TOKEN", "Authorization header is required"));
  }

  const token = header.slice(7).trim();
  if (!token) {
    return next(new AppError(401, "MISSING_TOKEN", "Authorization header is required"));
  }

  const payload = await verifyToken(token);

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, isActive: true },
  });

  if (!user) {
    return next(new AppError(401, "INVALID_TOKEN", "User account no longer exists"));
  }

  if (!user.isActive) {
    return next(new AppError(403, "ACCOUNT_INACTIVE", "Your account has been deactivated"));
  }

  if (payload.jti) {
    const session = await prisma.userSession.findUnique({
      where: { id: payload.jti },
      select: { id: true, userId: true, revokedAt: true, expiresAt: true, lastUsedAt: true },
    });

    if (!session || session.userId !== user.id || session.revokedAt !== null || session.expiresAt <= new Date()) {
      return next(new AppError(401, "SESSION_REVOKED", "Session has expired or been revoked"));
    }

    const now = new Date();
    if (session.lastUsedAt && now.getTime() - session.lastUsedAt.getTime() > env.SESSION_IDLE_TIMEOUT_MS) {
      await prisma.userSession.update({ where: { id: session.id }, data: { revokedAt: now } });
      return next(new AppError(401, "SESSION_IDLE_TIMEOUT", "Your session expired due to inactivity. Please sign in again."));
    }

    // Best-effort lastUsedAt update; do not block request on timestamp write.
    void prisma.userSession
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
  }

  req.user = { id: user.id, role: user.role, sessionId: payload.jti };
  next();
};
