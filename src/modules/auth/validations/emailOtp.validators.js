import Joi from "joi";
import mongoose from "mongoose";
import validate from "../../../middlewares/validate.middleware.js";

const objectId = (label) =>
  Joi.string()
    .trim()
    .required()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error("objectId.invalid", { label });
      }
      return value;
    })
    .messages({
      "any.required": `${label} is required`,
      "string.empty": `${label} is required`,
      "objectId.invalid": `Invalid ${label}`,
    });

const sendEmailOtpSchema = Joi.object({
  userId: Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error("objectId.invalid", { label: "User ID" });
      }
      return value;
    })
    .optional()
    .messages({
      "objectId.invalid": "Invalid User ID",
    }),
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
  userId: objectId("User ID"),
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
});

export const validateSendEmailOtp = validate(sendEmailOtpSchema);
export const validateVerifyEmailOtp = validate(verifyEmailOtpSchema);
