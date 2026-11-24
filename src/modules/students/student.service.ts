import { prisma } from "../../config/database.js";
import { AppError } from "../../core/errors/AppError.js";
import { issueToken } from "../../core/security/jwt.js";
import { hashPassword } from "../../core/security/password.js";
import { studentRepository } from "./student.repository.js";
import type { RegisterStudentInput, UpdateStudentInput } from "./student.types.js";

export const studentService = {
  async register(input: RegisterStudentInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists");
    }

    if (input.studentNumber) {
      const existingStudentNum = await prisma.student.findUnique({
        where: { studentNumber: input.studentNumber },
      });
      if (existingStudentNum) {
        throw new AppError(409, "STUDENT_NUMBER_TAKEN", "Student number already in use");
      }
    }

    const passwordHash = await hashPassword(input.password);
    const dob = input.dateOfBirth ? new Date(input.dateOfBirth) : null;

    // Create user and student profile atomically in a transaction
    const { user, student } = await prisma.$transaction(async (tx) => {
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
          loggedInAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const createdStudent = await tx.student.create({
        data: {
          userId: createdUser.id,
          studentNumber: input.studentNumber ?? null,
          gender: input.gender ?? null,
          dateOfBirth: dob,
          address: input.address ?? null,
          guardianName: input.guardianName ?? null,
          guardianPhone: input.guardianPhone ?? null,
          program: input.program ?? null,
        },
      });

      return { user: createdUser, student: createdStudent };
    });

    const token = await issueToken(user.id, user.role);
    return { user, student, token };
  },

  async list(query: { page?: number; limit?: number }) {
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

  async getByUserId(userId: string) {
    const student = await studentRepository.findByUserId(userId);
    if (!student) throw new AppError(404, "STUDENT_NOT_FOUND", "Student record not found");
    return student;
  },

  async update(id: string, input: UpdateStudentInput) {
    const existing = await studentRepository.findById(id);
    if (!existing) throw new AppError(404, "STUDENT_NOT_FOUND", "Student record not found");
    return studentRepository.update(id, input);
  },

  async delete(id: string) {
    const existing = await studentRepository.findById(id);
    if (!existing) throw new AppError(404, "STUDENT_NOT_FOUND", "Student record not found");
    await studentRepository.delete(id);
  },
};
