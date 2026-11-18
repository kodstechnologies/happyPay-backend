import asyncHandler from "../../../utils/asyncHandler.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import ApiError from "../../../utils/ApiError.js";
import {
  getAdminBankListService,
  getBankMasterByIdService,
  updateBankService,
  syncBankMasterService,
} from "../services/bankMaster.service.js";

/**
 * GET /api/admin/banks
 * List banks with pagination and filters.
 */
export const listBanksController = asyncHandler(async (req, res) => {
  const { search, isActive, aepsEnabled, payoutEnabled, page, limit } = req.query;

  const result = await getAdminBankListService({
    search,
    isActive,
    aepsEnabled,
    payoutEnabled,
    page,
    limit,
  });

  const { banks, ...meta } = result;

  return res
    .status(200)
    .json(ApiResponse.success(banks, "Bank list fetched successfully", meta));
});

/**
 * GET /api/admin/banks/:id
 * Get a single bank master.
 */
export const getBankController = asyncHandler(async (req, res) => {
  const bank = await getBankMasterByIdService(req.params.id);
  return res
    .status(200)
    .json(ApiResponse.success(bank, "Bank details fetched successfully"));
});

/**
 * PATCH /api/admin/banks/:id
 * Update allowed fields on a bank master.
 */
export const updateBankController = asyncHandler(async (req, res) => {
  const bank = await updateBankService(req.params.id, req.body);
  return res
    .status(200)
    .json(ApiResponse.success(bank, "Bank updated successfully"));
});

/**
 * PATCH /api/admin/banks/:id/status
 * Toggle global isActive status.
 */
export const toggleGlobalStatusController = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  if (isActive === undefined) {
    throw new ApiError(400, "isActive field is required");
  }
  const bank = await updateBankService(req.params.id, { isActive });
  return res
    .status(200)
    .json(ApiResponse.success(bank, "Bank global status updated successfully"));
});

/**
 * PATCH /api/admin/banks/:id/aeps-status
 * Toggle AEPS enabled status.
 */
export const toggleAepsStatusController = asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  if (enabled === undefined) {
    throw new ApiError(400, "enabled field is required");
  }
  const bank = await updateBankService(req.params.id, { "aeps.enabled": enabled });
  return res
    .status(200)
    .json(ApiResponse.success(bank, "Bank AEPS status updated successfully"));
});

/**
 * PATCH /api/admin/banks/:id/payout-status
 * Toggle payout enabled status.
 */
export const togglePayoutStatusController = asyncHandler(async (req, res) => {
  const { enabled } = req.body;
  if (enabled === undefined) {
    throw new ApiError(400, "enabled field is required");
  }
  const bank = await updateBankService(req.params.id, { "payout.enabled": enabled });
  return res
    .status(200)
    .json(ApiResponse.success(bank, "Bank payout status updated successfully"));
});

/**
 * POST /api/admin/banks/sync
 * Sync bank master from AEPS and payout providers.
 */
export const syncBanksController = asyncHandler(async (req, res) => {
  const stats = await syncBankMasterService();
  return res
    .status(200)
    .json(ApiResponse.success(stats, "Bank master sync completed"));
});
