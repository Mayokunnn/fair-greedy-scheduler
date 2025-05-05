import { PrismaClient, Role } from "@prisma/client";
const prisma = new PrismaClient();

export const fairGreedyScheduler = async (currentUserId: string) => {
  const employees = await prisma.user.findMany({
    where: { role: Role.EMPLOYEE },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      createdAt: true,
      schedules: {
        select: {
          id: true,
          workdayId: true,
          assignedById: true,
          createdAt: true,
        },
      },
    },
  });

  const workdays = await prisma.workday.findMany();

  // Sort by number of assigned schedules
  employees.sort((a, b) => a.schedules.length - b.schedules.length);

  const assignments = [];

  for (let i = 0; i < workdays.length; i++) {
    const alreadyScheduled = await prisma.schedule.findUnique({
      where: { workdayId: workdays[i].id },
    });
  
    if (alreadyScheduled) continue; // Skip this workday
  
    const employee = employees[i % employees.length];
    const schedule = await prisma.schedule.create({
      data: {
        employeeId: employee.id,
        workdayId: workdays[i].id,
        assignedById: currentUserId,
      },
    });
  
    assignments.push(schedule);
    employee.schedules.push(schedule);
  }
  

  return assignments;
};

export const basicGreedyScheduler = async (currentUserId: string) => {
  const employees = await prisma.user.findMany({
    where: { role: Role.EMPLOYEE },
    include: { schedules: true },
  });

  const workdays = await prisma.workday.findMany();

  const assignments = [];

  let i = 0;
  for (const day of workdays) {
    const employee = employees[i % employees.length];
    const schedule = await prisma.schedule.create({
      data: {
        employeeId: employee.id,
        workdayId: day.id,
        assignedById: currentUserId,
      },
    });
    assignments.push(schedule);
    i++;
  }

  return assignments;
};
