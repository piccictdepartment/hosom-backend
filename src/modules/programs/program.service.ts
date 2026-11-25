import { prisma } from "../../config/database.js";
import { AppError } from "../../core/errors/AppError.js";
import type { z } from "zod";
import type { createProgramSchema, listProgramsSchema, updateProgramSchema } from "./program.validation.js";

export const programService = {
  list(query: z.infer<typeof listProgramsSchema>["query"]) {
    return prisma.program.findMany({
      where: {
        ...(query.active ? { isActive: query.active === "true" } : {}),
        ...(query.search ? { OR: [{ code: { contains: query.search } }, { name: { contains: query.search } }] } : {}),
      },
      include: { _count: { select: { courses: true } } },
      orderBy: { name: "asc" },
    });
  },
  async getById(id: string) {
    const program = await prisma.program.findUnique({ where: { id }, include: { courses: { orderBy: { code: "asc" } } } });
    if (!program) throw new AppError(404, "PROGRAM_NOT_FOUND", "Programme not found");
    return program;
  },
  create(input: z.infer<typeof createProgramSchema>["body"]) {
    return prisma.program.create({ data: input });
  },
  async update(id: string, input: z.infer<typeof updateProgramSchema>["body"]) {
    if (!(await prisma.program.findUnique({ where: { id }, select: { id: true } }))) throw new AppError(404, "PROGRAM_NOT_FOUND", "Programme not found");
    return prisma.program.update({ where: { id }, data: input });
  },
};
