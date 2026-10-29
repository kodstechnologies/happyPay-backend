import Plan from "../models/plan.model.js";
import "../models/serviceConfig.model.js";

const createPlan = async (planData) => {
  const plan = new Plan(planData);
  return await plan.save();
};

const getPlans = async (filters = {}, options = {}) => {
  const { sort = { createdAt: -1 }, limit = 100, page = 1 } = options;
  const skip = (page - 1) * limit;
  return await Plan.find(filters).sort(sort).skip(skip).limit(limit);
};

const getPlanById = async (id) => {
  return await Plan.findById(id).populate("services.serviceId");
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
