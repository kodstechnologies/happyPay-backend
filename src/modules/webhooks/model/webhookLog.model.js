import mongoose from "mongoose";

/**
 * Webhook Log Model
 *
 * Stores the raw JSON payload received from the payment provider's payout
 * callback endpoint, along with processing metadata.  This provides a full
 * audit trail independent of the Transaction model — useful for debugging,
 * reconciliation, and re-processing if needed.
 */

const webhookLogSchema = new mongoose.Schema(
  {
    // The raw JSON body exactly as received from the provider
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // Headers sent by the provider (sanitised — tokens redacted)
    headers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // IP address of the caller
    clientIp: {
      type: String,
      default: "",
    },

    // Webhook type — identifies which provider/flow this callback belongs to
    webhookType: {
      type: String,
      enum: ["PAYOUT_CALLBACK", "AEPS_CALLBACK", "OTHER"],
      default: "PAYOUT_CALLBACK",
    },

    // Extracted provider transaction ID (for quick lookup)
    providerTxnId: {
      type: String,
      default: null,
      index: true,
    },

    // Our internal transaction ID once matched
    transactionId: {
      type: String,
      default: null,
      index: true,
    },

    // Auth result from verifyCallbackAuthenticity
    authResult: {
      type: String,
      enum: ["ok", "no_secret_configured", "missing_secret", "invalid_secret", "unknown"],
      default: "unknown",
    },

    // Processing result
    processed: {
      type: Boolean,
      default: false,
    },

    // Final status after processing: success | failed | pending | unknown | unauthorized
    status: {
      type: String,
      default: null,
    },

    // Acknowledgement string returned to provider
    ack: {
      type: String,
      default: null,
    },

    // Processing message (success / error description)
    message: {
      type: String,
      default: "",
    },

    // Error details if processing failed
    error: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────

// Lookup by providerTxnId (most common query during reconciliation)
webhookLogSchema.index({ providerTxnId: 1, createdAt: -1 });

// Lookup by our internal transactionId
webhookLogSchema.index({ transactionId: 1, createdAt: -1 });

// Time-based queries (e.g., "all callbacks in the last hour")
webhookLogSchema.index({ createdAt: -1 });

// TTL — auto-delete logs after 90 days to prevent unbounded growth
webhookLogSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 90 * 24 * 60 * 60, // 90 days
  }
);

export default mongoose.model("WebhookLog", webhookLogSchema);
