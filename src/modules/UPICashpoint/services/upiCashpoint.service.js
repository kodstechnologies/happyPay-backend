import { initiateUpiCashpointPayment } from "../../external/services/provider.service.js";

/**
 * Service to initiate a UPI Cashpoint payment / QR generation
 * @param {Object} payload - { amount, outlet_id, client_ref_id, mobile, etc. }
 */
const initiateUpiCashpointService = async (payload = {}) => {
  return await initiateUpiCashpointPayment(payload);
};

export { initiateUpiCashpointService };
