import Transaction from "../model/transaction.model.js";
import Wallet from "../../wallet/model/wallet.model.js";
import { ApiError } from "../../../utils/ApiError.js";

// Constants for pagination and query limits
const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
  MAX_SEARCH_LENGTH: 100,
};

/**
 * Escapes regex special characters to prevent ReDoS or malformed expressions
 * @param {string} str
 * @returns {string}
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Sanitizes and parses pagination parameters
 * @param {Object} options
 * @returns {{ page: number, limit: number, skip: number }}
 */
const parsePagination = (options = {}) => {
  const page = Math.max(
    1,
    Number.parseInt(options.page, 10) || PAGINATION_DEFAULTS.PAGE
  );
  const rawLimit =
    Number.parseInt(options.limit, 10) || PAGINATION_DEFAULTS.LIMIT;
  const limit = Math.min(
    PAGINATION_DEFAULTS.MAX_LIMIT,
    Math.max(1, rawLimit)
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Parses and validates date range boundaries for MongoDB queries
 * @param {string} [startDate]
 * @param {string} [endDate]
 * @returns {Object|null}
 */
const parseDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) return null;

  const dateFilter = {};

  if (startDate) {
    const start = new Date(startDate);
    if (!Number.isNaN(start.getTime())) {
      start.setHours(0, 0, 0, 0);
      dateFilter.$gte = start;
    }
  }

  if (endDate) {
    const end = new Date(endDate);
    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
  }

  return Object.keys(dateFilter).length > 0 ? dateFilter : null;
};


const buildQueryFilter = (walletId, options = {}) => {
  const { service, status, type, startDate, endDate, search } = options;

 
  const filter = {
    $or: [{ wallet: walletId }]
  };

  if (service && service !== "ALL") {
    filter.service = String(service).trim().toUpperCase();
  }

  if (status && status !== "ALL") {
    filter.status = String(status).trim().toLowerCase();
  }

  if (type && type !== "ALL") {
    filter.type = String(type).trim().toLowerCase();
  }

  const createdAtRange = parseDateRange(startDate, endDate);
  if (createdAtRange) {
    filter.createdAt = createdAtRange;
  }

  if (search && typeof search === "string" && search.trim().length > 0) {
    const sanitizedSearch = escapeRegex(
      search.trim().slice(0, PAGINATION_DEFAULTS.MAX_SEARCH_LENGTH)
    );
    const searchRegex = new RegExp(sanitizedSearch, "i");

    filter.$and = [
      {
        $or: [
          { transactionId: searchRegex },
          { referenceKey: searchRegex },
          { referenceId: searchRegex },
          { description: searchRegex },
          { razorpay_payment_id: searchRegex },
          { razorpay_order_id: searchRegex },
          { "payee.accountHolderName": searchRegex },
          { "payee.accountNumber": searchRegex },
          { "payee.bankName": searchRegex },
          { "payee.aadharNumber": searchRegex },
          { "payee.ifscCode": searchRegex },
        ],
      },
    ];
  }

  return filter;
};


const buildPaginationMetadata = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};


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

export default {
  getRetailerTransactions,
};
