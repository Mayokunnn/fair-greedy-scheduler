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
exports.getWorkdays = exports.generateWorkdays = void 0;
const workday_service_1 = require("../services/workday.service");
const generateWorkdays = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { start, end } = req.query;
    if (!start || !end) {
        return res.status(400).json({ message: 'Start and end dates are required' });
    }
    try {
        const result = yield (0, workday_service_1.generateWorkdaysService)(new Date(start), new Date(end));
        res.json({ message: 'Workdays generated successfully', data: result });
    }
    catch (err) {
        res.status(500).json({ message: 'Error generating workdays', error: err });
    }
});
exports.generateWorkdays = generateWorkdays;
const getWorkdays = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { from, to } = req.query;
    if (!from || !to) {
        return res.status(400).json({ message: 'From and to dates are required' });
    }
    try {
        const workdays = yield (0, workday_service_1.generateWorkdaysService)(new Date(from), new Date(to));
        res.json({ message: 'Workdays retrieved successfully', data: workdays });
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving workdays', error: err });
    }
});
exports.getWorkdays = getWorkdays;
