import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  listFundRequestBanksService,
  getFundRequestBankByIdService,
  createFundRequestBankService,
  updateFundRequestBankService,
  deleteFundRequestBankService,
} from "../services/fundRequestBank.service.js";

/**
 * GET /admin/fund-requests/banks
 * List all FundRequestBank records.
 */
export const listFundRequestBanksController = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await listFundRequestBanksService({ page, limit });
  return res.status(result.statusCode).json(result);
});

/**
 * GET /admin/fund-requests/banks/:bankId
 * Get a single FundRequestBank record.
 */
export const getFundRequestBankByIdController = asyncHandler(async (req, res) => {
  const result = await getFundRequestBankByIdService(req.params.bankId);
  return res.status(result.statusCode).json(result);
});

/**
 * POST /admin/fund-requests/banks
 * Create a new standalone FundRequestBank record.
 */
export const createFundRequestBankController = asyncHandler(async (req, res) => {
  const { bank, bankCode, ifscCode, accountNumber, branchName } = req.body;
  const result = await createFundRequestBankService({
    bank,
    bankCode,
    ifscCode,
    accountNumber,
    branchName,
  });
  return res.status(result.statusCode).json(result);
});

/**
 * PATCH /admin/fund-requests/banks/:bankId
 * Update bank, ifscCode, accountNumber, or branchName on an existing record.
 */
export const updateFundRequestBankController = asyncHandler(async (req, res) => {
  const result = await updateFundRequestBankService(req.params.bankId, req.body);
  return res.status(result.statusCode).json(result);
});

/**
 * DELETE /admin/fund-requests/banks/:bankId
 * Delete a FundRequestBank record and clear the reference on the parent FundRequest.
 */
export const deleteFundRequestBankController = asyncHandler(async (req, res) => {
  const result = await deleteFundRequestBankService(req.params.bankId);
  return res.status(result.statusCode).json(result);
});
