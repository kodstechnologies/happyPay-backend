import ApiResponse from "../../../utils/ApiResponse.js";
import fundRequestRepository from "../repository/fundRequest.repository.js";
import { findById } from "../../auth/repository/user.repository.js";
import {
  sendFundRequestNotification,
  sendFundRequestApprovedNotification,
  sendFundRequestRejectedNotification,
  sendFundRequestResubmittedNotification,
  sendWalletTransferNotification,
} from "../../notifications/services/notification.services.js";
import { addAmountToWallet } from "../../wallet/services/wallet.service.js";

/**
 * Create a new fund request
 */
export const createFundRequest = async (data) => {
  try {
    // Validate user exists
    const user = await findById(data.userId);
    if (!user) {
      return ApiResponse.error("User not found", 404);
    }

    // Add retailerId if available
    if (user.retailerId) {
      data.retailerId = user.retailerId;
    }

    const fundRequest = await fundRequestRepository.create(data);

    // Send notification to admins (non-blocking)
    sendFundRequestNotification({
      retailerId: user._id,
      retailerName: user.fullName || user.name,
      retailerMobile: user.mobile,
      amount: data.amount,
      paymentMode: data.paymentMode,
    }).catch((err) => {
      console.error("Failed to send fund request notification:", err);
    });

    return ApiResponse.success(
      "Fund request created successfully",
      fundRequest,
      201
    );
  } catch (error) {
    console.error("Error creating fund request:", error);
    return ApiResponse.error(
      error.message || "Failed to create fund request",
      500
    );
  }
};

/**
 * Get fund request by ID
 */
export const getFundRequestById = async (id) => {
  try {
    const fundRequest = await fundRequestRepository.findById(id);

    if (!fundRequest) {
      return ApiResponse.error("Fund request not found", 404);
    }

    return ApiResponse.success(
      "Fund request retrieved successfully",
      fundRequest
    );
  } catch (error) {
    console.error("Error fetching fund request:", error);
    return ApiResponse.error(
      error.message || "Failed to fetch fund request",
      500
    );
  }
};

/**
 * Get all fund requests for a specific user (retailer) with counts and pagination
 */
export const getFundRequestsByUserId = async (userId, filters = {}) => {
  try {
    // Validate user exists
    const user = await findById(userId);
    if (!user) {
      return ApiResponse.error("User not found", 404);
    }

    const result = await fundRequestRepository.findByUserId(
      userId,
      filters
    );

    // Get counts for each status
    const [pending, approved, rejected] = await Promise.all([
      fundRequestRepository.countByUserIdAndStatus(userId, "PENDING"),
      fundRequestRepository.countByUserIdAndStatus(userId, "APPROVED"),
      fundRequestRepository.countByUserIdAndStatus(userId, "REJECTED"),
    ]);

    return ApiResponse.success(
      "Fund requests retrieved successfully",
      {
        requests: result.requests,
        pagination: result.pagination,
        counts: {
          pending,
          approved,
          rejected,
          total: pending + approved + rejected,
        },
      }
    );
  } catch (error) {
    console.error("Error fetching fund requests:", error);
    return ApiResponse.error(
      error.message || "Failed to fetch fund requests",
      500
    );
  }
};

/**
 * Get all fund requests for a specific retailer ID
 */
export const getFundRequestsByRetailerId = async (retailerId, filters = {}) => {
  try {
    const fundRequests = await fundRequestRepository.findByRetailerId(
      retailerId,
      filters
    );

    return ApiResponse.success(
      "Fund requests retrieved successfully",
      fundRequests
    );
  } catch (error) {
    console.error("Error fetching fund requests:", error);
    return ApiResponse.error(
      error.message || "Failed to fetch fund requests",
      500
    );
  }
};

/**
 * Get all fund requests (for admin)
 */
export const getAllFundRequests = async (filters = {}) => {
  try {
    const fundRequests = await fundRequestRepository.findAll(filters);

    return ApiResponse.success(
      "Fund requests retrieved successfully",
      fundRequests
    );
  } catch (error) {
    console.error("Error fetching fund requests:", error);
    return ApiResponse.error(
      error.message || "Failed to fetch fund requests",
      500
    );
  }
};

/**
 * Get pending fund requests (for admin)
 */
export const getPendingFundRequests = async () => {
  try {
    const fundRequests = await fundRequestRepository.findPending();

    return ApiResponse.success(
      "Pending fund requests retrieved successfully",
      fundRequests
    );
  } catch (error) {
    console.error("Error fetching pending fund requests:", error);
    return ApiResponse.error(
      error.message || "Failed to fetch pending fund requests",
      500
    );
  }
};

/**
 * Approve a fund request (admin)
 */
export const approveFundRequest = async (id, adminId, adminNotes = null) => {
  try {
    const fundRequest = await fundRequestRepository.findByIdPlain(id);

    if (!fundRequest) {
      return ApiResponse.error("Fund request not found", 404);
    }

    if (fundRequest.status !== "PENDING") {
      return ApiResponse.error(
        "Only pending requests can be approved",
        400
      );
    }

    // Credit the retailer's wallet with the approved amount
    try {
      await addAmountToWallet(
        fundRequest.userId,
        fundRequest.amount,
        null, // razorpay_order_id
        null, // razorpay_payment_id
        fundRequest._id, // referenceKey - use fund request ID
        `Fund Request Approval - ${fundRequest.paymentMode} payment via ${fundRequest.bank}`
      );

      // Send wallet credit notification (non-blocking)
      sendWalletTransferNotification({
        recipientId: fundRequest.userId,
        type: "WALLET_CREDIT",
        title: "Wallet Credited",
        body: `₹${fundRequest.amount} has been credited to your wallet from approved fund request.`,
        data: {
          amount: fundRequest.amount,
          reference: fundRequest._id,
        },
      }).catch((err) => {
        console.error("Failed to send wallet credit notification:", err);
      });
    } catch (walletError) {
      console.error("Failed to credit wallet:", walletError);
      // Continue with approval even if wallet credit fails (log the error)
    }

    const updatedRequest = await fundRequestRepository.updateStatus(id, "APPROVED", {
      reviewedBy: adminId,
      adminNotes,
    });

    // Send notification to retailer (non-blocking)
    sendFundRequestApprovedNotification({
      retailerId: fundRequest.userId,
      amount: fundRequest.amount,
    }).catch((err) => {
      console.error("Failed to send fund request approved notification:", err);
    });

    return ApiResponse.success(
      "Fund request approved successfully and amount credited to wallet",
      updatedRequest
    );
  } catch (error) {
    console.error("Error approving fund request:", error);
    return ApiResponse.error(
      error.message || "Failed to approve fund request",
      500
    );
  }
};

