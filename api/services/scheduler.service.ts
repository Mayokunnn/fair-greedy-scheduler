import { Role, Workday } from "@prisma/client";
import prisma from "../utils/prisma";
import {
  parseISO,
  startOfWeek,
  addDays,
  format,
  getWeek,
  isWithinInterval,
  startOfDay,
  endOfWeek,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";

const TIMEZONE = "Africa/Lagos";
const MAX_EMPLOYEES_PER_DAY = 12;
const MAX_DAYS_PER_EMPLOYEE = 3;
const MIN_DAYS_PER_EMPLOYEE = 3;
const FAIRNESS_SCORE_MIN = -3;
const FAIRNESS_SCORE_MAX = 3;

export const fairGreedyScheduler = async (
  currentUserId: string,
  workdays: Workday[],
  weekStart: string
) => {
  const weekStartDate = startOfWeek(
    toZonedTime(parseISO(weekStart), TIMEZONE),
    {
      weekStartsOn: 1,
    }
  );
  const weekEndDate = addDays(weekStartDate, 5);

  const weekWorkdays = workdays.filter((wd) => {
    const localDate = toZonedTime(new Date(wd.date), TIMEZONE);
    const dateOnly = startOfDay(localDate);
    const weekday = format(dateOnly, "EEEE");

    return (
      isWithinInterval(dateOnly, { start: weekStartDate, end: weekEndDate }) &&
      ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(weekday)
    );
  });

  if (weekWorkdays.length < 5) return [];

  const employees = await prisma.user.findMany({
    where: { role: Role.EMPLOYEE },
    select: {
      id: true,
      fullName: true,
      preferredDays: true,
      fairnessScore: true, // Get from DB
    },
    orderBy: { id: "asc" },
  });

  if (employees.length === 0) return [];

  const scheduleCountPerWorkday: Record<string, number> = {};
  const assignedWorkdayIdsPerEmployee: Record<string, Set<string>> = {};
  weekWorkdays.forEach((wd) => (scheduleCountPerWorkday[wd.id] = 0));

  const existingSchedules = await prisma.schedule.findMany({
    where: {
      workday: { date: { gte: weekStartDate, lte: weekEndDate } },
      type: "FAIR",
    },
    include: { workday: true },
  });

  for (const schedule of existingSchedules) {
    if (weekWorkdays.some((wd) => wd.id === schedule.workdayId)) {
      scheduleCountPerWorkday[schedule.workdayId]++;
      if (!assignedWorkdayIdsPerEmployee[schedule.employeeId]) {
        assignedWorkdayIdsPerEmployee[schedule.employeeId] = new Set();
      }
      assignedWorkdayIdsPerEmployee[schedule.employeeId].add(
        schedule.workdayId
      );
    }
  }

  const scoreMap: Record<string, number> = {};
  for (const emp of employees) {
    scoreMap[emp.id] = emp.fairnessScore;
    assignedWorkdayIdsPerEmployee[emp.id] ||= new Set();
  }

  const rotationIndex =
    (getWeek(weekStartDate, { weekStartsOn: 1, firstWeekContainsDate: 4 }) -
      1) %
    employees.length;
  const rotatedEmployees = [
    ...employees.slice(rotationIndex),
    ...employees.slice(0, rotationIndex),
  ];
  const rotationOrderMap: Record<string, number> = {};
  rotatedEmployees.forEach((emp, index) => (rotationOrderMap[emp.id] = index));

  const assignments: any[] = [];
  const assignedCountPerDay: Record<string, number> = {
    ...scheduleCountPerWorkday,
  };

  while (true) {
    const employeesNeedingAssignments = employees.filter(
      (emp) =>
        assignedWorkdayIdsPerEmployee[emp.id].size < MAX_DAYS_PER_EMPLOYEE
    );
    if (employeesNeedingAssignments.length === 0) break;

    employeesNeedingAssignments.sort((a, b) => {
      const aAssigned = assignedWorkdayIdsPerEmployee[a.id].size;
      const bAssigned = assignedWorkdayIdsPerEmployee[b.id].size;
      if (aAssigned !== bAssigned) return aAssigned - bAssigned;
      const scoreDiff = scoreMap[a.id] - scoreMap[b.id];
      if (scoreDiff !== 0) return scoreDiff;
      return rotationOrderMap[a.id] - rotationOrderMap[b.id];
    });

    let assignedThisRound = 0;

    for (const emp of employeesNeedingAssignments) {
      const currentScore = scoreMap[emp.id];
      if (
        (currentScore <= FAIRNESS_SCORE_MIN ||
          currentScore >= FAIRNESS_SCORE_MAX) &&
        assignedWorkdayIdsPerEmployee[emp.id].size >= MIN_DAYS_PER_EMPLOYEE
      ) {
        continue;
      }

      const availableDays = weekWorkdays.filter(
        (wd) =>
          assignedCountPerDay[wd.id] < MAX_EMPLOYEES_PER_DAY &&
          !assignedWorkdayIdsPerEmployee[emp.id].has(wd.id)
      );

      const bestDay = availableDays.find((wd) => true); // very basic greedy
      if (!bestDay) continue;

      const weekday = format(
        toZonedTime(bestDay.date, TIMEZONE),
        "EEEE"
      ).toLowerCase();
      const isPreferred = emp.preferredDays
        .map((d) => d.toLowerCase())
        .includes(weekday);

      let updatedScore = scoreMap[emp.id] + (isPreferred ? -1 : 1);
      updatedScore = Math.max(
        FAIRNESS_SCORE_MIN,
        Math.min(FAIRNESS_SCORE_MAX, updatedScore)
      );
      scoreMap[emp.id] = updatedScore;

      const schedule = await prisma.schedule.create({
        data: {
          employeeId: emp.id,
          workdayId: bestDay.id,
          assignedById: currentUserId,
          type: "FAIR",
        },
      });

      assignedWorkdayIdsPerEmployee[emp.id].add(bestDay.id);
      assignedCountPerDay[bestDay.id]++;
      assignments.push(schedule);
      assignedThisRound++;
    }

    if (assignedThisRound === 0) break;
  }

  // Update fairness scores in DB
  await Promise.all(
    Object.entries(scoreMap).map(([empId, score]) =>
      prisma.user.update({
        where: { id: empId },
        data: { fairnessScore: score },
      })
    )
  );

  return assignments;
};

export const basicGreedyScheduler = async (
  currentUserId: string,
  workdays: Workday[],
  weekStart: string
) => {
  // Parse weekStart in the correct time zone
  const weekStartDate = startOfWeek(
    toZonedTime(parseISO(weekStart), TIMEZONE),
    { weekStartsOn: 1 }
  );
  const weekEndDate = endOfWeek(toZonedTime(parseISO(weekStart), TIMEZONE), {
    weekStartsOn: 1,
  });

  // Filter workdays for the specified week
  const weekWorkdays = workdays.filter((wd) =>
    isWithinInterval(toZonedTime(wd.date, TIMEZONE), {
      start: weekStartDate,
      end: weekEndDate,
    })
  );

  // Log workdays found
  console.log(
    `Found ${weekWorkdays.length} workdays for week starting ${weekStart}:`,
    weekWorkdays.map((wd) => ({ id: wd.id, date: wd.date.toISOString() }))
  );

  if (weekWorkdays.length === 0) {
    console.log(`No workdays found for week starting ${weekStart}`);
    return [];
  }

  // Check existing schedules for the week
  const existingSchedules = await prisma.schedule.findMany({
    where: {
      workday: {
        date: { gte: weekStartDate, lte: weekEndDate },
      },
    },
    select: {
      workdayId: true,
    },
  });

  // Count schedules per workday
  const scheduleCountPerWorkday: Record<string, number> = {};
  weekWorkdays.forEach((wd) => {
    scheduleCountPerWorkday[wd.id] = 0;
  });
  existingSchedules.forEach((schedule) => {
    if (scheduleCountPerWorkday[schedule.workdayId] !== undefined) {
      scheduleCountPerWorkday[schedule.workdayId]++;
    }
  });

  console.log(
    `Workday assignment counts for week starting ${weekStart}:`,
    scheduleCountPerWorkday
  );

  const MAX_EMPLOYEES_PER_DAY = 15;
  const allWorkdaysFullyAssigned = weekWorkdays.every(
    (wd) => scheduleCountPerWorkday[wd.id] >= MAX_EMPLOYEES_PER_DAY
  );

  if (allWorkdaysFullyAssigned) {
    console.log(
      `All workdays in week starting ${weekStart} are fully assigned with ${MAX_EMPLOYEES_PER_DAY} employees`
    );
    return ["yooo"];
  }

  // Fetch employees
  const employees = await prisma.user.findMany({
    where: { role: Role.EMPLOYEE },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      position: true,
      preferredDays: true,
    },
  });

  console.log(
    `Found ${employees.length} employees:`,
    employees.map((emp) => ({
      id: emp.id,
      name: emp.fullName,
      preferredDays: emp.preferredDays,
    }))
  );

  const assignments = [];
  let i = 0;

  for (const day of weekWorkdays) {
    if (scheduleCountPerWorkday[day.id] >= MAX_EMPLOYEES_PER_DAY) {
      console.log(
        `Workday ${day.id} at capacity (${
          scheduleCountPerWorkday[day.id]
        }/${MAX_EMPLOYEES_PER_DAY})`
      );
      continue;
    }

    const weekday = toZonedTime(day.date, TIMEZONE).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
      }
    );

    // Try to find the first employee whose preferred days include this weekday
    const employee =
      employees.find((emp) => emp.preferredDays.some((pd) => pd === weekday)) ||
      employees[i % employees.length]; // fallback

    const existing = await prisma.schedule.findFirst({
      where: {
        workdayId: day.id,
        employeeId: employee.id,
      },
    });
    if (existing) {
      console.log(
        `Employee ${employee.id} already assigned to workday ${day.id}`
      );
      continue;
    }

    const schedule = await prisma.schedule.create({
      data: {
        employeeId: employee.id,
        workdayId: day.id,
        assignedById: currentUserId,
        type: "BASIC",
      },
    });

    assignments.push(schedule);
    scheduleCountPerWorkday[day.id]++;
    i++;
    console.log(`Assigned employee ${employee.id} to workday ${day.id}`);
  }

  console.log(
    `Generated ${assignments.length} new schedules for week starting ${weekStart}`
  );
  return assignments;
};

