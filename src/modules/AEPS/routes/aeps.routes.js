import { Router } from "express";
import { getBankListController } from "../../auth/controllers/auth.controllers.js";
import {
  getRetailerKycDetailsController,
  doEkycController,
  doBioEkycController,
  verifyTfaController,
  loginStatusController,
  balanceEnquiryController,
  miniStatementController,
  cashWithdrawController,
  cashDepositController,
  sendOtpController,
  onboardController,
  outletRegisterController,
  outletRegisterVerifyController,
} from "../controller/aeps.controller.js";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import validate from "../../../middlewares/validate.middleware.js";
import {
  getRetailerKycParamsSchema,
  doEkycSchema,
  balanceEnquirySchema,
  miniStatementSchema,
  cashWithdrawSchema,
  cashDepositSchema,
  sendOtpSchema,
  outletRegisterSchema,
  outletRegisterVerifySchema,
} from "../validations/aeps.validation.js";

const router = Router();

// Onboard retailer merchant to AEPS gateway
router.post("/onboard", authMiddleware, onboardController);

// Outlet bank registration & verification
router.post(
  "/outlet-register",
  authMiddleware,
  validate(outletRegisterSchema, "body"),
  outletRegisterController
);
router.post(
  "/outlet-register-verify",
  authMiddleware,
  validate(outletRegisterVerifySchema, "body"),
  outletRegisterVerifyController
);

// Get retailer KYC details (Aadhaar and PAN)
router.get(
  "/retailer/:retailerId/kyc-details",
  authMiddleware,
  validate(getRetailerKycParamsSchema, "params"),
  getRetailerKycDetailsController
);

// Perform biometric eKYC
router.post(
  "/do-ekyc",
  authMiddleware,
  validate(doEkycSchema, "body"),
  doEkycController
);

router.post("/do-bio-ekyc", authMiddleware, doBioEkycController);
// 24 hours  verification of TFA
router.post("/login-status", authMiddleware, loginStatusController);
router.post("/verify-tfa", authMiddleware, verifyTfaController);

// Balance Enquiry
router.post(
  "/balance-enquiry",
  authMiddleware,
  // validate(balanceEnquirySchema, "body"),
  balanceEnquiryController
);

// Mini Statement
router.post(
  "/mini-statement",
  validate(miniStatementSchema, "body"),
  miniStatementController
);

// Cash Withdrawal
router.post(
  "/cash-withdraw",
  authMiddleware,
  validate(cashWithdrawSchema, "body"),
  cashWithdrawController
);

// Cash Deposit
router.post(
  "/cash-deposit",
  authMiddleware,
  validate(cashDepositSchema, "body"),
  cashDepositController
);

// Send OTP
router.post(
  "/send-otp",
  authMiddleware,
  validate(sendOtpSchema, "body"),
  sendOtpController
);

// AEPS Bank List endpoints (accessible for bank selection during AEPS transactions & wallet recharge)
router.get("/banks", getBankListController);
router.get("/bank-list", getBankListController);

export default router;