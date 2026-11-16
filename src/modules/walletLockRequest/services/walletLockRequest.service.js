import ApiResponse from "../../../utils/ApiResponse.js";
import walletLockRequestRepository from "../repository/walletLockRequest.repository.js";
import { findById, updateUser } from "../../auth/repository/user.repository.js";

/**
 * Create a new wallet lock request
 */
export const createWalletLockRequest = async (data) => {
  try {
    // Validate user exists
    const user = await findById(data.userId);
    if (!user) {
      return ApiResponse.error("User not found", 404);
    }

    // Check if user already has a pending lock request
    const pendingRequest = await walletLockRequestRepository.countByUserIdAndStatus(
      data.userId,
      "PENDING"
    );
    if (pendingRequest > 0) {
      return ApiResponse.error(
        "You already have a pending wallet lock request",
        400
      );
    }

    // Add retailerId if available
    if (user.retailerId) {
      data.retailerId = user.retailerId;
    }

    const walletLockRequest = await walletLockRequestRepository.create(data);

    return ApiResponse.success(
      walletLockRequest,
      "Wallet lock request created successfully",
      null,
      201
    );
  } catch (error) {
    console.error("Error creating wallet lock request:", error);
    return ApiResponse.error(
      error.message || "Failed to create wallet lock request",
      500
    );
  }
};

/**
 * Get wallet lock request by ID
 */
export const getWalletLockRequestById = async (id) => {
  try {
    const walletLockRequest = await walletLockRequestRepository.findById(id);

    if (!walletLockRequest) {
      return ApiResponse.error("Wallet lock request not found", 404);
    }

    return ApiResponse.success(
      walletLockRequest,
      "Wallet lock request retrieved successfully"
    );
  } catch (error) {
    console.error("Error fetching wallet lock request:", error);
    return ApiResponse.error(
      error.message || "Failed to fetch wallet lock request",
      500
    );
  }
};

/**
 * Get all wallet lock requests for a specific user (retailer) with counts and pagination
 */
export const getWalletLockRequestsByUserId = async (userId, filters = {}) => {
  try {
    // Validate user exists
    const user = await findById(userId);
    if (!user) {
      return ApiResponse.error("User not found", 404);
    }

    const result = await walletLockRequestRepository.findByUserId(
      userId,
      filters
    );

    // Get counts for each status
    const [pending, approved, rejected] = await Promise.all([
      walletLockRequestRepository.countByUserIdAndStatus(userId, "PENDING"),
      walletLockRequestRepository.countByUserIdAndStatus(userId, "APPROVED"),
      walletLockRequestRepository.countByUserIdAndStatus(userId, "REJECTED"),
    ]);

    return ApiResponse.success({
      requests: result.requests,
      pagination: result.pagination,
      counts: {
        pending,
        approved,
        rejected,
        total: pending + approved + rejected,
      },
    });
  } catch (error) {
    console.error("Error fetching wallet lock requests:", error);
    return ApiResponse.error(
      error.message || "Failed to fetch wallet lock requests",
      500
    );
  }
};

/**
 * Get wallet lock requests by retailer ID
 */
export const getWalletLockRequestsByRetailerId = async (retailerId, filters = {}) => {
  try {
    const requests = await walletLockRequestRepository.findByRetailerId(
      retailerId,
      filters
    );

    return ApiResponse.success(
      requests,
      "Wallet lock requests retrieved successfully"
    );
  } catch (error) {
    console.error("Error fetching wallet lock requests:", error);
    return ApiResponse.error(
      error.message || "Failed to fetch wallet lock requests",
      500
    );
  }
};

/**
 * Get all wallet lock requests (admin)
 */
export const getAllWalletLockRequests = async (filters = {}) => {
  try {
    const requests = await walletLockRequestRepository.findAll(filters);

    return ApiResponse.success(
      requests,
      "Wallet lock requests retrieved successfully"
    );
  } catch (error) {
    console.error("Error fetching wallet lock requests:", error);
    return ApiResponse.error(
      error.message || "Failed to fetch wallet lock requests",
      500
    );
  }
};

/**
 * Get pending wallet lock requests (admin)
 */
export const getPendingWalletLockRequests = async () => {
  try {
    const requests = await walletLockRequestRepository.findPending();

    return ApiResponse.success(
      requests,
      "Pending wallet lock requests retrieved successfully"
    );
  } catch (error) {
    console.error("Error fetching pending wallet lock requests:", error);
    return ApiResponse.error(
      error.message || "Failed to fetch pending wallet lock requests",
      500
    );
  }
};

/**
 * Get wallet lock status for a user
 */
export const getWalletLockStatus = async (userId) => {
  try {
    const user = await findById(userId);
    if (!user) {
      return ApiResponse.error("User not found", 404);
    }

    const isLocked = user.isWalletLocked || false;
    const latestLockRequest = await walletLockRequestRepository.findLatestApprovedByUserId(userId);

    return ApiResponse.success({
      isLocked,
      lockedAt: latestLockRequest?.reviewedAt || null,
      reason: latestLockRequest?.reason || null,
    });
  } catch (error) {
    console.error("Error fetching wallet lock status:", error);
    return ApiResponse.error(
      error.message || "Failed to fetch wallet lock status",
      500
    );
  }
};

