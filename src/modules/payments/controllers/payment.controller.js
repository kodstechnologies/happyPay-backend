import { createRazorpayOrder, verifyRazorpaySignature } from "../services/payment.service.js";
import { addAmountToWallet } from "../../wallet/services/wallet.service.js";
import Payment from "../models/payment.model.js";
import Wallet from "../../wallet/model/wallet.model.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";
import { ApiError } from "../../../utils/ApiError.js";

export const initiatePayment = asyncHandler(async (req, res, next) => {
  const { amount, purpose, method = "razorpay" } = req.body;
  const userId = req.user?.userId;

  const order = await createRazorpayOrder(amount);

  if (purpose === "add_wallet") {
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      throw ApiError.notFound("Wallet not found for the user");
    }

    const payment = new Payment({
      wallet: wallet._id,
      razorpay_order_id: order.id,
      amount,
      status: "pending",
      paymentMethod: method,
    });
    await payment.save();
  } 

  return res.status(200).json(
    ApiResponse.success(
      {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      "Payment initiated successfully"
    )
  );
});

export const verifyPayment = asyncHandler(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, purpose } = req.body;
  const userId = req.user?.id || req.user?.userId || req.user?._id;

  const isValid = verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  );

  if (purpose === "add_wallet") {
    const payment = await Payment.findOne({ razorpay_order_id });
    
    if (!payment) {
       throw ApiError.notFound("Payment record not found");
    }
    if (payment.status === "success") {
       throw ApiError.badRequest("Payment has already been verified");
    }
    
     if (!isValid) {
      if (payment) {
        payment.status = "failed";
        payment.razorpay_payment_id = razorpay_payment_id;
        await payment.save();
      }
       throw ApiError.badRequest("Invalid payment signature");
    }
   
    payment.razorpay_payment_id = razorpay_payment_id;
    payment.status = "success";
    await payment.save();
    
    await addAmountToWallet(
      userId,
      payment.amount,
      razorpay_order_id,
      razorpay_payment_id,
      null,
      "Wallet Topup via Razorpay"
    );
  } else {
    // For other purposes
  }

  return res.status(200).json(
    ApiResponse.success(
      {
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id
      },
      "Payment verified successfully"
    )
  );
});
