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
exports.getUser = exports.login = exports.register = void 0;
const client_1 = require("@prisma/client");
const auth_service_1 = require("../services/auth.service");
const prisma = new client_1.PrismaClient();
const VALID_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fullname, email, password, role, position, preferredDays } = req.body;
        if (!fullname || !email || !password || !position || !preferredDays) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        if (!Array.isArray(preferredDays) || preferredDays.length !== 2) {
            return res
                .status(400)
                .json({ message: "Preferred days must be an array of exactly 2 days" });
        }
        const invalidDays = preferredDays.filter((day) => !VALID_DAYS.includes(day));
        if (invalidDays.length > 0) {
            return res
                .status(400)
                .json({ message: `Invalid preferred days: ${invalidDays.join(", ")}` });
        }
        const existingUser = yield prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        const user = yield (0, auth_service_1.signup)(email, password, position, fullname, role, preferredDays);
        res.status(201).json({ message: "User registered successfully", user });
    }
    catch (err) {
        console.error("Registration error:", err);
        res
            .status(500)
            .json({ message: "Error registering user", error: err.message });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.body || !req.body.email || !req.body.password) {
            return res
                .status(400)
                .json({ message: "Email and password are required" });
        }
        const { email, password } = req.body;
        const { token, user } = yield (0, auth_service_1.signin)(email, password);
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });
        res.json({
            message: "Login successful",
            user,
            token,
        });
    }
    catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Error during login", error: err.message });
    }
});
exports.login = login;
const getUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader.split(" ")[1];
        const user = yield (0, auth_service_1.getMe)(token);
        return res.status(200).json(user);
    }
    catch (err) {
        res.status(500).json({ message: "Error getting user", error: err.message });
    }
});
exports.getUser = getUser;
