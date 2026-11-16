import FundRequest from "../model/fundRequest.model.js";

class FundRequestRepository {
  /**
   * Create a new fund request
   */
  async create(data) {
    const fundRequest = new FundRequest(data);
    return await fundRequest.save();
  }

  /**
   * Find fund request by ID
   */
  async findById(id) {
    return await FundRequest.findById(id)
      .populate("userId", "firstName lastName email mobile retailerId")
      .populate("reviewedBy", "firstName lastName email");
  }

  /**
   * Find fund request by ID (without population)
   */
  async findByIdPlain(id) {
    return await FundRequest.findById(id);
  }

  /**
   * Find all fund requests for a specific user with pagination
   */
  async findByUserId(userId, filters = {}) {
    const query = { userId };

    if (filters.status) {
      query.status = filters.status;
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      FundRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("reviewedBy", "firstName lastName email"),
      FundRequest.countDocuments(query)
    ]);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find all fund requests for a specific retailer ID
   */
  async findByRetailerId(retailerId, filters = {}) {
    const query = { retailerId };

    if (filters.status) {
      query.status = filters.status;
    }

    return await FundRequest.find(query)
      .sort({ createdAt: -1 })
      .populate("reviewedBy", "firstName lastName email");
  }

  /**
   * Find all fund requests with status filter (for admin)
   */
  async findAll(filters = {}) {
    const query = {};

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.userId) {
      query.userId = filters.userId;
    }

    if (filters.retailerId) {
      query.retailerId = filters.retailerId;
    }

    return await FundRequest.find(query)
      .sort({ createdAt: -1 })
      .populate("userId", "firstName lastName email mobile retailerId")
      .populate("reviewedBy", "firstName lastName email");
  }

  /**
   * Find pending fund requests (for admin)
   */
  async findPending() {
    return await FundRequest.find({ status: "PENDING" })
      .sort({ createdAt: -1 })
      .populate("userId", "firstName lastName email mobile retailerId");
  }

  /**
   * Update fund request by ID
   */
  async updateById(id, updateData) {
    return await FundRequest.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("userId", "firstName lastName email mobile retailerId")
      .populate("reviewedBy", "firstName lastName email");
  }

  /**
   * Update fund request status
   */
  async updateStatus(id, status, additionalData = {}) {
    const updateData = {
      status,
      ...additionalData,
    };

    if (status === "APPROVED" || status === "REJECTED") {
      updateData.reviewedAt = new Date();
    }

    return await this.updateById(id, updateData);
  }

  /**
   * Delete fund request by ID
   */
  async deleteById(id) {
    return await FundRequest.findByIdAndDelete(id);
  }

  /**
   * Count fund requests by status for a user
   */
  async countByUserIdAndStatus(userId, status) {
    return await FundRequest.countDocuments({ userId, status });
  }

  /**
   * Count fund requests by status (for admin)
   */
  async countByStatus(status) {
    return await FundRequest.countDocuments({ status });
  }
}

export default new FundRequestRepository();
