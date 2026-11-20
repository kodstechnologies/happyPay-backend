import { Router } from "express";
import multer from "multer";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import validate from "../../../middlewares/validate.middleware.js";
import {
  initiateUpiCashpointController,
  merchantRegistrationController,
  merchantRegistrationSendOtpController,
  merchantRegistrationVerifyController,
  sellerOnboardingController,
  merchantEkycController,
  getUpiStateListController,
  getUpiDistrictController,
  confirmPaymentController,
  getMyTransactionsController,
} from "../controllers/upiCashpoint.controller.js";
import {
  initiateUpiCashpointSchema,
  merchantRegistrationSchema,
  merchantRegistrationSendOtpSchema,
  merchantRegistrationVerifySchema,
  sellerOnboardingSchema,
  merchantEkycSchema,
} from "../validations/upiCashpoint.validation.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

// Merchant Registration
router.post("/merchant-register", authMiddleware, validate(merchantRegistrationSchema, "body"), merchantRegistrationController);

// Send OTP
router.post("/merchant-registration/send-otp", authMiddleware, validate(merchantRegistrationSendOtpSchema, "body"), merchantRegistrationSendOtpController);

// Verify OTP
router.post("/merchant-registration/verify", authMiddleware, validate(merchantRegistrationVerifySchema, "body"), merchantRegistrationVerifyController);

// Seller Onboarding
router.post("/seller-onboarding", authMiddleware, validate(sellerOnboardingSchema, "body"), sellerOnboardingController);

// eKYC
router.post("/ekyc", authMiddleware, upload.none(), validate(merchantEkycSchema, "body"), merchantEkycController);

// Initiate Payment (generate QR)
router.post("/initiate-payment", authMiddleware, validate(initiateUpiCashpointSchema, "body"), initiateUpiCashpointController);

// Confirm payment received (mark transaction as PAID)
router.post("/confirm-payment", authMiddleware, confirmPaymentController);

// My transactions list
router.get("/my-transactions", authMiddleware, getMyTransactionsController);

// State list
router.post("/state-list", getUpiStateListController);

// District list by state code
router.post("/district", getUpiDistrictController);

export default router;
