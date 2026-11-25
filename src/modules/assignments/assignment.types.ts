import type {
  AssignmentStatus,
  SubmissionFormat,
  SubmissionStatus,
} from "../../generated/prisma/client.js";

export interface CreateAssignmentInput {
  courseId: string;
  title: string;
  instructions: string;
  totalMarks?: number;
  submissionFormat?: SubmissionFormat;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  deadline: string | Date;
  allowLate?: boolean;
  status?: AssignmentStatus;
}

export type UpdateAssignmentInput = Partial<Omit<CreateAssignmentInput, "courseId">>;

export interface ListAssignmentsQuery {
  page?: number;
  limit?: number;
  courseId?: string;
  status?: AssignmentStatus;
  search?: string;
}

export interface SubmitAssignmentInput {
  answerText?: string | null;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
  attachmentMimeType?: string | null;
  attachmentSize?: number | null;
  status?: "DRAFT" | "SUBMITTED";
}

export interface GradeSubmissionInput {
  mark: number;
  feedback?: string | null;
  status?: "MARKED" | "READY_FOR_REVIEW" | "SUBMITTED_FOR_REVIEW";
}

export interface ListSubmissionsQuery {
  page?: number;
  limit?: number;
  status?: SubmissionStatus;
}
