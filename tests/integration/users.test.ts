import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { after, beforeEach, test } from "node:test";
import request from "supertest";
import "dotenv/config";
import { parseDatabaseUrl } from "../../src/config/databaseUrl.js";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error("Set TEST_DATABASE_URL to a dedicated MySQL database ending in _test");
const testDatabase = parseDatabaseUrl(testUrl);
if (!testDatabase.database.endsWith("_test")) {
  throw new Error("TEST_DATABASE_URL must use a dedicated database ending in _test");
}
if (process.env.DATABASE_URL) {
  const applicationDatabase = parseDatabaseUrl(process.env.DATABASE_URL);
  if (testDatabase.host === applicationDatabase.host && testDatabase.port === applicationDatabase.port &&
      testDatabase.database.toLowerCase() === applicationDatabase.database.toLowerCase()) {
    throw new Error("TEST_DATABASE_URL must point to a different database than DATABASE_URL");
  }
}
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = testUrl;
process.env.CORS_ORIGINS = "http://localhost:5173";
process.env.RATE_LIMIT_MAX = "200";
process.env.RATE_LIMIT_WINDOW_MS = "60000";
process.env.BODY_LIMIT = "100kb";
process.env.TRUST_PROXY_HOPS = "0";

execFileSync(process.execPath, [resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"], {
  env: process.env,
  stdio: "pipe",
});

const { app } = await import("../../src/app.js");
const { prisma } = await import("../../src/config/database.js");

beforeEach(async () => {
  await prisma.user.deleteMany();
});
after(async () => {
  try {
    await prisma.user.deleteMany();
  } finally {
    await prisma.$disconnect();
  }
});

test("creates, lists, reads, updates and deletes a persisted user", async () => {
  const created = await request(app).post("/api/users")
    .send({ firstName: " Alice ", surname: " Smith ", email: " ALICE@EXAMPLE.COM " }).expect(201);
  const id = created.body.data.id;
  assert.equal(created.body.success, true);
  assert.equal(created.body.data.firstName, "Alice");
  assert.equal(created.body.data.surname, "Smith");
  assert.equal(created.body.data.email, "alice@example.com");
  assert.equal(created.headers.location, `/api/users/${id}`);
  assert.ok(created.body.data.createdAt);
  assert.ok(created.body.data.updatedAt);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id } })).firstName, "Alice");

  const listed = await request(app).get("/api/users").expect(200);
  assert.equal(listed.body.data[0].id, id);
  assert.deepEqual(listed.body.meta.pagination, { page: 1, limit: 20, total: 1, totalPages: 1 });

  const fetched = await request(app).get(`/api/users/${id}`).expect(200);
  assert.equal(fetched.body.data.id, id);
  const updated = await request(app).patch(`/api/users/${id}`).send({ firstName: "Alice Updated" }).expect(200);
  assert.equal(updated.body.data.firstName, "Alice Updated");
  assert.equal(updated.body.data.email, "alice@example.com");
  const deleted = await request(app).delete(`/api/users/${id}`).expect(204);
  assert.equal(deleted.text, "");
  assert.equal(await prisma.user.count(), 0);
  await request(app).get(`/api/users/${id}`).expect(404);
});

test("validates and bounds pagination with stable, non-overlapping pages", async () => {
  for (let index = 0; index < 3; index += 1) {
    await request(app).post("/api/users").send({ firstName: `User`, surname: `${index}`, email: `user${index}@example.com` }).expect(201);
  }
  const first = await request(app).get("/api/users?page=1&limit=2").expect(200);
  const second = await request(app).get("/api/users?page=2&limit=2").expect(200);
  assert.equal(first.body.data.length, 2);
  assert.equal(second.body.data.length, 1);
  assert.equal(new Set([...first.body.data, ...second.body.data].map((user) => user.id)).size, 3);
  assert.deepEqual(second.body.meta.pagination, { page: 2, limit: 2, total: 3, totalPages: 2 });

  for (const query of ["page=0", "page=-1", "page=1.5", "page=1000001", "limit=101", "limit=", "page=1&page=2", "sort=secret"]) {
    await request(app).get(`/api/users?${query}`).expect(400);
  }
});

