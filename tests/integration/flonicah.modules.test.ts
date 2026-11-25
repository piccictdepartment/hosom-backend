import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import request from "supertest";
import "dotenv/config";
import { parseDatabaseUrl } from "../../src/config/databaseUrl.js";

// Never run destructive integration tests against the application database.
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error("Set TEST_DATABASE_URL to a dedicated MySQL database ending in _test");
const testDatabase = parseDatabaseUrl(testUrl);
if (!testDatabase.database.toLowerCase().endsWith("_test")) {
  throw new Error("TEST_DATABASE_URL must use a dedicated database ending in _test");
}
if (process.env.DATABASE_URL) {
  const appDatabase = parseDatabaseUrl(process.env.DATABASE_URL);
  if (appDatabase.host === testDatabase.host && appDatabase.port === testDatabase.port && appDatabase.database.toLowerCase() === testDatabase.database.toLowerCase()) {
    throw new Error("TEST_DATABASE_URL must be different from DATABASE_URL");
  }
}
process.env.DATABASE_URL = testUrl;
process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_MAX = "500";
process.env.RATE_LIMIT_WINDOW_MS = "60000";
process.env.SESSION_IDLE_TIMEOUT_MS = "60000";

const { app } = await import("../../src/app.js");
const { prisma } = await import("../../src/config/database.js");
const { hashPassword } = await import("../../src/core/security/password.js");
const { authService } = await import("../../src/modules/auth/auth.service.js");

async function createAdminToken() {
  const passwordHash = await hashPassword("TestAdminPassword123!");
  const admin = await prisma.user.create({ data: { firstName: "Test", surname: "Administrator", email: "test-admin@hosom.test", passwordHash, role: "SYSTEM_ADMIN" } });
  const session = await authService.createSessionToken(admin.id, admin.role);
  return session.token;
}

async function resetDb() {
  await prisma.assignmentSubmission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.learningMaterial.deleteMany();
  await prisma.courseUnit.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.courseLecturer.deleteMany();
  await prisma.course.deleteMany();
  await prisma.academicPeriod.deleteMany();
  await prisma.program.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
}

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  try {
    await resetDb();
  } finally {
    await prisma.$disconnect();
  }
});

test("Tuesday Auth API: roles, protected staff registration, login, active check, session revocation on logout, and password reset", async () => {
  const adminToken = await createAdminToken();
  await request(app).get("/api/auth/me").set("Authorization", "Bearer invalid-token").expect(401);
  await request(app).get("/api/students").expect(401);
  await request(app).post("/api/auth/register").send({ firstName: "Bad", surname: "Actor", email: "attacker@hosom.test", password: "Password123!", role: "SYSTEM_ADMIN" }).expect(401);
  const rolesRes = await request(app).get("/api/auth/roles").expect(200);
  const roleValues = rolesRes.body.data.map((r: { value: string }) => r.value);
  assert.ok(roleValues.includes("HEAD_OF_HOSOM"));
  assert.ok(roleValues.includes("SYSTEM_ADMIN"));
  assert.equal(roleValues.length, 10);

  // Register a lecturer
  const regRes = await request(app)
    .post("/api/auth/register")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      firstName: "Daniel",
      surname: "Phiri",
      email: "daniel@hosom.edu",
      password: "Password123!",
      role: "LECTURER",
    })
    .expect(201);

  assert.ok(regRes.body.data.token);
  assert.ok(regRes.body.data.sessionId);

  // Invalid credentials are rejected.
  await request(app)
    .post("/api/auth/login")
    .send({ email: "daniel@hosom.edu", password: "WrongPassword123!" })
    .expect(401);

  // Login creates a second session
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({ email: "daniel@hosom.edu", password: "Password123!" })
    .expect(200);
  const loginToken = loginRes.body.data.token as string;
  assert.ok(loginToken);

  // /me and /sessions succeed
  await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${loginToken}`)
    .expect(200);

  const sessionsRes = await request(app)
    .get("/api/auth/sessions")
    .set("Authorization", `Bearer ${loginToken}`)
    .expect(200);
  assert.equal(sessionsRes.body.data.length, 2);

  // Logout revokes current session token
  await request(app)
    .post("/api/auth/logout")
    .set("Authorization", `Bearer ${loginToken}`)
    .expect(204);

  const revokedCheck = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${loginToken}`)
    .expect(401);
  assert.equal(revokedCheck.body.error.code, "SESSION_REVOKED");

  // Forgot & reset password
  const forgotRes = await request(app)
    .post("/api/auth/forgot-password")
    .send({ email: "daniel@hosom.edu" })
    .expect(200);
  const resetToken = forgotRes.body.data.resetToken as string;
  assert.ok(resetToken);

  await request(app)
    .post("/api/auth/reset-password")
    .send({ token: resetToken, password: "NewPassword123!" })
    .expect(200);

  // Old password rejected, new password succeeds
  await request(app)
    .post("/api/auth/login")
    .send({ email: "daniel@hosom.edu", password: "Password123!" })
    .expect(401);

  const newLogin = await request(app)
    .post("/api/auth/login")
    .send({ email: "daniel@hosom.edu", password: "NewPassword123!" })
    .expect(200);

  // An inactive session is automatically revoked after the configured idle timeout.
  await prisma.userSession.update({
    where: { id: newLogin.body.data.sessionId },
    data: { lastUsedAt: new Date(Date.now() - 2 * 60 * 1000) },
  });
  const idleResponse = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${newLogin.body.data.token}`)
    .expect(401);
  assert.equal(idleResponse.body.error.code, "SESSION_IDLE_TIMEOUT");

  // Deactivated user blocked on login and /me.
  const activeAgain = await request(app)
    .post("/api/auth/login")
    .send({ email: "daniel@hosom.edu", password: "NewPassword123!" })
    .expect(200);
  await prisma.user.update({
    where: { email: "daniel@hosom.edu" },
    data: { isActive: false },
  });

  await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${activeAgain.body.data.token}`)
    .expect(403);

  await request(app)
    .post("/api/auth/login")
    .send({ email: "daniel@hosom.edu", password: "NewPassword123!" })
    .expect(403);
});

