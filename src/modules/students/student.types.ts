import type { StudentStatus } from "../../generated/prisma/client.js";

export interface CreateStudentProfileInput {
  userId: string;
  studentNumber?: string | null;
  status?: StudentStatus;
  gender?: string | null;
  dateOfBirth?: Date | null;
  nationality?: string | null;
  address?: string | null;
  district?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  program?: string | null;
  intake?: string | null;
  yearOfStudy?: number | null;
  modeOfLearning?: string | null;
}

export interface RegisterStudentInput {
  firstName: string;
  middleName?: string | null;
  surname: string;
  email: string;
  phone?: string | null;
  password: string;
  studentNumber?: string | null;
  gender?: string | null;
  dateOfBirth?: string | Date | null;
  nationality?: string | null;
  address?: string | null;
  district?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  program?: string | null;
  intake?: string | null;
  yearOfStudy?: number | null;
  modeOfLearning?: string | null;
}

export interface AdminCreateStudentInput extends Omit<RegisterStudentInput, "password"> {
  password?: string;
  status?: StudentStatus;
}

export interface UpdateStudentInput {
  firstName?: string;
  middleName?: string | null;
  surname?: string;
  email?: string;
  phone?: string | null;
  studentNumber?: string | null;
  status?: StudentStatus;
  gender?: string | null;
  dateOfBirth?: string | Date | null;
  nationality?: string | null;
  address?: string | null;
  district?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  program?: string | null;
  intake?: string | null;
  yearOfStudy?: number | null;
  modeOfLearning?: string | null;
}

export interface UpdateOwnStudentProfileInput {
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | Date | null;
  nationality?: string | null;
  address?: string | null;
  district?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
}

export interface ListStudentsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: StudentStatus;
  program?: string;
}
