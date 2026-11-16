import {
  createAuditLog,
  findAuditLogs,
  findAuditLogById,
  deleteAuditLog,
  deleteAuditLogsByDateRange,
} from "../repository/auditLog.repository.js";

const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/**
 * Create a new audit log entry
 */
const createAuditLogService = async (data) => {
  const auditLog = await createAuditLog(data);
  return auditLog;
};

/**
 * Get paginated audit logs with filters
 */
const getAuditLogsService = async ({
  page = 1,
  limit = 20,
  search = "",
  action = "",
  fromDate = null,
  toDate = null,
} = {}) => {
  const result = await findAuditLogs({
    page,
    limit,
    search,
    action,
    fromDate,
    toDate,
  });

  return {
    data: result.logs.map((log) => ({
      id: log._id,
      adminId: log.adminId,
      userName: log.userName,
      role: log.role,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      description: log.description,
      ipAddress: log.ipAddress,
      createdBy: log.createdBy,
      updatedBy: log.updatedBy,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    })),
    meta: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  };
};

/**
 * Get a single audit log by ID
 */
const getAuditLogByIdService = async (id) => {
  const log = await findAuditLogById(id);

  if (!log) {
    throw fail(404, "Audit log not found");
  }

  return {
    id: log._id,
    adminId: log.adminId,
    userName: log.userName,
    role: log.role,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    description: log.description,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdBy: log.createdBy,
    updatedBy: log.updatedBy,
    createdAt: log.createdAt,
    updatedAt: log.updatedAt,
  };
};

/**
 * Delete a single audit log
 */
const deleteAuditLogService = async (id) => {
  const log = await findAuditLogById(id);

  if (!log) {
    throw fail(404, "Audit log not found");
  }

  await deleteAuditLog(id);

  return { message: "Audit log deleted successfully" };
};

/**
 * Delete audit logs by date range
 */
const deleteAuditLogsByDateRangeService = async (fromDate, toDate) => {
  const result = await deleteAuditLogsByDateRange(fromDate, toDate);

  return {
    message: `Deleted ${result.deletedCount} audit logs`,
    deletedCount: result.deletedCount,
  };
};

/**
 * Helper function to log admin actions (to be called from other services)
 */
const logAdminAction = async ({
  adminId,
  userName,
  role,
  action,
  entity,
  entityId = null,
  description,
  ipAddress = null,
  userAgent = null,
}) => {
  try {
    await createAuditLog({
      adminId,
      userName,
      role,
      action,
      entity,
      entityId,
      description,
      ipAddress,
      userAgent,
      createdBy: { name: userName, role },
      updatedBy: { name: userName, role },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
    // Don't throw error - audit logging should not break the main operation
  }
};

export {
  createAuditLogService,
  getAuditLogsService,
  getAuditLogByIdService,
  deleteAuditLogService,
  deleteAuditLogsByDateRangeService,
  logAdminAction,
};
