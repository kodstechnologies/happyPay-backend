import mongoose from "mongoose";
import {
  createPlan,
  getPlans,
  getPlanById,
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

  // Pagination options
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 10;
  const skip = (page - 1) * limit;

  // Get total count for pagination metadata
  const total = await Subscription.countDocuments(query);

  // Get paginated subscriptions
  const subscriptions = await Subscription.find(query)
    .populate("planId")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const totalPages = Math.ceil(total / limit);

  console.log("=================================================");
  console.log(`📋 [FETCH SUBSCRIBED PLANS]`);
  console.log(`👤 User ID : ${userId}`);
  console.log(`📦 Found   : ${subscriptions.length} plan subscription(s)`);
  console.log(`📄 Page    : ${page} of ${totalPages}`);
  console.log(`📊 Total   : ${total}`);
  console.log("=================================================");

  return {
    data: subscriptions,
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

export {
  addPlan,
  listPlans,
  fetchPlan,
  modifyPlan,
  removePlan,
  configurePlanServices,
  subscribeToPlan,
  getSubscribedPlans,
};
