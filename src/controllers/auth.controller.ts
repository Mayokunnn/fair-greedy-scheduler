import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { getMe, signin, signup } from "../services/auth.service";

const prisma = new PrismaClient();

const VALID_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const register = async (req: any, res: any) => {
  try {
    const { fullname, email, password, role, position, preferredDays } =
      req.body;

    if (!fullname || !email || !password || !position || !preferredDays) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!Array.isArray(preferredDays) || preferredDays.length !== 2) {
      return res
        .status(400)
        .json({ message: "Preferred days must be an array of exactly 2 days" });
    }

    const invalidDays = preferredDays.filter(
      (day) => !VALID_DAYS.includes(day)
    );
    if (invalidDays.length > 0) {
      return res
        .status(400)
        .json({ message: `Invalid preferred days: ${invalidDays.join(", ")}` });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await signup(
      email,
      password,
      position,
      fullname,
      role,
      preferredDays
    );

    res.status(201).json({ message: "User registered successfully", user });
  } catch (err: any) {
    console.error("Registration error:", err);
    res
      .status(500)
      .json({ message: "Error registering user", error: err.message });
  }
};

export const login = async (req: any, res: any) => {
  try {
    if (!req.body || !req.body.email || !req.body.password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const { email, password } = req.body;

    const { token, user } = await signin(email, password);

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
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Error during login", error: err.message });
  }
};

export const getUser = async (req: any, res: any) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(" ")[1];
    const user = await getMe(token);
    return res.status(200).json(user);
  } catch (err: any) {
    res.status(500).json({ message: "Error getting user", error: err.message });
  }
};
