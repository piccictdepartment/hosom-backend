import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { courseController } from "./course.controller.js";
import { assignLecturerSchema, courseEnrollmentsParamsSchema, courseIdSchema, courseLecturerParamsSchema, createCourseSchema, listCoursesSchema, updateCourseSchema } from "./course.validation.js";

export const courseRouter = Router();
courseRouter.get("/", authenticate, validate(listCoursesSchema), courseController.list);
courseRouter.get("/:courseId/enrollments", authenticate, authorize("SYSTEM_ADMIN", "ADMINISTRATION", "SECRETARIAT", "HEAD_OF_PROGRAMS", "LECTURER"), validate(courseEnrollmentsParamsSchema), courseController.listEnrollments);
courseRouter.get("/:id", authenticate, validate(courseIdSchema), courseController.getById);
courseRouter.post("/", authenticate, authorize("SYSTEM_ADMIN", "HEAD_OF_PROGRAMS", "ADMINISTRATION"), validate(createCourseSchema), courseController.create);
courseRouter.patch("/:id", authenticate, authorize("SYSTEM_ADMIN", "HEAD_OF_PROGRAMS", "ADMINISTRATION"), validate(updateCourseSchema), courseController.update);
courseRouter.post("/:courseId/lecturers", authenticate, authorize("SYSTEM_ADMIN", "HEAD_OF_PROGRAMS", "ADMINISTRATION"), validate(assignLecturerSchema), courseController.assignLecturer);
courseRouter.delete("/:courseId/lecturers/:lecturerId", authenticate, authorize("SYSTEM_ADMIN", "HEAD_OF_PROGRAMS", "ADMINISTRATION"), validate(courseLecturerParamsSchema), courseController.removeLecturer);
