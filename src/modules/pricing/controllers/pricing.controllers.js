import {
  addPlan,
  listPlans,
  fetchPlan,
  modifyPlan,
  removePlan,
  configurePlanServices,
  subscribeToPlan,
  getSubscribedPlans,
  fetchCommissionAndCharge,
} from "../services/pricing.services.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiResponse } from "../../../utils/ApiResponse.js";

export const createPlanController = asyncHandler(async (req, res) => {
  const { image: _image, ...planData } = req.body;

  const plan = await addPlan({
    ...planData,
    image: req.file?.path,
  });
  res.status(201).json(ApiResponse.success(plan, "Plan created successfully"));
});

export const getPlansController = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 100, search, sortBy } = req.query;
  const filters = {};
  if (status) {
    filters.status = status;
  }

  // Build sort object based on sortBy parameter
  let sort = { createdAt: -1 }; // default: newest first
  if (sortBy === "oldest") {
    sort = { createdAt: 1 };
  } else if (sortBy === "name") {
    sort = { name: 1 };
  } else if (sortBy === "validity") {
    sort = { validityPeriod: -1 };
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort,
    search,
  };
  const plans = await listPlans(filters, options);
  res.status(200).json(ApiResponse.success(plans, "Plans fetched successfully"));
});

export const getPlanByIdController = asyncHandler(async (req, res) => {
  const plan = await fetchPlan(req.params.id);

  // Check if user has subscribed to this plan
  // Admins can optionally pass userId query parameter to check for a specific user
  // If no userId provided, check for the current authenticated user
  const userId = req.query?.userId || req.user?.userId || req.user?._id || req.user?.id;
  let isSubscribed = false;

  if (userId) {
    const { Subscription } = await import("../models/subscription.model.js");
    const now = new Date();

    // Check for active subscription (not expired and not cancelled)
    const subscription = await Subscription.findOne({
      userId,
      planId: req.params.id,
      isExpired: false,
      cancelledAt: null,
      expiresAt: { $gt: now },
    });

    isSubscribed = !!subscription;
  }

  // Add isSubscribed flag to the plan response
  const planWithSubscriptionStatus = {
    ...plan.toObject ? plan.toObject() : plan,
    isSubscribed,
  };

  res.status(200).json(ApiResponse.success(planWithSubscriptionStatus, "Plan fetched successfully"));
});

export const updatePlanController = asyncHandler(async (req, res) => {
  const { image: _image, ...updateData } = req.body;
  if (req.file?.path) {
    updateData.image = req.file.path;
  }

  const plan = await modifyPlan(req.params.id, updateData);
  res.status(200).json(ApiResponse.success(plan, "Plan updated successfully"));
});

export const deletePlanController = asyncHandler(async (req, res) => {
  const response = await removePlan(req.params.id);
  res.status(200).json(ApiResponse.success(response, "Plan deleted successfully"));
});


export const configurePlanServicesController = asyncHandler(
  async (req, res) => {
    const plan = await configurePlanServices(
      req.params.id,
      req.body.services
    );

    res
      .status(200)
      .json(
        ApiResponse.success(
          plan,
          "Plan services configured successfully"
        )
      );
  }
);

export const subscribeToPlanController = asyncHandler(async (req, res) => {
  const planId = req.params.id || req.body?.planId;
  const userId = req.user?.userId || req.user?._id || req.user?.id || req.body?.userId;

  const subscription = await subscribeToPlan(planId, userId);

  res
    .status(200)
    .json(
      ApiResponse.success(
        subscription,
        "Subscribed to plan successfully"
      )
    );
});

export const getSubscribedPlansController = asyncHandler(async (req, res) => {
  // Take user's ID from req.user object as requested
  const userId =
    req.user?.userId ||
    req.user?._id ||
    req.user?.id ||
    req.params.id;

  const activeOnly =
    req.query.activeOnly === "true" ||
    req.query.status === "ACTIVE" ||
    req.query.status === "active";

  const { page = 1, limit = 10, search, sortBy, status } = req.query;
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    activeOnly,
    search,
    sortBy,
    status,
  };

  const subscriptions = await getSubscribedPlans(userId, options);

  res
    .status(200)
    .json(
      ApiResponse.success(
        subscriptions,
        "Subscribed plans fetched successfully"
      )
    );
});

export const getCommissionAndChargeController = asyncHandler(async (req, res) => {
  const serviceName = req.query.service || req.query.serviceName || req.query.serviceId;
  const categoryName = req.query.category || req.query.categoryName || req.query.categoryId;
  const planId = req.query.planId;
  const userId = req.user?.userId || req.user?._id || req.user?.id;

  const result = await fetchCommissionAndCharge({
    planId,
    userId,
    serviceName,
    categoryName,
  });

  res
    .status(200)
    .json(
      ApiResponse.success(
        result,
        "Commission and charges fetched successfully"
      )
    );
});
