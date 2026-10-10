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


router.post(
  "/send",
  sendOtp
);

router.post(
  "/verify",
  validateVerifyEmailOtp,
  verifyOtp
);


export default router;