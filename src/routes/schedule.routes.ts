import express from 'express';
import { generateFairGreedySchedule, generateBasicGreedySchedule, generateRoundRobinSchedule, generateRandomSchedule, evaluateSchedule } from '../controllers/schedule.controller';

const router = express.Router();

router.post('/fair', generateFairGreedySchedule);

router.post('/basic', generateBasicGreedySchedule);

router.post('/round-robin', generateRoundRobinSchedule);

router.post('/random', generateRandomSchedule);

router.get('/compare', evaluateSchedule);
  

export default router;
