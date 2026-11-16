import { Router } from "express";
import {
  createFundRequestController,
  getFundRequestByIdController,
  getMyFundRequestsController,
  getFundRequestsByRetailerIdController,
  resubmitFundRequestController,
  deleteFundRequestController,
  getMyFundRequestStatsController,
} from "../controller/fundRequest.controller.js";
import {
  validateCreateFundRequest,
  validateResubmitFundRequest,
} from "../validators/fundRequest.validators.js";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import {
  uploadFundRequestDocument,
  uploadFundRequestToS3,
} from "../../../utils/multer.js";

const router = Router();

// All retailer routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/v1/fund-requests
 * @desc    Create a new fund request
 * @access  Private (Retailer)
 */
router.post(
  "/",
  uploadFundRequestDocument,
  uploadFundRequestToS3,
  validateCreateFundRequest,
  createFundRequestController
);

/**
 * @route   GET /api/v1/fund-requests/my
 * @desc    Get all fund requests for the logged-in user
 * @access  Private (Retailer)
 */
router.get("/my", getMyFundRequestsController);

/**
 * @route   GET /api/v1/fund-requests/my/stats
 * @desc    Get fund request statistics for the logged-in user
 * @access  Private (Retailer)
 */
router.get("/my/stats", getMyFundRequestStatsController);

/**
 * @route   GET /api/v1/fund-requests/retailer/:retailerId
 * @desc    Get all fund requests for a specific retailer
 * @access  Private (Retailer)
 */
router.get("/retailer/:retailerId", getFundRequestsByRetailerIdController);

/**
 * @route   GET /api/v1/fund-requests/:id
 * @desc    Get a specific fund request by ID
 * @access  Private (Retailer)
 */
router.get("/:id", getFundRequestByIdController);

/**
 * @route   PATCH /api/v1/fund-requests/:id/resubmit
 * @desc    Resubmit a rejected fund request
 * @access  Private (Retailer)
 */
router.patch(
  "/:id/resubmit",
  uploadFundRequestDocument,
  uploadFundRequestToS3,
  validateResubmitFundRequest,
  resubmitFundRequestController
);

/**
 * @route   DELETE /api/v1/fund-requests/:id
 * @desc    Delete a pending fund request
 * @access  Private (Retailer)
 */
router.delete("/:id", deleteFundRequestController);

export default router;
