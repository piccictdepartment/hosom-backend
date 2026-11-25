import type { MaterialStatus, MaterialType } from "../../generated/prisma/client.js";

export interface CreateMaterialInput {
  courseId: string;
  unitId?: string | null;
  title: string;
  description?: string | null;
  body?: string | null;
  type?: MaterialType;
  status?: MaterialStatus;
  order?: number;
  url?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  storageKey?: string | null;
  allowDownload?: boolean;
  approvedExternal?: boolean;
  expiresAt?: string | Date | null;
}

export type UpdateMaterialInput = Partial<Omit<CreateMaterialInput, "courseId">>;

export interface MaterialMetadataInput {
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageKey?: string | null;
  url?: string | null;
  allowDownload?: boolean;
}

export interface ListMaterialsQuery {
  page?: number;
  limit?: number;
  courseId?: string;
  unitId?: string;
  type?: MaterialType;
  status?: MaterialStatus;
  search?: string;
}

export interface CreateCourseUnitInput {
  courseId: string;
  title: string;
  description?: string | null;
  order?: number;
}
