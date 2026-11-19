import asyncHandler from "../../../utils/asyncHandler.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { getRetailerBankListService } from "../services/bankMaster.service.js";

/**
 * GET /api/v1/banks
 * Returns the list of active banks for retailer use (e.g. bank selection dropdowns).
 */
export const getRetailerBanksController = asyncHandler(async (req, res) => {
  const banks = await getRetailerBankListService();
  return res
    .status(200)
    .json(ApiResponse.success(banks, "Active bank list fetched successfully"));
});
