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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkdaysService = exports.generateWorkdaysService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const generateWorkdaysService = (startDate, endDate) => __awaiter(void 0, void 0, void 0, function* () {
    const workdays = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        workdays.push({ date: new Date(currentDate) });
        currentDate.setDate(currentDate.getDate() + 1);
    }
    const createdWorkdays = yield prisma.$transaction(workdays.map((day) => prisma.workday.upsert({
        where: { date: day.date },
        update: {},
        create: { date: day.date },
    })));
    return createdWorkdays;
});
exports.generateWorkdaysService = generateWorkdaysService;
const getWorkdaysService = (from, to) => __awaiter(void 0, void 0, void 0, function* () {
    return yield prisma.workday.findMany({
        where: {
            date: {
                gte: from,
                lte: to,
            },
        },
    });
});
exports.getWorkdaysService = getWorkdaysService;
