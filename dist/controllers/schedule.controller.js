"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMySchedule = exports.getAllSchedules = exports.assignSingleSchedule = exports.evaluateSchedule = exports.generateRandomSchedule = exports.generateRoundRobinSchedule = exports.generateBasicGreedySchedule = exports.generateFairGreedySchedule = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const scheduler_service_1 = require("../services/scheduler.service");
const workday_service_1 = require("../services/workday.service");
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const client_1 = require("@prisma/client");
const TIMEZONE = "Africa/Lagos";
const MAX_EMPLOYEES_PER_DAY = 12; // Standardized to match fairGreedyScheduler
const MIN_DAYS_PER_EMPLOYEE = 2;
const MAX_DAYS_PER_EMPLOYEE = 3;
const HISTORY_WEEKS = 4; // Look back 4 weeks for fairness scores
const generateFairGreedySchedule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { from, to, weekStart } = req.body;
        if (!from || !to || !weekStart) {
            return res.status(400).json({
                message: "Please provide 'from', 'to', and 'weekStart' dates.",
            });
        }
        const fromDate = (0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(from), TIMEZONE);
        const toDate = (0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(to), TIMEZONE);
        const weekStartDate = (0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(weekStart), TIMEZONE);
        yield (0, workday_service_1.generateWorkdaysService)(fromDate, toDate);
        const workdays = yield prisma_1.default.workday.findMany({
            where: {
                date: {
                    gte: fromDate,
                    lte: toDate,
                },
            },
        });
        console.log(`Generating Fair Greedy Schedule for week starting ${weekStart}`);
        const result = yield (0, scheduler_service_1.fairGreedyScheduler)(req.user.id, workdays, weekStart);
        res.json({ message: "Fair Greedy Schedule generated", result });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error generating schedule", error: err });
    }
});
exports.generateFairGreedySchedule = generateFairGreedySchedule;
const generateBasicGreedySchedule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { from, to, weekStart } = req.body;
        if (!from || !to || !weekStart) {
            return res.status(400).json({
                message: "Please provide 'from', 'to', and 'weekStart' dates.",
            });
        }
        const fromDate = (0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(from), TIMEZONE);
        const toDate = (0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(to), TIMEZONE);
        const weekStartDate = (0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(weekStart), TIMEZONE);
        yield (0, workday_service_1.generateWorkdaysService)(fromDate, toDate);
        const workdays = yield prisma_1.default.workday.findMany({
            where: {
                date: {
                    gte: fromDate,
                    lte: toDate,
                },
            },
        });
        console.log(`Generating Basic Greedy Schedule for week starting ${weekStart}`);
        const result = yield (0, scheduler_service_1.basicGreedyScheduler)(req.user.id, workdays, weekStart);
        res.json({ message: "Basic Greedy Schedule generated", result });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error generating schedule", error: err });
    }
});
exports.generateBasicGreedySchedule = generateBasicGreedySchedule;
const generateRoundRobinSchedule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { from, to, weekStart } = req.body;
        if (!from || !to || !weekStart) {
            return res.status(400).json({
                message: "Please provide 'from', 'to', and 'weekStart' dates.",
            });
        }
        const fromDate = (0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(from), TIMEZONE);
        const toDate = (0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(to), TIMEZONE);
        yield (0, workday_service_1.generateWorkdaysService)(fromDate, toDate);
        const workdays = yield prisma_1.default.workday.findMany({
            where: {
                date: {
                    gte: fromDate,
                    lte: toDate,
                },
            },
        });
        console.log(`Generating Round Robin Schedule for week starting ${weekStart}`);
        const result = yield (0, scheduler_service_1.roundRobinScheduler)(req.user.id, workdays, weekStart);
        res.json({ message: "Round Robin Schedule generated", result });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error generating schedule", error: err });
    }
});
exports.generateRoundRobinSchedule = generateRoundRobinSchedule;
const generateRandomSchedule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { from, to, weekStart } = req.body;
        if (!from || !to || !weekStart) {
            return res.status(400).json({
                message: "Please provide 'from', 'to', and 'weekStart' dates.",
            });
        }
        const fromDate = (0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(from), TIMEZONE);
        const toDate = (0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(to), TIMEZONE);
        yield (0, workday_service_1.generateWorkdaysService)(fromDate, toDate);
        const workdays = yield prisma_1.default.workday.findMany({
            where: {
                date: {
                    gte: fromDate,
                    lte: toDate,
                },
            },
        });
        console.log(`Generating Random Schedule for week starting ${weekStart}`);
        const result = yield (0, scheduler_service_1.randomScheduler)(req.user.id, workdays, weekStart);
        res.json({ message: "Random Schedule generated", result });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error generating schedule", error: err });
    }
});
exports.generateRandomSchedule = generateRandomSchedule;
const evaluateSchedule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { weekStart } = req.query;
        if (!weekStart) {
            return res.status(400).json({ message: "'weekStart' date is required" });
        }
        // Parse weekStart in local timezone and convert to UTC
        const weekStartLocal = (0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(weekStart), TIMEZONE);
        const weekStartDateLocal = (0, date_fns_1.startOfWeek)(weekStartLocal, { weekStartsOn: 1 });
        const weekEndDateLocal = (0, date_fns_1.addDays)(weekStartDateLocal, 4);
        const weekStartUTC = (0, date_fns_tz_1.fromZonedTime)(weekStartDateLocal, TIMEZONE);
        const weekEndUTC = (0, date_fns_tz_1.fromZonedTime)(weekEndDateLocal, TIMEZONE);
        console.log(`Evaluating schedules for week ${weekStartUTC.toISOString()} to ${weekEndUTC.toISOString()}`);
        // Fetch workdays in UTC
        let workdays = yield prisma_1.default.workday.findMany({
            where: { date: { gte: weekStartUTC, lte: weekEndUTC } },
            orderBy: { date: "asc" },
        });
        // Generate workdays if none exist
        if (!workdays.length) {
            console.log(`No workdays found for week starting ${weekStart}. Generating workdays...`);
            const newWorkdays = [];
            for (let i = 0; i < 5; i++) {
                const dateLocal = (0, date_fns_1.addDays)(weekStartDateLocal, i);
                const dateUTC = (0, date_fns_tz_1.fromZonedTime)(dateLocal, TIMEZONE);
                newWorkdays.push({ date: dateUTC });
            }
            yield prisma_1.default.workday.createMany({
                data: newWorkdays,
                skipDuplicates: true,
            });
            workdays = yield prisma_1.default.workday.findMany({
                where: { date: { gte: weekStartUTC, lte: weekEndUTC } },
                orderBy: { date: "asc" },
            });
            console.log(`Generated ${workdays.length} workdays`);
        }
        // Fetch employee preferences
        const employees = yield prisma_1.default.user.findMany({
            where: { role: client_1.Role.EMPLOYEE },
            select: { id: true, preferredDays: true },
        });
        const preferredMap = {};
        const allUserIds = employees.map((emp) => {
            preferredMap[emp.id] = emp.preferredDays || [];
            return emp.id;
        });
        console.log("Preferred days map:", preferredMap);
        // Fetch historical schedules in UTC
        const historyStartUTC = (0, date_fns_tz_1.fromZonedTime)((0, date_fns_1.subWeeks)(weekStartDateLocal, HISTORY_WEEKS), TIMEZONE);
        const historicalSchedules = yield prisma_1.default.schedule.findMany({
            where: {
                workday: {
                    date: {
                        gte: historyStartUTC,
                        lt: weekStartUTC,
                    },
                },
                type: { in: ["FAIR", "BASIC", "ROUND_ROBIN"] },
                employeeId: { in: allUserIds },
            },
            include: { workday: true },
        });
        // Calculate historical fairness scores
        const historicalScoreMap = Object.fromEntries(allUserIds.map((id) => [id, 0]));
        historicalSchedules.forEach((schedule) => {
            const empId = schedule.employeeId;
            const weekday = (0, date_fns_1.format)((0, date_fns_tz_1.toZonedTime)(schedule.workday.date, TIMEZONE), "EEEE").toLowerCase();
            const isPreferred = preferredMap[empId]
                .map((d) => d.toLowerCase())
                .includes(weekday);
            historicalScoreMap[empId] += isPreferred ? -1 : 1;
        });
        console.log("Historical fairness scores:", historicalScoreMap);
        // Fetch existing schedules for the current week in UTC
        const existingSchedules = yield prisma_1.default.schedule.findMany({
            where: {
                workday: { date: { gte: weekStartUTC, lte: weekEndUTC } },
                type: { in: ["FAIR", "BASIC", "ROUND_ROBIN"] },
            },
            include: { workday: true },
        });
        // Categorize existing schedules
        const fairSchedules = existingSchedules.filter((s) => s.type === "FAIR");
        const basicSchedules = existingSchedules.filter((s) => s.type === "BASIC");
        const roundSchedules = existingSchedules.filter((s) => s.type === "ROUND_ROBIN");
        // Generate schedules if none exist
        const generateSchedules = (scheduler, existing, type) => __awaiter(void 0, void 0, void 0, function* () {
            if (existing.length > 0) {
                console.log(`Using ${existing.length} existing ${type} schedules`);
                return existing;
            }
            const result = yield scheduler(req.user.id, workdays, weekStart);
            if (Array.isArray(result) && result[0] === "yooo") {
                console.log(`Week fully assigned for ${type}, fetching existing schedules`);
                return prisma_1.default.schedule.findMany({
                    where: {
                        type: type,
                        workday: { date: { gte: weekStartUTC, lte: weekEndUTC } },
                    },
                    include: { workday: true },
                });
            }
            return prisma_1.default.schedule.findMany({
                where: { id: { in: result.map((s) => s.id) } },
                include: { workday: true },
            });
        });
        const [fair, basic, round] = yield Promise.all([
            generateSchedules(scheduler_service_1.fairGreedyScheduler, fairSchedules, "FAIR"),
            generateSchedules(scheduler_service_1.basicGreedyScheduler, basicSchedules, "BASIC"),
            generateSchedules(scheduler_service_1.roundRobinScheduler, roundSchedules, "ROUND_ROBIN"),
        ]);
        // Fairness score calculation
        const fairnessScore = (schedules, allUserIds, historicalScores) => {
            const scoreMap = Object.assign({}, historicalScores);
            const preferredDaysCount = Object.fromEntries(allUserIds.map((id) => [id, 0]));
            const nonPreferredDaysCount = Object.fromEntries(allUserIds.map((id) => [id, 0]));
            const totalDaysCount = Object.fromEntries(allUserIds.map((id) => [id, 0]));
            schedules.forEach((s) => {
                const empId = s.employeeId;
                if (!allUserIds.includes(empId))
                    return;
                const weekday = (0, date_fns_1.format)((0, date_fns_tz_1.toZonedTime)(s.workday.date, TIMEZONE), "EEEE").toLowerCase();
                const isPreferred = preferredMap[empId]
                    .map((d) => d.toLowerCase())
                    .includes(weekday);
                totalDaysCount[empId]++;
                if (isPreferred) {
                    preferredDaysCount[empId]++;
                    scoreMap[empId]--;
                }
                else {
                    nonPreferredDaysCount[empId]++;
                    scoreMap[empId]++;
                }
            });
            const outOfBounds = allUserIds.filter((id) => scoreMap[id] < -3 || scoreMap[id] > 3);
            const invalidAssignments = allUserIds.filter((id) => {
                const total = totalDaysCount[id] || 0;
                return (total > 0 &&
                    (total < MIN_DAYS_PER_EMPLOYEE || total > MAX_DAYS_PER_EMPLOYEE));
            });
            const values = Object.values(scoreMap).filter((v) => !isNaN(v));
            const avg = values.length > 0
                ? values.reduce((sum, val) => sum + val, 0) / values.length
                : 0;
            const stdDev = values.length > 0
                ? Math.sqrt(values.map((s) => (s - avg) ** 2).reduce((a, b) => a + b, 0) /
                    values.length)
                : 0;
            const totalPenalty = values.reduce((sum, val) => sum + Math.abs(val - avg), 0);
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
        const workdayAssignmentCounts = {};
        workdays.forEach((wd) => {
            workdayAssignmentCounts[wd.id] = 0;
        });
        [...fair, ...basic, ...round].forEach((s) => {
            if (workdayAssignmentCounts[s.workdayId] !== undefined) {
                workdayAssignmentCounts[s.workdayId]++;
            }
        });
        const overAssignedWorkdays = Object.entries(workdayAssignmentCounts).filter(([_, count]) => count > MAX_EMPLOYEES_PER_DAY);
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
            console.warn(`Fair Greedy out-of-bounds scores:`, response.fairGreedy.outOfBounds);
        }
        res.json(response);
    }
    catch (err) {
        console.error("Evaluation error:", err);
        res.status(500).json({ message: "Error comparing schedules", error: err });
    }
});
exports.evaluateSchedule = evaluateSchedule;
const assignSingleSchedule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { employeeId, date } = req.body;
    const userId = req.user.id;
    try {
        const zonedDate = (0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(date), TIMEZONE);
        let workday = yield prisma_1.default.workday.findFirst({
            where: { date: zonedDate },
        });
        if (!workday) {
            workday = yield prisma_1.default.workday.create({ data: { date: zonedDate } });
        }
        const existing = yield prisma_1.default.schedule.findFirst({
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
        const schedule = yield prisma_1.default.schedule.create({
            data: {
                workdayId: workday.id,
                employeeId,
                assignedById: userId,
            },
        });
        res.status(201).json({ message: "Schedule assigned", schedule });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error assigning schedule", error: err });
    }
});
exports.assignSingleSchedule = assignSingleSchedule;
const getAllSchedules = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { weekStart } = req.query;
        const where = {};
        if (weekStart) {
            const weekStartDate = (0, date_fns_1.startOfWeek)((0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(weekStart), TIMEZONE), { weekStartsOn: 1 });
            const weekEndDate = (0, date_fns_1.addDays)(weekStartDate, 4); // Monday to Friday
            where.workday = {
                date: {
                    gte: weekStartDate,
                    lte: weekEndDate,
                },
            };
        }
        const schedules = yield prisma_1.default.schedule.findMany({
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
        console.log(`Fetched ${schedules.length} schedules for week ${weekStart || "all"}`);
        res.json(schedules);
    }
    catch (err) {
        console.error("Error fetching schedules:", err);
        res.status(500).json({ message: "Error fetching schedules", error: err });
    }
});
exports.getAllSchedules = getAllSchedules;
const getMySchedule = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { weekStart } = req.query;
        const where = { assignedById: req.user.id };
        if (weekStart) {
            const weekStartDate = (0, date_fns_1.startOfWeek)((0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(weekStart), TIMEZONE), { weekStartsOn: 1 });
            const weekEndDate = (0, date_fns_1.endOfWeek)((0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(weekStart), TIMEZONE), { weekStartsOn: 1 });
            where.workday = {
                date: {
                    gte: weekStartDate,
                    lte: weekEndDate,
                },
            };
        }
        const schedules = yield prisma_1.default.schedule.findMany({
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching schedule", error: err });
    }
});
exports.getMySchedule = getMySchedule;
