export interface CreateStudentInput {
  userId: string;
  studentNumber?: string | null;
  gender?: string | null;
  dateOfBirth?: Date | null;
  address?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  program?: string | null;
}

export type UpdateStudentInput = Partial<Omit<CreateStudentInput, "userId">>;

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
  address?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  program?: string | null;
}