/**
 * Reject a fund request (admin)
 */
export const rejectFundRequest = async (id, adminId, rejectionReason, adminNotes = null) => {
  try {
    const fundRequest = await fundRequestRepository.findByIdPlain(id);

    if (!fundRequest) {
      return ApiResponse.error("Fund request not found", 404);
    }

    if (fundRequest.status !== "PENDING") {
      return ApiResponse.error(
        "Only pending requests can be rejected",
        400
      );
    }

    if (!rejectionReason || rejectionReason.trim() === "") {
      return ApiResponse.error("Rejection reason is required", 400);
    }

    const updatedRequest = await fundRequestRepository.updateStatus(id, "REJECTED", {
      reviewedBy: adminId,
      rejectionReason: rejectionReason.trim(),
      adminNotes,
    });

    // Send notification to retailer (non-blocking)
    sendFundRequestRejectedNotification({
      retailerId: fundRequest.userId,
      amount: fundRequest.amount,
      rejectionReason: rejectionReason.trim(),
    }).catch((err) => {
      console.error("Failed to send fund request rejected notification:", err);
    });

    return ApiResponse.success(
      "Fund request rejected successfully",
      updatedRequest
    );
  } catch (error) {
    console.error("Error rejecting fund request:", error);
    return ApiResponse.error(
      error.message || "Failed to reject fund request",
      500
    );
  }
};

/**
 * Resubmit a rejected fund request (retailer)
 */
export const resubmitFundRequest = async (id, updateData) => {
  try {
    const fundRequest = await fundRequestRepository.findByIdPlain(id);

    if (!fundRequest) {
      return ApiResponse.error("Fund request not found", 404);
    }

    if (fundRequest.status !== "REJECTED") {
      return ApiResponse.error(
        "Only rejected requests can be resubmitted",
        400
      );
    }

    // Reset status to pending and clear rejection data
    const updateFields = {
      ...updateData,
      status: "PENDING",
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
      adminNotes: null,
    };

    const updatedRequest = await fundRequestRepository.updateById(id, updateFields);

    // Send notification to admins (non-blocking)
    const user = await findById(fundRequest.userId);
    sendFundRequestResubmittedNotification({
      retailerId: user._id,
      retailerName: user.fullName || user.name,
      retailerMobile: user.mobile,
      amount: updateFields.amount || fundRequest.amount,
      paymentMode: updateFields.paymentMode || fundRequest.paymentMode,
    }).catch((err) => {
      console.error("Failed to send fund request resubmitted notification:", err);
    });

    return ApiResponse.success(
      "Fund request resubmitted successfully",
      updatedRequest
    );
  } catch (error) {
    console.error("Error resubmitting fund request:", error);
    return ApiResponse.error(
      error.message || "Failed to resubmit fund request",
      500
    );
  }
};

/**
 * Delete a fund request (soft delete - only if pending)
 */
export const deleteFundRequest = async (id) => {
  try {
    const fundRequest = await fundRequestRepository.findByIdPlain(id);

    if (!fundRequest) {
      return ApiResponse.error("Fund request not found", 404);
    }

    if (fundRequest.status !== "PENDING") {
      return ApiResponse.error(
        "Only pending requests can be deleted",
        400
      );
    }

    await fundRequestRepository.deleteById(id);

    return ApiResponse.success(
      "Fund request deleted successfully",
      null
    );
  } catch (error) {
    console.error("Error deleting fund request:", error);
    return ApiResponse.error(
      error.message || "Failed to delete fund request",
      500
    );
  }
};

/**
 * Get fund request statistics for a user
 */
export const getFundRequestStats = async (userId) => {
  try {
    const pending = await fundRequestRepository.countByUserIdAndStatus(userId, "PENDING");
    const approved = await fundRequestRepository.countByUserIdAndStatus(userId, "APPROVED");
    const rejected = await fundRequestRepository.countByUserIdAndStatus(userId, "REJECTED");

    return ApiResponse.success(
      "Fund request statistics retrieved successfully",
      { pending, approved, rejected }
    );
  } catch (error) {
    console.error("Error fetching fund request stats:", error);
    return ApiResponse.error(
      error.message || "Failed to fetch fund request statistics",
      500
    );
  }
};

/**
 * Get fund request statistics for admin
 */
export const getAdminFundRequestStats = async () => {
  try {
    const pending = await fundRequestRepository.countByStatus("PENDING");
    const approved = await fundRequestRepository.countByStatus("APPROVED");
    const rejected = await fundRequestRepository.countByStatus("REJECTED");

    return ApiResponse.success(
      "Fund request statistics retrieved successfully",
      { pending, approved, rejected }
    );
  } catch (error) {
    console.error("Error fetching fund request stats:", error);
    return ApiResponse.error(
      error.message || "Failed to fetch fund request statistics",
      500
    );
  }
};
