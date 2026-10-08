import Joi from "joi";

export const initiatePaymentSchema = Joi.object({
  amount: Joi.number().positive().required().messages({
    "any.required": "Valid amount is required",
    "number.base": "Amount must be a number",
    "number.positive": "Amount must be a positive number",
  }),
  purpose: Joi.string().trim().required().messages({
    "any.required": "Payment purpose is required",
    "string.empty": "Payment purpose cannot be empty",
  }),
  method: Joi.string().trim().optional().default("razorpay").messages({
    "string.empty": "Payment method cannot be empty",
  }),
});

export const verifyPaymentSchema = Joi.object({
  razorpay_order_id: Joi.string().trim().required().messages({
    "any.required": "Razorpay Order ID is required",
    "string.empty": "Razorpay Order ID cannot be empty",
  }),
  razorpay_payment_id: Joi.string().trim().required().messages({
    "any.required": "Razorpay Payment ID is required",
    "string.empty": "Razorpay Payment ID cannot be empty",
  }),
  razorpay_signature: Joi.string().trim().required().messages({
    "any.required": "Razorpay Signature is required",
    "string.empty": "Razorpay Signature cannot be empty",
  }),
  purpose: Joi.string().trim().required().messages({
    "any.required": "Payment purpose is required",
    "string.empty": "Payment purpose cannot be empty",
  }),
});
