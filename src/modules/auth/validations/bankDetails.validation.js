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

const bankDetailsSchema = Joi.object({
  userId: objectId("User ID"),

  bankName: Joi.alternatives()
    .try(
      Joi.string().trim().min(2).max(100),
      Joi.array().items(Joi.string().trim().min(2).max(100))
    )
    .required()
    .messages({
      "any.required": "Bank name is required",
      "string.empty": "Bank name is required",
      "string.min": "Bank name must be at least 2 characters",
      "string.max": "Bank name must not exceed 100 characters",
    }),

  ifscCode: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .required()
    .messages({
      "any.required": "IFSC code is required",
      "string.empty": "IFSC code is required",
      "string.pattern.base": "Please enter a valid IFSC code (e.g., HDFC0001234)",
    }),

  accountNumber: Joi.string()
    .trim()
    .pattern(/^\d{9,18}$/)
    .required()
    .messages({
      "any.required": "Account number is required",
      "string.empty": "Account number is required",
      "string.pattern.base": "Account number must be between 9 to 18 digits",
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
});

export const validateBankDetails = validate(bankDetailsSchema);