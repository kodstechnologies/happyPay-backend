import mongoose from "mongoose";
import bcrypt from "bcrypt";
import Wallet from "../model/wallet.model.js";
import Transaction from "../../transaction/model/transaction.model.js";
import User from "../../auth/model/user.model.js";

import { ApiError } from "../../../utils/ApiError.js";
import { generate15CharTxnId } from "../../../utils/generateTxnId.js";
import { payoutSettlement, payoutSettlementBankList as fetchPayoutSettlementBankListProvider } from "../../external/services/provider.service.js";
import { sendWalletTransferNotification } from "../../notifications/services/notification.services.js";
import DistributorMapping from "../../network/model/distributorMapping.model.js";


export const verifyUserTransactionMpin = async (user, rawMpin) => {
  const mpin = String(rawMpin || "").trim();
  if (!mpin || !/^\d{4}$/.test(mpin)) {
    throw ApiError.badRequest("Please enter a valid 4-digit MPIN");
  }

  if (!user || !user.MPIN) {
    throw ApiError.badRequest(
      "Transaction MPIN is not configured. Please set up your MPIN in Security Settings first."
    );
  }

  const isBcrypt =
    user.MPIN.startsWith("$2a$") ||
    user.MPIN.startsWith("$2b$") ||
    user.MPIN.startsWith("$2y$");

  const isMatch = isBcrypt
    ? await bcrypt.compare(mpin, user.MPIN)
    : String(user.MPIN).trim() === mpin;

  if (!isMatch) {
    throw ApiError.badRequest("Incorrect security MPIN. Please try again.");
  }

  // Transparent upgrade: if legacy unhashed MPIN was matched, re-hash it to bcrypt now
  if (!isBcrypt) {
    user.MPIN = await bcrypt.hash(mpin, 10);
    await user.save();
  }

  return true;
};


let cachedSettlementBanks = null;
let cachedSettlementBanksExpiry = 0;

export const payoutSettlementBankList = async ({ page = 1, limit = 50, search = "" } = {}) => {
  const now = Date.now();
  if (!cachedSettlementBanks || now > cachedSettlementBanksExpiry) {
    const providerRes = await fetchPayoutSettlementBankListProvider();
    const rawList = Array.isArray(providerRes?.data)
      ? providerRes.data
      : (Array.isArray(providerRes) ? providerRes : []);

    cachedSettlementBanks = rawList
      .filter((b) => b && (b.description || b.name || b.bank_name))
      .map((b) => ({
        description: String(b.description || b.name || b.bank_name || "").trim(),
        code: String(b.code || b.bank_id || b.id || "").trim(),
      }));
    cachedSettlementBanksExpiry = now + 10 * 60 * 1000; // 10 minutes cache
  }

  const querySearch = String(search || "").trim().toLowerCase();
  let filtered = cachedSettlementBanks;

  if (querySearch) {
    filtered = cachedSettlementBanks.filter(
      (b) =>
        b.description.toLowerCase().includes(querySearch) ||
        b.code.toLowerCase().includes(querySearch)
    );
  }

  const total = filtered.length;
  const numPage = Math.max(Number(page) || 1, 1);
  const numLimit = limit !== undefined && limit !== null
    ? Math.min(Math.max(Number(limit) || 10, 1), 500)
    : 50;

  const totalPages = Math.ceil(total / numLimit) || 1;
  const skip = (numPage - 1) * numLimit;
  const data = filtered.slice(skip, skip + numLimit);

  return {
    data,
    meta: {
      total,
      page: numPage,
      limit: numLimit,
      totalPages,
    },
  };
};

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
        name: bankName,
        bank_code: b.bank_code || "",
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
    .select("fullName mobile status adminApproved banks MPIN");

  if (!user) {
    throw ApiError.notFound("Retailer not found");
  }

  if (user.status == "blocked"||user.status=="blocked") {
    throw ApiError.forbidden("Retailer account is currently inactive or suspended");
  }

  if (user.adminApproved !== "approved") {
    throw ApiError.forbidden("Retailer KYC is not approved for settlement payouts");
  }

  // Step 1: Atomic MPIN Verification Guard before external provider or wallet lock
  await verifyUserTransactionMpin(user, payload.mpin);

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

  const bankCode = String(payload.code || "").trim();

  // Resolve bank details from payload code or registered user banks
  const matchedBank = Array.isArray(user.banks)
    ? user.banks.find(
        (b) =>
          (b.accountNumber && String(b.accountNumber).trim() === String(payload.account_number).trim()) ||
          (b.bank_code && String(b.bank_code).trim() === bankCode) ||
          (b._id && String(b._id).trim() === bankCode)
      )
    : null;
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
    // bank_code: bankCode,
    bank_name: bankCode,
    // recordedBankName,
    beneficiary_name: String(payload.beneficiary_name || user.fullName || "").trim(),
    ifsc: String(payload.ifsc || "").trim().toUpperCase(),
    account_number: String(payload.account_number || "").trim(),
    amount: numAmount,
    mode: String(payload.mode || "IMPS").trim().toUpperCase(),
    lat,
    long,
    txnid: txnid,
  };


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
          name: providerPayload.beneficiary_name || user.fullName,
          mobile: user.mobile,
          bankName: recordedBankName,
          accountNumber: providerPayload.account_number,
          ifscCode: providerPayload.ifsc,
          accountHolderName: providerPayload.beneficiary_name || user.fullName,
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
          name: payee.name || payee.accountHolderName || undefined,
          mobile: payee.mobile || undefined,
          shopName: payee.shopName || undefined,
          bankName: payee.bankName || undefined,
          aadharNumber: payee.aadharNumber || undefined,
          accountNumber: payee.accountNumber || undefined,
          ifscCode: payee.ifscCode || undefined,
          accountHolderName: payee.accountHolderName || payee.name || undefined,
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
        name: payee.name || payee.accountHolderName || undefined,
        mobile: payee.mobile || undefined,
        shopName: payee.shopName || undefined,
        bankName: payee.bankName || undefined,
        aadharNumber: payee.aadharNumber || undefined,
        accountNumber: payee.accountNumber || undefined,
        ifscCode: payee.ifscCode || undefined,
        accountHolderName: payee.accountHolderName || payee.name || undefined,
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

