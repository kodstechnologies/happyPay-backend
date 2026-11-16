import WalletLockRequest from "../model/walletLockRequest.model.js";

class WalletLockRequestRepository {
  /**
   * Create a new wallet lock request
   */
  async create(data) {
    const walletLockRequest = new WalletLockRequest(data);
    return await walletLockRequest.save();
  }

  /**
   * Find wallet lock request by ID
   */
  async findById(id) {
    return await WalletLockRequest.findById(id)
      .populate("userId", "firstName lastName email mobile retailerId")
      .populate("reviewedBy", "firstName lastName email");
  }

  /**
   * Find wallet lock request by ID (without population)
   */
  async findByIdPlain(id) {
    return await WalletLockRequest.findById(id);
  }

  /**
   * Find all wallet lock requests for a specific user with pagination
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
      WalletLockRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("reviewedBy", "firstName lastName email"),
      WalletLockRequest.countDocuments(query)
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
   * Find all wallet lock requests for a specific retailer ID
   */
  async findByRetailerId(retailerId, filters = {}) {
    const query = { retailerId };

    if (filters.status) {
      query.status = filters.status;
    }

    return await WalletLockRequest.find(query)
      .sort({ createdAt: -1 })
      .populate("reviewedBy", "firstName lastName email");
  }

  /**
   * Find all wallet lock requests with status filter (for admin)
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

    return await WalletLockRequest.find(query)
      .sort({ createdAt: -1 })
      .populate("userId", "firstName lastName email mobile retailerId")
      .populate("reviewedBy", "firstName lastName email");
  }

  /**
   * Find pending wallet lock requests (for admin)
   */
  async findPending() {
    return await WalletLockRequest.find({ status: "PENDING" })
      .sort({ createdAt: -1 })
      .populate("userId", "firstName lastName email mobile retailerId");
  }

  /**
   * Update wallet lock request by ID
   */
  async updateById(id, updateData) {
    return await WalletLockRequest.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("userId", "firstName lastName email mobile retailerId")
      .populate("reviewedBy", "firstName lastName email");
  }

  /**
   * Update wallet lock request status
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
   * Delete wallet lock request by ID
   */
  async deleteById(id) {
    return await WalletLockRequest.findByIdAndDelete(id);
  }

  /**
   * Count wallet lock requests by status for a user
   */
  async countByUserIdAndStatus(userId, status) {
    return await WalletLockRequest.countDocuments({ userId, status });
  }

  /**
   * Count wallet lock requests by status (for admin)
   */
  async countByStatus(status) {
    return await WalletLockRequest.countDocuments({ status });
  }

  /**
   * Find the latest approved lock request for a user
   */
  async findLatestApprovedByUserId(userId) {
    return await WalletLockRequest.findOne({
      userId,
      status: "APPROVED",
    }).sort({ reviewedAt: -1 });
  }
}

export default new WalletLockRequestRepository();
