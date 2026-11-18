import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

import Plan from "./src/modules/pricing/models/plan.model.js";
import { Subscription } from "./src/modules/pricing/models/subscription.model.js";
import User from "./src/modules/auth/model/user.model.js";

const inspectPlans = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // List all plans
    const allPlans = await Plan.find({}).lean();
    console.log(`\n=== ALL PLANS IN DATABASE (${allPlans.length}) ===`);
    allPlans.forEach((plan) => {
      console.log(`\n📋 Plan: ${plan.name}`);
      console.log(`   ID: ${plan._id}`);
      console.log(`   Status: ${plan.status}`);
      console.log(`   Services: ${plan.services?.length || 0}`);
    });

    // Check if there are any active subscriptions
    const activeSubs = await Subscription.find({ isExpired: false }).lean();
    console.log(`\n=== ACTIVE SUBSCRIPTIONS (${activeSubs.length}) ===`);
    if (activeSubs.length === 0) {
      console.log("No active subscriptions found");
    } else {
      for (const sub of activeSubs) {
        const plan = await Plan.findById(sub.planId).lean();
        const user = await User.findById(sub.userId).select("fullName mobile").lean();
        console.log(`\n👤 User: ${user?.fullName || user?.mobile || sub.userId}`);
        console.log(`   Plan: ${plan?.name || sub.planId}`);
        console.log(`   Subscribed: ${sub.subscribedAt}`);
        console.log(`   Expires: ${sub.expiresAt || "Never"}`);
      }
    }

    // For each plan, show PAYOUT pricing
    console.log("\n=== PAYOUT PRICING IN EACH PLAN ===");
    for (const plan of allPlans) {
      const payoutService = plan.services?.find(
        (s) => s.serviceId?.toLowerCase() === "payout"
      );

      if (payoutService) {
        console.log(`\n📋 Plan: ${plan.name}`);
        console.log(`   Service-level pricing rules: ${payoutService.pricing?.length || 0}`);
        if (payoutService.pricing && payoutService.pricing.length > 0) {
          payoutService.pricing.forEach((rule, idx) => {
            const slab = rule.slabs?.[0];
            console.log(`     Rule ${idx + 1} (${rule.type}): chargeAmount=${slab?.chargeAmount}, adminAmount=${slab?.adminAmount}`);
          });
        }

        if (payoutService.categories && payoutService.categories.length > 0) {
          payoutService.categories.forEach((cat) => {
            console.log(`   Category: ${cat.categoryName}`);
            if (cat.pricing && cat.pricing.length > 0) {
              cat.pricing.forEach((rule, idx) => {
                const slab = rule.slabs?.[0];
                console.log(`     Rule ${idx + 1} (${rule.type}): chargeAmount=${slab?.chargeAmount}, adminAmount=${slab?.adminAmount}`);
              });
            }
          });
        }
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

inspectPlans();
