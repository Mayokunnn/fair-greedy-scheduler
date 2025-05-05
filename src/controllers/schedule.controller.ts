import { fairGreedyScheduler , basicGreedyScheduler } from '../services/scheduler.service';
import prisma from '../utils/prisma';


export const generateFairGreedySchedule = async (req: any, res: any) => {
  try {
    const result = await fairGreedyScheduler(req.user.id);
    res.json({ message: 'Schedule generated', result });
  } catch (err) {
    res.status(500).json({ message: 'Error generating schedule', error: err });
  }
};


export const generateBasicGreedySchedule = async (req: any, res: any) => {
  try {
    const result = await basicGreedyScheduler(req.user.id);
    res.json({ message: 'Basic Schedule generated', result });
  } catch (err) {
    res.status(500).json({ message: 'Error generating schedule', error: err });
  }
};

export const compareSchedule = async (req: any, res: any) => {
    const fair = await fairGreedyScheduler(req.user.id);
    const base = await basicGreedyScheduler(req.user.id);
  
    const fairnessMetric = (schedules: any[]) => {
      const countMap: Record<string, number> = {};
      schedules.forEach(s => {
        countMap[s.employeeId] = (countMap[s.employeeId] || 0) + 1;
      });
      const counts = Object.values(countMap);
      const avg = counts.reduce((a, b) => a + b) / counts.length;
      const stdDev = Math.sqrt(counts.map(c => (c - avg) ** 2).reduce((a, b) => a + b) / counts.length);
      return stdDev;
    };
  
    res.json({
      fairAlgorithm: {
        total: fair.length,
        fairnessIndex: fairnessMetric(fair)
      },
      baseAlgorithm: {
        total: base.length,
        fairnessIndex: fairnessMetric(base)
      }
    });
  }

  export const getMySchedule = async (req: any, res: any) => {
    try {
      const schedules = await prisma.schedule.findMany({
        where: {
          assignedById: req.user.id,
        },
      });
      res.json(schedules);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching schedule', error: err });
    }
  };
  