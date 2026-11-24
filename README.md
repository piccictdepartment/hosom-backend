# HOSOM Backend API

Modern, production-ready TypeScript backend built with **Express 5**, **Prisma ORM**, and **MySQL/MariaDB**, featuring stateless **JWT Authentication**, **Role-Based Access Control (RBAC)**, and a dedicated **Student Bio-Data Management System**.

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
PORT=5000

DATABASE_URL=mysql://your_user:your_password@127.0.0.1:3306/picc_hosom
JWT_SECRET=your-32-character-secret-key-goes-here
JWT_EXPIRES=7d

CORS_ORIGINS=http://localhost:5173,http://localhost:3000
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=900000
BODY_LIMIT=100kb
TRUST_PROXY_HOPS=0
```

### 3. Synchronize Database Schema
Push the Prisma schema to your MySQL database:
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
The server will start at `http://localhost:5000`.

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

| Role Key | Description |
| :--- | :--- |
| `SYSTEM_ADMINISTRATOR` | Full technical control over the system and user records. |
| `ADMINISTRATION` | Institutional administration staff with user management permissions. |
| `DIRECTOR_CHANCELLOR` | Executive leadership role. |
| `HEAD_OF_PROGRAMS` | Academic leadership overseeing academic programs and student rosters. |
| `FINANCE` | Financial management and fee administration staff. |
| `SECRETARIAT` | Administrative office staff managing records and communications. |
| `LECTURER` | Academic instructors and faculty members. |
| `ICT_MEDIA` | Technical media, content, and IT support staff. |
| `STUDENT` | Standard enrolled student accounts linked to bio-data records. |
| `ADMIN` | Backward-compatible administrator alias. |

---

## Seeded Test Accounts

When running `npm run db:seed`, the database is populated with these test users:

> **Universal Password for ALL Seeded Accounts:** `Password123!`

### Staff Accounts

| Role | Name | Email |
| :--- | :--- | :--- |
| `SYSTEM_ADMINISTRATOR` | Alex Mercer | `sysadmin@hosom.edu` |
| `ADMINISTRATION` | Sarah Connor | `administration@hosom.edu` |
| `DIRECTOR_CHANCELLOR` | Charles Xavier | `chancellor@hosom.edu` |
| `HEAD_OF_PROGRAMS` | Albus Dumbledore | `headofprograms@hosom.edu` |
| `FINANCE` | Gordon Gekko | `finance@hosom.edu` |
| `SECRETARIAT` | Donna Paulsen | `secretariat@hosom.edu` |
| `LECTURER` | Walter White | `lecturer1@hosom.edu` |
| `LECTURER` | Minerva McGonagall | `lecturer2@hosom.edu` |
| `ICT_MEDIA` | Elliot Alderson | `ict@hosom.edu` |
| `ADMIN` | Bruce Wayne | `admin@hosom.edu` |

### Student Accounts (With Bio-Data Profile)

| Student Number | Name | Email | Program |
| :--- | :--- | :--- | :--- |
| `STU-2026-001` | Peter Parker | `peter.parker@student.hosom.edu` | B.Sc. Computer Science & Software Eng. |
| `STU-2026-002` | Hermione Granger | `hermione.granger@student.hosom.edu` | B.Sc. Data Science & Applied Math |
| `STU-2026-003` | Miles Morales | `miles.morales@student.hosom.edu` | Diploma in Multimedia & Animation Design |
| `STU-2026-004` | Clark Kent | `clark.kent@student.hosom.edu` | B.A. Mass Communication & Journalism |
| `STU-2026-005` | Diana Prince | `diana.prince@student.hosom.edu` | B.A. International Relations & Diplomacy |

---

## API Overview

All API responses use a standardized JSON envelope:
- **Success (`200` / `201`):** `{ "success": true, "data": ... }`
- **Error (`4xx` / `5xx`):** `{ "success": false, "error": { "code": "...", "message": "..." }, "requestId": "..." }`

### 1. System Endpoints
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | Service uptime and status check. |
| `GET` | `/ready` | Public | Database connectivity check (`200` or `503`). |

### 2. Auth Endpoints (`/api/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/roles` | Public | Returns list of all available system roles for dropdowns. |
| `POST` | `/api/auth/register` | Public | Register staff/user with `{ firstName, surname, email, password, role? }`. |
| `POST` | `/api/auth/register/student`| Public | Register student with user credentials + bio-data profile. |
| `POST` | `/api/auth/login` | Public | Authenticates credentials, returns JWT token, updates `loggedInAt`. |
| `GET` | `/api/auth/me` | Bearer Token | Returns authenticated user's profile and session. |
| `POST` | `/api/auth/logout` | Bearer Token | Stateless logout (`204 No Content`). |
| `POST` | `/api/auth/forgot-password`| Public | Initiates password reset link workflow. |
| `POST` | `/api/auth/reset-password` | Public | Resets password using verification token. |

### 3. Student Endpoints (`/api/students`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/students/register` | Public | Student registration with bio-data (`dateOfBirth`, `address`, `guardianName`, `guardianPhone`, `program`). |
| `GET` | `/api/students/me` | Student Token | Returns currently logged-in student's bio-data profile. |
| `GET` | `/api/students` | Admin / Staff | Paginated list of all students with user profiles (`?page=1&limit=20`). |
| `GET` | `/api/students/:id` | Staff / Lecturer| Get student details and bio-data by ID. |
| `PATCH`| `/api/students/:id` | Admin / Staff | Update student bio-data. |
| `DELETE`| `/api/students/:id`| SysAdmin | Delete student record and cascading user account. |

### 4. User Endpoints (`/api/users`)
*Restricted to `SYSTEM_ADMINISTRATOR`, `ADMINISTRATION`, and `ADMIN`*
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | Admin Token | Paginated list of users (`?page=1&limit=20`). |
| `POST` | `/api/users` | Admin Token | Provision a new user with temporary password and designated role. |
| `GET` | `/api/users/:id` | Admin Token | Get user profile by UUID. |
| `PATCH`| `/api/users/:id` | Admin Token | Update user fields (`firstName`, `middleName`, `surname`, `email`, `phone`, `role`). |
| `DELETE`| `/api/users/:id` | Admin Token | Delete user record. |

---

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
│   ├── auth/                 # Identity & authentication (login, registration, tokens)
│   ├── students/             # Student entity & bio-data profile management
│   └── users/                # User accounts & administrative management
├── routes/
│   └── index.ts              # Mounts /api/auth, /api/students, /api/users
prisma/
│   ├── schema.prisma         # Database models (User, Student, Role enum)
│   └── seed.ts               # Database seeder script
```

---

## Testing & Quality

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
