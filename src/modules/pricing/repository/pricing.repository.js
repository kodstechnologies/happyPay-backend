import Plan from "../models/plan.model.js";
import "../models/serviceConfig.model.js";

const createPlan = async (planData) => {
  const plan = new Plan(planData);
  return await plan.save();
};

const getPlans = async (filters = {}, options = {}) => {
  const { sort = { createdAt: -1 }, limit = 100, page = 1, search } = options;
  const skip = (page - 1) * limit;

  // Build query with search functionality
  const query = { ...filters };

  // Add search filter if provided (search in name and description)
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  // Get total count for pagination metadata
  const total = await Plan.countDocuments(query);

  // Get paginated plans (lean for read-only performance)
  const plans = await Plan.find(query).sort(sort).skip(skip).limit(limit).lean();

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

const getPlanById = async (id, lean = true) => {
  // Default to lean (plain object) for read-only performance.
  // Pass lean=false when you need a Mongoose document for .set()/.push()/save().
  const query = Plan.findById(id);
  return lean ? await query.lean() : await query.exec();
};

const findOnePlan = async (query = {}, projection = null) => {
  return await Plan.findOne(query, projection).lean();
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
  findOnePlan,
  updatePlan,
  deletePlan,
  savePlan,
};
