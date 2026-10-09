import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { getUserWalletBalance } from "../services/wallet.service.js";

/**
 * Controller to get current authenticated user's wallet balance
 * GET /api/v1/wallet/balance
 */
export const getWalletBalanceController = asyncHandler(async (req, res) => {
  const userId = req.user?.userId 
  const result = await getUserWalletBalance(userId);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Wallet balance fetched successfully"
    )
  );
});

export default {
  getWalletBalanceController,
};
