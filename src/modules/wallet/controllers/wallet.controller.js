import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  getUserWalletBalance,
  getSettlementBankInfoService,
} from "../services/wallet.service.js";

/**
 * Controller to get current authenticated user's wallet balance
 * GET /api/v1/wallet/balance
 */
export const getWalletBalanceController = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.body?.userId;
  const result = await getUserWalletBalance(userId);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Wallet balance fetched successfully"
    )
  );
});

/**
 * Controller to get settlement bank info, all banks, retailer details, and limits
 * GET /api/v1/wallet/settlement/bank-info
 */
export const getSettlementBankInfoController = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.body?.userId;
  const result = await getSettlementBankInfoService(userId);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Settlement bank and retailer details fetched successfully"
    )
  );
});

export default {
  getWalletBalanceController,
  getSettlementBankInfoController,
};

