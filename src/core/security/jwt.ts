import { SignJWT, jwtVerify } from "jose";
import { env } from "../../config/env.js";
import { AppError } from "../errors/AppError.js";
import type { Role } from "../../generated/prisma/client.js";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export interface TokenPayload {
  sub: string; // user id
  role: Role;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { sub: payload.sub as string, role: payload["role"] as TokenPayload["role"] };
  } catch {
    throw new AppError(401, "INVALID_TOKEN", "Token is invalid or expired");
  }
}

export async function issueToken(userId: string, role: Role): Promise<string> {
  return signToken({ sub: userId, role });
}
