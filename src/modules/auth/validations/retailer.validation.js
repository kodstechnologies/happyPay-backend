import Joi from "joi";
import mongoose from "mongoose";

const RETAILER_FILE_FIELDS = [
  "selfie",
  "panDocument",
  "aadhaarDocument",
  "shopInsidePhoto",
  "shopOutsidePhoto",
  "shopLocationPhoto",
  "businessProofDocument",
];

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

const uploadedFile = (label) =>
  Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": `${label} is required`,
      "string.empty": `${label} is required`,
    });

export const registerRetailerSchema = Joi.object({
  mobile: Joi.string()
    .trim()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "any.required": "mobile is required",
      "string.empty": "mobile is required",
      "string.pattern.base": "Please enter a valid 10-digit mobile number",
    }),

  name: Joi.string().trim().required().messages({
    "any.required": "name is required",
    "string.empty": "name is required",
  }),

  gender: Joi.string().trim().required().messages({
    "any.required": "gender is required",
    "string.empty": "gender is required",
  }),

  pan: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
    .required()
    .messages({
      "any.required": "pan is required",
      "string.empty": "pan is required",
      "string.pattern.base": "Please enter a valid PAN number",
    }),

  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "any.required": "email is required",
      "string.empty": "email is required",
      "string.email": "Please enter a valid email address",
    }),

  aadhaar: Joi.string()
    .trim()
    .pattern(/^\d{12}$/)
    .required()
    .messages({
      "any.required": "aadhaar is required",
      "string.empty": "aadhaar is required",
      "string.pattern.base": "Please enter a valid 12-digit Aadhaar number",
    }),

  fulladdress: Joi.string().trim().optional(),
  pincode: Joi.string().trim().pattern(/^\d{6}$/).optional(),
  city: Joi.string().trim().optional(),

  dob: Joi.string()
    .trim()
    .required()
    .custom((value, helpers) => {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return helpers.error("date.invalid");
      }

      return value;
    })
    .messages({
      "any.required": "dob is required",
      "string.empty": "dob is required",
      "date.invalid": "Please enter a valid date of birth",
    }),

  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),

  shopName: Joi.string().trim().required().messages({
    "any.required": "shopName is required",
    "string.empty": "shopName is required",
  }),

  shopCategory: objectId("shop category"),

  propertyType: objectId("property type"),

  shopAddress: Joi.string().trim().required().messages({
    "any.required": "shopAddress is required",
    "string.empty": "shopAddress is required",
  }),

  maritalStatus: Joi.string().trim().required().messages({
    "any.required": "maritalStatus is required",
    "string.empty": "maritalStatus is required",
  }),

  educationalQualification: Joi.string().trim().required().messages({
    "any.required": "educationalQualification is required",
    "string.empty": "educationalQualification is required",
  }),

  fatherName: Joi.string().trim().optional(),

  businessProof: objectId("business proof"),

  // bankName: Joi.string().trim().required().messages({
  //   "any.required": "bankName is required",
  //   "string.empty": "bankName is required",
  // }),

  ifscCode: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .required()
    .messages({
      "any.required": "ifscCode is required",
      "string.empty": "ifscCode is required",
      "string.pattern.base": "Please enter a valid IFSC code",
    }),

  accountNumber: Joi.string()
    .trim()
    .pattern(/^\d{9,18}$/)
    .required()
    .messages({
      "any.required": "accountNumber is required",
      "string.empty": "accountNumber is required",
      "string.pattern.base": "Please enter a valid account number",
    }),



  selfie: uploadedFile("selfie"),
  panDocument: uploadedFile("panDocument"),
  aadhaarDocument: uploadedFile("aadhaarDocument"),
  shopInsidePhoto: Joi.string().trim().allow("").optional(),
  shopOutsidePhoto: Joi.string().trim().allow("").optional(),
  shopLocationPhoto: Joi.string().trim().allow("").optional(),
  businessProofDocument: uploadedFile("businessProofDocument"),

  fcmToken: Joi.string().trim().optional(),
  deviceId: Joi.string().trim().optional(),
  platform: Joi.string().trim().valid("android", "ios", "web").optional(),
  deviceName: Joi.string().trim().optional(),
});

const buildRegisterRetailerPayload = (body = {}, files = {}) => ({
  ...body,
  ...Object.fromEntries(
    RETAILER_FILE_FIELDS.map((field) => [
      field,
      files?.[field]?.[0]?.path || "",
    ])
  ),
});

export const validateRegisterRetailer = (req, res, next) => {
  const payload = buildRegisterRetailerPayload(req.body, req.files);

  const { error, value } = registerRetailerSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.details.map((item) => item.message),
    });
  }

  const sanitizedBody = { ...value };

  for (const field of RETAILER_FILE_FIELDS) {
    delete sanitizedBody[field];
  }

  req.body = sanitizedBody;

  next();
};
