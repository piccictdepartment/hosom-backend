import { z } from "zod";
const uuid = z.uuid();
export const courseIdSchema = z.object({ params: z.object({ id: uuid }) });
export const listCoursesSchema = z.object({ query: z.object({ programId: uuid.optional(), academicPeriodId: uuid.optional(), mine: z.enum(["true", "false"]).optional(), search: z.string().trim().min(1).max(100).optional(), status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional() }).strict() });
export const createCourseSchema = z.object({ body: z.object({ code: z.string().trim().min(2).max(30), title: z.string().trim().min(2).max(180), description: z.string().trim().max(10000).optional().nullable(), credits: z.number().int().min(0).max(100).optional(), programId: uuid.optional().nullable(), academicPeriodId: uuid.optional().nullable(), status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional() }).strict() });
export const updateCourseSchema = z.object({ params: z.object({ id: uuid }), body: z.object({ code: z.string().trim().min(2).max(30).optional(), title: z.string().trim().min(2).max(180).optional(), description: z.string().trim().max(10000).optional().nullable(), credits: z.number().int().min(0).max(100).optional(), programId: uuid.optional().nullable(), academicPeriodId: uuid.optional().nullable(), status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).optional() }).strict().refine((v) => Object.keys(v).length > 0) });
export const assignLecturerSchema = z.object({ params: z.object({ courseId: uuid }), body: z.object({ lecturerId: uuid, isPrimary: z.boolean().optional() }).strict() });
export const courseLecturerParamsSchema = z.object({ params: z.object({ courseId: uuid, lecturerId: uuid }) });
export const courseEnrollmentsParamsSchema = z.object({ params: z.object({ courseId: uuid }) });