test("rejects invalid bodies, unknown fields, empty patches and invalid IDs", async () => {
  for (const body of [
    {}, { firstName: " ", surname: "Smith", email: "alice@example.com" }, { firstName: "Alice", surname: "Smith", email: "invalid" },
    { firstName: "Alice", surname: "Smith", email: "alice@example.com", role: "admin" },
    { firstName: "A".repeat(101), surname: "Smith", email: "alice@example.com" },
  ]) {
    const response = await request(app).post("/api/users").send(body).expect(400);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
    assert.ok(response.body.error.details.length > 0);
  }
  await request(app).patch(`/api/users/${randomUUID()}`).send({}).expect(400);
  await request(app).get("/api/users/not-a-uuid").expect(400);
  await request(app).post("/api/users").expect(400);
  assert.equal(await prisma.user.count(), 0);
});

test("returns 404 for missing users on read, update and delete", async () => {
  const path = `/api/users/${randomUUID()}`;
  for (const response of [
    await request(app).get(path).expect(404),
    await request(app).patch(path).send({ firstName: "Missing" }).expect(404),
    await request(app).delete(path).expect(404),
  ]) {
    assert.equal(response.body.error.code, "USER_NOT_FOUND");
  }
});

test("enforces normalized email uniqueness, including concurrent creates and updates", async () => {
  const responses = await Promise.all([
    request(app).post("/api/users").send({ firstName: "Alice", surname: "Smith", email: "ALICE@example.com" }),
    request(app).post("/api/users").send({ firstName: "Alice", surname: "Smith", email: "alice@example.com" }),
  ]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
  assert.equal(responses.find((response) => response.status === 409)?.body.error.code, "CONFLICT");
  const bob = await request(app).post("/api/users").send({ firstName: "Bob", surname: "Jones", email: "bob@example.com" }).expect(201);
  await request(app).patch(`/api/users/${bob.body.data.id}`).send({ email: " Alice@Example.com " }).expect(409);
  const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: bob.body.data.id } });
  assert.equal(unchanged.email, "bob@example.com");
});

test("returns JSON errors for invalid JSON, oversized bodies, bad URLs and unknown routes", async () => {
  const invalid = await request(app).post("/api/users").set("Content-Type", "application/json").send('{"firstName":').expect(400);
  assert.equal(invalid.body.error.code, "INVALID_JSON");
  const oversized = await request(app).post("/api/users").send({ firstName: "a".repeat(110000), surname: "b" }).expect(413);
  assert.equal(oversized.body.error.code, "PAYLOAD_TOO_LARGE");
  await request(app).get("/api/users/%E0%A4%A").expect(400);
  const missing = await request(app).get("/api/unknown").expect(404);
  assert.equal(missing.body.error.code, "ROUTE_NOT_FOUND");
  assert.equal(missing.body.requestId, missing.headers["x-request-id"]);
  assert.equal("stack" in missing.body.error, false);
});

test("provides health, security headers, request IDs and explicit CORS handling", async () => {
  const health = await request(app).get("/health").expect(200);
  assert.equal(health.body.data.status, "ok");
  assert.equal(health.headers["x-powered-by"], undefined);
  assert.equal(health.headers["x-content-type-options"], "nosniff");
  assert.ok(health.headers["x-request-id"]);
  await request(app).get("/ready").expect(200);

  const allowed = await request(app).get("/api/users").set("Origin", "http://localhost:5173").expect(200);
  assert.equal(allowed.headers["access-control-allow-origin"], "http://localhost:5173");
  const forbidden = await request(app).get("/api/users").set("Origin", "https://untrusted.example").expect(403);
  assert.equal(forbidden.body.error.code, "CORS_FORBIDDEN");
  const preflight = await request(app).options("/api/users")
    .set("Origin", "http://localhost:5173").set("Access-Control-Request-Method", "POST").expect(204);
  assert.ok(preflight.headers["access-control-allow-methods"].includes("POST"));
});

test("reports not ready when the required schema is unavailable", async () => {
  await prisma.$executeRawUnsafe("RENAME TABLE `User` TO `User_unavailable`");
  try {
    const response = await request(app).get("/ready").expect(503);
    assert.equal(response.body.error.code, "NOT_READY");
    await request(app).get("/health").expect(200);
  } finally {
    await prisma.$executeRawUnsafe("RENAME TABLE `User_unavailable` TO `User`");
  }
});

test("limits API traffic with JSON 429 responses while keeping health available", async () => {
  const responses = [];
  for (let index = 0; index < 201; index += 1) {
    responses.push(await request(app).get("/api/unknown"));
  }
  const limited = responses.find((response) => response.status === 429);
  assert.ok(limited);
  assert.equal(limited.body.error.code, "RATE_LIMIT_EXCEEDED");
  assert.ok(limited.headers["retry-after"]);
  assert.ok(limited.headers.ratelimit);
  await request(app).get("/health").expect(200);
});
