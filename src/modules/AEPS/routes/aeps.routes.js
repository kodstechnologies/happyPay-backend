import { Router } from "express";
import {
  getRetailerKycDetailsController,
  doEkycController,
  doBioEkycController,
  verifyTfaController,
  loginStatusController,
} from "../controller/aeps.controller.js";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import validate from "../../../middlewares/validate.middleware.js";
import { getRetailerKycParamsSchema, doEkycSchema } from "../validations/aeps.validation.js";

const router = Router();

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

export default router;