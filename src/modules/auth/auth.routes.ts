import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { authController } from "./auth.controller.js";
import { studentController } from "../students/student.controller.js";
import { registerStudentSchema } from "../students/student.validation.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  sessionParamSchema,
} from "./auth.validation.js";

export const authRouter = Router();

// Public routes
authRouter.get("/roles", authController.getRoles);
// Staff and privileged accounts may only be created by authorized administrators.
authRouter.post("/register", authenticate, authorize("SYSTEM_ADMIN", "ADMINISTRATION"), validate(registerSchema), authController.register);
authRouter.post("/register/student", validate(registerStudentSchema), studentController.register);
authRouter.post("/login", validate(loginSchema), authController.login);
authRouter.post("/forgot-password", validate(forgotPasswordSchema), authController.forgotPassword);
authRouter.post("/reset-password", validate(resetPasswordSchema), authController.resetPassword);

// Protected routes
authRouter.post("/logout", authenticate, authController.logout);
authRouter.post("/logout-all", authenticate, authController.logoutAll);
authRouter.get("/sessions", authenticate, authController.listSessions);
authRouter.delete("/sessions/:sessionId", authenticate, validate(sessionParamSchema), authController.revokeSession);
authRouter.get("/me", authenticate, authController.me);
authRouter.post("/change-password", authenticate, validate(changePasswordSchema), authController.changePassword);
