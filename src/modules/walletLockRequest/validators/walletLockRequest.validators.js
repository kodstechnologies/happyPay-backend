import Joi from "joi";
import validate from "../../../middlewares/validate.middleware.js";

/**
 * Validation schema for creating a wallet lock request
 */
const createWalletLockRequestSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .messages({
      "any.required": "Reason is required",
      "string.empty": "Reason is required",
      "string.min": "Reason must be at least 10 characters",
      "string.max": "Reason must not exceed 500 characters",
    }),
});

/**
 * Validation schema for approving a wallet lock request (admin)
 */
const approveWalletLockRequestSchema = Joi.object({
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
 * Validation schema for rejecting a wallet lock request (admin)
 */
const rejectWalletLockRequestSchema = Joi.object({
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
 * Validation schema for unlocking wallet (admin)
 */
const unlockWalletSchema = Joi.object({
  adminNotes: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow("", null)
    .messages({
      "string.max": "Admin notes must not exceed 500 characters",
    }),
});

export const validateCreateWalletLockRequest = validate(createWalletLockRequestSchema);
export const validateApproveWalletLockRequest = validate(approveWalletLockRequestSchema);
export const validateRejectWalletLockRequest = validate(rejectWalletLockRequestSchema);
export const validateUnlockWallet = validate(unlockWalletSchema);
