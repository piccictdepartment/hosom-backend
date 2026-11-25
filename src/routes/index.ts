import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import { userRouter } from "../modules/users/user.routes.js";
import { programRouter } from "../modules/programs/program.routes.js";
import { courseRouter } from "../modules/courses/course.routes.js";
import { enrollmentRouter } from "../modules/enrollments/enrollment.routes.js";
import { studentRouter } from "../modules/students/student.routes.js";
import { courseMaterialRouter, materialRouter } from "../modules/materials/material.routes.js";
import {
  assignmentRouter,
  courseAssignmentRouter,
  submissionRouter,
} from "../modules/assignments/assignment.routes.js";

export const apiRouter = Router();
apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/programs", programRouter);
apiRouter.use("/courses", courseRouter);
apiRouter.use("/enrollments", enrollmentRouter);
apiRouter.use("/students", studentRouter);
apiRouter.use("/materials", materialRouter);
apiRouter.use("/assignments", assignmentRouter);
apiRouter.use("/submissions", submissionRouter);
apiRouter.use("/courses/:courseId", courseMaterialRouter);
apiRouter.use("/courses/:courseId", courseAssignmentRouter);
