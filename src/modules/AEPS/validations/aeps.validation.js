import Joi from "joi";
import mongoose from "mongoose";

const objectIdValidator = (value, helpers) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return helpers.error("any.invalid");
  }
  return value;
};

const getRetailerKycParamsSchema = Joi.object({
  retailerId: Joi.string()
    .trim()
    .custom(objectIdValidator, "MongoDB ObjectId validation")
    .required()
    .messages({
      "any.required": "Retailer ID is required",
      "string.empty": "Retailer ID is required",
      "any.invalid": "Invalid Retailer ID format",
    }),
});

const doEkycSchema = Joi.object({
  userId: Joi.string()
    .trim()
    .custom(objectIdValidator, "MongoDB ObjectId validation")
    .required()
    .messages({
      "any.required": "User ID (userId) is required",
      "string.empty": "User ID (userId) is required",
      "any.invalid": "Invalid User ID format",
    }),

  outlet_id: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "Outlet ID (outlet_id) is required",
      "string.empty": "Outlet ID (outlet_id) is required",
    }),
});

const doBioEkycSchema = Joi.object({
  userId: Joi.string()
    .trim()
    .custom(objectIdValidator, "MongoDB ObjectId validation")
    .required()
    .messages({
      "any.required": "User ID (userId) is required",
      "string.empty": "User ID (userId) is required",
      "any.invalid": "Invalid User ID format",
    }),

  outlet_id: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "Outlet ID (outlet_id) is required",
      "string.empty": "Outlet ID (outlet_id) is required",
    }),

  referenceKey: Joi.string().trim().optional().allow(""),

  latitude: Joi.alternatives()
    .try(Joi.number().min(-90).max(90), Joi.string().trim())
    .required()
    .messages({
      "any.required": "Latitude is required",
    }),

  longitude: Joi.alternatives()
    .try(Joi.number().min(-180).max(180), Joi.string().trim())
    .required()
    .messages({
      "any.required": "Longitude is required",
    }),

  Piddata: Joi.string().trim().optional().allow(""),
  PidDatatype: Joi.string().trim().optional().allow(""),
  ci: Joi.string().trim().optional().allow(""),
  dc: Joi.string().trim().optional().allow(""),
  dpId: Joi.string().trim().optional().allow(""),
  errCode: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  errInfo: Joi.string().trim().optional().allow(""),
  fCount: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  fType: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  hmac: Joi.string().trim().optional().allow(""),
  iCount: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  iType: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  mc: Joi.string().trim().optional().allow(""),
  mi: Joi.string().trim().optional().allow(""),
  nmPoints: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  pCount: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  pType: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  qScore: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  rdsId: Joi.string().trim().optional().allow(""),
  rdsVer: Joi.string().trim().optional().allow(""),
  sessionKey: Joi.string().trim().optional().allow(""),
  srno: Joi.string().trim().optional().allow(""),
  sysid: Joi.string().trim().optional().allow(""),
}).unknown(true);

const balanceEnquirySchema = Joi.object({
  outlet_id: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "Outlet ID (outlet_id) is required",
      "string.empty": "Outlet ID (outlet_id) is required",
    }),

  referenceKey: Joi.string().trim().required()
    .messages({
      "any.required": "Reference key is required",
      "string.empty": "Reference key is required",
    }),

  latitude: Joi.alternatives()
    .try(Joi.number().min(-90).max(90), Joi.string().trim())
    .required()
    .messages({
      "any.required": "Latitude is required",
    }),

  longitude: Joi.alternatives()
    .try(Joi.number().min(-180).max(180), Joi.string().trim())
    .required()
    .messages({
      "any.required": "Longitude is required",
    }),

  aadhaar: Joi.string()
    .trim()
    .pattern(/^\d{12}$/)
    .required()
    .messages({
      "any.required": "Aadhaar number is required",
      "string.empty": "Aadhaar number is required",
      "string.pattern.base": "Please enter a valid 12-digit Aadhaar number",
    }),

  mobile: Joi.string()
    .trim()
    .pattern(/^\d{10}$/)
    .optional()
    .messages({
      "string.pattern.base": "Please enter a valid 10-digit mobile number",
    }),

  bankiin: Joi.string()
    .trim()
    .optional()
    .messages({
      "string.empty": "Bank IIN cannot be empty",
    }),

  ts: Joi.string().trim().required()
    .messages({
      "any.required": "Timestamp is required",
      "string.empty": "Timestamp is required",
    }),

  // Biometric fields (optional based on provider)
  dc: Joi.string().trim().optional().allow(""),
  ci: Joi.string().trim().optional().allow(""),
  hmac: Joi.string().trim().optional().allow(""),
  mc: Joi.string().trim().optional().allow(""),
  dpId: Joi.string().trim().optional().allow(""),
  PidDatatype: Joi.string().trim().optional().allow(""),
  Piddata: Joi.string().trim().optional().allow(""),
  rdsId: Joi.string().trim().optional().allow(""),
  rdsVer: Joi.string().trim().optional().allow(""),
  sessionKey: Joi.string().trim().optional().allow(""),
  mi: Joi.string().trim().optional().allow(""),
  errInfo: Joi.string().trim().optional().allow(""),
  errCode: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  fCount: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  fType: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  iCount: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  iType: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  pCount: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  pType: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  qScore: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  nmPoints: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  srno: Joi.string().trim().optional().allow(""),
  sysid: Joi.string().trim().optional().allow(""),
}).unknown(true);

