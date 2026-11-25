import type { RequestHandler } from "express";
import type { z } from "zod";
import { sendSuccess } from "../../core/responses/ApiResponse.js";
import { enrollmentService } from "./enrollment.service.js";
import type { createEnrollmentSchema, listEnrollmentsSchema, updateEnrollmentSchema } from "./enrollment.validation.js";

const listMine: RequestHandler = async (req, res) => sendSuccess(res, await enrollmentService.listMine(req.user!.id));
const list: RequestHandler = async (req, res) => { const { query } = res.locals.validated as z.infer<typeof listEnrollmentsSchema>; sendSuccess(res, await enrollmentService.list(req.user!.id, req.user!.role, query)); };
const create: RequestHandler = async (_req, res) => { const { body } = res.locals.validated as z.infer<typeof createEnrollmentSchema>; const enrollment = await enrollmentService.create(body); res.location(`/api/enrollments/${enrollment.id}`); sendSuccess(res, enrollment, 201); };
const update: RequestHandler = async (_req, res) => { const { params, body } = res.locals.validated as z.infer<typeof updateEnrollmentSchema>; sendSuccess(res, await enrollmentService.update(params.id, body.status)); };
export const enrollmentController = { listMine, list, create, update };
