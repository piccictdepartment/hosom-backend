import { prisma } from "../../config/database.js";
import { AppError } from "../../core/errors/AppError.js";
import type { EnrollmentStatus, Prisma, Role } from "../../generated/prisma/client.js";
import type { z } from "zod";
import type { createEnrollmentSchema, listEnrollmentsSchema, updateEnrollmentSchema } from "./enrollment.validation.js";

export const enrollmentService = {
  async listMine(userId: string) {
    const student = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
    if (!student) throw new AppError(404, "STUDENT_NOT_FOUND", "Student profile not found");
    return prisma.enrollment.findMany({
      where: { studentId: student.id },
      include: {
        course: {
          include: {
            program: true,
            academicPeriod: true,
            lecturers: { include: { lecturer: { select: { id: true, firstName: true, surname: true, email: true } } } },
          },
        },
        academicPeriod: true,
      },
      orderBy: { enrolledAt: "desc" },
    });
  },
  async list(userId: string, role: Role, query: z.infer<typeof listEnrollmentsSchema>["query"]) {
    const where: Prisma.EnrollmentWhereInput = { ...(query.courseId ? { courseId: query.courseId } : {}), ...(query.status ? { status: query.status } : {}) };
    if (role === "STUDENT") {
      const student = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
      if (!student) throw new AppError(404, "STUDENT_NOT_FOUND", "Student profile not found");
      where.studentId = student.id;
    } else if (role === "LECTURER") {
      const teaching = await prisma.courseLecturer.findMany({ where: { lecturerId: userId }, select: { courseId: true } });
      const assignedIds = teaching.map((item) => item.courseId);
      if (query.courseId && !assignedIds.includes(query.courseId)) throw new AppError(403, "COURSE_ACCESS_DENIED", "You are not assigned to this course");
      where.courseId = query.courseId ? query.courseId : { in: assignedIds };
      if (query.studentId) where.studentId = query.studentId;
    } else if (["SYSTEM_ADMIN", "ADMINISTRATION", "SECRETARIAT", "HEAD_OF_PROGRAMS", "DIRECTOR"].includes(role)) {
      if (query.studentId) where.studentId = query.studentId;
    } else {
      throw new AppError(403, "FORBIDDEN", "You do not have permission to view enrolments");
    }
    return prisma.enrollment.findMany({ where, include: { student: { include: { user: { select: { id: true, firstName: true, surname: true, email: true } } } }, course: true, academicPeriod: true }, orderBy: { enrolledAt: "desc" } });
  },
  async create(input: z.infer<typeof createEnrollmentSchema>["body"]) {
    const [student, course, period] = await Promise.all([
      prisma.student.findUnique({ where: { id: input.studentId }, select: { id: true, status: true } }),
      prisma.course.findUnique({ where: { id: input.courseId }, select: { id: true, status: true } }),
      input.academicPeriodId ? prisma.academicPeriod.findUnique({ where: { id: input.academicPeriodId }, select: { id: true } }) : Promise.resolve(true),
    ]);
    if (!student || student.status !== "ACTIVE") throw new AppError(400, "STUDENT_NOT_ACTIVE", "Only an active student can be enrolled");
    if (!course || course.status !== "ACTIVE") throw new AppError(400, "COURSE_NOT_ACTIVE", "Only an active course can accept enrolments");
    if (!period) throw new AppError(404, "ACADEMIC_PERIOD_NOT_FOUND", "Academic period not found");
    const existing = await prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId: input.studentId, courseId: input.courseId } } });
    if (existing) throw new AppError(409, "ALREADY_ENROLLED", "This student already has an enrolment record for the course");
    return prisma.enrollment.create({ data: input, include: { student: { include: { user: { select: { firstName: true, surname: true, email: true } } } }, course: true, academicPeriod: true } });
  },
  async update(id: string, status: EnrollmentStatus) {
    if (!(await prisma.enrollment.findUnique({ where: { id }, select: { id: true } }))) throw new AppError(404, "ENROLLMENT_NOT_FOUND", "Enrolment not found");
    return prisma.enrollment.update({ where: { id }, data: { status, completedAt: status === "COMPLETED" ? new Date() : null }, include: { student: true, course: true } });
  },
};
