import type { RequestHandler } from "express";
import type { z } from "zod";
import { sendSuccess } from "../../core/responses/ApiResponse.js";
import { materialService } from "./material.service.js";
import type {
  courseUnitsParamSchema,
  createCourseMaterialSchema,
  createCourseUnitSchema,
  createMaterialSchema,
  getMaterialSchema,
  listCourseMaterialsSchema,
  listMaterialsSchema,
  updateMaterialMetadataSchema,
  updateMaterialSchema,
  updateMaterialStatusSchema,
} from "./material.validation.js";

const create: RequestHandler = async (req, res) => {
  const { body } = res.locals.validated as z.infer<typeof createMaterialSchema>;
  const material = await materialService.create(req.user!.id, req.user!.role, body);
  res.location(`/api/materials/${material.id}`);
  sendSuccess(res, material, 201);
};

const createForCourse: RequestHandler = async (req, res) => {
  const { params, body } = res.locals.validated as z.infer<typeof createCourseMaterialSchema>;
  const material = await materialService.create(req.user!.id, req.user!.role, {
    ...body,
    courseId: params.courseId,
  });
  res.location(`/api/materials/${material.id}`);
  sendSuccess(res, material, 201);
};

const list: RequestHandler = async (req, res) => {
  const { query } = res.locals.validated as z.infer<typeof listMaterialsSchema>;
  const { materials, pagination } = await materialService.list(req.user!.id, req.user!.role, query);
  sendSuccess(res, materials, 200, { pagination });
};

const listForCourse: RequestHandler = async (req, res) => {
  const { params, query } = res.locals.validated as z.infer<typeof listCourseMaterialsSchema>;
  const { materials, pagination } = await materialService.list(req.user!.id, req.user!.role, {
    ...query,
    courseId: params.courseId,
  });
  sendSuccess(res, materials, 200, { pagination });
};

const getById: RequestHandler = async (req, res) => {
  const { params } = res.locals.validated as z.infer<typeof getMaterialSchema>;
  const material = await materialService.getById(req.user!.id, req.user!.role, params.id);
  sendSuccess(res, material);
};

const update: RequestHandler = async (req, res) => {
  const { params, body } = res.locals.validated as z.infer<typeof updateMaterialSchema>;
  const material = await materialService.update(req.user!.id, req.user!.role, params.id, body);
  sendSuccess(res, material);
};

const updateMetadata: RequestHandler = async (req, res) => {
  const { params, body } = res.locals.validated as z.infer<typeof updateMaterialMetadataSchema>;
  const material = await materialService.updateMetadata(req.user!.id, req.user!.role, params.id, body);
  sendSuccess(res, material);
};

const updateStatus: RequestHandler = async (req, res) => {
  const { params, body } = res.locals.validated as z.infer<typeof updateMaterialStatusSchema>;
  const material = await materialService.updateStatus(req.user!.id, req.user!.role, params.id, body.status);
  sendSuccess(res, material);
};

const remove: RequestHandler = async (req, res) => {
  const { params } = res.locals.validated as z.infer<typeof getMaterialSchema>;
  await materialService.delete(req.user!.id, req.user!.role, params.id);
  res.status(204).end();
};

const createUnit: RequestHandler = async (req, res) => {
  const { params, body } = res.locals.validated as z.infer<typeof createCourseUnitSchema>;
  const unit = await materialService.createUnit(req.user!.id, req.user!.role, {
    ...body,
    courseId: params.courseId,
  });
  sendSuccess(res, unit, 201);
};

const listUnits: RequestHandler = async (req, res) => {
  const { params } = res.locals.validated as z.infer<typeof courseUnitsParamSchema>;
  const units = await materialService.listUnits(req.user!.id, req.user!.role, params.courseId);
  sendSuccess(res, units);
};

export const materialController = {
  create,
  createForCourse,
  list,
  listForCourse,
  getById,
  update,
  updateMetadata,
  updateStatus,
  delete: remove,
  createUnit,
  listUnits,
};
