import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { programController } from "./program.controller.js";
import { createProgramSchema, listProgramsSchema, programIdSchema, updateProgramSchema } from "./program.validation.js";

export const programRouter = Router();
programRouter.get("/", validate(listProgramsSchema), programController.list);
programRouter.get("/:id", validate(programIdSchema), programController.getById);
programRouter.post("/", authenticate, authorize("SYSTEM_ADMIN", "HEAD_OF_PROGRAMS", "ADMINISTRATION"), validate(createProgramSchema), programController.create);
programRouter.patch("/:id", authenticate, authorize("SYSTEM_ADMIN", "HEAD_OF_PROGRAMS", "ADMINISTRATION"), validate(updateProgramSchema), programController.update);
