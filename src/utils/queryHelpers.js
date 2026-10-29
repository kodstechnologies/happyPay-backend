/**
 * Shared query helpers — pagination, date-range parsing, and transaction filter building.
 *
 * Consumed by:
 *   - src/modules/transaction/service/transaction.service.js  (retailer-facing)
 *   - src/modules/admin/services/admin.service.js              (admin-facing)
 *   - src/modules/admin/repository/adminRetailer.repository.js
 *
 * Centralising these helpers eliminates code duplication while keeping each
 * consuming module's public API and behaviour fully unchanged.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGINATION_DEFAULTS = Object.freeze({
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
  MAX_SEARCH_LENGTH: 100,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escapes regex special characters to prevent ReDoS / malformed expressions.
 * @param {string} str
 * @returns {string}
 */
const escapeRegex = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Parses and clamps `page` / `limit` query-string parameters.
 *
 * @param {{ page?: string|number, limit?: string|number }} options
 * @returns {{ page: number, limit: number, skip: number }}
 */
const parsePagination = (options = {}) => {
  const page = Math.max(
    1,
    Number.parseInt(options.page, 10) || PAGINATION_DEFAULTS.PAGE
  );
  const limit = Math.min(
    PAGINATION_DEFAULTS.MAX_LIMIT,
    Math.max(1, Number.parseInt(options.limit, 10) || PAGINATION_DEFAULTS.LIMIT)
  );
  return { page, limit, skip: (page - 1) * limit };
};

/**
 * Parses start/end date strings into a MongoDB `$gte` / `$lte` filter fragment.
 *
 * - startDate is clamped to 00:00:00.000 of that day.
 * - endDate   is clamped to 23:59:59.999 of that day.
 *
 * @param {string} [startDate]  ISO date string, e.g. "2026-01-01"
 * @param {string} [endDate]    ISO date string, e.g. "2026-12-31"
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

/**
 * Builds a standard cursor-pagination metadata object.
 *
 * @param {number} total   - Total matching documents in DB
 * @param {number} page    - Current page (1-based)
 * @param {number} limit   - Page size
 * @returns {{ total: number, page: number, limit: number, totalPages: number, hasNextPage: boolean, hasPrevPage: boolean }}
 */
const buildPaginationMetadata = (total, page, limit) => {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Builds a MongoDB filter for Transaction documents scoped to a single wallet.
 * Supports: service, status, type, date-range, and free-text search.
 *
 * The outer `$or` wrapping the wallet condition is kept intentionally to allow
 * callers to later extend the filter with additional `$or` branches if needed.
 *
 * @param {import("mongoose").Types.ObjectId} walletId
 * @param {{ service?: string, status?: string, type?: string, startDate?: string, endDate?: string, search?: string }} options
 * @returns {Object}
 */
const buildTransactionFilter = (walletId, options = {}) => {
  const { service, status, type, startDate, endDate, search } = options;

  const filter = walletId ? { $or: [{ wallet: walletId }] } : {};

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
    const sanitized = escapeRegex(
      search.trim().slice(0, PAGINATION_DEFAULTS.MAX_SEARCH_LENGTH)
    );
    const regex = new RegExp(sanitized, "i");

    filter.$and = [
      {
        $or: [
          { transactionId: regex },
          { referenceKey: regex },
          { referenceId: regex },
          { description: regex },
          { razorpay_payment_id: regex },
          { razorpay_order_id: regex },
          { "payee.accountHolderName": regex },
          { "payee.name": regex },
          { "payee.accountNumber": regex },
          { "payee.mobile": regex },
          { "payee.shopName": regex },
          { "payee.bankName": regex },
          { "payee.aadharNumber": regex },
          { "payee.ifscCode": regex },
        ],
      },
    ];
  }

  return filter;
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  PAGINATION_DEFAULTS,
  escapeRegex,
  parsePagination,
  parseDateRange,
  buildPaginationMetadata,
  buildTransactionFilter,
};
