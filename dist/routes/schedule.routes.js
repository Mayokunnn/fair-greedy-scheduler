"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const schedule_controller_1 = require("../controllers/schedule.controller");
const router = express_1.default.Router();
router.get("/", schedule_controller_1.getAllSchedules);
router.post("/fair", schedule_controller_1.generateFairGreedySchedule);
router.post("/basic", schedule_controller_1.generateBasicGreedySchedule);
router.post("/round-robin", schedule_controller_1.generateRoundRobinSchedule);
router.post("/random", schedule_controller_1.generateRandomSchedule);
router.post("/assign", schedule_controller_1.assignSingleSchedule);
router.get("/evaluate", schedule_controller_1.evaluateSchedule);
exports.default = router;
