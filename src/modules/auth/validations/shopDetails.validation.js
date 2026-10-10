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

const shopDetailsSchema = Joi.object({
  userId: objectId("User ID"),
  
  shopName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      "any.required": "Shop name is required",
      "string.empty": "Shop name is required",
      "string.min": "Shop name must be at least 2 characters",
      "string.max": "Shop name must not exceed 100 characters",
    }),

  shopCategory: objectId("Shop category"),
  
  propertyType: objectId("Property type"),

  city: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      "any.required": "City is required",
      "string.empty": "City is required",
      "string.min": "City must be at least 2 characters",
      "string.max": "City must not exceed 50 characters",
    }),

  pincode: Joi.string()
    .trim()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "any.required": "Pincode is required",
      "string.empty": "Pincode is required",
      "string.pattern.base": "Pincode must be exactly 6 digits",
    }),

  address: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .messages({
      "any.required": "Address is required",
      "string.empty": "Address is required",
      "string.min": "Address must be at least 10 characters",
      "string.max": "Address must not exceed 500 characters",
    }),

  latitude: Joi.number()
    .min(-90)
    .max(90)
    .required()
    .messages({
      "any.required": "Latitude is required",
      "number.base": "Latitude must be a number",
      "number.min": "Latitude must be between -90 and 90",
      "number.max": "Latitude must be between -90 and 90",
    }),

  longitude: Joi.number()
    .min(-180)
    .max(180)
    .required()
    .messages({
      "any.required": "Longitude is required",
      "number.base": "Longitude must be a number",
      "number.min": "Longitude must be between -180 and 180",
      "number.max": "Longitude must be between -180 and 180",
    }),

  businessProofType: objectId("Business proof type"),

  // Optional alternative field names (but if provided, they must be valid)
  fulladdress: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .optional()
    .messages({
      "string.min": "Full address must be at least 10 characters",
      "string.max": "Full address must not exceed 500 characters",
    }),
  businessProof: objectId("Business proof type").optional(),

  // Note: File fields (shopInsidePhoto, shopOutsidePhoto, businessProofDocument, businessProofDoc) 
  // are handled by multer middleware and available in req.files, not req.body
});

export const validateShopDetails = validate(shopDetailsSchema);