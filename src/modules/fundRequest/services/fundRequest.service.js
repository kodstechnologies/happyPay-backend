import ApiResponse from "../../../utils/ApiResponse.js";
import fundRequestRepository from "../repository/fundRequest.repository.js";
import { findById } from "../../auth/repository/user.repository.js";
import FundRequestBank from "../model/fundRequestBank.model.js";
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

    let bankDocId;

    if (data.bankId) {
      // ── Path A: retailer selected a pre-existing FundRequestBank ──────────
      const existing = await FundRequestBank.findById(data.bankId);
      if (!existing) {
        return ApiResponse.error("Selected bank record not found", 404);
      }
      bankDocId = existing._id;
    } else {
      // ── Path B: flat bank fields provided — create a new bank doc ─────────
      const bankDoc = await FundRequestBank.create({
        bank: data.bank,
        bankCode: data.bankCode || null,
        ifscCode: String(data.ifscCode || "").trim().toUpperCase(),
        accountNumber: data.accountNumber,
        branchName: data.branchName,
      });
      bankDocId = bankDoc._id;

      // Back-fill fundRequestId after the fund request is saved (see below)
      data._newBankDoc = bankDoc;
    }

    // Build the fund request payload without the flat bank / bankId fields
    const { bank, bankCode, ifscCode, accountNumber, branchName, bankId, _newBankDoc, ...fundRequestData } = data;
    fundRequestData.bankDetails = bankDocId;

    const fundRequest = await fundRequestRepository.create(fundRequestData);

    // Back-fill fundRequestId on a newly created bank doc
    if (data._newBankDoc) {
      data._newBankDoc.fundRequestId = fundRequest._id;
      await data._newBankDoc.save();
    }

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
      fundRequest,
      "Fund request created successfully",
      null,
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
      fundRequest,
      "Fund request retrieved successfully"
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
      {
        requests: result.requests,
        pagination: result.pagination,
        counts: {
          pending,
          approved,
          rejected,
          total: pending + approved + rejected,
        },
      },
      "Fund requests retrieved successfully"
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
      fundRequests,
      "Fund requests retrieved successfully"
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
      fundRequests,
      "Fund requests retrieved successfully"
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
      fundRequests,
      "Pending fund requests retrieved successfully"
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
 * Note: This changes status to APPROVED and credits the wallet immediately.
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
        null, // no razorpay_order_id — fund requests are manually approved
        null, // no razorpay_payment_id
        fundRequest._id, // referenceKey - use fund request ID
        `Fund Request Approved - ${fundRequest.paymentMode} payment via ${fundRequest.bank}`,
        "FUND_REQUEST" // service — not a Razorpay payment
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
      return ApiResponse.error(
        walletError.message || "Failed to credit wallet after approval",
        500
      );
    }

    // Update status to APPROVED
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
      updatedRequest,
      "Fund request approved successfully. Amount credited to wallet."
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
      updatedRequest,
      "Fund request rejected successfully"
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
    const { bank, bankCode, ifscCode, accountNumber, branchName, bankId, ...otherUpdateData } = updateData;

    const updateFields = {
      ...otherUpdateData,
      status: "PENDING",
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
      adminNotes: null,
    };

    if (bankId) {
      // Retailer selected a pre-existing FundRequestBank — link it directly
      const existing = await FundRequestBank.findById(bankId);
      if (!existing) {
        return ApiResponse.error("Selected bank record not found", 404);
      }
      updateFields.bankDetails = existing._id;
    } else {
      // Flat bank fields provided — update (or create) the linked bank doc
      const hasBankUpdate = bank || bankCode || ifscCode || accountNumber || branchName;
      if (hasBankUpdate && fundRequest.bankDetails) {
        const bankPatch = {};
        if (bank) bankPatch.bank = bank;
        if (bankCode !== undefined) bankPatch.bankCode = bankCode || null;
        if (ifscCode) bankPatch.ifscCode = String(ifscCode).trim().toUpperCase();
        if (accountNumber) bankPatch.accountNumber = accountNumber;
        if (branchName) bankPatch.branchName = branchName;
        await FundRequestBank.findByIdAndUpdate(
          fundRequest.bankDetails,
          { $set: bankPatch },
          { runValidators: true }
        );
      } else if (hasBankUpdate && !fundRequest.bankDetails) {
        // No existing bank doc (old record) — create one and link it
        const newBankDoc = await FundRequestBank.create({
          fundRequestId: fundRequest._id,
          bank: bank || "",
          bankCode: bankCode || null,
          ifscCode: ifscCode ? String(ifscCode).trim().toUpperCase() : "",
          accountNumber: accountNumber || "",
          branchName: branchName || "",
        });
        updateFields.bankDetails = newBankDoc._id;
      }
    }

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
      updatedRequest,
      "Fund request resubmitted successfully"
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
      null,
      "Fund request deleted successfully"
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
      { pending, approved, rejected },
      "Fund request statistics retrieved successfully"
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
      { pending, approved, rejected },
      "Fund request statistics retrieved successfully"
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
 * Get all FundRequestBank records (the bank list shown when creating a fund request).
 */
export const getRetailerBankListService = async (userId) => {
  try {
    if (!userId) {
      return ApiResponse.error("User ID is required", 400);
    }

    const banks = await FundRequestBank.find({})
      .sort({ createdAt: -1 })
      .lean();

    return ApiResponse.success(banks, "Bank list fetched successfully");
  } catch (error) {
    console.error("Error fetching bank list:", error);
    return ApiResponse.error(error.message || "Failed to fetch bank list", 500);
  }
};