import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    retailerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "AEPS",
        "DMT",
        "CMS",
        "WALLET",
        "KYC",
        "ACCOUNT",
        "TRANSACTION",
        "TECHNICAL",
        "OTHER",
      ],
      required: true,
    },

    otherCategory: {
      type: String,
      trim: true,
      default: null,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    attachments: [
      {
        url: {
          type: String,
          trim: true,
        },
    
        fileName: {
          type: String,
          required: true,
          trim: true,
        },
    
        fileType: {
          type: String,
          trim: true,
        },
    
        fileSize: {
          type: Number,
        },
      },
    ],

    status: {
      type: String,
      enum: [
        "open",
        "in_progress",
        "resolved",
        "closed",
      ],
      default: "open",
      index: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    relatedTransactionId: {
      type: String,
      default: null,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    closedAt: {
      type: Date,
      default: null,
    },

    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const SupportTicket = mongoose.model(
  "SupportTicket",
  supportTicketSchema
);

export default SupportTicket;