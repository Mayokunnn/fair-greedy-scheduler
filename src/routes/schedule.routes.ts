import express from 'express';
import { generateFairGreedySchedule, compareSchedule, generateBasicGreedySchedule } from '../controllers/schedule.controller';

const router = express.Router();

router.post('/fair', generateFairGreedySchedule);

router.post('/basic', generateBasicGreedySchedule);

router.get('/compare', compareSchedule );
  

export default router;
