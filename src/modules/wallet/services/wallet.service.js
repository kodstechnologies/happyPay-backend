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
      const bankName = String(b.name || b.bank_name || b.bankName || "Bank Account").trim();
      return {
        _id: b._id ? b._id.toString() : "",
        id: b._id ? b._id.toString() : String(b.bank_id || ""),
        name: bankName,
        bank_name: bankName,
        bank_id: b.bank_id || "",
        accountNumber: acc,
        maskedAccountNumber: masked,
        ifscCode: String(b.ifscCode || "").trim().toUpperCase(),
        branchName: b.branchName || "",
        accountType: b.accountType || "Savings Account",
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

  // Resolve bank details from payload or match registered user banks
  const matchedBank = Array.isArray(user.banks)
    ? user.banks.find(
        (b) =>
          (b.accountNumber && String(b.accountNumber).trim() === String(payload.account_number).trim()) ||
          (b.bank_id && String(b.bank_id).trim() === String(payload.bank_code || payload.bank_id).trim()) ||
          (b._id && String(b._id).trim() === String(payload.bank_code || payload.bank_id).trim())
      )
    : null;

  const bankCode = String(
    payload.bank_code || payload.bank_id || matchedBank?.bank_id || matchedBank?._id || ""
  ).trim();
  const recordedBankName = String(
    payload.bank_name || payload.bankName || matchedBank?.name || matchedBank?.bank_name || bankCode || "Bank Account"
  ).trim();
  const lat = String(payload.lat || user.shop?.location?.latitude || "28.7041").trim();
  const long = String(payload.long || user.shop?.location?.longitude || "77.1025").trim();

  // 4. Exact payload mapping for external payoutSettlement
  // STRICT RULE: Only exact field names, no alternatives or extra fields
  const providerPayload = {
    accountType: String(payload.accountType || "Savings Account").trim(),
    branchName: String(payload.branchName || "").trim(),
    benMobile: String(payload.benMobile || user.mobile || "").trim(),
    bank_code: bankCode,
    bank_name: recordedBankName,
    beneficiary_name: String(payload.beneficiary_name || user.fullName || "").trim(),
    ifsc: String(payload.ifsc || "").trim().toUpperCase(),
    account_number: String(payload.account_number || "").trim(),
    amount: numAmount,
    mode: String(payload.mode || "IMPS").trim().toUpperCase(),
    lat,
    long,
    txnid: txnid,
  };

  if (!providerPayload.account_number || !providerPayload.ifsc || !providerPayload.bank_code || !providerPayload.bank_name) {
    throw ApiError.badRequest("Destination bank account details (account number, IFSC, bank name, and bank code) are required");
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
          bankName: recordedBankName,
          accountNumber: providerPayload.account_number,
          ifscCode: providerPayload.ifsc,
          accountHolderName: providerPayload.beneficiary_name,
        },
        service: "PAYOUT",
        transactionId: txnid,
        status: "success",
        description: `Settlement payout via ${providerPayload.mode} to ${recordedBankName} (${providerPayload.account_number.slice(-4)})`,
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
    bankName: recordedBankName,
    accountNumber: providerPayload.account_number,
    mode: providerPayload.mode,
    status: "success",
    providerResponse,
  };
};


export const verifyWalletBalance = async (userId, requiredAmount) => {
  if (!userId) {
    throw ApiError.unauthorized("User identity is required to check wallet balance");
  }

  const numAmount = Number(requiredAmount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw ApiError.badRequest("Invalid transaction amount for wallet verification");
  }

  const walletData = await getUserWalletBalance(userId);
  if (!walletData || walletData.status !== "active") {
    throw ApiError.forbidden("Retailer wallet is inactive or suspended");
  }

  if (walletData.availableBalance < numAmount) {
    throw ApiError.badRequest(
      `Insufficient wallet balance. Required: ₹${numAmount.toFixed(2)}, Available: ₹${walletData.availableBalance.toFixed(2)}`
    );
  }

  return walletData;
};


