import Joi from "joi";
import validate from "../../../middlewares/validate.middleware.js";

const sendEmailOtpSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "any.required": "Email is required",
      "string.empty": "Email is required",
      "string.email": "Please enter a valid email address",
    }),
});

const verifyEmailOtpSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "any.required": "Email is required",
      "string.empty": "Email is required",
      "string.email": "Please enter a valid email address",
    }),
  otp: Joi.string()
    .trim()
    .pattern(/^\d{4}$/)
    .required()
    .messages({
      "any.required": "OTP is required",
      "string.empty": "OTP is required",
      "string.pattern.base": "OTP must be 4 digits",
    }),
  mobile: Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .optional()
    .allow("")
    .messages({
      "string.pattern.base": "Please enter a valid 10-digit mobile number",
    }),
});

export const validateSendEmailOtp = validate(sendEmailOtpSchema);
export const validateVerifyEmailOtp = validate(verifyEmailOtpSchema);
