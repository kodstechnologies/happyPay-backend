import Joi from "joi";
import mongoose from "mongoose";

const objectIdValidator = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error("any.invalid");
  }
  return value;
};

const latitudeRule = Joi.alternatives()
  .try(
    Joi.number().min(-90).max(90),
    Joi.string().trim().min(1)
  )
  .required()
  .messages({
    "any.required": "Latitude is required",
    "string.empty": "Latitude cannot be empty",
  });

const longitudeRule = Joi.alternatives()
  .try(
    Joi.number().min(-180).max(180),
    Joi.string().trim().min(1)
  )
  .required()
  .messages({
    "any.required": "Longitude is required",
    "string.empty": "Longitude cannot be empty",
  });

const merchantIdRule = Joi.alternatives()
  .try(
    Joi.string().trim().min(1),
    Joi.number()
  )
  .required()
  .messages({
    "any.required": "merchantId is required",
    "string.empty": "merchantId cannot be empty",
  });

const initiateUpiCashpointSchema = Joi.object({
  latitude: latitudeRule,
  longitude: longitudeRule,

  merchantLoginId: Joi.alternatives()
    .try(
      Joi.string().trim().min(1),
      Joi.number()
    )
    .required()
    .messages({
      "any.required": "merchantLoginId is required",
      "string.empty": "merchantLoginId cannot be empty",
    }),

  amount: Joi.alternatives()
    .try(
      Joi.number().positive(),
      Joi.string().trim().pattern(/^\d+(\.\d{1,2})?$/)
    )
    .required()
    .messages({
      "any.required": "Amount is required",
      "string.empty": "Amount cannot be empty",
      "number.positive": "Amount must be greater than zero",
      "string.pattern.base": "Please enter a valid monetary amount",
    }),
}).unknown(true);

const merchantRegistrationSendOtpSchema = Joi.object({
  merchantId: merchantIdRule,
});

const merchantRegistrationVerifySchema = Joi.object({
  merchantId: merchantIdRule,

  otp: Joi.alternatives()
    .try(
      Joi.string().trim().min(1),
      Joi.number()
    )
    .required()
    .messages({
      "any.required": "otp is required",
      "string.empty": "otp cannot be empty",
    }),
});

const sellerOnboardingSchema = Joi.object({
  osVersion: Joi.string().trim().required().messages({
    "any.required": "osVersion is required",
    "string.empty": "osVersion cannot be empty",
  }),
  osType: Joi.string().trim().required().messages({
    "any.required": "osType is required",
    "string.empty": "osType cannot be empty",
  }),
  appVersion: Joi.string().trim().required().messages({
    "any.required": "appVersion is required",
    "string.empty": "appVersion cannot be empty",
  }),
  deviceFingerprint: Joi.string().trim().required().messages({
    "any.required": "deviceFingerprint is required",
    "string.empty": "deviceFingerprint cannot be empty",
  }),
  ipaddress: Joi.string().trim().required().messages({
    "any.required": "ipaddress is required",
    "string.empty": "ipaddress cannot be empty",
  }),
  longitude: longitudeRule,
  latitude: latitudeRule,
  merchantId: merchantIdRule,
});

const merchantRegistrationSchema = Joi.object({
  userId: Joi.string()
    .trim()
    .custom(objectIdValidator, "MongoDB ObjectId validation")
    .messages({
      "any.invalid": "Invalid User ID format",
      "string.empty": "User ID cannot be empty",
    }),

  userid: Joi.string()
    .trim()
    .custom(objectIdValidator, "MongoDB ObjectId validation")
    .messages({
      "any.invalid": "Invalid User ID format",
      "string.empty": "User ID cannot be empty",
    }),

  // All 24 KYC/profile fields are optional in the request body —
  // the service fills them automatically from the retailer's DB record
  // when only userId is supplied. Pass these only to explicitly override
  // a value that differs from what is stored in the database.
  stateCode: Joi.string().trim().optional(),
  fathername: Joi.string().trim().optional(),
  mothername: Joi.string().trim().optional(),
  firstname: Joi.string().trim().optional(),
  lastname: Joi.string().trim().optional(),
  dob: Joi.string().trim().optional(),
  email: Joi.string().trim().email().optional().messages({
    "string.email": "Please provide a valid email address",
  }),
  phone: Joi.alternatives()
    .try(Joi.string().trim().min(10), Joi.number())
    .optional(),
  latitude: Joi.alternatives()
    .try(Joi.number().min(-90).max(90), Joi.string().trim().min(1))
    .optional(),
  longitude: Joi.alternatives()
    .try(Joi.number().min(-180).max(180), Joi.string().trim().min(1))
    .optional(),
  txnid: Joi.string().trim().optional(),
  merchantpincode: Joi.alternatives()
    .try(Joi.string().trim().min(6), Joi.number())
    .optional(),
  panno: Joi.string().trim().optional(),
  accountnumber: Joi.alternatives()
    .try(Joi.string().trim().min(1), Joi.number())
    .optional(),
  ifsc: Joi.string().trim().optional(),
  bankname: Joi.string().trim().optional(),
  aadharno: Joi.alternatives()
    .try(Joi.string().trim().min(12), Joi.number())
    .optional(),
  state: Joi.string().trim().optional(),
  shopname: Joi.string().trim().optional(),
  address: Joi.string().trim().optional(),
  gender: Joi.string().trim().optional(),
  maritalstatus: Joi.string().trim().optional(),
  ipaddress: Joi.string().trim().optional(),
  district: Joi.string().trim().optional(),
})
  .or("userId", "userid")
  .unknown(true)
  .messages({
    "object.missing": "userId is required in request body",
  })
  .messages({
    "object.missing": "userId is required in request body",
  });

const merchantEkycSchema = Joi.object({
  merchantId: merchantIdRule,
  pidData: Joi.alternatives()
    .try(
      Joi.string().trim().min(1),
      Joi.object()
    )
    .required()
    .messages({
      "any.required": "pidData is required",
      "string.empty": "pidData cannot be empty",
    }),
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Page must be a number",
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    "number.base": "Limit must be a number",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 100",
  }),
  search: Joi.string().trim().allow("").messages({
    "string.base": "Search must be a string",
  }),
});

const districtPaginationSchema = Joi.object({
  stateCode: Joi.string().trim().required().messages({
    "any.required": "stateCode is required",
    "string.empty": "stateCode cannot be empty",
  }),
  page: Joi.number().integer().min(1).default(1).messages({
    "number.base": "Page must be a number",
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    "number.base": "Limit must be a number",
    "number.min": "Limit must be at least 1",
    "number.max": "Limit cannot exceed 100",
  }),
  search: Joi.string().trim().allow("").messages({
    "string.base": "Search must be a string",
  }),
});

export {
  initiateUpiCashpointSchema,
  merchantRegistrationSchema,
  merchantRegistrationSendOtpSchema,
  merchantRegistrationVerifySchema,
  sellerOnboardingSchema,
  merchantEkycSchema,
  paginationSchema,
  districtPaginationSchema,
};
