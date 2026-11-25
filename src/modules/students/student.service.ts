import { randomBytes } from "node:crypto";
import { prisma } from "../../config/database.js";
import { AppError } from "../../core/errors/AppError.js";
import { hashPassword } from "../../core/security/password.js";
import { Prisma, type StudentStatus } from "../../generated/prisma/client.js";
import { authService } from "../auth/auth.service.js";
import type { AuthSessionContext } from "../auth/auth.types.js";
import { studentRepository } from "./student.repository.js";
import type {
  AdminCreateStudentInput,
  ListStudentsQuery,
  RegisterStudentInput,
  UpdateOwnStudentProfileInput,
  UpdateStudentInput,
} from "./student.types.js";

/** Generates the next sequential institutional ID such as HOSOM/2026/001. */
async function generateNextStudentNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `HOSOM/${year}/`;

  const latest = await tx.student.findMany({
    where: { studentNumber: { startsWith: prefix } },
    select: { studentNumber: true },
  });

  let maxSeq = 0;
  for (const row of latest) {
    const suffix = row.studentNumber?.slice(prefix.length) ?? "";
    const parsed = Number.parseInt(suffix, 10);
    if (!Number.isNaN(parsed) && parsed > maxSeq) {
      maxSeq = parsed;
    }
  }

  return `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;
}

async function createStudentRecord(
  input: AdminCreateStudentInput & { password: string },
) {
  const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingEmail) {
    throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists");
  }

  if (input.studentNumber) {
    const existingNumber = await prisma.student.findUnique({
      where: { studentNumber: input.studentNumber },
    });
    if (existingNumber) {
      throw new AppError(409, "STUDENT_NUMBER_TAKEN", "Student number already in use");
    }
  }

  const passwordHash = await hashPassword(input.password);
  const dob = input.dateOfBirth ? new Date(input.dateOfBirth) : null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const studentNumber = input.studentNumber || (await generateNextStudentNumber(tx));

        const createdUser = await tx.user.create({
          data: {
            firstName: input.firstName,
            middleName: input.middleName ?? null,
            surname: input.surname,
            email: input.email,
            phone: input.phone ?? null,
            passwordHash,
            role: "STUDENT",
          },
          select: {
            id: true,
            firstName: true,
            middleName: true,
            surname: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            loggedInAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        const createdStudent = await tx.student.create({
          data: {
            userId: createdUser.id,
            studentNumber,
            status: input.status ?? "PENDING",
            gender: input.gender ?? null,
            dateOfBirth: dob,
            nationality: input.nationality ?? null,
            address: input.address ?? null,
            district: input.district ?? null,
            guardianName: input.guardianName ?? null,
            guardianPhone: input.guardianPhone ?? null,
            program: input.program ?? null,
            intake: input.intake ?? null,
            yearOfStudy: input.yearOfStudy ?? null,
            modeOfLearning: input.modeOfLearning ?? null,
          },
        });

        return { user: createdUser, student: createdStudent };
      });
    } catch (error) {
      const isUniqueConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
      // Retry only when studentNumber was auto-generated and collided concurrently.
      if (isUniqueConflict && !input.studentNumber && attempt < 4) {
        continue;
      }
      throw error;
    }
  }

  throw new AppError(500, "STUDENT_ID_GENERATION_FAILED", "Could not allocate unique student ID");
}

export const studentService = {
  async register(input: RegisterStudentInput, ctx?: AuthSessionContext) {
    const { user, student } = await createStudentRecord({
      ...input,
      status: "PENDING",
    });
    const { token, sessionId, expiresAt } = await authService.createSessionToken(
      user.id,
      user.role,
      ctx,
    );
    return { user, student, token, sessionId, expiresAt };
  },

  async createByAdmin(input: AdminCreateStudentInput) {
    const rawPassword = input.password || randomBytes(16).toString("hex");
    return createStudentRecord({ ...input, password: rawPassword });
  },

  async list(query: ListStudentsQuery) {
    const { students, total } = await studentRepository.findMany(query);
    const limit = query.limit || 20;
    const page = query.page || 1;
    return {
      students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id: string) {
    const student = await studentRepository.findById(id);
    if (!student) throw new AppError(404, "STUDENT_NOT_FOUND", "Student record not found");
    return student;
  },

  async getByIdForUser(id: string, userId: string, role: string) {
    const student = await studentRepository.findById(id);
    if (!student) throw new AppError(404, "STUDENT_NOT_FOUND", "Student record not found");
    if (role === "LECTURER") {
      const assignedCourses = await prisma.courseLecturer.findMany({ where: { lecturerId: userId }, select: { courseId: true } });
      const allowedCourseIds = assignedCourses.map((item) => item.courseId);
      const visibleEnrollment = student.enrollments.some((item) => allowedCourseIds.includes(item.course.id));
      if (!visibleEnrollment) throw new AppError(403, "STUDENT_ACCESS_DENIED", "You can only view students enrolled in your assigned courses");
    }
    return student;
  },

  async getByUserId(userId: string) {
    const student = await studentRepository.findByUserId(userId);
    if (!student) throw new AppError(404, "STUDENT_NOT_FOUND", "Student record not found");
    return student;
  },

  async update(id: string, input: UpdateStudentInput) {
    const existing = await studentRepository.findById(id);
    if (!existing) throw new AppError(404, "STUDENT_NOT_FOUND", "Student record not found");

    if (input.studentNumber && input.studentNumber !== existing.studentNumber) {
      const conflict = await studentRepository.findByStudentNumber(input.studentNumber);
      if (conflict) {
        throw new AppError(409, "STUDENT_NUMBER_TAKEN", "Student number already in use");
      }
    }

    if (input.email && input.email !== existing.user.email) {
      const emailConflict = await prisma.user.findUnique({ where: { email: input.email } });
      if (emailConflict) {
        throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists");
      }
    }

    const { firstName, middleName, surname, email, phone, dateOfBirth, ...restStudent } = input;
    const userData: Prisma.UserUpdateInput = {
      ...(firstName !== undefined ? { firstName } : {}),
      ...(middleName !== undefined ? { middleName } : {}),
      ...(surname !== undefined ? { surname } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(phone !== undefined ? { phone } : {}),
    };

    const studentData: Prisma.StudentUpdateInput = {
      ...restStudent,
      ...(dateOfBirth !== undefined
        ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }
        : {}),
    };

    return studentRepository.updateStudentAndUser(id, studentData, userData);
  },

  async updateOwnProfile(userId: string, input: UpdateOwnStudentProfileInput) {
    const existing = await studentRepository.findByUserId(userId);
    if (!existing) throw new AppError(404, "STUDENT_NOT_FOUND", "Student record not found");

    const { phone, dateOfBirth, ...studentFields } = input;
    return studentRepository.updateStudentAndUser(
      existing.id,
      {
        ...studentFields,
        ...(dateOfBirth !== undefined
          ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }
          : {}),
      },
      phone !== undefined ? { phone } : undefined,
    );
  },

  async updateStatus(id: string, status: StudentStatus) {
    const existing = await studentRepository.findById(id);
    if (!existing) throw new AppError(404, "STUDENT_NOT_FOUND", "Student record not found");
    return studentRepository.updateStudentAndUser(id, { status });
  },

  async delete(id: string) {
    const existing = await studentRepository.findById(id);
    if (!existing) throw new AppError(404, "STUDENT_NOT_FOUND", "Student record not found");
    await prisma.user.delete({ where: { id: existing.userId } });
  },
};
