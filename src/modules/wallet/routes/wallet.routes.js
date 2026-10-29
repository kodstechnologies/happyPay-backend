import { Router } from "express";
import {
  getWalletBalanceController,
  getSettlementBankInfoController,
  initiateSettlementPayoutController,
  verifyRetailerSettlementController,
  transferRetailerSettlementController,
  getRecentRetailerSettlementsController,
  getDistributorSettlementInfoController,
  transferDistributorSettlementController,
  getRecentDistributorSettlementsController,
} from "../controllers/wallet.controller.js";
import authMiddleware from "../../../middlewares/auth.middleware.js";

const router = Router();

// Protect all wallet routes with authMiddleware
router.use(authMiddleware);

// GET /api/v1/wallet/balance
router.get("/balance", getWalletBalanceController);

// GET /api/v1/wallet/settlement/bank-info
router.get("/settlement/bank-info", getSettlementBankInfoController);

// POST /api/v1/wallet/settlement/payout
router.post("/settlement/payout", initiateSettlementPayoutController);

// GET /api/v1/wallet/settlement/retailer/verify
router.get("/settlement/retailer/verify", verifyRetailerSettlementController);

// POST /api/v1/wallet/settlement/retailer/transfer
router.post("/settlement/retailer/transfer", transferRetailerSettlementController);

// GET /api/v1/wallet/settlement/retailer/recent
router.get("/settlement/retailer/recent", getRecentRetailerSettlementsController);

// GET /api/v1/wallet/settlement/distributor/info
router.get("/settlement/distributor/info", getDistributorSettlementInfoController);

// POST /api/v1/wallet/settlement/distributor/transfer
router.post("/settlement/distributor/transfer", transferDistributorSettlementController);

// GET /api/v1/wallet/settlement/distributor/recent
router.get("/settlement/distributor/recent", getRecentDistributorSettlementsController);

export default router;



