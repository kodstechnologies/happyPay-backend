import { Router } from "express";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import validate from "../../../middlewares/validate.middleware.js";
import {
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

// Beneficiary routes
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

// Transaction routes
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
