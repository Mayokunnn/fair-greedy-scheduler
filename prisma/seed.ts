import { PrismaClient, Role } from "@prisma/client";
import { signup } from "../api/services/auth.service";
const prisma = new PrismaClient();
type WeekDay = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY";

const sampleNames = [
  "Ada Obi",
  "John Smith",
  "Jane Doe",
  "Tunde Balogun",
  "Sarah Ahmed",
  "Musa Bello",
  "Fola Ade",
  "Chika Okafor",
  "Blessing Nwankwo",
  "David Uche",
  "Grace Williams",
  "Emeka Eze",
  "Ngozi Ike",
  "Ayo Johnson",
  "Zainab Musa",
  "Ifeanyi Nwachukwu",
  "Bukola Adebayo",
  "Tomiwa Ajayi",
  "Lilian Daniel",
  "Kunle Popoola",
];

const samplePositions = [
  "Software Engineer",
  "HR Manager",
  "Project Manager",
  "Accountant",
  "Data Analyst",
  "UI/UX Designer",
  "Frontend Developer",
  "Backend Developer",
  "DevOps Engineer",
  "Marketing Lead",
];

const days: WeekDay[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
];

const generatePreferredDays = (): WeekDay[] => {
  const shuffled = [...days].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 2); // Randomly select 2 days
};

async function seed() {
  // Delete schedules first to respect foreign key constraints
  await prisma.schedule.deleteMany();
  await prisma.user.deleteMany();

  const promises = sampleNames.map((fullName, i) => {
    const email = `user${i + 1}@test.com`;
    const password = "test1234";
    const position = samplePositions[i % samplePositions.length];
    const preferredDays = generatePreferredDays();

    return signup(
      email,
      password,
      position,
      fullName,
      Role.EMPLOYEE,
      preferredDays
    );
  });

  await Promise.all(promises);
  console.log("✅ Seeded 20 employees");
}

seed().finally(() => prisma.$disconnect());