/**
 * Approve a wallet lock request (admin)
 */
export const approveWalletLockRequest = async (id, adminId, adminNotes = null) => {
  try {
    const walletLockRequest = await walletLockRequestRepository.findByIdPlain(id);

    if (!walletLockRequest) {
      return ApiResponse.error("Wallet lock request not found", 404);
    }

    if (walletLockRequest.status !== "PENDING") {
      return ApiResponse.error(
        "Only pending requests can be approved",
        400
      );
    }

    // Lock the user's wallet
    try {
      await updateUser(walletLockRequest.userId, {
        isWalletLocked: true,
      });
    } catch (walletError) {
      console.error("Failed to lock wallet:", walletError);
      return ApiResponse.error(
        walletError.message || "Failed to lock wallet",
        500
      );
    }

    // Update status to APPROVED
    const updatedRequest = await walletLockRequestRepository.updateStatus(id, "APPROVED", {
      reviewedBy: adminId,
      adminNotes,
    });

    return ApiResponse.success(
      updatedRequest,
      "Wallet lock request approved successfully. Wallet has been locked."
    );
  } catch (error) {
    console.error("Error approving wallet lock request:", error);
    return ApiResponse.error(
      error.message || "Failed to approve wallet lock request",
      500
    );
  }
};

/**
 * Reject a wallet lock request (admin)
 */
export const rejectWalletLockRequest = async (id, adminId, rejectionReason, adminNotes = null) => {
  try {
    const walletLockRequest = await walletLockRequestRepository.findByIdPlain(id);

    if (!walletLockRequest) {
      return ApiResponse.error("Wallet lock request not found", 404);
    }

    if (walletLockRequest.status !== "PENDING") {
      return ApiResponse.error(
        "Only pending requests can be rejected",
        400
      );
    }

    if (!rejectionReason || rejectionReason.trim() === "") {
      return ApiResponse.error("Rejection reason is required", 400);
    }

    const updatedRequest = await walletLockRequestRepository.updateStatus(id, "REJECTED", {
      reviewedBy: adminId,
      rejectionReason: rejectionReason.trim(),
      adminNotes,
    });

    return ApiResponse.success(
      updatedRequest,
      "Wallet lock request rejected successfully"
    );
  } catch (error) {
    console.error("Error rejecting wallet lock request:", error);
    return ApiResponse.error(
      error.message || "Failed to reject wallet lock request",
      500
    );
  }
};

/**
 * Unlock wallet (admin action)
 */
export const unlockWallet = async (id, adminId, adminNotes = null) => {
  try {
    const walletLockRequest = await walletLockRequestRepository.findByIdPlain(id);

    if (!walletLockRequest) {
      return ApiResponse.error("Wallet lock request not found", 404);
    }

    if (walletLockRequest.status !== "APPROVED") {
      return ApiResponse.error(
        "Only approved lock requests can be unlocked",
        400
      );
    }

    // Unlock the user's wallet
    try {
      await updateUser(walletLockRequest.userId, {
        isWalletLocked: false,
      });
    } catch (walletError) {
      console.error("Failed to unlock wallet:", walletError);
      return ApiResponse.error(
        walletError.message || "Failed to unlock wallet",
        500
      );
    }

    // Add admin notes to the lock request
    const updatedRequest = await walletLockRequestRepository.updateById(id, {
      adminNotes: adminNotes || `Wallet unlocked by admin at ${new Date().toISOString()}`,
    });

    return ApiResponse.success(
      updatedRequest,
      "Wallet unlocked successfully"
    );
  } catch (error) {
    console.error("Error unlocking wallet:", error);
    return ApiResponse.error(
      error.message || "Failed to unlock wallet",
      500
    );
  }
};

/**
 * Get wallet lock request statistics for a user
 */
export const getWalletLockRequestStats = async (userId) => {
  try {
    const [pending, approved, rejected] = await Promise.all([
      walletLockRequestRepository.countByUserIdAndStatus(userId, "PENDING"),
      walletLockRequestRepository.countByUserIdAndStatus(userId, "APPROVED"),
      walletLockRequestRepository.countByUserIdAndStatus(userId, "REJECTED"),
    ]);

    return ApiResponse.success({
      pending,
      approved,
      rejected,
    });
  } catch (error) {
    console.error("Error fetching wallet lock request stats:", error);
    return ApiResponse.error(
      error.message || "Failed to fetch wallet lock request stats",
      500
    );
  }
};

/**
 * Get wallet lock request statistics (admin)
 */
export const getAdminWalletLockRequestStats = async () => {
  try {
    const [pending, approved, rejected] = await Promise.all([
      walletLockRequestRepository.countByStatus("PENDING"),
      walletLockRequestRepository.countByStatus("APPROVED"),
      walletLockRequestRepository.countByStatus("REJECTED"),
    ]);

    return ApiResponse.success({
      pending,
      approved,
      rejected,
    });
  } catch (error) {
    console.error("Error fetching wallet lock request stats:", error);
    return ApiResponse.error(
      error.message || "Failed to fetch wallet lock request stats",
      500
    );
  }
};
