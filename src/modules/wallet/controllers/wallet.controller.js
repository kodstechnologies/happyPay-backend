import ApiResponse from "../../../utils/ApiResponse.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  getUserWalletBalance,
  getSettlementBankInfoService,
  initiateSettlementPayoutService,
  verifyRecipientRetailerService,
  transferRetailerToRetailerService,
  getRecentRetailerSettlementsService,
  getDistributorSettlementInfoService,
  transferRetailerToDistributorService,
  getRecentDistributorSettlementsService,
  payoutSettlementBankList,
} from "../services/wallet.service.js";

/**
 * Controller to get current authenticated user's wallet balance
 * GET /api/v1/wallet/balance
 */
export const getWalletBalanceController = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?.id
  const result = await getUserWalletBalance(userId);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Wallet balance fetched successfully"
    )
  );
});

export const payoutSettlementBankLists = asyncHandler(async (req, res) => {
  const page = req.query.page;
  const limit = req.query.limit;
  const search = req.query.search;

  const result = await payoutSettlementBankList({ page, limit, search });

  return res.status(200).json(
    ApiResponse.success(
      result.data,
      "Bank list fetched successfully",
      result.meta



    )
  );
});

/**
 * Controller to get settlement bank info, all banks, retailer details, and limits
 * GET /api/v1/wallet/settlement/bank-info
 */
export const getSettlementBankInfoController = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?.id
  const result = await getSettlementBankInfoService(userId);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Settlement bank and retailer details fetched successfully"
    )
  );
});

/**
 * Controller to initiate settlement payout to retailer's bank account
 * POST /api/v1/wallet/settlement/payout
 */
export const initiateSettlementPayoutController = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?.id;
  const result = await initiateSettlementPayoutService(userId, req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Settlement payout initiated successfully"
    )
  );
});

/**
 * Controller to verify recipient retailer by mobile number
 * GET /api/v1/wallet/settlement/retailer/verify?mobile=9876543210
 */
export const verifyRetailerSettlementController = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?.id;
  const mobile = req.query?.mobile || req.body?.mobile;
  const result = await verifyRecipientRetailerService(userId, mobile);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Recipient retailer verified successfully"
    )
  );
});

/**
 * Controller to execute atomic P2P settlement transfer to another retailer
 * POST /api/v1/wallet/settlement/retailer/transfer
 */
export const transferRetailerSettlementController = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.body?.userId;
  const result = await transferRetailerToRetailerService(userId, req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "P2P settlement transfer completed successfully"
    )
  );
});

/**
 * Controller to get recent P2P settlements for the authenticated retailer
 * GET /api/v1/wallet/settlement/retailer/recent
 */
export const getRecentRetailerSettlementsController = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.body?.userId;
  const result = await getRecentRetailerSettlementsService(userId);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Recent P2P settlements fetched successfully"
    )
  );
});

/**
 * Controller to get assigned distributor details, status, and wallet info for settlement
 * GET /api/v1/wallet/settlement/distributor/info
 */
export const getDistributorSettlementInfoController = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.body?.userId;
  const result = await getDistributorSettlementInfoService(userId);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Distributor settlement details fetched successfully"
    )
  );
});

/**
 * Controller to execute atomic settlement transfer to assigned distributor
 * POST /api/v1/wallet/settlement/distributor/transfer
 */
export const transferDistributorSettlementController = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.body?.userId;
  const result = await transferRetailerToDistributorService(userId, req.body);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Distributor settlement transfer completed successfully"
    )
  );
});

/**
 * Controller to get recent distributor settlements for the authenticated retailer
 * GET /api/v1/wallet/settlement/distributor/recent
 */
export const getRecentDistributorSettlementsController = asyncHandler(async (req, res) => {
  const userId = req.user?.userId || req.user?.id || req.body?.userId;
  const result = await getRecentDistributorSettlementsService(userId);

  return res.status(200).json(
    ApiResponse.success(
      result,
      "Recent distributor settlements fetched successfully"
    )
  );
});

export default {
  getWalletBalanceController,
  getSettlementBankInfoController,
  initiateSettlementPayoutController,
  verifyRetailerSettlementController,
  transferRetailerSettlementController,
  getRecentRetailerSettlementsController,
  getDistributorSettlementInfoController,
  transferDistributorSettlementController,
  getRecentDistributorSettlementsController,
};



