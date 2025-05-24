import { Router } from "express";
import messageRoutes from "./messageRoutes.js";
import reviewRoutes from "./reviewRoutes.js";
import userActivityLogRoutes from "./userActivityLogRoutes.js";
import userRoutes from "./userRoutes.js";
import carRoutes from "./carRoutes.js";
import authRoutes from "./authRoutes.js";
import { getGlobalStats, healthCheck } from "../controllers/globalController.js";
import { authenticateJWT } from "../middlewares/auth.js";

const mainRoute = Router();

mainRoute.route('/health')
  .get(healthCheck);

mainRoute.route('/stats')
  .get(authenticateJWT, getGlobalStats);

mainRoute.use("/users", userRoutes);
mainRoute.use("/cars", carRoutes);
mainRoute.use("/messages", messageRoutes);
mainRoute.use("/reviews", reviewRoutes);
mainRoute.use("/user-activity-logs", userActivityLogRoutes);
mainRoute.use("/auth", authRoutes);

export default mainRoute;