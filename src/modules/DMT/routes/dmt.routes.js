import { Router } from "express";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import validate from "../../../middlewares/validate.middleware.js";
import {
  getRemitterDetailsController,
  registerRemitterController,
  verifyRemitterOtpController,
  performRemitterEkycController,
  fetchBeneficiariesController,
  verifyBeneficiaryAccountController,
  addBeneficiaryController,
  deleteBeneficiaryController,
  verifyDeleteBeneficiaryOtpController,
  generateTransactionOtpController,
  executeTransactionController,
  checkTransactionStatusController,
} from "../controller/dmt.controller.js";
import {
  remitterQuerySchema,
  remitterRegisterSchema,
  remitterVerifyOtpSchema,
  remitterEkycSchema,
  beneficiaryFetchSchema,
  beneficiaryVerifySchema,
  beneficiaryAddSchema,
  beneficiaryDeleteSchema,
  beneficiaryDeleteVerifySchema,
  transactionOtpSchema,
  transactionExecuteSchema,
  transactionStatusSchema,
} from "../validations/dmt.validation.js";

const router = Router();

router.post(
  "/login-remitter",
  authMiddleware,
  validate(remitterQuerySchema, "body"),
  getRemitterDetailsController
);

router.post(
  "/register-remitter",
  authMiddleware,
  validate(remitterRegisterSchema, "body"),
  registerRemitterController
);

router.post(
  "/register-remitter-verify",
  authMiddleware,
  validate(remitterVerifyOtpSchema, "body"),
  verifyRemitterOtpController
);

router.post(
  "/remitter-ekyc",
  authMiddleware,
  validate(remitterEkycSchema, "body"),
  performRemitterEkycController
);

// =============================================================
// Beneficiary Management Routes
// =============================================================

router.post(
  "/fetch-beneficiaries",
  authMiddleware,
  validate(beneficiaryFetchSchema, "body"),
  fetchBeneficiariesController
);

router.post(
  "/verify-beneficiary",
  authMiddleware,
  validate(beneficiaryVerifySchema, "body"),
  verifyBeneficiaryAccountController
);


router.post(
  "/add-beneficiary",
  authMiddleware,
  validate(beneficiaryAddSchema, "body"),
  addBeneficiaryController
);

// Initiate Delete Beneficiary (Triggers OTP)
router.post(
  "/delete-beneficiary",
  authMiddleware,
  validate(beneficiaryDeleteSchema, "body"),
  deleteBeneficiaryController
);

// Verify Delete Beneficiary OTP
router.post(
  "/delete-beneficiary-verify",
  authMiddleware,
  validate(beneficiaryDeleteVerifySchema, "body"),
  verifyDeleteBeneficiaryOtpController
);

// =============================================================
// Money Transfer & Status Routes
// =============================================================

// Pre-Transaction OTP Generation
router.post(
  "/generate-transaction-otp",
  authMiddleware,
  validate(transactionOtpSchema, "body"),
  generateTransactionOtpController
);

// Execute DMT Money Transfer
router.post(
  "/do-transaction",
  authMiddleware,
  validate(transactionExecuteSchema, "body"),
  executeTransactionController
);

// Transaction Status Inquiry
router.post(
  "/transaction-status",
  authMiddleware,
  validate(transactionStatusSchema, "body"),
  checkTransactionStatusController
);


export default router;
