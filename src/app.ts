import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { corsOptions } from "./config/cors.js";
import { prisma } from "./config/database.js";
import { sendSuccess } from "./core/responses/ApiResponse.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY_HOPS);
app.use(requestLogger);
app.use(helmet());
app.use(cors(corsOptions));

app.get("/health", (_req, res) => {
  sendSuccess(res, { status: "ok", uptime: Math.floor(process.uptime()) });
});
app.get("/ready", async (_req, res) => {
  try {
    // Check the migrated user table as well as database connectivity.
    await prisma.user.count();
    sendSuccess(res, { status: "ready" });
  } catch {
    res.status(503).json({
      success: false,
      error: { code: "NOT_READY", message: "Database is unavailable" },
      requestId: _req.requestId,
    });
  }
});

app.use("/api", rateLimiter);
app.use(express.json({ limit: env.BODY_LIMIT }));
app.use(express.urlencoded({ extended: false, limit: env.BODY_LIMIT }));
app.use("/api", apiRouter);
app.use(notFound);
app.use(errorHandler);
