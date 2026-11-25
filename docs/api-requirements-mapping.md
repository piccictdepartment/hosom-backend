# HOSOM HELMS — Phase 1 Backend API Requirements Mapping

**Owner:** Flonicah Phiri — Software Developer  
**Baseline:** HOSOM HELMS SRS v1.0 (August 2026)  
**Frontend:** Next.js App Router (`hosom-frontend`)  
**Backend:** Express 5 + TypeScript + Prisma 7 + MySQL

This document distinguishes APIs implemented in this Phase 1 package from requirements that remain outside the Phase 1 scope or need institutional decisions. The SRS is the requirements authority; a visible frontend screen is not, by itself, proof that a backend workflow is complete.

## 1. SRS role mapping

| Backend role | SRS stakeholder / role |
|---|---|
| `STUDENT` | Student |
| `LECTURER` | Lecturer |
| `SECRETARIAT` | Secretariat / Administrator |
| `FINANCE` | Finance Department |
| `ADMINISTRATION` | Administration Department |
| `HEAD_OF_PROGRAMS` | Head of Programs |
| `HEAD_OF_HOSOM` | HOSOM leadership role used by the frontend; confirm its final authority with management |
| `DIRECTOR` | Director / Chancellor |
| `MEDIA` | ICT / Media Team |
| `SYSTEM_ADMIN` | System Administrator |

`HEAD_OF_HOSOM` is present in the supplied application but is not separately named in the SRS role list. Its permissions should be approved by HOSOM management before production.

## 2. Frontend → API → MySQL mapping

