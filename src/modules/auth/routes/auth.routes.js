import { Router } from "express";

import {
  sendRetailerLoginOtp,
  verifyRetailerLoginOtp,
  logoutRetailer,
  registerRetailer,
  refreshAccessTokenController,
  getRetailerAadhaarAndMobileController,
  getBankListController,
  getRetailerDetails,
  getAuthenticatedRetailer,
  getRetailerProfileController,
  updateRetailerProfileController,
  updateShopDetailsController,
  updateAboutDetailsController,
  updateAadhaarDetailsController,
  updateBankDetailsController,
  getCurrentRegistrationStepController,
  validatePincodeController,
} from "../controllers/auth.controllers.js";
import { uploadRetailerDocuments, uploadShopDetailsDocuments, validateShopFiles, uploadAboutDetailsDocuments, validateAboutFiles, uploadAdharDetailsDocuments } from "../../../utils/multer.js";
import { validateRegisterRetailer } from "../validations/retailer.validation.js";
import { validateShopDetails } from "../validations/shopDetails.validation.js";
import { validateAboutDetails } from "../validations/aboutDetails.validation.js";
import { validateAadhaarDetails } from "../validations/aadhaarDetails.validation.js";
import { validateBankDetails } from "../validations/bankDetails.validation.js";
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

// Get current registration step with all filled data
router.post("/registration/current-step", getCurrentRegistrationStepController);


// Step-by-step registration endpoints with validations
router.patch("/registration/shop-details", uploadShopDetailsDocuments, validateShopFiles, validateShopDetails, updateShopDetailsController);
router.patch("/registration/about", uploadAboutDetailsDocuments, validateAboutFiles, validateAboutDetails, updateAboutDetailsController);
router.patch("/registration/adhaar-details", uploadAdharDetailsDocuments, validateAadhaarDetails, updateAadhaarDetailsController);
router.patch("/registration/bank-details", validateBankDetails, updateBankDetailsController);

// Pincode validation endpoint
router.get("/pincode/validate/:pincode", validatePincodeController);

//patch the details if rejeceted by admin
// router.patch("/correct-details/")


router.get("/retailer/details/:retailerId", getRetailerDetails);
router.get("/retailer/auth/me", authMiddleware, getAuthenticatedRetailer);
router.get("/retailer/profile", authMiddleware, getRetailerProfileController);
router.patch("/retailer/profile", authMiddleware, uploadRetailerDocuments, updateRetailerProfileController);

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

router.post(
  "/retailer/refresh-token",
  refreshAccessTokenController
);

router.post(
  "/retailer/aadhaar-mobile",
  getRetailerAadhaarAndMobileController
);


// router.patch(
//   "retailer/update/:retailerId"
// )

router.get(
  "/banks",
  getBankListController
);



router.post("/check-ekyc", validate(doEkycSchema, "body"), doEkycController);
router.post("/do-bio-ekyc", validate(doBioEkycSchema, "body"), doBioEkycController);

export default router;  
