import { Router } from "express";
import {
  getMyWalletLockStatusController,
} from "../controller/walletLockRequest.controller.js";
import authMiddleware from "../../../middlewares/auth.middleware.js";

const router = Router();

// All retailer routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/v1/wallet-lock-requests/my/status
 * @desc    Get wallet lock status for the logged-in user
 * @access  Private (Retailer)
 */
router.get("/my/status", getMyWalletLockStatusController);

export default router;
