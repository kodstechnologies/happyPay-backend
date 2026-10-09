import Joi from "joi";

// =============================================================
// Reusable Core Validation Rules
// =============================================================

const mobileRule = Joi.string()
  .trim()
  .pattern(/^[6-9]\d{9}$/)
  .required()
  .messages({
    "any.required": "Customer mobile number (mobile) is required",
    "string.empty": "Customer mobile number (mobile) is required",
    "string.pattern.base": "Please provide a valid 10-digit Indian mobile number",
  });

const outletIdRule = Joi.alternatives()
  .try(Joi.string().trim().min(1), Joi.number().positive())
  .required()
  .messages({
    "any.required": "Outlet ID (outletid) is required",
    "string.empty": "Outlet ID (outletid) is required",
  });

const referenceKeyRule = Joi.string()
  .trim()
  .min(1)
  .required()
  .messages({
    "any.required": "Reference key (referenceKey) is required",
    "string.empty": "Reference key (referenceKey) is required",
  });

const aadhaarRule = Joi.string()
  .trim()
  .pattern(/^\d{12}$/)
  .required()
  .messages({
    "any.required": "Aadhaar number (aadhaar) is required",
    "string.empty": "Aadhaar number (aadhaar) is required",
    "string.pattern.base": "Aadhaar number must be exactly 12 numeric digits",
  });

const otpRule = Joi.alternatives()
  .try(
    Joi.string().trim().pattern(/^\d{4,8}$/),
    Joi.number().integer().min(1000).max(99999999)
  )
  .required()
  .messages({
    "any.required": "OTP is required",
    "string.empty": "OTP is required",
    "string.pattern.base": "OTP must be 4 to 8 numeric digits",
  });

const ifscRule = Joi.string()
  .trim()
  .uppercase()
  .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
  .required()
  .messages({
    "any.required": "IFSC code is required",
    "string.empty": "IFSC code is required",
    "string.pattern.base": "Invalid IFSC code format (e.g., SBIN0001234)",
  });

const accountRule = Joi.string()
  .trim()
  .pattern(/^\d{8,20}$/)
  .required()
  .messages({
    "any.required": "Bank account number is required",
    "string.empty": "Bank account number is required",
    "string.pattern.base": "Account number must be between 8 and 20 numeric digits",
  });

const idRule = Joi.alternatives()
  .try(Joi.string().trim().min(1), Joi.number().integer().positive())
  .required()
  .messages({
    "any.required": "Beneficiary ID (bene_id) is required",
    "string.empty": "Beneficiary ID (bene_id) is required",
  });

// =============================================================
// Remitter Validation Schemas (Strict & Non-Duplicated)
// =============================================================

/**
 * 1. Login / Query Remitter
 */
export const remitterQuerySchema = Joi.object({
  outletid: outletIdRule,
  mobile: mobileRule,
});

/**
 * 2. Register Remitter
 */
export const remitterRegisterSchema = Joi.object({
  referenceKey: referenceKeyRule,
  aadhaar: aadhaarRule,
  outletid: outletIdRule,
  mobile: mobileRule,
});


  // 3. Verify Remitter Registration OTP

export const remitterVerifyOtpSchema = Joi.object({
  referenceKey: referenceKeyRule,
  otp: otpRule,
  outletid: outletIdRule,
  mobile: mobileRule,
});


  // 4. Remitter eKYC

