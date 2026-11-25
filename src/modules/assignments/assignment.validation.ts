import { z } from "zod";

export const assignmentStatusEnum = ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"] as const;
export const submissionFormatEnum = ["FILE", "TEXT", "BOTH"] as const;
export const submissionStatusEnum = [
  "DRAFT",
  "SUBMITTED",
  "AWAITING_MARKING",
  "MARKED",
  "READY_FOR_REVIEW",
  "SUBMITTED_FOR_REVIEW",
  "CHANGES_REQUESTED",
  "APPROVED",
  "PUBLISHED",
] as const;

const urlField = z
  .string()
  .trim()
  .max(500)
  .refine(
    (val) => val.startsWith("https://") || val.startsWith("/"),
    "URL must start with https:// or be a relative storage path",
  )
  .optional()
  .nullable();

const assignmentBodyFields = {
  title: z.string().trim().min(1).max(200),
  instructions: z.string().trim().min(1).max(100000),
  totalMarks: z.coerce.number().int().min(1).max(1000).default(100),
  submissionFormat: z.enum(submissionFormatEnum).default("BOTH"),
  attachmentName: z.string().trim().min(1).max(255).optional().nullable(),
  attachmentUrl: urlField,
  deadline: z.string().pipe(z.coerce.date()),
  allowLate: z.boolean().default(false),
  status: z.enum(assignmentStatusEnum).default("DRAFT"),
};

export const createAssignmentSchema = z.object({
  body: z
    .object({
      courseId: z.uuid(),
      ...assignmentBodyFields,
    })
    .strict(),
});

export const createCourseAssignmentSchema = z.object({
  params: z.object({ courseId: z.uuid() }),
  body: z.object(assignmentBodyFields).strict(),
});

export const updateAssignmentSchema = z.object({
  params: z.object({ id: z.uuid() }),
  body: z
    .object({
      title: z.string().trim().min(1).max(200).optional(),
      instructions: z.string().trim().min(1).max(100000).optional(),
      totalMarks: z.coerce.number().int().min(1).max(1000).optional(),
      submissionFormat: z.enum(submissionFormatEnum).optional(),
      attachmentName: z.string().trim().min(1).max(255).optional().nullable(),
      attachmentUrl: urlField,
      deadline: z.string().pipe(z.coerce.date()).optional(),
      allowLate: z.boolean().optional(),
      status: z.enum(assignmentStatusEnum).optional(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const updateAssignmentStatusSchema = z.object({
  params: z.object({ id: z.uuid() }),
  body: z
    .object({
      status: z.enum(assignmentStatusEnum),
    })
    .strict(),
});

export const getAssignmentSchema = z.object({
  params: z.object({ id: z.uuid() }),
});

export const listAssignmentsSchema = z.object({
  query: z
    .object({
      page: z
        .string()
        .regex(/^[1-9]\d*$/)
        .transform(Number)
        .pipe(z.number().int().max(1000000))
        .default(1),
      limit: z
        .string()
        .regex(/^[1-9]\d*$/)
        .transform(Number)
        .pipe(z.number().int().max(100))
        .default(20),
      courseId: z.uuid().optional(),
      status: z.enum(assignmentStatusEnum).optional(),
      search: z.string().trim().min(1).max(120).optional(),
    })
    .strict(),
});

export const listCourseAssignmentsSchema = z.object({
  params: z.object({ courseId: z.uuid() }),
  query: z
    .object({
      page: z
        .string()
        .regex(/^[1-9]\d*$/)
        .transform(Number)
        .pipe(z.number().int().max(1000000))
        .default(1),
      limit: z
        .string()
        .regex(/^[1-9]\d*$/)
        .transform(Number)
        .pipe(z.number().int().max(100))
        .default(20),
      status: z.enum(assignmentStatusEnum).optional(),
      search: z.string().trim().min(1).max(120).optional(),
    })
    .strict(),
});

export const submitAssignmentSchema = z.object({
  params: z.object({ id: z.uuid() }),
  body: z
    .object({
      answerText: z.string().trim().max(100000).optional().nullable(),
      attachmentName: z.string().trim().min(1).max(255).optional().nullable(),
      attachmentUrl: urlField,
      attachmentMimeType: z.string().trim().min(1).max(120).optional().nullable(),
      attachmentSize: z.coerce.number().int().positive().max(100 * 1024 * 1024).optional().nullable(),
      status: z.enum(["DRAFT", "SUBMITTED"]).default("SUBMITTED"),
    })
    .strict()
    .refine(
      (data) => Boolean(data.answerText?.trim() || data.attachmentName || data.attachmentUrl),
      { message: "Provide answer text or an attachment" },
    ),
});

export const listSubmissionsSchema = z.object({
  params: z.object({ id: z.uuid() }),
  query: z
    .object({
      page: z
        .string()
        .regex(/^[1-9]\d*$/)
        .transform(Number)
        .pipe(z.number().int().max(1000000))
        .default(1),
      limit: z
        .string()
        .regex(/^[1-9]\d*$/)
        .transform(Number)
        .pipe(z.number().int().max(100))
        .default(20),
      status: z.enum(submissionStatusEnum).optional(),
    })
    .strict(),
});

export const submissionParamSchema = z.object({
  params: z.object({ submissionId: z.uuid() }),
});

export const gradeSubmissionSchema = z.object({
  params: z.object({ submissionId: z.uuid() }),
  body: z
    .object({
      mark: z.coerce.number().min(0).max(1000),
      feedback: z.string().trim().max(5000).optional().nullable(),
      status: z.enum(["MARKED", "READY_FOR_REVIEW", "SUBMITTED_FOR_REVIEW"]).default("MARKED"),
    })
    .strict(),
});

export const updateSubmissionStatusSchema = z.object({
  params: z.object({ submissionId: z.uuid() }),
  body: z
    .object({
      status: z.enum(submissionStatusEnum),
    })
    .strict(),
});
