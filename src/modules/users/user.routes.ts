import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { userController } from "./user.controller.js";
import { createUserSchema, getUserSchema, listUsersSchema, updateUserSchema } from "./user.validation.js";

export const userRouter = Router();

userRouter.post("/", validate(createUserSchema), userController.create);
userRouter.get("/", validate(listUsersSchema), userController.list);
userRouter.get("/:id", validate(getUserSchema), userController.getById);
userRouter.patch("/:id", validate(updateUserSchema), userController.update);
userRouter.delete("/:id", validate(getUserSchema), userController.delete);
