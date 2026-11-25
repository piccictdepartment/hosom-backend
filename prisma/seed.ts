import { prisma } from "../src/config/database.js";
import { hashPassword } from "../src/core/security/password.js";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo seeds must not run in production");
  }

  console.log("Starting database seed...");

  // Clear dependent records in foreign-key safe order
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

  const defaultPassword = "Password123!";
  const passwordHash = await hashPassword(defaultPassword);

  const staffUsers = [
    {
      firstName: "Alex",
      middleName: "James",
      surname: "Mercer",
      email: "sysadmin@hosom.edu",
      phone: "+265999100101",
      role: "SYSTEM_ADMIN" as const,
    },
    {
      firstName: "Sarah",
      middleName: "Jane",
      surname: "Connor",
      email: "administration@hosom.edu",
      phone: "+265999100102",
      role: "ADMINISTRATION" as const,
    },
    {
      firstName: "Samuel",
      middleName: null,
      surname: "Phiri",
      email: "chancellor@hosom.edu",
      phone: "+265999100103",
      role: "DIRECTOR" as const,
    },
    {
      firstName: "Ruth",
      middleName: null,
      surname: "Mbewe",
      email: "headofprograms@hosom.edu",
      phone: "+265999100104",
      role: "HEAD_OF_PROGRAMS" as const,
    },
    {
      firstName: "Grace",
      middleName: null,
      surname: "Kalua",
      email: "headofhosom@hosom.edu",
      phone: "+265999100105",
      role: "HEAD_OF_HOSOM" as const,
    },
    {
      firstName: "Peter",
      middleName: null,
      surname: "Mwale",
      email: "finance@hosom.edu",
      phone: "+265999100106",
      role: "FINANCE" as const,
    },
    {
      firstName: "Mary",
      middleName: null,
      surname: "Tembo",
      email: "secretariat@hosom.edu",
      phone: "+265999100107",
      role: "SECRETARIAT" as const,
    },
    {
      firstName: "Daniel",
      middleName: null,
      surname: "Phiri",
      email: "lecturer1@hosom.edu",
      phone: "+265999100108",
      role: "LECTURER" as const,
    },
    {
      firstName: "Esther",
      middleName: null,
      surname: "Banda",
      email: "lecturer2@hosom.edu",
      phone: "+265999100109",
      role: "LECTURER" as const,
    },
    {
      firstName: "Elliot",
      middleName: null,
      surname: "Alderson",
      email: "ict@hosom.edu",
      phone: "+265999100110",
      role: "MEDIA" as const,
    },
  ];

  const createdStaff = new Map<string, string>();
  for (const staff of staffUsers) {
    const u = await prisma.user.create({
      data: { ...staff, passwordHash },
    });
    createdStaff.set(staff.email, u.id);
  }

  const studentsData = [
    {
      user: {
        firstName: "Thoko",
        middleName: null,
        surname: "Banda",
        email: "thoko.banda@student.hosom.edu",
        phone: "+265999045869",
        role: "STUDENT" as const,
      },
      student: {
        studentNumber: "HOSOM/2026/001",
        status: "ACTIVE" as const,
        gender: "Female",
        dateOfBirth: new Date("2000-06-15"),
        nationality: "Malawian",
        address: "Area 47, Lilongwe",
        district: "Lilongwe",
        guardianName: "Joyce Banda",
        guardianPhone: "+265992603608",
        program: "Diploma in Theology",
        intake: "May 2026",
        yearOfStudy: 1,
        modeOfLearning: "Online",
      },
    },
    {
      user: {
        firstName: "Chisomo",
        middleName: null,
        surname: "Phiri",
        email: "chisomo.phiri@student.hosom.edu",
        phone: "+265999200202",
        role: "STUDENT" as const,
      },
      student: {
        studentNumber: "HOSOM/2026/002",
        status: "ACTIVE" as const,
        gender: "Male",
        dateOfBirth: new Date("2001-04-12"),
        nationality: "Malawian",
        address: "Blantyre",
        district: "Blantyre",
        guardianName: "John Phiri",
        guardianPhone: "+265992200202",
        program: "Certificate in Ministry",
        intake: "May 2026",
        yearOfStudy: 1,
        modeOfLearning: "Blended",
      },
    },
    {
      user: {
        firstName: "Blessings",
        middleName: null,
        surname: "Mbewe",
        email: "blessings.mbewe@student.hosom.edu",
        phone: "+265999200203",
        role: "STUDENT" as const,
      },
      student: {
        studentNumber: "HOSOM/2026/003",
        status: "ACTIVE" as const,
        gender: "Male",
        dateOfBirth: new Date("1999-11-08"),
        nationality: "Malawian",
        address: "Mzuzu",
        district: "Mzimba",
        guardianName: "Martha Mbewe",
        guardianPhone: "+265992200203",
        program: "Diploma in Theology",
        intake: "May 2026",
        yearOfStudy: 2,
        modeOfLearning: "Online",
      },
    },
  ];

  const createdStudents: { id: string; email: string }[] = [];
  for (const s of studentsData) {
    const user = await prisma.user.create({
      data: {
        ...s.user,
        passwordHash,
        student: { create: s.student },
      },
      include: { student: true },
    });
    if (user.student) {
      createdStudents.push({ id: user.student.id, email: user.email });
    }
  }

  // Academic Period & Programmes
  const period = await prisma.academicPeriod.create({
    data: {
      name: "2026 · Semester 2",
      academicYear: "2026",
      semester: "Semester 2",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-12-18"),
      isCurrent: true,
    },
  });

  const cert = await prisma.program.create({
    data: {
      code: "CM-01",
      name: "Certificate in Ministry",
      awardType: "Certificate",
      duration: "1 year",
      description: "Foundation for emerging ministry leaders.",
    },
  });

  const diploma = await prisma.program.create({
    data: {
      code: "DT-02",
      name: "Diploma in Theology",
      awardType: "Diploma",
      duration: "2 years",
      description: "Structured theological education with blended learning.",
    },
  });

  await prisma.program.create({
    data: {
      code: "BM-04",
      name: "Bachelor of Ministry",
      awardType: "Degree",
      duration: "4 years",
      description: "In-depth pathway for sustained pastoral and community ministry.",
    },
  });

  const lecturer1Id = createdStaff.get("lecturer1@hosom.edu")!;
  const lecturer2Id = createdStaff.get("lecturer2@hosom.edu")!;

  const bi101 = await prisma.course.create({
    data: {
      code: "BI101",
      title: "Biblical Interpretation",
      description: "Foundations of hermeneutics and contextual scripture study.",
      credits: 3,
      programId: diploma.id,
      academicPeriodId: period.id,
    },
  });

  const th201 = await prisma.course.create({
    data: {
      code: "TH201",
      title: "Foundations of Theology",
      description: "Core doctrines, theology and ministry practice.",
      credits: 3,
      programId: diploma.id,
      academicPeriodId: period.id,
    },
  });

  const mn202 = await prisma.course.create({
    data: {
      code: "MN202",
      title: "Ministry Leadership",
      description: "Servant leadership and organizational stewardship.",
      credits: 3,
      programId: cert.id,
      academicPeriodId: period.id,
    },
  });

  await prisma.courseLecturer.createMany({
    data: [
      { courseId: bi101.id, lecturerId: lecturer1Id, isPrimary: true },
      { courseId: th201.id, lecturerId: lecturer1Id, isPrimary: true },
      { courseId: mn202.id, lecturerId: lecturer2Id, isPrimary: true },
    ],
  });

  // Enroll Thoko in BI101 and TH201 (not MN202, useful for testing enrollment access control)
  const thoko = createdStudents[0]!;
  await prisma.enrollment.createMany({
    data: [
      { studentId: thoko.id, courseId: bi101.id, academicPeriodId: period.id, status: "ACTIVE" },
      { studentId: thoko.id, courseId: th201.id, academicPeriodId: period.id, status: "ACTIVE" },
    ],
  });

  const biUnit1 = await prisma.courseUnit.create({
    data: {
      courseId: bi101.id,
      title: "Unit 1 · Foundations of Interpretation",
      description: "Introduction to context, genre, and study tools.",
      order: 1,
    },
  });

  await prisma.learningMaterial.createMany({
    data: [
      {
        courseId: bi101.id,
        unitId: biUnit1.id,
        createdById: lecturer1Id,
        title: "Course Outline — BI101",
        description: "Official syllabus and reading schedule.",
        type: "COURSE_OUTLINE",
        status: "PUBLISHED",
        fileName: "bi101-outline.pdf",
        mimeType: "application/pdf",
        fileSize: 245760,
        url: "/demo/courses/bi101-outline.pdf",
        publishedAt: new Date(),
        order: 1,
      },
      {
        courseId: mn202.id,
        createdById: lecturer2Id,
        title: "Leadership Seminar Notes",
        description: "Notes for Ministry Leadership.",
        type: "LECTURE_NOTES",
        status: "PUBLISHED",
        body: "Servant leadership principles in practice.",
        publishedAt: new Date(),
        order: 1,
      },
    ],
  });

  await prisma.assignment.create({
    data: {
      courseId: th201.id,
      createdById: lecturer1Id,
      title: "Practical Ministry Reflection",
      instructions: "Write a 1,000-word reflection on servant leadership.",
      totalMarks: 100,
      submissionFormat: "BOTH",
      deadline: new Date("2026-12-15T17:00:00Z"),
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  console.log("Seed completed successfully!");
  console.log(`All seeded accounts use password: "${defaultPassword}"`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
