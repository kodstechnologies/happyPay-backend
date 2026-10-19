import mongoose from "mongoose";
import { getUserWalletBalance } from "../../wallet/services/wallet.service.js";
import Transaction from "../../transaction/model/transaction.model.js";
import User from "../../auth/model/user.model.js";
import { ApiError } from "../../../utils/ApiError.js";

/**
 * Formats a Date object or ISO string into readable date and time strings.
 * @param {Date|string} dateInput
 * @returns {{ date: string, time: string }}
 */
const formatDateTime = (dateInput) => {
  if (!dateInput) {
    return { date: "--", time: "--" };
  }
  const dateObj = new Date(dateInput);
  if (Number.isNaN(dateObj.getTime())) {
    return { date: "--", time: "--" };
  }

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

  return { date, time };
};

/**
 * Capitalizes transaction status to match UI standards: "Success" | "Pending" | "Failed"
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
 * Maps service name to UI-friendly representation
 * @param {string} service
 * @returns {"AEPS" | "DMT" | "CMS" | "BBPS" | "UPI" | string}
 */
const normalizeService = (service) => {
  const upper = String(service || "").toUpperCase();
  if (["AEPS", "DMT", "CMS", "BBPS", "UPI"].includes(upper)) {
    return upper;
  }
  return "AEPS";
};

/**
 * Service to fetch all required dashboard metrics for a retailer:
 * 1. Retailer profile & ID
 * 2. Live wallet balance (reusing getUserWalletBalance)
 * 3. Today's earnings calculated from today's successful transactions' commissionEarned
 * 4. Latest 5 transactions
 *
 * @param {string} userId - Authenticated user's ObjectId
 * @returns {Promise<Object>} Dashboard overview object
 */
export const getRetailerDashboardData = async (userId) => {
  if (!userId) {
    throw ApiError.unauthorized("User ID is required to fetch dashboard data");
  }

  // 1. Fetch wallet balance using existing wallet service (DRY principle)
  const walletData = await getUserWalletBalance(userId);
  const walletId = walletData?.walletId;

  if (!walletId) {
    throw ApiError.notFound("Wallet record could not be found or initialized");
  }

  // 2. Compute date boundaries for today in Indian Standard Time (UTC+05:30)
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);

  const startOfTodayUtc = new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 0, 0, 0) - istOffset
  );
  const endOfTodayUtc = new Date(
    Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 23, 59, 59, 999) - istOffset
  );

  const walletObjectId = new mongoose.Types.ObjectId(walletId);

  // 3. Execute concurrent queries in parallel for high performance (< 25ms)
  const [userProfile, todayEarningsAgg, rawTransactions] = await Promise.all([
    // Fetch retailer profile
    User.findById(userId)
      .select("fullName mobile outletId shop AepsEkyc")
      .lean(),

    // Calculate today's total commission earnings via indexed aggregation
    Transaction.aggregate([
      {
        $match: {
          wallet: walletObjectId,
          status: "success",
          createdAt: { $gte: startOfTodayUtc, $lte: endOfTodayUtc },
        },
      },
      {
        $group: {
          _id: null,
          totalTodayEarnings: { $sum: "$commissionEarned" },
          todayTransactionsCount: { $sum: 1 },
        },
      },
    ]),

    // Fetch latest 5 transactions sorted by createdAt descending
    Transaction.find({ wallet: walletObjectId })
      .select("transactionId service type amount status commissionEarned payee description createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  // Determine standard Retailer ID
  const retailerId =
    userProfile?.outletId ||
    (userProfile?._id
      ? `HP${userProfile._id.toString().slice(-6).toUpperCase()}`
      : "HP100001");

  // Parse today's earnings from aggregation
  const todayEarnings =
    todayEarningsAgg.length > 0 && todayEarningsAgg[0].totalTodayEarnings != null
      ? Number(todayEarningsAgg[0].totalTodayEarnings.toFixed(2))
      : 0;

  const todayTransactionsCount =
    todayEarningsAgg.length > 0 && todayEarningsAgg[0].todayTransactionsCount != null
      ? todayEarningsAgg[0].todayTransactionsCount
      : 0;

  // Format recent transactions for UI consumption
  const recentTransactions = rawTransactions.map((txn) => {
    const { date, time } = formatDateTime(txn.createdAt);
    const service = normalizeService(txn.service);
    const type = String(txn.type || "credit").toUpperCase() === "DEBIT" ? "DEBIT" : "CREDIT";
    const status = normalizeStatus(txn.status);

    // Standard title construction
    let title = txn.description;
    if (!title || title.trim().length === 0) {
      if (service === "AEPS") {
        title = "AEPS Cash Withdrawal";
      } else if (service === "DMT") {
        title = "DMT Money Transfer";
      } else if (service === "CMS") {
        title = "CMS Collection";
      } else if (service === "BBPS") {
        title = "BBPS Bill Payment";
      } else {
        title = `${service} Transaction`;
      }
    }

    return {
      _id: txn._id,
      id: txn.transactionId || txn._id.toString(),
      service,
      title,
      date,
      time,
      amount: Number(txn.amount || 0),
      type,
      status,
      commissionEarned: Number(txn.commissionEarned || 0),
      createdAt: txn.createdAt,
    };
  });

  return {
    retailer: {
      id: retailerId,
      fullName: userProfile?.fullName || "Retailer",
      mobile: userProfile?.mobile || "",
      shopName: userProfile?.shop?.name || "",
    },
    wallet: walletData,
    earnings: {
      todayEarnings,
      todayTransactionsCount,
    },
    recentTransactions,
  };
};

export default {
  getRetailerDashboardData,
};
