import { Router } from "express";
import {
  sendOtp,
  resendOtp,
  verifyOtp,
} from "../controllers/otp.controllers.js";
import {
  validateSendOtp,
  validateVerifyOtp,
} from "../validations/otp.validators.js";

const router = Router();

router.post("/send", validateSendOtp, sendOtp);
router.post("/resend", validateSendOtp, resendOtp);
router.post("/verify", validateVerifyOtp, verifyOtp);

export default router;