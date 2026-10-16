import mongoose from "mongoose";
import User from "../model/user.model.js";
import { getUserWalletBalance } from "../../wallet/services/wallet.service.js";
import Transaction from "../../transaction/model/transaction.model.js";
import { ApiError } from "../../../utils/ApiError.js";

/**
 * Get unified dashboard summary for a particular retailer
 * Fetches:
 * 1. Retailer profile details
 * 2. Wallet balance (total, available, hold)
 * 3. Today's earnings (commission / earnings on successful transactions today)
 * 4. Latest 5 transactions
 *
 * @param {string} retailerId
 * @returns {Promise<Object>}
 */
export const getRetailerDashboardData = async (retailerId) => {
  if (!retailerId) {
    throw ApiError.badRequest("Retailer ID is required");
  }

  if (!mongoose.Types.ObjectId.isValid(retailerId)) {
    throw ApiError.badRequest("Invalid Retailer ID format");
  }

  // 1. Fetch retailer profile and wallet in parallel (DRY reuse of wallet logic)
  const [retailer, walletData] = await Promise.all([
    User.findById(retailerId)
      .select(
        "_id fullName mobile email outletId registrationStatus adminApproved status shop panNumber createdAt"
      )
      .populate("shop.category", "name")
      .populate("shop.propertyType", "name")
      .lean(),
    getUserWalletBalance(retailerId),
  ]);

  if (!retailer) {
    throw ApiError.notFound("Retailer not found");
  }

  // Calculate start and end of today
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // 2. Fetch today's earnings aggregation and latest 5 transactions concurrently
  const [earningsAgg, recentTransactions] = await Promise.all([
    Transaction.aggregate([
      {
        $match: {
          wallet: walletData.walletId,
          status: "success",
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          $or: [
            { commissionEarned: { $gt: 0 } },
            { service: "COMMISSION", type: "credit" },
          ],
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: {
            $sum: {
              $cond: [
                { $gt: ["$commissionEarned", 0] },
                "$commissionEarned",
                "$amount",
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]),
    Transaction.find({ wallet: walletData.walletId })
      .select(
        "_id transactionId type amount balanceBefore balanceAfter service status description commissionEarned payee razorpay_order_id razorpay_payment_id createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  const rawEarnings = earningsAgg.length > 0 ? earningsAgg[0].totalEarnings : 0;
  const todayEarnings = Number((Number(rawEarnings) || 0).toFixed(2));

  // Determine an identifiable Retailer ID (outletId or fallback HPXXXXXX)
  const formattedOutletId =
    retailer.outletId || `HP${String(retailer._id).slice(-6).toUpperCase()}`;

  return {
    retailer: {
      id: retailer._id,
      fullName: retailer.fullName || "Retailer",
      mobile: retailer.mobile || "",
      email: retailer.email || "",
      outletId: formattedOutletId,
      registrationStatus: retailer.registrationStatus || "NOT_STARTED",
      adminApproved: retailer.adminApproved || "pending",
      status: retailer.status || "active",
      shop: {
        name: retailer.shop?.name || "",
        category: retailer.shop?.category?.name || retailer.shop?.category || "",
        propertyType: retailer.shop?.propertyType?.name || retailer.shop?.propertyType || "",
        address:
          retailer.shop?.completeAddress ||
          retailer.shop?.address?.addressLine ||
          "",
        city: retailer.shop?.address?.city || "",
        state: retailer.shop?.address?.state || "",
        pincode: retailer.shop?.address?.pincode || "",
      },
      createdAt: retailer.createdAt,
    },
    wallet: {
      walletId: walletData.walletId,
      balance: walletData.balance,
      holdBalance: walletData.holdBalance,
      availableBalance: walletData.availableBalance,
      currency: walletData.currency,
      status: walletData.status,
    },
    todayEarnings,
    recentTransactions: recentTransactions || [],
  };
};

export default {
  getRetailerDashboardData,
};
