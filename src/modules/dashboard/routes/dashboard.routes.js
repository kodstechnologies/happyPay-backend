import { Router } from "express";
import { getRetailerDashboard } from "../controllers/dashboard.controller.js";
import authMiddleware from "../../../middlewares/auth.middleware.js";

const router = Router();

// Protect all dashboard routes with authMiddleware
router.use(authMiddleware);

// GET /api/v1/dashboard/retailer
router.get("/retailer", getRetailerDashboard);

// GET /api/v1/dashboard (alias)
router.get("/", getRetailerDashboard);

export default router;