export const roundRobinScheduler = async (
  userId: string,
  workdays: Workday[],
  weekStart: string
) => {
  // Parse weekStart in the correct time zone
  const weekStartDate = startOfWeek(
    toZonedTime(parseISO(weekStart), TIMEZONE),
    { weekStartsOn: 1 }
  );
  const weekEndDate = endOfWeek(toZonedTime(parseISO(weekStart), TIMEZONE), {
    weekStartsOn: 1,
  });

  // Filter workdays for the specified week
  const weekWorkdays = workdays.filter((wd) =>
    isWithinInterval(toZonedTime(wd.date, TIMEZONE), {
      start: weekStartDate,
      end: weekEndDate,
    })
  );

  // Log workdays found
  console.log(
    `Found ${weekWorkdays.length} workdays for week starting ${weekStart}:`,
    weekWorkdays.map((wd) => ({ id: wd.id, date: wd.date.toISOString() }))
  );

  if (weekWorkdays.length === 0) {
    console.log(`No workdays found for week starting ${weekStart}`);
    return [];
  }

  // Check existing schedules for the week
  const existingSchedules = await prisma.schedule.findMany({
    where: {
      workday: {
        date: { gte: weekStartDate, lte: weekEndDate },
      },
    },
    select: {
      workdayId: true,
      employeeId: true,
    },
  });

  // Count schedules per workday and employee load
  const scheduleCountPerWorkday: Record<string, number> = {};
  const employeeLoad: Record<string, number> = {};
  weekWorkdays.forEach((wd) => {
    scheduleCountPerWorkday[wd.id] = 0;
  });
  existingSchedules.forEach((schedule) => {
    if (scheduleCountPerWorkday[schedule.workdayId] !== undefined) {
      scheduleCountPerWorkday[schedule.workdayId]++;
    }
    employeeLoad[schedule.employeeId] =
      (employeeLoad[schedule.employeeId] || 0) + 1;
  });

  console.log(
    `Workday assignment counts for week starting ${weekStart}:`,
    scheduleCountPerWorkday
  );

  const MAX_EMPLOYEES_PER_DAY = 15;
  const allWorkdaysFullyAssigned = weekWorkdays.every(
    (wd) => scheduleCountPerWorkday[wd.id] >= MAX_EMPLOYEES_PER_DAY
  );

  if (allWorkdaysFullyAssigned) {
    console.log(
      `All workdays in week starting ${weekStart} are fully assigned with ${MAX_EMPLOYEES_PER_DAY} employees`
    );
    return ["yooo"];
  }

  // Fetch employees
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    select: {
      id: true,
      preferredDays: true,
    },
  });

  console.log(
    `Found ${employees.length} employees:`,
    employees.map((emp) => ({ id: emp.id, preferredDays: emp.preferredDays }))
  );

  // Initialize employee load if not already set
  employees.forEach((e) => {
    if (!employeeLoad[e.id]) {
      employeeLoad[e.id] = 0;
    }
  });

  const schedules = [];

  for (const day of weekWorkdays) {
    if (scheduleCountPerWorkday[day.id] >= MAX_EMPLOYEES_PER_DAY) {
      console.log(
        `Workday ${day.id} at capacity (${
          scheduleCountPerWorkday[day.id]
        }/${MAX_EMPLOYEES_PER_DAY})`
      );
      continue;
    }

    const weekday = toZonedTime(day.date, TIMEZONE).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
      }
    );

    // Filter employees who prefer this day
    const preferredEmployees = employees.filter((emp) =>
      emp.preferredDays.some((p) => p === weekday)
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
    if (existing) {
      console.log(
        `Employee ${employee.id} already assigned to workday ${day.id}`
      );
      continue;
    }

    const schedule = await prisma.schedule.create({
      data: {
        workdayId: day.id,
        employeeId: employee.id,
        assignedById: userId,
        type: "ROUND_ROBIN",
      },
    });

    schedules.push(schedule);
    employeeLoad[employee.id]++;
    scheduleCountPerWorkday[day.id]++;
    console.log(`Assigned employee ${employee.id} to workday ${day.id}`);
  }

  console.log(
    `Generated ${schedules.length} new schedules for week starting ${weekStart}`
  );
  return schedules;
};

