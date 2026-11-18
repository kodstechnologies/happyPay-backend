import { Router } from "express";
import { getRetailerBanksController } from "../controllers/bankMaster.controller.js";

const router = Router();

router.get("/", getRetailerBanksController);

export default router;
