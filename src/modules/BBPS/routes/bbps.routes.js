import { Router } from "express";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import {
  getBillerCategoriesController,
  getAllBillersController,
  getBillersByCategoryIdController,
  getBillersByCategoryNameController,
  fetchBillController,
  payBillController,
} from "../controller/bbps.controller.js";

const router = Router();

// Fetch all biller categories
router.get("/categories", authMiddleware, getBillerCategoriesController);

// Fetch all billers
router.get("/billers", authMiddleware, getAllBillersController);

// Fetch billers by category ID (Supports both POST body and GET with param/query)
router.post("/billers/by-category-id", authMiddleware, getBillersByCategoryIdController);
router.get("/billers/category/:catId", authMiddleware, getBillersByCategoryIdController);

// Fetch billers by category name
router.post("/billers/by-category", authMiddleware, getBillersByCategoryNameController);

// Fetch / view bill details
router.post("/view-bill", authMiddleware, fetchBillController);

// Pay bill
router.post("/pay-bill", authMiddleware, payBillController);

export default router;
