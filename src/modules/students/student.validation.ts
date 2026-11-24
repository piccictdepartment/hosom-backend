import { z } from "zod";

const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

export const registerStudentSchema = z.object({
  body: z
    .object({
      firstName: z.string().trim().min(1).max(100),
      middleName: z.string().trim().max(100).optional().nullable(),
      surname: z.string().trim().min(1).max(100),
      email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
      phone: z.string().trim().max(30).optional().nullable(),
      password: passwordField,
      studentNumber: z.string().trim().max(50).optional().nullable(),
      gender: z.string().trim().max(20).optional().nullable(),
      dateOfBirth: z.string().pipe(z.coerce.date()).optional().nullable(),
      address: z.string().trim().max(255).optional().nullable(),
      guardianName: z.string().trim().max(100).optional().nullable(),
      guardianPhone: z.string().trim().max(30).optional().nullable(),
      program: z.string().trim().max(100).optional().nullable(),
    })
    .strict(),
});

export const updateStudentSchema = z.object({
  params: z.object({ id: z.uuid() }),
  body: z
    .object({
      studentNumber: z.string().trim().max(50).optional().nullable(),
      gender: z.string().trim().max(20).optional().nullable(),
      dateOfBirth: z.string().pipe(z.coerce.date()).optional().nullable(),
      address: z.string().trim().max(255).optional().nullable(),
      guardianName: z.string().trim().max(100).optional().nullable(),
      guardianPhone: z.string().trim().max(30).optional().nullable(),
      program: z.string().trim().max(100).optional().nullable(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const getStudentSchema = z.object({
  params: z.object({ id: z.uuid() }),
});

export const listStudentsSchema = z.object({
  query: z
    .object({
      page: z
        .string()
        .regex(/^[1-9]\d*$/)
        .transform(Number)
        .pipe(z.number().int().max(1000000))
        .default(1),
      limit: z
        .string()
        .regex(/^[1-9]\d*$/)
        .transform(Number)
        .pipe(z.number().int().max(100))
        .default(20),
    })
    .strict(),
});
