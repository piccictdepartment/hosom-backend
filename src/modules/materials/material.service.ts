import { prisma } from "../../config/database.js";
import { AppError } from "../../core/errors/AppError.js";
import type { MaterialStatus, MaterialType, Prisma, Role } from "../../generated/prisma/client.js";
import {
  assertCourseTeachingAccess,
  assertStudentEnrolled,
  isAcademicOversightRole,
  requireCourse,
  requireStudentForUser,
} from "../../utils/courseAccess.js";
import { materialRepository } from "./material.repository.js";
import type {
  CreateCourseUnitInput,
  CreateMaterialInput,
  ListMaterialsQuery,
  MaterialMetadataInput,
  UpdateMaterialInput,
} from "./material.types.js";

function assertPublishable(material: {
  type: MaterialType;
  body: string | null;
  url: string | null;
  fileName: string | null;
  storageKey: string | null;
  approvedExternal: boolean;
}) {
  const hasContent = Boolean(
    material.body?.trim() || material.url?.trim() || material.fileName?.trim() || material.storageKey?.trim(),
  );
  if (!hasContent) {
    throw new AppError(
      400,
      "MATERIAL_INCOMPLETE",
      "Add lesson text, file metadata, or a resource URL before publishing",
    );
  }
  if (material.type === "ONLINE_RESOURCE" && !material.approvedExternal) {
    throw new AppError(
      400,
      "EXTERNAL_APPROVAL_REQUIRED",
      "Confirm external resource review before publishing",
    );
  }
}

