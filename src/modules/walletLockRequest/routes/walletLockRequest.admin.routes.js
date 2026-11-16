import { Router } from "express";
import {
  getAllWalletLockRequestsController,
  getPendingWalletLockRequestsController,
  approveWalletLockRequestController,
  rejectWalletLockRequestController,
  unlockWalletController,
  getAdminWalletLockRequestStatsController,
} from "../controller/walletLockRequest.controller.js";
import {
  validateApproveWalletLockRequest,
  validateRejectWalletLockRequest,
  validateUnlockWallet,
} from "../validators/walletLockRequest.validators.js";
import authMiddleware, { requireAdmin } from "../../../middlewares/auth.middleware.js";

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(requireAdmin);

/**
 * @route   GET /api/v1/admin/wallet-lock-requests
 * @desc    Get all wallet lock requests (with optional filters)
 * @access  Private (Admin)
 */
router.get("/", getAllWalletLockRequestsController);

/**
 * @route   GET /api/v1/admin/wallet-lock-requests/pending
 * @desc    Get all pending wallet lock requests
 * @access  Private (Admin)
 */
router.get("/pending", getPendingWalletLockRequestsController);

/**
 * @route   GET /api/v1/admin/wallet-lock-requests/stats
 * @desc    Get wallet lock request statistics
 * @access  Private (Admin)
 */
router.get("/stats", getAdminWalletLockRequestStatsController);

/**
 * @route   PATCH /api/v1/admin/wallet-lock-requests/:id/approve
 * @desc    Approve a wallet lock request
 * @access  Private (Admin)
 */
router.patch(
  "/:id/approve",
  validateApproveWalletLockRequest,
  approveWalletLockRequestController
);

/**
 * @route   PATCH /api/v1/admin/wallet-lock-requests/:id/reject
 * @desc    Reject a wallet lock request
 * @access  Private (Admin)
 */
router.patch(
  "/:id/reject",
  validateRejectWalletLockRequest,
  rejectWalletLockRequestController
);

/**
 * @route   PATCH /api/v1/admin/wallet-lock-requests/:id/unlock
 * @desc    Unlock wallet
 * @access  Private (Admin)
 */
router.patch(
  "/:id/unlock",
  validateUnlockWallet,
  unlockWalletController
);

export default router;