test("Wednesday Student API: registration, auto ID generation, admin create, search, status, and self profile", async () => {
  const adminToken = await createAdminToken();
  // Register Secretariat user
  const secReg = await request(app)
    .post("/api/auth/register")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      firstName: "Mary",
      surname: "Tembo",
      email: "sec@hosom.edu",
      password: "Password123!",
      role: "SECRETARIAT",
    })
    .expect(201);
  const secToken = secReg.body.data.token as string;

  // Student self-registration without studentNumber -> auto-generates HOSOM/YYYY/001
  const stu1 = await request(app)
    .post("/api/students/register")
    .send({
      firstName: "Thoko",
      surname: "Banda",
      email: "thoko@student.hosom.edu",
      password: "Password123!",
      program: "Diploma in Theology",
    })
    .expect(201);

  const year = new Date().getUTCFullYear();
  assert.equal(stu1.body.data.student.studentNumber, `HOSOM/${year}/001`);
  assert.equal(stu1.body.data.student.status, "PENDING");

  // Admin creates second student -> auto-generates HOSOM/YYYY/002
  const stu2 = await request(app)
    .post("/api/students")
    .set("Authorization", `Bearer ${secToken}`)
    .send({
      firstName: "Chisomo",
      surname: "Phiri",
      email: "chisomo@student.hosom.edu",
      program: "Certificate in Ministry",
      status: "PENDING",
    })
    .expect(201);

  assert.equal(stu2.body.data.student.studentNumber, `HOSOM/${year}/002`);
  assert.equal(stu2.body.data.student.status, "PENDING");

  // Search by studentNumber and filter by status
  const searchRes = await request(app)
    .get(`/api/students?search=${encodeURIComponent(`HOSOM/${year}/001`)}`)
    .set("Authorization", `Bearer ${secToken}`)
    .expect(200);
  assert.equal(searchRes.body.data.length, 1);
  assert.equal(searchRes.body.data[0].user.email, "thoko@student.hosom.edu");

  const pendingRes = await request(app)
    .get("/api/students?status=PENDING")
    .set("Authorization", `Bearer ${secToken}`)
    .expect(200);
  assert.equal(pendingRes.body.data.length, 2);

  // Update student status
  const statusUpdate = await request(app)
    .patch(`/api/students/${stu2.body.data.student.id}/status`)
    .set("Authorization", `Bearer ${secToken}`)
    .send({ status: "ACTIVE" })
    .expect(200);
  assert.equal(statusUpdate.body.data.status, "ACTIVE");

  // Student updates own contact details
  const mePatch = await request(app)
    .patch("/api/students/me")
    .set("Authorization", `Bearer ${stu1.body.data.token}`)
    .send({ district: "Lilongwe", phone: "+265999111222" })
    .expect(200);
  assert.equal(mePatch.body.data.district, "Lilongwe");
  assert.equal(mePatch.body.data.user.phone, "+265999111222");
});

