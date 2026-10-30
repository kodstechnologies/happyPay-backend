import { Router } from "express";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import validate from "../../../middlewares/validate.middleware.js";
import {
  initiateCmsPaymentController,
  cmsCallbackController,
} from "../controllers/cms.controller.js";
import { initiateCmsPaymentSchema } from "../validations/cms.validation.js";

const router = Router();

// Initiate CMS Payment (requires authenticated retailer)
router.post(
  "/initiate-payment",
  authMiddleware,
  validate(initiateCmsPaymentSchema, "body"),
  initiateCmsPaymentController
);

// CMS Server-to-Server Webhook Callback (Public endpoint for provider - no authMiddleware)
// Accepts both POST and GET callbacks from provider
router.post("/callback", cmsCallbackController);
router.get("/callback", cmsCallbackController);

export default router;