const miniStatementSchema = Joi.object({
  outlet_id: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "Outlet ID (outlet_id) is required",
      "string.empty": "Outlet ID (outlet_id) is required",
    }),

  referenceKey: Joi.string().trim().required()
    .messages({
      "any.required": "Reference key is required",
      "string.empty": "Reference key is required",
    }),

  latitude: Joi.alternatives()
    .try(Joi.number().min(-90).max(90), Joi.string().trim())
    .required()
    .messages({
      "any.required": "Latitude is required",
    }),

  longitude: Joi.alternatives()
    .try(Joi.number().min(-180).max(180), Joi.string().trim())
    .required()
    .messages({
      "any.required": "Longitude is required",
    }),

  aadhaar: Joi.string()
    .trim()
    .pattern(/^\d{12}$/)
    .required()
    .messages({
      "any.required": "Aadhaar number is required",
      "string.empty": "Aadhaar number is required",
      "string.pattern.base": "Please enter a valid 12-digit Aadhaar number",
    }),

  mobile: Joi.string()
    .trim()
    .pattern(/^\d{10}$/)
    .optional()
    .messages({
      "string.pattern.base": "Please enter a valid 10-digit mobile number",
    }),

  bankiin: Joi.string()
    .trim()
    .optional()
    .messages({
      "string.empty": "Bank IIN cannot be empty",
    }),

  ts: Joi.string().trim().required()
    .messages({
      "any.required": "Timestamp is required",
      "string.empty": "Timestamp is required",
    }),

  // Biometric fields (optional based on provider)
  dc: Joi.string().trim().optional().allow(""),
  ci: Joi.string().trim().optional().allow(""),
  hmac: Joi.string().trim().optional().allow(""),
  mc: Joi.string().trim().optional().allow(""),
  dpId: Joi.string().trim().optional().allow(""),
  PidDatatype: Joi.string().trim().optional().allow(""),
  Piddata: Joi.string().trim().optional().allow(""),
  rdsId: Joi.string().trim().optional().allow(""),
  rdsVer: Joi.string().trim().optional().allow(""),
  sessionKey: Joi.string().trim().optional().allow(""),
  mi: Joi.string().trim().optional().allow(""),
  errInfo: Joi.string().trim().optional().allow(""),
  errCode: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  fCount: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  fType: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  iCount: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  iType: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  pCount: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  pType: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  qScore: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  nmPoints: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  srno: Joi.string().trim().optional().allow(""),
  sysid: Joi.string().trim().optional().allow(""),
}).unknown(true);

