import type { RequestHandler } from "express";
import type { z } from "zod";
import { sendSuccess } from "../../core/responses/ApiResponse.js";
import { studentService } from "./student.service.js";
import type {
  createStudentSchema,
  getStudentSchema,
  listStudentsSchema,
  registerStudentSchema,
  updateOwnStudentProfileSchema,
  updateStudentSchema,
  updateStudentStatusSchema,
} from "./student.validation.js";

const register: RequestHandler = async (req, res) => {
  const { body } = res.locals.validated as z.infer<typeof registerStudentSchema>;
  const result = await studentService.register(body, {
    userAgent: req.get("user-agent") ?? null,
    ipAddress: req.ip ?? null,
  });
  res.location(`/api/students/${result.student.id}`);
  sendSuccess(res, result, 201);
};

const create: RequestHandler = async (_req, res) => {
  const { body } = res.locals.validated as z.infer<typeof createStudentSchema>;
  const result = await studentService.createByAdmin(body);
  res.location(`/api/students/${result.student.id}`);
  sendSuccess(res, result, 201);
};

const list: RequestHandler = async (_req, res) => {
  const { query } = res.locals.validated as z.infer<typeof listStudentsSchema>;
  const { students, pagination } = await studentService.list(query);
  sendSuccess(res, students, 200, { pagination });
};

const getById: RequestHandler = async (_req, res) => {
  const { params } = res.locals.validated as z.infer<typeof getStudentSchema>;
  const student = await studentService.getByIdForUser(params.id, _req.user!.id, _req.user!.role);
  sendSuccess(res, student);
};

const getMe: RequestHandler = async (req, res) => {
  const student = await studentService.getByUserId(req.user!.id);
  sendSuccess(res, student);
};

const updateMe: RequestHandler = async (req, res) => {
  const { body } = res.locals.validated as z.infer<typeof updateOwnStudentProfileSchema>;
  const student = await studentService.updateOwnProfile(req.user!.id, body);
  sendSuccess(res, student);
};

const update: RequestHandler = async (_req, res) => {
  const { params, body } = res.locals.validated as z.infer<typeof updateStudentSchema>;
  const student = await studentService.update(params.id, body);
  sendSuccess(res, student);
};

const updateStatus: RequestHandler = async (_req, res) => {
  const { params, body } = res.locals.validated as z.infer<typeof updateStudentStatusSchema>;
  const student = await studentService.updateStatus(params.id, body.status);
  sendSuccess(res, student);
};

const remove: RequestHandler = async (_req, res) => {
  const { params } = res.locals.validated as z.infer<typeof getStudentSchema>;
  await studentService.delete(params.id);
  res.status(204).end();
};

export const studentController = {
  register,
  create,
  list,
  getById,
  getMe,
  updateMe,
  update,
  updateStatus,
  delete: remove,
};
