import { NextFunction, Request, Response } from "express";
import prisma from "../utils/prisma";
import {
  fairGreedyScheduler,
  basicGreedyScheduler,
  roundRobinScheduler,
  randomScheduler,
} from "../services/scheduler.service";
import { generateWorkdaysService } from "../services/workday.service";
import {
  parseISO,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  addDays,
  format,
  subWeeks,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Role, ScheduleType } from "@prisma/client";

const TIMEZONE = "Africa/Lagos";
const MAX_EMPLOYEES_PER_DAY = 12; // Standardized to match fairGreedyScheduler
const MIN_DAYS_PER_EMPLOYEE = 2;
const MAX_DAYS_PER_EMPLOYEE = 3;
const HISTORY_WEEKS = 4; // Look back 4 weeks for fairness scores

declare global {
  namespace Express {
    interface User {
      id: string;
    }
    interface Request {
      user: User;
    }
  }
}

export const generateFairGreedySchedule = async (req: any, res: any) => {
  try {
    const { from, to, weekStart } = req.body as {
      from: string;
      to: string;
      weekStart: string;
    };
    if (!from || !to || !weekStart) {
      return res.status(400).json({
        message: "Please provide 'from', 'to', and 'weekStart' dates.",
      });
    }

    const fromDate = toZonedTime(parseISO(from), TIMEZONE);
    const toDate = toZonedTime(parseISO(to), TIMEZONE);
    const weekStartDate = toZonedTime(parseISO(weekStart), TIMEZONE);

    await generateWorkdaysService(fromDate, toDate);

    const workdays = await prisma.workday.findMany({
      where: {
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
    });

    console.log(
      `Generating Fair Greedy Schedule for week starting ${weekStart}`
    );
    const result = await fairGreedyScheduler(req.user.id, workdays, weekStart);

    res.json({ message: "Fair Greedy Schedule generated", result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating schedule", error: err });
  }
};

export const generateBasicGreedySchedule = async (req: any, res: any) => {
  try {
    const { from, to, weekStart } = req.body as {
      from: string;
      to: string;
      weekStart: string;
    };
    if (!from || !to || !weekStart) {
      return res.status(400).json({
        message: "Please provide 'from', 'to', and 'weekStart' dates.",
      });
    }

    const fromDate = toZonedTime(parseISO(from), TIMEZONE);
    const toDate = toZonedTime(parseISO(to), TIMEZONE);
    const weekStartDate = toZonedTime(parseISO(weekStart), TIMEZONE);

    await generateWorkdaysService(fromDate, toDate);

    const workdays = await prisma.workday.findMany({
      where: {
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
    });

    console.log(
      `Generating Basic Greedy Schedule for week starting ${weekStart}`
    );
    const result = await basicGreedyScheduler(req.user.id, workdays, weekStart);

    res.json({ message: "Basic Greedy Schedule generated", result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating schedule", error: err });
  }
};

export const generateRoundRobinSchedule = async (req: any, res: any) => {
  try {
    const { from, to, weekStart } = req.body as {
      from: string;
      to: string;
      weekStart: string;
    };
    if (!from || !to || !weekStart) {
      return res.status(400).json({
        message: "Please provide 'from', 'to', and 'weekStart' dates.",
      });
    }

    const fromDate = toZonedTime(parseISO(from), TIMEZONE);
    const toDate = toZonedTime(parseISO(to), TIMEZONE);

    await generateWorkdaysService(fromDate, toDate);

    const workdays = await prisma.workday.findMany({
      where: {
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
    });

    console.log(
      `Generating Round Robin Schedule for week starting ${weekStart}`
    );
    const result = await roundRobinScheduler(req.user.id, workdays, weekStart);

    res.json({ message: "Round Robin Schedule generated", result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating schedule", error: err });
  }
};

export const generateRandomSchedule = async (req: any, res: any) => {
  try {
    const { from, to, weekStart } = req.body as {
      from: string;
      to: string;
      weekStart: string;
    };
    if (!from || !to || !weekStart) {
      return res.status(400).json({
        message: "Please provide 'from', 'to', and 'weekStart' dates.",
      });
    }

    const fromDate = toZonedTime(parseISO(from), TIMEZONE);
    const toDate = toZonedTime(parseISO(to), TIMEZONE);

    await generateWorkdaysService(fromDate, toDate);

    const workdays = await prisma.workday.findMany({
      where: {
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
    });

    console.log(`Generating Random Schedule for week starting ${weekStart}`);
    const result = await randomScheduler(req.user.id, workdays, weekStart);

    res.json({ message: "Random Schedule generated", result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating schedule", error: err });
  }
};

export const evaluateSchedule = async (req: any, res: any) => {
  try {
    const { weekStart } = req.query as { weekStart: string };

    if (!weekStart) {
      return res.status(400).json({ message: "'weekStart' date is required" });
    }

    const weekStartDate = startOfWeek(
      toZonedTime(parseISO(weekStart), TIMEZONE),
      { weekStartsOn: 1 }
    );
    const weekEndDate = addDays(weekStartDate, 4);

    console.log(
      `Evaluating schedules for week ${weekStartDate.toISOString()} to ${weekEndDate.toISOString()}`
    );

    // Fetch workdays
    let workdays = await prisma.workday.findMany({
      where: { date: { gte: weekStartDate, lte: weekEndDate } },
      orderBy: { date: "asc" },
    });

    // Generate workdays if none exist
    if (!workdays.length) {
      console.log(
        `No workdays found for week starting ${weekStart}. Generating workdays...`
      );
      const newWorkdays = [];
      for (let i = 0; i < 5; i++) {
        newWorkdays.push({ date: addDays(weekStartDate, i) });
      }
      await prisma.workday.createMany({
        data: newWorkdays,
        skipDuplicates: true,
      });
      workdays = await prisma.workday.findMany({
        where: { date: { gte: weekStartDate, lte: weekEndDate } },
        orderBy: { date: "asc" },
      });
      console.log(`Generated ${workdays.length} workdays`);
    }

    // Fetch employee preferences
    const employees = await prisma.user.findMany({
      where: { role: Role.EMPLOYEE },
      select: { id: true, preferredDays: true },
    });

    const preferredMap: Record<string, string[]> = {};
    const allUserIds = employees.map((emp) => {
      preferredMap[emp.id] = emp.preferredDays || [];
      return emp.id;
    });
    console.log("Preferred days map:", preferredMap);

    // Fetch historical schedules for fairness scores
    const historyStartDate = subWeeks(weekStartDate, HISTORY_WEEKS);
    const historicalSchedules = await prisma.schedule.findMany({
      where: {
        workday: {
          date: {
            gte: historyStartDate,
            lt: weekStartDate,
          },
        },
        type: { in: ["FAIR", "BASIC", "ROUND_ROBIN"] },
        employeeId: { in: allUserIds },
      },
      include: { workday: true },
    });

    // Calculate historical fairness scores
    const historicalScoreMap: Record<string, number> = Object.fromEntries(
      allUserIds.map((id) => [id, 0])
    );
    historicalSchedules.forEach((schedule) => {
      const empId = schedule.employeeId;
      const weekday = format(
        toZonedTime(schedule.workday.date, TIMEZONE),
        "EEEE"
      ).toLowerCase();
      const isPreferred = preferredMap[empId]
        .map((d) => d.toLowerCase())
        .includes(weekday);
      historicalScoreMap[empId] += isPreferred ? -1 : 1;
    });
    console.log("Historical fairness scores:", historicalScoreMap);

    // Fetch existing schedules for the current week
    const existingSchedules = await prisma.schedule.findMany({
      where: {
        workday: { date: { gte: weekStartDate, lte: weekEndDate } },
        type: { in: ["FAIR", "BASIC", "ROUND_ROBIN"] },
      },
      include: { workday: true },
    });

    // Categorize existing schedules
    const fairSchedules = existingSchedules.filter((s) => s.type === "FAIR");
    const basicSchedules = existingSchedules.filter((s) => s.type === "BASIC");
    const roundSchedules = existingSchedules.filter(
      (s) => s.type === "ROUND_ROBIN"
    );

    // Generate schedules if none exist
    const generateSchedules = async (
      scheduler: any,
      existing: any[],
      type: string
    ) => {
      if (existing.length > 0) {
        console.log(`Using ${existing.length} existing ${type} schedules`);
        return existing;
      }
      const result = await scheduler(req.user.id, workdays, weekStart);
      if (Array.isArray(result) && result[0] === "yooo") {
        console.log(
          `Week fully assigned for ${type}, fetching existing schedules`
        );
        return prisma.schedule.findMany({
          where: {
            type: type as ScheduleType,
            workday: { date: { gte: weekStartDate, lte: weekEndDate } },
          },
          include: { workday: true },
        });
      }
      return prisma.schedule.findMany({
        where: { id: { in: result.map((s: any) => s.id) } },
        include: { workday: true },
      });
    };

    const [fair, basic, round] = await Promise.all([
      generateSchedules(fairGreedyScheduler, fairSchedules, "FAIR"),
      generateSchedules(basicGreedyScheduler, basicSchedules, "BASIC"),
      generateSchedules(roundRobinScheduler, roundSchedules, "ROUND_ROBIN"),
    ]);

    // Fairness score calculation (aligned with project overview)
    const fairnessScore = (
      schedules: any[],
      allUserIds: string[],
      historicalScores: Record<string, number>
    ) => {
      const scoreMap: Record<string, number> = { ...historicalScores };
      const preferredDaysCount: Record<string, number> = Object.fromEntries(
        allUserIds.map((id) => [id, 0])
      );
      const nonPreferredDaysCount: Record<string, number> = Object.fromEntries(
        allUserIds.map((id) => [id, 0])
      );
      const totalDaysCount: Record<string, number> = Object.fromEntries(
        allUserIds.map((id) => [id, 0])
      );

      // Count days in current week
      schedules.forEach((s) => {
        const empId = s.employeeId;
        if (!allUserIds.includes(empId)) return;
        const weekday = format(
          toZonedTime(s.workday.date, TIMEZONE),
          "EEEE"
        ).toLowerCase();
        const isPreferred = preferredMap[empId]
          .map((d) => d.toLowerCase())
          .includes(weekday);

        totalDaysCount[empId]++;
        if (isPreferred) {
          preferredDaysCount[empId]++;
          scoreMap[empId]--; // -1 per preferred day
        } else {
          nonPreferredDaysCount[empId]++;
          scoreMap[empId]++; // +1 per non-preferred day
        }
      });

      // Validate scores within -3 to +3
      const outOfBounds = allUserIds.filter(
        (id) => scoreMap[id] < -3 || scoreMap[id] > 3
      );

      // Validate 2-or-3-days rule
      const invalidAssignments = allUserIds.filter((id) => {
        const total = totalDaysCount[id] || 0;
        return (
          total > 0 &&
          (total < MIN_DAYS_PER_EMPLOYEE || total > MAX_DAYS_PER_EMPLOYEE)
        );
      });

      // Calculate fairness metrics
      const values = Object.values(scoreMap).filter((v) => !isNaN(v));
      const avg =
        values.length > 0
          ? values.reduce((sum, val) => sum + val, 0) / values.length
          : 0;
      const stdDev =
        values.length > 0
          ? Math.sqrt(
              values.map((s) => (s - avg) ** 2).reduce((a, b) => a + b, 0) /
                values.length
            )
          : 0;
      const totalPenalty = values.reduce(
        (sum, val) => sum + Math.abs(val - avg),
        0
      );

      console.log(`Scores for ${schedules.length} schedules:`, {
        fairnessScores: scoreMap,
        preferredDays: preferredDaysCount,
        nonPreferredDays: nonPreferredDaysCount,
        totalDays: totalDaysCount,
        avgFairness: avg,
        fairnessIndex: stdDev,
        totalPenalty,
        outOfBounds,
        invalidAssignments,
      });

      return {
        stdDev,
        avg,
        scores: scoreMap,
        totalPenalty,
        preferredDaysCount,
        nonPreferredDaysCount,
        totalDaysCount,
        outOfBounds,
        invalidAssignments,
      };
    };

    // Calculate fairness metrics
    const fairMetric = fairnessScore(fair, allUserIds, historicalScoreMap);
    const basicMetric = fairnessScore(basic, allUserIds, historicalScoreMap);
    const roundMetric = fairnessScore(round, allUserIds, historicalScoreMap);

    // Validate workday assignments
    const workdayAssignmentCounts: Record<string, number> = {};
    workdays.forEach((wd) => {
      workdayAssignmentCounts[wd.id] = 0;
    });
    [...fair, ...basic, ...round].forEach((s) => {
      if (workdayAssignmentCounts[s.workdayId] !== undefined) {
        workdayAssignmentCounts[s.workdayId]++;
      }
    });

    const overAssignedWorkdays = Object.entries(workdayAssignmentCounts).filter(
      ([_, count]) => count > MAX_EMPLOYEES_PER_DAY
    );

    // Generate response
    const response = {
      fairGreedy: {
        total: fair.length,
        fairnessIndex: fairMetric.stdDev,
        averageScore: fairMetric.avg,
        scores: fairMetric.scores,
        totalPenalty: fairMetric.totalPenalty,
        preferredDaysCount: fairMetric.preferredDaysCount,
        nonPreferredDaysCount: fairMetric.nonPreferredDaysCount,
        totalDaysCount: fairMetric.totalDaysCount,
        outOfBounds: fairMetric.outOfBounds,
        invalidAssignments: fairMetric.invalidAssignments,
      },
      basicGreedy: {
        total: basic.length,
        fairnessIndex: basicMetric.stdDev,
        averageScore: basicMetric.avg,
        scores: basicMetric.scores,
        totalPenalty: basicMetric.totalPenalty,
        preferredDaysCount: basicMetric.preferredDaysCount,
        nonPreferredDaysCount: basicMetric.nonPreferredDaysCount,
        totalDaysCount: basicMetric.totalDaysCount,
        outOfBounds: basicMetric.outOfBounds,
        invalidAssignments: basicMetric.invalidAssignments,
      },
      roundRobin: {
        total: round.length,
        fairnessIndex: roundMetric.stdDev,
        averageScore: roundMetric.avg,
        scores: roundMetric.scores,
        totalPenalty: roundMetric.totalPenalty,
        preferredDaysCount: roundMetric.preferredDaysCount,
        nonPreferredDaysCount: roundMetric.nonPreferredDaysCount,
        totalDaysCount: roundMetric.totalDaysCount,
        outOfBounds: roundMetric.outOfBounds,
        invalidAssignments: roundMetric.invalidAssignments,
      },
      validation: {
        overAssignedWorkdays,
        totalAvailableSlots: workdays.length * MAX_EMPLOYEES_PER_DAY,
        totalRequiredSlots: allUserIds.length * MIN_DAYS_PER_EMPLOYEE,
      },
    };

    // Log validation warnings
    if (overAssignedWorkdays.length > 0) {
      console.warn(`Over-assigned workdays:`, overAssignedWorkdays);
    }
    if (response.fairGreedy.outOfBounds.length > 0) {
      console.warn(
        `Fair Greedy out-of-bounds scores:`,
        response.fairGreedy.outOfBounds
      );
    }

    res.json(response);
  } catch (err) {
    console.error("Evaluation error:", err);
    res.status(500).json({ message: "Error comparing schedules", error: err });
  }
};

export const assignSingleSchedule = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { employeeId, date } = req.body;
  const userId = req.user.id;

  try {
    const zonedDate = toZonedTime(parseISO(date), TIMEZONE);

    let workday = await prisma.workday.findFirst({
      where: { date: zonedDate },
    });

    if (!workday) {
      workday = await prisma.workday.create({ data: { date: zonedDate } });
    }

    const existing = await prisma.schedule.findFirst({
      where: {
        workdayId: workday.id,
        employeeId,
      },
    });

    if (existing) {
      res
        .status(400)
        .json({ message: "Employee is already scheduled for this day" });
      return;
    }

    const schedule = await prisma.schedule.create({
      data: {
        workdayId: workday.id,
        employeeId,
        assignedById: userId,
      },
    });

    res.status(201).json({ message: "Schedule assigned", schedule });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error assigning schedule", error: err });
  }
};

export const getAllSchedules = async (req: any, res: any) => {
  try {
    const { weekStart } = req.query as { weekStart?: string };

    const where: any = {};
    if (weekStart) {
      const weekStartDate = startOfWeek(
        toZonedTime(parseISO(weekStart), TIMEZONE),
        { weekStartsOn: 1 }
      );
      const weekEndDate = addDays(weekStartDate, 4); // Monday to Friday
      where.workday = {
        date: {
          gte: weekStartDate,
          lte: weekEndDate,
        },
      };
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            email: true,
            preferredDays: true,
          },
        },
        workday: true,
        assignedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(
      `Fetched ${schedules.length} schedules for week ${weekStart || "all"}`
    );
    res.json(schedules);
  } catch (err) {
    console.error("Error fetching schedules:", err);
    res.status(500).json({ message: "Error fetching schedules", error: err });
  }
};

export const getMySchedule = async (req: any, res: any) => {
  try {
    const { weekStart } = req.query as { weekStart?: string };

    const where: any = { assignedById: req.user.id };
    if (weekStart) {
      const weekStartDate = startOfWeek(
        toZonedTime(parseISO(weekStart), TIMEZONE),
        { weekStartsOn: 1 }
      );
      const weekEndDate = endOfWeek(
        toZonedTime(parseISO(weekStart), TIMEZONE),
        { weekStartsOn: 1 }
      );
      where.workday = {
        date: {
          gte: weekStartDate,
          lte: weekEndDate,
        },
      };
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        employee: {
          select: { id: true, fullName: true, email: true },
        },
        workday: true,
        assignedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(schedules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching schedule", error: err });
  }
};
