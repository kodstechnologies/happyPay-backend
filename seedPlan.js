import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Import models directly — bypass the service layer so we don't need auth or middleware
import Plan from "./src/modules/pricing/models/plan.model.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a zero-amount slab covering all transaction amounts
// ─────────────────────────────────────────────────────────────────────────────
const zeroSlab = () => ({
  minAmount: 0,
  maxAmount: null, // null = no upper limit
  chargeAmount: 0,
  adminAmount: 0,
  distributorAmount: 0,
  retailerAmount: 0,
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a Pricing rule (COMMISSION + CHARGE) with zero values
// ─────────────────────────────────────────────────────────────────────────────
const zeroPricing = () => [
  {
    type: "COMMISSION",
    calculationType: "FIXED",
    slabs: [zeroSlab()],
  },
  {
    type: "CHARGE",
    calculationType: "FIXED",
    slabs: [zeroSlab()],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Default services configuration — all amounts zero, ready to edit
// ─────────────────────────────────────────────────────────────────────────────
const defaultServices = [
  // ── AEPS ──────────────────────────────────────────────────────────────────
  {
    serviceId: "AEPS",
    pricing: zeroPricing(), // service-level fallback
    categories: [
      { categoryName: "Cash Withdrawal",  pricing: zeroPricing() },
      { categoryName: "Cash Deposit",     pricing: zeroPricing() },
      { categoryName: "Balance Enquiry",  pricing: zeroPricing() },
      { categoryName: "Mini Statement",   pricing: zeroPricing() },
    ],
  },

  // ── DMT ───────────────────────────────────────────────────────────────────
  {
    serviceId: "DMT",
    pricing: zeroPricing(),
    categories: [
      { categoryName: "IMPS", pricing: zeroPricing() },
      { categoryName: "NEFT", pricing: zeroPricing() },
    ],
  },

  // ── BBPS ──────────────────────────────────────────────────────────────────
  {
    serviceId: "BBPS",
    pricing: zeroPricing(),
    categories: [
      { categoryName: "Electricity",   pricing: zeroPricing() },
      { categoryName: "Water",         pricing: zeroPricing() },
      { categoryName: "Gas",           pricing: zeroPricing() },
      { categoryName: "DTH",           pricing: zeroPricing() },
      { categoryName: "Mobile",        pricing: zeroPricing() },
      { categoryName: "Broadband",     pricing: zeroPricing() },
      { categoryName: "Insurance",     pricing: zeroPricing() },
      { categoryName: "Loan Repayment",pricing: zeroPricing() },
    ],
  },

  // ── CMS (Cash Management Services) ───────────────────────────────────────
  {
    serviceId: "CMS",
    pricing: zeroPricing(),
    categories: [
      { categoryName: "Cash Drop",  pricing: zeroPricing() },
      { categoryName: "Collection", pricing: zeroPricing() },
    ],
  },

  // ── UPI Cashpoint ─────────────────────────────────────────────────────────
  {
    serviceId: "UPI",
    pricing: zeroPricing(),
    categories: [],
  },

  // ── Recharge ──────────────────────────────────────────────────────────────
  {
    serviceId: "recharge",
    pricing: zeroPricing(),
    categories: [
      { categoryName: "Prepaid Mobile",  pricing: zeroPricing() },
      { categoryName: "Postpaid Mobile", pricing: zeroPricing() },
      { categoryName: "Data Card",       pricing: zeroPricing() },
    ],
  },

  // ── Payout ────────────────────────────────────────────────────────────────
  {
    serviceId: "payout",
    pricing: zeroPricing(),
    categories: [
      { categoryName: "Bank Transfer", pricing: zeroPricing() },
      { categoryName: "UPI Transfer",  pricing: zeroPricing() },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Seed
// ─────────────────────────────────────────────────────────────────────────────
const seedPlan = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Idempotency — skip if the default plan already exists
    const existing = await Plan.findOne({ name: "Default Plan" });
    if (existing) {
      console.log(`ℹ️  Default Plan already exists (id: ${existing._id}). Skipping.`);
      console.log("   You can edit it via the admin panel at /admin/plans.");
      process.exit(0);
    }

    const plan = await Plan.create({
      name: "Default Plan",
      description:
        "Base plan with zero charges and zero commissions for all services. Edit amounts via the admin panel.",
      validityPeriod: 1,
      validityUnit: "YEARS",
      subscriptionAmount: 0,
      status: "ACTIVE",
      services: defaultServices,
    });

    console.log("✅ Default Plan created successfully!");
    console.log(`   Plan ID : ${plan._id}`);
    console.log(`   Name    : ${plan.name}`);
    console.log(`   Status  : ${plan.status}`);
    console.log(`   Services: ${plan.services.map((s) => s.serviceId).join(", ")}`);
    console.log("\n   Edit it via: Admin Panel → Plan Management → Default Plan");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    process.exit(1);
  }
};

seedPlan();
