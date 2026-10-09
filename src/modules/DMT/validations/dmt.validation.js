import Joi from "joi";

const mobileValidator = Joi.string()
  .trim()
  .pattern(/^[6-9]\d{9}$/)
  .required()
  .messages({
    "any.required": "Customer mobile number is required",
    "string.empty": "Customer mobile number is required",
    "string.pattern.base": "Please enter a valid 10-digit mobile number",
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

const addBeneficiarySchema = Joi.object({
  mobile: mobileValidator,
  name: Joi.string().trim().min(2).optional(),
  bene_name: Joi.string().trim().min(2).optional(),
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
}).or("name", "bene_name").unknown(true).messages({
  "object.missing": "Beneficiary name is required",
});

const verifyBeneficiarySchema = Joi.object({
  mobile: mobileValidator,
  account_number: Joi.string().trim().required().messages({
    "any.required": "Account number is required",
    "string.empty": "Account number is required",
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

const generateTransactionOtpSchema = Joi.object({
  mobile: mobileValidator,
  amount: Joi.alternatives().try(Joi.number().positive(), Joi.string().trim()).optional(),
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
  mode: Joi.string().trim().valid("IMPS", "NEFT", "RTGS", "UPI").optional(),
  otp: Joi.alternatives().try(Joi.string().trim(), Joi.number()).optional(),
}).unknown(true);

const transactionStatusSchema = Joi.object({
  reference_id: Joi.string().trim().optional(),
  txnid: Joi.string().trim().optional(),
  client_ref_id: Joi.string().trim().optional(),
  status_check_id: Joi.string().trim().optional(),
}).min(1).unknown(true).messages({
  "object.min": "At least one transaction identifier (reference_id, txnid, client_ref_id) is required",
});

export {
  addBeneficiarySchema,
  verifyBeneficiarySchema,
  fetchBeneficiariesSchema,
  deleteBeneficiarySchema,
  deleteBeneficiaryVerifyOtpSchema,
  generateTransactionOtpSchema,
  doTransactionSchema,
  transactionStatusSchema,
};
