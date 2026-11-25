import { prisma } from "../config/database.js";
import { AppError } from "../core/errors/AppError.js";
import type { Role } from "../generated/prisma/client.js";

const ACADEMIC_STAFF_ROLES: readonly Role[] = [
  "SYSTEM_ADMIN",
  "ADMINISTRATION",
  "HEAD_OF_PROGRAMS",
  "SECRETARIAT",
  "DIRECTOR",
];

export function isAcademicOversightRole(role: Role): boolean {
  return ACADEMIC_STAFF_ROLES.includes(role);
}

/** Verifies the course exists and returns its minimal record. */
export async function requireCourse(courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, code: true, title: true, status: true },
  });
  if (!course) {
    throw new AppError(404, "COURSE_NOT_FOUND", "Course not found");
  }
  return course;
}

/** Returns the Student record for an authenticated user, or throws 404. */
export async function requireStudentForUser(userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: { id: true, userId: true, studentNumber: true, status: true },
  });
  if (!student) {
    throw new AppError(404, "STUDENT_NOT_FOUND", "Student profile not found");
  }
  return student;
}

/** Checks whether a student is actively enrolled in the given course. */
export async function isStudentEnrolledInCourse(studentId: string, courseId: string): Promise<boolean> {
  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: { studentId, courseId },
    },
    select: { status: true },
  });
  return enrollment?.status === "ACTIVE";
}

/** Ensures an enrolled student, returning the Student record or throwing 403. */
export async function assertStudentEnrolled(userId: string, courseId: string) {
  const student = await requireStudentForUser(userId);
  const enrolled = await isStudentEnrolledInCourse(student.id, courseId);
  if (!enrolled) {
    throw new AppError(
      403,
      "NOT_ENROLLED",
      "You can only access resources for courses in which you are actively enrolled",
    );
  }
  return student;
}

/** Ensures a lecturer is assigned to the course (academic oversight roles bypass). */
export async function assertCourseTeachingAccess(
  userId: string,
  role: Role,
  courseId: string,
  extraAllowedRoles: readonly Role[] = [],
) {
  if (isAcademicOversightRole(role) || extraAllowedRoles.includes(role)) {
    return;
  }
  if (role === "LECTURER") {
    const assignment = await prisma.courseLecturer.findUnique({
      where: {
        courseId_lecturerId: { courseId, lecturerId: userId },
      },
      select: { id: true },
    });
    if (!assignment) {
      throw new AppError(
        403,
        "COURSE_ACCESS_DENIED",
        "You are not assigned to teach this course",
      );
    }
    return;
  }
  throw new AppError(403, "FORBIDDEN", "You do not have permission to manage this course");
}
