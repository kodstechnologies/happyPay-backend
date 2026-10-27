import mongoose from "mongoose";
import Wallet from "../model/wallet.model.js";
import Transaction from "../../transaction/model/transaction.model.js";
import User from "../../auth/model/user.model.js";

import { ApiError } from "../../../utils/ApiError.js";
import { generate15CharTxnId } from "../../../utils/generateTxnId.js";
import { payoutSettlement } from "../../external/services/provider.service.js";


export const addAmountToWallet = async (
  userId,
  amount,
  razorpay_order_id = null,
  razorpay_payment_id = null,
  referenceKey = null,
  description = "Wallet Topup"
) => {
  const session = await mongoose.startSession();
  let updatedWallet = null;

  try {
    await session.withTransaction(async () => {
      const wallet = await Wallet.findOne({ user: userId }).session(session);
      if (!wallet) {
        throw ApiError.notFound("Wallet not found for user");
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore + amount;

      wallet.balance = balanceAfter;
      await wallet.save({ session });

      const uniqueTxnId = generate15CharTxnId("TXN");

      const transaction = new Transaction({
        wallet: wallet._id,
        type: "credit",
        amount,
        balanceBefore,
        balanceAfter,
        payee: {
          bankName: "Self Wallet",
        },
        service: "RAZORPAY",
        transactionId: uniqueTxnId,
        referenceKey: referenceKey || null,
        razorpay_order_id: razorpay_order_id ||null,
        razorpay_payment_id: razorpay_payment_id ||  null,
        status: "success",
        description,
      });
      await transaction.save({ session });


      updatedWallet = wallet;
    });

    return updatedWallet;
  } finally {
    session.endSession();
  }
};


export const getUserWalletBalance = async (userId) => {
 
  let wallet = await Wallet.findOne({ user: userId })
    .select("_id user balance holdBalance currency status")
    .lean();

  if (!wallet) {
    wallet = await Wallet.findOneAndUpdate(
      { user: userId },
      {
        $setOnInsert: {
          user: userId,
          balance: 0,
          holdBalance: 0,
          currency: "INR",
          status: "active",
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        lean: true,
      }
    ).select("_id user balance holdBalance currency status");
  }

  const balance = Number(wallet.balance || 0);
  const holdBalance = Number(wallet.holdBalance || 0);
  const availableBalance = Math.max(0, balance - holdBalance);

  return {
    walletId: wallet._id,
    userId: wallet.user,
    balance: Number(balance.toFixed(2)),
    holdBalance: Number(holdBalance.toFixed(2)),
    availableBalance: Number(availableBalance.toFixed(2)),
    currency: wallet.currency || "INR",
    status: wallet.status || "active",
  };
};

export const createWallet = async (userId) => {
  const existingWallet = await Wallet.findOne({ user: userId });
  if (existingWallet) {
    return existingWallet;
  }

  const wallet = new Wallet({
    user: userId,
    balance: 0,
    holdBalance: 0,
    currency: "INR",
    status: "active",
  });

  return await wallet.save();
};

export const recordFailedWalletPayment = async (
  userId,
  amount,
  razorpay_order_id = null,
  razorpay_payment_id = null,
  referenceKey = null,
  description = "Failed Wallet Topup"
) => {
  const wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    return null;
  }

  const currentBalance = Number(wallet.balance || 0);
  const uniqueTxnId = generate15CharTxnId("TXN");

  const transaction = new Transaction({
    wallet: wallet._id,
    type: "credit",
    amount: Number(amount || 0),
    balanceBefore: currentBalance,
    balanceAfter: currentBalance,
    payee: {
      bankName: "Self Wallet",
    },
    service: "RAZORPAY",
    transactionId: uniqueTxnId,
    referenceKey: referenceKey || null,
    razorpay_order_id: razorpay_order_id || null,
    razorpay_payment_id: razorpay_payment_id || null,
    status: "failed",
    description,
  });

  return await transaction.save();
};

/**
 * Service to get settlement bank info, active registered banks,
 * retailer identity data, live wallet balance, and settlement limits.
 */
export const getSettlementBankInfoService = async (userId) => {
  if (!userId) {
    throw ApiError.badRequest("User ID is required");
  }

  const [user, walletData] = await Promise.all([
    User.findById(userId)
      .select("fullName mobile email status adminApproved kycStatus banks shop.name")
      .lean(),
    getUserWalletBalance(userId),
  ]);

  if (!user) {
    throw ApiError.notFound("Retailer not found");
  }

  const rawBanks = Array.isArray(user.banks) ? user.banks : [];

  const activeBanks = rawBanks
    .filter((b) => b && b.isActive !== false)
    .map((b) => {
      const acc = String(b.accountNumber || "").trim();
      const masked = acc.length > 4 ? `•••• •••• ${acc.slice(-4)}` : acc;
      return {
        _id: b._id ? b._id.toString() : "",
        id: b._id ? b._id.toString() : String(b.bank_id || ""),
        name: b.name || "Bank Account",
        bank_id: b.bank_id || "",
        accountNumber: acc,
        maskedAccountNumber: masked,
        ifscCode: String(b.ifscCode || "").trim().toUpperCase(),
        branchName: b.branchName || "",
        isPrimary: Boolean(b.isPrimary),
        isActive: b.isActive !== false,
        isVerified: true,
      };
    });

  const primaryBank =
    activeBanks.find((b) => b.isPrimary) || activeBanks[0] || null;

  return {
    retailer: {
      id: user._id ? user._id.toString() : "",
      fullName: user.fullName || "",
      mobile: user.mobile || "",
      email: user.email || "",
      shopName: user.shop?.name || "",
      status: user.status || "active",
      adminApproved: user.adminApproved || "pending",
      isKycApproved: user.adminApproved === "approved",
    },
    wallet: {
      walletId: walletData.walletId,
      totalBalance: walletData.balance,
      holdBalance: walletData.holdBalance,
      availableBalance: walletData.availableBalance,
      currency: walletData.currency || "INR",
      status: walletData.status || "active",
    },
    banks: activeBanks,
    primaryBank,
    limits: {
      minSettlementAmount: 100,
      maxSettlementPerTxn: 50000,
      dailySettlementLimit: 200000,
      supportedModes: ["IMPS", "NEFT"],
    },
  };
};

/**
 * Initiate settlement payout to retailer's bank account
 * Calls external provider payoutSettlement with exact required fields:
 * accountType, branchName, benMobile, bank_name, beneficiary_name, ifsc, account_number, amount, mode, txnid
 */
export const initiateSettlementPayoutService = async (userId, payload = {}) => {
  if (!userId) {
    throw ApiError.unauthorized("User not authenticated");
  }

  const numAmount = Number(payload.amount);
  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    throw ApiError.badRequest("Please enter a valid settlement amount");
  }

  if (numAmount < 100) {
    throw ApiError.badRequest("Minimum settlement amount is ₹100");
  }

  // 1. Fetch user to check KYC & identity details
  const user = await User.findById(userId)
    .select("fullName mobile status adminApproved banks")
    .lean();

  if (!user) {
    throw ApiError.notFound("Retailer not found");
  }

  if (user.status !== "active") {
    throw ApiError.forbidden("Retailer account is currently inactive or suspended");
  }

  if (user.adminApproved !== "approved") {
    throw ApiError.forbidden("Retailer KYC is not approved for settlement payouts");
  }

  // 2. Pre-verify wallet balance before calling provider
  const wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    throw ApiError.notFound("Wallet not found for retailer");
  }

  const currentBalance = Number(wallet.balance || 0);
  const holdBalance = Number(wallet.holdBalance || 0);
  const availableBalance = Math.max(0, currentBalance - holdBalance);

  if (numAmount > availableBalance) {
    throw ApiError.badRequest("Insufficient wallet balance for settlement");
  }

  // 3. Generate unique transaction ID from backend
  const txnid = generate15CharTxnId("TXN");

  // 4. Exact payload mapping for external payoutSettlement
  // STRICT RULE: Only exact field names, no alternatives or extra fields
  const providerPayload = {
    accountType: String(payload.accountType || "Savings Account").trim(),
    branchName: String(payload.branchName || "").trim(),
    benMobile: String(payload.benMobile || user.mobile || "").trim(),
    bank_name: String(payload.bank_name || "").trim(),
    beneficiary_name: String(payload.beneficiary_name || user.fullName || "").trim(),
    ifsc: String(payload.ifsc || "").trim().toUpperCase(),
    account_number: String(payload.account_number || "").trim(),
    amount: numAmount,
    mode: String(payload.mode || "IMPS").trim().toUpperCase(),
    txnid: txnid,
  };

  if (!providerPayload.account_number || !providerPayload.ifsc || !providerPayload.bank_name) {
    throw ApiError.badRequest("Destination bank account details are required");
  }

  // 5. Call external payoutSettlement from external service
  const providerResponse = await payoutSettlement(providerPayload);

  // 6. Debit wallet balance and record Transaction atomically
  const session = await mongoose.startSession();
  let balanceAfter = currentBalance - numAmount;

  try {
    await session.withTransaction(async () => {
      const activeWallet = await Wallet.findOne({ user: userId }).session(session);
      if (!activeWallet) {
        throw ApiError.notFound("Wallet record not found during deduction");
      }

      const balanceBefore = Number(activeWallet.balance || 0);
      balanceAfter = balanceBefore - numAmount;
      activeWallet.balance = balanceAfter;
      await activeWallet.save({ session });

      const finalUtr =
        providerResponse?.utr ||
        providerResponse?.rrn ||
        providerResponse?.data?.utr ||
        providerResponse?.data?.rrn ||
        providerResponse?.bank_ref_num ||
        txnid;

      const transaction = new Transaction({
        wallet: activeWallet._id,
        type: "debit",
        amount: numAmount,
        balanceBefore,
        balanceAfter,
        payee: {
          bankName: providerPayload.bank_name,
          accountNumber: providerPayload.account_number,
          ifscCode: providerPayload.ifsc,
          accountHolderName: providerPayload.beneficiary_name,
        },
        service: "PAYOUT",
        transactionId: txnid,
        status: "success",
        description: `Settlement payout via ${providerPayload.mode} to ${providerPayload.bank_name} (${providerPayload.account_number.slice(-4)})`,
      });

      await transaction.save({ session });
    });
  } finally {
    session.endSession();
  }

  const finalUtr =
    providerResponse?.utr ||
    providerResponse?.rrn ||
    providerResponse?.data?.utr ||
    providerResponse?.data?.rrn ||
    providerResponse?.bank_ref_num ||
    txnid;

  return {
    txnid,
    utr: finalUtr,
    amount: numAmount,
    balanceBefore: currentBalance,
    balanceAfter,
    bankName: providerPayload.bank_name,
    accountNumber: providerPayload.account_number,
    mode: providerPayload.mode,
    status: "success",
    providerResponse,
  };
};

export default {
  addAmountToWallet,
  recordFailedWalletPayment,
  getUserWalletBalance,
  createWallet,
  getSettlementBankInfoService,
  initiateSettlementPayoutService,
};



