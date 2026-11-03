import { Router } from "express";
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
} from "../controllers/upiCashpoint.controller.js";
import {
  initiateUpiCashpointSchema,
  merchantRegistrationSchema,
  merchantRegistrationSendOtpSchema,
  merchantRegistrationVerifySchema,
  sellerOnboardingSchema,
  merchantEkycSchema,
  paginationSchema,
  districtPaginationSchema,
} from "../validations/upiCashpoint.validation.js";

const router = Router();

router.post(
  "/merchant-register",
  authMiddleware,
  validate(merchantRegistrationSchema, "body"),
  merchantRegistrationController
);

// Merchant Registration - Send OTP
router.post(
  "/merchant-registration/send-otp",
  authMiddleware,
  validate(merchantRegistrationSendOtpSchema, "body"),
  merchantRegistrationSendOtpController
);

// Merchant Registration - Verify OTP
router.post(
  "/merchant-registration/verify",
  authMiddleware,
  validate(merchantRegistrationVerifySchema, "body"),
  merchantRegistrationVerifyController
);

// Seller Onboarding
router.post(
  "/seller-onboarding",
  authMiddleware,
  validate(sellerOnboardingSchema, "body"),
  sellerOnboardingController
);

router.post(
  "/ekyc",
  authMiddleware,
  validate(merchantEkycSchema, "body"),
  merchantEkycController
);

router.post(
  "/initiate-payment",
  authMiddleware,
  validate(initiateUpiCashpointSchema, "body"),
  initiateUpiCashpointController
);

// UPI State List with pagination
router.post(
  "/state-list",
  authMiddleware,
  validate(paginationSchema, "body"),
  getUpiStateListController
);

// UPI District List by State Code with pagination
router.post(
  "/district",
  authMiddleware,
  validate(districtPaginationSchema, "body"),
  getUpiDistrictController
);

export default router;
