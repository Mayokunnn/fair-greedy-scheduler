import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const generateWorkdaysService = async (
  startDate: Date,
  endDate: Date
) => {
  const workdays = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    workdays.push({ date: new Date(currentDate) });
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const createdWorkdays = await prisma.$transaction(
    workdays.map((day) =>
      prisma.workday.upsert({
        where: { date: day.date },
        update: {},
        create: { date: day.date },
      })
    )
  );

  return createdWorkdays;
};
