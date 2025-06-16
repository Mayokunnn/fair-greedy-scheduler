import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const generateWorkdaysService = async (
  startDate: Date,
  endDate: Date
) => {
  const workdays = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const middayUTC = new Date(currentDate);
    middayUTC.setUTCHours(12, 0, 0, 0); // Set to 12:00 UTC to avoid timezone confusion
    workdays.push({ date: middayUTC });
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

export const getWorkdaysService = async (from: Date, to: Date) => {
  return await prisma.workday.findMany({
    where: {
      date: {
        gte: from,
        lte: to,
      },
    },
  });
};
