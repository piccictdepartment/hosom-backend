import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { studentController } from "./student.controller.js";
import {
  createStudentSchema,
  getStudentSchema,
  listStudentsSchema,
  registerStudentSchema,
  updateOwnStudentProfileSchema,
  updateStudentSchema,
  updateStudentStatusSchema,
} from "./student.validation.js";

export const studentRouter = Router();

// Public: Student self-registration
studentRouter.post(
  "/register",
  validate(registerStudentSchema),
  studentController.register,
);

// Authenticated student: View & update own profile
studentRouter.get("/me", authenticate, studentController.getMe);
studentRouter.patch(
  "/me",
  authenticate,
  authorize("STUDENT"),
  validate(updateOwnStudentProfileSchema),
  studentController.updateMe,
);

// Administrative: Create, view, search, update students
studentRouter.post(
  "/",
  authenticate,
  authorize("SYSTEM_ADMIN", "ADMINISTRATION", "SECRETARIAT"),
  validate(createStudentSchema),
  studentController.create,
);

studentRouter.get(
  "/",
  authenticate,
  authorize("SYSTEM_ADMIN", "ADMINISTRATION", "SECRETARIAT", "HEAD_OF_PROGRAMS", "FINANCE", "DIRECTOR"),
  validate(listStudentsSchema),
  studentController.list,
);

studentRouter.get(
  "/:id",
  authenticate,
  authorize("SYSTEM_ADMIN", "ADMINISTRATION", "SECRETARIAT", "HEAD_OF_PROGRAMS", "LECTURER", "FINANCE", "DIRECTOR"),
  validate(getStudentSchema),
  studentController.getById,
);

studentRouter.patch(
  "/:id",
  authenticate,
  authorize("SYSTEM_ADMIN", "ADMINISTRATION", "SECRETARIAT"),
  validate(updateStudentSchema),
  studentController.update,
);

studentRouter.patch(
  "/:id/status",
  authenticate,
  authorize("SYSTEM_ADMIN", "ADMINISTRATION", "SECRETARIAT", "HEAD_OF_PROGRAMS"),
  validate(updateStudentStatusSchema),
  studentController.updateStatus,
);

studentRouter.delete(
  "/:id",
  authenticate,
  authorize("SYSTEM_ADMIN"),
  validate(getStudentSchema),
  studentController.delete,
);
