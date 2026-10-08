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
import { doBioEkycController, doEkycController } from "../../AEPS/controller/aeps.controller.js";

const router = Router();


router.post(
  "/retailer/register",
  uploadRetailerDocuments,
  // validateRegisterRetailer,
  registerRetailer
);


// //inthis i m sending the payload as pan no,pan document,mobileno, otp--step 1
//  router.post(
//   "/send-otp-account-step"

//  )

// //verify the above otp also return the mobiel otp verified true or false
//  router.post(
//   "/verify-otp-account-step",

//  )
// //get the account details
// router.get(
//   "/retailer-account-details",

// )
// // ------------------------------------------
// //step 2 starts
// //send the payload as email
// router.post(
//   "/send-otp-shop-step"
// )
// //verify otp of that email
// router.post(
//   "/verify-otp-shop-step"
// )
// ///send the shop details taht is hsop name,pincode,city,shop catagory,property type,complete shop addess,shop location(that is lat lang),inside shop photo,ouside shop photo,shop location  photo,business proof,business proof document
//  router.post(
//   "/shop-details/:retailerId"
//  )
// //get those details of shop details along with email verified tru or false
// router.get(
//   "/shop-details/:retailerId"
// )

// //--------------------------------------
// //step 3 starts
// //retailer details
// //send the payload as full name,dob,
// router.post(
//   "/retailer-details/:retailerId"
// )
//  router.get(
//   "/retailer-details/:retailerId"
//  )

// //---------------------------------------



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


router.post("/check-ekyc", authMiddleware, doEkycController);
router.post("/do-bio-ekyc", authMiddleware, doBioEkycController);

export default router;