import { Router } from "express";
import {
  getRetailerKycDetailsController,
  doEkycController,
  doBioEkycController,
  verifyTfaController,
  loginStatusController,
} from "../controller/aeps.controller.js";
import authMiddleware from "../../../middlewares/auth.middleware.js";

const router = Router();

// Get retailer KYC details (Aadhaar and PAN)
router.get("/retailer/:retailerId/kyc-details",authMiddleware, getRetailerKycDetailsController);

router.post("/login-status", authMiddleware, loginStatusController);

// Perform biometric eKYC
router.post("/verify-tfa", authMiddleware, verifyTfaController);

export default router;