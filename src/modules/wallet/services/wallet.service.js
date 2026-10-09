import mongoose from "mongoose";
import Wallet from "../model/wallet.model.js";
import Transaction from "../../transaction/model/transaction.model.js";

import { ApiError } from "../../../utils/ApiError.js";
import { generate15CharTxnId } from "../../../utils/generateTxnId.js";


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

export default {
  addAmountToWallet,
  getUserWalletBalance,
  createWallet,
};
