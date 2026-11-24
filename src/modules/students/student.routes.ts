import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { studentController } from "./student.controller.js";
import {
  getStudentSchema,
  listStudentsSchema,
  registerStudentSchema,
  updateStudentSchema,
} from "./student.validation.js";

export const studentRouter = Router();

// Public: Student self-registration
studentRouter.post(
  "/register",
  validate(registerStudentSchema),
  studentController.register
);

// Authenticated: Get currently logged in student profile
studentRouter.get("/me", authenticate, studentController.getMe);

// Administrative: View, manage, update students
studentRouter.get(
  "/",
  authenticate,
  authorize("SYSTEM_ADMINISTRATOR", "ADMINISTRATION", "SECRETARIAT", "HEAD_OF_PROGRAMS", "ADMIN"),
  validate(listStudentsSchema),
  studentController.list
);

studentRouter.get(
  "/:id",
  authenticate,
  authorize("SYSTEM_ADMINISTRATOR", "ADMINISTRATION", "SECRETARIAT", "HEAD_OF_PROGRAMS", "LECTURER", "ADMIN"),
  validate(getStudentSchema),
  studentController.getById
);

studentRouter.patch(
  "/:id",
  authenticate,
  authorize("SYSTEM_ADMINISTRATOR", "ADMINISTRATION", "SECRETARIAT", "ADMIN"),
  validate(updateStudentSchema),
  studentController.update
);

studentRouter.delete(
  "/:id",
  authenticate,
  authorize("SYSTEM_ADMINISTRATOR", "ADMIN"),
  validate(getStudentSchema),
  studentController.delete
);