export const remitterEkycSchema = Joi.object({
  srno: Joi.string().trim().required().messages({
    "any.required": "srno is required",
    "string.empty": "srno is required",
  }),
  sessionKey: Joi.string().trim().required().messages({
    "any.required": "sessionKey is required",
    "string.empty": "sessionKey is required",
  }),
  rdsId: Joi.string().trim().required().messages({
    "any.required": "rdsId is required",
    "string.empty": "rdsId is required",
  }),
  rdsVer: Joi.string().trim().required().messages({
    "any.required": "rdsVer is required",
    "string.empty": "rdsVer is required",
  }),
  mc: Joi.string().trim().required().messages({
    "any.required": "mc is required",
    "string.empty": "mc is required",
  }),
  mi: Joi.string().trim().required().messages({
    "any.required": "mi is required",
    "string.empty": "mi is required",
  }),
  dc: Joi.string().trim().required().messages({
    "any.required": "dc is required",
    "string.empty": "dc is required",
  }),
  ts: Joi.string().trim().required().messages({
    "any.required": "ts is required",
    "string.empty": "ts is required",
  }),
  Piddata: Joi.string().trim().required().messages({
    "any.required": "Piddata is required",
    "string.empty": "Piddata is required",
  }),
  hmac: Joi.string().trim().required().messages({
    "any.required": "hmac is required",
    "string.empty": "hmac is required",
  }),
  ci: Joi.string().trim().required().messages({
    "any.required": "ci is required",
    "string.empty": "ci is required",
  }),
  txnid: Joi.alternatives().try(Joi.string().trim().min(1), Joi.number()).required().messages({
    "any.required": "txnid is required",
  }),
  longitude: Joi.alternatives().try(Joi.string().trim().min(1), Joi.number()).required().messages({
    "any.required": "longitude is required",
  }),
  latitude: Joi.alternatives().try(Joi.string().trim().min(1), Joi.number()).required().messages({
    "any.required": "latitude is required",
  }),
  referenceKey: referenceKeyRule,
  outletid: outletIdRule,
  mobile: mobileRule,
});

// =============================================================
// Beneficiary Validation Schemas
// =============================================================

export const beneficiaryFetchSchema = Joi.object({
  mobile: mobileRule,
  outletid: outletIdRule,
});

export const beneficiaryVerifySchema = Joi.object({
  mobile: mobileRule,
  account_number: accountRule,
  ifsc: ifscRule,
  outletid: outletIdRule,
});

export const beneficiaryAddSchema = Joi.object({
  mobile: mobileRule,
  bene_name: Joi.string().trim().min(2).max(100).required().messages({
    "any.required": "Beneficiary name (bene_name) is required",
    "string.empty": "Beneficiary name (bene_name) is required",
  }),
  account_number: accountRule,
  ifsc: ifscRule,
  bank_name: Joi.string().trim().optional(),
  outletid: outletIdRule,
});

export const beneficiaryDeleteSchema = Joi.object({
  mobile: mobileRule,
  bene_id: idRule,
  outletid: outletIdRule,
});

export const beneficiaryDeleteVerifySchema = Joi.object({
  mobile: mobileRule,
  bene_id: idRule,
  otp: otpRule,
  outletid: outletIdRule,
});

// =============================================================
// Transaction Validation Schemas
// =============================================================

export const transactionOtpSchema = Joi.object({
  mobile: mobileRule,
  amount: Joi.alternatives().try(Joi.number().positive(), Joi.string().trim()).required().messages({
    "any.required": "Amount is required",
  }),
  outletid: outletIdRule,
});

export const transactionExecuteSchema = Joi.object({
  mobile: mobileRule,
  amount: Joi.alternatives()
    .try(Joi.number().positive(), Joi.string().trim().pattern(/^\d+(\.\d{1,2})?$/))
    .required()
    .messages({
      "any.required": "Transaction amount is required",
      "number.positive": "Transaction amount must be greater than zero",
    }),
  bene_id: Joi.alternatives().try(Joi.string().trim().min(1), Joi.number()).required().messages({
    "any.required": "Beneficiary ID (bene_id) is required",
  }),
  mode: Joi.string().trim().valid("IMPS", "NEFT", "RTGS", "UPI").required().messages({
    "any.required": "Transfer mode (IMPS/NEFT/RTGS/UPI) is required",
  }),
  otp: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
  latlong: Joi.string().trim().optional(),
  client_ref_id: Joi.string().trim().optional(),
  outletid: outletIdRule,
});

export const transactionStatusSchema = Joi.object({
  reference_id: Joi.string().trim().optional(),
  txnid: Joi.string().trim().optional(),
  client_ref_id: Joi.string().trim().optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one transaction identifier (reference_id, txnid, client_ref_id) is required",
  });
