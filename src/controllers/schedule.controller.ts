import { NextFunction, Request, Response } from "express";
import prisma from "../utils/prisma";
import {
  fairGreedyScheduler,
  basicGreedyScheduler,
  roundRobinScheduler,
  randomScheduler,
} from "../services/scheduler.service";
import { generateWorkdaysService } from "../services/workday.service";

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
    const { from, to } = req.body;

    if (!from || !to) {
      return res
        .status(400)
        .json({ message: "Please provide both 'from' and 'to' dates." });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    await generateWorkdaysService(fromDate, toDate);

    const workdays = await prisma.workday.findMany({
      where: {
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
    });
    const result = await fairGreedyScheduler(req.user.id, workdays);

    res.json({ message: "Fair Greedy Schedule generated", result });
  } catch (err) {
    res.status(500).json({ message: "Error generating schedule", error: err });
  }
};

export const generateBasicGreedySchedule = async (req: any, res: any) => {
  try {
    const { from, to } = req.body;
    if (!from || !to) {
      return res
        .status(400)
        .json({ message: "Please provide both 'from' and 'to' dates." });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    await generateWorkdaysService(fromDate, toDate);

    const workdays = await prisma.workday.findMany({
      where: {
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
    });
    const result = await basicGreedyScheduler(req.user.id, workdays);
    res.json({ message: "Basic Greedy Schedule generated", result });
  } catch (err) {
    res.status(500).json({ message: "Error generating schedule", error: err });
  }
};

export const generateRandomSchedule = async (req: any, res: any) => {
  try {
    const { from, to } = req.body;

    if (!from || !to) {
      return res
        .status(400)
        .json({ message: "Please provide both 'from' and 'to' dates." });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    await generateWorkdaysService(fromDate, toDate);

    const workdays = await prisma.workday.findMany({
      where: {
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
    });
    const result = await randomScheduler(req.user.id, workdays);
    res.json({ message: "Random Schedule generated", result });
  } catch (err) {
    res.status(500).json({ message: "Error generating schedule", error: err });
  }
};

export const generateRoundRobinSchedule = async (req: any, res: any) => {
  try {
    const { from, to } = req.body;
    if (!from || !to) {
      return res
        .status(400)
        .json({ message: "Please provide both 'from' and 'to' dates." });
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    await generateWorkdaysService(fromDate, toDate);

    const workdays = await prisma.workday.findMany({
      where: {
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
    });
    const result = await roundRobinScheduler(req.user.id, workdays);
    res.json({ message: "Round Robin Schedule generated", result });
  } catch (err) {
    res.status(500).json({ message: "Error generating schedule", error: err });
  }
};

export const assignSingleSchedule = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { employeeId, date } = req.body;
  const userId = req.user.id;

  try {
    let workday = await prisma.workday.findFirst({
      where: { date: new Date(date) },
    });

    if (!workday) {
      workday = await prisma.workday.create({ data: { date: new Date(date) } });
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
    res.status(500).json({ message: "Error assigning schedule", error: err });
  }
};

export const evaluateSchedule = async (req: any, res: any) => {
  try {
    const { from, to } = req.body;

    if (!from || !to) {
      return res
        .status(400)
        .json({ message: "from and to dates are required" });
    }

    const workdays = await prisma.workday.findMany({
      where: {
        date: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      orderBy: { date: "asc" },
    });

    const [fair, basic, random, round] = await Promise.all([
      fairGreedyScheduler(req.user.id, workdays),
      basicGreedyScheduler(req.user.id, workdays),
      randomScheduler(req.user.id, workdays),
      roundRobinScheduler(req.user.id, workdays),
    ]);

    const getWeekday = (date: Date) => {
      return new Date(date).toLocaleDateString("en-US", { weekday: "long" });
    };

    const fetchPreferredDays = async () => {
      const users = await prisma.user.findMany({
        where: { role: "EMPLOYEE" },
        select: {
          id: true,
          preferredDays: true,
        },
      });

      const map: Record<string, string[]> = {};
      users.forEach((u) => {
        map[u.id] = u.preferredDays || [];
      });

      return map;
    };

    const preferredMap = await fetchPreferredDays();

    const fairnessScore = (schedules: any[]) => {
      const scoreMap: Record<string, number> = {};

      schedules.forEach((s) => {
        const userId = s.employeeId;
        const workday = s.workday || s.workdayId;

        let workdayDate: Date;

        if (typeof workday === "string") {
          // Fetch workday if not included
          // In real app, optimize this with includes
          return; // skip score, not enough info
        } else {
          workdayDate = workday.date;
        }

        const dayName = getWeekday(workdayDate);
        const prefs = preferredMap[userId] || [];

        if (!scoreMap[userId]) scoreMap[userId] = 0;

        if (prefs.includes(dayName)) {
          scoreMap[userId] += 1;
        } else {
          scoreMap[userId] -= 1;
        }

        // Clamp between -3 and +3
        scoreMap[userId] = Math.max(-3, Math.min(3, scoreMap[userId]));
      });

      const values = Object.values(scoreMap);
      const avg =
        values.reduce((acc, val) => acc + val, 0) / (values.length || 1);
      const stdDev = Math.sqrt(
        values.map((s) => (s - avg) ** 2).reduce((a, b) => a + b, 0) /
          (values.length || 1)
      );

      return { stdDev, scores: scoreMap };
    };

    const fairMetric = fairnessScore(fair);
    const basicMetric = fairnessScore(basic);
    const randomMetric = fairnessScore(random);
    const roundMetric = fairnessScore(round);

    res.json({
      fairGreedy: {
        total: fair.length,
        fairnessIndex: fairMetric.stdDev,
        scores: fairMetric.scores,
      },
      basicGreedy: {
        total: basic.length,
        fairnessIndex: basicMetric.stdDev,
        scores: basicMetric.scores,
      },
      random: {
        total: random.length,
        fairnessIndex: randomMetric.stdDev,
        scores: randomMetric.scores,
      },
      roundRobin: {
        total: round.length,
        fairnessIndex: roundMetric.stdDev,
        scores: roundMetric.scores,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error comparing schedules", error: err });
  }
};

export const getAllSchedules = async (req: any, res: any) => {
  try {
    const schedules = await prisma.schedule.findMany({
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
    res.status(500).json({ message: "Error fetching schedules", error: err });
  }
};

export const getMySchedule = async (req: any, res: any) => {
  try {
    const schedules = await prisma.schedule.findMany({
      where: {
        assignedById: req.user.id,
      },
    });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ message: "Error fetching schedule", error: err });
  }
};
