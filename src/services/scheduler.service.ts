import { PrismaClient, Role, Workday } from "@prisma/client";
const prisma = new PrismaClient();

export const fairGreedyScheduler = async (currentUserId: string, workdays: Workday[]) => {
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

  employees.sort((a, b) => a.schedules.length - b.schedules.length);

  const assignments = [];

  for (let i = 0; i < workdays.length; i++) {
    const employee = employees[i % employees.length];
    const alreadyScheduled = await prisma.schedule.findFirst({
      where: {
        workdayId: workdays[i].id,
        employeeId: employee.id,
      },
    });

    if (alreadyScheduled) continue;

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

export const basicGreedyScheduler = async (currentUserId: string, workdays: Workday[]) => {
  const employees = await prisma.user.findMany({
    where: { role: Role.EMPLOYEE },
  });

  const assignments = [];
  let i = 0;

  for (const day of workdays) {
    const employee = employees[i % employees.length];

    const existing = await prisma.schedule.findFirst({
      where: {
        workdayId: day.id,
        employeeId: employee.id,
      },
    });
    if (existing) continue;

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

export const roundRobinScheduler = async (userId: string, workdays: Workday[]) => {
  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE' },
  });

  const schedules = [];
  const employeeLoad: Record<string, number> = {};

  employees.forEach((e) => {
    employeeLoad[e.id] = 0;
  });

  let currentIndex = 0;

  for (const day of workdays) {
    const sorted = [...employees].sort(
      (a, b) => employeeLoad[a.id] - employeeLoad[b.id]
    );

    const employee = sorted[currentIndex % sorted.length];

    const existing = await prisma.schedule.findFirst({
      where: {
        workdayId: day.id,
        employeeId: employee.id,
      },
    });
    if (existing) continue;

    const schedule = await prisma.schedule.create({
      data: {
        workdayId: day.id,
        employeeId: employee.id,
        assignedById: userId,
      },
    });

    schedules.push(schedule);
    employeeLoad[employee.id] += 1;
    currentIndex++;
  }

  return schedules;
};

export const randomScheduler = async (userId: string, workdays: Workday[]) => {
  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE' },
  });

  const schedules = [];

  for (const day of workdays) {
    const randomEmployee = employees[Math.floor(Math.random() * employees.length)];

    const existing = await prisma.schedule.findFirst({
      where: {
        workdayId: day.id,
        employeeId: randomEmployee.id,
      },
    });
    if (existing) continue;

    const schedule = await prisma.schedule.create({
      data: {
        workdayId: day.id,
        employeeId: randomEmployee.id,
        assignedById: userId,
      },
    });

    schedules.push(schedule);
  }

  return schedules;
};
