# HOSOM HELMS API architecture — Phase 1

The backend is a modular Express 5 / TypeScript API using Prisma 7 and MySQL. The Phase 1 feature modules include authentication, users, students, programmes, courses, enrolments, learning materials, assignments and submissions.

## Request flow

`HTTP request → request logger / security headers / CORS / rate limiter → body parser → API router → authentication → role authorization → Zod validation → controller → service → Prisma/MySQL → standardized JSON response`

- `src/app.ts` configures middleware and exports the Express app without opening a network port.
- `src/server.ts` connects to MySQL, checks readiness, starts the listener on `HOST:PORT`, and handles graceful shutdown.
- `src/routes/index.ts` mounts the Phase 1 feature routers under `/api`.
- `src/middleware/` contains JWT/session authentication, role authorization, request validation, request logging, rate limiting and centralized error handling.
- `src/modules/` contains feature-specific validation, route, controller and service code. Student, material and assignment features also use repositories for Prisma query organization.
- `src/core/` contains shared errors, response formatting, JWT/password utilities and Express request types.
- `prisma/schema.prisma` defines the MySQL relational model; generated Prisma client code is under `src/generated/prisma` and is regenerated during build.

## Security boundaries

JWTs identify a persisted `UserSession`; logout and logout-all revoke session records. `SESSION_IDLE_TIMEOUT_MS` controls the default inactivity timeout. `authorize(...)` applies role-based route restrictions. Domain services enforce record scope, including lecturer-to-course assignment and student-to-course enrolment checks. Zod validates request bodies, route parameters and query strings before controller operations.

Public staff registration is disabled. `POST /api/auth/register` requires `SYSTEM_ADMIN` or `ADMINISTRATION`; public applicants use `POST /api/students/register` and receive a `PENDING` student record.

## Persistence and environments

The application and Prisma CLI read `DATABASE_URL`. Automated integration tests require a separate `TEST_DATABASE_URL` whose database name ends in `_test`; tests refuse to run against the application database. Demo seeding clears sample tables and is only for a disposable local database.

The supplied migration directory currently contains the initial users-table migration only, while the Prisma schema includes the wider Phase 1 model set. `npm run db:sync` is provided for local disposable development databases. Before production, generate and review a complete migration history from the current schema on the Windows development environment and verify it against a fresh test database.

## Error and response contract

Success responses use `{ success: true, data, meta? }`. Errors use `{ success: false, error: { code, message, details? }, requestId }`. Express 5 forwards rejected async route handlers to the centralized error handler. Validation results are stored in `res.locals.validated` rather than replacing Express request properties.

## Known architecture gaps

- Binary upload/object storage is not connected; learning material endpoints currently persist metadata, text, URLs and storage keys.
- Fine-grained database-backed permissions and a complete audit-log subsystem are not implemented in this phase.
- Password reset tokens are generated and validated, but production email delivery is not configured.
- Dashboard aggregate endpoints and several SRS modules (finance, results, exams, notifications, reports, admissions applications and attendance) remain outside the implemented Phase 1 API.
