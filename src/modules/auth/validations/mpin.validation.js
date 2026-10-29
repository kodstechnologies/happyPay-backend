import Joi from "joi";
import validate from "../../../middlewares/validate.middleware.js";

const setupMpinSchema = Joi.object({
  newMpin: Joi.string()
    .trim()
    .pattern(/^\d{4}$/)
    .required()
    .messages({
      "any.required": "New MPIN is required",
      "string.empty": "New MPIN cannot be empty",
      "string.pattern.base": "MPIN must be exactly 4 numeric digits",
    }),
  confirmMpin: Joi.string()
    .trim()
    .valid(Joi.ref("newMpin"))
    .required()
    .messages({
      "any.required": "Confirm MPIN is required",
      "any.only": "New MPIN and Confirm MPIN do not match",
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

const changeMpinSchema = Joi.object({
  currentMpin: Joi.string()
    .trim()
    .pattern(/^\d{4}$/)
    .allow("", null)
    .optional()
    .messages({
      "string.pattern.base": "Current MPIN must be 4 digits",
    }),
  newMpin: Joi.string()
    .trim()
    .pattern(/^\d{4}$/)
    .required()
    .messages({
      "any.required": "New MPIN is required",
      "string.empty": "New MPIN cannot be empty",
      "string.pattern.base": "New MPIN must be exactly 4 numeric digits",
    }),
  confirmMpin: Joi.string()
    .trim()
    .valid(Joi.ref("newMpin"))
    .required()
    .messages({
      "any.required": "Confirm MPIN is required",
      "any.only": "New MPIN and Confirm MPIN do not match",
    }),
  otp: Joi.string()
    .trim()
    .pattern(/^\d{4}$/)
    .required()
    .messages({
      "any.required": "OTP verification is compulsory to change MPIN",
      "string.empty": "OTP verification is compulsory to change MPIN",
      "string.pattern.base": "OTP must be 4 digits",
    }),
});

const verifyMpinSchema = Joi.object({
  mpin: Joi.string()
    .trim()
    .pattern(/^\d{4}$/)
    .required()
    .messages({
      "any.required": "MPIN is required",
      "string.empty": "MPIN is required",
      "string.pattern.base": "MPIN must be exactly 4 numeric digits",
    }),
});

export const validateSetupMpin = validate(setupMpinSchema);
export const validateChangeMpin = validate(changeMpinSchema);
export const validateVerifyMpin = validate(verifyMpinSchema);
