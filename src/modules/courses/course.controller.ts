import type { RequestHandler } from "express";
import type { z } from "zod";
import { sendSuccess } from "../../core/responses/ApiResponse.js";
import { courseService } from "./course.service.js";
import type { assignLecturerSchema, courseEnrollmentsParamsSchema, courseIdSchema, courseLecturerParamsSchema, createCourseSchema, listCoursesSchema, updateCourseSchema } from "./course.validation.js";

const list: RequestHandler = async (req, res) => { const { query } = res.locals.validated as z.infer<typeof listCoursesSchema>; sendSuccess(res, await courseService.list(req.user!.id, req.user!.role, query)); };
const getById: RequestHandler = async (req, res) => { const { params } = res.locals.validated as z.infer<typeof courseIdSchema>; sendSuccess(res, await courseService.getById(req.user!.id, req.user!.role, params.id)); };
const create: RequestHandler = async (_req, res) => { const { body } = res.locals.validated as z.infer<typeof createCourseSchema>; const course = await courseService.create(body); res.location(`/api/courses/${course.id}`); sendSuccess(res, course, 201); };
const update: RequestHandler = async (_req, res) => { const { params, body } = res.locals.validated as z.infer<typeof updateCourseSchema>; sendSuccess(res, await courseService.update(params.id, body)); };
const assignLecturer: RequestHandler = async (_req, res) => { const { params, body } = res.locals.validated as z.infer<typeof assignLecturerSchema>; sendSuccess(res, await courseService.assignLecturer(params.courseId, body), 201); };
const removeLecturer: RequestHandler = async (_req, res) => { const { params } = res.locals.validated as z.infer<typeof courseLecturerParamsSchema>; await courseService.removeLecturer(params.courseId, params.lecturerId); res.status(204).end(); };
const listEnrollments: RequestHandler = async (req, res) => { const { params } = res.locals.validated as z.infer<typeof courseEnrollmentsParamsSchema>; sendSuccess(res, await courseService.listEnrollments(req.user!.id, req.user!.role, params.courseId)); };
export const courseController = { list, getById, create, update, assignLecturer, removeLecturer, listEnrollments };
