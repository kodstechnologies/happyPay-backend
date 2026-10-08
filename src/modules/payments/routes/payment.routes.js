import { Router } from "express";
import { initiatePayment, verifyPayment } from "../controllers/payment.controller.js";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import { validate } from "../../../middlewares/validate.middleware.js";
import { initiatePaymentSchema, verifyPaymentSchema } from "../validations/payment.validation.js";

const router = Router();
router.use(authMiddleware);

router.post("/initiate", validate(initiatePaymentSchema), initiatePayment);
router.post("/verify", validate(verifyPaymentSchema), verifyPayment);

export default router;
