import type { RequestHandler } from "express";
import type { z } from "zod";

export function validate<T extends z.ZodType>(schema: T): RequestHandler {
  return (req, res, next) => {
    res.locals.validated = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    next();
  };
}