const cashWithdrawSchema = Joi.object({
  outlet_id: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "Outlet ID (outlet_id) is required",
      "string.empty": "Outlet ID (outlet_id) is required",
    }),

  referenceKey: Joi.string().trim().required()
    .messages({
      "any.required": "Reference key is required",
      "string.empty": "Reference key is required",
    }),

  latitude: Joi.alternatives()
    .try(Joi.number().min(-90).max(90), Joi.string().trim())
    .required()
    .messages({
      "any.required": "Latitude is required",
    }),

  longitude: Joi.alternatives()
    .try(Joi.number().min(-180).max(180), Joi.string().trim())
    .required()
    .messages({
      "any.required": "Longitude is required",
    }),

  aadhaar: Joi.string()
    .trim()
    .pattern(/^\d{12}$/)
    .required()
    .messages({
      "any.required": "Aadhaar number is required",
      "string.empty": "Aadhaar number is required",
      "string.pattern.base": "Please enter a valid 12-digit Aadhaar number",
    }),

  mobile: Joi.string()
    .trim()
    .pattern(/^\d{10}$/)
    .optional()
    .messages({
      "string.pattern.base": "Please enter a valid 10-digit mobile number",
    }),

  bankiin: Joi.string()
    .trim()
    .optional()
    .messages({
      "string.empty": "Bank IIN cannot be empty",
    }),

  amount: Joi.alternatives()
    .try(Joi.number().min(0), Joi.string().trim())
    .required()
    .messages({
      "any.required": "Amount is required",
      "number.min": "Amount must be greater than or equal to 0",
    }),

  ts: Joi.string().trim().required()
    .messages({
      "any.required": "Timestamp is required",
      "string.empty": "Timestamp is required",
    }),

  // Biometric fields (optional based on provider)
  dc: Joi.string().trim().optional().allow(""),
  ci: Joi.string().trim().optional().allow(""),
  hmac: Joi.string().trim().optional().allow(""),
  mc: Joi.string().trim().optional().allow(""),
  dpId: Joi.string().trim().optional().allow(""),
  PidDatatype: Joi.string().trim().optional().allow(""),
  Piddata: Joi.string().trim().optional().allow(""),
  rdsId: Joi.string().trim().optional().allow(""),
  rdsVer: Joi.string().trim().optional().allow(""),
  sessionKey: Joi.string().trim().optional().allow(""),
  mi: Joi.string().trim().optional().allow(""),
  errInfo: Joi.string().trim().optional().allow(""),
  errCode: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  fCount: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  fType: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  iCount: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  iType: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  pCount: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  pType: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  qScore: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  nmPoints: Joi.alternatives().try(Joi.string(), Joi.number()).optional().allow(""),
  srno: Joi.string().trim().optional().allow(""),
  sysid: Joi.string().trim().optional().allow(""),
}).unknown(true);

const sendOtpSchema = Joi.object({
  outlet_id: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "Outlet ID (outlet_id) is required",
      "string.empty": "Outlet ID (outlet_id) is required",
    }),

  referenceKey: Joi.string().trim().required()
    .messages({
      "any.required": "Reference key is required",
      "string.empty": "Reference key is required",
    }),

  latitude: Joi.alternatives()
    .try(Joi.number().min(-90).max(90), Joi.string().trim())
    .required()
    .messages({
      "any.required": "Latitude is required",
    }),

  longitude: Joi.alternatives()
    .try(Joi.number().min(-180).max(180), Joi.string().trim())
    .required()
    .messages({
      "any.required": "Longitude is required",
    }),

  aadhaar: Joi.string()
    .trim()
    .pattern(/^\d{12}$/)
    .required()
    .messages({
      "any.required": "Aadhaar number is required",
      "string.empty": "Aadhaar number is required",
      "string.pattern.base": "Please enter a valid 12-digit Aadhaar number",
    }),

  MobileNumber: Joi.string()
    .trim()
    .pattern(/^\d{10}$/)
    .required()
    .messages({
      "any.required": "Mobile number is required",
      "string.empty": "Mobile number is required",
      "string.pattern.base": "Please enter a valid 10-digit mobile number",
    }),

  bankiin: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "Bank IIN is required",
      "string.empty": "Bank IIN cannot be empty",
    }),

  amount: Joi.alternatives()
    .try(Joi.number().min(0), Joi.string().trim())
    .required()
    .messages({
      "any.required": "Amount is required",
      "number.min": "Amount must be greater than or equal to 0",
    }),
}).unknown(true);

export { getRetailerKycParamsSchema, doEkycSchema, doBioEkycSchema, balanceEnquirySchema, miniStatementSchema, cashWithdrawSchema, sendOtpSchema };
