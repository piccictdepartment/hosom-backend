import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { enrollmentController } from "./enrollment.controller.js";
import { createEnrollmentSchema, listEnrollmentsSchema, updateEnrollmentSchema } from "./enrollment.validation.js";

export const enrollmentRouter = Router();
enrollmentRouter.use(authenticate);
enrollmentRouter.get("/me", authorize("STUDENT"), enrollmentController.listMine);
enrollmentRouter.get("/", validate(listEnrollmentsSchema), enrollmentController.list);
enrollmentRouter.post("/", authorize("SYSTEM_ADMIN", "ADMINISTRATION", "SECRETARIAT", "HEAD_OF_PROGRAMS"), validate(createEnrollmentSchema), enrollmentController.create);
enrollmentRouter.patch("/:id", authorize("SYSTEM_ADMIN", "ADMINISTRATION", "SECRETARIAT", "HEAD_OF_PROGRAMS"), validate(updateEnrollmentSchema), enrollmentController.update);