/**
 * Verify recipient retailer by mobile number before P2P transfer
 * Guarded against self-transfers, invalid formats, and inactive retailers
 */
export const verifyRecipientRetailerService = async (senderUserId, mobile) => {
  if (!senderUserId) {
    throw ApiError.unauthorized("Authentication required");
  }

  const cleanMobile = String(mobile || "").trim();
  if (!cleanMobile || !/^\d{10}$/.test(cleanMobile)) {
    throw ApiError.badRequest("Please enter a valid 10-digit mobile number");
  }

  // 1. Fetch sender to enforce anti-self-transfer guard
  const sender = await User.findById(senderUserId).select("mobile fullName status").lean();
  if (!sender) {
    throw ApiError.notFound("Sender retailer profile not found");
  }

  if (sender.mobile === cleanMobile) {
    throw ApiError.badRequest("You cannot transfer funds to your own mobile number");
  }

  // 2. Fetch recipient retailer
  const recipient = await User.findOne({ mobile: cleanMobile })
    .select("_id fullName mobile status adminApproved shop.name")
    .lean();

  if (!recipient) {
    throw ApiError.notFound("No registered retailer found with this mobile number");
  }

  if (recipient.status !== "active") {
    throw ApiError.forbidden("The recipient retailer account is currently inactive or suspended");
  }

  return {
    id: recipient._id.toString(),
    _id: recipient._id.toString(),
    name: recipient.fullName || "Registered Retailer",
    fullName: recipient.fullName || "Registered Retailer",
    shopName: recipient.shop?.name || "Retail Store",
    mobile: recipient.mobile,
    status: recipient.status,
  };
};

/**
 * Execute atomic P2P settlement transfer between two retailers
 * Protected by ACID transaction, MPIN check, balance validation, and double-entry ledger
 */
