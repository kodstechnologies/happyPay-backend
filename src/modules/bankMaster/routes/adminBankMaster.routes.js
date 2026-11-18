import { Router } from "express";
import authMiddleware from "../../../middlewares/auth.middleware.js";
import requireAdmin from "../../../middlewares/admin.middleware.js";
import {
  listBanksController,
  getBankController,
  updateBankController,
  toggleGlobalStatusController,
  toggleAepsStatusController,
  togglePayoutStatusController,
  syncBanksController,
} from "../controllers/adminBankMaster.controller.js";
const router = Router();

router.get("/", authMiddleware, requireAdmin, listBanksController);
router.get("/:id", authMiddleware, requireAdmin, getBankController);
router.patch("/:id", authMiddleware, requireAdmin, updateBankController);
router.patch("/:id/status", authMiddleware, requireAdmin, toggleGlobalStatusController);
router.patch("/:id/aeps-status", authMiddleware, requireAdmin, toggleAepsStatusController);
router.patch("/:id/payout-status", authMiddleware, requireAdmin, togglePayoutStatusController);
router.post("/sync", authMiddleware, requireAdmin, syncBanksController);

export default router;
