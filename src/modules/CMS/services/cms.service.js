import { initiateCmsPayment } from "../../external/services/provider.service.js";

/**
 * Service to initiate a CMS (Cash Management System) transaction
 * @param {Object} payload - CMS transaction details
 */
const initiateCmsPaymentService = async (payload = {}) => {
  return await initiateCmsPayment(payload);
};

export { initiateCmsPaymentService };
