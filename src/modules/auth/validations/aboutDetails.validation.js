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

const aboutDetailsSchema = Joi.object({
  userId: objectId("User ID"),

  fullName: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      "any.required": "Full name is required",
      "string.empty": "Full name is required",
      "string.min": "Full name must be at least 2 characters",
      "string.max": "Full name must not exceed 100 characters",
    }),

  dateOfBirth: Joi.string()
    .trim()
    .required()
    .custom((value, helpers) => {
      if (value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          return helpers.error("date.invalid");
        }
      }
      return value;
    })
    .messages({
      "date.invalid": "Please enter a valid date of birth",
    }),

  gender: Joi.string()
    .trim()
    .valid("Male", "Female", "Other")
    .required()
    .messages({
      "any.required": "Gender is required",
      "string.empty": "Gender is required",
      "any.only": "Gender must be Male, Female, or Other",
    }),

  maritalStatus: Joi.string()
    .trim()
    .valid("Single", "Married", "Divorced", "Widowed")
    .required()
    .messages({
      "any.required": "Marital status is required",
      "string.empty": "Marital status is required",
      "any.only": "Marital status must be Single, Married, Divorced, or Widowed",
    }),

  educationalQualification: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      "any.required": "Educational qualification is required",
      "string.empty": "Educational qualification is required",
      "string.min": "Educational qualification must be at least 2 characters",
      "string.max": "Educational qualification must not exceed 100 characters",
    }),


  // Note: File field (selfie) is handled by multer middleware and available in req.files, not req.body
});

export const validateAboutDetails = validate(aboutDetailsSchema);