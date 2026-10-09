import Joi from "joi";

const mobileValidator = Joi.string()
  .trim()
  .pattern(/^[6-9]\d{9}$/)
  .required()
  .messages({
    "any.required": "Customer mobile number is required",
    "string.empty": "Customer mobile number is required",
    "string.pattern.base": "Please enter a valid 10-digit Indian mobile number",
  });

const ifscValidator = Joi.string()
  .trim()
  .uppercase()
  .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
  .required()
  .messages({
    "any.required": "IFSC code is required",
    "string.empty": "IFSC code is required",
    "string.pattern.base": "Please enter a valid IFSC code (e.g., SBIN0001234)",
  });

const pincodeValidator = Joi.string()
  .trim()
  .pattern(/^\d{6}$/)
  .messages({
    "string.pattern.base": "Please enter a valid 6-digit PIN code",
  });

// -------------------------------------------------------------
// Remitter Schemas
// -------------------------------------------------------------

const queryRemitterSchema = Joi.object({
  mobile: mobileValidator,
}).unknown(true);

const loginRemitterSchema = queryRemitterSchema;

const registerRemitterSchema = Joi.object({
  mobile: mobileValidator,
  fname: Joi.string().trim().min(2).max(60).optional(),
  first_name: Joi.string().trim().min(2).max(60).optional(),
  lname: Joi.string().trim().min(1).max(60).optional(),
  last_name: Joi.string().trim().min(1).max(60).optional(),
  name: Joi.string().trim().min(2).max(120).optional(),
  pincode: pincodeValidator.required().messages({
    "any.required": "Pincode is required",
    "string.empty": "Pincode is required",
  }),
  dob: Joi.string()
    .trim()
    .pattern(/^(\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4}|\d{2}\/\d{2}\/\d{4})$/)
    .optional()
    .messages({
      "string.pattern.base": "DOB format should be YYYY-MM-DD or DD-MM-YYYY",
    }),
  address: Joi.string().trim().min(3).max(255).optional(),
  latlong: Joi.string().trim().optional(),
  stateresp: Joi.string().trim().optional(),
})
  .or("fname", "first_name", "name")
  .unknown(true)
  .messages({
    "object.missing": "Remitter first name is required",
  });

const registerRemitterVerifySchema = Joi.object({
  mobile: mobileValidator,
  otp: Joi.alternatives()
    .try(Joi.string().trim().pattern(/^\d{4,8}$/), Joi.number())
    .required()
    .messages({
      "any.required": "OTP is required for verification",
      "string.empty": "OTP is required",
      "string.pattern.base": "Please enter a valid 4 to 8 digit OTP",
    }),
  stateresp: Joi.string().trim().optional(),
  remitter_id: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
  otp_ref: Joi.string().trim().optional(),
}).unknown(true);

const remitterEkycSchema = Joi.object({
  mobile: mobileValidator,
  aadhar_no: Joi.string()
    .trim()
    .pattern(/^\d{12}$/)
    .optional()
    .messages({
      "string.pattern.base": "Aadhaar number must be exactly 12 digits",
    }),
  aadhaar_number: Joi.string()
    .trim()
    .pattern(/^\d{12}$/)
    .optional()
    .messages({
      "string.pattern.base": "Aadhaar number must be exactly 12 digits",
    }),
  biometric_data: Joi.string().trim().optional(),
  piddata: Joi.string().trim().optional(),
  device_data: Joi.string().trim().optional(),
  latlong: Joi.string().trim().optional(),
}).unknown(true);

// -------------------------------------------------------------
// Beneficiary Schemas
// -------------------------------------------------------------

const addBeneficiarySchema = Joi.object({
  mobile: mobileValidator,
  name: Joi.string().trim().min(2).max(100).optional(),
  bene_name: Joi.string().trim().min(2).max(100).optional(),
  account_number: Joi.string()
    .trim()
    .pattern(/^\d{8,20}$/)
    .required()
    .messages({
      "any.required": "Beneficiary account number is required",
      "string.empty": "Beneficiary account number is required",
      "string.pattern.base": "Please enter a valid bank account number (8 to 20 digits)",
    }),
  ifsc: ifscValidator,
  bank_name: Joi.string().trim().optional(),
  relation: Joi.string().trim().optional(),
  pincode: pincodeValidator.optional(),
})
  .or("name", "bene_name")
  .unknown(true)
  .messages({
    "object.missing": "Beneficiary name is required",
  });

const verifyBeneficiarySchema = Joi.object({
  mobile: mobileValidator,
  account_number: Joi.string()
    .trim()
    .pattern(/^\d{8,20}$/)
    .required()
    .messages({
      "any.required": "Account number is required",
      "string.empty": "Account number is required",
      "string.pattern.base": "Please enter a valid account number",
    }),
  ifsc: ifscValidator,
}).unknown(true);

const fetchBeneficiariesSchema = Joi.object({
  mobile: mobileValidator,
}).unknown(true);

const deleteBeneficiarySchema = Joi.object({
  mobile: mobileValidator,
  bene_id: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "Beneficiary ID (bene_id) is required",
      "string.empty": "Beneficiary ID (bene_id) is required",
    }),
}).unknown(true);

const deleteBeneficiaryVerifyOtpSchema = Joi.object({
  mobile: mobileValidator,
  bene_id: Joi.alternatives()
    .try(Joi.string().trim(), Joi.number())
    .required()
    .messages({
      "any.required": "Beneficiary ID (bene_id) is required",
    }),
  otp: Joi.alternatives()
    .try(Joi.string().trim().pattern(/^\d{4,8}$/), Joi.number())
    .required()
    .messages({
      "any.required": "OTP is required",
      "string.pattern.base": "Please enter a valid OTP",
    }),
}).unknown(true);

// -------------------------------------------------------------
// Transaction Schemas
// -------------------------------------------------------------

const generateTransactionOtpSchema = Joi.object({
  mobile: mobileValidator,
  amount: Joi.alternatives()
    .try(Joi.number().positive(), Joi.string().trim())
    .optional(),
  bene_id: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
}).unknown(true);

const doTransactionSchema = Joi.object({
  mobile: mobileValidator,
  amount: Joi.alternatives()
    .try(Joi.number().positive(), Joi.string().trim())
    .required()
    .messages({
      "any.required": "Transaction amount is required",
      "number.positive": "Transaction amount must be greater than zero",
    }),
  bene_id: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
  mode: Joi.string().trim().valid("IMPS", "NEFT", "RTGS", "UPI").default("IMPS"),
  otp: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
  latlong: Joi.string().trim().optional(),
  client_ref_id: Joi.string().trim().optional(),
}).unknown(true);

const transactionStatusSchema = Joi.object({
  reference_id: Joi.string().trim().optional(),
  txnid: Joi.string().trim().optional(),
  client_ref_id: Joi.string().trim().optional(),
  status_check_id: Joi.string().trim().optional(),
})
  .min(1)
  .unknown(true)
  .messages({
    "object.min":
      "At least one transaction identifier (reference_id, txnid, client_ref_id) is required",
  });

export {
  queryRemitterSchema,
  loginRemitterSchema,
  registerRemitterSchema,
  registerRemitterVerifySchema,
  remitterEkycSchema,
  addBeneficiarySchema,
  verifyBeneficiarySchema,
  fetchBeneficiariesSchema,
  deleteBeneficiarySchema,
  deleteBeneficiaryVerifyOtpSchema,
  generateTransactionOtpSchema,
  doTransactionSchema,
  transactionStatusSchema,
};
