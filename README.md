# HOSOM Backend API

TypeScript API for HOSOM HELMS built with **Express 5**, **Prisma 7**, and **MySQL/MariaDB**. Phase 1 includes JWT sessions, role-based authorization, student management, programme/course/enrolment APIs, learning materials, and assignment/submission workflows. Production readiness still depends on the remaining integrations and verification listed in `docs/api-requirements-mapping.md`.

---

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start Guide](#quick-start-guide)
- [Database Management](#database-management)
- [Roles & Access Control](#roles--access-control)
- [Seeded Test Accounts](#seeded-test-accounts)
- [API Overview](#api-overview)
- [Project Architecture](#project-architecture)

---

## Prerequisites

- **Node.js**: `>= 22.12.0`
- **Database**: MySQL `>= 8.0` or MariaDB `>= 10.5`
- **Package Manager**: npm

---

## Quick Start Guide

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd hosom-backend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and update your database credentials:
```bash
cp .env.example .env
```

Ensure your `.env` contains your MySQL connection and JWT secret:
```dotenv
NODE_ENV=development
HOST=0.0.0.0
PORT=4000

DATABASE_URL=mysql://your_user:your_password@127.0.0.1:3306/hosom_db
JWT_SECRET=generate-a-unique-random-secret-of-at-least-32-characters
JWT_EXPIRES=7d
SESSION_IDLE_TIMEOUT_MS=1800000
TEST_DATABASE_URL=mysql://your_user:your_password@127.0.0.1:3306/hosom_db_test

CORS_ORIGINS=http://localhost:5173,http://localhost:3000
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
BODY_LIMIT=100kb
TRUST_PROXY_HOPS=0
```

### 3. Synchronize Database Schema
For a disposable local development database only, push the Prisma schema to MySQL:
```bash
npm run db:sync
```

### 4. Seed Initial Data (Optional, but Recommended)
Populate test accounts for all roles and sample students:
```bash
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```
The server will start at `http://localhost:4000`.

---

## Database Management

We provide convenient scripts in `package.json` to manage the database during development:

| Command | Description |
| :--- | :--- |
| **`npm run db:sync`** | Pushes schema changes directly to MySQL (`prisma db push`) and regenerates TypeScript client types. **Use this when modifying `schema.prisma`.** |
| **`npm run db:seed`** | Executes [prisma/seed.ts](prisma/seed.ts) to populate all 10 role accounts and students with full bio-data. |
| **`npm run db:clean`** | Completely wipes all records from `User` and `Student` tables. |
| **`npm run db:studio`** | Launches **Prisma Studio** at `http://localhost:5555` to view, filter, and edit records in a web UI spreadsheet. |
| **`npm run db:generate`** | Regenerates Prisma TypeScript client types without modifying the database. |

---

## Roles & Access Control

The system implements Role-Based Access Control (RBAC) via the `authorize(...)` middleware.

### Supported Roles

| Role Key | SRS / institutional role |
| :--- | :--- |
| `STUDENT` | Student |
| `LECTURER` | Lecturer |
| `SECRETARIAT` | Secretariat / Administrator |
| `FINANCE` | Finance Department |
| `ADMINISTRATION` | Administration Department |
| `HEAD_OF_PROGRAMS` | Head of Programs |
| `HEAD_OF_HOSOM` | HOSOM leadership role used by the supplied frontend; confirm authority with management |
| `DIRECTOR` | Director / Chancellor |
| `MEDIA` | ICT / Media Team |
| `SYSTEM_ADMIN` | System Administrator |

`HEAD_OF_HOSOM` is present in the application but is not separately named in the SRS role list. Its final permissions require institutional approval.
---

## Seeded Test Accounts

When running `npm run db:seed`, the database is populated with these test users:

> **Universal Password for ALL Seeded Accounts:** `Password123!`

### Staff Accounts

| Role | Name | Email |
| :--- | :--- | :--- |
| `SYSTEM_ADMIN` | Alex Mercer | `sysadmin@hosom.edu` |
| `ADMINISTRATION` | Sarah Connor | `administration@hosom.edu` |
| `DIRECTOR` | Samuel Phiri | `chancellor@hosom.edu` |
| `HEAD_OF_PROGRAMS` | Ruth Mbewe | `headofprograms@hosom.edu` |
| `HEAD_OF_HOSOM` | Grace Kalua | `headofhosom@hosom.edu` |
| `FINANCE` | Peter Mwale | `finance@hosom.edu` |
| `SECRETARIAT` | Mary Tembo | `secretariat@hosom.edu` |
| `LECTURER` | Daniel Phiri | `lecturer1@hosom.edu` |
| `LECTURER` | Esther Banda | `lecturer2@hosom.edu` |
| `MEDIA` | Elliot Alderson | `ict@hosom.edu` |

### Student Accounts

| Student Number | Name | Email | Programme |
| :--- | :--- | :--- | :--- |
| `HOSOM/2026/001` | Thoko Banda | `thoko.banda@student.hosom.edu` | Diploma in Theology |
| `HOSOM/2026/002` | Chisomo Phiri | `chisomo.phiri@student.hosom.edu` | Certificate in Ministry |
| `HOSOM/2026/003` | Blessings Mbewe | `blessings.mbewe@student.hosom.edu` | Diploma in Theology |

The demo seed uses `Password123!` for every account. This password is for disposable local testing only; change it immediately and never use seeded accounts in production.
---

## API Overview

All responses use a standard JSON envelope: successful responses contain `{ "success": true, "data": ... }`; errors contain `{ "success": false, "error": { "code": "...", "message": "..." }, "requestId": "..." }`.

| Area | Main endpoints | Access |
|---|---|---|
| Health | `GET /health`, `GET /ready` | Public |
| Authentication | `GET /api/auth/roles`, `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/logout-all`, `GET /api/auth/me`, `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:sessionId`, `POST /api/auth/change-password` | Login/roles public; session routes require bearer token |
| Staff accounts | `POST /api/auth/register`, `GET/POST /api/users`, `GET/PATCH/DELETE /api/users/:id` | `SYSTEM_ADMIN` / `ADMINISTRATION` |
| Password reset | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` | Public token workflow; production email delivery is not configured yet |
| Students | `POST /api/students/register`, `GET/PATCH /api/students/me`, `GET/POST /api/students`, `GET/PATCH/DELETE /api/students/:id`, `PATCH /api/students/:id/status` | Self-service or role-restricted staff routes |
| Programmes | `GET /api/programs`, `GET /api/programs/:id`, `POST /api/programs`, `PATCH /api/programs/:id` | Catalogue public; writes restricted to authorized academic/admin roles |
| Courses | `GET /api/courses`, `GET /api/courses/:id`, `POST /api/courses`, `PATCH /api/courses/:id`, `POST /api/courses/:courseId/lecturers`, `DELETE /api/courses/:courseId/lecturers/:lecturerId` | Authenticated; writes restricted to authorized academic/admin roles |
| Enrolments | `GET /api/enrollments/me`, `GET/POST /api/enrollments`, `PATCH /api/enrollments/:id`, `GET /api/courses/:courseId/enrollments` | Student/lecturer/staff scope enforced |
| Learning materials | `GET/POST /api/materials`, `GET/PATCH/DELETE /api/materials/:id`, `PATCH /api/materials/:id/metadata`, `PATCH /api/materials/:id/status`, `GET/POST /api/courses/:courseId/materials`, `GET/POST /api/courses/:courseId/units` | Course assignment and enrolment checks enforced; metadata/text/URL only, no binary storage adapter |
| Assignments | `GET/POST /api/assignments`, `GET/PATCH/DELETE /api/assignments/:id`, `PATCH /api/assignments/:id/status`, `GET/POST /api/courses/:courseId/assignments` | Course assignment and enrolment checks enforced |
| Submissions | `POST /api/assignments/:id/submissions`, `GET /api/assignments/:id/submissions/me`, `GET /api/assignments/:id/submissions`, `GET /api/submissions/:submissionId`, `PATCH /api/submissions/:submissionId/grade`, `PATCH /api/submissions/:submissionId/status` | Student owns own submission; assigned lecturer/authorized reviewers manage marking |

For request bodies, access details and Postman tests, see `docs/api-requirements-mapping.md` and `docs/postman-testing-guide.md`.
## Project Architecture

The backend follows a clean, layered architectural structure:

```text
src/
├── app.ts                    # Express app setup (Helmet, CORS, Rate-limiting, Logging)
├── server.ts                 # HTTP server lifecycle and graceful shutdown
├── config/
│   ├── env.ts                # Validated Zod environment configuration
│   ├── cors.ts               # Dynamic CORS origin validator
│   └── database.ts           # Shared Prisma database client instance
├── core/
│   ├── security/
│   │   ├── jwt.ts            # Stateless JWT signing and verification (HS256 via jose)
│   │   └── password.ts       # Bcrypt password hashing and comparison
│   ├── errors/               # Centralized AppError class and error codes
│   └── responses/            # Standardized ApiResponse helper
├── middleware/
│   ├── authenticate.ts       # Extracts and verifies Bearer JWT token
│   ├── authorize.ts          # RBAC role enforcement guard
│   ├── validate.ts           # Zod request schema validation middleware
│   ├── rateLimiter.ts        # IP rate limiting
│   └── errorHandler.ts       # Centralized error handler with strict JSON formatting
├── modules/
│   ├── auth/                 # Login, JWT sessions, password reset
│   ├── students/             # Student profiles and generated student IDs
│   ├── programs/             # Programme catalogue and administration
│   ├── courses/              # Course setup and lecturer allocation
│   ├── enrollments/          # Course enrolment and roster access
│   ├── materials/            # Course materials and publication permissions
│   ├── assignments/          # Assignments, submissions and grading
│   └── users/                # User account administration
├── routes/
│   └── index.ts              # Mounts the Phase 1 API routers
prisma/
│   ├── schema.prisma         # HELMS relational database models
│   └── seed.ts               # Database seeder script
```

---

## API documentation and Postman

- `docs/api-requirements-mapping.md` maps the SRS and frontend screens to APIs and database entities.
- `docs/postman-testing-guide.md` explains the recommended end-to-end test order.
- `postman/HOSOM-HELMS-Phase1.postman_collection.json` and `postman/HOSOM-HELMS-Local.postman_environment.json` provide a starter Postman collection/environment.

## Testing & Quality

`npm test` validates that `TEST_DATABASE_URL` points to a separate database ending in `_test`, synchronizes the Prisma schema to that disposable database, and runs the Phase 1 integration suite. The test sync uses `--accept-data-loss` only after the `_test` database guard passes.

- **Typecheck:** Verify complete TypeScript build:
  ```bash
  npm run typecheck
  ```
- **Integration Tests:**
  ```bash
  npm test
  ```
- **Build for Production:**
  ```bash
  npm run build
  npm start
  ```


## Security notes

- Public registration is limited to the student registration workflow (`POST /api/students/register`). Staff and privileged accounts must be created by an authenticated `SYSTEM_ADMIN` or `ADMINISTRATION` account through `POST /api/auth/register` or `/api/users`.
- Never deploy with the sample `.env.example` values. Generate a unique `JWT_SECRET`, use a least-privilege MySQL account, configure exact frontend origins in `CORS_ORIGINS`, and keep `.env` out of version control.
- Do not run `npm run db:clean` against a database containing institutional data.
- Seeded accounts/passwords are for local testing only; change them immediately and never use them in production.
