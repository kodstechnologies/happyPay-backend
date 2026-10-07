import { Router } from "express";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import validate from "../../../middlewares/validate.middleware.js";
import { initiateUpiCashpointController } from "../controllers/upiCashpoint.controller.js";
import { initiateUpiCashpointSchema } from "../validations/upiCashpoint.validation.js";

const router = Router();

// Initiate UPI Cashpoint Payment
router.post(
  "/initiate-payment",
  authMiddleware,
  validate(initiateUpiCashpointSchema, "body"),
  initiateUpiCashpointController
);

export default router;
