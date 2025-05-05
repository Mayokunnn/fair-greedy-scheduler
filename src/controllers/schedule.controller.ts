import {
  fairGreedyScheduler,
  basicGreedyScheduler,
  randomScheduler,
  roundRobinScheduler,
} from "../services/scheduler.service";
import prisma from "../utils/prisma";

export const generateFairGreedySchedule = async (req: any, res: any) => {
  try {
    const result = await fairGreedyScheduler(req.user.id);
    res.json({ message: "Schedule generated", result });
  } catch (err) {
    res.status(500).json({ message: "Error generating schedule", error: err });
  }
};

export const generateBasicGreedySchedule = async (req: any, res: any) => {
  try {
    const result = await basicGreedyScheduler(req.user.id);
    res.json({ message: "Basic Greedy Schedule generated", result });
  } catch (err) {
    res.status(500).json({ message: "Error generating schedule", error: err });
  }
}

export const generateRandomSchedule = async (req: any, res: any) => {
  try {
    const result = await randomScheduler(req.user.id);
    res.json({ message: "Random Schedule generated", result });
  } catch (err) {
    res.status(500).json({ message: "Error generating schedule", error: err });
  }
};

export const generateRoundRobinSchedule = async (req: any, res: any) => {
  try {
    const result = await basicGreedyScheduler(req.user.id);
    res.json({ message: "Basic Greedy Schedule generated", result });
  } catch (err) {
    res.status(500).json({ message: "Error generating schedule", error: err });
  }
}

export const evaluateSchedule = async (req: any, res: any) => {
  const [fair, basic, random, round] = await Promise.all([
    fairGreedyScheduler(req.user.id),
    basicGreedyScheduler(req.user.id),
    randomScheduler(req.user.id),
    roundRobinScheduler(req.user.id),
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