export const transferRetailerToRetailerService = async (senderUserId, payload = {}) => {
  if (!senderUserId) {
    throw ApiError.unauthorized("Authentication required");
  }

  const recipientMobile = String(payload.recipientMobile || "").trim();
  if (!recipientMobile || !/^\d{10}$/.test(recipientMobile)) {
    throw ApiError.badRequest("Please provide a valid 10-digit recipient mobile number");
  }

  const rawAmount = Number(payload.amount);
  if (isNaN(rawAmount) || rawAmount <= 0) {
    throw ApiError.badRequest("Please enter a valid transfer amount");
  }

  const numAmount = Number((Math.round(rawAmount * 100) / 100).toFixed(2));
  if (numAmount < 10) {
    throw ApiError.badRequest("Minimum transfer amount is ₹10");
  }

  if (numAmount > 50000) {
    throw ApiError.badRequest("Maximum transfer amount per transaction is ₹50,000");
  }

  const mpin = String(payload.mpin || "").trim();
  if (!mpin || !/^\d{4}$/.test(mpin)) {
    throw ApiError.badRequest("Please enter a valid 4-digit MPIN");
  }

  // 1. Fetch sender with security guards
  const sender = await User.findById(senderUserId)
    .select("fullName mobile status adminApproved MPIN shop.name");

  if (!sender) {
    throw ApiError.notFound("Sender retailer not found");
  }

  if (sender.status !== "active") {
    throw ApiError.forbidden("Your account is currently inactive or suspended");
  }

  if (sender.adminApproved !== "approved") {
    throw ApiError.forbidden("Your account KYC must be approved to perform settlement transfers");
  }

  // Anti-self-transfer guard
  if (sender.mobile === recipientMobile) {
    throw ApiError.badRequest("You cannot transfer funds to your own wallet");
  }

  // MPIN Verification Guard: verified via bcrypt before running transaction
  await verifyUserTransactionMpin(sender, mpin);

  // 2. Fetch recipient
  const recipient = await User.findOne({ mobile: recipientMobile })
    .select("fullName mobile status adminApproved shop.name");

  if (!recipient) {
    throw ApiError.notFound("Recipient retailer not found with this mobile number");
  }

  if (recipient._id.equals(sender._id)) {
    throw ApiError.badRequest("You cannot transfer funds to your own wallet");
  }

  if (recipient.status !== "active") {
    throw ApiError.forbidden("Recipient retailer account is inactive or suspended");
  }

  // 3. Pre-check sender wallet balance
  const senderWallet = await Wallet.findOne({ user: sender._id });
  if (!senderWallet) {
    throw ApiError.notFound("Sender wallet not found");
  }

  const senderBalance = Number(senderWallet.balance || 0);
  const senderHoldBalance = Number(senderWallet.holdBalance || 0);
  const availableBalance = Math.max(0, senderBalance - senderHoldBalance);

  if (numAmount > availableBalance) {
    throw ApiError.badRequest("Insufficient wallet balance for transfer");
  }

  // 4. Atomic Execution with MongoDB Session
  const session = await mongoose.startSession();
  let transferResult = null;

  try {
    await session.withTransaction(async () => {
      // Re-fetch and lock sender wallet in session
      const sWallet = await Wallet.findOne({ user: sender._id }).session(session);
      if (!sWallet) {
        throw ApiError.notFound("Sender wallet record missing during transaction");
      }

      const sAvailable = Math.max(0, Number(sWallet.balance || 0) - Number(sWallet.holdBalance || 0));
      if (numAmount > sAvailable) {
        throw ApiError.badRequest("Insufficient wallet balance during transaction execution");
      }

      // Re-fetch or upsert recipient wallet in session
      let rWallet = await Wallet.findOne({ user: recipient._id }).session(session);
      if (!rWallet) {
        rWallet = new Wallet({
          user: recipient._id,
          balance: 0,
          holdBalance: 0,
          currency: "INR",
          status: "active",
        });
        await rWallet.save({ session });
      }

      // Debit sender
      const senderBalanceBefore = Number(sWallet.balance || 0);
      const senderBalanceAfter = Number((senderBalanceBefore - numAmount).toFixed(2));
      sWallet.balance = senderBalanceAfter;
      await sWallet.save({ session });

      // Credit recipient
      const recipientBalanceBefore = Number(rWallet.balance || 0);
      const recipientBalanceAfter = Number((recipientBalanceBefore + numAmount).toFixed(2));
      rWallet.balance = recipientBalanceAfter;
      await rWallet.save({ session });

      const txnid = generate15CharTxnId("TXN");
      const recipientTxnId = generate15CharTxnId("TXN");
      const p2pRef = `P2P-${Date.now().toString().slice(-8)}`;
      const remarks = String(payload.remarks || "").trim();

      // Double-entry record 1: Sender Debit Transaction
      const senderTxn = new Transaction({
        wallet: sWallet._id,
        type: "debit",
        amount: numAmount,
        balanceBefore: senderBalanceBefore,
        balanceAfter: senderBalanceAfter,
        service: "SETTLEMENT",
        transactionId: txnid,
        payee: {
          name: recipient.fullName || "Retailer",
          mobile: recipient.mobile,
          shopName: recipient.shop?.name || "",
          bankName: recipient.shop?.name || "Retailer Wallet",
          accountHolderName: recipient.fullName || "Retailer",
          accountNumber: recipient.mobile,
        },
        status: "success",
        description: remarks || `P2P Settlement to ${recipient.fullName || "Retailer"} (${recipient.mobile})`,
      });
      await senderTxn.save({ session });

      // Double-entry record 2: Recipient Credit Transaction
      const recipientTxn = new Transaction({
        wallet: rWallet._id,
        type: "credit",
        amount: numAmount,
        balanceBefore: recipientBalanceBefore,
        balanceAfter: recipientBalanceAfter,
        service: "SETTLEMENT",
        transactionId: recipientTxnId,
        payee: {
          name: sender.fullName || "Retailer",
          mobile: sender.mobile,
          shopName: sender.shop?.name || "",
          bankName: sender.shop?.name || "Retailer Wallet",
          accountHolderName: sender.fullName || "Retailer",
          accountNumber: sender.mobile,
        },
        status: "success",
        description: remarks || `P2P Settlement from ${sender.fullName || "Retailer"} (${sender.mobile})`,
      });
      await recipientTxn.save({ session });

      transferResult = {
        id: p2pRef,
        transactionId: txnid,
        recipientTxnId,
        amount: numAmount,
        senderBalanceBefore,
        senderBalanceAfter,
        recipientBalanceAfter,
        recipientName: recipient.fullName || "Retailer",
        recipientShopName: recipient.shop?.name || "Retail Store",
        recipientMobile: recipient.mobile,
        remarks,
        date: new Date(),
      };
    });
  } finally {
    session.endSession();
  }

  // 5. Asynchronous Push Notification Pipeline (Non-blocking post-commit)
  if (transferResult) {
    // Notify Recipient
    sendWalletTransferNotification({
      recipientId: recipient._id,
      type: "WALLET_CREDIT",
      title: `💰 Wallet Credited: ₹${numAmount.toLocaleString("en-IN")}`,
      body: `₹${numAmount.toLocaleString("en-IN")} received from ${sender.fullName || "Retailer"} (${sender.shop?.name || sender.mobile}). New Balance: ₹${transferResult.recipientBalanceAfter.toFixed(2)}`,
      data: {
        type: "WALLET_CREDIT",
        screen: "WALLET",
        txnId: transferResult.recipientTxnId,
        amount: String(numAmount),
        senderMobile: sender.mobile,
      },
    }).catch((err) => console.warn("Recipient FCM push notification error:", err?.message));

    // Notify Sender
    sendWalletTransferNotification({
      recipientId: sender._id,
      type: "WALLET_DEBIT",
      title: `💸 Wallet Debited: ₹${numAmount.toLocaleString("en-IN")}`,
      body: `₹${numAmount.toLocaleString("en-IN")} transferred to ${recipient.fullName || "Retailer"} (${recipient.mobile}). Remaining Balance: ₹${transferResult.senderBalanceAfter.toFixed(2)}`,
      data: {
        type: "WALLET_DEBIT",
        screen: "WALLET",
        txnId: transferResult.transactionId,
        amount: String(numAmount),
        recipientMobile: recipient.mobile,
      },
    }).catch((err) => console.warn("Sender FCM push notification error:", err?.message));
  }

  return transferResult;
};

