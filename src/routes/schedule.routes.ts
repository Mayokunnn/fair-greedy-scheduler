import express from "express";
import {
  generateFairGreedySchedule,
  generateBasicGreedySchedule,
  generateRoundRobinSchedule,
  generateRandomSchedule,
  evaluateSchedule,
  assignSingleSchedule,
  getAllSchedules,
} from "../controllers/schedule.controller";

const router = express.Router();

router.get("/", getAllSchedules);
router.post("/fair", generateFairGreedySchedule);
router.post("/basic", generateBasicGreedySchedule);
router.post("/round-robin", generateRoundRobinSchedule);
router.post("/random", generateRandomSchedule);
router.post("/assign", assignSingleSchedule);
router.get("/evaluate", evaluateSchedule);

export default router;
