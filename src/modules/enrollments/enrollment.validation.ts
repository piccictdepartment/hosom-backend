import { z } from "zod";
const uuid = z.uuid();
export const createEnrollmentSchema = z.object({ body: z.object({ studentId: uuid, courseId: uuid, academicPeriodId: uuid.optional().nullable() }).strict() });
export const listEnrollmentsSchema = z.object({ query: z.object({ studentId: uuid.optional(), courseId: uuid.optional(), status: z.enum(["ACTIVE", "INACTIVE", "COMPLETED", "DROPPED"]).optional() }).strict() });
export const updateEnrollmentSchema = z.object({ params: z.object({ id: uuid }), body: z.object({ status: z.enum(["ACTIVE", "INACTIVE", "COMPLETED", "DROPPED"]) }).strict() });
