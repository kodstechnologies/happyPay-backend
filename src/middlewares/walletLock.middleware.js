import { findById } from "../modules/auth/repository/user.repository.js";

/**
 * Middleware to check if user's wallet is locked
 * Returns 403 if wallet is locked
 */
export const checkWalletLock = async (req, res, next) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
        statusCode: 401,
      });
    }

    const user = await findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        statusCode: 404,
      });
    }

    if (user.isWalletLocked) {
      return res.status(403).json({
        success: false,
        message: "Your wallet is locked. Please contact support for assistance.",
        statusCode: 403,
      });
    }

    next();
  } catch (error) {
    console.error("Error checking wallet lock status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check wallet lock status",
      statusCode: 500,
    });
  }
};
