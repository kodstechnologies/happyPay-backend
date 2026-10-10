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

const aadhaarDetailsSchema = Joi.object({
  userId: objectId("User ID"),

  aadhaarNumber: Joi.string()
    .trim()
    .pattern(/^\d{12}$/)
    .required()
    .messages({
      "any.required": "Aadhaar number is required",
      "string.empty": "Aadhaar number is required",
      "string.pattern.base": "Please enter a valid 12-digit Aadhaar number",
    }),

  adharNumber: Joi.string()
    .trim()
    .pattern(/^\d{12}$/)
    .optional()
    .messages({
      "string.pattern.base": "Please enter a valid 12-digit Aadhaar number",
    }),

  aadhaarConsent: Joi.boolean()
    .required()
    .messages({
      "boolean.base": "Aadhaar consent must be true or false",
    }),

  isAdharConsentGiven: Joi.boolean()
    .required()
    .messages({
      "boolean.base": "Aadhaar consent must be true or false",
    }),

  aadhaarMobileLinked: Joi.boolean()
    .required()
    .messages({
      "boolean.base": "Aadhaar mobile linked status must be true or false",
    }),

  // Note: File fields (aadhaarDocument, adharDoc) are handled by multer middleware and available in req.files, not req.body
});

export const validateAadhaarDetails = validate(aadhaarDetailsSchema);