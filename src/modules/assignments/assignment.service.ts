import { prisma } from "../../config/database.js";
import { AppError } from "../../core/errors/AppError.js";
import type {
  AssignmentStatus,
  Prisma,
  Role,
  SubmissionStatus,
} from "../../generated/prisma/client.js";
import {
  assertCourseTeachingAccess,
  assertStudentEnrolled,
  isAcademicOversightRole,
  requireCourse,
  requireStudentForUser,
} from "../../utils/courseAccess.js";
import { assignmentRepository } from "./assignment.repository.js";
import type {
  CreateAssignmentInput,
  GradeSubmissionInput,
  ListAssignmentsQuery,
  ListSubmissionsQuery,
  SubmitAssignmentInput,
  UpdateAssignmentInput,
} from "./assignment.types.js";

const LOCKED_SUBMISSION_STATUSES: readonly SubmissionStatus[] = [
  "MARKED",
  "READY_FOR_REVIEW",
  "SUBMITTED_FOR_REVIEW",
  "APPROVED",
  "PUBLISHED",
];

function sanitizeSubmissionForStudent<
  T extends { status: SubmissionStatus; mark: number | null; feedback: string | null; gradedById: string | null; gradedAt: Date | null; gradedBy: unknown },
>(submission: T): T {
  if (submission.status === "PUBLISHED") {
    return submission;
  }
  return {
    ...submission,
    mark: null,
    feedback: null,
    gradedById: null,
    gradedAt: null,
    gradedBy: null,
  };
}