test("Thursday & Friday APIs: Learning materials permissions and Assignment submission + grading workflow", async () => {
  const adminToken = await createAdminToken();
  // Setup users: Lecturer, Secretariat, HOP, Enrolled Student, Unenrolled Student
  const lecRes = await request(app)
    .post("/api/auth/register")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      firstName: "Daniel",
      surname: "Phiri",
      email: "lec@hosom.edu",
      password: "Password123!",
      role: "LECTURER",
    })
    .expect(201);
  const lecToken = lecRes.body.data.token as string;
  const lecId = lecRes.body.data.user.id as string;

  const hopRes = await request(app)
    .post("/api/auth/register")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      firstName: "Ruth",
      surname: "Mbewe",
      email: "hop@hosom.edu",
      password: "Password123!",
      role: "HEAD_OF_PROGRAMS",
    })
    .expect(201);
  const hopToken = hopRes.body.data.token as string;

  const secRes = await request(app)
    .post("/api/auth/register")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      firstName: "Mary",
      surname: "Tembo",
      email: "secretariat@hosom.edu",
      password: "Password123!",
      role: "SECRETARIAT",
    })
    .expect(201);
  const secToken = secRes.body.data.token as string;

  const enrolledStuRes = await request(app)
    .post("/api/students/register")
    .send({
      firstName: "Thoko",
      surname: "Banda",
      email: "enrolled@student.hosom.edu",
      password: "Password123!",
    })
    .expect(201);
  const enrolledToken = enrolledStuRes.body.data.token as string;
  const enrolledStudentId = enrolledStuRes.body.data.student.id as string;

  const outsiderStuRes = await request(app)
    .post("/api/students/register")
    .send({
      firstName: "Outsider",
      surname: "Student",
      email: "outsider@student.hosom.edu",
      password: "Password123!",
    })
    .expect(201);
  const outsiderToken = outsiderStuRes.body.data.token as string;

  // Approve the applicant before enrolling them, following the SRS student lifecycle.
  await request(app)
    .patch(`/api/students/${enrolledStudentId}/status`)
    .set("Authorization", `Bearer ${secToken}`)
    .send({ status: "ACTIVE" })
    .expect(200);

  // Create Course, Lecturer assignment, and Student enrollment
  const course = await prisma.course.create({
    data: { code: "TH201", title: "Foundations of Theology", credits: 3 },
  });
  await prisma.courseLecturer.create({
    data: { courseId: course.id, lecturerId: lecId },
  });
  await prisma.enrollment.create({
    data: { studentId: enrolledStudentId, courseId: course.id, status: "ACTIVE" },
  });

  // 1. Learning Materials: unit creation, draft material, metadata upload, publish
  const unitRes = await request(app)
    .post(`/api/courses/${course.id}/units`)
    .set("Authorization", `Bearer ${lecToken}`)
    .send({ title: "Unit 1 · Foundations", order: 1 })
    .expect(201);
  const unitId = unitRes.body.data.id as string;

  const matRes = await request(app)
    .post(`/api/courses/${course.id}/materials`)
    .set("Authorization", `Bearer ${lecToken}`)
    .send({
      title: "Theology Study Guide",
      type: "PDF_DOCUMENT",
      unitId,
      description: "Core reading guide",
    })
    .expect(201);
  const materialId = matRes.body.data.id as string;
  assert.equal(matRes.body.data.status, "DRAFT");

  // Publishing empty material fails
  await request(app)
    .patch(`/api/materials/${materialId}/status`)
    .set("Authorization", `Bearer ${lecToken}`)
    .send({ status: "PUBLISHED" })
    .expect(400);

  // Attach metadata & publish
  await request(app)
    .patch(`/api/materials/${materialId}/metadata`)
    .set("Authorization", `Bearer ${lecToken}`)
    .send({
      fileName: "th201-guide.pdf",
      mimeType: "application/pdf",
      fileSize: 102400,
      url: "/demo/courses/th201-outline.pdf",
    })
    .expect(200);

  await request(app)
    .patch(`/api/materials/${materialId}/status`)
    .set("Authorization", `Bearer ${lecToken}`)
    .send({ status: "PUBLISHED" })
    .expect(200);

  // Enrolled student can retrieve course materials; unenrolled student is blocked (403 NOT_ENROLLED)
  const enrolledMats = await request(app)
    .get(`/api/courses/${course.id}/materials`)
    .set("Authorization", `Bearer ${enrolledToken}`)
    .expect(200);
  assert.equal(enrolledMats.body.data.length, 1);

  const outsiderMats = await request(app)
    .get(`/api/courses/${course.id}/materials`)
    .set("Authorization", `Bearer ${outsiderToken}`)
    .expect(403);
  assert.equal(outsiderMats.body.error.code, "NOT_ENROLLED");

  // 2. Assignments: create, publish, student submission, grading, approval, publication
  const futureDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const asgRes = await request(app)
    .post(`/api/courses/${course.id}/assignments`)
    .set("Authorization", `Bearer ${lecToken}`)
    .send({
      title: "Servant Leadership Essay",
      instructions: "Write 1,000 words reflecting on servant leadership.",
      totalMarks: 100,
      deadline: futureDeadline,
      status: "PUBLISHED",
    })
    .expect(201);
  const assignmentId = asgRes.body.data.id as string;

  // Unenrolled student cannot submit
  await request(app)
    .post(`/api/assignments/${assignmentId}/submissions`)
    .set("Authorization", `Bearer ${outsiderToken}`)
    .send({ answerText: "Unauthorized attempt" })
    .expect(403);

  // Enrolled student submits
  const subRes = await request(app)
    .post(`/api/assignments/${assignmentId}/submissions`)
    .set("Authorization", `Bearer ${enrolledToken}`)
    .send({
      answerText: "My reflection on servant leadership.",
      attachmentName: "reflection.pdf",
      attachmentUrl: "/uploads/reflection.pdf",
    })
    .expect(201);
  const submissionId = subRes.body.data.id as string;
  assert.equal(subRes.body.data.status, "SUBMITTED");

  // Lecturer grades submission
  const gradedRes = await request(app)
    .patch(`/api/submissions/${submissionId}/grade`)
    .set("Authorization", `Bearer ${lecToken}`)
    .send({ mark: 85, feedback: "Well structured reflection.", status: "MARKED" })
    .expect(200);
  assert.equal(gradedRes.body.data.mark, 85);

  // Student cannot see unpublished mark yet
  const hiddenMark = await request(app)
    .get(`/api/assignments/${assignmentId}/submissions/me`)
    .set("Authorization", `Bearer ${enrolledToken}`)
    .expect(200);
  assert.equal(hiddenMark.body.data.mark, null);
  assert.equal(hiddenMark.body.data.feedback, null);

  // HOP approves, Secretariat publishes -> student sees mark & feedback
  await request(app)
    .patch(`/api/submissions/${submissionId}/status`)
    .set("Authorization", `Bearer ${hopToken}`)
    .send({ status: "APPROVED" })
    .expect(200);

  await request(app)
    .patch(`/api/submissions/${submissionId}/status`)
    .set("Authorization", `Bearer ${secToken}`)
    .send({ status: "PUBLISHED" })
    .expect(200);

  const releasedMark = await request(app)
    .get(`/api/assignments/${assignmentId}/submissions/me`)
    .set("Authorization", `Bearer ${enrolledToken}`)
    .expect(200);
  assert.equal(releasedMark.body.data.mark, 85);
  assert.equal(releasedMark.body.data.feedback, "Well structured reflection.");

  // Past-deadline assignment blocks late submissions when allowLate is false
  const closedAsg = await request(app)
    .post(`/api/courses/${course.id}/assignments`)
    .set("Authorization", `Bearer ${lecToken}`)
    .send({
      title: "Closed Assignment",
      instructions: "Deadline already passed.",
      deadline: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      allowLate: false,
      status: "PUBLISHED",
    })
    .expect(201);

  const lateRes = await request(app)
    .post(`/api/assignments/${closedAsg.body.data.id}/submissions`)
    .set("Authorization", `Bearer ${enrolledToken}`)
    .send({ answerText: "Too late" })
    .expect(400);
  assert.equal(lateRes.body.error.code, "DEADLINE_PASSED");
});


