import { z } from "zod";

export const materialTypeEnum = [
  "LESSON",
  "COURSE_OUTLINE",
  "LECTURE_NOTES",
  "PDF_DOCUMENT",
  "PRESENTATION",
  "VIDEO_LECTURE",
  "RECORDED_CLASS",
  "AUDIO_RESOURCE",
  "READING_MATERIAL",
  "BOOK",
  "ONLINE_RESOURCE",
] as const;

export const materialStatusEnum = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

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

const materialFields = {
  unitId: z.uuid().optional().nullable(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  body: z.string().trim().max(100000).optional().nullable(),
  type: z.enum(materialTypeEnum).default("LECTURE_NOTES"),
  status: z.enum(materialStatusEnum).default("DRAFT"),
  order: z.coerce.number().int().min(1).max(10000).default(1),
  url: urlField,
  fileName: z.string().trim().min(1).max(255).optional().nullable(),
  mimeType: z.string().trim().min(1).max(120).optional().nullable(),
  fileSize: z.coerce.number().int().positive().max(500 * 1024 * 1024).optional().nullable(),
  storageKey: z.string().trim().min(1).max(500).optional().nullable(),
  allowDownload: z.boolean().default(true),
  approvedExternal: z.boolean().default(false),
  expiresAt: z.string().pipe(z.coerce.date()).optional().nullable(),
};

export const createMaterialSchema = z.object({
  body: z
    .object({
      courseId: z.uuid(),
      ...materialFields,
    })
    .strict(),
});

export const createCourseMaterialSchema = z.object({
  params: z.object({ courseId: z.uuid() }),
  body: z.object(materialFields).strict(),
});

export const updateMaterialSchema = z.object({
  params: z.object({ id: z.uuid() }),
  body: z
    .object({
      unitId: z.uuid().optional().nullable(),
      title: z.string().trim().min(1).max(200).optional(),
      description: z.string().trim().max(5000).optional().nullable(),
      body: z.string().trim().max(100000).optional().nullable(),
      type: z.enum(materialTypeEnum).optional(),
      status: z.enum(materialStatusEnum).optional(),
      order: z.coerce.number().int().min(1).max(10000).optional(),
      url: urlField,
      fileName: z.string().trim().min(1).max(255).optional().nullable(),
      mimeType: z.string().trim().min(1).max(120).optional().nullable(),
      fileSize: z.coerce.number().int().positive().max(500 * 1024 * 1024).optional().nullable(),
      storageKey: z.string().trim().min(1).max(500).optional().nullable(),
      allowDownload: z.boolean().optional(),
      approvedExternal: z.boolean().optional(),
      expiresAt: z.string().pipe(z.coerce.date()).optional().nullable(),
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const updateMaterialMetadataSchema = z.object({
  params: z.object({ id: z.uuid() }),
  body: z
    .object({
      fileName: z.string().trim().min(1).max(255),
      mimeType: z.string().trim().min(1).max(120),
      fileSize: z.coerce.number().int().positive().max(500 * 1024 * 1024),
      storageKey: z.string().trim().min(1).max(500).optional().nullable(),
      url: urlField,
      allowDownload: z.boolean().optional(),
    })
    .strict(),
});

export const updateMaterialStatusSchema = z.object({
  params: z.object({ id: z.uuid() }),
  body: z
    .object({
      status: z.enum(materialStatusEnum),
    })
    .strict(),
});

export const getMaterialSchema = z.object({
  params: z.object({ id: z.uuid() }),
});

export const listMaterialsSchema = z.object({
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
      unitId: z.uuid().optional(),
      type: z.enum(materialTypeEnum).optional(),
      status: z.enum(materialStatusEnum).optional(),
      search: z.string().trim().min(1).max(120).optional(),
    })
    .strict(),
});

export const listCourseMaterialsSchema = z.object({
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
        .default(50),
      unitId: z.uuid().optional(),
      type: z.enum(materialTypeEnum).optional(),
      status: z.enum(materialStatusEnum).optional(),
      search: z.string().trim().min(1).max(120).optional(),
    })
    .strict(),
});

export const courseUnitsParamSchema = z.object({
  params: z.object({ courseId: z.uuid() }),
});

export const createCourseUnitSchema = z.object({
  params: z.object({ courseId: z.uuid() }),
  body: z
    .object({
      title: z.string().trim().min(1).max(160),
      description: z.string().trim().max(2000).optional().nullable(),
      order: z.coerce.number().int().min(1).max(1000).default(1),
    })
    .strict(),
});
