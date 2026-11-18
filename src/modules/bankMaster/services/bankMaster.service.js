import BankMaster from "../model/bankMaster.model.js";
import { getBankList, payoutSettlementBankList } from "../../external/services/provider.service.js";
import ApiError from "../../../utils/ApiError.js";
import logger from "../../../utils/logger.js";

/**
 * Normalize a bank name for deduplication/matching.
 * Lowercases, replaces non-alphanumeric chars with spaces, collapses whitespace.
 */
export const normalizeName = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Sync bank master from AEPS and payout provider lists.
 * Runs both fetches independently; a failure in one still processes the other.
 * Returns stats: { added, updated, aepsCount, payoutCount, errors }
 */
export const syncBankMasterService = async () => {
  let aepsBanks = [];
  let payoutBanks = [];
  const errors = [];

  // Fetch AEPS bank list
  try {
    const result = await getBankList();
    aepsBanks = Array.isArray(result) ? result : (result?.data || result?.banks || []);
    logger.info(`[BankMaster Sync] AEPS banks fetched: ${aepsBanks.length}`);
  } catch (err) {
    const msg = `AEPS bank list fetch failed: ${err?.message}`;
    logger.error(`[BankMaster Sync] ${msg}`);
    errors.push(msg);
  }

  // Fetch payout bank list
  try {
    const result = await payoutSettlementBankList();
    payoutBanks = Array.isArray(result) ? result : (result?.data || result?.banks || []);
    logger.info(`[BankMaster Sync] Payout banks fetched: ${payoutBanks.length}`);
  } catch (err) {
    const msg = `Payout bank list fetch failed: ${err?.message}`;
    logger.error(`[BankMaster Sync] ${msg}`);
    errors.push(msg);
  }

  let added = 0;
  let updated = 0;

  // Upsert AEPS banks
  for (const bank of aepsBanks) {
    try {
      const { name, bank_id, iin } = bank;
      if (!name) continue;
      const normalized = normalizeName(name);

      const existing = await BankMaster.findOne({ normalizedName: normalized });
      const hasPayout = existing?.payout?.bankCode != null;
      const newSyncSource = hasPayout ? "both" : "aeps";

      const result = await BankMaster.findOneAndUpdate(
        { normalizedName: normalized },
        {
          $set: {
            bankName: name.trim(),
            normalizedName: normalized,
            "aeps.bankId": String(bank_id),
            "aeps.iin": String(iin),
            "aeps.enabled": true,
            syncSource: newSyncSource,
            lastSyncedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (result) {
        // Determine if this was an insert or update
        const wasNew = result.createdAt && result.updatedAt &&
          Math.abs(result.createdAt - result.updatedAt) < 1000 && !existing;
        wasNew ? added++ : updated++;
      }
    } catch (err) {
      const msg = `AEPS upsert failed for bank "${bank?.name}": ${err?.message}`;
      logger.error(`[BankMaster Sync] ${msg}`);
      errors.push(msg);
    }
  }

  // Upsert payout banks
  for (const bank of payoutBanks) {
    try {
      const { description, code } = bank;
      if (!description) continue;
      const normalized = normalizeName(description);

      const existing = await BankMaster.findOne({ normalizedName: normalized });
      const hasAeps = existing?.aeps?.bankId != null;
      const newSyncSource = hasAeps ? "both" : "payout";

      const result = await BankMaster.findOneAndUpdate(
        { normalizedName: normalized },
        {
          $set: {
            bankName: existing?.bankName || description.trim(),
            normalizedName: normalized,
            "payout.bankCode": String(code),
            "payout.enabled": true,
            syncSource: newSyncSource,
            lastSyncedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (result) {
        const wasNew = result.createdAt && result.updatedAt &&
          Math.abs(result.createdAt - result.updatedAt) < 1000 && !existing;
        wasNew ? added++ : updated++;
      }
    } catch (err) {
      const msg = `Payout upsert failed for bank "${bank?.description}": ${err?.message}`;
      logger.error(`[BankMaster Sync] ${msg}`);
      errors.push(msg);
    }
  }

  logger.info(`[BankMaster Sync] Done. added=${added}, updated=${updated}, aepsCount=${aepsBanks.length}, payoutCount=${payoutBanks.length}, errors=${errors.length}`);

  return {
    added,
    updated,
    aepsCount: aepsBanks.length,
    payoutCount: payoutBanks.length,
    errors,
  };
};

/**
 * List banks for admin with pagination and filters.
 */
export const getAdminBankListService = async ({
  search,
  isActive,
  aepsEnabled,
  payoutEnabled,
  page = 1,
  limit = 20,
} = {}) => {
  const filter = {};

  if (search) {
    filter.bankName = { $regex: search, $options: "i" };
  }
  if (isActive !== undefined && isActive !== null && isActive !== "") {
    filter.isActive = isActive === true || isActive === "true";
  }
  if (aepsEnabled !== undefined && aepsEnabled !== null && aepsEnabled !== "") {
    filter["aeps.enabled"] = aepsEnabled === true || aepsEnabled === "true";
  }
  if (payoutEnabled !== undefined && payoutEnabled !== null && payoutEnabled !== "") {
    filter["payout.enabled"] = payoutEnabled === true || payoutEnabled === "true";
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [banks, total] = await Promise.all([
    BankMaster.find(filter).sort({ bankName: 1 }).skip(skip).limit(limitNum).lean(),
    BankMaster.countDocuments(filter),
  ]);

  return {
    banks,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  };
};

/**
 * Update a bank master document (admin).
 * Allowed fields: bankName, aeps.bankId, aeps.iin, aeps.enabled, payout.bankCode, payout.enabled, isActive
 */
export const updateBankService = async (id, patch = {}) => {
  const allowedFields = [
    "bankName",
    "aeps.bankId",
    "aeps.iin",
    "aeps.enabled",
    "payout.bankCode",
    "payout.enabled",
    "isActive",
  ];

  const update = {};
  for (const field of allowedFields) {
    if (patch[field] !== undefined) {
      update[field] = patch[field];
    }
    // Support nested object notation: { aeps: { bankId: ... } }
    const [parent, child] = field.split(".");
    if (child && patch[parent]?.[child] !== undefined) {
      update[field] = patch[parent][child];
    }
  }

  // If bankName changes, update normalizedName too
  if (update.bankName) {
    update.normalizedName = normalizeName(update.bankName);
  }

  const updated = await BankMaster.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw new ApiError(404, "Bank not found");
  }

  return updated;
};

/**
 * Get a single bank master by ID.
 */
export const getBankMasterByIdService = async (id) => {
  const bank = await BankMaster.findById(id);
  if (!bank) {
    throw new ApiError(404, "Bank not found");
  }
  return bank;
};

/**
 * Get active banks for retailer (dropdown list).
 * Returns only _id and bankName.
 */
export const getRetailerBankListService = async () => {
  return BankMaster.find({ isActive: true }).select("_id bankName").sort({ bankName: 1 }).lean();
};

/**
 * Resolve a bank master for AEPS usage.
 * Returns { bankId, iin } or throws ApiError.
 */
export const resolveBankForAeps = async (bankMasterId) => {
  const bank = await BankMaster.findById(bankMasterId);
  if (!bank) {
    throw new ApiError(404, "Bank not found in master");
  }
  if (!bank.isActive || !bank.aeps?.enabled) {
    throw new ApiError(400, "Bank is not enabled for AEPS transactions");
  }
  return {
    bankId: bank.aeps.bankId,
    iin: bank.aeps.iin,
  };
};

/**
 * Resolve a bank master for payout usage.
 * Returns { bankCode } or throws ApiError.
 */
export const resolveBankForPayout = async (bankMasterId) => {
  const bank = await BankMaster.findById(bankMasterId);
  if (!bank) {
    throw new ApiError(404, "Bank not found in master");
  }
  if (!bank.isActive || !bank.payout?.enabled) {
    throw new ApiError(400, "Bank is not enabled for payout transactions");
  }
  return {
    bankCode: bank.payout.bankCode,
  };
};