test("Programme, course and enrolment APIs enforce the student lifecycle and course access", async () => {
  const adminToken = await createAdminToken();
  const programResponse = await request(app)
    .post("/api/programs")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ code: "DTH", name: "Diploma in Theology", awardType: "Diploma", duration: "2 years" })
    .expect(201);
  const programId = programResponse.body.data.id as string;

  const courseResponse = await request(app)
    .post("/api/courses")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ code: "TH101", title: "Introduction to Theology", programId, credits: 3 })
    .expect(201);
  const courseId = courseResponse.body.data.id as string;

  const studentResponse = await request(app)
    .post("/api/students/register")
    .send({ firstName: "Grace", surname: "Banda", email: "grace@student.hosom.edu", password: "Password123!", program: "Diploma in Theology" })
    .expect(201);
  const studentToken = studentResponse.body.data.token as string;
  const studentId = studentResponse.body.data.student.id as string;
  assert.equal(studentResponse.body.data.student.status, "PENDING");

  await request(app)
    .post("/api/enrollments")
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ studentId, courseId })
    .expect(403);

  await request(app)
    .patch(`/api/students/${studentId}/status`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "ACTIVE" })
    .expect(200);

  await request(app)
    .post("/api/enrollments")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ studentId, courseId })
    .expect(201);

  const myEnrollments = await request(app)
    .get("/api/enrollments/me")
    .set("Authorization", `Bearer ${studentToken}`)
    .expect(200);
  assert.equal(myEnrollments.body.data.length, 1);
  assert.equal(myEnrollments.body.data[0].course.id, courseId);

  const myCourses = await request(app)
    .get("/api/courses")
    .set("Authorization", `Bearer ${studentToken}`)
    .expect(200);
  assert.equal(myCourses.body.data.length, 1);
  assert.equal(myCourses.body.data[0].id, courseId);
});
