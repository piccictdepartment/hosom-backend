import { z } from "zod";
import { roleEnum } from "../users/user.validation.js";

const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

export const registerSchema = z.object({
  body: z
    .object({
      firstName: z.string().trim().min(1).max(100),
      middleName: z.string().trim().max(100).optional().nullable(),
      surname: z.string().trim().min(1).max(100),
      email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
      phone: z.string().trim().max(30).optional().nullable(),
      password: passwordField,
      role: z.enum(roleEnum).default("STUDENT"),
    })
    .strict(),
});

export const loginSchema = z.object({
  body: z
    .object({
      email: z.string().trim().toLowerCase().pipe(z.email()),
      password: z.string().min(1),
    })
    .strict(),
});

export const forgotPasswordSchema = z.object({
  body: z.object({ email: z.string().trim().toLowerCase().pipe(z.email()) }).strict(),
});

export const resetPasswordSchema = z.object({
  body: z
    .object({
      token: z.string().trim().min(1),
      password: passwordField,
    })
    .strict(),
});

export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1),
      newPassword: passwordField,
    })
    .strict()
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: "New password must be different from current password",
      path: ["newPassword"],
    }),
});

export const sessionParamSchema = z.object({
  params: z.object({
    sessionId: z.uuid(),
  }),
});
