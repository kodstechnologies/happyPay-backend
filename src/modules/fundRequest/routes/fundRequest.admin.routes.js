import { Router } from "express";
import {
  getAllFundRequestsController,
  getPendingFundRequestsController,
  approveFundRequestController,
  rejectFundRequestController,
  getAdminFundRequestStatsController,
} from "../controller/fundRequest.controller.js";
import {
  validateApproveFundRequest,
  validateRejectFundRequest,
} from "../validators/fundRequest.validators.js";
import authMiddleware, { requireAdmin } from "../../../middlewares/auth.middleware.js";

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(requireAdmin);

/**
 * @route   GET /api/v1/admin/fund-requests
 * @desc    Get all fund requests (with optional filters)
 * @access  Private (Admin)
 */
router.get("/", getAllFundRequestsController);

/**
 * @route   GET /api/v1/admin/fund-requests/pending
 * @desc    Get all pending fund requests
 * @access  Private (Admin)
 */
router.get("/pending", getPendingFundRequestsController);

/**
 * @route   GET /api/v1/admin/fund-requests/stats
 * @desc    Get fund request statistics
 * @access  Private (Admin)
 */
router.get("/stats", getAdminFundRequestStatsController);

/**
 * @route   PATCH /api/v1/admin/fund-requests/:id/approve
 * @desc    Approve a fund request
 * @access  Private (Admin)
 */
router.patch(
  "/:id/approve",
  validateApproveFundRequest,
  approveFundRequestController
);

/**
 * @route   PATCH /api/v1/admin/fund-requests/:id/reject
 * @desc    Reject a fund request
 * @access  Private (Admin)
 */
router.patch(
  "/:id/reject",
  validateRejectFundRequest,
  rejectFundRequestController
);

export default router;
