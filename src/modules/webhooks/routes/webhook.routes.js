/**
 * Webhook routes
 *
 * All routes under /api/v1/webhooks are publicly accessible (no retailer JWT).
 * Authentication is handled per-route by provider-specific verification logic.
 */

import { Router } from "express";
import { payoutCallbackController } from "../controllers/payoutCallback.controller.js";

const router = Router();

/**
 * POST /api/v1/webhooks/payout/callback
 *
 * Provider callback endpoint for settlement payout status updates.
 *
 * Authentication: Provider secret token via X-Webhook-Secret header
 * (or as configured via PAYOUT_WEBHOOK_SECRET env var).
 *
 * No retailer JWT required – the provider calls this directly.
 */
router.post("/payout/callback", payoutCallbackController);

export default router;

