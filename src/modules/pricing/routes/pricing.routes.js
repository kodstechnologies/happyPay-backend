import { Router } from "express";
import {
  createPlanController,
  getPlansController,
  getPlanByIdController,
  updatePlanController,
  deletePlanController,
  configurePlanServicesController,
  subscribeToPlanController,
  getSubscribedPlansController,
} from "../controllers/pricing.controllers.js";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import requireAdmin from "../../../middlewares/admin.middleware.js";
import { uploadPricingImage } from "../../../utils/multer.js";
import { validateCreatePlan, validateUpdatePlan, parseFormDataFields, validateConfigurePlanServices } from "../validators/pricing.validators.js";

const router = Router();

// Public / Retailer route to get active plans
router.get("/", getPlansController);

// Get subscribed plans for authenticated user (extracts userId from req.user)

router.get("/subscribed-plans", authMiddleware, getSubscribedPlansController);


router.get("/:id", authMiddleware, getPlanByIdController);

// Subscription route for retailers / authenticated users
// Supports both PATCH /api/v1/pricing/:id/subscribe and PATCH /api/v1/pricing/subscribe (with planId in body)
router.patch("/:id/subscribe", authMiddleware, subscribeToPlanController);
// router.patch("/subscribe", authMiddleware, subscribeToPlanController);



// Admin only routes for CRUD
router.post("/", authMiddleware, requireAdmin, uploadPricingImage, validateCreatePlan, createPlanController);
router.put("/:id", authMiddleware, requireAdmin, uploadPricingImage, validateUpdatePlan, updatePlanController);
router.delete("/:id", authMiddleware, requireAdmin, deletePlanController);
router.patch(
  "/:id/services",
  authMiddleware,
  requireAdmin,
  validateConfigurePlanServices,
  configurePlanServicesController
);

export default router;

