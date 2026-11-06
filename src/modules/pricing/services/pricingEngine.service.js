import mongoose from "mongoose";
import Plan from "../models/plan.model.js";
import { Subscription } from "../models/subscription.model.js";
import User from "../../auth/model/user.model.js";
import DistributorMapping from "../../network/model/distributorMapping.model.js";

const round2 = (val) => Math.round((Number(val) || 0) * 100) / 100;

const normalizeName = (name) => String(name || "").trim().toLowerCase();
const sanitizeForMatch = (name) => normalizeName(name).replace(/[^a-z0-9]/g, "");

/**
 * Resolves the active Plan for a user (or default system plan)
 */
export const resolveActivePlan = async (userId = null, planId = null) => {
  if (planId && mongoose.Types.ObjectId.isValid(planId)) {
    const plan = await Plan.findById(planId).lean();
    if (plan) return plan;
  }

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    const activeSub = await Subscription.findOne({
      userId,
      isExpired: false,
      cancelledAt: null,
      expiresAt: { $gt: new Date() },
    })
      .populate("planId")
      .lean();

    if (activeSub?.planId) {
      return activeSub.planId;
    }
  }

  // Fallback to the Default Plan
  return await Plan.findOne({ name: "Default Plan", status: "ACTIVE" }).lean();
};

/**
 * Resolves the distributor ID for a retailer
 */
export const resolveRetailerDistributor = async (userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }

  const user = await User.findById(userId)
    .select("distributor ditributor")
    .lean();

  const directDistributor = user?.distributor || user?.ditributor || null;
  if (directDistributor) {
    return directDistributor;
  }

  const mapping = await DistributorMapping.findOne({
    retailerId: userId,
    isActive: true,
  }).lean();

  return mapping?.distributorId || null;
};

/**
 * Calculates commission and charges for a transaction based on plan rules
 *
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.userId - Retailer ID
 * @param {string} params.service - Service name (e.g. "AEPS", "DMT", "BBPS", "CMS")
 * @param {string} [params.category] - Optional category name (e.g. "Cash Withdrawal", "IMPS")
 * @param {number} params.amount - Transaction amount
 * @param {string} [params.planId] - Optional explicit plan ID
 * @returns {Promise<Object>} Calculated financial breakdown
 */
