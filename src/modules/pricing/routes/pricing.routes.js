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
  getCommissionAndChargeController,
} from "../controllers/pricing.controllers.js";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import requireAdmin from "../../../middlewares/admin.middleware.js";
import { uploadPricingImage } from "../../../utils/multer.js";
import {
  validateCreatePlan,
  validateUpdatePlan,
  parseFormDataFields,
  validateConfigurePlanServices,
  validateGetCommissionChargeQuery,
} from "../validators/pricing.validators.js";
import { verifyAccessToken } from "../../../utils/jwt.js";

const router = Router();

// Optional authentication middleware: extracts user if token present, but doesn't block unauthenticated queries
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader) {
      const [scheme, bearerToken] = authHeader.split(" ");
      if (scheme === "Bearer" && bearerToken) {
        token = bearerToken;
      }
    }

    if (!token && req.headers.cookie) {
      const cookies = Object.fromEntries(
        req.headers.cookie
          .split(";")
          .map((c) => c.trim().split("="))
          .map(([k, ...v]) => [k, decodeURIComponent(v.join("="))])
      );
      token = cookies.accessToken || cookies.token || null;
    }

    if (token) {
      req.user = verifyAccessToken(token);
    }
  } catch {
    // Continue without req.user if token is invalid
  }
  next();
};

// Public / Retailer route to get active plans
router.get("/", getPlansController);

// Get subscribed plans for authenticated user (extracts userId from req.user)
router.get("/subscribed-plans", authMiddleware, getSubscribedPlansController);

// Get commission and charges by service and optional category query
router.get(
  "/commission-charges",
  optionalAuth,
  validateGetCommissionChargeQuery,
  getCommissionAndChargeController
);

router.get("/:id", authMiddleware, getPlanByIdController);

router.patch("/:id/subscribe", authMiddleware, subscribeToPlanController);

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
