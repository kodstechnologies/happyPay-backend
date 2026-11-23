import Joi from "joi";
import validate from "../../../middlewares/validate.middleware.js";

const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/**
 * Validation for POST /admin/fund-requests/banks
 */
const createFundRequestBankSchema = Joi.object({
  bank: Joi.string().trim().min(2).max(100).required().messages({
    "any.required": "Bank name is required",
    "string.min":   "Bank name must be at least 2 characters",
    "string.max":   "Bank name must not exceed 100 characters",
  }),

  bankCode: Joi.string().trim().max(50).optional().allow("", null).messages({
    "string.max": "Bank code must not exceed 50 characters",
  }),

  ifscCode: Joi.string().trim().uppercase().pattern(IFSC_PATTERN).required().messages({
    "any.required":          "IFSC code is required",
    "string.pattern.base":   "IFSC code must match the format XXXX0XXXXXX (e.g. SBIN0001234)",
  }),

  accountNumber: Joi.string().trim().min(9).max(18).required().messages({
    "any.required": "Account number is required",
    "string.min":   "Account number must be at least 9 digits",
    "string.max":   "Account number must not exceed 18 digits",
  }),

  branchName: Joi.string().trim().min(2).max(100).required().messages({
    "any.required": "Branch name is required",
    "string.min":   "Branch name must be at least 2 characters",
    "string.max":   "Branch name must not exceed 100 characters",
  }),
});

/**
 * Validation for PATCH /admin/fund-requests/banks/:bankId
 * All fields optional — at least one must be provided.
 */
const updateFundRequestBankSchema = Joi.object({
  bank: Joi.string().trim().min(2).max(100).optional().messages({
    "string.min": "Bank name must be at least 2 characters",
    "string.max": "Bank name must not exceed 100 characters",
  }),

  bankCode: Joi.string().trim().max(50).optional().allow("", null).messages({
    "string.max": "Bank code must not exceed 50 characters",
  }),

  ifscCode: Joi.string().trim().uppercase().pattern(IFSC_PATTERN).optional().messages({
    "string.pattern.base": "IFSC code must match the format XXXX0XXXXXX (e.g. SBIN0001234)",
  }),

  accountNumber: Joi.string().trim().min(9).max(18).optional().messages({
    "string.min": "Account number must be at least 9 digits",
    "string.max": "Account number must not exceed 18 digits",
  }),

  branchName: Joi.string().trim().min(2).max(100).optional().messages({
    "string.min": "Branch name must be at least 2 characters",
    "string.max": "Branch name must not exceed 100 characters",
  }),
}).min(1).messages({
  "object.min": "At least one field (bank, ifscCode, accountNumber, branchName) must be provided",
});

export const validateCreateFundRequestBank = validate(createFundRequestBankSchema);
export const validateUpdateFundRequestBank = validate(updateFundRequestBankSchema);
