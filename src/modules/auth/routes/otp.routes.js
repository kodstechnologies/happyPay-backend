import { Router } from "express";
import {
  sendOtp,
  verifyOtp,
} from "../controllers/otp.controllers.js";
import {
  validateSendOtp,
  validateVerifyOtp,
} from "../validations/otp.validators.js";
import { upload } from "../../../utils/multer.js";

const router = Router();

router.post("/send", validateSendOtp, sendOtp);
router.post("/verify", upload.single("panDocument"), validateVerifyOtp, verifyOtp);

export default router;