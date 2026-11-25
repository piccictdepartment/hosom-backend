import "dotenv/config";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const applicationUrl = process.env.DATABASE_URL;
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  throw new Error("TEST_DATABASE_URL is required. Configure a dedicated MySQL database ending in _test.");
}

function identity(connectionString) {
  let parsed;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error("Database URL must be a valid mysql:// connection string.");
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  return { host: parsed.hostname.toLowerCase(), port: parsed.port || "3306", database: database.toLowerCase() };
}

const target = identity(testUrl);
if (!target.database.endsWith("_test")) {
  throw new Error("Refusing to sync test schema: TEST_DATABASE_URL database name must end in _test.");
}
if (applicationUrl) {
  const application = identity(applicationUrl);
  if (application.host === target.host && application.port === target.port && application.database === target.database) {
    throw new Error("Refusing to sync test schema: TEST_DATABASE_URL must differ from DATABASE_URL.");
  }
}

console.info(`Synchronizing Prisma schema to dedicated test database '${target.database}'.`);
const result = spawnSync(
  process.execPath,
  [resolve("node_modules/prisma/build/index.js"), "db", "push", "--accept-data-loss"],
  { stdio: "inherit", env: { ...process.env, DATABASE_URL: testUrl } },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
