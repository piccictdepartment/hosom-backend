import { prisma } from "../../config/database.js";
import { AppError } from "../../core/errors/AppError.js";
import type { Prisma, Role } from "../../generated/prisma/client.js";
import type { z } from "zod";
import type { assignLecturerSchema, createCourseSchema, listCoursesSchema, updateCourseSchema } from "./course.validation.js";

export const courseService = {
  async list(userId: string, role: Role, query: z.infer<typeof listCoursesSchema>["query"]) {
    const where: Prisma.CourseWhereInput = {
      ...(query.programId ? { programId: query.programId } : {}),
      ...(query.academicPeriodId ? { academicPeriodId: query.academicPeriodId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { OR: [{ code: { contains: query.search } }, { title: { contains: query.search } }] } : {}),
    };
    if (query.mine === "true" || role === "LECTURER") where.lecturers = { some: { lecturerId: userId } };
    if (role === "STUDENT") {
      const student = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
      if (!student) throw new AppError(404, "STUDENT_NOT_FOUND", "Student profile not found");
      where.enrollments = { some: { studentId: student.id, status: "ACTIVE" } };
    }
    return prisma.course.findMany({ where, include: { program: true, academicPeriod: true, lecturers: { include: { lecturer: { select: { id: true, firstName: true, surname: true, email: true } } } }, _count: { select: { enrollments: true, materials: true, assignments: true } } }, orderBy: { code: "asc" } });
  },
  async getById(userId: string, role: Role, id: string) {
    const course = await prisma.course.findUnique({ where: { id }, include: { program: true, academicPeriod: true, lecturers: { include: { lecturer: { select: { id: true, firstName: true, surname: true, email: true } } } }, _count: { select: { enrollments: true, materials: true, assignments: true } } } });
    if (!course) throw new AppError(404, "COURSE_NOT_FOUND", "Course not found");
    if (role === "STUDENT") {
      const student = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
      const enrollment = student ? await prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId: student.id, courseId: course.id } }, select: { status: true } }) : null;
      if (enrollment?.status !== "ACTIVE") throw new AppError(403, "NOT_ENROLLED", "You are not enrolled in this course");
    }
    if (role === "LECTURER" && !course.lecturers.some((assignment) => assignment.lecturerId === userId)) throw new AppError(403, "COURSE_ACCESS_DENIED", "You are not assigned to this course");
    return course;
  },
  create(input: z.infer<typeof createCourseSchema>["body"]) { return prisma.course.create({ data: input }); },
  async update(id: string, input: z.infer<typeof updateCourseSchema>["body"]) {
    if (!(await prisma.course.findUnique({ where: { id }, select: { id: true } }))) throw new AppError(404, "COURSE_NOT_FOUND", "Course not found");
    return prisma.course.update({ where: { id }, data: input });
  },
  async assignLecturer(courseId: string, input: z.infer<typeof assignLecturerSchema>["body"]) {
    const [course, lecturer] = await Promise.all([
      prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: input.lecturerId }, select: { id: true, role: true, isActive: true } }),
    ]);
    if (!course) throw new AppError(404, "COURSE_NOT_FOUND", "Course not found");
    if (!lecturer || lecturer.role !== "LECTURER" || !lecturer.isActive) throw new AppError(400, "INVALID_LECTURER", "Select an active lecturer account");
    return prisma.courseLecturer.upsert({ where: { courseId_lecturerId: { courseId, lecturerId: lecturer.id } }, create: { courseId, lecturerId: lecturer.id, isPrimary: input.isPrimary ?? true }, update: { isPrimary: input.isPrimary ?? true } });
  },
  async removeLecturer(courseId: string, lecturerId: string) {
    const result = await prisma.courseLecturer.deleteMany({ where: { courseId, lecturerId } });
    if (!result.count) throw new AppError(404, "ASSIGNMENT_NOT_FOUND", "Lecturer assignment not found");
  },
  async listEnrollments(userId: string, role: Role, courseId: string) {
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) throw new AppError(404, "COURSE_NOT_FOUND", "Course not found");
    if (role === "LECTURER") {
      const assigned = await prisma.courseLecturer.findUnique({ where: { courseId_lecturerId: { courseId, lecturerId: userId } }, select: { id: true } });
      if (!assigned) throw new AppError(403, "COURSE_ACCESS_DENIED", "You are not assigned to this course");
    }
    return prisma.enrollment.findMany({ where: { courseId }, include: { student: { include: { user: { select: { id: true, firstName: true, surname: true, email: true, phone: true } } } } }, orderBy: { enrolledAt: "desc" } });
  },
};
