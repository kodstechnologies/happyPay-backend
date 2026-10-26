import { asyncHandler } from '../../../utils/asyncHandler.js';
import ApiResponse from "../../../utils/ApiResponse.js";
import {
  forgotAdminPassword,
  loginAdmin,
  logoutAdmin,
  getAdminProfile,
  registerAdmin,
  resetAdminPassword,
  getRetailer,
  getRetailers,
  updateRetailerKycStatus,
  listAdminAuditLogs,
  getAdminRetailerTransactions,
  getAdminDistributorSubRetailers,
  setRetailerAccountStatus,
  listAllTransactionsAdmin,
  updateAdminDeviceToken,
} from "../services/admin.service.js";

export const register = asyncHandler(async (req, res) => {
  const admin = await registerAdmin(req.body, req);
    return res.status(201).json(ApiResponse.success({ admin }, "Admin registered successfully"));
});

export const login = asyncHandler(async (req, res) => {
  const data = await loginAdmin(req.body, req);
    return res.status(200).json(ApiResponse.success(data, "Admin login successful"));
});

export const logout = asyncHandler(async (req, res) => {
  const adminId = req.user?.adminId || req.user?.userId || req.user?.id;
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  const result = await logoutAdmin(adminId, token, req);
  return res.status(200).json(ApiResponse.success(result, "Admin logged out successfully"));
});

export const updateDeviceToken = asyncHandler(async (req, res) => {
  const adminId = req.user?.adminId || req.user?.userId || req.user?.id;
  const result = await updateAdminDeviceToken(adminId, req.body);
  return res.status(200).json(ApiResponse.success(result, "Device token updated successfully"));
});

export const getProfile = asyncHandler(async (req, res) => {
  const adminId = req.user?.adminId || req.user?.userId || req.user?.id;
  const profile = await getAdminProfile(adminId);
  return res.status(200).json(ApiResponse.success(profile, "Admin profile fetched successfully"));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const data = await forgotAdminPassword(req.body);
    return res.status(200).json(ApiResponse.success(data, data.message));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const data = await resetAdminPassword(req.body);
    return res.status(200).json(ApiResponse.success(data, data.message));
});


export const list = asyncHandler(async (req, res) => {
  return res.status(200).json(ApiResponse.success(await getRetailers(req.query), "Retailers fetched successfully"));
});

export const detail = asyncHandler(async (req, res) => {
  return res.status(200).json(ApiResponse.success(await getRetailer(req.params.id), "Retailer fetched successfully"));
});

export const updateKyc = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
    const result = await updateRetailerKycStatus(req.params.id, status, reason);
    return res.status(200).json(ApiResponse.success(result, "Retailer KYC updated successfully"));
});

export const getAuditLogs = asyncHandler(async (req, res) => {
  const result = await listAdminAuditLogs(req.query);
    return res.status(200).json(ApiResponse.success(result, "Audit logs fetched successfully"));
});

/**
 * GET /api/admin/retailers/:id/transactions
 *
 * Returns paginated, filtered transactions for a specific retailer.
 * All filter params are forwarded from query-string (service, status, type,
 * startDate, endDate, search, page, limit).
 */
export const getRetailerTransactionsAdmin = asyncHandler(async (req, res) => {
  const result = await getAdminRetailerTransactions(req.params.id, req.query);
  return res.status(200).json(
    ApiResponse.success(result, "Retailer transactions fetched successfully")
  );
});

/**
 * GET /api/admin/retailers/:id/sub-retailers
 *
 * Returns a paginated list of retailers under a distributor, enriched with
 * live transaction statistics (count + volume of successful transactions).
 * Filter params: search, status, adminApproved, page, limit.
 */
export const getDistributorSubRetailersAdmin = asyncHandler(async (req, res) => {
  const result = await getAdminDistributorSubRetailers(req.params.id, req.query);
  return res.status(200).json(
    ApiResponse.success(result, "Sub-retailers fetched successfully")
  );
});

/**
 * PATCH /api/admin/retailers/:id/status
 *
 * Updates a retailer's account/approval status (e.g., approved, blocked, rejected).
 */
export const updateAccountStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  const result = await setRetailerAccountStatus(req.params.id, status, reason);
  return res.status(200).json(ApiResponse.success(result, result.message));
});

/**
 * GET /api/admin/transactions
 *
 * Returns paginated, filtered transactions across all retailers.
 * Query params: service, status, type, startDate, endDate, search, page, limit.
 */
export const getAllTransactionsAdmin = asyncHandler(async (req, res) => {
  const result = await listAllTransactionsAdmin(req.query);
  return res.status(200).json(
    ApiResponse.success(result, "Transactions fetched successfully")
  );
});
