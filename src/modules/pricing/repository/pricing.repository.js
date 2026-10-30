import Plan from "../models/plan.model.js";
import "../models/serviceConfig.model.js";

const createPlan = async (planData) => {
  const plan = new Plan(planData);
  return await plan.save();
};

const getPlans = async (filters = {}, options = {}) => {
  const { sort = { createdAt: -1 }, limit = 100, page = 1 } = options;
  const skip = (page - 1) * limit;

  // Get total count for pagination metadata
  const total = await Plan.countDocuments(filters);

  // Get paginated plans
  const plans = await Plan.find(filters).sort(sort).skip(skip).limit(limit);

  const totalPages = Math.ceil(total / limit);

  return {
    data: plans,
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

const getPlanById = async (id) => {
  return await Plan.findById(id);
};

const updatePlan = async (id, updateData) => {
  return await Plan.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
};

const deletePlan = async (id) => {
  return await Plan.findByIdAndDelete(id);
};

const savePlan = async (plan) => {
  return await plan.save();
};

export {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan,
  savePlan,
};
