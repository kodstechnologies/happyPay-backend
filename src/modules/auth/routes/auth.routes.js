import { Router } from "express";

import {
  sendRetailerLoginOtp,
  verifyRetailerLoginOtp,
  logoutRetailer,
  registerRetailer,
  getBankListController,
} from "../controllers/auth.controllers.js";
import { uploadRetailerDocuments } from "../../../utils/multer.js";
import { validateRegisterRetailer } from "../validations/retailer.validation.js";
import authMiddleware from "../../../middlewares/auth.middleware.js";

const router = Router();


router.post(
  "/retailer/register",
  uploadRetailerDocuments,
  // validateRegisterRetailer,
  registerRetailer
);

router.post(
  "/retailer/login/send-otp",
  sendRetailerLoginOtp
);

router.post(
  "/retailer/login/verify-otp",
  verifyRetailerLoginOtp
);

router.post(
  "/retailer/logout",
  logoutRetailer
);

router.get(
  "/banks",
  getBankListController
);



export default router;