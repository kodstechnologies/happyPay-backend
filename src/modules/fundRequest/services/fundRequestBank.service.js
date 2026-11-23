import FundRequestBank from "../model/fundRequestBank.model.js";
import ApiResponse from "../../../utils/ApiResponse.js";

const fail = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

/**
 * List all FundRequestBank documents with pagination.
 */
export const listFundRequestBanksService = async ({ page = 1, limit = 20 } = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [docs, total] = await Promise.all([
    FundRequestBank.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    FundRequestBank.countDocuments({}),
  ]);

  return ApiResponse.success(docs, "Fund request bank records fetched successfully", {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  });
};

/**
 * Get a single FundRequestBank by its _id.
 */
export const getFundRequestBankByIdService = async (id) => {
  if (!id || !/^[a-f\d]{24}$/i.test(String(id))) {
    throw fail(400, "Invalid bank record ID");
  }

  const doc = await FundRequestBank.findById(id);

  if (!doc) throw fail(404, "Fund request bank record not found");

  return ApiResponse.success(doc, "Fund request bank record fetched successfully");
};

/**
 * Create a standalone FundRequestBank record.
 */
export const createFundRequestBankService = async ({ bank, bankCode, ifscCode, accountNumber, branchName }) => {
  const doc = await FundRequestBank.create({
    bank: String(bank || "").trim(),
    bankCode: bankCode ? String(bankCode).trim() : null,
    ifscCode: String(ifscCode || "").trim().toUpperCase(),
    accountNumber: String(accountNumber || "").trim(),
    branchName: String(branchName || "").trim(),
  });

  return ApiResponse.success(doc, "Fund request bank record created successfully", null, 201);
};

/**
 * Update an existing FundRequestBank by its _id.
 * Only the four editable fields are accepted.
 */
export const updateFundRequestBankService = async (id, patch = {}) => {
  if (!id || !/^[a-f\d]{24}$/i.test(String(id))) {
    throw fail(400, "Invalid bank record ID");
  }

  const allowedFields = ["bank", "bankCode", "ifscCode", "accountNumber", "branchName"];
  const update = {};
  for (const field of allowedFields) {
    if (patch[field] !== undefined) {
      update[field] =
        field === "ifscCode"
          ? String(patch[field]).trim().toUpperCase()
          : field === "bankCode"
            ? String(patch[field]).trim() || null
            : String(patch[field]).trim();
    }
  }

  if (Object.keys(update).length === 0) {
    throw fail(400, "No valid fields provided to update. Allowed: bank, ifscCode, accountNumber, branchName");
  }

  const doc = await FundRequestBank.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true }
  );

  if (!doc) throw fail(404, "Fund request bank record not found");

  return ApiResponse.success(doc, "Fund request bank record updated successfully");
};

/**
 * Delete a FundRequestBank by its _id.
 */
export const deleteFundRequestBankService = async (id) => {
  if (!id || !/^[a-f\d]{24}$/i.test(String(id))) {
    throw fail(400, "Invalid bank record ID");
  }

  const doc = await FundRequestBank.findById(id);
  if (!doc) throw fail(404, "Fund request bank record not found");

  await FundRequestBank.findByIdAndDelete(id);

  return ApiResponse.success(null, "Fund request bank record deleted successfully");
};
