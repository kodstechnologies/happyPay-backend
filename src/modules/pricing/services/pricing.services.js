import {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan,
  savePlan,
} from "../repository/pricing.repository.js";
import ApiError from "../../../utils/ApiError.js";

const addPlan = async (planData) => {
  return await createPlan(planData);
};

const listPlans = async (filters = {}, options = {}) => {
  return await getPlans(filters, options);
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
  const plan = await deletePlan(id);
  if (!plan) throw ApiError.notFound("Plan not found");
  return { message: "Plan deleted successfully" };
};

const configurePlanServices = async (planId, incomingServices) => {
  const plan = await getPlanById(planId);

  if (!plan) {
    throw ApiError.notFound("Plan not found");
  }

  for (const incomingService of incomingServices) {
    const existingIndex = plan.services.findIndex(
      (service) =>
        service.serviceId?._id?.toString() ===
          incomingService.serviceId ||
        service.serviceId?.toString() === incomingService.serviceId
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

export {
  addPlan,
  listPlans,
  fetchPlan,
  modifyPlan,
  removePlan,
  configurePlanServices,
};
