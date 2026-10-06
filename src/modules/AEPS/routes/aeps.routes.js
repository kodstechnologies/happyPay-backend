import { Router } from "express";
import { getRetailerKycDetailsController, doEkycController } from "../controller/aeps.controller.js";
import authMiddleware from "../../../middlewares/auth.middleware.js";

const router = Router();

// Get retailer KYC details (Aadhaar and PAN)
router.get("/retailer/:retailerId/kyc-details",authMiddleware, getRetailerKycDetailsController);

// Perform biometric eKYC
router.post("/do-ekyc", authMiddleware, doEkycController);

export default router;
