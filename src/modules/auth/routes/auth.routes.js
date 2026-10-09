import { Router } from "express";

import {
  sendRetailerLoginOtp,
  verifyRetailerLoginOtp,
  logoutRetailer,
  registerRetailer,
  getBankListController,
  getRetailerDetails,
} from "../controllers/auth.controllers.js";
import { uploadRetailerDocuments } from "../../../utils/multer.js";
import { validateRegisterRetailer } from "../validations/retailer.validation.js";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import { doBioEkycController, doEkycController } from "../../AEPS/controller/aeps.controller.js";
import validate from "../../../middlewares/validate.middleware.js";
import { doEkycSchema, doBioEkycSchema } from "../../AEPS/validations/aeps.validation.js";

const router = Router();


router.post(
  "/retailer/register",
  uploadRetailerDocuments,
  validateRegisterRetailer,
  registerRetailer
);

router.get("/retailer/details/:retailerId", getRetailerDetails);

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


router.post("/check-ekyc", validate(doEkycSchema, "body"), doEkycController);
router.post("/do-bio-ekyc", validate(doBioEkycSchema, "body"), doBioEkycController);

export default router;
