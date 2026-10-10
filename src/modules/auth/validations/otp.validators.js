import Joi from "joi";
import validate from "../../../middlewares/validate.middleware.js";

const sendOtpSchema = Joi.object({
  mobile: Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "any.required": "Mobile number is required",
      "string.empty": "Mobile number is required",
      "string.pattern.base": "Please enter a valid 10-digit mobile number",
    }),
});

const verifyOtpSchema = Joi.object({
  mobile: Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "any.required": "Mobile number is required",
      "string.empty": "Mobile number is required",
      "string.pattern.base": "Please enter a valid 10-digit mobile number",
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
  panNumber: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
    .required()
    .messages({
      "any.required": "PAN number is required",
      "string.empty": "PAN number is required",
      "string.pattern.base": "Please enter a valid PAN number (e.g., ABCDE1234F)",
    }),
});

export const validateSendOtp = validate(sendOtpSchema);
export const validateVerifyOtp = validate(verifyOtpSchema);
