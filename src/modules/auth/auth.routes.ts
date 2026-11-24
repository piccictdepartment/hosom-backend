import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authController } from "./auth.controller.js";
import { studentController } from "../students/student.controller.js";
import { registerStudentSchema } from "../students/student.validation.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.validation.js";

export const authRouter = Router();

// Public routes
authRouter.get("/roles", authController.getRoles);
authRouter.post("/register", validate(registerSchema), authController.register);
authRouter.post("/register/student", validate(registerStudentSchema), studentController.register);
authRouter.post("/login", validate(loginSchema), authController.login);
authRouter.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);
authRouter.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);

// Protected routes
authRouter.post("/logout", authenticate, authController.logout);
authRouter.get("/me", authenticate, authController.me);