export const materialService = {
  async create(userId: string, role: Role, input: CreateMaterialInput) {
    await requireCourse(input.courseId);
    await assertCourseTeachingAccess(userId, role, input.courseId, ["MEDIA"]);

    if (input.unitId) {
      const unit = await materialRepository.findUnitById(input.unitId);
      if (!unit || unit.courseId !== input.courseId) {
        throw new AppError(400, "INVALID_UNIT", "Course unit does not belong to the selected course");
      }
    }

    const materialType = input.type ?? "LECTURE_NOTES";
    const status = input.status ?? "DRAFT";

    if (status === "PUBLISHED") {
      assertPublishable({
        type: materialType,
        body: input.body ?? null,
        url: input.url ?? null,
        fileName: input.fileName ?? null,
        storageKey: input.storageKey ?? null,
        approvedExternal: input.approvedExternal ?? false,
      });
    }

    const expiresAt = input.expiresAt
      ? new Date(input.expiresAt)
      : status === "PUBLISHED" && materialType === "RECORDED_CLASS"
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        : null;

    return materialRepository.create({
      courseId: input.courseId,
      unitId: input.unitId ?? null,
      createdById: userId,
      title: input.title,
      description: input.description ?? null,
      body: input.body ?? null,
      type: materialType,
      status,
      order: input.order ?? 1,
      url: input.url ?? null,
      fileName: input.fileName ?? null,
      mimeType: input.mimeType ?? null,
      fileSize: input.fileSize ?? null,
      storageKey: input.storageKey ?? null,
      allowDownload: input.allowDownload ?? true,
      approvedExternal: input.approvedExternal ?? false,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      expiresAt,
    });
  },

  async list(userId: string, role: Role, query: ListMaterialsQuery) {
    if (query.courseId) {
      await requireCourse(query.courseId);
    }

    const extraWhere: Prisma.LearningMaterialWhereInput = {};

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
            materials: [],
            pagination: { page: query.page || 1, limit: query.limit || 20, total: 0, totalPages: 0 },
          };
        }
        extraWhere.courseId = { in: courseIds };
      }

      // Students can only see published, non-expired materials.
      extraWhere.status = "PUBLISHED";
      extraWhere.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];
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
            materials: [],
            pagination: { page: query.page || 1, limit: query.limit || 20, total: 0, totalPages: 0 },
          };
        }
        extraWhere.courseId = { in: courseIds };
      }
    } else if (!isAcademicOversightRole(role) && role !== "MEDIA") {
      throw new AppError(403, "FORBIDDEN", "You do not have permission to view learning materials");
    }

    const { materials, total, page, limit } = await materialRepository.findMany(
      role === "STUDENT" ? { ...query, status: undefined } : query,
      extraWhere,
    );

    return {
      materials,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getById(userId: string, role: Role, id: string) {
    const material = await materialRepository.findById(id);
    if (!material) {
      throw new AppError(404, "MATERIAL_NOT_FOUND", "Learning material not found");
    }

    if (role === "STUDENT") {
      await assertStudentEnrolled(userId, material.courseId);
      if (material.status !== "PUBLISHED") {
        throw new AppError(403, "MATERIAL_UNPUBLISHED", "This learning material is not published");
      }
      if (material.expiresAt && material.expiresAt <= new Date()) {
        throw new AppError(403, "MATERIAL_EXPIRED", "This recorded learning material has expired");
      }
      return material;
    }

    await assertCourseTeachingAccess(userId, role, material.courseId, ["MEDIA"]);
    return material;
  },

  async update(userId: string, role: Role, id: string, input: UpdateMaterialInput) {
    const existing = await materialRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "MATERIAL_NOT_FOUND", "Learning material not found");
    }
    await assertCourseTeachingAccess(userId, role, existing.courseId, ["MEDIA"]);

    if (input.unitId) {
      const unit = await materialRepository.findUnitById(input.unitId);
      if (!unit || unit.courseId !== existing.courseId) {
        throw new AppError(400, "INVALID_UNIT", "Course unit does not belong to this course");
      }
    }

    const nextType = input.type ?? existing.type;
    const nextStatus = input.status ?? existing.status;

    if (nextStatus === "PUBLISHED") {
      assertPublishable({
        type: nextType,
        body: input.body !== undefined ? input.body : existing.body,
        url: input.url !== undefined ? input.url : existing.url,
        fileName: input.fileName !== undefined ? input.fileName : existing.fileName,
        storageKey: input.storageKey !== undefined ? input.storageKey : existing.storageKey,
        approvedExternal:
          input.approvedExternal !== undefined ? input.approvedExternal : existing.approvedExternal,
      });
    }

    const publishedAt =
      nextStatus === "PUBLISHED" && !existing.publishedAt ? new Date() : existing.publishedAt;

    return materialRepository.update(id, {
      ...input,
      ...(input.expiresAt !== undefined
        ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null }
        : {}),
      publishedAt,
    });
  },

  async updateMetadata(
    userId: string,
    role: Role,
    id: string,
    metadata: MaterialMetadataInput,
  ) {
    const existing = await materialRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "MATERIAL_NOT_FOUND", "Learning material not found");
    }
    await assertCourseTeachingAccess(userId, role, existing.courseId, ["MEDIA"]);

    return materialRepository.update(id, {
      fileName: metadata.fileName,
      mimeType: metadata.mimeType,
      fileSize: metadata.fileSize,
      ...(metadata.storageKey !== undefined ? { storageKey: metadata.storageKey } : {}),
      ...(metadata.url !== undefined ? { url: metadata.url } : {}),
      ...(metadata.allowDownload !== undefined ? { allowDownload: metadata.allowDownload } : {}),
    });
  },

  async updateStatus(userId: string, role: Role, id: string, status: MaterialStatus) {
    const existing = await materialRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "MATERIAL_NOT_FOUND", "Learning material not found");
    }
    await assertCourseTeachingAccess(userId, role, existing.courseId, ["MEDIA"]);

    if (status === "PUBLISHED") {
      assertPublishable(existing);
    }

    const expiresAt =
      status === "PUBLISHED" && existing.type === "RECORDED_CLASS" && !existing.expiresAt
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        : existing.expiresAt;

    return materialRepository.update(id, {
      status,
      publishedAt: status === "PUBLISHED" ? existing.publishedAt ?? new Date() : existing.publishedAt,
      expiresAt,
    });
  },

  async delete(userId: string, role: Role, id: string) {
    const existing = await materialRepository.findById(id);
    if (!existing) {
      throw new AppError(404, "MATERIAL_NOT_FOUND", "Learning material not found");
    }
    await assertCourseTeachingAccess(userId, role, existing.courseId, ["MEDIA"]);
    await materialRepository.delete(id);
  },

  async createUnit(userId: string, role: Role, input: CreateCourseUnitInput) {
    await requireCourse(input.courseId);
    await assertCourseTeachingAccess(userId, role, input.courseId, ["MEDIA"]);
    return materialRepository.createUnit({
      courseId: input.courseId,
      title: input.title,
      description: input.description ?? null,
      order: input.order ?? 1,
    });
  },

  async listUnits(userId: string, role: Role, courseId: string) {
    await requireCourse(courseId);
    if (role === "STUDENT") {
      await assertStudentEnrolled(userId, courseId);
    } else {
      await assertCourseTeachingAccess(userId, role, courseId, ["MEDIA"]);
    }
    return materialRepository.listUnitsByCourse(courseId);
  },
};
