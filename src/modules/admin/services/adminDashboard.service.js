import User from "../../auth/model/user.model.js";
import Role from "../../auth/model/role.model.js";
import Transaction from "../../transaction/model/transaction.model.js";
import Wallet from "../../wallet/model/wallet.model.js";

/**
 * Formats a Date object or ISO string into readable date and time string: "DD MMM YYYY, hh:mm A"
 * @param {Date|string} dateInput
 * @returns {string}
 */
const formatDateTime = (dateInput) => {
  if (!dateInput) return "--";
  const dateObj = new Date(dateInput);
  if (Number.isNaN(dateObj.getTime())) return "--";

  const date = dateObj.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  const time = dateObj.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  return `${date}, ${time}`;
};

/**
 * Normalizes transaction status to standard UI values: "Success" | "Pending" | "Failed"
 * @param {string} status
 * @returns {"Success" | "Pending" | "Failed"}
 */
const normalizeStatus = (status) => {
  const lower = String(status || "").toLowerCase();
  if (lower === "success") return "Success";
  if (lower === "pending") return "Pending";
  return "Failed";
};

/**
 * Normalizes service string for UI display: "AEPS" | "DMT" | "CMS"
 * @param {string} service
 * @returns {string}
 */
const normalizeService = (service) => {
  const upper = String(service || "").toUpperCase();
  if (upper.includes("AEPS") || upper.includes("AADHAAR")) return "AEPS";
  if (upper.includes("DMT")) return "DMT";
  if (upper.includes("CMS") || upper.includes("BBPS") || upper.includes("UPI")) return "CMS";
  return upper || "AEPS";
};

/**
 * Service to fetch all required Admin Dashboard metrics in an optimized, scalable single call:
 * 1. User & Retailer statistics (Total retailers, distributors, pending KYC, approved, suspended)
 * 2. Service transaction counts and commission earnings
 * 3. Rolling 12-month transaction trend
 * 4. Latest 5 platform transactions across all retailers
 *
 * @returns {Promise<Object>} Aggregated dashboard data object
 */
