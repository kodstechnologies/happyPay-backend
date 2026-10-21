import User from "../../auth/model/user.model.js";
import Role from "../../auth/model/role.model.js";
import { escapeRegex } from "../../../utils/queryHelpers.js";

// ---------------------------------------------------------------------------
// Projections
// ---------------------------------------------------------------------------

/** Fields excluded from standard admin retailer list / detail responses. */
const RETAILER_PROJECTION =
  "-refreshTokens -devices -permissions -bank.accountNumber -bank.confirmAccountNumber";

/**
 * Fields selected for sub-retailer rows (no sensitive account data —
 * account numbers are masked at the service layer before being sent to the client).
 */
const SUB_RETAILER_PROJECTION =
  "fullName email mobile panNumber status adminApproved registrationStatus shop banks createdAt aadhaarVerified";

// ---------------------------------------------------------------------------
// Retailer queries
// ---------------------------------------------------------------------------

const listRetailers = async ({ page = 1, limit = 20, search, status, kycStatus }) => {
  const query = {};

  if (status) {
    if (status === "distributor") {
      const distributorRole = await Role.findOne({ slug: "distributor" }).select("_id").lean();
      if (distributorRole) {
        query.roles = distributorRole._id;
      } else {
        query.$or = [{ role: "distributor" }, { roles: { $exists: true, $ne: [] } }];
      }
    } else if (["approved", "pending", "rejected"].includes(status)) {
      query.$or = [{ adminApproved: status }, { kycStatus: status }];
    } else if (["active", "suspended", "blocked"].includes(status)) {
      query.status = status;
    }
  }

  if (kycStatus) {
    query.$or = [{ kycStatus }, { adminApproved: kycStatus }];
  }

  if (search && String(search).trim()) {
    const escaped = escapeRegex(String(search).trim().slice(0, 100));
    const regex = { $regex: escaped, $options: "i" };
    query.$or = [
      { fullName: regex },
      { email: regex },
      { mobile: regex },
      { panNumber: regex },
      { "shop.name": regex },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(query)
      .select(RETAILER_PROJECTION)
      .populate("roles", "name slug")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return {
    items: items.map((item) => {
      const roleSlug = item.roles?.[0]?.slug || item.role || "retailer";
      return {
        ...item,
        id: item._id.toString(),
        role: roleSlug,
        panCard: item.panNumber || item.panCard || "-",
        status: item.status || "active",
        kycStatus: item.adminApproved || item.kycStatus || "pending",
      };
    }),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

const findRetailerById = (id) =>
  User.findById(id).select(RETAILER_PROJECTION).lean();

const updateRetailerKyc = (id, kycData) =>
  User.findByIdAndUpdate(id, kycData, { new: true });

const updateRetailerAccountStatus = (id, updateData) =>
  User.findByIdAndUpdate(id, updateData, { new: true })
    .select(RETAILER_PROJECTION)
    .lean();

// ---------------------------------------------------------------------------
// Sub-retailer lookup for distributor detail page
// ---------------------------------------------------------------------------

/**
 * Returns a paginated list of retailers whose `ditributor` field matches the
 * given `distributorId`. Supports optional search (fullName, email, mobile)
 * and scalar filters (status, adminApproved).
 *
 * NOTE: The field is intentionally spelled `ditributor` to match the existing
 * User schema (see user.model.js line ~248).
 *
 * @param {string} distributorId - MongoDB ObjectId string
 * @param {{
 *   skip?: number,
 *   limit?: number,
 *   search?: string,
 *   status?: string,
 *   adminApproved?: string
 * }} opts
 * @returns {{ items: Object[], total: number }}
 */
const findRetailersByDistributor = async (
  distributorId,
  { skip = 0, limit = 10, search, status, adminApproved } = {}
) => {
  const query = { ditributor: distributorId };

  if (status) query.status = status;
  if (adminApproved) query.adminApproved = adminApproved;

  if (search && String(search).trim().length > 0) {
    const escaped = escapeRegex(String(search).trim().slice(0, 100));
    const regex = { $regex: escaped, $options: "i" };
    query.$or = [{ fullName: regex }, { email: regex }, { mobile: regex }];
  }

  const [items, total] = await Promise.all([
    User.find(query)
      .select(SUB_RETAILER_PROJECTION)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return {
    items: items.map((u) => ({ ...u, id: u._id.toString() })),
    total,
  };
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  listRetailers,
  findRetailerById,
  updateRetailerKyc,
  updateRetailerAccountStatus,
  findRetailersByDistributor,
};
