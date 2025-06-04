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
exports.getAllUsers = exports.getAllEmployees = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getAllEmployees = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const employees = yield prisma.user.findMany({
            where: { role: "EMPLOYEE" },
            select: {
                id: true,
                email: true,
                fullName: true,
                position: true,
                role: true,
                createdAt: true,
                schedules: {
                    where: { type: "FAIR" },
                    select: {
                        id: true,
                        workdayId: true,
                        assignedById: true,
                        createdAt: true,
                        workday: {
                            select: {
                                date: true,
                            },
                        },
                    },
                },
            },
        });
        res.json(employees);
    }
    catch (err) {
        res.status(500).json({ message: "Error fetching employees", error: err });
    }
});
exports.getAllEmployees = getAllEmployees;
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield prisma.user.findMany({
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                position: true,
                createdAt: true,
                schedules: {
                    where: { type: "FAIR" },
                    select: {
                        id: true,
                        workdayId: true,
                        assignedById: true,
                        createdAt: true,
                    },
                },
            },
        });
        res.json(users);
    }
    catch (err) {
        res.status(500).json({ message: "Error fetching users", error: err });
    }
});
exports.getAllUsers = getAllUsers;
