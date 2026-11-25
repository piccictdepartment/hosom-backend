import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { materialController } from "./material.controller.js";
import {
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

const materialManagers = [
  "LECTURER",
  "MEDIA",
  "HEAD_OF_PROGRAMS",
  "ADMINISTRATION",
  "SYSTEM_ADMIN",
] as const;

const materialReaders = [
  "STUDENT",
  "LECTURER",
  "MEDIA",
  "HEAD_OF_PROGRAMS",
  "ADMINISTRATION",
  "SECRETARIAT",
  "DIRECTOR",
  "SYSTEM_ADMIN",
] as const;

export const materialRouter = Router();

materialRouter.use(authenticate);

materialRouter.post(
  "/",
  authorize(...materialManagers),
  validate(createMaterialSchema),
  materialController.create,
);

materialRouter.get(
  "/",
  authorize(...materialReaders),
  validate(listMaterialsSchema),
  materialController.list,
);

materialRouter.get(
  "/:id",
  authorize(...materialReaders),
  validate(getMaterialSchema),
  materialController.getById,
);

materialRouter.patch(
  "/:id",
  authorize(...materialManagers),
  validate(updateMaterialSchema),
  materialController.update,
);

materialRouter.patch(
  "/:id/metadata",
  authorize(...materialManagers),
  validate(updateMaterialMetadataSchema),
  materialController.updateMetadata,
);

materialRouter.patch(
  "/:id/status",
  authorize(...materialManagers),
  validate(updateMaterialStatusSchema),
  materialController.updateStatus,
);

materialRouter.delete(
  "/:id",
  authorize(...materialManagers),
  validate(getMaterialSchema),
  materialController.delete,
);

/** Nested course routes: /api/courses/:courseId/materials & /units */
export const courseMaterialRouter = Router({ mergeParams: true });

courseMaterialRouter.use(authenticate);

courseMaterialRouter.get(
  "/materials",
  authorize(...materialReaders),
  validate(listCourseMaterialsSchema),
  materialController.listForCourse,
);

courseMaterialRouter.post(
  "/materials",
  authorize(...materialManagers),
  validate(createCourseMaterialSchema),
  materialController.createForCourse,
);

courseMaterialRouter.get(
  "/units",
  authorize(...materialReaders),
  validate(courseUnitsParamSchema),
  materialController.listUnits,
);

courseMaterialRouter.post(
  "/units",
  authorize(...materialManagers),
  validate(createCourseUnitSchema),
  materialController.createUnit,
);
