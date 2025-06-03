import { Request, Response } from 'express';
import { generateWorkdaysService } from '../services/workday.service';

export const generateWorkdays = async (req: any, res: any) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ message: 'Start and end dates are required' });
  }

  try {
    const result = await generateWorkdaysService(new Date(start as string), new Date(end as string));
    res.json({ message: 'Workdays generated successfully', data: result });
  } catch (err) {
    res.status(500).json({ message: 'Error generating workdays', error: err });
  }
};

export const getWorkdays = async (req: Request, res: Response) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ message: 'From and to dates are required' });
  }

  try {
    const workdays = await generateWorkdaysService(new Date(from as string), new Date(to as string));
    res.json({ message: 'Workdays retrieved successfully', data: workdays });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving workdays', error: err });
  }
}