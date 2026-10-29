import mongoose from "mongoose";
const subscriptionSchema = new mongoose.Schema(
    {
        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Plan",
            required: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        subscribedAt: {
            type: Date,
            default: Date.now,
        },
        cancelledAt: {
            type: Date,
            default: null,
        },
        expiresAt: {
            type: Date,
            default: null,
        },
        isExpired: {
            type: Boolean,
            default: false,
        }
    },
    { timestamps: true }
);


export const Subscription = mongoose.model("Subscription", subscriptionSchema);