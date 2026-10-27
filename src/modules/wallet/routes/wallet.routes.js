import { Router } from "express";
import {
  getWalletBalanceController,
  getSettlementBankInfoController,
} from "../controllers/wallet.controller.js";
import authMiddleware from "../../../middlewares/auth.middleware.js";

const router = Router();

// Protect all wallet routes with authMiddleware
router.use(authMiddleware);

// GET /api/v1/wallet/balance
router.get("/balance", getWalletBalanceController);

// GET /api/v1/wallet/settlement/bank-info
router.get("/settlement/bank-info", getSettlementBankInfoController);

export default router;

