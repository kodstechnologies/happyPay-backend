import { Router } from "express";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import validate from "../../../middlewares/validate.middleware.js";
import { initiateCmsPaymentController } from "../controllers/cms.controller.js";
import { initiateCmsPaymentSchema } from "../validations/cms.validation.js";

const router = Router();

// Initiate CMS Payment
router.post(
  "/initiate-payment",
  authMiddleware,
  validate(initiateCmsPaymentSchema, "body"),
  initiateCmsPaymentController
);


export default router;
