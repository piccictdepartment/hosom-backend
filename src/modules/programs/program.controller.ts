import type { RequestHandler } from "express";
import type { z } from "zod";
import { sendSuccess } from "../../core/responses/ApiResponse.js";
import { programService } from "./program.service.js";
import type { createProgramSchema, listProgramsSchema, programIdSchema, updateProgramSchema } from "./program.validation.js";

const list: RequestHandler = async (_req, res) => {
  const { query } = res.locals.validated as z.infer<typeof listProgramsSchema>;
  sendSuccess(res, await programService.list(query));
};
const getById: RequestHandler = async (_req, res) => {
  const { params } = res.locals.validated as z.infer<typeof programIdSchema>;
  sendSuccess(res, await programService.getById(params.id));
};
const create: RequestHandler = async (_req, res) => {
  const { body } = res.locals.validated as z.infer<typeof createProgramSchema>;
  const program = await programService.create(body);
  res.location(`/api/programs/${program.id}`);
  sendSuccess(res, program, 201);
};
const update: RequestHandler = async (_req, res) => {
  const { params, body } = res.locals.validated as z.infer<typeof updateProgramSchema>;
  sendSuccess(res, await programService.update(params.id, body));
};
export const programController = { list, getById, create, update };
