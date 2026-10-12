import { Router } from "express";

import {
  sendOtp,
  verifyOtp,
} from "../controllers/emailOtp.controller.js";
import {
  validateSendEmailOtp,
  validateVerifyEmailOtp,
} from "../validations/emailOtp.validators.js";

const router = Router();


router.patch(
  "/send",
  validateSendEmailOtp,
  sendOtp
);

router.patch(
  "/verify",
  validateVerifyEmailOtp,
  verifyOtp
);


export default router;