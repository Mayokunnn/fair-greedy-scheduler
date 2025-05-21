import { Role, Workday } from "@prisma/client";
import prisma from "../utils/prisma";

export const fairGreedyScheduler = async (
  currentUserId: string,
  workdays: Workday[]
) => {
  const employees = await prisma.user.findMany({
    where: { role: Role.EMPLOYEE },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      position: true,
      preferredDays: true,
      schedules: {
        select: {
          workdayId: true,
        },
      },
    },
  });

  // Create a scoring map: employeeId -> score
  const scoreMap: Record<string, number> = {};
  employees.forEach((emp) => (scoreMap[emp.id] = 0));

  const assignments = [];
  const halfEmployeess = Math.floor(employees.length / 2);

  for (const day of workdays) {
    const date = new Date(day.date);
    const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "long" });

    // Count how many people are already scheduled for this day
    const existingSchedules = await prisma.schedule.findMany({
      where: { workdayId: day.id },
    });
    if (existingSchedules.length >= halfEmployeess) continue; // max halfEmployeess per day

    // Sort employees based on score (lowest first to balance out unfairness)
    const sortedEmployees = employees.sort(
      (a, b) => scoreMap[a.id] - scoreMap[b.id]
    );

    let count = existingSchedules.length;

    for (const emp of sortedEmployees) {
      if (count >= halfEmployeess) break; // once halfEmployeess are assigned, stop for the day

      const alreadyScheduled = emp.schedules.find(
        (s) => s.workdayId === day.id
      );
      if (alreadyScheduled) continue;

      const isPreferred = emp.preferredDays.includes(dayOfWeek);
      const proposedScore = scoreMap[emp.id] + (isPreferred ? 1 : -1);

      if (proposedScore > 3 || proposedScore < -3) continue;

      const schedule = await prisma.schedule.create({
        data: {
          employeeId: emp.id,
          workdayId: day.id,
          assignedById: currentUserId,
        },
      });

      scoreMap[emp.id] = proposedScore;
      assignments.push(schedule);
      count++;
    }
  }

  return assignments;
};

export const basicGreedyScheduler = async (
  currentUserId: string,
  workdays: Workday[]
) => {
  const employees = await prisma.user.findMany({
    where: { role: Role.EMPLOYEE },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      position: true,
      preferredDays: true,
      schedules: true,
    },
  });

  const assignments = [];
  let i = 0;

  for (const day of workdays) {
    const weekday = new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' });

    // Try to find the first employee whose preferred days include this weekday
    const employee =
      employees.find(emp =>
        emp.preferredDays.some(pd => pd === weekday)
      ) || employees[i % employees.length]; // fallback

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
        type: "BASIC"
      },
    });

    assignments.push(schedule);
    i++;
  }

  return assignments;
};


export const roundRobinScheduler = async (
  userId: string,
  workdays: Workday[]
) => {
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    select: {
      id: true,
      preferredDays: true
    }
  });

  const schedules = [];
  const employeeLoad: Record<string, number> = {};

  employees.forEach((e) => {
    employeeLoad[e.id] = 0;
  });

  for (const day of workdays) {
    const weekday = new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' });

    // Filter employees who prefer this day
    const preferredEmployees = employees.filter(emp =>
      emp.preferredDays.some(p => p === weekday)
    );

    const pool = preferredEmployees.length ? preferredEmployees : employees;

    const sorted = [...pool].sort(
      (a, b) => employeeLoad[a.id] - employeeLoad[b.id]
    );

    const employee = sorted[0];

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
        type: "ROUND_ROBIN"
      },
    });

    schedules.push(schedule);
    employeeLoad[employee.id] += 1;
  }

  return schedules;
};


export const randomScheduler = async (userId: string, workdays: Workday[]) => {
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    select: {
      id: true,
      preferredDays: true
    }
  });

  const schedules = [];

  for (const day of workdays) {
    const weekday = new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' });

    const preferred = employees.filter(e =>
      e.preferredDays.some(p => p === weekday)
    );

    const pool = preferred.length > 0 ? preferred : employees;

    const randomEmployee = pool[Math.floor(Math.random() * pool.length)];

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
        type: "RANDOM"
      },
    });

    schedules.push(schedule);
  }

  return schedules;
};
