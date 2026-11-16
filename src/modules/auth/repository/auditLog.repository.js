import AuditLog from "../model/auditLog.model.js";

const createAuditLog = async (data) => {
  return await AuditLog.create(data);
};

const findAuditLogs = async ({
  page = 1,
  limit = 20,
  search = "",
  action = "",
  fromDate = null,
  toDate = null,
} = {}) => {
  const query = {};

  // Search filter
  if (search) {
    const searchRegex = new RegExp(search, "i");
    query.$or = [
      { userName: searchRegex },
      { action: searchRegex },
      { entity: searchRegex },
      { description: searchRegex },
    ];
  }

  // Action filter
  if (action) {
    query.action = action;
  }

  // Date range filter
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) {
      query.createdAt.$gte = new Date(fromDate);
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      query.createdAt.$lte = to;
    }
  }

  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query),
  ]);

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const findAuditLogById = async (id) => {
  return await AuditLog.findById(id).lean();
};

const deleteAuditLog = async (id) => {
  return await AuditLog.findByIdAndDelete(id);
};

const deleteAuditLogsByDateRange = async (fromDate, toDate) => {
  const query = {};
  if (fromDate) {
    query.createdAt = { $gte: new Date(fromDate) };
  }
  if (toDate) {
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    query.createdAt = query.createdAt || {};
    query.createdAt.$lte = to;
  }

  return await AuditLog.deleteMany(query);
};

export {
  createAuditLog,
  findAuditLogs,
  findAuditLogById,
  deleteAuditLog,
  deleteAuditLogsByDateRange,
};
