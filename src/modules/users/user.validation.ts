import { z } from "zod";

export const roleEnum = [
  "STUDENT",
  "LECTURER",
  "SECRETARIAT",
  "ADMINISTRATION",
  "FINANCE",
  "HEAD_OF_PROGRAMS",
  "DIRECTOR_CHANCELLOR",
  "ICT_MEDIA",
  "SYSTEM_ADMINISTRATOR",
  "ADMIN",
] as const;

const userBody = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  role: z.enum(roleEnum).optional(),
}).strict();

const userParams = z.object({ id: z.uuid() });

export const createUserSchema = z.object({ body: userBody });
export const getUserSchema = z.object({ params: userParams });
export const updateUserSchema = z.object({
  params: userParams,
  body: userBody.partial().refine((body) => Object.keys(body).length > 0, {
    message: "Provide at least one field to update",
  }),
});
export const listUsersSchema = z.object({
  query: z.object({
    page: z.string().regex(/^[1-9]\d*$/).transform(Number)
      .pipe(z.number().int().max(1000000)).default(1),
    limit: z.string().regex(/^[1-9]\d*$/).transform(Number)
      .pipe(z.number().int().max(100)).default(20),
  }).strict(),
});
