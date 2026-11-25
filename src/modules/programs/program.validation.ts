import { z } from "zod";

export const programIdSchema = z.object({ params: z.object({ id: z.uuid() }) });
export const listProgramsSchema = z.object({ query: z.object({ search: z.string().trim().min(1).max(100).optional(), active: z.enum(["true", "false"]).optional() }).strict() });
export const createProgramSchema = z.object({ body: z.object({ code: z.string().trim().min(2).max(30), name: z.string().trim().min(2).max(150), awardType: z.string().trim().min(2).max(50), duration: z.string().trim().max(50).optional().nullable(), description: z.string().trim().max(10000).optional().nullable(), isActive: z.boolean().optional() }).strict() });
export const updateProgramSchema = z.object({ params: z.object({ id: z.uuid() }), body: z.object({ code: z.string().trim().min(2).max(30).optional(), name: z.string().trim().min(2).max(150).optional(), awardType: z.string().trim().min(2).max(50).optional(), duration: z.string().trim().max(50).optional().nullable(), description: z.string().trim().max(10000).optional().nullable(), isActive: z.boolean().optional() }).strict().refine((v) => Object.keys(v).length > 0) });
