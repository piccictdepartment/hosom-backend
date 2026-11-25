# HOSOM HELMS — Postman Testing Guide (Phase 1)

## 1. Start safely

1. Create a separate local MySQL database named `hosom_db` (application) and `hosom_db_test` (automated tests).
2. Copy `.env.example` to `.env` and set the actual database username/password, a unique `JWT_SECRET` of at least 32 characters, and `CORS_ORIGINS=http://localhost:3000`.
3. Install dependencies with `npm install`.
4. Back up any existing local database, then apply the current Prisma schema to the disposable development database with `npm run db:sync`. The checked-in migration history currently contains only the original users migration; do not use `prisma migrate deploy` as proof that all Phase 1 tables have been created.
5. Seed local demonstration accounts with `npm run db:seed`. **The seed clears existing sample records before inserting its own records; use only a disposable local database.**
6. Start the API with `npm run dev`. The default address is `http://localhost:4000`.
7. Open `GET http://localhost:4000/health` and `GET http://localhost:4000/ready`. Expect HTTP 200 for both.

Never run `db:seed`, `db:clean`, or integration tests against production or any database containing real institutional records.

## 2. Import Postman files

Import `postman/HOSOM-HELMS-Phase1.postman_collection.json`. Create a Postman environment with:

| Variable | Example / value |
|---|---|
| `baseUrl` | `http://localhost:4000` |
| `adminEmail` | `sysadmin@hosom.edu` (local seed account) |
| `adminPassword` | `Password123!` (local seed password only) |
| `adminToken` | initially blank; login request saves it |
| `lecturerEmail` | `lecturer1@hosom.edu` |
| `lecturerPassword` | `Password123!` (local seed password only) |
| `lecturerToken` | initially blank; lecturer login saves it |
| `studentToken` | initially blank; student registration saves it |
| `studentId` | initially blank; student registration saves it |
| `courseId` | initially blank; course creation saves it |
| `programId` | initially blank; programme creation saves it |
| `materialId` | initially blank; material creation saves it |
| `assignmentId` | initially blank; assignment creation saves it |

The seed credentials are for local testing only. Change all seeded passwords immediately if you retain those accounts; never deploy them.

## 3. Recommended test order

### A. Health and authentication

1. Run **Health** and **Readiness**.
2. Run **Admin Login**. Confirm HTTP 200 and that `adminToken` is populated.
3. Run **Current User**. Confirm the returned role is `SYSTEM_ADMIN`.
4. Run **Public staff registration blocked** without a token. Expect HTTP 401.
5. Run **Logout** only after finishing the other admin-only tests because it revokes `adminToken`; alternatively login again to obtain a fresh token.

### B. Programme, course and enrolment

1. Create a programme; save `programId`.
2. Create a course linked to `programId`; save `courseId`.
3. Login as the lecturer; save `lecturerToken`.
4. Assign that lecturer to `courseId` using the admin token.
5. Register a student; save `studentToken` and `studentId`. The student should be `PENDING`.
6. Try to enrol the pending student; expect HTTP 400 `STUDENT_NOT_ACTIVE`.
7. Activate the student with the admin token (`PATCH /api/students/:id/status`).
8. Create the enrolment with the admin token.
9. Call **My Enrolments** with `studentToken`; confirm the course is returned.
10. Call **List Courses** with `studentToken`; confirm only actively enrolled courses are returned.
11. Try to create an enrolment with `studentToken`; expect HTTP 403.

### C. Learning materials

1. Use `lecturerToken` to create a material for `courseId` with `status: DRAFT` and `body` or a valid HTTPS resource URL.
2. Publish the material using `PATCH /api/materials/:id/status`.
3. Use `studentToken` to list `/api/courses/:courseId/materials`; confirm the published material appears.
4. Create another draft and confirm it is not returned to the student.
5. Create a second course without enrolling the student; a student request for that course's materials must return 403 `NOT_ENROLLED`.

### D. Assignments

1. Use `lecturerToken` to create an assignment for the assigned course with a future ISO-8601 deadline and `status: DRAFT`.
2. Publish it using `PATCH /api/assignments/:id/status`.
3. Use `studentToken` to list assignments and submit text or file metadata.
4. Use `lecturerToken` to list submissions and grade the submission.
5. Confirm the student cannot see marks/feedback until the submission status is `PUBLISHED`.
6. Confirm a submission after the deadline is rejected unless `allowLate` is true.

## 4. Expected response envelope

Success:

```json
{
  "success": true,
  "data": {},
  "meta": { "pagination": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 } }
}
```

Errors:

```json
{
  "success": false,
  "error": { "code": "FORBIDDEN", "message": "You do not have permission to perform this action" },
  "requestId": "..."
}
```

## 5. Important status codes

| HTTP | Meaning |
|---|---|
| 200 | Request succeeded |
| 201 | Resource created |
| 204 | Logout/delete/status operation completed with no response body |
| 400 | Validation or business-rule failure |
| 401 | Missing, invalid, expired or revoked authentication |
| 403 | Authenticated user does not have the required role/course access |
| 404 | Resource not found |
| 409 | Duplicate email, student number or enrolment conflict |
| 413 | Request body exceeds configured limit |
| 429 | API rate limit exceeded |
| 503 | Database readiness check failed |

## 6. What cannot be tested as complete yet

- Actual binary file upload/download: material endpoints currently store metadata, text, URLs and storage keys. A file storage provider is not yet connected.
- Production password-reset email delivery: local development can log a reset token; configure an approved email provider before production.
- Complete dashboard aggregation, admissions applications, finance, examinations, results approval, announcements, notifications and audit trail: outside the implemented Phase 1 API set.
