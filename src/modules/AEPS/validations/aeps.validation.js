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

// Common mandatory outlet & transaction location fields
const commonOutletFields = {
  outlet_id: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "Outlet ID (outlet_id) is required",
      "string.empty": "Outlet ID (outlet_id) is required",
    }),

  referenceKey: Joi.string()
    .trim()
    .required()
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

  ts: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "Timestamp is required",
      "string.empty": "Timestamp is required",
    }),
};

// Common optional biometric device fields (for eKYC, balance enquiry, mini-statement, cash withdrawal)
const commonOptionalBiometricFields = {
  dc: Joi.string().trim().optional().allow(""),
  ci: Joi.string().trim().optional().allow(""),
  hmac: Joi.string().trim().optional().allow(""),
  mc: Joi.string().trim().optional().allow(""),
  dpId: Joi.string().trim().optional().allow(""),
  PidDatatype: Joi.string().trim().optional().allow(""),
  pidDatatype: Joi.string().trim().optional().allow(""),
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
};

// Common required biometric device fields with strict validation messages (for cash deposit)
const commonRequiredBiometricFields = {
  dc: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "Device Code (dc) is required",
      "string.empty": "Device Code (dc) cannot be empty",
    }),

  ci: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "Certificate Identifier (ci) is required",
      "string.empty": "Certificate Identifier (ci) cannot be empty",
    }),

  hmac: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "Biometric HMAC is required",
      "string.empty": "Biometric HMAC cannot be empty",
    }),

  mc: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "Machine certificate (mc) is required",
      "string.empty": "Machine certificate (mc) cannot be empty",
    }),

  dpId: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "Device Provider ID (dpId) is required",
      "string.empty": "Device Provider ID (dpId) cannot be empty",
    }),

  PidDatatype: Joi.string().trim().optional().allow(""),

  Piddata: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "Biometric Piddata is required",
      "string.empty": "Biometric Piddata cannot be empty",
    }),

  rdsId: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "RD Service ID (rdsId) is required",
      "string.empty": "RD Service ID (rdsId) cannot be empty",
    }),

  rdsVer: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "RD Service version (rdsVer) is required",
      "string.empty": "RD Service version (rdsVer) cannot be empty",
    }),

  sessionKey: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "Biometric session key is required",
      "string.empty": "Biometric session key cannot be empty",
    }),

  mi: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "Model identifier (mi) is required",
      "string.empty": "Model identifier (mi) cannot be empty",
    }),

  errCode: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "Error code (errCode) is required",
      "string.empty": "Error code (errCode) cannot be empty",
    }),

  errInfo: Joi.string()
    .trim()
    .allow("")
    .required()
    .messages({
      "any.required": "Error info (errInfo) is required",
    }),

  fCount: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "fCount is required",
      "string.empty": "fCount cannot be empty",
    }),

  fType: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "fType is required",
      "string.empty": "fType cannot be empty",
    }),

  iCount: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "iCount is required",
      "string.empty": "iCount cannot be empty",
    }),

  iType: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "iType is required",
      "string.empty": "iType cannot be empty",
    }),

  pCount: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "pCount is required",
      "string.empty": "pCount cannot be empty",
    }),

  pType: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "pType is required",
      "string.empty": "pType cannot be empty",
    }),

  qScore: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "Biometric quality score (qScore) is required",
      "string.empty": "Biometric quality score (qScore) cannot be empty",
    }),

  nmPoints: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "nmPoints is required",
      "string.empty": "nmPoints cannot be empty",
    }),

  srno: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "Device serial number (srno) is required",
      "string.empty": "Device serial number (srno) cannot be empty",
    }),

  sysid: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "System ID (sysid) is required",
      "string.empty": "System ID (sysid) cannot be empty",
    }),
};

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

  ...commonOptionalBiometricFields,
}).unknown(true);

const balanceEnquirySchema = Joi.object({
  ...commonOutletFields,

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

  ...commonOptionalBiometricFields,
}).unknown(true);

const miniStatementSchema = Joi.object({
  ...commonOutletFields,

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

  ...commonOptionalBiometricFields,
}).unknown(true);

const cashWithdrawSchema = Joi.object({
  ...commonOutletFields,

  referenceKey: Joi.string().trim().allow(null, "").optional(),

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

  ...commonOptionalBiometricFields,
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

const cashDepositSchema = Joi.object({
  ...commonOutletFields,

  txnid: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "Transaction ID (txnid) is required",
      "string.empty": "Transaction ID (txnid) cannot be empty",
    }),

  bankiin: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "Bank IIN (bankiin) is required",
      "string.empty": "Bank IIN (bankiin) cannot be empty",
    }),

  amount: Joi.alternatives()
    .try(Joi.number().min(1), Joi.string().trim())
    .required()
    .messages({
      "any.required": "Deposit amount is required",
      "string.empty": "Deposit amount is required",
      "number.min": "Deposit amount must be greater than 0",
    }),

  mobile: Joi.string()
    .trim()
    .pattern(/^\d{10}$/)
    .required()
    .messages({
      "any.required": "Mobile number is required",
      "string.empty": "Mobile number is required",
      "string.pattern.base": "Please enter a valid 10-digit mobile number",
    }),

  ...commonRequiredBiometricFields,
}).unknown(true);

const outletRegisterSchema = Joi.object({
  outlet_id: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "Outlet ID (outlet_id) is required",
      "string.empty": "Outlet ID (outlet_id) is required",
    }),

  referenceKey: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "Reference key is required",
      "string.empty": "Reference key is required",
    }),
}).unknown(true);

const outletRegisterVerifySchema = Joi.object({
  outlet_id: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "Outlet ID (outlet_id) is required",
      "string.empty": "Outlet ID (outlet_id) is required",
    }),

  referenceKey: Joi.string()
    .trim()
    .required()
    .messages({
      "any.required": "Reference key is required",
      "string.empty": "Reference key is required",
    }),

  otp: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "OTP is required",
      "string.empty": "OTP cannot be empty",
    }),
}).unknown(true);

export {
  getRetailerKycParamsSchema,
  doEkycSchema,
  doBioEkycSchema,
  balanceEnquirySchema,
  miniStatementSchema,
  cashWithdrawSchema,
  cashDepositSchema,
  sendOtpSchema,
  outletRegisterSchema,
  outletRegisterVerifySchema,
};

