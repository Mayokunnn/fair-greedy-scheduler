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
exports.getMe = exports.signin = exports.signup = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";
const SALT_ROUNDS = 10;
const signup = (email_1, password_1, position_1, fullName_1, ...args_1) => __awaiter(void 0, [email_1, password_1, position_1, fullName_1, ...args_1], void 0, function* (email, password, position, fullName, role = "EMPLOYEE", preferredDays) {
    const salt = yield bcrypt_1.default.genSalt(SALT_ROUNDS);
    const hashedPassword = yield bcrypt_1.default.hash(password, salt);
    const user = yield prisma_1.default.user.create({
        data: {
            email,
            password: hashedPassword,
            fullName,
            position,
            role,
            preferredDays,
        },
        select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
            createdAt: true,
            position: true,
            preferredDays: true,
            schedules: true,
        },
    });
    return user;
});
exports.signup = signup;
const signin = (email, password) => __awaiter(void 0, void 0, void 0, function* () {
    if (!email || !password) {
        throw new Error("Email and password are required");
    }
    const user = yield prisma_1.default.user.findUnique({ where: { email } });
    if (!user) {
        throw new Error("User not found");
    }
    const isMatch = yield bcrypt_1.default.compare(password, user.password);
    if (!isMatch) {
        throw new Error("Invalid credentials");
    }
    const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: "7d",
    });
    return { token, user };
});
exports.signin = signin;
const getMe = (token) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = yield prisma_1.default.user.findUnique({
            where: { id: decoded.userId || decoded.id },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
                createdAt: true,
                schedules: true,
                position: true,
                preferredDays: true,
            },
        });
        return user;
    }
    catch (_a) {
        throw new Error("Invalid token");
    }
});
exports.getMe = getMe;
