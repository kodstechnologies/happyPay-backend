import { Router } from "express";
import {
  lockUserWalletController,
  unlockUserWalletController,
} from "../controller/adminWalletLock.controller.js";
import {
  validateLockWallet,
  validateUnlockWallet,
} from "../validators/adminWalletLock.validators.js";
import authMiddleware, { requireAdmin } from "../../../middlewares/auth.middleware.js";

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(requireAdmin);

/**
 * @route   POST /api/v1/admin/wallet-lock
 * @desc    Lock user wallet directly (admin action)
 * @access  Private (Admin)
 */
router.post(
  "/wallet-lock",
  validateLockWallet,
  lockUserWalletController
);

/**
 * @route   POST /api/v1/admin/wallet-unlock
 * @desc    Unlock user wallet directly (admin action)
 * @access  Private (Admin)
 */
router.post(
  "/wallet-unlock",
  validateUnlockWallet,
  unlockUserWalletController
);

export default router;
