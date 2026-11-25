import { prisma } from "../../config/database.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { ListMaterialsQuery } from "./material.types.js";

const materialInclude = {
  course: {
    select: { id: true, code: true, title: true },
  },
  unit: {
    select: { id: true, title: true, order: true },
  },
  createdBy: {
    select: { id: true, firstName: true, surname: true, role: true },
  },
} as const;

export const materialRepository = {
  create(data: Prisma.LearningMaterialUncheckedCreateInput) {
    return prisma.learningMaterial.create({
      data,
      include: materialInclude,
    });
  },

  findById(id: string) {
    return prisma.learningMaterial.findUnique({
      where: { id },
      include: materialInclude,
    });
  },

  async findMany(
    query: ListMaterialsQuery,
    extraWhere?: Prisma.LearningMaterialWhereInput,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const where: Prisma.LearningMaterialWhereInput = {
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.unitId ? { unitId: query.unitId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search } },
              { description: { contains: query.search } },
              { fileName: { contains: query.search } },
            ],
          }
        : {}),
      ...(extraWhere ?? {}),
    };

    const [materials, total] = await prisma.$transaction([
      prisma.learningMaterial.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        include: materialInclude,
      }),
      prisma.learningMaterial.count({ where }),
    ]);

    return { materials, total, page, limit };
  },

  update(id: string, data: Prisma.LearningMaterialUncheckedUpdateInput) {
    return prisma.learningMaterial.update({
      where: { id },
      data,
      include: materialInclude,
    });
  },

  delete(id: string) {
    return prisma.learningMaterial.delete({ where: { id } });
  },

  createUnit(data: Prisma.CourseUnitUncheckedCreateInput) {
    return prisma.courseUnit.create({ data });
  },

  listUnitsByCourse(courseId: string) {
    return prisma.courseUnit.findMany({
      where: { courseId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
  },

  findUnitById(id: string) {
    return prisma.courseUnit.findUnique({ where: { id } });
  },
};
