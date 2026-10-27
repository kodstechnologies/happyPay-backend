import SupportTicket from "../model/SupportTicket.model.js";
import "../../auth/model/user.model.js";
import "../../auth/model/Admin.model.js";

const createTicket = async (ticketData) => {
  return await SupportTicket.create(ticketData);
};

const findTicketById = async (ticketId) => {
  return await SupportTicket.findById(ticketId);
};

const findTicketsByRetailer = async (retailerId) => {
  return await SupportTicket.find({
    retailerId,
  }).sort({
    createdAt: -1,
  });
};
const findAllTickets = async ({
  page = 1,
  limit = 10,
  search = "",
  sortBy = "createdAt",
  sortOrder = "desc",
  status,
  category,
  priority,
  assignedTo,
  retailerId,
}) => {
  const skip = (page - 1) * limit;

  const filter = {};

  if (retailerId) {
    filter.retailerId = retailerId;
  }

  // Search
  if (search?.trim()) {
    filter.$or = [
      {
        ticketNumber: {
          $regex: search.trim(),
          $options: "i",
        },
      },
      {
        subject: {
          $regex: search.trim(),
          $options: "i",
        },
      },
      {
        description: {
          $regex: search.trim(),
          $options: "i",
        },
      },
    ];
  }

  // Filters
  if (status) {
    filter.status = status;
  }

  if (category) {
    filter.category = category;
  }

  if (priority) {
    filter.priority = priority;
  }

  if (assignedTo) {
    filter.assignedTo = assignedTo;
  }

  // Allowed sort fields
  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "lastMessageAt",
    "priority",
    "status",
    "ticketNumber",
  ];

  const finalSortBy = allowedSortFields.includes(sortBy)
    ? sortBy
    : "createdAt";

  const finalSortOrder = sortOrder === "asc" ? 1 : -1;

  const sort = {
    [finalSortBy]: finalSortOrder,
  };

  const [tickets, total] = await Promise.all([
    SupportTicket.find(filter)
      .populate(
        "retailerId",
        "firstName lastName email mobile"
      )
      .populate(
        "assignedTo",
        "firstName lastName email mobile"
      )
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),

    SupportTicket.countDocuments(filter),
  ]);

  return {
    tickets,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const assignTicket = async (ticketId, adminId) => {
  return await SupportTicket.findOneAndUpdate(
    { ticketNumber: ticketId },
    {
      assignedTo: adminId,
      status: "in_progress",
    },
    {
      new: true,
      runValidators: true,
    }
  )
    .populate("retailerId", "firstName lastName email mobile")
    .populate("assignedTo", "firstName lastName email mobile");
};

const updateTicketStatus = async (ticketId, status) => {
  const updateData = { status };

  if (status === "resolved") {
    updateData.resolvedAt = new Date();
  }

  if (status === "closed") {
    updateData.closedAt = new Date();
  }

  return await SupportTicket.findOneAndUpdate(
    { ticketNumber: ticketId },
    updateData,
    {
      new: true,
      runValidators: true,
    }
  )
    .populate("retailerId", "firstName lastName email mobile")
    .populate("assignedTo", "firstName lastName email mobile");
};

export {
  createTicket,
  findTicketById,
  findTicketsByRetailer,
  findAllTickets,
  assignTicket,
  updateTicketStatus,
};