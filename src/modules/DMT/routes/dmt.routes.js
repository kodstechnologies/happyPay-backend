import { Router } from "express";
import authMiddleware from "../../../middlewares/auth.middleware.js";
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

const router = Router();

// Beneficiary routes
router.post("/add-beneficiary", authMiddleware, addBeneficiaryController);
router.post("/verify-beneficiary", authMiddleware, verifyBeneficiaryController);
router.post("/fetch-beneficiaries", authMiddleware, getBeneficiariesController);

router.post("/delete-beneficiary", authMiddleware, deleteBeneficiaryController);
router.post("/delete-beneficiary-verify", authMiddleware, deleteBeneficiaryVerifyOtpController);

// Transaction routes
router.post("/generate-transaction-otp", authMiddleware, generateTransactionOtpController);
router.post("/do-transaction", authMiddleware, doTransactionController);
router.post("/transaction-status", authMiddleware, getTransactionStatusController);

export default router;
