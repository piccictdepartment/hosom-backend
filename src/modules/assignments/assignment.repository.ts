import { prisma } from "../../config/database.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { ListAssignmentsQuery, ListSubmissionsQuery } from "./assignment.types.js";

const assignmentInclude = {
  course: {
    select: { id: true, code: true, title: true },
  },
  createdBy: {
    select: { id: true, firstName: true, surname: true, role: true },
  },
  _count: {
    select: { submissions: true },
  },
} as const;

const submissionInclude = {
  assignment: {
    select: {
      id: true,
      title: true,
      courseId: true,
      totalMarks: true,
      deadline: true,
      course: { select: { id: true, code: true, title: true } },
    },
  },
  student: {
    select: {
      id: true,
      studentNumber: true,
      program: true,
      user: {
        select: {
          id: true,
          firstName: true,
          surname: true,
          email: true,
        },
      },
    },
  },
  gradedBy: {
    select: { id: true, firstName: true, surname: true },
  },
} as const;

export const assignmentRepository = {
  create(data: Prisma.AssignmentUncheckedCreateInput) {
    return prisma.assignment.create({
      data,
      include: assignmentInclude,
    });
  },

  findById(id: string) {
    return prisma.assignment.findUnique({
      where: { id },
      include: assignmentInclude,
    });
  },

  async findMany(
    query: ListAssignmentsQuery,
    extraWhere?: Prisma.AssignmentWhereInput,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const where: Prisma.AssignmentWhereInput = {
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search } },
              { instructions: { contains: query.search } },
            ],
          }
        : {}),
      ...(extraWhere ?? {}),
    };

    const [assignments, total] = await prisma.$transaction([
      prisma.assignment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
        include: assignmentInclude,
      }),
      prisma.assignment.count({ where }),
    ]);

    return { assignments, total, page, limit };
  },

  update(id: string, data: Prisma.AssignmentUncheckedUpdateInput) {
    return prisma.assignment.update({
      where: { id },
      data,
      include: assignmentInclude,
    });
  },

  delete(id: string) {
    return prisma.assignment.delete({ where: { id } });
  },

  findSubmissionByAssignmentAndStudent(assignmentId: string, studentId: string) {
    return prisma.assignmentSubmission.findUnique({
      where: {
        assignmentId_studentId: { assignmentId, studentId },
      },
      include: submissionInclude,
    });
  },

  findSubmissionById(id: string) {
    return prisma.assignmentSubmission.findUnique({
      where: { id },
      include: submissionInclude,
    });
  },

  upsertSubmission(
    assignmentId: string,
    studentId: string,
    createData: Prisma.AssignmentSubmissionUncheckedCreateInput,
    updateData: Prisma.AssignmentSubmissionUncheckedUpdateInput,
  ) {
    return prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: { assignmentId, studentId },
      },
      create: createData,
      update: updateData,
      include: submissionInclude,
    });
  },

  async findSubmissionsByAssignment(assignmentId: string, query: ListSubmissionsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: Prisma.AssignmentSubmissionWhereInput = {
      assignmentId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [submissions, total] = await prisma.$transaction([
      prisma.assignmentSubmission.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ submittedAt: "desc" }],
        include: submissionInclude,
      }),
      prisma.assignmentSubmission.count({ where }),
    ]);

    return { submissions, total, page, limit };
  },

  updateSubmission(id: string, data: Prisma.AssignmentSubmissionUncheckedUpdateInput) {
    return prisma.assignmentSubmission.update({
      where: { id },
      data,
      include: submissionInclude,
    });
  },
};
