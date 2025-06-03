import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import scheduleRoutes from "./routes/schedule.routes";
import userRoutes from "./routes/user.routes";
import workdayRoutes from "./routes/workday.routes";
import { authenticate, authorizeRoles } from "./middleware/auth.middleware";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/schedule", authenticate, authorizeRoles("ADMIN"), scheduleRoutes);
app.use("/workday", authenticate, workdayRoutes);
app.use("/users", authenticate, userRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
