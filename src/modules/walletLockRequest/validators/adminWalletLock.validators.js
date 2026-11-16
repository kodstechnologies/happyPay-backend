import Joi from "joi";
import validate from "../../../middlewares/validate.middleware.js";

/**
 * Validation schema for locking user wallet (admin)
 */
const lockWalletSchema = Joi.object({
  userId: Joi.string()
    .required()
    .messages({
      "any.required": "User ID is required",
      "string.empty": "User ID is required",
    }),

  reason: Joi.string()
    .trim()
    .min(5)
    .max(500)
    .required()
    .messages({
      "any.required": "Reason is required",
      "string.empty": "Reason is required",
      "string.min": "Reason must be at least 5 characters",
      "string.max": "Reason must not exceed 500 characters",
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
 * Validation schema for unlocking user wallet (admin)
 */
const unlockWalletSchema = Joi.object({
  userId: Joi.string()
    .required()
    .messages({
      "any.required": "User ID is required",
      "string.empty": "User ID is required",
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

export const validateLockWallet = validate(lockWalletSchema);
export const validateUnlockWallet = validate(unlockWalletSchema);
