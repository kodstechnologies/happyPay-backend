import { addPlan, listPlans, fetchPlan, modifyPlan, removePlan, configurePlanServices } from "../services/pricing.services.js";
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
  const { status, page = 1, limit = 100 } = req.query;
  const filters = {};
  if (status) {
    filters.status = status;
  }
  const options = { page: parseInt(page), limit: parseInt(limit) };
  const plans = await listPlans(filters, options);
  res.status(200).json(ApiResponse.success(plans, "Plans fetched successfully"));
});

export const getPlanByIdController = asyncHandler(async (req, res) => {
  const plan = await fetchPlan(req.params.id);
  res.status(200).json(ApiResponse.success(plan, "Plan fetched successfully"));
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