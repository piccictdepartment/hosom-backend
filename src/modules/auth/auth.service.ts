import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../../config/database.js";
import { env } from "../../config/env.js";
import { AppError } from "../../core/errors/AppError.js";
import { issueToken, parseJwtExpiresMs } from "../../core/security/jwt.js";
import { comparePassword, hashPassword } from "../../core/security/password.js";
import type { Role } from "../../generated/prisma/client.js";
import { userRepository } from "../users/user.repository.js";
import type {
  AuthSessionContext,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from "./auth.types.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

async function createSessionToken(userId: string, role: Role, ctx?: AuthSessionContext) {
  const expiresAt = new Date(Date.now() + parseJwtExpiresMs());
  const session = await prisma.userSession.create({
    data: {
      userId,
      expiresAt,
      userAgent: ctx?.userAgent ? ctx.userAgent.slice(0, 255) : null,
      ipAddress: ctx?.ipAddress ? ctx.ipAddress.slice(0, 64) : null,
      lastUsedAt: new Date(),
    },
    select: { id: true, expiresAt: true },
  });

  const token = await issueToken(userId, role, session.id);
  return { token, sessionId: session.id, expiresAt: session.expiresAt };
}

export const authService = {
  createSessionToken,

  async register(input: RegisterInput, ctx?: AuthSessionContext) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.create({
      firstName: input.firstName,
      middleName: input.middleName,
      surname: input.surname,
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: input.role,
    });

    const { token, sessionId, expiresAt } = await createSessionToken(user.id, user.role, ctx);
    return { user, token, sessionId, expiresAt };
  },

  async login(input: LoginInput, ctx?: AuthSessionContext) {
    const user = await userRepository.findByEmailWithCredentials(input.email);
    if (!user) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
    }

    const valid = await comparePassword(input.password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
    }

    if (!user.isActive) {
      throw new AppError(403, "ACCOUNT_INACTIVE", "Your account has been deactivated");
    }

    const now = new Date();
    await userRepository.updateLoggedInAt(user.id, now);
    user.loggedInAt = now;

    const { passwordHash: _, ...safeUser } = user;
    const { token, sessionId, expiresAt } = await createSessionToken(user.id, user.role, ctx);
    return { user: safeUser, token, sessionId, expiresAt };
  },

  async logout(userId: string, sessionId?: string) {
    if (!sessionId) return;
    await prisma.userSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async logoutAll(userId: string) {
    await prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async listSessions(userId: string) {
    return prisma.userSession.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  },

  async revokeSession(userId: string, sessionId: string) {
    const session = await prisma.userSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true, revokedAt: true },
    });
    if (!session) {
      throw new AppError(404, "SESSION_NOT_FOUND", "Session not found");
    }
    if (!session.revokedAt) {
      await prisma.userSession.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      });
    }
  },

  async me(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");
    return user;
  },

  async changePassword(userId: string, input: ChangePasswordInput, currentSessionId?: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true, isActive: true },
    });
    if (!user) throw new AppError(404, "USER_NOT_FOUND", "User not found");
    if (!user.isActive) {
      throw new AppError(403, "ACCOUNT_INACTIVE", "Your account has been deactivated");
    }

    const valid = await comparePassword(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Current password is incorrect");
    }

    const newHash = await hashPassword(input.newPassword);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      }),
      prisma.userSession.updateMany({
        where: {
          userId,
          revokedAt: null,
          ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
        },
        data: { revokedAt: new Date() },
      }),
    ]);
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, isActive: true, email: true },
    });

    if (!user || !user.isActive) {
      return {
        message: "If that email is registered, a password reset link has been sent.",
      };
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    if (env.NODE_ENV === "development") {
      console.info(`[DEV] Password reset token generated for ${user.email}: ${rawToken}`);
    }

    return {
      message: "If that email is registered, a password reset link has been sent.",
      ...(env.NODE_ENV === "test" ? { resetToken: rawToken } : {}),
    };
  },

  async resetPassword(input: ResetPasswordInput) {
    const tokenHash = hashResetToken(input.token);
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, usedAt: true, expiresAt: true },
    });

    if (!resetRecord || resetRecord.usedAt !== null || resetRecord.expiresAt <= new Date()) {
      throw new AppError(400, "INVALID_RESET_TOKEN", "Password reset token is invalid or has expired");
    }

    const passwordHash = await hashPassword(input.password);
    const now = new Date();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: now },
      }),
      prisma.userSession.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    return { message: "Password has been reset successfully." };
  },
};
