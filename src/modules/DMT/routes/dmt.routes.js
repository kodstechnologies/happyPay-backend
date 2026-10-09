import { Router } from "express";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import validate from "../../../middlewares/validate.middleware.js";
import {
  queryRemitterController,
  loginRemitterController,
  registerRemitterController,
  registerRemitterVerifyController,
  remitterEkycController,
  addBeneficiaryController,
  verifyBeneficiaryController,
  getBeneficiariesController,
  deleteBeneficiaryController,
  deleteBeneficiaryVerifyOtpController,
  generateTransactionOtpController,
  doTransactionController,
  getTransactionStatusController,
} from "../controller/dmt.controller.js";
import {
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
} from "../validations/dmt.validation.js";

const router = Router();

// =============================================================
// Remitter Routes
// =============================================================

// Check Remitter / Query Remitter / Login Remitter
router.post(
  "/query-remitter",
  authMiddleware,
  validate(queryRemitterSchema, "body"),
  queryRemitterController
);

router.post(
  "/login-remitter",
  authMiddleware,
  validate(loginRemitterSchema, "body"),
  loginRemitterController
);

router.get(
  "/query-remitter",
  authMiddleware,
  validate(queryRemitterSchema, "query"),
  queryRemitterController
);

router.get(
  "/remitter/:mobile",
  authMiddleware,
  validate(queryRemitterSchema, "params"),
  queryRemitterController
);

// Register Remitter (Sends OTP)
router.post(
  "/register-remitter",
  authMiddleware,
  validate(registerRemitterSchema, "body"),
  registerRemitterController
);

// Verify Remitter Registration OTP
router.post(
  "/register-remitter-verify",
  authMiddleware,
  validate(registerRemitterVerifySchema, "body"),
  registerRemitterVerifyController
);

// Remitter Aadhaar / Biometric eKYC
router.post(
  "/remitter-ekyc",
  authMiddleware,
  validate(remitterEkycSchema, "body"),
  remitterEkycController
);

// =============================================================
// Beneficiary Routes
// =============================================================

router.post(
  "/add-beneficiary",
  authMiddleware,
  validate(addBeneficiarySchema, "body"),
  addBeneficiaryController
);

router.post(
  "/verify-beneficiary",
  authMiddleware,
  validate(verifyBeneficiarySchema, "body"),
  verifyBeneficiaryController
);

router.post(
  "/fetch-beneficiaries",
  authMiddleware,
  validate(fetchBeneficiariesSchema, "body"),
  getBeneficiariesController
);

router.get(
  "/fetch-beneficiaries",
  authMiddleware,
  validate(fetchBeneficiariesSchema, "query"),
  getBeneficiariesController
);

router.get(
  "/fetch-beneficiaries/:mobile",
  authMiddleware,
  validate(fetchBeneficiariesSchema, "params"),
  getBeneficiariesController
);

router.post(
  "/delete-beneficiary",
  authMiddleware,
  validate(deleteBeneficiarySchema, "body"),
  deleteBeneficiaryController
);

router.post(
  "/delete-beneficiary-verify",
  authMiddleware,
  validate(deleteBeneficiaryVerifyOtpSchema, "body"),
  deleteBeneficiaryVerifyOtpController
);

// =============================================================
// Transaction Routes
// =============================================================

router.post(
  "/generate-transaction-otp",
  authMiddleware,
  validate(generateTransactionOtpSchema, "body"),
  generateTransactionOtpController
);

router.post(
  "/do-transaction",
  authMiddleware,
  validate(doTransactionSchema, "body"),
  doTransactionController
);

router.post(
  "/transaction-status",
  authMiddleware,
  validate(transactionStatusSchema, "body"),
  getTransactionStatusController
);

router.get(
  "/transaction-status",
  authMiddleware,
  validate(transactionStatusSchema, "query"),
  getTransactionStatusController
);

export default router;
