import { Router } from "express";
import {
  createPlanController,
  getPlansController,
  getPlanByIdController,
  updatePlanController,
  deletePlanController,
  configurePlanServicesController,
} from "../controllers/pricing.controllers.js";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import requireAdmin from "../../../middlewares/admin.middleware.js";
import { uploadPricingImage } from "../../../utils/multer.js";
import { validateCreatePlan, validateUpdatePlan, parseFormDataFields, validateConfigurePlanServices } from "../validators/pricing.validators.js";

const router = Router();

// Public / Retailer route to get active plans
router.get("/", getPlansController);
router.get("/:id", getPlanByIdController);

// Admin only routes for CRUD
router.post("/", authMiddleware, requireAdmin, uploadPricingImage, parseFormDataFields, validateCreatePlan, createPlanController);
router.put("/:id", authMiddleware, requireAdmin, uploadPricingImage, parseFormDataFields, validateUpdatePlan, updatePlanController);
router.delete("/:id", authMiddleware, requireAdmin, deletePlanController);
router.patch(
  "/:id/services",
  authMiddleware,
  requireAdmin,
  validateConfigurePlanServices,
  configurePlanServicesController
);

export default router;
