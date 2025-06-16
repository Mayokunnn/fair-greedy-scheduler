import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const generateWorkdaysService = async (
  startDate: Date,
  endDate: Date
) => {
  const workdays = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Force midnight UTC
    const normalizedDate = new Date(
      Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate(),
        0,
        0,
        0
      )
    );

    workdays.push({ date: normalizedDate });
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
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
