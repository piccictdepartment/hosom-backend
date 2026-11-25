import { SignJWT, jwtVerify } from "jose";
import { env } from "../../config/env.js";
import { AppError } from "../errors/AppError.js";
import type { Role } from "../../generated/prisma/client.js";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export interface TokenPayload {
  sub: string; // user id
  role: Role;
  jti?: string; // session id
}

export async function signToken(payload: TokenPayload): Promise<string> {
  const jwt = new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES);

  if (payload.jti) {
    jwt.setJti(payload.jti);
  }

  return jwt.sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub || typeof payload["role"] !== "string") {
      throw new AppError(401, "INVALID_TOKEN", "Token is invalid or expired");
    }
    return {
      sub: payload.sub,
      role: payload["role"] as TokenPayload["role"],
      jti: typeof payload.jti === "string" ? payload.jti : undefined,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(401, "INVALID_TOKEN", "Token is invalid or expired");
  }
}

export async function issueToken(userId: string, role: Role, sessionId?: string): Promise<string> {
  return signToken({ sub: userId, role, jti: sessionId });
}

/** Parses JWT_EXPIRES strings such as "7d", "24h", "30m", "60s" into milliseconds. */
export function parseJwtExpiresMs(value: string = env.JWT_EXPIRES): number {
  const match = /^(\d+)\s*([smhd])$/i.exec(value.trim());
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const amount = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * (multipliers[unit] ?? 86400000);
}
