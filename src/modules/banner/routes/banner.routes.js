import { Router } from "express";
import {
  createBannerController,
  getBannersController,
  getBannerByIdController,
  updateBannerController,
  deleteBannerController,
} from "../controllers/banner.controller.js";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import requireAdmin from "../../../middlewares/admin.middleware.js";
import { uploadBannerImage } from "../../../utils/multer.js";

const router = Router();

// Public / Retailer route to get active banners
router.get("/", getBannersController);
router.get("/:id", getBannerByIdController);

// Admin only routes for CRUD
router.post("/", uploadBannerImage, createBannerController);
router.put("/:id", uploadBannerImage, updateBannerController);
router.delete("/:id",deleteBannerController);

export default router;
