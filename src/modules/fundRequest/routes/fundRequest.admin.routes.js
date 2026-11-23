import { Router } from "express";

// Fund-request controllers & validators
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

// FundRequestBank controllers & validators
import {
  listFundRequestBanksController,
  getFundRequestBankByIdController,
  createFundRequestBankController,
  updateFundRequestBankController,
  deleteFundRequestBankController,
} from "../controller/fundRequestBank.controller.js";
import {
  validateCreateFundRequestBank,
  validateUpdateFundRequestBank,
} from "../validators/fundRequestBank.validators.js";

import authMiddleware, { requireAdmin } from "../../../middlewares/auth.middleware.js";

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(requireAdmin);

// ============================================================
// Fund Request routes
// ============================================================

/**
 * @route   GET /api/v1/admin/fund-requests
 * @desc    Get all fund requests (with optional ?status, ?userId, ?retailerId filters)
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
 * @desc    Approve a fund request and credit the retailer wallet
 * @access  Private (Admin)
 */
router.patch("/:id/approve", validateApproveFundRequest, approveFundRequestController);

/**
 * @route   PATCH /api/v1/admin/fund-requests/:id/reject
 * @desc    Reject a fund request with a reason
 * @access  Private (Admin)
 */
router.patch("/:id/reject", validateRejectFundRequest, rejectFundRequestController);

// ============================================================
// FundRequestBank CRUD routes
// ============================================================

/**
 * @route   GET /api/v1/admin/fund-requests/banks
 * @desc    List all FundRequestBank records.
 *          Supports ?page and ?limit for pagination.
 * @access  Private (Admin)
 */
router.get("/banks", listFundRequestBanksController);

/**
 * @route   GET /api/v1/admin/fund-requests/banks/:bankId
 * @desc    Get a single FundRequestBank record by its _id
 * @access  Private (Admin)
 */
router.get("/banks/:bankId", getFundRequestBankByIdController);

/**
 * @route   POST /api/v1/admin/fund-requests/banks
 * @desc    Create a new standalone FundRequestBank record.
 *          Body: { bank, bankCode?, ifscCode, accountNumber, branchName }
 * @access  Private (Admin)
 */
router.post("/banks", validateCreateFundRequestBank, createFundRequestBankController);

/**
 * @route   PATCH /api/v1/admin/fund-requests/banks/:bankId
 * @desc    Update one or more fields on an existing FundRequestBank record.
 *          Body: any subset of { bank, bankCode, ifscCode, accountNumber, branchName }
 * @access  Private (Admin)
 */
router.patch("/banks/:bankId", validateUpdateFundRequestBank, updateFundRequestBankController);

/**
 * @route   DELETE /api/v1/admin/fund-requests/banks/:bankId
 * @desc    Delete a FundRequestBank record
 * @access  Private (Admin)
 */
router.delete("/banks/:bankId", deleteFundRequestBankController);

export default router;
