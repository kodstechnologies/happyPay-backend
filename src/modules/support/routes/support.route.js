import express from "express";

import {
  createSupportTicket,
  getAllSupportTickets,
  getRetailerSupportTickets,
  assignSupportTicket,
  updateTicketStatus,
} from "../controller/support.controller.js";

import authMiddleware from "../../../middlewares/auth.middleware.js";
import { restrictUploadedFileFields } from "../../../utils/multer.js";
import upload from "../../../utils/multer.js";

const router = express.Router();
router.post(
  "/tickets",
  authMiddleware,
  upload.array("attachments", 5),
  restrictUploadedFileFields(["attachments"]),
  createSupportTicket
);
router.get(
  "/retailer/tickets",
  authMiddleware,
  getRetailerSupportTickets
);
router.get(
  "/tickets",
  authMiddleware,
  getAllSupportTickets
);

router.patch(
  "/tickets/:ticketId/assign",
  authMiddleware,
  assignSupportTicket
);

router.patch("/tickets/:ticketId/status", authMiddleware, updateTicketStatus);

export default router;