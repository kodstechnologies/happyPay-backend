import { Router } from "express";
import { getRetailerTransactionsController } from "../controller/transaction.controller.js";
import authMiddleware from "../../../middlewares/auth.middleware.js";

const router = Router();

// Protect all transaction routes
router.use(authMiddleware);

// GET /api/v1/transactions
router.get("/", getRetailerTransactionsController);

export default router;
