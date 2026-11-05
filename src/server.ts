import { createServer } from "node:http";
import { app } from "./app.js";
import { prisma } from "./config/database.js";
import { env } from "./config/env.js";

const server = createServer(app);
server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.keepAliveTimeout = 5000;

let shuttingDown = false;
function shutdown(reason: string, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`Shutting down: ${reason}`);
  const deadline = setTimeout(() => {
    console.error("Shutdown timed out");
    process.exit(1);
  }, 10000);
  deadline.unref();

  server.close(async (error) => {
    try {
      await prisma.$disconnect();
      process.exitCode = error ? 1 : exitCode;
    } catch (disconnectError) {
      console.error("Database disconnect failed", disconnectError);
      process.exitCode = 1;
    } finally {
      clearTimeout(deadline);
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
server.on("error", (error) => {
  console.error("HTTP server failed", error);
  shutdown("HTTP server error", 1);
});

try {
  await prisma.$connect();
  await prisma.user.count();
  server.listen(env.PORT, env.HOST, () => {
    console.info(`HOSOM API listening on ${env.HOST}:${env.PORT}`);
  });
} catch (error) {
  console.error("API startup failed", error);
  await prisma.$disconnect();
  process.exitCode = 1;
}