export const randomScheduler = async (
  userId: string,
  workdays: Workday[],
  weekStart: string
) => {
  // Parse weekStart in the correct time zone
  const weekStartDate = startOfWeek(
    toZonedTime(parseISO(weekStart), TIMEZONE),
    { weekStartsOn: 1 }
  );
  const weekEndDate = endOfWeek(toZonedTime(parseISO(weekStart), TIMEZONE), {
    weekStartsOn: 1,
  });

  // Filter workdays for the specified week
  const weekWorkdays = workdays.filter((wd) =>
    isWithinInterval(toZonedTime(wd.date, TIMEZONE), {
      start: weekStartDate,
      end: weekEndDate,
    })
  );

  // Log workdays found
  console.log(
    `Found ${weekWorkdays.length} workdays for week starting ${weekStart}:`,
    weekWorkdays.map((wd) => ({ id: wd.id, date: wd.date.toISOString() }))
  );

  if (weekWorkdays.length === 0) {
    console.log(`No workdays found for week starting ${weekStart}`);
    return [];
  }

  // Check existing schedules for the week
  const existingSchedules = await prisma.schedule.findMany({
    where: {
      workday: {
        date: { gte: weekStartDate, lte: weekEndDate },
      },
    },
    select: {
      workdayId: true,
    },
  });

  // Count schedules per workday
  const scheduleCountPerWorkday: Record<string, number> = {};
  weekWorkdays.forEach((wd) => {
    scheduleCountPerWorkday[wd.id] = 0;
  });
  existingSchedules.forEach((schedule) => {
    if (scheduleCountPerWorkday[schedule.workdayId] !== undefined) {
      scheduleCountPerWorkday[schedule.workdayId]++;
    }
  });

  console.log(
    `Workday assignment counts for week starting ${weekStart}:`,
    scheduleCountPerWorkday
  );

  const MAX_EMPLOYEES_PER_DAY = 15;
  const allWorkdaysFullyAssigned = weekWorkdays.every(
    (wd) => scheduleCountPerWorkday[wd.id] >= MAX_EMPLOYEES_PER_DAY
  );

  if (allWorkdaysFullyAssigned) {
    console.log(
      `All workdays in week starting ${weekStart} are fully assigned with ${MAX_EMPLOYEES_PER_DAY} employees`
    );
    return ["yooo"];
  }

  // Fetch employees
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    select: {
      id: true,
      preferredDays: true,
    },
  });

  console.log(
    `Found ${employees.length} employees:`,
    employees.map((emp) => ({ id: emp.id, preferredDays: emp.preferredDays }))
  );

  const schedules = [];

  for (const day of weekWorkdays) {
    if (scheduleCountPerWorkday[day.id] >= MAX_EMPLOYEES_PER_DAY) {
      console.log(
        `Workday ${day.id} at capacity (${
          scheduleCountPerWorkday[day.id]
        }/${MAX_EMPLOYEES_PER_DAY})`
      );
      continue;
    }

    const weekday = toZonedTime(day.date, TIMEZONE).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
      }
    );

    const preferred = employees.filter((e) =>
      e.preferredDays.some((p) => p === weekday)
    );

    const pool = preferred.length > 0 ? preferred : employees;

    const randomEmployee = pool[Math.floor(Math.random() * pool.length)];

    const existing = await prisma.schedule.findFirst({
      where: {
        workdayId: day.id,
        employeeId: randomEmployee.id,
      },
    });
    if (existing) {
      console.log(
        `Employee ${randomEmployee.id} already assigned to workday ${day.id}`
      );
      continue;
    }

    const schedule = await prisma.schedule.create({
      data: {
        workdayId: day.id,
        employeeId: randomEmployee.id,
        assignedById: userId,
        type: "RANDOM",
      },
    });

    schedules.push(schedule);
    scheduleCountPerWorkday[day.id]++;
    console.log(`Assigned employee ${randomEmployee.id} to workday ${day.id}`);
  }

  console.log(
    `Generated ${schedules.length} new schedules for week starting ${weekStart}`
  );
  return schedules;
};
