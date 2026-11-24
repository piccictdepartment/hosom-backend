import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { userController } from "./user.controller.js";
import { createUserSchema, getUserSchema, listUsersSchema, updateUserSchema } from "./user.validation.js";

export const userRouter = Router();

// All user management routes require authentication + administrative role
userRouter.use(authenticate, authorize("SYSTEM_ADMINISTRATOR", "ADMINISTRATION", "ADMIN"));

userRouter.post("/", validate(createUserSchema), userController.create);
userRouter.get("/", validate(listUsersSchema), userController.list);
userRouter.get("/:id", validate(getUserSchema), userController.getById);
userRouter.patch("/:id", validate(updateUserSchema), userController.update);
userRouter.delete("/:id", validate(getUserSchema), userController.delete);
