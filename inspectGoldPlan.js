import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

import Plan from "./src/modules/pricing/models/plan.model.js";

const inspectGoldPlan = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find the Happy Pay Gold Plan
    const plan = await Plan.findOne({ name: "Happy Pay Gold Plan" }).lean();

    if (!plan) {
      console.log("❌ Happy Pay Gold Plan not found");
      process.exit(1);
    }

    console.log("\n=== HAPPY PAY GOLD PLAN ===");
    console.log(`Plan Name: ${plan.name}`);
    console.log(`Plan ID: ${plan._id}`);
    console.log(`Status: ${plan.status}`);
    console.log(`Total Services: ${plan.services?.length || 0}`);

    console.log("\n=== ALL SERVICES IN GOLD PLAN ===");
    plan.services?.forEach((service) => {
      console.log(`\n📋 Service: ${service.serviceId}`);
      console.log(`   Categories: ${service.categories?.length || 0}`);
    });

    // Find PAYOUT service
    const payoutService = plan.services?.find(
      (s) => s.serviceId?.toLowerCase() === "payout"
    );

    if (!payoutService) {
      console.log("\n❌ PAYOUT service NOT found in Happy Pay Gold Plan");
      console.log("   This means the pricing engine will fall back to default (0 charges)");
      process.exit(0);
    }

    console.log("\n=== PAYOUT SERVICE CONFIGURATION ===");
    console.log(`Service ID: ${payoutService.serviceId}`);
    console.log(`Categories: ${payoutService.categories?.length || 0}`);

    // Show service-level pricing
    if (payoutService.pricing && payoutService.pricing.length > 0) {
      console.log("\n--- Service-Level Pricing ---");
      payoutService.pricing.forEach((rule, idx) => {
        console.log(`\nRule ${idx + 1}:`);
        console.log(`  Type: ${rule.type}`);
        console.log(`  Calculation: ${rule.calculationType}`);
        console.log(`  Slabs: ${JSON.stringify(rule.slabs, null, 2)}`);
      });
    }

    // Show category-level pricing
    if (payoutService.categories && payoutService.categories.length > 0) {
      payoutService.categories.forEach((cat) => {
        console.log(`\n--- Category: ${cat.categoryName} ---`);
        if (cat.pricing && cat.pricing.length > 0) {
          cat.pricing.forEach((rule, idx) => {
            console.log(`\nRule ${idx + 1}:`);
            console.log(`  Type: ${rule.type}`);
            console.log(`  Calculation: ${rule.calculationType}`);
            console.log(`  Slabs: ${JSON.stringify(rule.slabs, null, 2)}`);
          });
        } else {
          console.log("  No pricing rules configured");
        }
      });
    }

    console.log("\n=== SIMULATION FOR ₹1000 TRANSACTION ===");
    // Simulate calculation for ₹1000
    const testAmount = 1000;
    let totalCharges = 0;
    let totalCommission = 0;

    const calculateForAmount = (pricingList, amount) => {
      let charges = 0;
      let commission = 0;

      for (const rule of pricingList) {
        const isCharge = rule.type === "CHARGE";
        const isPercentage = rule.calculationType === "PERCENTAGE";

        if (!Array.isArray(rule.slabs)) continue;

        const matchedSlab = rule.slabs.find((slab) => {
          const min = Number(slab.minAmount ?? 0);
          const max = slab.maxAmount !== null && slab.maxAmount !== undefined ? Number(slab.maxAmount) : Infinity;
          return amount >= min && amount <= max;
        });

        if (!matchedSlab) continue;

        const rawValue = matchedSlab.chargeAmount ?? matchedSlab.adminAmount ?? 0;
        const computedValue = isPercentage ? (amount * rawValue) / 100 : rawValue;

        if (isCharge) {
          charges += computedValue;
        } else {
          commission += computedValue;
        }
      }

      return { charges, commission };
    };

    // Try service-level pricing first
    if (payoutService.pricing && payoutService.pricing.length > 0) {
      const result = calculateForAmount(payoutService.pricing, testAmount);
      totalCharges += result.charges;
      totalCommission += result.commission;
      console.log(`Service-level: Charges=₹${result.charges}, Commission=₹${result.commission}`);
    }

    // Then category-level (if "Transfer To Bank" matches)
    const transferCat = payoutService.categories?.find(
      (c) => c.categoryName?.toLowerCase().includes("transfer") || c.categoryName?.toLowerCase().includes("bank")
    );
    if (transferCat && transferCat.pricing && transferCat.pricing.length > 0) {
      const result = calculateForAmount(transferCat.pricing, testAmount);
      totalCharges += result.charges;
      totalCommission += result.commission;
      console.log(`Category "${transferCat.categoryName}": Charges=₹${result.charges}, Commission=₹${result.commission}`);
    }

    const netDebit = testAmount + totalCharges - totalCommission;
    console.log(`\n📊 FINAL CALCULATION:`);
    console.log(`   Transaction Amount: ₹${testAmount}`);
    console.log(`   Total Charges: ₹${totalCharges}`);
    console.log(`   Total Commission: ₹${totalCommission}`);
    console.log(`   NET DEBIT AMOUNT: ₹${netDebit}`);

    if (netDebit === testAmount * 2) {
      console.log(`\n⚠️  WARNING: Charges are set to ₹${totalCharges}, which equals the transaction amount!`);
      console.log(`    This explains why 2x amount is being deducted.`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

inspectGoldPlan();
