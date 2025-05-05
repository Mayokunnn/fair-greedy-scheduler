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

export const roundRobinScheduler = async (userId: string) => {
  const workdays = await prisma.workday.findMany({
    where: {
      schedules: {
        some: {
          assignedById: userId,
        },
      },
    },
    orderBy: { date: "asc" },
  });

  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE' },
  });

  const schedules = [];
  const employeeLoad: Record<string, number> = {};

  employees.forEach((e: any) => {
    employeeLoad[e.id] = 0;
  });

  let currentIndex = 0;

  for (const day of workdays) {
    // sort by least loaded employees
    const sorted = [...employees].sort(
      (a, b) => employeeLoad[a.id] - employeeLoad[b.id]
    );

    const employee = sorted[currentIndex % sorted.length];

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


export const randomScheduler = async (userId: string) => {
  const workdays = await prisma.workday.findMany({
    where: {
      schedules: {
        some: {
          assignedById: userId, 
        },
      },
    },
  });

  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE' },
  });

  const schedules = [];

  for (const day of workdays) {
    const randomEmployee =
      employees[Math.floor(Math.random() * employees.length)];

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