| Frontend screen / workflow | API | Main database entities | Phase 1 status |
|---|---|---|---|
| Login / account security | `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/logout-all`, `GET /api/auth/me`, `GET /api/auth/sessions`, `DELETE /api/auth/sessions/:sessionId`, `POST /api/auth/change-password` | `users`, `user_sessions` | Implemented |
| Staff account administration | `POST /api/auth/register`, `GET/POST /api/users`, `GET/PATCH/DELETE /api/users/:id` | `users` | Implemented; staff registration is now admin-protected |
| Password reset | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` | `password_reset_tokens`, `users`, `user_sessions` | Token workflow implemented; production email delivery still needs an approved mail provider |
| Student registration / profile | `POST /api/students/register`, `GET/PATCH /api/students/me` | `users`, `student` | Implemented; self-registered students start as `PENDING` |
| Secretariat student administration | `POST/GET /api/students`, `GET/PATCH/DELETE /api/students/:id`, `PATCH /api/students/:id/status` | `users`, `student` | Implemented |
| Programme catalogue / administration | `GET /api/programs`, `GET /api/programs/:id`, `POST /api/programs`, `PATCH /api/programs/:id` | `programs` | Implemented in this update |
| Course catalogue / administration | `GET /api/courses`, `GET /api/courses/:id`, `POST /api/courses`, `PATCH /api/courses/:id` | `courses`, `programs`, `academic_periods` | Implemented in this update |
| Lecturer allocation | `POST /api/courses/:courseId/lecturers`, `DELETE /api/courses/:courseId/lecturers/:lecturerId` | `course_lecturers`, `users`, `courses` | Implemented in this update |
| Student course enrolment | `GET /api/enrollments/me`, `GET /api/enrollments`, `POST /api/enrollments`, `PATCH /api/enrollments/:id`, `GET /api/courses/:courseId/enrollments` | `enrollments`, `student`, `courses`, `academic_periods` | Implemented in this update |
| Course learning materials | `POST/GET /api/materials`, `GET/PATCH/DELETE /api/materials/:id`, `PATCH /api/materials/:id/metadata`, `PATCH /api/materials/:id/status`, `GET/POST /api/courses/:courseId/materials`, `GET/POST /api/courses/:courseId/units` | `learning_materials`, `course_units`, `courses`, `enrollments` | Implemented for metadata/text/URL and access control; binary upload/storage adapter remains pending |
| Assignments | `POST/GET /api/assignments`, `GET/PATCH/DELETE /api/assignments/:id`, `PATCH /api/assignments/:id/status`, `GET/POST /api/courses/:courseId/assignments` | `assignments`, `courses`, `course_lecturers` | Implemented |
| Assignment submissions / marking | `POST /api/assignments/:id/submissions`, `GET /api/assignments/:id/submissions/me`, `GET /api/assignments/:id/submissions`, `GET /api/submissions/:submissionId`, `PATCH /api/submissions/:submissionId/grade`, `PATCH /api/submissions/:submissionId/status` | `assignment_submissions`, `assignments`, `student`, `users` | Implemented workflow foundation |
| System liveness / readiness | `GET /health`, `GET /ready` | application process, `users` table connectivity | Implemented |

The frontend contains substantial local/demo workflow data and UI state. Those screens are not all wired to `lib/api.ts` yet. Authentication is connected to the backend; programme, course, enrolment, materials and assignment APIs are now available for integration. Do not interpret a populated demo screen as proof that its data has been persisted to MySQL.

## 3. Authorization rules implemented

- Public: health/readiness, programme catalogue, student self-registration, login, password-reset request/confirmation, role list.
- Staff registration: only `SYSTEM_ADMIN` and `ADMINISTRATION` may create staff accounts through `/api/auth/register`; the public endpoint cannot be used to assign a privileged role.
- Student records: student users can read/update their own permitted profile fields. Secretariat/Administration/System Admin manage student records. Lecturer access to an individual student is restricted to students enrolled in at least one course assigned to that lecturer.
- Course setup and lecturer allocation: `SYSTEM_ADMIN`, `HEAD_OF_PROGRAMS`, `ADMINISTRATION`.
- Enrolment administration: `SYSTEM_ADMIN`, `ADMINISTRATION`, `SECRETARIAT`, `HEAD_OF_PROGRAMS`. Students can view only their own enrolments; lecturers can view enrolments for their assigned courses.
- Learning materials: lecturers must be assigned to the course; authorized ICT/Media and academic oversight roles may manage materials. Students only receive published, non-expired material for actively enrolled courses.
- Assignments: lecturers must be assigned to the course; students only see published/closed assignments for actively enrolled courses and can access only their own submissions. Marks and feedback are withheld from the student until the submission reaches `PUBLISHED`.

## 4. Data rules and validation

- User email is normalized and unique; passwords are hashed using bcryptjs.
- JWTs are associated with persisted sessions. Logout revokes the current session; logout-all revokes every active session. The default idle timeout is 30 minutes and can be changed with `SESSION_IDLE_TIMEOUT_MS`.
- Student identifiers are generated as `HOSOM/YYYY/NNN` and protected by a unique database constraint. The generator retries a concurrent generated-ID collision.
- Self-registered student records start in `PENDING`. An authorized staff member must change the status to `ACTIVE` before course enrolment is allowed.
- Duplicate student/course enrolment is prevented by both a service-level conflict response and the database composite unique constraint.
- Request payloads and query parameters are validated with Zod before controller logic runs.
- Errors use the shared JSON envelope with an error code, message and request ID.

## 5. Phase 1 gaps / decisions before production

| Requirement / SRS area | Current position | Follow-up |
|---|---|---|
| Binary file uploads and large media storage (SRS 15, 24, 31) | Material metadata, URLs and storage keys are supported; no binary upload endpoint or cloud storage adapter is implemented | Select approved local/object storage and add virus/type/size checks and signed access URLs |
| Password reset email (SRS 9.1) | Reset token creation/validation works; development logs the token; no production email delivery adapter is configured | Connect approved SMTP/provider and use a frontend reset-link flow |
| Fine-grained permissions (SRS 9, 11, 26) | Role-based route middleware is implemented; no configurable permission catalogue/editor | Confirm role-permission matrix and implement database-backed permissions if HOSOM requires per-action overrides |
| Audit trail (SRS 26, 30, 40) | No complete audit-log persistence model/route is wired into this Phase 1 API | Add audit records for login, record changes, approvals, payment changes and permission changes |
| Detailed admission states | Existing enum has `PENDING`, `ACTIVE`, `INACTIVE`, `SUSPENDED`, `GRADUATED`, `WITHDRAWN`; SRS also names Applicant, Admitted, Deferred and Completed | Approve a canonical status list and add a reviewed Prisma migration before production |
| Student ID timing | ID is generated when the student record is created; SRS workflow describes ID generation after admission | Confirm whether pending applicants should receive a permanent student number or a separate application number |
| Academic periods | Prisma entity exists; the current Phase 1 update supports period association on courses/enrolments but does not provide full academic-period CRUD | Implement period administration and current-period rules |
| Full database migration history | The supplied migration directory contains only the original users-table migration although the Prisma schema defines the additional Phase 1 entities | Back up the database, generate and review a complete migration from the current schema on the Windows development machine, then test `prisma migrate deploy` against a fresh test database before production |
| Assignments | Create/publish/submit/grade/feedback/status foundation is implemented | Binary submission storage and formal review/approval policy remain to be finalized |
| Frontend integration | Login and session flows call the API; many portal widgets still use local/demo data | Replace fixtures module-by-module and handle loading, empty and API error states |
| Dashboard aggregates | No consolidated role-specific dashboard endpoint in Phase 1 | Implement dashboard queries once metric definitions and data ownership are approved |

Finance, examination, result approval/publication, attendance, notifications, reporting, admissions applications, certificates, live classes, announcements and document management are not part of the completed Phase 1 API scope, even where placeholder folders or frontend screens exist.

## 6. Verification summary

- Backend TypeScript typecheck: **passed** in the supplied development environment after the API additions.
- Full backend production build: **not verified here** because the supplied dependency archive contains Windows-only Prisma engine binaries while this review environment is Linux and external package downloads are unavailable.
- Frontend production build: **not verified here** because Next.js attempted to download its Linux SWC binary and external package downloads are unavailable.
- MySQL integration tests: **not run here** because running them requires a reachable, dedicated `TEST_DATABASE_URL` ending in `_test`. The integration suite has been guarded against running against the application database.
- Postman verification: use `docs/postman-testing-guide.md` and `postman/HOSOM-HELMS-Phase1.postman_collection.json` after the local database is prepared.

These checks are intentionally reported separately; a successful TypeScript check is not a substitute for a database-backed test or a successful production build.