export const getAdminDashboardData = async () => {
  // 1. Resolve distributor role ID to cleanly distinguish distributors from retailers
  const distributorRole = await Role.findOne({ slug: "distributor" }).select("_id").lean();
  const distributorRoleId = distributorRole?._id;

  const distributorMatch = distributorRoleId
    ? { $or: [{ roles: distributorRoleId }, { role: "distributor" }] }
    : { role: "distributor" };

  const retailerMatch = distributorRoleId
    ? { roles: { $ne: distributorRoleId }, role: { $ne: "distributor" } }
    : { role: { $ne: "distributor" } };

  // 2. Prepare 12 rolling month slots for chronological trend analysis
  const now = new Date();
  const monthSlots = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    monthSlots.push({
      year,
      month,
      key: `${year}-${String(month).padStart(2, "0")}`,
    });
  }
  const trendStartDate = new Date(
    Date.UTC(monthSlots[0].year, monthSlots[0].month - 1, 1, 0, 0, 0, 0)
  );

  // 3. Execute all aggregation pipelines and queries concurrently in parallel
  const [userFacetResult, txnFacetResult, trendAgg, rawTransactions] = await Promise.all([
    // Pipeline 1: User & Retailer counts facet
    User.aggregate([
      {
        $facet: {
          totalRetailers: [
            { $match: retailerMatch },
            { $count: "count" },
          ],
          totalDistributors: [
            { $match: distributorMatch },
            { $count: "count" },
          ],
          pendingKyc: [
            {
              $match: {
                ...retailerMatch,
                $or: [{ adminApproved: "pending" }, { kycStatus: "pending" }],
              },
            },
            { $count: "count" },
          ],
          approvedRetailers: [
            {
              $match: {
                ...retailerMatch,
                $or: [{ adminApproved: "approved" }, { kycStatus: "approved" }],
              },
            },
            { $count: "count" },
          ],
          rejectedRetailers: [
            {
              $match: {
                ...retailerMatch,
                $or: [{ adminApproved: "rejected" }, { kycStatus: "rejected" }],
              },
            },
            { $count: "count" },
          ],
          suspendedRetailers: [
            {
              $match: {
                ...retailerMatch,
                $or: [
                  { status: { $in: ["suspended", "blocked"] } },
                  { isActive: false },
                ],
              },
            },
            { $count: "count" },
          ],
        },
      },
    ]),

    // Pipeline 2: Transaction service counts and commission earnings facet
    Transaction.aggregate([
      {
        $facet: {
          serviceCounts: [
            {
              $group: {
                _id: "$service",
                count: { $sum: 1 },
              },
            },
          ],
          serviceEarnings: [
            {
              $match: { status: "success" },
            },
            {
              $group: {
                _id: "$service",
                totalCommission: {
                  $sum: { $ifNull: ["$commissionEarned", 0] },
                },
                totalAmount: { $sum: "$amount" },
              },
            },
          ],
          overallCommission: [
            {
              $match: { status: "success" },
            },
            {
              $group: {
                _id: null,
                totalCommission: {
                  $sum: { $ifNull: ["$commissionEarned", 0] },
                },
              },
            },
          ],
        },
      },
    ]),

    // Pipeline 3: Monthly transaction trend for past 12 months
    Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: trendStartDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: { date: "$createdAt", timezone: "Asia/Kolkata" } },
            month: { $month: { date: "$createdAt", timezone: "Asia/Kolkata" } },
          },
          count: { $sum: 1 },
        },
      },
    ]),

    // Query 4: Latest 5 platform transactions across retailers
    Transaction.find()
      .select("transactionId service amount status commissionEarned wallet createdAt")
      .populate({
        path: "wallet",
        select: "user",
        populate: {
          path: "user",
          select: "fullName shop mobile",
        },
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  // Extract User counts
  const userFacet = userFacetResult[0] || {};
  const totalRetailers = userFacet.totalRetailers?.[0]?.count || 0;
  const totalDistributors = userFacet.totalDistributors?.[0]?.count || 0;
  const pendingKyc = userFacet.pendingKyc?.[0]?.count || 0;
  const approvedRetailers = userFacet.approvedRetailers?.[0]?.count || 0;
  const rejectedRetailers = userFacet.rejectedRetailers?.[0]?.count || 0;
  const suspendedRetailers = userFacet.suspendedRetailers?.[0]?.count || 0;

  // Extract Transaction metrics
  const txnFacet = txnFacetResult[0] || {};
  const serviceCounts = txnFacet.serviceCounts || [];
  const serviceEarnings = txnFacet.serviceEarnings || [];
  const overallCommission = txnFacet.overallCommission?.[0]?.totalCommission || 0;

  let totalAepsTransactions = 0;
  let totalDmtTransactions = 0;
  let totalCmsTransactions = 0;

  serviceCounts.forEach((item) => {
    const s = String(item._id || "").toUpperCase();
    if (s.includes("AEPS") || s.includes("AADHAAR")) {
      totalAepsTransactions += item.count;
    } else if (s.includes("DMT")) {
      totalDmtTransactions += item.count;
    } else {
      totalCmsTransactions += item.count;
    }
  });

  let aepsEarnings = 0;
  let dmtEarnings = 0;
  let cmsEarnings = 0;

  serviceEarnings.forEach((item) => {
    const s = String(item._id || "").toUpperCase();
    const comm = Number(item.totalCommission || 0);
    if (s.includes("AEPS") || s.includes("AADHAAR")) {
      aepsEarnings += comm;
    } else if (s.includes("DMT")) {
      dmtEarnings += comm;
    } else {
      cmsEarnings += comm;
    }
  });

  // Calculate 12-month trend array
  const trendMap = new Map();
  trendAgg.forEach((entry) => {
    if (entry._id?.year && entry._id?.month) {
      const key = `${entry._id.year}-${String(entry._id.month).padStart(2, "0")}`;
      trendMap.set(key, entry.count || 0);
    }
  });

  const transactionTrend = monthSlots.map((slot) => trendMap.get(slot.key) || 0);

  // Format recent transactions
  const recentTransactions = (rawTransactions || []).map((txn) => {
    const user = txn.wallet?.user;
    const retailerName = user?.shop?.name || user?.fullName || "Retailer";
    const service = normalizeService(txn.service);
    const status = normalizeStatus(txn.status);
    const date = formatDateTime(txn.createdAt);

    return {
      id: txn.transactionId || txn._id?.toString() || "",
      retailer: retailerName,
      service,
      amount: Number(txn.amount || 0),
      status,
      date,
    };
  });

  const totalCommission = Number(overallCommission.toFixed(2));

  return {
    stats: {
      totalRetailers,
      totalDistributors,
      pendingKyc,
      approvedRetailers,
      suspendedRetailers,
      totalAepsTransactions,
      totalDmtTransactions,
      totalCmsTransactions,
      totalCommission,
    },
    earningsOverview: {
      aeps: Number(aepsEarnings.toFixed(2)),
      dmt: Number(dmtEarnings.toFixed(2)),
      cms: Number(cmsEarnings.toFixed(2)),
      total: totalCommission,
    },
    kycOverview: [
      { label: "Pending KYC", value: pendingKyc, color: "#e59a20" },
      { label: "Approved", value: approvedRetailers, color: "#20a873" },
      { label: "Rejected", value: rejectedRetailers, color: "#e05252" },
      { label: "Suspended", value: suspendedRetailers, color: "#64748b" },
    ],
    transactionTrend,
    recentTransactions,
  };
};

export default {
  getAdminDashboardData,
};
