import Transaction from "../model/transaction.model.js";
import Wallet from "../../wallet/model/wallet.model.js";
import {
  parsePagination,
  buildPaginationMetadata,
  buildTransactionFilter as buildQueryFilter, // alias preserves all internal call-sites unchanged
} from "../../../utils/queryHelpers.js";

// ---------------------------------------------------------------------------
// Public service method
// ---------------------------------------------------------------------------

/**
 * Fetches paginated, filtered transactions for a given user (by their wallet).
 * Supports: service, status, type, startDate, endDate, search, page, limit.
 *
 * Returns an empty list (never throws) when the user has no wallet yet.
 *
 * @param {string} userId   - MongoDB ObjectId string of the retailer / user
 * @param {Object} options  - Query-string parameters forwarded from the controller
 * @returns {{ transactions: Object[], pagination: Object }}
 */
export const getRetailerTransactions = async (userId, options = {}) => {
  const { page, limit, skip } = parsePagination(options);

  const wallet = await Wallet.findOne({ user: userId }).select("_id").lean();
  if (!wallet) {
    return {
      transactions: [],
      pagination: buildPaginationMetadata(0, page, limit),
    };
  }

  const filter = buildQueryFilter(wallet._id, options);

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .select("-__v")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Transaction.countDocuments(filter),
  ]);

  return {
    transactions,
    pagination: buildPaginationMetadata(total, page, limit),
  };
};

export default { getRetailerTransactions };
