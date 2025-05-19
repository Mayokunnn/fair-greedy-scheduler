import { NextFunction, Request, Response } from 'express';
import prisma from '../utils/prisma';
import {
  fairGreedyScheduler,
  basicGreedyScheduler,
  roundRobinScheduler,
  randomScheduler
} from '../services/scheduler.service';

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

export const generateFairGreedySchedule = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.body;
    const workdays = await prisma.workday.findMany({
      where: {
        date: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
    });
    const result = await fairGreedyScheduler(req.user.id, workdays);

  } catch (err) {
    res.status(500).json({ message: 'Error generating schedule', error: err });
  }
};

export const generateBasicGreedySchedule = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.body;
    const workdays = await prisma.workday.findMany({
      where: {
        date: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
    });
    const result = await basicGreedyScheduler(req.user.id, workdays);
    res.json({ message: 'Basic Greedy Schedule generated', result });
  } catch (err) {
    res.status(500).json({ message: 'Error generating schedule', error: err });
  }
};

export const generateRandomSchedule = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.body;
    const workdays = await prisma.workday.findMany({
      where: {
        date: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
    });
    const result = await randomScheduler(req.user.id, workdays);
    res.json({ message: 'Random Schedule generated', result });
  } catch (err) {
    res.status(500).json({ message: 'Error generating schedule', error: err });
  }
};

export const generateRoundRobinSchedule = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.body;
    const workdays = await prisma.workday.findMany({
      where: {
        date: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      orderBy: { date: 'asc' }
    });
    const result = await roundRobinScheduler(req.user.id, workdays);
    res.json({ message: 'Round Robin Schedule generated', result });
  } catch (err) {
    res.status(500).json({ message: 'Error generating schedule', error: err });
  }
};

export const assignSingleSchedule = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { employeeId, date } = req.body;
  const userId = req.user.id;

  try {
    let workday = await prisma.workday.findFirst({ where: { date: new Date(date) } });

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
      res.status(400).json({ message: 'Employee is already scheduled for this day' });
      return;
    }

    const schedule = await prisma.schedule.create({
      data: {
        workdayId: workday.id,
        employeeId,
        assignedById: userId,
      },
    });

    res.status(201).json({ message: 'Schedule assigned', schedule });
  } catch (err) {
    res.status(500).json({ message: 'Error assigning schedule', error: err });
  }
};


export const evaluateSchedule = async (req: any, res: any) => {
  try {
    const { from, to } = req.body;

    if (!from || !to) {
      return res.status(400).json({ message: "from and to dates are required" });
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

    const fairnessMetric = (schedules: any[]) => {
      const countMap: Record<string, number> = {};
      schedules.forEach((s) => {
        countMap[s.employeeId] = (countMap[s.employeeId] || 0) + 1;
      });

      const counts = Object.values(countMap);
      const avg = counts.reduce((a, b) => a + b) / counts.length;
      const stdDev = Math.sqrt(
        counts.map((c) => (c - avg) ** 2).reduce((a, b) => a + b) / counts.length
      );
      return stdDev;
    };

    res.json({
      fairGreedy: {
        total: fair.length,
        fairnessIndex: fairnessMetric(fair),
      },
      basicGreedy: {
        total: basic.length,
        fairnessIndex: fairnessMetric(basic),
      },
      random: {
        total: random.length,
        fairnessIndex: fairnessMetric(random),
      },
      roundRobin: {
        total: round.length,
        fairnessIndex: fairnessMetric(round),
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
          select: { id: true, fullName: true, email: true }
        },
        workday: true,
        assignedBy: {
          select: { id: true, fullName: true, email: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
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
