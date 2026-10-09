import razorpay from "../../../config/razorpay.js";
import crypto from "crypto";
import env from "../../../config/env.js";

export const createRazorpayOrder = async (amount, currency = "INR") => {
  const options = {
    amount: amount * 100,
    currency,
    receipt: `rcpt_${Date.now()}`
  };
  return await razorpay.orders.create(options);
};

export const verifyRazorpaySignature = (orderId, paymentId, signature) => {
  const text = orderId + "|" + paymentId;

  const generatedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(text)
    .digest("hex");

  return generatedSignature === signature;
};
