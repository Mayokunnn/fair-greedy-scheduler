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
exports.randomScheduler = exports.roundRobinScheduler = exports.basicGreedyScheduler = exports.fairGreedyScheduler = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../utils/prisma"));
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const TIMEZONE = "Africa/Lagos";
const MAX_EMPLOYEES_PER_DAY = 12;
const MAX_DAYS_PER_EMPLOYEE = 3;
const MIN_DAYS_PER_EMPLOYEE = 3;
const FAIRNESS_SCORE_MIN = -3;
const FAIRNESS_SCORE_MAX = 3;
const HISTORY_WEEKS = 4;
const fairGreedyScheduler = (currentUserId, workdays, weekStart) => __awaiter(void 0, void 0, void 0, function* () {
    // Initialize week boundaries (Monday to Friday)
    const weekStartDate = (0, date_fns_1.startOfWeek)((0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(weekStart), TIMEZONE), { weekStartsOn: 1 });
    const weekEndDate = (0, date_fns_1.addDays)(weekStartDate, 4);
    console.log(`Processing week ${weekStartDate.toISOString()} to ${weekEndDate.toISOString()}`);
    // Calculate ISO week number for rotation
    const weekNumber = (0, date_fns_1.getWeek)(weekStartDate, { weekStartsOn: 1, firstWeekContainsDate: 4 });
    console.log(`Week number: ${weekNumber}`);
    // Filter workdays for Monday–Friday
    const weekWorkdays = workdays.filter((wd) => {
        const wdDate = (0, date_fns_tz_1.toZonedTime)(wd.date, TIMEZONE);
        const weekday = (0, date_fns_1.format)(wdDate, "EEEE");
        return ((0, date_fns_1.isWithinInterval)(wdDate, { start: weekStartDate, end: weekEndDate }) &&
            ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].includes(weekday));
    });
    console.log(`Found ${weekWorkdays.length} workdays:`, weekWorkdays.map((wd) => ({ id: wd.id, date: wd.date.toISOString(), weekday: (0, date_fns_1.format)(wd.date, "EEEE") })));
    // Validate sufficient workdays
    if (weekWorkdays.length < 5) {
        console.error(`Insufficient workdays (${weekWorkdays.length}) for ${weekStart}. Need 5.`);
        return [];
    }
    // Check available slots vs. required slots
    const totalAvailableSlots = weekWorkdays.length * MAX_EMPLOYEES_PER_DAY;
    // Fetch employees with consistent ordering
    const employees = yield prisma_1.default.user.findMany({
        where: { role: client_1.Role.EMPLOYEE },
        select: {
            id: true,
            fullName: true,
            preferredDays: true,
        },
        orderBy: { id: "asc" }, // Consistent base order
    });
    if (employees.length === 0) {
        console.error(`No employees available for scheduling in week ${weekStart}`);
        return [];
    }
    const totalRequiredSlots = employees.length * MIN_DAYS_PER_EMPLOYEE;
    if (totalRequiredSlots > totalAvailableSlots) {
        console.warn(`Insufficient slots: ${totalRequiredSlots} required, ${totalAvailableSlots} available`);
    }
    // Fetch historical schedules (last 4 weeks)
    const historyStartDate = (0, date_fns_1.subWeeks)(weekStartDate, HISTORY_WEEKS);
    const historicalSchedules = yield prisma_1.default.schedule.findMany({
        where: {
            workday: {
                date: {
                    gte: historyStartDate,
                    lt: weekStartDate, // Exclude current week
                },
            },
            type: "FAIR",
            employeeId: { in: employees.map((e) => e.id) },
        },
        include: { workday: true },
    });
    // Fetch current week's existing schedules
    const existingSchedules = yield prisma_1.default.schedule.findMany({
        where: {
            workday: {
                date: {
                    gte: weekStartDate,
                    lte: weekEndDate,
                },
            },
            type: "FAIR",
        },
        include: { workday: true },
    });
    // Track assignments
    const scheduleCountPerWorkday = {};
    const assignedWorkdayIdsPerEmployee = {};
    weekWorkdays.forEach((wd) => {
        scheduleCountPerWorkday[wd.id] = 0;
    });
    existingSchedules.forEach((schedule) => {
        if (weekWorkdays.some((wd) => wd.id === schedule.workdayId)) {
            scheduleCountPerWorkday[schedule.workdayId]++;
            if (!assignedWorkdayIdsPerEmployee[schedule.employeeId]) {
                assignedWorkdayIdsPerEmployee[schedule.employeeId] = new Set();
            }
            assignedWorkdayIdsPerEmployee[schedule.employeeId].add(schedule.workdayId);
        }
    });
    // Check if week is fully assigned
    const isWeekFullyAssigned = weekWorkdays.every((wd) => scheduleCountPerWorkday[wd.id] >= MAX_EMPLOYEES_PER_DAY);
    if (isWeekFullyAssigned) {
        console.log(`Week ${weekStart} fully assigned.`);
        return ["yooo"];
    }
    // Check if all employees are at max days
    const allEmployeesAtMax = employees.every((emp) => { var _a; return (((_a = assignedWorkdayIdsPerEmployee[emp.id]) === null || _a === void 0 ? void 0 : _a.size) || 0) >= MAX_DAYS_PER_EMPLOYEE; });
    if (allEmployeesAtMax) {
        console.log(`All employees at ${MAX_DAYS_PER_EMPLOYEE} assignments.`);
        return ["yooo"];
    }
    // Calculate historical fairness scores
    const scoreMap = {};
    const recentDaysPerEmployee = {};
    for (const emp of employees) {
        scoreMap[emp.id] = 0;
        recentDaysPerEmployee[emp.id] = new Set();
        if (!assignedWorkdayIdsPerEmployee[emp.id]) {
            assignedWorkdayIdsPerEmployee[emp.id] = new Set();
        }
    }
    // Process historical and current schedules
    const allSchedules = [...historicalSchedules, ...existingSchedules];
    for (const schedule of allSchedules) {
        const empId = schedule.employeeId;
        if (!employees.some((e) => e.id === empId))
            continue;
        const workday = weekWorkdays.find((wd) => wd.id === schedule.workdayId) || schedule.workday;
        const weekday = (0, date_fns_1.format)((0, date_fns_tz_1.toZonedTime)(workday.date, TIMEZONE), "EEEE").toLowerCase();
        const isPreferred = employees
            .find((e) => e.id === empId)
            .preferredDays.map((d) => d.toLowerCase())
            .includes(weekday);
        if (isPreferred) {
            scoreMap[empId]--; // -1 for preferred day
        }
        else {
            scoreMap[empId]++; // +1 for non-preferred day
        }
        // Track recent days for repetition penalty
        recentDaysPerEmployee[empId].add(weekday);
    }
    console.log("Initial fairness scores:", scoreMap);
    // Calculate rotation index
    const rotationIndex = (weekNumber - 1) % employees.length;
    console.log(`Rotation index: ${rotationIndex}`);
    // Rotate employee list
    const rotatedEmployees = [...employees].slice(rotationIndex).concat([...employees].slice(0, rotationIndex));
    const rotationOrderMap = {};
    rotatedEmployees.forEach((emp, index) => {
        rotationOrderMap[emp.id] = index;
    });
    // Helper function to find the best available day
    const getBestAvailableDay = (employee, availableWorkdays, assignedCountPerDay, assignedWorkdayIdsPerEmployee, scoreMap, recentDays) => {
        var _a;
        const available = availableWorkdays.filter((wd) => assignedCountPerDay[wd.id] < MAX_EMPLOYEES_PER_DAY &&
            !assignedWorkdayIdsPerEmployee[employee.id].has(wd.id));
        if (available.length === 0)
            return null;
        const preferredDaysLower = employee.preferredDays.map((d) => d.toLowerCase());
        const scoredDays = available.map((wd) => {
            const weekday = (0, date_fns_1.format)((0, date_fns_tz_1.toZonedTime)(wd.date, TIMEZONE), "EEEE").toLowerCase();
            const isPreferred = preferredDaysLower.includes(weekday);
            let scoreAdjustment = 0;
            // Adjust score based on fairness
            const currentScore = scoreMap[employee.id];
            if (isPreferred) {
                scoreAdjustment = currentScore > 0 ? -1 : 0; // Prefer preferred days if score is high
            }
            else {
                scoreAdjustment = currentScore < 0 ? 1 : 0; // Prefer non-preferred days if score is low
            }
            // Penalty for recently assigned days
            const repetitionPenalty = recentDays.has(weekday) ? -0.5 : 0;
            return {
                workday: wd,
                score: scoreAdjustment + repetitionPenalty - assignedCountPerDay[wd.id] / MAX_EMPLOYEES_PER_DAY, // Normalize load
            };
        });
        // Sort by score (descending) to get the best day
        scoredDays.sort((a, b) => b.score - a.score);
        return ((_a = scoredDays[0]) === null || _a === void 0 ? void 0 : _a.workday) || null;
    };
    // Interleaved assignment loop
    const assignments = [];
    const assignedCountPerDay = Object.assign({}, scheduleCountPerWorkday);
    while (true) {
        // Filter employees who still need assignments
        const employeesNeedingAssignments = employees.filter((emp) => assignedWorkdayIdsPerEmployee[emp.id].size < MAX_DAYS_PER_EMPLOYEE);
        if (employeesNeedingAssignments.length === 0)
            break;
        // Sort by assigned days (ascending), fairness score (ascending), and rotation order
        employeesNeedingAssignments.sort((a, b) => {
            const aAssigned = assignedWorkdayIdsPerEmployee[a.id].size;
            const bAssigned = assignedWorkdayIdsPerEmployee[b.id].size;
            if (aAssigned !== bAssigned) {
                return aAssigned - bAssigned; // Fewer assigned days first
            }
            const scoreDiff = scoreMap[a.id] - scoreMap[b.id];
            if (scoreDiff !== 0) {
                return scoreDiff; // Lower fairness score first
            }
            return rotationOrderMap[a.id] - rotationOrderMap[b.id]; // Break ties with rotation
        });
        let assignedThisRound = 0;
        for (const emp of employeesNeedingAssignments) {
            const currentScore = scoreMap[emp.id];
            if (currentScore <= FAIRNESS_SCORE_MIN || currentScore >= FAIRNESS_SCORE_MAX) {
                // Skip if score is out of bounds, unless necessary
                if (assignedWorkdayIdsPerEmployee[emp.id].size >= MIN_DAYS_PER_EMPLOYEE)
                    continue;
            }
            const bestDay = getBestAvailableDay(emp, weekWorkdays, assignedCountPerDay, assignedWorkdayIdsPerEmployee, scoreMap, recentDaysPerEmployee[emp.id]);
            if (bestDay) {
                const schedule = yield prisma_1.default.schedule.create({
                    data: {
                        employeeId: emp.id,
                        workdayId: bestDay.id,
                        assignedById: currentUserId,
                        type: "FAIR",
                    },
                });
                assignedWorkdayIdsPerEmployee[emp.id].add(bestDay.id);
                assignedCountPerDay[bestDay.id]++;
                assignments.push(schedule);
                assignedThisRound++;
                // Update fairness score
                const weekday = (0, date_fns_1.format)((0, date_fns_tz_1.toZonedTime)(bestDay.date, TIMEZONE), "EEEE").toLowerCase();
                if (emp.preferredDays.map((d) => d.toLowerCase()).includes(weekday)) {
                    scoreMap[emp.id]--; // Preferred day penalty
                }
                else {
                    scoreMap[emp.id]++; // Non-preferred day bonus
                }
                console.log(`Assigned ${emp.fullName} to ${(0, date_fns_1.format)(bestDay.date, "yyyy-MM-dd")} (Score: ${scoreMap[emp.id]})`);
            }
        }
        if (assignedThisRound === 0)
            break; // No more assignments possible
    }
    // Validate 2-or-3-days rule
    const underAssignedEmployees = employees.filter((emp) => { var _a; return (((_a = assignedWorkdayIdsPerEmployee[emp.id]) === null || _a === void 0 ? void 0 : _a.size) || 0) < MIN_DAYS_PER_EMPLOYEE; });
    if (underAssignedEmployees.length > 0) {
        console.warn(`Warning: ${underAssignedEmployees.length} employees assigned fewer than ${MIN_DAYS_PER_EMPLOYEE} days`, underAssignedEmployees.map((emp) => {
            var _a;
            return ({
                name: emp.fullName,
                assignedDays: ((_a = assignedWorkdayIdsPerEmployee[emp.id]) === null || _a === void 0 ? void 0 : _a.size) || 0,
            });
        }));
    }
    console.log(`Generated ${assignments.length} schedules`);
    console.log("Final fairness scores:", scoreMap);
    console.log("Schedules per day:", assignedCountPerDay);
    console.log("Employee assignments:", Object.entries(assignedWorkdayIdsPerEmployee).map(([id, set]) => ({
        id,
        days: set.size,
        workdays: Array.from(set).map((wid) => {
            const wd = weekWorkdays.find((w) => w.id === wid);
            return wd ? (0, date_fns_1.format)(wd.date, "yyyy-MM-dd") : "unknown";
        }),
    })));
    if (assignments.length === 0) {
        console.log(`No new assignments for ${weekStart}.`);
        return ["yooo"];
    }
    return assignments;
});
exports.fairGreedyScheduler = fairGreedyScheduler;
const basicGreedyScheduler = (currentUserId, workdays, weekStart) => __awaiter(void 0, void 0, void 0, function* () {
    // Parse weekStart in the correct time zone
    const weekStartDate = (0, date_fns_1.startOfWeek)((0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(weekStart), TIMEZONE), { weekStartsOn: 1 });
    const weekEndDate = (0, date_fns_1.endOfWeek)((0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(weekStart), TIMEZONE), {
        weekStartsOn: 1,
    });
    // Filter workdays for the specified week
    const weekWorkdays = workdays.filter((wd) => (0, date_fns_1.isWithinInterval)((0, date_fns_tz_1.toZonedTime)(wd.date, TIMEZONE), {
        start: weekStartDate,
        end: weekEndDate,
    }));
    // Log workdays found
    console.log(`Found ${weekWorkdays.length} workdays for week starting ${weekStart}:`, weekWorkdays.map((wd) => ({ id: wd.id, date: wd.date.toISOString() })));
    if (weekWorkdays.length === 0) {
        console.log(`No workdays found for week starting ${weekStart}`);
        return [];
    }
    // Check existing schedules for the week
    const existingSchedules = yield prisma_1.default.schedule.findMany({
        where: {
            workday: {
                date: { gte: weekStartDate, lte: weekEndDate },
            },
        },
        select: {
            workdayId: true,
        },
    });
    // Count schedules per workday
    const scheduleCountPerWorkday = {};
    weekWorkdays.forEach((wd) => {
        scheduleCountPerWorkday[wd.id] = 0;
    });
    existingSchedules.forEach((schedule) => {
        if (scheduleCountPerWorkday[schedule.workdayId] !== undefined) {
            scheduleCountPerWorkday[schedule.workdayId]++;
        }
    });
    console.log(`Workday assignment counts for week starting ${weekStart}:`, scheduleCountPerWorkday);
    const MAX_EMPLOYEES_PER_DAY = 15;
    const allWorkdaysFullyAssigned = weekWorkdays.every((wd) => scheduleCountPerWorkday[wd.id] >= MAX_EMPLOYEES_PER_DAY);
    if (allWorkdaysFullyAssigned) {
        console.log(`All workdays in week starting ${weekStart} are fully assigned with ${MAX_EMPLOYEES_PER_DAY} employees`);
        return ["yooo"];
    }
    // Fetch employees
    const employees = yield prisma_1.default.user.findMany({
        where: { role: client_1.Role.EMPLOYEE },
        select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            position: true,
            preferredDays: true,
        },
    });
    console.log(`Found ${employees.length} employees:`, employees.map((emp) => ({
        id: emp.id,
        name: emp.fullName,
        preferredDays: emp.preferredDays,
    })));
    const assignments = [];
    let i = 0;
    for (const day of weekWorkdays) {
        if (scheduleCountPerWorkday[day.id] >= MAX_EMPLOYEES_PER_DAY) {
            console.log(`Workday ${day.id} at capacity (${scheduleCountPerWorkday[day.id]}/${MAX_EMPLOYEES_PER_DAY})`);
            continue;
        }
        const weekday = (0, date_fns_tz_1.toZonedTime)(day.date, TIMEZONE).toLocaleDateString("en-US", {
            weekday: "long",
        });
        // Try to find the first employee whose preferred days include this weekday
        const employee = employees.find((emp) => emp.preferredDays.some((pd) => pd === weekday)) ||
            employees[i % employees.length]; // fallback
        const existing = yield prisma_1.default.schedule.findFirst({
            where: {
                workdayId: day.id,
                employeeId: employee.id,
            },
        });
        if (existing) {
            console.log(`Employee ${employee.id} already assigned to workday ${day.id}`);
            continue;
        }
        const schedule = yield prisma_1.default.schedule.create({
            data: {
                employeeId: employee.id,
                workdayId: day.id,
                assignedById: currentUserId,
                type: "BASIC",
            },
        });
        assignments.push(schedule);
        scheduleCountPerWorkday[day.id]++;
        i++;
        console.log(`Assigned employee ${employee.id} to workday ${day.id}`);
    }
    console.log(`Generated ${assignments.length} new schedules for week starting ${weekStart}`);
    return assignments;
});
exports.basicGreedyScheduler = basicGreedyScheduler;
const roundRobinScheduler = (userId, workdays, weekStart) => __awaiter(void 0, void 0, void 0, function* () {
    // Parse weekStart in the correct time zone
    const weekStartDate = (0, date_fns_1.startOfWeek)((0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(weekStart), TIMEZONE), { weekStartsOn: 1 });
    const weekEndDate = (0, date_fns_1.endOfWeek)((0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(weekStart), TIMEZONE), {
        weekStartsOn: 1,
    });
    // Filter workdays for the specified week
    const weekWorkdays = workdays.filter((wd) => (0, date_fns_1.isWithinInterval)((0, date_fns_tz_1.toZonedTime)(wd.date, TIMEZONE), {
        start: weekStartDate,
        end: weekEndDate,
    }));
    // Log workdays found
    console.log(`Found ${weekWorkdays.length} workdays for week starting ${weekStart}:`, weekWorkdays.map((wd) => ({ id: wd.id, date: wd.date.toISOString() })));
    if (weekWorkdays.length === 0) {
        console.log(`No workdays found for week starting ${weekStart}`);
        return [];
    }
    // Check existing schedules for the week
    const existingSchedules = yield prisma_1.default.schedule.findMany({
        where: {
            workday: {
                date: { gte: weekStartDate, lte: weekEndDate },
            },
        },
        select: {
            workdayId: true,
            employeeId: true,
        },
    });
    // Count schedules per workday and employee load
    const scheduleCountPerWorkday = {};
    const employeeLoad = {};
    weekWorkdays.forEach((wd) => {
        scheduleCountPerWorkday[wd.id] = 0;
    });
    existingSchedules.forEach((schedule) => {
        if (scheduleCountPerWorkday[schedule.workdayId] !== undefined) {
            scheduleCountPerWorkday[schedule.workdayId]++;
        }
        employeeLoad[schedule.employeeId] =
            (employeeLoad[schedule.employeeId] || 0) + 1;
    });
    console.log(`Workday assignment counts for week starting ${weekStart}:`, scheduleCountPerWorkday);
    const MAX_EMPLOYEES_PER_DAY = 15;
    const allWorkdaysFullyAssigned = weekWorkdays.every((wd) => scheduleCountPerWorkday[wd.id] >= MAX_EMPLOYEES_PER_DAY);
    if (allWorkdaysFullyAssigned) {
        console.log(`All workdays in week starting ${weekStart} are fully assigned with ${MAX_EMPLOYEES_PER_DAY} employees`);
        return ["yooo"];
    }
    // Fetch employees
    const employees = yield prisma_1.default.user.findMany({
        where: { role: "EMPLOYEE" },
        select: {
            id: true,
            preferredDays: true,
        },
    });
    console.log(`Found ${employees.length} employees:`, employees.map((emp) => ({ id: emp.id, preferredDays: emp.preferredDays })));
    // Initialize employee load if not already set
    employees.forEach((e) => {
        if (!employeeLoad[e.id]) {
            employeeLoad[e.id] = 0;
        }
    });
    const schedules = [];
    for (const day of weekWorkdays) {
        if (scheduleCountPerWorkday[day.id] >= MAX_EMPLOYEES_PER_DAY) {
            console.log(`Workday ${day.id} at capacity (${scheduleCountPerWorkday[day.id]}/${MAX_EMPLOYEES_PER_DAY})`);
            continue;
        }
        const weekday = (0, date_fns_tz_1.toZonedTime)(day.date, TIMEZONE).toLocaleDateString("en-US", {
            weekday: "long",
        });
        // Filter employees who prefer this day
        const preferredEmployees = employees.filter((emp) => emp.preferredDays.some((p) => p === weekday));
        const pool = preferredEmployees.length ? preferredEmployees : employees;
        const sorted = [...pool].sort((a, b) => employeeLoad[a.id] - employeeLoad[b.id]);
        const employee = sorted[0];
        const existing = yield prisma_1.default.schedule.findFirst({
            where: {
                workdayId: day.id,
                employeeId: employee.id,
            },
        });
        if (existing) {
            console.log(`Employee ${employee.id} already assigned to workday ${day.id}`);
            continue;
        }
        const schedule = yield prisma_1.default.schedule.create({
            data: {
                workdayId: day.id,
                employeeId: employee.id,
                assignedById: userId,
                type: "ROUND_ROBIN",
            },
        });
        schedules.push(schedule);
        employeeLoad[employee.id]++;
        scheduleCountPerWorkday[day.id]++;
        console.log(`Assigned employee ${employee.id} to workday ${day.id}`);
    }
    console.log(`Generated ${schedules.length} new schedules for week starting ${weekStart}`);
    return schedules;
});
exports.roundRobinScheduler = roundRobinScheduler;
const randomScheduler = (userId, workdays, weekStart) => __awaiter(void 0, void 0, void 0, function* () {
    // Parse weekStart in the correct time zone
    const weekStartDate = (0, date_fns_1.startOfWeek)((0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(weekStart), TIMEZONE), { weekStartsOn: 1 });
    const weekEndDate = (0, date_fns_1.endOfWeek)((0, date_fns_tz_1.toZonedTime)((0, date_fns_1.parseISO)(weekStart), TIMEZONE), {
        weekStartsOn: 1,
    });
    // Filter workdays for the specified week
    const weekWorkdays = workdays.filter((wd) => (0, date_fns_1.isWithinInterval)((0, date_fns_tz_1.toZonedTime)(wd.date, TIMEZONE), {
        start: weekStartDate,
        end: weekEndDate,
    }));
    // Log workdays found
    console.log(`Found ${weekWorkdays.length} workdays for week starting ${weekStart}:`, weekWorkdays.map((wd) => ({ id: wd.id, date: wd.date.toISOString() })));
    if (weekWorkdays.length === 0) {
        console.log(`No workdays found for week starting ${weekStart}`);
        return [];
    }
    // Check existing schedules for the week
    const existingSchedules = yield prisma_1.default.schedule.findMany({
        where: {
            workday: {
                date: { gte: weekStartDate, lte: weekEndDate },
            },
        },
        select: {
            workdayId: true,
        },
    });
    // Count schedules per workday
    const scheduleCountPerWorkday = {};
    weekWorkdays.forEach((wd) => {
        scheduleCountPerWorkday[wd.id] = 0;
    });
    existingSchedules.forEach((schedule) => {
        if (scheduleCountPerWorkday[schedule.workdayId] !== undefined) {
            scheduleCountPerWorkday[schedule.workdayId]++;
        }
    });
    console.log(`Workday assignment counts for week starting ${weekStart}:`, scheduleCountPerWorkday);
    const MAX_EMPLOYEES_PER_DAY = 15;
    const allWorkdaysFullyAssigned = weekWorkdays.every((wd) => scheduleCountPerWorkday[wd.id] >= MAX_EMPLOYEES_PER_DAY);
    if (allWorkdaysFullyAssigned) {
        console.log(`All workdays in week starting ${weekStart} are fully assigned with ${MAX_EMPLOYEES_PER_DAY} employees`);
        return ["yooo"];
    }
    // Fetch employees
    const employees = yield prisma_1.default.user.findMany({
        where: { role: "EMPLOYEE" },
        select: {
            id: true,
            preferredDays: true,
        },
    });
    console.log(`Found ${employees.length} employees:`, employees.map((emp) => ({ id: emp.id, preferredDays: emp.preferredDays })));
    const schedules = [];
    for (const day of weekWorkdays) {
        if (scheduleCountPerWorkday[day.id] >= MAX_EMPLOYEES_PER_DAY) {
            console.log(`Workday ${day.id} at capacity (${scheduleCountPerWorkday[day.id]}/${MAX_EMPLOYEES_PER_DAY})`);
            continue;
        }
        const weekday = (0, date_fns_tz_1.toZonedTime)(day.date, TIMEZONE).toLocaleDateString("en-US", {
            weekday: "long",
        });
        const preferred = employees.filter((e) => e.preferredDays.some((p) => p === weekday));
        const pool = preferred.length > 0 ? preferred : employees;
        const randomEmployee = pool[Math.floor(Math.random() * pool.length)];
        const existing = yield prisma_1.default.schedule.findFirst({
            where: {
                workdayId: day.id,
                employeeId: randomEmployee.id,
            },
        });
        if (existing) {
            console.log(`Employee ${randomEmployee.id} already assigned to workday ${day.id}`);
            continue;
        }
        const schedule = yield prisma_1.default.schedule.create({
            data: {
                workdayId: day.id,
                employeeId: randomEmployee.id,
                assignedById: userId,
                type: "RANDOM",
            },
        });
        schedules.push(schedule);
        scheduleCountPerWorkday[day.id]++;
        console.log(`Assigned employee ${randomEmployee.id} to workday ${day.id}`);
    }
    console.log(`Generated ${schedules.length} new schedules for week starting ${weekStart}`);
    return schedules;
});
exports.randomScheduler = randomScheduler;
