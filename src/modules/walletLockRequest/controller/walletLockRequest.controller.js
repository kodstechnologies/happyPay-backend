import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  createWalletLockRequest,
  getWalletLockRequestById,
  getWalletLockRequestsByUserId,
  getWalletLockRequestsByRetailerId,
  getAllWalletLockRequests,
  getPendingWalletLockRequests,
  getWalletLockStatus,
  approveWalletLockRequest,
  rejectWalletLockRequest,
  unlockWallet,
  getWalletLockRequestStats,
  getAdminWalletLockRequestStats,
} from "../services/walletLockRequest.service.js";

/**
 * Create a new wallet lock request (Retailer)
 */
export const createWalletLockRequestController = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const result = await createWalletLockRequest({
    reason,
    userId: req.user.userId, // From auth middleware
  });

  return res.status(result.statusCode).json(result);
});

/**
 * Get wallet lock request by ID
 */
export const getWalletLockRequestByIdController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await getWalletLockRequestById(id);

  return res.status(result.statusCode).json(result);
});

/**
 * Get all wallet lock requests for the logged-in user (Retailer) with pagination
 */
export const getMyWalletLockRequestsController = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    page: req.query.page,
    limit: req.query.limit,
  };

  const result = await getWalletLockRequestsByUserId(req.user.userId, filters);

  return res.status(result.statusCode).json(result);
});

/**
 * Get wallet lock requests by retailer ID (Retailer)
 */
export const getWalletLockRequestsByRetailerIdController = asyncHandler(
  async (req, res) => {
    const { retailerId } = req.params;
    const filters = {
      status: req.query.status,
    };

    const result = await getWalletLockRequestsByRetailerId(retailerId, filters);

    return res.status(result.statusCode).json(result);
  }
);

/**
 * Get wallet lock status for the logged-in user (Retailer)
 */
export const getMyWalletLockStatusController = asyncHandler(async (req, res) => {
  const result = await getWalletLockStatus(req.user.userId);

  return res.status(result.statusCode).json(result);
});

/**
 * Get all wallet lock requests (Admin)
 */
export const getAllWalletLockRequestsController = asyncHandler(async (req, res) => {
  const filters = {
    status: req.query.status,
    userId: req.query.userId,
    retailerId: req.query.retailerId,
  };

  const result = await getAllWalletLockRequests(filters);

  return res.status(result.statusCode).json(result);
});

/**
 * Get pending wallet lock requests (Admin)
 */
export const getPendingWalletLockRequestsController = asyncHandler(async (req, res) => {
  const result = await getPendingWalletLockRequests();

  return res.status(result.statusCode).json(result);
});

/**
 * Approve a wallet lock request (Admin)
 */
export const approveWalletLockRequestController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { adminNotes } = req.body;

  const result = await approveWalletLockRequest(id, req.user.userId, adminNotes);

  return res.status(result.statusCode).json(result);
});

/**
 * Reject a wallet lock request (Admin)
 */
export const rejectWalletLockRequestController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectionReason, adminNotes } = req.body;

  const result = await rejectWalletLockRequest(
    id,
    req.user.userId,
    rejectionReason,
    adminNotes
  );

  return res.status(result.statusCode).json(result);
});

/**
 * Unlock wallet (Admin)
 */
export const unlockWalletController = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { adminNotes } = req.body;

  const result = await unlockWallet(id, req.user.userId, adminNotes);

  return res.status(result.statusCode).json(result);
});

/**
 * Get wallet lock request statistics for the logged-in user (Retailer)
 */
export const getMyWalletLockRequestStatsController = asyncHandler(async (req, res) => {
  const result = await getWalletLockRequestStats(req.user.userId);

  return res.status(result.statusCode).json(result);
});

/**
 * Get wallet lock request statistics (Admin)
 */
export const getAdminWalletLockRequestStatsController = asyncHandler(async (req, res) => {
  const result = await getAdminWalletLockRequestStats();

  return res.status(result.statusCode).json(result);
});
