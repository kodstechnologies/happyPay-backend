import Joi from "joi";
import validate from "../../../middlewares/validate.middleware.js";

/**
 * Validation schema for creating a fund request
 */
const createFundRequestSchema = Joi.object({
  paymentMode: Joi.string()
    .trim()
    .valid("UPI", "NEFT", "IMPS", "RTGS", "CASH", "CHEQUE", "OTHER")
    .required()
    .messages({
      "any.required": "Payment mode is required",
      "string.empty": "Payment mode is required",
      "any.only": "Invalid payment mode",
    }),

  rrn: Joi.string()
    .trim()
    .optional()
    .allow("", null)
    .messages({
      "string.empty": "RRN cannot be empty",
    }),

  amount: Joi.number()
    .positive()
    .required()
    .messages({
      "any.required": "Amount is required",
      "number.base": "Amount must be a number",
      "number.positive": "Amount must be greater than 0",
    }),

  paymentDate: Joi.date()
    .iso()
    .required()
    .messages({
      "any.required": "Payment date is required",
      "date.base": "Invalid payment date",
      "date.format": "Payment date must be in ISO format",
    }),

  bank: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      "any.required": "Bank name is required",
      "string.empty": "Bank name is required",
      "string.min": "Bank name must be at least 2 characters",
      "string.max": "Bank name must not exceed 100 characters",
    }),

  ifscCode: Joi.string()
    .trim()
    .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .required()
    .messages({
      "any.required": "IFSC code is required",
      "string.empty": "IFSC code is required",
      "string.pattern.base": "Please enter a valid IFSC code (e.g., SBIN0001234)",
    }),

  accountNumber: Joi.string()
    .trim()
    .min(9)
    .max(18)
    .required()
    .messages({
      "any.required": "Account number is required",
      "string.empty": "Account number is required",
      "string.min": "Account number must be at least 9 digits",
      "string.max": "Account number must not exceed 18 digits",
    }),

  branchName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      "any.required": "Branch name is required",
      "string.empty": "Branch name is required",
      "string.min": "Branch name must be at least 2 characters",
      "string.max": "Branch name must not exceed 100 characters",
    }),

  // receiptSlip is uploaded to S3 by multer middleware and added to req.body
  receiptSlip: Joi.string()
    .trim()
    .uri()
    .required()
    .messages({
      "any.required": "Receipt slip is required",
      "string.empty": "Receipt slip is required",
      "string.uri": "Receipt slip must be a valid URL",
    }),

  // receiptSlipKey is the S3 key for the uploaded file (added by uploadToS3 middleware)
  receiptSlipKey: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "Receipt slip key is required",
      "string.empty": "Receipt slip key is required",
    }),

  notes: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow("", null)
    .messages({
      "string.max": "Notes must not exceed 500 characters",
    }),
});

/**
 * Validation schema for approving a fund request (admin)
 */
const approveFundRequestSchema = Joi.object({
  adminNotes: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow("", null)
    .messages({
      "string.max": "Admin notes must not exceed 500 characters",
    }),
});

/**
 * Validation schema for rejecting a fund request (admin)
 */
const rejectFundRequestSchema = Joi.object({
  rejectionReason: Joi.string()
    .trim()
    .min(5)
    .max(500)
    .required()
    .messages({
      "any.required": "Rejection reason is required",
      "string.empty": "Rejection reason is required",
      "string.min": "Rejection reason must be at least 5 characters",
      "string.max": "Rejection reason must not exceed 500 characters",
    }),

  adminNotes: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow("", null)
    .messages({
      "string.max": "Admin notes must not exceed 500 characters",
    }),
});

/**
 * Validation schema for resubmitting a fund request (retailer)
 */
const resubmitFundRequestSchema = Joi.object({
  paymentMode: Joi.string()
    .trim()
    .valid("UPI", "NEFT", "IMPS","CASH", "CHEQUE", "OTHER")
    .optional()
    .messages({
      "any.only": "Invalid payment mode",
    }),

  rrn: Joi.string()
    .trim()
    .optional()
    .allow("", null)
    .messages({
      "string.empty": "RRN cannot be empty",
    }),

  amount: Joi.number()
    .positive()
    .optional()
    .messages({
      "number.base": "Amount must be a number",
      "number.positive": "Amount must be greater than 0",
    }),

  paymentDate: Joi.date()
    .iso()
    .optional()
    .messages({
      "date.base": "Invalid payment date",
      "date.format": "Payment date must be in ISO format",
    }),

  bank: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      "string.min": "Bank name must be at least 2 characters",
      "string.max": "Bank name must not exceed 100 characters",
    }),

  ifscCode: Joi.string()
    .trim()
    .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .optional()
    .messages({
      "string.pattern.base": "Please enter a valid IFSC code (e.g., SBIN0001234)",
    }),

  accountNumber: Joi.string()
    .trim()
    .min(9)
    .max(18)
    .optional()
    .messages({
      "string.min": "Account number must be at least 9 digits",
      "string.max": "Account number must not exceed 18 digits",
    }),

  branchName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      "string.min": "Branch name must be at least 2 characters",
      "string.max": "Branch name must not exceed 100 characters",
    }),

  // receiptSlip is uploaded to S3 by multer middleware and added to req.body
  receiptSlip: Joi.string()
    .trim()
    .uri()
    .optional()
    .allow("", null)
    .messages({
      "string.uri": "Receipt slip must be a valid URL",
    }),

  // receiptSlipKey is the S3 key for the uploaded file (added by uploadToS3 middleware)
  receiptSlipKey: Joi.string()
    .trim()
    .optional()
    .allow("", null)
    .messages({
      "string.empty": "Receipt slip key cannot be empty",
    }),

  notes: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow("", null)
    .messages({
      "string.max": "Notes must not exceed 500 characters",
    }),
});

export const validateCreateFundRequest = validate(createFundRequestSchema);
export const validateApproveFundRequest = validate(approveFundRequestSchema);
export const validateRejectFundRequest = validate(rejectFundRequestSchema);
export const validateResubmitFundRequest = validate(resubmitFundRequestSchema);
