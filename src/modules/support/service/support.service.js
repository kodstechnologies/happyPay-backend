import { findOne } from "../../auth/repository/admin.repository.js";
import {
  assignTicket,
  createTicket,
  findAllTickets,
  updateTicketStatus,
} from "../repository/support.repository.js";

const generateTicketNumber = () => {
  const timestamp = Date.now();

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `TKT-${timestamp}-${random}`;
};

const createSupportTicketService = async ({
  retailerId,
  subject,
  category,
  otherCategory,
  priority,
  description,
  attachments,
  relatedTransactionId,
}) => {
  // Don't store otherCategory for normal categories
  const ticketData = {
    ticketNumber: generateTicketNumber(),
    retailerId,
    subject: subject.trim(),
    category,
    otherCategory:
      category === "OTHER"
        ? otherCategory?.trim() || null
        : null,
    priority: priority || "medium",
    description: description.trim(),
    attachments: attachments || [],
    relatedTransactionId:
      relatedTransactionId || null,
  };

  const ticket = await createTicket(ticketData);

  return ticket;
};

const getAllSupportTicketsService = async ({
  page,
  limit,
  search,
  sortBy,
  sortOrder,
  status,
  category,
  priority,
  assignedTo,
  retailerId,
}) => {
  return await findAllTickets({
    page,
    limit,
    search,
    sortBy,
    sortOrder,
    status,
    category,
    priority,
    assignedTo,
    retailerId,
  });
};

const getRetailerSupportTicketsService = async ({
  retailerId,
  page,
  limit,
  search,
  sortBy,
  sortOrder,
  status,
  category,
  priority,
}) => {
  return await findAllTickets({
    retailerId,
    page,
    limit,
    search,
    sortBy,
    sortOrder,
    status,
    category,
    priority,
  });
};


const assignSupportTicketService = async ({
  ticketId,
  adminId,
}) => {
  const admin = await findOne({
    _id: adminId,
    status: "active",
  });

  if (!admin) {
    const error = new Error("Active admin user not found");
    error.statusCode = 404;
    throw error;
  }

  const ticket = await assignTicket(ticketId, adminId);

  if (!ticket) {
    const error = new Error("Support ticket not found");
    error.statusCode = 404;
    throw error;
  }

  return ticket;
};

const updateTicketStatusService = async ({
  ticketId,
  status,
}) => {
  const ticket = await updateTicketStatus(ticketId, status);

  if (!ticket) {
    const error = new Error("Support ticket not found");
    error.statusCode = 404;
    throw error;
  }

  return ticket;
};

export {
  createSupportTicketService,
  getAllSupportTicketsService,
  getRetailerSupportTicketsService,
  assignSupportTicketService,
  updateTicketStatusService,
};