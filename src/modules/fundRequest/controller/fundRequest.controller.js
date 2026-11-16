import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  createFundRequest,
  getFundRequestById,
  getFundRequestsByUserId,
  getFundRequestsByRetailerId,
  getAllFundRequests,
  getPendingFundRequests,
  approveFundRequest,
  rejectFundRequest,
  resubmitFundRequest,
  deleteFundRequest,
  getFundRequestStats,
  getAdminFundRequestStats,
  verifyBiometricAndCreditWallet,
} from "../services/fundRequest.service.js";

/**
 * Create a new fund request (Retailer)
 */
export const createFundRequestController = asyncHandler(async (req, res) => {
  // Handle file upload - receiptSlip will be in req.body after S3 upload
  const receiptSlip = req.body.receiptSlip;

  if (!receiptSlip) {
    return res.status(400).json({
      success: false,
      message: "Receipt slip is required",
      statusCode: 400,
    });
  }

  const result = await createFundRequest({
    ...req.body,
    receiptSlip,
    userId: req.user.userId, // From auth middleware
  });

  return res.status(result.statusCode).json(result);
});

/**
 * Get fund request by ID
 */
export const getFundRequestByIdController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await getFundRequestById(id);

  return res.status(result.statusCode).json(result);
});

/**
 * Get all fund requests for the logged-in user (Retailer) with pagination
 */
export const getMyFundRequestsController = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    page: req.query.page,
    limit: req.query.limit,
  };

  const result = await getFundRequestsByUserId(req.user.userId, filters);

  return res.status(result.statusCode).json(result);
});

/**
 * Get fund requests by retailer ID (Retailer)
 */
export const getFundRequestsByRetailerIdController = asyncHandler(
  async (req, res) => {
    const { retailerId } = req.params;
    const filters = {
      status: req.query.status,
    };

    const result = await getFundRequestsByRetailerId(retailerId, filters);

    return res.status(result.statusCode).json(result);
  }
);

/**
 * Get all fund requests (Admin)
 */
export const getAllFundRequestsController = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    userId: req.query.userId,
    retailerId: req.query.retailerId,
  };

  const result = await getAllFundRequests(filters);

  return res.status(result.statusCode).json(result);
});

/**
 * Get pending fund requests (Admin)
 */
export const getPendingFundRequestsController = asyncHandler(async (req, res) => {
  const result = await getPendingFundRequests();

  return res.status(result.statusCode).json(result);
});

/**
 * Approve a fund request (Admin)
 */
export const approveFundRequestController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { adminNotes } = req.body;

  const result = await approveFundRequest(id, req.user.userId, adminNotes);

  return res.status(result.statusCode).json(result);
});

/**
 * Reject a fund request (Admin)
 */
export const rejectFundRequestController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectionReason, adminNotes } = req.body;

  const result = await rejectFundRequest(
    id,
    req.user.userId,
    rejectionReason,
    adminNotes
  );

  return res.status(result.statusCode).json(result);
});

/**
 * Resubmit a rejected fund request (Retailer)
 */
export const resubmitFundRequestController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Handle file upload - receiptSlip will be in req.body after S3 upload (optional for resubmit)
  const receiptSlip = req.body.receiptSlip;

  const result = await resubmitFundRequest(id, {
    ...req.body,
    ...(receiptSlip && { receiptSlip }),
  });

  return res.status(result.statusCode).json(result);
});

/**
 * Delete a fund request (Retailer - only if pending)
 */
export const deleteFundRequestController = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await deleteFundRequest(id);

  return res.status(result.statusCode).json(result);
});

/**
 * Get fund request statistics for the logged-in user (Retailer)
 */
export const getMyFundRequestStatsController = asyncHandler(async (req, res) => {
  const result = await getFundRequestStats(req.user.userId);

  return res.status(result.statusCode).json(result);
});

/**
 * Get fund request statistics (Admin)
 */
export const getAdminFundRequestStatsController = asyncHandler(async (req, res) => {
  const result = await getAdminFundRequestStats();

  return res.status(result.statusCode).json(result);
});

/**
 * Verify biometric and credit wallet for approved fund request (Retailer)
 */
export const verifyBiometricAndCreditWalletController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const withdrawalData = req.body;

  const result = await verifyBiometricAndCreditWallet(id, withdrawalData);

  return res.status(result.statusCode).json(result);
});
