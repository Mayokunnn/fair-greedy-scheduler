import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedWorkdays = async () => {
  const today = new Date();
  const workdays = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    workdays.push({ date });
  }

  for (const wd of workdays) {
    await prisma.workday.create({ data: wd });
  }

  console.log('✅ 7 workdays created');
};

seedWorkdays()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
