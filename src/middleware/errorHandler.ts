import type { ErrorRequestHandler, RequestHandler } from "express";
import { z } from "zod";
import { Prisma } from "../generated/prisma/client.js";
import { AppError } from "../core/errors/AppError.js";

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, "ROUTE_NOT_FOUND", "Route not found"));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  let failure = new AppError(500, "INTERNAL_ERROR", "An unexpected error occurred");
  if (error instanceof AppError) {
    failure = error;
  } else if (error instanceof z.ZodError) {
    failure = new AppError(
      400,
      "VALIDATION_ERROR",
      "Invalid request data",
      error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
    );
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      failure = new AppError(409, "CONFLICT", "A record with this unique value already exists");
    } else if (error.code === "P2025") {
      failure = new AppError(404, "NOT_FOUND", "Requested record was not found");
    } else if (error.code === "P2003") {
      failure = new AppError(400, "INVALID_REFERENCE", "Referenced record does not exist");
    }
  } else if (typeof error === "object" && error !== null && "type" in error) {
    if (error.type === "entity.parse.failed") {
      failure = new AppError(400, "INVALID_JSON", "Request body must be valid JSON");
    } else if (error.type === "entity.too.large") {
      failure = new AppError(413, "PAYLOAD_TOO_LARGE", "Request body is too large");
    } else if (error.type === "charset.unsupported" || error.type === "encoding.unsupported") {
      failure = new AppError(415, "UNSUPPORTED_ENCODING", "Request encoding is not supported");
    }
  } else if (error instanceof URIError) {
    failure = new AppError(400, "INVALID_URL", "Invalid URL encoding");
  }

  if (failure.statusCode >= 500) {
    console.error("Request failed", { requestId: req.requestId, error });
  }
  res.status(failure.statusCode).json({
    success: false,
    error: {
      code: failure.code,
      message: failure.message,
      ...(failure.details === undefined ? {} : { details: failure.details }),
    },
    requestId: req.requestId,
  });
};
