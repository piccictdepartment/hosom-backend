import "dotenv/config";
import { z } from "zod";
import { parseDatabaseUrl } from "./databaseUrl.js";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().refine((value) => {
    try {
      parseDatabaseUrl(value);
      return true;
    } catch {
      return false;
    }
  }, "Use mysql://user:password@host:3306/database"),
  CORS_ORIGINS: z.string().default("http://localhost:5173,http://localhost:3000")
    .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean))
    .pipe(z.array(z.url())),
  BODY_LIMIT: z.string().regex(/^\d+(b|kb|mb)$/i).default("100kb"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().max(2147483647).default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES: z.string().default("7d"),
});

const result = schema.safeParse(process.env);
if (!result.success) {
  const fields = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  throw new Error(`Invalid environment configuration:\n${fields.join("\n")}`);
}

export const env = result.data;
