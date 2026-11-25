import type { RequestHandler } from "express";
import type { z } from "zod";
import { sendSuccess } from "../../core/responses/ApiResponse.js";
import { assignmentService } from "./assignment.service.js";
import type {
  createAssignmentSchema,
  createCourseAssignmentSchema,
  getAssignmentSchema,
  gradeSubmissionSchema,
  listAssignmentsSchema,
  listCourseAssignmentsSchema,
  listSubmissionsSchema,
  submissionParamSchema,
  submitAssignmentSchema,
  updateAssignmentSchema,
  updateAssignmentStatusSchema,
  updateSubmissionStatusSchema,
} from "./assignment.validation.js";

const create: RequestHandler = async (req, res) => {
  const { body } = res.locals.validated as z.infer<typeof createAssignmentSchema>;
  const assignment = await assignmentService.create(req.user!.id, req.user!.role, body);
  res.location(`/api/assignments/${assignment.id}`);
  sendSuccess(res, assignment, 201);
};

const createForCourse: RequestHandler = async (req, res) => {
  const { params, body } = res.locals.validated as z.infer<typeof createCourseAssignmentSchema>;
  const assignment = await assignmentService.create(req.user!.id, req.user!.role, {
    ...body,
    courseId: params.courseId,
  });
  res.location(`/api/assignments/${assignment.id}`);
  sendSuccess(res, assignment, 201);
};

const list: RequestHandler = async (req, res) => {
  const { query } = res.locals.validated as z.infer<typeof listAssignmentsSchema>;
  const { assignments, pagination } = await assignmentService.list(
    req.user!.id,
    req.user!.role,
    query,
  );
  sendSuccess(res, assignments, 200, { pagination });
};

const listForCourse: RequestHandler = async (req, res) => {
  const { params, query } = res.locals.validated as z.infer<typeof listCourseAssignmentsSchema>;
  const { assignments, pagination } = await assignmentService.list(
    req.user!.id,
    req.user!.role,
    { ...query, courseId: params.courseId },
  );
  sendSuccess(res, assignments, 200, { pagination });
};

const getById: RequestHandler = async (req, res) => {
  const { params } = res.locals.validated as z.infer<typeof getAssignmentSchema>;
  const assignment = await assignmentService.getById(req.user!.id, req.user!.role, params.id);
  sendSuccess(res, assignment);
};

const update: RequestHandler = async (req, res) => {
  const { params, body } = res.locals.validated as z.infer<typeof updateAssignmentSchema>;
  const assignment = await assignmentService.update(req.user!.id, req.user!.role, params.id, body);
  sendSuccess(res, assignment);
};

const updateStatus: RequestHandler = async (req, res) => {
  const { params, body } = res.locals.validated as z.infer<typeof updateAssignmentStatusSchema>;
  const assignment = await assignmentService.updateStatus(
    req.user!.id,
    req.user!.role,
    params.id,
    body.status,
  );
  sendSuccess(res, assignment);
};

const remove: RequestHandler = async (req, res) => {
  const { params } = res.locals.validated as z.infer<typeof getAssignmentSchema>;
  await assignmentService.delete(req.user!.id, req.user!.role, params.id);
  res.status(204).end();
};

const submit: RequestHandler = async (req, res) => {
  const { params, body } = res.locals.validated as z.infer<typeof submitAssignmentSchema>;
  const submission = await assignmentService.submit(req.user!.id, params.id, body);
  res.location(`/api/submissions/${submission.id}`);
  sendSuccess(res, submission, 201);
};

const getMySubmission: RequestHandler = async (req, res) => {
  const { params } = res.locals.validated as z.infer<typeof getAssignmentSchema>;
  const submission = await assignmentService.getMySubmission(req.user!.id, params.id);
  sendSuccess(res, submission);
};

const listSubmissions: RequestHandler = async (req, res) => {
  const { params, query } = res.locals.validated as z.infer<typeof listSubmissionsSchema>;
  const { submissions, pagination } = await assignmentService.listSubmissions(
    req.user!.id,
    req.user!.role,
    params.id,
    query,
  );
  sendSuccess(res, submissions, 200, { pagination });
};

const getSubmissionById: RequestHandler = async (req, res) => {
  const { params } = res.locals.validated as z.infer<typeof submissionParamSchema>;
  const submission = await assignmentService.getSubmissionById(
    req.user!.id,
    req.user!.role,
    params.submissionId,
  );
  sendSuccess(res, submission);
};

const gradeSubmission: RequestHandler = async (req, res) => {
  const { params, body } = res.locals.validated as z.infer<typeof gradeSubmissionSchema>;
  const submission = await assignmentService.gradeSubmission(
    req.user!.id,
    req.user!.role,
    params.submissionId,
    body,
  );
  sendSuccess(res, submission);
};

const updateSubmissionStatus: RequestHandler = async (req, res) => {
  const { params, body } = res.locals.validated as z.infer<typeof updateSubmissionStatusSchema>;
  const submission = await assignmentService.updateSubmissionStatus(
    req.user!.id,
    req.user!.role,
    params.submissionId,
    body.status,
  );
  sendSuccess(res, submission);
};

export const assignmentController = {
  create,
  createForCourse,
  list,
  listForCourse,
  getById,
  update,
  updateStatus,
  delete: remove,
  submit,
  getMySubmission,
  listSubmissions,
  getSubmissionById,
  gradeSubmission,
  updateSubmissionStatus,
};