export const processServiceWalletTransaction = async ({
  userId,
  type,
  amount,
  service,
  transactionId,
  payee = {},
  description = "",
  commissionEarned = 0,
  status = "success",
}) => {
  if (!userId) {
    throw ApiError.unauthorized("User ID is required for wallet transaction");
  }

  const validTypes = ["credit", "debit"];
  if (!validTypes.includes(type)) {
    throw ApiError.badRequest(`Invalid transaction type '${type}'. Must be 'credit' or 'debit'`);
  }

  const numAmount = Math.round(Number(amount || 0) * 100) / 100;
  if (isNaN(numAmount) || numAmount <= 0) {
    throw ApiError.badRequest("Transaction amount must be a positive number");
  }

  const numCommission = Math.max(0, Math.round(Number(commissionEarned || 0) * 100) / 100);
  const resolvedTxnId = String(transactionId || generate15CharTxnId("TXN")).trim();

  // 1. Idempotency Guard: prevent duplicate debit/credit on network retries
  const existingTxn = await Transaction.findOne({ transactionId: resolvedTxnId });
  if (existingTxn) {
    const existingWallet = await Wallet.findById(existingTxn.wallet);
    return {
      success: true,
      isDuplicate: true,
      transaction: existingTxn,
      balanceBefore: existingTxn.balanceBefore,
      balanceAfter: existingTxn.balanceAfter,
      wallet: existingWallet,
    };
  }

  // 2. Fetch or initialize wallet
  let wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    wallet = await createWallet(userId);
  }

  if (wallet.status !== "active") {
    throw ApiError.forbidden("Retailer wallet is inactive or suspended");
  }

  // 3. Concurrency-safe atomic mutation:
  // Attempt with mongoose transaction session. If MongoDB deployment does not support
  // replica set sessions (e.g. standalone instance), fallback to atomic conditional update.
  let balanceBefore = Number(wallet.balance || 0);
  let balanceAfter = balanceBefore;
  let savedTransaction = null;
  let updatedWallet = null;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const activeWallet = await Wallet.findOne({ user: userId }).session(session);
      if (!activeWallet) {
        throw ApiError.notFound("Wallet record not found during balance update");
      }

      balanceBefore = Number(activeWallet.balance || 0);

      if (type === "debit") {
        const holdBal = Number(activeWallet.holdBalance || 0);
        const availBal = balanceBefore - holdBal;
        if (availBal < numAmount) {
          throw ApiError.badRequest(
            `Insufficient available balance for debit. Available: ₹${availBal.toFixed(2)}, Required: ₹${numAmount.toFixed(2)}`
          );
        }
        balanceAfter = Math.round((balanceBefore - numAmount) * 100) / 100;
      } else {
        // credit: principal + any commission
        balanceAfter = Math.round((balanceBefore + numAmount + numCommission) * 100) / 100;
      }

      activeWallet.balance = balanceAfter;
      await activeWallet.save({ session });

      const transaction = new Transaction({
        wallet: activeWallet._id,
        type,
        amount: numAmount,
        balanceBefore,
        balanceAfter,
        payee: {
          bankName: payee.bankName || undefined,
          aadharNumber: payee.aadharNumber || undefined,
          accountNumber: payee.accountNumber || undefined,
          ifscCode: payee.ifscCode || undefined,
          accountHolderName: payee.accountHolderName || undefined,
        },
        service,
        transactionId: resolvedTxnId,
        status: status || "success",
        description: description || `${service} ${type === "credit" ? "Credit" : "Debit"} of ₹${numAmount}`,
        commissionEarned: numCommission,
      });

      savedTransaction = await transaction.save({ session });
      updatedWallet = activeWallet;
    });
  } catch (sessionErr) {
    // Check if session error is because standalone MongoDB does not support transactions
    const isReplicaSetError =
      sessionErr.message?.includes("replica set") ||
      sessionErr.message?.includes("Transaction numbers are only allowed") ||
      sessionErr.code === 20;

    if (!isReplicaSetError) {
      throw sessionErr;
    }

    // Fallback: Standalone MongoDB atomic conditional update
    if (type === "debit") {
      const result = await Wallet.findOneAndUpdate(
        { user: userId, balance: { $gte: numAmount } },
        { $inc: { balance: -numAmount } },
        { new: true }
      );
      if (!result) {
        throw ApiError.badRequest("Insufficient wallet balance for debit transaction");
      }
      balanceBefore = result.balance + numAmount;
      balanceAfter = result.balance;
      updatedWallet = result;
    } else {
      const creditIncrement = numAmount + numCommission;
      const result = await Wallet.findOneAndUpdate(
        { user: userId },
        { $inc: { balance: creditIncrement } },
        { new: true, upsert: true }
      );
      balanceBefore = result.balance - creditIncrement;
      balanceAfter = result.balance;
      updatedWallet = result;
    }

    const transaction = new Transaction({
      wallet: updatedWallet._id,
      type,
      amount: numAmount,
      balanceBefore,
      balanceAfter,
      payee: {
        bankName: payee.bankName || undefined,
        aadharNumber: payee.aadharNumber || undefined,
        accountNumber: payee.accountNumber || undefined,
        ifscCode: payee.ifscCode || undefined,
        accountHolderName: payee.accountHolderName || undefined,
      },
      service,
      transactionId: resolvedTxnId,
      status: status || "success",
      description: description || `${service} ${type === "credit" ? "Credit" : "Debit"} of ₹${numAmount}`,
      commissionEarned: numCommission,
    });

    savedTransaction = await transaction.save();
  } finally {
    session.endSession();
  }

  return {
    success: true,
    transaction: savedTransaction,
    balanceBefore,
    balanceAfter,
    wallet: updatedWallet,
  };
};

export default {
  addAmountToWallet,
  recordFailedWalletPayment,
  getUserWalletBalance,
  createWallet,
  getSettlementBankInfoService,
  initiateSettlementPayoutService,
  verifyWalletBalance,
  processServiceWalletTransaction,
};



