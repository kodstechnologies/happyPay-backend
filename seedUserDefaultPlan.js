import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

// Import models
import User from "./src/modules/auth/model/user.model.js";
import Plan from "./src/modules/pricing/models/plan.model.js";
import { Subscription } from "./src/modules/pricing/models/subscription.model.js";

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in environment variables");
  process.exit(1);
}

async function seedUserDefaultPlan() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected successfully");

    // 1. Find the default plan
    console.log("\n1. Finding default plan...");
    const defaultPlan = await Plan.findOne({ isDefault: true, status: "ACTIVE" });
    
    if (!defaultPlan) {
      console.error("❌ No active default plan found with isDefault: true");
      console.log("Please mark a plan as default first by setting isDefault: true in the Plan collection");
      process.exit(1);
    }

    console.log(`✓ Found default plan: ${defaultPlan.name} (ID: ${defaultPlan._id})`);

    // 2. Find all users without a planId
    console.log("\n2. Finding users without planId...");
    const usersWithoutPlan = await User.find({ planId: { $exists: false } });
    
    console.log(`✓ Found ${usersWithoutPlan.length} users without planId`);

    if (usersWithoutPlan.length === 0) {
      console.log("\n✓ All users already have a planId assigned. No action needed.");
      process.exit(0);
    }

    // 3. Update users with default planId
    console.log("\n3. Updating users with default planId...");
    let updatedCount = 0;
    let skippedCount = 0;

    for (const user of usersWithoutPlan) {
      try {
        // Check if user already has an active subscription
        const existingActiveSub = await Subscription.findOne({
          userId: user._id,
          isExpired: false,
          cancelledAt: null,
        });

        if (existingActiveSub) {
          console.log(`  - Skipping user ${user.mobile} (already has active subscription)`);
          skippedCount++;
          continue;
        }

        // Update user with planId
        await User.findByIdAndUpdate(user._id, { planId: defaultPlan._id });
        
        // Create subscription record
        const subscription = await Subscription.create({
          planId: defaultPlan._id,
          userId: user._id,
          subscribedAt: new Date(),
          expiresAt: null, // Default plan never expires
          isExpired: false,
        });

        // Update user with subscription reference
        await User.findByIdAndUpdate(user._id, { subscription: subscription._id });

        console.log(`  ✓ Updated user ${user.mobile} (ID: ${user._id})`);
        updatedCount++;
      } catch (err) {
        console.error(`  ✗ Failed to update user ${user.mobile}:`, err.message);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY:");
    console.log("=".repeat(60));
    console.log(`Total users without planId: ${usersWithoutPlan.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Skipped (had subscription): ${skippedCount}`);
    console.log("=".repeat(60));

    if (updatedCount > 0) {
      console.log("\n✓ Default plan seeding completed successfully!");
    } else {
      console.log("\n⚠ No users were updated");
    }

  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\nMongoDB disconnected");
  }
}

// Run the seed function
seedUserDefaultPlan();
