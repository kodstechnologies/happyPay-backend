import mongoose from "mongoose";
import {
  createPlan,
  getPlans,
  getPlanById,
  findOnePlan,
  updatePlan,
  deletePlan,
  savePlan,
} from "../repository/pricing.repository.js";
import ApiError from "../../../utils/ApiError.js";
import { Subscription } from "../models/subscription.model.js";
import User from "../../auth/model/user.model.js";

const addPlan = async (planData) => {
  return await createPlan(planData);
};

const listPlans = async (filters = {}, options = {}) => {
  const result = await getPlans(filters, options);
  return result;
};

const fetchPlan = async (id) => {
  const plan = await getPlanById(id);
  if (!plan) throw ApiError.notFound("Plan not found");
  return plan;
};

const modifyPlan = async (id, updateData) => {
  const plan = await updatePlan(id, updateData);
  if (!plan) throw ApiError.notFound("Plan not found");
  return plan;
};

const removePlan = async (id) => {
  // Check if plan exists
  const plan = await getPlanById(id);
  if (!plan) throw ApiError.notFound("Plan not found");

  // Check for active subscriptions
  const subscriptionCount = await Subscription.countDocuments({
    planId: id,
    isExpired: false,
    cancelledAt: null,
  });

  if (subscriptionCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete plan. This plan has ${subscriptionCount} active subscriber${subscriptionCount > 1 ? 's' : ''}. Please deactivate the plan or wait for subscriptions to expire before deletion.`
    );
  }

  // Check for any subscriptions (including expired)
  const totalSubscriptions = await Subscription.countDocuments({ planId: id });
  if (totalSubscriptions > 0) {
    throw ApiError.badRequest(
      `Cannot delete plan. This plan has ${totalSubscriptions} subscription${totalSubscriptions > 1 ? 's' : ''} in history. Plans with subscription history cannot be deleted.`
    );
  }

  // Delete the plan
  const deletedPlan = await deletePlan(id);
  return { message: "Plan deleted successfully" };
};

const configurePlanServices = async (planId, incomingServices) => {
  const plan = await getPlanById(planId);

  if (!plan) {
    throw ApiError.notFound("Plan not found");
  }

  for (const incomingService of incomingServices) {
    const existingIndex = plan.services.findIndex(
      (service) => service.serviceId === incomingService.serviceId
    );

    if (existingIndex >= 0) {
      // Update this service without removing the other services.
      plan.services[existingIndex].set(incomingService);
    } else {
      // Add a new service to the plan.
      plan.services.push(incomingService);
    }
  }

  return await savePlan(plan);
};

const subscribeToPlan = async (planId, userId) => {
  if (!planId) {
    throw ApiError.badRequest("Plan ID is required");
  }

  if (!mongoose.Types.ObjectId.isValid(planId)) {
    throw ApiError.badRequest("Invalid Plan ID format");
  }

  if (!userId) {
    throw ApiError.unauthorized("Authentication required to subscribe to a plan");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw ApiError.badRequest("Invalid User ID format");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  const plan = await getPlanById(planId);
  if (!plan) {
    throw ApiError.notFound("Plan not found");
  }

  if (plan.status !== "ACTIVE") {
    throw ApiError.badRequest("Cannot subscribe to an inactive plan");
  }

  // 1. Capture subscription start date & time (subscribedAt)
  const subscribedAt = new Date();

  // 2. Extract validity period & unit from the plan
  const validityPeriod = Number(plan.validityPeriod) || 1;
  const validityUnit = String(plan.validityUnit || "MONTHS").toUpperCase();

  // 3. Calculate when the plan expires (expiresAt)
  const expiresAt = new Date(subscribedAt);
  if (validityUnit === "DAYS") {
    expiresAt.setDate(expiresAt.getDate() + validityPeriod);
  } else if (validityUnit === "YEARS") {
    expiresAt.setFullYear(expiresAt.getFullYear() + validityPeriod);
  } else {
    // Default: MONTHS
    expiresAt.setMonth(expiresAt.getMonth() + validityPeriod);
  }

  // Deactivate any existing active subscriptions for this user
  await Subscription.updateMany(
    { userId, isExpired: false, cancelledAt: null },
    { $set: { isExpired: true, cancelledAt: subscribedAt } }
  );

  // 4. Create new subscription with captured subscribedAt and calculated expiresAt
  const subscription = await Subscription.create({
    planId: plan._id,
    userId,
    subscribedAt,
    expiresAt,
    isExpired: false,
  });

  // Update user's active subscription reference
  user.subscription = subscription._id;
  await user.save();

  // Populate plan details for the response
  await subscription.populate("planId");

  // 5. Backend console logging
  console.log("=================================================");
  console.log("🎉 [PLAN SUBSCRIPTION SUCCESS]");
  console.log(`👤 User ID       : ${userId}`);
  console.log(`📧 User Email    : ${user.email || "N/A"}`);
  console.log(`📦 Plan Name     : ${plan.name} (ID: ${plan._id})`);
  console.log(`⏱️ Validity      : ${validityPeriod} ${validityUnit}`);
  console.log(`📅 Subscribed At : ${subscribedAt.toISOString()}`);
  console.log(`⏳ Expires At    : ${expiresAt.toISOString()}`);
  console.log(`🆔 Subscription  : ${subscription._id}`);
  console.log("=================================================");

  return subscription;
};

const getSubscribedPlans = async (userId, options = {}) => {
  if (!userId) {
    throw ApiError.unauthorized("Authentication required: user ID not found");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw ApiError.badRequest("Invalid User ID format");
  }

  const now = new Date();

  // Auto-expire any subscriptions where expiry date has passed
  await Subscription.updateMany(
    { userId, isExpired: false, expiresAt: { $lte: now } },
    { $set: { isExpired: true } }
  );

  const query = { userId };
  if (options.activeOnly) {
    query.isExpired = false;
    query.cancelledAt = null;
    query.expiresAt = { $gt: now };
  }

  // Add status filter
  if (options.status) {
    if (options.status === "ACTIVE") {
      query.isExpired = false;
      query.cancelledAt = null;
      query.expiresAt = { $gt: now };
    } else if (options.status === "EXPIRED") {
      query.isExpired = true;
    } else if (options.status === "CANCELLED") {
      query.cancelledAt = { $ne: null };
    }
  }

  // Pagination options
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 10;
  const skip = (page - 1) * limit;

  // Build sort object
  let sort = { createdAt: -1 }; // default: newest first
  if (options.sortBy === "oldest") {
    sort = { createdAt: 1 };
  } else if (options.sortBy === "expiry") {
    sort = { expiresAt: 1 };
  } else if (options.sortBy === "planName") {
    sort = { "planId.name": 1 };
  }

  // Build final query with search if provided
  let finalQuery = query;
  if (options.search) {
    finalQuery = {
      ...query,
      $or: [
        { "planId.name": { $regex: options.search, $options: "i" } },
        { "planId.description": { $regex: options.search, $options: "i" } },
      ],
    };
  }

  // Get total count for pagination metadata
  const total = await Subscription.countDocuments(finalQuery);

  // Get paginated subscriptions
  const subscriptions = await Subscription.find(finalQuery)
    .populate("planId")
    .sort(sort)
    .skip(skip)
    .limit(limit);

  // Add isSubscribed flag to each plan in the subscriptions
  const subscriptionsWithFlag = subscriptions.map((subscription) => {
    const subObj = subscription.toObject ? subscription.toObject() : subscription;
    if (subObj.planId) {
      const planObj = subObj.planId.toObject ? subObj.planId.toObject() : subObj.planId;
      subObj.planId = {
        ...planObj,
        isSubscribed: true,
      };
    }
    return subObj;
  });

  const totalPages = Math.ceil(total / limit);

  console.log("=================================================");
  console.log(`📋 [FETCH SUBSCRIBED PLANS]`);
  console.log(`👤 User ID : ${userId}`);
  console.log(`📦 Found   : ${subscriptions.length} plan subscription(s)`);
  console.log(`📄 Page    : ${page} of ${totalPages}`);
  console.log(`📊 Total   : ${total}`);
  console.log("=================================================");

  return {
    data: subscriptionsWithFlag,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

/* =========================================================
   Helper: Extract Commission & Charge Components from Pricing
========================================================= */
const extractPricingComponents = (pricingArray = []) => {
  const commission =
    pricingArray.find((p) => p.type === "COMMISSION") || null;
  const charge =
    pricingArray.find((p) => p.type === "CHARGE") || null;

  return {
    pricing: pricingArray,
    commission,
    charge,
  };
};

const normalizeName = (name) => {
  return String(name || "").trim().toLowerCase();
};

const sanitizeForMatch = (name) => {
  return normalizeName(name).replace(/[^a-z0-9]/g, "");
};

/* =========================================================
   Fetch Commission and Charge by Service and Category Query
========================================================= */
const fetchCommissionAndCharge = async ({
  planId,
  userId,
  serviceName,
  categoryName,
}) => {
  if (!serviceName) {
    throw ApiError.badRequest("Service name is required in query parameter");
  }

  // 1. Resolve Target Plan
  let plan = null;

  if (planId) {
    if (!mongoose.Types.ObjectId.isValid(planId)) {
      throw ApiError.badRequest("Invalid Plan ID format");
    }
    plan = await getPlanById(planId);
    if (!plan) {
      throw ApiError.notFound("Plan not found with the provided planId");
    }
  } else if (userId) {
    const activeSub = await Subscription.findOne({
      userId,
      isExpired: false,
      cancelledAt: null,
      expiresAt: { $gt: new Date() },
    }).populate("planId");

    if (activeSub?.planId) {
      plan = activeSub.planId;
    }
  }

  // Fallback to active plan if no plan resolved yet
  if (!plan) {
    plan = await findOnePlan({ status: "ACTIVE" });
  }

  if (!plan) {
    throw ApiError.notFound(
      "No active plan found. Please provide a valid planId or subscribe to an active plan."
    );
  }

  // 2. Match Service inside Plan
  const targetServiceNorm = normalizeName(serviceName);
  const targetServiceSanitized = sanitizeForMatch(serviceName);

  let matchedService = (plan.services || []).find((s) => {
    const sIdNorm = normalizeName(s.serviceId);
    const sIdSanitized = sanitizeForMatch(s.serviceId);
    return (
      sIdNorm === targetServiceNorm ||
      sIdSanitized === targetServiceSanitized ||
      (mongoose.Types.ObjectId.isValid(s.serviceId) &&
        s.serviceId.toString() === serviceName.trim())
    );
  });

  // If not directly matched, check against ServiceConfig name if available
  if (!matchedService) {
    const ServiceConfigModel = mongoose.models.ServiceConfig;
    if (ServiceConfigModel) {
      const serviceConfig = await ServiceConfigModel.findOne({
        $or: [
          { name: new RegExp(`^${serviceName.trim()}$`, "i") },
          { serviceName: new RegExp(`^${serviceName.trim()}$`, "i") },
          ...(mongoose.Types.ObjectId.isValid(serviceName.trim())
            ? [{ _id: serviceName.trim() }]
            : []),
        ],
      });

      if (serviceConfig) {
        const configIdStr = serviceConfig._id.toString();
        const configName = normalizeName(serviceConfig.name || serviceConfig.serviceName);
        matchedService = (plan.services || []).find(
          (s) =>
            s.serviceId === configIdStr ||
            normalizeName(s.serviceId) === configName
        );
      }
    }
  }

  if (!matchedService) {
    throw ApiError.notFound(
      `Service '${serviceName}' is not configured in plan '${plan.name}'`
    );
  }

  // 3. Category Lookup (if categoryName is provided)
  if (categoryName && String(categoryName).trim() !== "") {
    const targetCategoryNorm = normalizeName(categoryName);
    const targetCategorySanitized = sanitizeForMatch(categoryName);

    const matchedCategory = (matchedService.categories || []).find((c) => {
      if (!c.categoryName) return false;
      const cNameNorm = normalizeName(c.categoryName);
      const cNameSanitized = sanitizeForMatch(c.categoryName);

      // Exact or sanitized match
      if (
        cNameNorm === targetCategoryNorm ||
        cNameSanitized === targetCategorySanitized ||
        (c._id && c._id.toString() === categoryName.trim())
      ) {
        return true;
      }

      // Tolerant match for common category names / slight spelling variations
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

    if (!matchedCategory) {
      throw ApiError.notFound(
        `Category '${categoryName}' not found under service '${serviceName}' in plan '${plan.name}'`
      );
    }

    const { pricing, commission, charge } = extractPricingComponents(
      matchedCategory.pricing || []
    );

    return {
      planId: plan._id,
      planName: plan.name,
      serviceId: matchedService.serviceId,
      categoryId: matchedCategory._id,
      categoryName: matchedCategory.categoryName,
      commission,
      charge,
      pricing,
    };
  }

  // 4. Return Service-Level Pricing and all Categories under this Service
  const { pricing, commission, charge } = extractPricingComponents(
    matchedService.pricing || []
  );

  const categories = (matchedService.categories || []).map((cat) => {
    const catPricing = extractPricingComponents(cat.pricing || []);
    return {
      categoryId: cat._id,
      categoryName: cat.categoryName,
      commission: catPricing.commission,
      charge: catPricing.charge,
      pricing: catPricing.pricing,
    };
  });

  return {
    planId: plan._id,
    planName: plan.name,
    serviceId: matchedService.serviceId,
    commission,
    charge,
    pricing,
    categories,
  };
};

export {
  addPlan,
  listPlans,
  fetchPlan,
  modifyPlan,
  removePlan,
  configurePlanServices,
  subscribeToPlan,
  getSubscribedPlans,
  fetchCommissionAndCharge,
};
