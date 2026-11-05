import type { RequestHandler } from "express";
import type { z } from "zod";
import { sendSuccess } from "../../core/responses/ApiResponse.js";
import { userService } from "./user.service.js";
import type { createUserSchema, getUserSchema, listUsersSchema, updateUserSchema } from "./user.validation.js";

const create: RequestHandler = async (_req, res) => {
  const { body } = res.locals.validated as z.infer<typeof createUserSchema>;
  const user = await userService.create(body);
  res.location(`/api/users/${user.id}`);
  sendSuccess(res, user, 201);
};

const list: RequestHandler = async (_req, res) => {
  const { query } = res.locals.validated as z.infer<typeof listUsersSchema>;
  const { users, pagination } = await userService.list(query);
  sendSuccess(res, users, 200, { pagination });
};

const getById: RequestHandler = async (_req, res) => {
  const { params } = res.locals.validated as z.infer<typeof getUserSchema>;
  sendSuccess(res, await userService.getById(params.id));
};

const update: RequestHandler = async (_req, res) => {
  const { params, body } = res.locals.validated as z.infer<typeof updateUserSchema>;
  sendSuccess(res, await userService.update(params.id, body));
};

const remove: RequestHandler = async (_req, res) => {
  const { params } = res.locals.validated as z.infer<typeof getUserSchema>;
  await userService.delete(params.id);
  res.status(204).end();
};

export const userController = { create, list, getById, update, delete: remove };
