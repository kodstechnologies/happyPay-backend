import { asyncHandler } from "../../../utils/asyncHandler.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { findById } from "../../auth/repository/user.repository.js";
import Wallet from "../../wallet/model/wallet.model.js";

/**
 * Lock user wallet directly (Admin action)
 */
export const lockUserWalletController = asyncHandler(async (req, res) => {
  const { userId, reason, adminNotes } = req.body;
  const adminId = req.user?.userId || req.user?.adminId || req.user?.id;

  if (!userId) {
    return res.status(400).json(
      ApiResponse.error("User ID is required", null, null, 400)
    );
  }

  if (!reason || reason.trim() === "") {
    return res.status(400).json(
      ApiResponse.error("Reason is required", null, null, 400)
    );
  }

  // Validate user exists
  const user = await findById(userId);
  if (!user) {
    return res.status(404).json(
      ApiResponse.error("User not found", null, null, 404)
    );
  }

  // Lock the user's wallet (wallet-level field)
  await Wallet.findOneAndUpdate(
    { user: userId },
    {
      $set: {
        isWalletLocked: true,
        lockedAt: new Date(),
        lockedBy: adminId,
        lockReason: reason.trim(),
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Create a lock request record for audit trail
  const walletLockRequestRepository = (await import("../repository/walletLockRequest.repository.js")).default;
  await walletLockRequestRepository.create({
    userId,
    reason: reason.trim(),
    status: "APPROVED",
    reviewedBy: adminId,
    adminNotes: adminNotes || `Wallet locked directly by admin at ${new Date().toISOString()}`,
    reviewedAt: new Date(),
  });

  return res.status(200).json(
    ApiResponse.success(
      {
        userId,
        isLocked: true,
        reason: reason.trim(),
        lockedAt: new Date().toISOString(),
      },
      "Wallet locked successfully"
    )
  );
});

/**
 * Unlock user wallet directly (Admin action)
 */
export const unlockUserWalletController = asyncHandler(async (req, res) => {
  const { userId, adminNotes } = req.body;
  const adminId = req.user?.userId || req.user?.adminId || req.user?.id;

  if (!userId) {
    return res.status(400).json(
      ApiResponse.error("User ID is required", null, null, 400)
    );
  }

  // Validate user exists
  const user = await findById(userId);
  if (!user) {
    return res.status(404).json(
      ApiResponse.error("User not found", null, null, 404)
    );
  }

  // Unlock the user's wallet (wallet-level field)
  await Wallet.findOneAndUpdate(
    { user: userId },
    {
      $set: {
        isWalletLocked: false,
        lockedAt: null,
        lockedBy: null,
        lockReason: null,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // Update the latest approved lock request with unlock notes
  const walletLockRequestRepository = (await import("../repository/walletLockRequest.repository.js")).default;
  const latestLockRequest = await walletLockRequestRepository.findLatestApprovedByUserId(userId);
  if (latestLockRequest) {
    await walletLockRequestRepository.updateById(latestLockRequest._id, {
      adminNotes: adminNotes || `Wallet unlocked by admin at ${new Date().toISOString()}`,
    });
  }

  return res.status(200).json(
    ApiResponse.success(
      {
        userId,
        isLocked: false,
      },
      "Wallet unlocked successfully"
    )
  );
});
