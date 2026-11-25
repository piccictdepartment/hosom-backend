import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { assignmentController } from "./assignment.controller.js";
import {
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

const assignmentManagers = [
  "LECTURER",
  "HEAD_OF_PROGRAMS",
  "ADMINISTRATION",
  "SYSTEM_ADMIN",
] as const;

const assignmentReaders = [
  "STUDENT",
  "LECTURER",
  "HEAD_OF_PROGRAMS",
  "ADMINISTRATION",
  "SECRETARIAT",
  "DIRECTOR",
  "SYSTEM_ADMIN",
] as const;

const submissionReviewers = [
  "LECTURER",
  "HEAD_OF_PROGRAMS",
  "SECRETARIAT",
  "ADMINISTRATION",
  "DIRECTOR",
  "SYSTEM_ADMIN",
] as const;

export const assignmentRouter = Router();

assignmentRouter.use(authenticate);

assignmentRouter.post(
  "/",
  authorize(...assignmentManagers),
  validate(createAssignmentSchema),
  assignmentController.create,
);

assignmentRouter.get(
  "/",
  authorize(...assignmentReaders),
  validate(listAssignmentsSchema),
  assignmentController.list,
);

assignmentRouter.get(
  "/:id",
  authorize(...assignmentReaders),
  validate(getAssignmentSchema),
  assignmentController.getById,
);

assignmentRouter.patch(
  "/:id",
  authorize(...assignmentManagers),
  validate(updateAssignmentSchema),
  assignmentController.update,
);

assignmentRouter.patch(
  "/:id/status",
  authorize(...assignmentManagers),
  validate(updateAssignmentStatusSchema),
  assignmentController.updateStatus,
);

assignmentRouter.delete(
  "/:id",
  authorize(...assignmentManagers),
  validate(getAssignmentSchema),
  assignmentController.delete,
);

// Submissions nested under /api/assignments/:id/submissions
assignmentRouter.post(
  "/:id/submissions",
  authorize("STUDENT"),
  validate(submitAssignmentSchema),
  assignmentController.submit,
);

assignmentRouter.get(
  "/:id/submissions/me",
  authorize("STUDENT"),
  validate(getAssignmentSchema),
  assignmentController.getMySubmission,
);

assignmentRouter.get(
  "/:id/submissions",
  authorize(...submissionReviewers),
  validate(listSubmissionsSchema),
  assignmentController.listSubmissions,
);

/** Nested course routes: /api/courses/:courseId/assignments */
export const courseAssignmentRouter = Router({ mergeParams: true });

courseAssignmentRouter.use(authenticate);

courseAssignmentRouter.get(
  "/assignments",
  authorize(...assignmentReaders),
  validate(listCourseAssignmentsSchema),
  assignmentController.listForCourse,
);

courseAssignmentRouter.post(
  "/assignments",
  authorize(...assignmentManagers),
  validate(createCourseAssignmentSchema),
  assignmentController.createForCourse,
);

/** Standalone submission routes: /api/submissions/:submissionId */
export const submissionRouter = Router();

submissionRouter.use(authenticate);

submissionRouter.get(
  "/:submissionId",
  authorize("STUDENT", ...submissionReviewers),
  validate(submissionParamSchema),
  assignmentController.getSubmissionById,
);

submissionRouter.patch(
  "/:submissionId/grade",
  authorize("LECTURER", "HEAD_OF_PROGRAMS", "SYSTEM_ADMIN"),
  validate(gradeSubmissionSchema),
  assignmentController.gradeSubmission,
);

submissionRouter.patch(
  "/:submissionId/status",
  authorize(...submissionReviewers),
  validate(updateSubmissionStatusSchema),
  assignmentController.updateSubmissionStatus,
);
