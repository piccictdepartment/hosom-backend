import { prisma } from "../src/config/database.js";
import { hashPassword } from "../src/core/security/password.js";

async function main() {
  console.log("🌱 Starting database seed...");

  // 1. Clean existing records
  console.log("🧹 Clearing old records...");
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();

  // 2. Hash shared default password
  const defaultPassword = "Password123!";
  const passwordHash = await hashPassword(defaultPassword);

  console.log("👥 Creating administrative & staff users...");

  // 3. Seed Users for every role
  const staffUsers = [
    {
      firstName: "Alex",
      middleName: "James",
      surname: "Mercer",
      email: "sysadmin@hosom.edu",
      phone: "+1555100101",
      role: "SYSTEM_ADMINISTRATOR" as const,
    },
    {
      firstName: "Sarah",
      middleName: "Jane",
      surname: "Connor",
      email: "administration@hosom.edu",
      phone: "+1555100102",
      role: "ADMINISTRATION" as const,
    },
    {
      firstName: "Charles",
      middleName: "Francis",
      surname: "Xavier",
      email: "chancellor@hosom.edu",
      phone: "+1555100103",
      role: "DIRECTOR_CHANCELLOR" as const,
    },
    {
      firstName: "Albus",
      middleName: "Percival",
      surname: "Dumbledore",
      email: "headofprograms@hosom.edu",
      phone: "+1555100104",
      role: "HEAD_OF_PROGRAMS" as const,
    },
    {
      firstName: "Gordon",
      middleName: null,
      surname: "Gekko",
      email: "finance@hosom.edu",
      phone: "+1555100105",
      role: "FINANCE" as const,
    },
    {
      firstName: "Donna",
      middleName: "Roberta",
      surname: "Paulsen",
      email: "secretariat@hosom.edu",
      phone: "+1555100106",
      role: "SECRETARIAT" as const,
    },
    {
      firstName: "Walter",
      middleName: "Hartwell",
      surname: "White",
      email: "lecturer1@hosom.edu",
      phone: "+1555100107",
      role: "LECTURER" as const,
    },
    {
      firstName: "Minerva",
      middleName: null,
      surname: "McGonagall",
      email: "lecturer2@hosom.edu",
      phone: "+1555100108",
      role: "LECTURER" as const,
    },
    {
      firstName: "Elliot",
      middleName: null,
      surname: "Alderson",
      email: "ict@hosom.edu",
      phone: "+1555100109",
      role: "ICT_MEDIA" as const,
    },
    {
      firstName: "Bruce",
      middleName: "Thomas",
      surname: "Wayne",
      email: "admin@hosom.edu",
      phone: "+1555100110",
      role: "ADMIN" as const,
    },
  ];

  for (const staff of staffUsers) {
    await prisma.user.create({
      data: {
        ...staff,
        passwordHash,
      },
    });
  }

  console.log("🎓 Creating student users with bio-data profiles...");

  // 4. Seed Students (User + Student 1-to-1)
  const students = [
    {
      user: {
        firstName: "Peter",
        middleName: "Benjamin",
        surname: "Parker",
        email: "peter.parker@student.hosom.edu",
        phone: "+1555200201",
        role: "STUDENT" as const,
      },
      student: {
        studentNumber: "STU-2026-001",
        gender: "Male",
        dateOfBirth: new Date("2003-08-10"),
        address: "20 Ingram St, Forest Hills, Queens, NY",
        guardianName: "May Parker",
        guardianPhone: "+1555299901",
        program: "B.Sc. Computer Science & Software Engineering",
      },
    },
    {
      user: {
        firstName: "Hermione",
        middleName: "Jean",
        surname: "Granger",
        email: "hermione.granger@student.hosom.edu",
        phone: "+1555200202",
        role: "STUDENT" as const,
      },
      student: {
        studentNumber: "STU-2026-002",
        gender: "Female",
        dateOfBirth: new Date("2004-09-19"),
        address: "42 Heathgate, London, UK",
        guardianName: "Richard Granger",
        guardianPhone: "+1555299902",
        program: "B.Sc. Data Science & Applied Mathematics",
      },
    },
    {
      user: {
        firstName: "Miles",
        middleName: "Gonzalo",
        surname: "Morales",
        email: "miles.morales@student.hosom.edu",
        phone: "+1555200203",
        role: "STUDENT" as const,
      },
      student: {
        studentNumber: "STU-2026-003",
        gender: "Male",
        dateOfBirth: new Date("2005-01-25"),
        address: "Brooklyn, New York, NY",
        guardianName: "Rio Morales",
        guardianPhone: "+1555299903",
        program: "Diploma in Multimedia & Animation Design",
      },
    },
    {
      user: {
        firstName: "Clark",
        middleName: "Joseph",
        surname: "Kent",
        email: "clark.kent@student.hosom.edu",
        phone: "+1555200204",
        role: "STUDENT" as const,
      },
      student: {
        studentNumber: "STU-2026-004",
        gender: "Male",
        dateOfBirth: new Date("2002-06-18"),
        address: "344 Clinton St, Metropolis",
        guardianName: "Martha Kent",
        guardianPhone: "+1555299904",
        program: "B.A. Mass Communication & Journalism",
      },
    },
    {
      user: {
        firstName: "Diana",
        middleName: null,
        surname: "Prince",
        email: "diana.prince@student.hosom.edu",
        phone: "+1555200205",
        role: "STUDENT" as const,
      },
      student: {
        studentNumber: "STU-2026-005",
        gender: "Female",
        dateOfBirth: new Date("2001-03-22"),
        address: "Gateway City, California",
        guardianName: "Hippolyta Prince",
        guardianPhone: "+1555299905",
        program: "B.A. International Relations & Diplomacy",
      },
    },
  ];

  for (const s of students) {
    await prisma.user.create({
      data: {
        ...s.user,
        passwordHash,
        student: {
          create: s.student,
        },
      },
    });
  }

  const userCount = await prisma.user.count();
  const studentCount = await prisma.student.count();

  console.log(`\n✅ Seed completed successfully!`);
  console.log(`📊 Summary:`);
  console.log(`   - Total Users created: ${userCount}`);
  console.log(`   - Total Students with bio-data created: ${studentCount}`);
  console.log(`🔑 All seeded users share password: "${defaultPassword}"\n`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
