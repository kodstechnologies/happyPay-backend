import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  getAuditLogsService,
  getAuditLogByIdService,
  deleteAuditLogService,
  deleteAuditLogsByDateRangeService,
} from "../services/auditLog.services.js";
import ApiResponse from "../../../utils/ApiResponse.js";

/**
 * GET /api/v1/auth/admin/audit-logs
 * Get paginated audit logs with filters
 */
export const getAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const search = req.query.search || "";
  const action = req.query.action || "";
  const fromDate = req.query.fromDate || null;
  const toDate = req.query.toDate || null;

  const result = await getAuditLogsService({
    page,
    limit,
    search,
    action,
    fromDate,
    toDate,
  });

  return res
    .status(200)
    .json(
      ApiResponse.success(
        result.data,
        "Audit logs fetched successfully",
        result.meta
      )
    );
});

/**
 * GET /api/v1/auth/admin/audit-logs/:id
 * Get a single audit log by ID
 */
export const getAuditLogById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const log = await getAuditLogByIdService(id);

  return res
    .status(200)
    .json(ApiResponse.success(log, "Audit log fetched successfully"));
});

/**
 * DELETE /api/v1/auth/admin/audit-logs/:id
 * Delete a single audit log
 */
export const deleteAuditLog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await deleteAuditLogService(id);

  return res
    .status(200)
    .json(ApiResponse.success(result, "Audit log deleted successfully"));
});

/**
 * DELETE /api/v1/auth/admin/audit-logs/bulk
 * Delete audit logs by date range
 */
export const deleteAuditLogsByDateRange = asyncHandler(async (req, res) => {
  const { fromDate, toDate } = req.body;

  if (!fromDate && !toDate) {
    return res
      .status(400)
      .json(ApiResponse.error("At least one date (fromDate or toDate) is required"));
  }

  const result = await deleteAuditLogsByDateRangeService(fromDate, toDate);

  return res
    .status(200)
    .json(ApiResponse.success(result, "Audit logs deleted successfully"));
});