export const assignmentService = {
  async create(userId: string, role: Role, input: CreateAssignmentInput) {
    await requireCourse(input.courseId);
    await assertCourseTeachingAccess(userId, role, input.courseId);

    const status = input.status ?? "DRAFT";
    return assignmentRepository.create({
      courseId: input.courseId,
      createdById: userId,
      title: input.title,
      instructions: input.instructions,
      totalMarks: input.totalMarks ?? 100,
      submissionFormat: input.submissionFormat ?? "BOTH",
      attachmentName: input.attachmentName ?? null,
      attachmentUrl: input.attachmentUrl ?? null,
      deadline: new Date(input.deadline),
      allowLate: input.allowLate ?? false,
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    });
  },

  async list(userId: string, role: Role, query: ListAssignmentsQuery) {
    if (query.courseId) {
      await requireCourse(query.courseId);
    }

    const extraWhere: Prisma.AssignmentWhereInput = {};

    if (role === "STUDENT") {
      const student = await requireStudentForUser(userId);
      if (query.courseId) {
        await assertStudentEnrolled(userId, query.courseId);
      } else {
        const enrollments = await prisma.enrollment.findMany({
          where: { studentId: student.id, status: "ACTIVE" },
          select: { courseId: true },
        });
        const courseIds = enrollments.map((e) => e.courseId);
        if (courseIds.length === 0) {
          return {
            assignments: [],
            pagination: { page: query.page || 1, limit: query.limit || 20, total: 0, totalPages: 0 },
          };
        }
        extraWhere.courseId = { in: courseIds };
      }

      extraWhere.status = { in: ["PUBLISHED", "CLOSED"] };
    } else if (role === "LECTURER") {
      if (query.courseId) {
        await assertCourseTeachingAccess(userId, role, query.courseId);
      } else {
        const teaching = await prisma.courseLecturer.findMany({
          where: { lecturerId: userId },
          select: { courseId: true },
        });
        const courseIds = teaching.map((t) => t.courseId);
        if (courseIds.length === 0) {
          return {
            assignments: [],
            pagination: { page: query.page || 1, limit: query.limit || 20, total: 0, totalPages: 0 },
          };
        }
        extraWhere.courseId = { in: courseIds };
      }
    } else if (!isAcademicOversightRole(role)) {
      throw new AppError(403, "FORBIDDEN", "You do not have permission to view assignments");
    }

    const { assignments, total, page, limit } = await assignmentRepository.findMany(
      role === "STUDENT" ? { ...query, status: undefined } : query,
      extraWhere,
    );

    return {
      assignments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getById(userId: string, role: Role, id: string) {
    const assignment = await assignmentRepository.findById(id);
    if (!assignment) {
      throw new AppError(404, "ASSIGNMENT_NOT_FOUND", "Assignment not found");
    }

    if (role === "STUDENT") {
      await assertStudentEnrolled(userId, assignment.courseId);
      if (assignment.status !== "PUBLISHED" && assignment.status !== "CLOSED") {
        throw new AppError(403, "ASSIGNMENT_UNAVAILABLE", "This assignment is not published");
      }
      return assignment;
    }

    await assertCourseTeachingAccess(userId, role, assignment.courseId);
    return assignment;
  },

  async update(userId: string, role: Role, id: string, input: UpdateAssignmentInput) {
    const existing = await assignmentRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "ASSIGNMENT_NOT_FOUND", "Assignment not found");
    }
    await assertCourseTeachingAccess(userId, role, existing.courseId);

    const nextStatus = input.status ?? existing.status;
    return assignmentRepository.update(id, {
      ...input,
      ...(input.deadline !== undefined ? { deadline: new Date(input.deadline) } : {}),
      publishedAt:
        nextStatus === "PUBLISHED" && !existing.publishedAt ? new Date() : existing.publishedAt,
    });
  },

  async updateStatus(userId: string, role: Role, id: string, status: AssignmentStatus) {
    const existing = await assignmentRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "ASSIGNMENT_NOT_FOUND", "Assignment not found");
    }
    await assertCourseTeachingAccess(userId, role, existing.courseId);

    return assignmentRepository.update(id, {
      status,
      publishedAt: status === "PUBLISHED" ? existing.publishedAt ?? new Date() : existing.publishedAt,
    });
  },

  async delete(userId: string, role: Role, id: string) {
    const existing = await assignmentRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "ASSIGNMENT_NOT_FOUND", "Assignment not found");
    }
    await assertCourseTeachingAccess(userId, role, existing.courseId);
    await assignmentRepository.delete(id);
  },

  async submit(userId: string, assignmentId: string, input: SubmitAssignmentInput) {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) {
      throw new AppError(404, "ASSIGNMENT_NOT_FOUND", "Assignment not found");
    }

    const student = await assertStudentEnrolled(userId, assignment.courseId);

    if (assignment.status !== "PUBLISHED") {
      throw new AppError(
        400,
        "ASSIGNMENT_NOT_OPEN",
        "Submissions are only accepted for published assignments",
      );
    }

    if (assignment.submissionFormat === "FILE" && !input.attachmentName && !input.attachmentUrl) {
      throw new AppError(400, "ATTACHMENT_REQUIRED", "This assignment requires a file attachment");
    }
    if (assignment.submissionFormat === "TEXT" && !input.answerText?.trim()) {
      throw new AppError(400, "ANSWER_TEXT_REQUIRED", "This assignment requires a written answer");
    }

    const now = new Date();
    const isPastDeadline = now > assignment.deadline;
    if (input.status !== "DRAFT" && isPastDeadline && !assignment.allowLate) {
      throw new AppError(400, "DEADLINE_PASSED", "Assignment submission deadline has passed");
    }

    const existing = await assignmentRepository.findSubmissionByAssignmentAndStudent(
      assignmentId,
      student.id,
    );
    if (existing && LOCKED_SUBMISSION_STATUSES.includes(existing.status)) {
      throw new AppError(
        409,
        "SUBMISSION_LOCKED",
        "Submission has already been marked or locked for review",
      );
    }

    const nextStatus: SubmissionStatus = input.status === "DRAFT" ? "DRAFT" : "SUBMITTED";
    const submission = await assignmentRepository.upsertSubmission(
      assignmentId,
      student.id,
      {
        assignmentId,
        studentId: student.id,
        answerText: input.answerText ?? null,
        attachmentName: input.attachmentName ?? null,
        attachmentUrl: input.attachmentUrl ?? null,
        attachmentMimeType: input.attachmentMimeType ?? null,
        attachmentSize: input.attachmentSize ?? null,
        status: nextStatus,
        submittedAt: now,
        isLate: isPastDeadline,
      },
      {
        answerText: input.answerText ?? null,
        attachmentName: input.attachmentName ?? null,
        attachmentUrl: input.attachmentUrl ?? null,
        attachmentMimeType: input.attachmentMimeType ?? null,
        attachmentSize: input.attachmentSize ?? null,
        status: nextStatus,
        submittedAt: now,
        isLate: isPastDeadline,
      },
    );

    return sanitizeSubmissionForStudent(submission);
  },

  async getMySubmission(userId: string, assignmentId: string) {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) {
      throw new AppError(404, "ASSIGNMENT_NOT_FOUND", "Assignment not found");
    }

    const student = await assertStudentEnrolled(userId, assignment.courseId);
    const submission = await assignmentRepository.findSubmissionByAssignmentAndStudent(
      assignmentId,
      student.id,
    );
    if (!submission) {
      throw new AppError(404, "SUBMISSION_NOT_FOUND", "You have not submitted this assignment yet");
    }

    return sanitizeSubmissionForStudent(submission);
  },

  async listSubmissions(
    userId: string,
    role: Role,
    assignmentId: string,
    query: ListSubmissionsQuery,
  ) {
    const assignment = await assignmentRepository.findById(assignmentId);
    if (!assignment) {
      throw new AppError(404, "ASSIGNMENT_NOT_FOUND", "Assignment not found");
    }

    await assertCourseTeachingAccess(userId, role, assignment.courseId);

    const { submissions, total, page, limit } =
      await assignmentRepository.findSubmissionsByAssignment(assignmentId, query);

    return {
      submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getSubmissionById(userId: string, role: Role, submissionId: string) {
    const submission = await assignmentRepository.findSubmissionById(submissionId);
    if (!submission) {
      throw new AppError(404, "SUBMISSION_NOT_FOUND", "Submission not found");
    }

    if (role === "STUDENT") {
      const student = await requireStudentForUser(userId);
      if (submission.studentId !== student.id) {
        throw new AppError(403, "FORBIDDEN", "You can only view your own submissions");
      }
      return sanitizeSubmissionForStudent(submission);
    }

    await assertCourseTeachingAccess(userId, role, submission.assignment.courseId);
    return submission;
  },

  async gradeSubmission(
    userId: string,
    role: Role,
    submissionId: string,
    input: GradeSubmissionInput,
  ) {
    const submission = await assignmentRepository.findSubmissionById(submissionId);
    if (!submission) {
      throw new AppError(404, "SUBMISSION_NOT_FOUND", "Submission not found");
    }

    await assertCourseTeachingAccess(userId, role, submission.assignment.courseId);

    if (submission.status === "DRAFT") {
      throw new AppError(400, "SUBMISSION_NOT_SUBMITTED", "Cannot grade a draft submission");
    }

    if (input.mark > submission.assignment.totalMarks) {
      throw new AppError(
        400,
        "MARK_EXCEEDS_TOTAL",
        `Mark cannot exceed total marks (${submission.assignment.totalMarks})`,
      );
    }

    return assignmentRepository.updateSubmission(submissionId, {
      mark: input.mark,
      feedback: input.feedback ?? null,
      status: input.status ?? "MARKED",
      gradedById: userId,
      gradedAt: new Date(),
    });
  },

  async updateSubmissionStatus(
    userId: string,
    role: Role,
    submissionId: string,
    status: SubmissionStatus,
  ) {
    const submission = await assignmentRepository.findSubmissionById(submissionId);
    if (!submission) {
      throw new AppError(404, "SUBMISSION_NOT_FOUND", "Submission not found");
    }

    if (status === "APPROVED" || status === "CHANGES_REQUESTED") {
      if (!["HEAD_OF_PROGRAMS", "DIRECTOR", "SYSTEM_ADMIN"].includes(role)) {
        throw new AppError(403, "FORBIDDEN", "Only Head of Programs or leadership can approve results");
      }
    } else if (status === "PUBLISHED") {
      if (!["SECRETARIAT", "HEAD_OF_PROGRAMS", "SYSTEM_ADMIN"].includes(role)) {
        throw new AppError(403, "FORBIDDEN", "Only Secretariat or Head of Programs can publish results");
      }
    } else {
      await assertCourseTeachingAccess(userId, role, submission.assignment.courseId);
    }

    return assignmentRepository.updateSubmission(submissionId, { status });
  },
};
