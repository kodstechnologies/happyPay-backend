import {
  assignSupportTicketService,
  createSupportTicketService,
  getAllSupportTicketsService,
  getRetailerSupportTicketsService,
  updateTicketStatusService,
} from "../service/support.service.js";

const createSupportTicket = async (req, res, next) => {
  try {
    const retailerId = req.user.userId;
    const {
      subject,
      category,
      otherCategory,
      priority,
      description,
      relatedTransactionId,
    } = req.body;

    const attachments = (req.files || []).map((file) => ({
      url: file.path,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
    }));

    if (!subject?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Subject is required",
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!description?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Description is required",
      });
    }

    const ticket = await createSupportTicketService({
      retailerId,
      subject,
      category,
      otherCategory,
      priority,
      description,
      attachments,
      relatedTransactionId,
    });

    return res.status(201).json({
      success: true,
      message: "Support ticket created successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};
const getAllSupportTickets = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      status,
      category,
      priority,
      assignedTo,
    } = req.query;

    const result = await getAllSupportTicketsService({
      page: Math.max(Number(page) || 1, 1),

      limit: Math.min(
        Math.max(Number(limit) || 10, 1),
        100
      ),

      search,
      sortBy,
      sortOrder,
      status,
      category,
      priority,
      assignedTo,
    });

    return res.status(200).json({
      success: true,
      message: "Support tickets fetched successfully",

      data: result.tickets,

      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getRetailerSupportTickets = async (req, res, next) => {
  try {
    const retailerId = req.user.userId;

    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      status,
      category,
      priority,
    } = req.query;

    const result = await getRetailerSupportTicketsService({
      retailerId,
      page: Math.max(Number(page) || 1, 1),
      limit: Math.min(
        Math.max(Number(limit) || 10, 1),
        100
      ),
      search,
      sortBy,
      sortOrder,
      status,
      category,
      priority,
    });

    return res.status(200).json({
      success: true,
      message: "Support tickets fetched successfully",
      data: result.tickets,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
};
const assignSupportTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required",
      });
    }

    const ticket = await assignSupportTicketService({
      ticketId,
      adminId,
    });

    return res.status(200).json({
      success: true,
      message: "Support ticket assigned successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

const updateTicketStatus = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const validStatuses = ["open", "in_progress", "resolved", "closed"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const ticket = await updateTicketStatusService({
      ticketId,
      status,
    });

    return res.status(200).json({
      success: true,
      message: "Ticket status updated successfully",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

export {
  createSupportTicket,
  getAllSupportTickets,
  getRetailerSupportTickets,
  assignSupportTicket,
  updateTicketStatus,
};