export const calculateTransactionPricing = async ({
  userId = null,
  service,
  category = "",
  amount = 0,
  planId = null,
}) => {
  const numAmount = round2(amount);

  const defaultResult = {
    planId: null,
    planName: "None",
    service,
    category: category || null,
    amount: numAmount,
    providerCharge: 0,
    adminCommission: 0,
    charges: 0,
    retailerCommission: 0,
    distributorCommission: 0,
    totalCommission: 0,
    distributorId: null,
    hasDistributor: false,
    netCreditAmount: numAmount,
    netDebitAmount: numAmount,
    commissionBreakdown: {
      providerCharge: 0,
      adminCommission: 0,
      distributorCommission: 0,
      retailerCommission: 0,
      totalCommission: 0,
      totalChargesDeducted: 0,
      distributorId: null,
    },
  };

  if (!service || numAmount <= 0) {
    return defaultResult;
  }

  try {
    // 1. Resolve Plan and Distributor concurrently
    const [plan, distributorId] = await Promise.all([
      resolveActivePlan(userId, planId),
      resolveRetailerDistributor(userId),
    ]);

    if (!plan || !Array.isArray(plan.services)) {
      return {
        ...defaultResult,
        distributorId,
        hasDistributor: Boolean(distributorId),
      };
    }

    // 2. Locate Service in Plan
    const targetServiceNorm = normalizeName(service);
    const targetServiceSanitized = sanitizeForMatch(service);

    const matchedService = plan.services.find((s) => {
      const sIdNorm = normalizeName(s.serviceId);
      const sIdSanitized = sanitizeForMatch(s.serviceId);
      return (
        sIdNorm === targetServiceNorm ||
        sIdSanitized === targetServiceSanitized ||
        (mongoose.Types.ObjectId.isValid(s.serviceId) &&
          s.serviceId.toString() === String(service).trim())
      );
    });

    if (!matchedService) {
      return {
        ...defaultResult,
        planId: plan._id,
        planName: plan.name,
        distributorId,
        hasDistributor: Boolean(distributorId),
      };
    }

    // 3. Resolve Pricing Rules (from Category or Service level)
    let pricingList = [];
    let resolvedCategoryName = null;

    if (category && String(category).trim() !== "" && Array.isArray(matchedService.categories)) {
      const targetCategoryNorm = normalizeName(category);
      const targetCategorySanitized = sanitizeForMatch(category);

      const matchedCategory = matchedService.categories.find((c) => {
        if (!c.categoryName) return false;
        const cNameNorm = normalizeName(c.categoryName);
        const cNameSanitized = sanitizeForMatch(c.categoryName);

        if (
          cNameNorm === targetCategoryNorm ||
          cNameSanitized === targetCategorySanitized ||
          (c._id && c._id.toString() === String(category).trim())
        ) {
          return true;
        }

        // Substring / tolerant match for common category names
        if (
          (cNameSanitized.includes("withdr") && targetCategorySanitized.includes("withdr")) ||
          (cNameSanitized.includes("enquir") && targetCategorySanitized.includes("enquir")) ||
          (cNameSanitized.includes("statement") && targetCategorySanitized.includes("statement")) ||
          (cNameSanitized.includes("deposit") && targetCategorySanitized.includes("deposit"))
        ) {
          return true;
        }

        return false;
      });

      if (matchedCategory && Array.isArray(matchedCategory.pricing) && matchedCategory.pricing.length > 0) {
        pricingList = matchedCategory.pricing;
        resolvedCategoryName = matchedCategory.categoryName;
      }
    }

    // Fall back to service-level pricing if category-level is empty
    if (pricingList.length === 0 && Array.isArray(matchedService.pricing)) {
      pricingList = matchedService.pricing;
    }

    // 4. Calculate Commission & Charge Components from Slabs
    let providerCharge = 0;
    let adminCommission = 0;
    let distributorCommission = 0;
    let retailerCommission = 0;

    for (const rule of pricingList) {
      const isCommission = rule.type === "COMMISSION";
      const isCharge = rule.type === "CHARGE";
      const isPercentage = rule.calculationType === "PERCENTAGE";

      if (!Array.isArray(rule.slabs)) continue;

      const matchedSlab = rule.slabs.find((slab) => {
        const min = Number(slab.minAmount ?? 0);
        const max = slab.maxAmount !== null && slab.maxAmount !== undefined ? Number(slab.maxAmount) : Infinity;
        return numAmount >= min && numAmount <= max;
      });

      if (!matchedSlab) continue;

      const computeVal = (val) => {
        const num = Number(val || 0);
        return isPercentage ? (numAmount * num) / 100 : num;
      };

      if (isCharge) {
        // Provider fee / charge amount
        const rawCharge = matchedSlab.chargeAmount ?? matchedSlab.adminAmount ?? 0;
        providerCharge += computeVal(rawCharge);
      } else if (isCommission) {
        adminCommission += computeVal(matchedSlab.adminAmount);
        distributorCommission += computeVal(matchedSlab.distributorAmount);
        retailerCommission += computeVal(matchedSlab.retailerAmount);
      }
    }

    // Round raw components
    providerCharge = round2(providerCharge);
    adminCommission = round2(adminCommission);
    distributorCommission = round2(distributorCommission);
    retailerCommission = round2(retailerCommission);

    const totalCommission = round2(adminCommission + distributorCommission + retailerCommission);

    // 5. Rule: Admin commission is also deducted from retailer wallet alongside provider charge
    const totalChargesDeducted = round2(providerCharge + adminCommission);

    // 6. Rule: If retailer has distributor -> distributor gets their share;
    //          If retailer has NO distributor -> distributor share goes to retailer!
    let finalRetailerCommission = retailerCommission;
    let finalDistributorCommission = distributorCommission;

    if (!distributorId) {
      finalRetailerCommission = round2(retailerCommission + distributorCommission);
      finalDistributorCommission = 0;
    }

    // 7. Net Amounts for Wallet
    // For credit transactions (e.g. AEPS Cash Withdrawal): principal + commission - total charges
    const netCreditAmount = round2(numAmount + finalRetailerCommission - totalChargesDeducted);

    // For debit transactions (e.g. DMT, BBPS, CMS): principal + total charges - commission
    const netDebitAmount = round2(numAmount + totalChargesDeducted - finalRetailerCommission);

    console.log("[PRICING DEBUG] Transaction Details:", {
      service,
      category: resolvedCategoryName || category,
      amount: numAmount,
      planName: plan.name,
      pricingList,
      hasDistributor: Boolean(distributorId),
      distributorId,
      retailerCommission,
      distributorCommission,
      finalRetailerCommission,
      finalDistributorCommission,
    });

    return {
      planId: plan._id,
      planName: plan.name,
      service,
      category: resolvedCategoryName || category || null,
      amount: numAmount,
      providerCharge,
      adminCommission,
      charges: totalChargesDeducted,
      retailerCommission: finalRetailerCommission,
      distributorCommission: finalDistributorCommission,
      totalCommission,
      distributorId: distributorId || null,
      hasDistributor: Boolean(distributorId),
      netCreditAmount,
      netDebitAmount,
      commissionBreakdown: {
        providerCharge,
        adminCommission,
        distributorCommission: finalDistributorCommission,
        retailerCommission: finalRetailerCommission,
        totalCommission,
        totalChargesDeducted,
        distributorId: distributorId || null,
      },
    };
  } catch (error) {
    console.error("[pricingEngine] Error calculating pricing:", error.message || error);
    // Graceful fallback to prevent halting transactions
    return defaultResult;
  }
};

export default {
  resolveActivePlan,
  resolveRetailerDistributor,
  calculateTransactionPricing,
};

