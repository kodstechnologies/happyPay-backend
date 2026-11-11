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

// Configure multer for handling multipart/form-data (text fields only, no file uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

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
  upload.none(), // Handle multipart/form-data without file uploads
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
  // validate(paginationSchema, "body"),
  getUpiStateListController
);

// UPI District List by State Code with pagination
router.post(
  "/district",
  // validate(districtPaginationSchema, "body"),
  getUpiDistrictController
);

export default router;
