import { z } from "zod";

export const studentStatusEnum = [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "GRADUATED",
  "WITHDRAWN",
  "PENDING",
] as const;

const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128);

const bioDataFields = {
  studentNumber: z.string().trim().min(2).max(50).optional().nullable(),
  gender: z.string().trim().max(20).optional().nullable(),
  dateOfBirth: z.string().pipe(z.coerce.date()).optional().nullable(),
  nationality: z.string().trim().max(80).optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
  district: z.string().trim().max(100).optional().nullable(),
  guardianName: z.string().trim().max(100).optional().nullable(),
  guardianPhone: z.string().trim().max(30).optional().nullable(),
  program: z.string().trim().max(100).optional().nullable(),
  intake: z.string().trim().max(60).optional().nullable(),
  yearOfStudy: z.coerce.number().int().min(1).max(10).optional().nullable(),
  modeOfLearning: z.string().trim().max(40).optional().nullable(),
};

export const registerStudentSchema = z.object({
  body: z
    .object({
      firstName: z.string().trim().min(1).max(100),
      middleName: z.string().trim().max(100).optional().nullable(),
      surname: z.string().trim().min(1).max(100),
      email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
      phone: z.string().trim().max(30).optional().nullable(),
      password: passwordField,
      ...bioDataFields,
    })
    .strict(),
});

export const createStudentSchema = z.object({
  body: z
    .object({
      firstName: z.string().trim().min(1).max(100),
      middleName: z.string().trim().max(100).optional().nullable(),
      surname: z.string().trim().min(1).max(100),
      email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
      phone: z.string().trim().max(30).optional().nullable(),
      password: passwordField.optional(),
      status: z.enum(studentStatusEnum).default("PENDING"),
      ...bioDataFields,
    })
    .strict(),
});

export const updateStudentSchema = z.object({
  params: z.object({ id: z.uuid() }),
  body: z
    .object({
      firstName: z.string().trim().min(1).max(100).optional(),
      middleName: z.string().trim().max(100).optional().nullable(),
      surname: z.string().trim().min(1).max(100).optional(),
      email: z.string().trim().toLowerCase().pipe(z.email().max(254)).optional(),
      phone: z.string().trim().max(30).optional().nullable(),
      status: z.enum(studentStatusEnum).optional(),
      ...bioDataFields,
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const updateOwnStudentProfileSchema = z.object({
  body: z
    .object({
      phone: z.string().trim().max(30).optional().nullable(),
      gender: z.string().trim().max(20).optional().nullable(),
      dateOfBirth: z.string().pipe(z.coerce.date()).optional().nullable(),
      nationality: z.string().trim().max(80).optional().nullable(),
      address: z.string().trim().max(255).optional().nullable(),
      district: z.string().trim().max(100).optional().nullable(),
      guardianName: z.string().trim().max(100).optional().nullable(),
      guardianPhone: z.string().trim().max(30).optional().nullable(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const updateStudentStatusSchema = z.object({
  params: z.object({ id: z.uuid() }),
  body: z
    .object({
      status: z.enum(studentStatusEnum),
    })
    .strict(),
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
      search: z.string().trim().min(1).max(120).optional(),
      status: z.enum(studentStatusEnum).optional(),
      program: z.string().trim().min(1).max(100).optional(),
    })
    .strict(),
});