/**
 * Fetch the latest 5 P2P settlements for the authenticated retailer
 */
export const getRecentRetailerSettlementsService = async (userId) => {
  if (!userId) {
    throw ApiError.unauthorized("Authentication required");
  }

  const wallet = await Wallet.findOne({ user: userId }).select("_id").lean();
  if (!wallet) {
    return [];
  }

  const transactions = await Transaction.find({
    wallet: wallet._id,
    service: "SETTLEMENT",
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return transactions.map((t) => ({
    id: t.transactionId || String(t._id),
    name: t.payee?.name || t.payee?.accountHolderName || "Retailer",
    shopName: t.payee?.shopName || t.payee?.bankName || "",
    mobile: t.payee?.mobile || t.payee?.accountNumber || "",
    amount: t.amount,
    type: t.type,
    date: t.createdAt,
    status: t.status === "success" ? "Success" : t.status,
    description: t.description || "",
  }));
};

/**
 * Fetch assigned distributor details and wallet info for the authenticated retailer
 * If no distributor is assigned or distributor is inactive, provides clear flag and message
 */
export const getDistributorSettlementInfoService = async (userId) => {
  if (!userId) {
    throw ApiError.unauthorized("Authentication required");
  }

  const [retailer, walletData] = await Promise.all([
    User.findById(userId)
      .select("fullName mobile email status adminApproved MPIN shop distributor ditributor")
      .lean(),
    getUserWalletBalance(userId),
  ]);

  if (!retailer) {
    throw ApiError.notFound("Retailer profile not found");
  }

  // Find assigned distributor via DistributorMapping first
  let distributorUser = null;
  const mapping = await DistributorMapping.findOne({ retailerId: retailer._id, isActive: true })
    .populate("distributorId", "fullName mobile email status shop adminApproved panNumber aadhaarNumber")
    .lean();

  if (mapping && mapping.distributorId) {
    distributorUser = mapping.distributorId;
  } else {
    // Fallback: check distributor/ditributor field on User model
    const fallbackDistId = retailer.distributor || retailer.ditributor;
    if (fallbackDistId && mongoose.Types.ObjectId.isValid(fallbackDistId)) {
      distributorUser = await User.findById(fallbackDistId)
        .select("fullName mobile email status shop adminApproved panNumber aadhaarNumber")
        .lean();
    }
  }

  // Format distributor details if found
  if (distributorUser) {
    const isDistributorActive = distributorUser.status === "active";
    const shopAddr = distributorUser.shop?.address;
    const formattedAddress = distributorUser.shop?.completeAddress ||
      (shopAddr
        ? [shopAddr.addressLine, shopAddr.city, shopAddr.state, shopAddr.pincode].filter(Boolean).join(", ")
        : "Authorized Distributor Location");

    const zone = shopAddr?.state || shopAddr?.city || "Regional Hub";
    const customDistId = `HP-DST-${distributorUser.mobile ? distributorUser.mobile.slice(-4) : distributorUser._id.toString().slice(-4).toUpperCase()}`;

    return {
      hasDistributor: true,
      canTransfer: retailer.status === "active" && retailer.adminApproved === "approved" && isDistributorActive,
      distributor: {
        id: distributorUser._id.toString(),
        customId: customDistId,
        name: distributorUser.fullName || distributorUser.shop?.name || "Assigned Distributor",
        contactName: distributorUser.fullName || "Distributor Partner",
        shopName: distributorUser.shop?.name || "Distributor Hub",
        phone: distributorUser.mobile || "",
        email: distributorUser.email || "",
        address: formattedAddress,
        zone: zone,
        status: distributorUser.status || "active",
        isPrimary: true,
      },
      retailer: {
        id: retailer._id.toString(),
        fullName: retailer.fullName,
        mobile: retailer.mobile,
        hasMpin: Boolean(retailer.MPIN),
        isKycApproved: retailer.adminApproved === "approved",
        status: retailer.status,
      },
      wallet: walletData,
      limits: {
        minAmount: 100,
        maxAmount: 100000,
        charges: 0,
      },
    };
  }

  // No distributor assigned
  return {
    hasDistributor: false,
    canTransfer: false,
    distributor: null,
    message: "No distributor is currently assigned to your account. Transfer to distributor is disabled.",
    retailer: {
      id: retailer._id.toString(),
      fullName: retailer.fullName,
      mobile: retailer.mobile,
      hasMpin: Boolean(retailer.MPIN),
      isKycApproved: retailer.adminApproved === "approved",
      status: retailer.status,
    },
    wallet: walletData,
    limits: {
      minAmount: 100,
      maxAmount: 100000,
      charges: 0,
    },
  };
};

/**
 * Execute atomic settlement transfer from a retailer to their assigned distributor
 * Protected by ACID transactions, MPIN check, active distributor verification, balance validation, and double-entry ledger
 */
export const transferRetailerToDistributorService = async (senderUserId, payload = {}) => {
  if (!senderUserId) {
    throw ApiError.unauthorized("Authentication required");
  }

  const rawAmount = Number(payload.amount);
  if (isNaN(rawAmount) || rawAmount <= 0) {
    throw ApiError.badRequest("Please enter a valid transfer amount");
  }

  const numAmount = Number((Math.round(rawAmount * 100) / 100).toFixed(2));
  if (numAmount < 100) {
    throw ApiError.badRequest("Minimum transfer amount to distributor is ₹100");
  }

  if (numAmount > 100000) {
    throw ApiError.badRequest("Maximum settlement transfer limit per transaction is ₹1,00,000");
  }

  const mpin = String(payload.mpin || "").trim();
  if (!mpin || !/^\d{4}$/.test(mpin)) {
    throw ApiError.badRequest("Please enter a valid 4-digit MPIN");
  }

  // 1. Fetch sender retailer
  const sender = await User.findById(senderUserId)
    .select("fullName mobile status adminApproved MPIN shop distributor ditributor");

  if (!sender) {
    throw ApiError.notFound("Retailer profile not found");
  }

  if (sender.status !== "active") {
    throw ApiError.forbidden("Your retailer account is currently inactive or suspended");
  }

  if (sender.adminApproved !== "approved") {
    throw ApiError.forbidden("Your account KYC must be approved to perform settlement transfers");
  }

  // MPIN Verification Guard: verified via bcrypt before running transaction
  await verifyUserTransactionMpin(sender, mpin);

  // 2. Resolve assigned distributor for this retailer
  let assignedDistributorId = null;
  const mapping = await DistributorMapping.findOne({ retailerId: sender._id, isActive: true }).lean();
  if (mapping && mapping.distributorId) {
    assignedDistributorId = mapping.distributorId;
  } else if (sender.distributor || sender.ditributor) {
    assignedDistributorId = sender.distributor || sender.ditributor;
  }

  if (!assignedDistributorId) {
    throw ApiError.forbidden("No distributor is assigned to your account. Transfer to distributor is disabled.");
  }

  // If client provided a destination distributorId, strictly verify it matches the assigned distributor
  if (payload.distributorId && String(payload.distributorId) !== String(assignedDistributorId)) {
    throw ApiError.forbidden("Unauthorized destination: You can only transfer funds to your assigned distributor.");
  }

  // 3. Fetch distributor user and validate
  const distributor = await User.findById(assignedDistributorId)
    .select("fullName mobile status adminApproved shop");

  if (!distributor) {
    throw ApiError.notFound("Assigned distributor account could not be found");
  }

  // Anti-self-transfer guard
  if (distributor._id.equals(sender._id)) {
    throw ApiError.badRequest("You cannot transfer funds to your own wallet");
  }

  if (distributor.status !== "active") {
    throw ApiError.forbidden("Assigned distributor account is currently inactive or suspended");
  }

  // 4. Pre-check sender wallet balance
  const senderWallet = await Wallet.findOne({ user: sender._id });
  if (!senderWallet) {
    throw ApiError.notFound("Retailer wallet record not found");
  }

  const senderBalance = Number(senderWallet.balance || 0);
  const senderHoldBalance = Number(senderWallet.holdBalance || 0);
  const availableBalance = Math.max(0, senderBalance - senderHoldBalance);

  if (numAmount > availableBalance) {
    throw ApiError.badRequest(`Insufficient wallet balance. Available: ₹${availableBalance.toFixed(2)}, Required: ₹${numAmount.toFixed(2)}`);
  }

  // 5. Atomic execution with MongoDB Session
  const session = await mongoose.startSession();
  let transferResult = null;

  try {
    await session.withTransaction(async () => {
      // Re-fetch and lock sender wallet in session
      const sWallet = await Wallet.findOne({ user: sender._id }).session(session);
      if (!sWallet) {
        throw ApiError.notFound("Retailer wallet record missing during transaction");
      }

      const sAvailable = Math.max(0, Number(sWallet.balance || 0) - Number(sWallet.holdBalance || 0));
      if (numAmount > sAvailable) {
        throw ApiError.badRequest("Insufficient wallet balance during transaction execution");
      }

      // Re-fetch or upsert distributor wallet in session
      let dWallet = await Wallet.findOne({ user: distributor._id }).session(session);
      if (!dWallet) {
        dWallet = new Wallet({
          user: distributor._id,
          balance: 0,
          holdBalance: 0,
          currency: "INR",
          status: "active",
        });
        await dWallet.save({ session });
      }

      // Debit sender (retailer)
      const senderBalanceBefore = Number(sWallet.balance || 0);
      const senderBalanceAfter = Number((senderBalanceBefore - numAmount).toFixed(2));
      sWallet.balance = senderBalanceAfter;
      await sWallet.save({ session });

      // Credit recipient (distributor)
      const distBalanceBefore = Number(dWallet.balance || 0);
      const distBalanceAfter = Number((distBalanceBefore + numAmount).toFixed(2));
      dWallet.balance = distBalanceAfter;
      await dWallet.save({ session });

      const txnid = generate15CharTxnId("TXN");
      const distTxnId = generate15CharTxnId("TXN");
      const settlementRef = `HP-DST-${Date.now().toString().slice(-8)}`;
      const reason = String(payload.reason || "Wallet Top-up / Stock Reorder").trim();

      // Double-entry record 1: Retailer Debit Transaction
      const senderTxn = new Transaction({
        wallet: sWallet._id,
        type: "debit",
        amount: numAmount,
        balanceBefore: senderBalanceBefore,
        balanceAfter: senderBalanceAfter,
        service: "SETTLEMENT",
        transactionId: txnid,
        payee: {
          name: distributor.fullName || "Distributor",
          mobile: distributor.mobile,
          shopName: distributor.shop?.name || "",
          bankName: distributor.shop?.name || "Distributor Wallet",
          accountHolderName: distributor.fullName || "Distributor",
          accountNumber: distributor.mobile,
        },
        status: "success",
        description: reason || `Settlement to Distributor: ${distributor.fullName || "Distributor"} (${distributor.mobile})`,
      });
      await senderTxn.save({ session });

      // Double-entry record 2: Distributor Credit Transaction
      const distTxn = new Transaction({
        wallet: dWallet._id,
        type: "credit",
        amount: numAmount,
        balanceBefore: distBalanceBefore,
        balanceAfter: distBalanceAfter,
        service: "SETTLEMENT",
        transactionId: distTxnId,
        payee: {
          name: sender.fullName || "Retailer",
          mobile: sender.mobile,
          shopName: sender.shop?.name || "",
          bankName: sender.shop?.name || "Retailer Wallet",
          accountHolderName: sender.fullName || "Retailer",
          accountNumber: sender.mobile,
        },
        status: "success",
        description: reason || `Settlement from Retailer: ${sender.fullName || "Retailer"} (${sender.mobile})`,
      });
      await distTxn.save({ session });

      transferResult = {
        id: settlementRef,
        transactionId: txnid,
        distributorTxnId: distTxnId,
        amount: numAmount,
        senderBalanceBefore,
        senderBalanceAfter,
        distributorBalanceAfter: distBalanceAfter,
        distributorName: distributor.fullName || "Distributor",
        distributorShopName: distributor.shop?.name || "Distributor Hub",
        distributorId: distributor._id.toString(),
        distributorMobile: distributor.mobile,
        reason,
        date: new Date(),
      };
    });
  } catch (sessionErr) {
    // Fallback: Check if session error is because standalone MongoDB does not support transactions
    const isReplicaSetError =
      sessionErr.message?.includes("replica set") ||
      sessionErr.message?.includes("Transaction numbers are only allowed") ||
      sessionErr.code === 20;

    if (!isReplicaSetError) {
      throw sessionErr;
    }

    // Fallback: Standalone MongoDB atomic conditional update
    const sWallet = await Wallet.findOneAndUpdate(
      { user: sender._id, balance: { $gte: numAmount } },
      { $inc: { balance: -numAmount } },
      { new: true }
    );
    if (!sWallet) {
      throw ApiError.badRequest("Insufficient wallet balance for distributor settlement");
    }

    const dWallet = await Wallet.findOneAndUpdate(
      { user: distributor._id },
      { $inc: { balance: numAmount } },
      { new: true, upsert: true }
    );

    const senderBalanceBefore = sWallet.balance + numAmount;
    const senderBalanceAfter = sWallet.balance;
    const distBalanceBefore = dWallet.balance - numAmount;
    const distBalanceAfter = dWallet.balance;

    const txnid = generate15CharTxnId("TXN");
    const distTxnId = generate15CharTxnId("TXN");
    const settlementRef = `HP-DST-${Date.now().toString().slice(-8)}`;
    const reason = String(payload.reason || "Wallet Top-up / Stock Reorder").trim();

    const senderTxn = new Transaction({
      wallet: sWallet._id,
      type: "debit",
      amount: numAmount,
      balanceBefore: senderBalanceBefore,
      balanceAfter: senderBalanceAfter,
      service: "SETTLEMENT",
      transactionId: txnid,
      payee: {
        name: distributor.fullName || "Distributor",
        mobile: distributor.mobile,
        shopName: distributor.shop?.name || "",
        bankName: distributor.shop?.name || "Distributor Wallet",
        accountHolderName: distributor.fullName || "Distributor",
        accountNumber: distributor.mobile,
      },
      status: "success",
      description: reason || `Settlement to Distributor: ${distributor.fullName || "Distributor"} (${distributor.mobile})`,
    });
    await senderTxn.save();

    const distTxn = new Transaction({
      wallet: dWallet._id,
      type: "credit",
      amount: numAmount,
      balanceBefore: distBalanceBefore,
      balanceAfter: distBalanceAfter,
      service: "SETTLEMENT",
      transactionId: distTxnId,
      payee: {
        name: sender.fullName || "Retailer",
        mobile: sender.mobile,
        shopName: sender.shop?.name || "",
        bankName: sender.shop?.name || "Retailer Wallet",
        accountHolderName: sender.fullName || "Retailer",
        accountNumber: sender.mobile,
      },
      status: "success",
      description: reason || `Settlement from Retailer: ${sender.fullName || "Retailer"} (${sender.mobile})`,
    });
    await distTxn.save();

    transferResult = {
      id: settlementRef,
      transactionId: txnid,
      distributorTxnId: distTxnId,
      amount: numAmount,
      senderBalanceBefore,
      senderBalanceAfter,
      distributorBalanceAfter: distBalanceAfter,
      distributorName: distributor.fullName || "Distributor",
      distributorShopName: distributor.shop?.name || "Distributor Hub",
      distributorId: distributor._id.toString(),
      distributorMobile: distributor.mobile,
      reason,
      date: new Date(),
    };
  } finally {
    session.endSession();
  }

  // 6. Asynchronous Push Notification Pipeline (Non-blocking post-commit)
  if (transferResult) {
    // Notify Distributor
    sendWalletTransferNotification({
      recipientId: distributor._id,
      type: "WALLET_CREDIT",
      title: `💰 Wallet Credited: ₹${numAmount.toLocaleString("en-IN")}`,
      body: `₹${numAmount.toLocaleString("en-IN")} received from retailer ${sender.fullName || "Retailer"} (${sender.shop?.name || sender.mobile}). New Balance: ₹${transferResult.distributorBalanceAfter.toFixed(2)}`,
      data: {
        type: "WALLET_CREDIT",
        screen: "WALLET",
        txnId: transferResult.distributorTxnId,
        amount: String(numAmount),
        senderMobile: sender.mobile,
      },
    }).catch((err) => console.warn("Distributor push notification error:", err?.message));

    // Notify Retailer
    sendWalletTransferNotification({
      recipientId: sender._id,
      type: "WALLET_DEBIT",
      title: `💸 Wallet Debited: ₹${numAmount.toLocaleString("en-IN")}`,
      body: `₹${numAmount.toLocaleString("en-IN")} settled to distributor ${distributor.fullName || "Distributor"} (${distributor.mobile}). Remaining Balance: ₹${transferResult.senderBalanceAfter.toFixed(2)}`,
      data: {
        type: "WALLET_DEBIT",
        screen: "WALLET",
        txnId: transferResult.transactionId,
        amount: String(numAmount),
        distributorMobile: distributor.mobile,
      },
    }).catch((err) => console.warn("Retailer push notification error:", err?.message));
  }

  return transferResult;
};

/**
 * Fetch the latest 5 settlement transfers to distributor for the authenticated retailer
 */
export const getRecentDistributorSettlementsService = async (userId) => {
  if (!userId) {
    throw ApiError.unauthorized("Authentication required");
  }

  const wallet = await Wallet.findOne({ user: userId }).select("_id").lean();
  if (!wallet) {
    return [];
  }

  const transactions = await Transaction.find({
    wallet: wallet._id,
    service: "SETTLEMENT",
    description: /Distributor/i,
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  return transactions.map((t) => ({
    id: t.transactionId || String(t._id),
    name: t.payee?.accountHolderName || "Distributor",
    shopName: t.payee?.bankName || "",
    mobile: t.payee?.accountNumber || "",
    amount: t.amount,
    type: t.type,
    date: t.createdAt,
    status: t.status === "success" ? "Success" : t.status,
    description: t.description,
  }));
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
  verifyRecipientRetailerService,
  transferRetailerToRetailerService,
  getRecentRetailerSettlementsService,
  getDistributorSettlementInfoService,
  transferRetailerToDistributorService,
  getRecentDistributorSettlementsService,
};




