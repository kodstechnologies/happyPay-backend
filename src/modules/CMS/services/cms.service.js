import { initiateCmsPayment } from "../../external/services/provider.service.js";

const initiateCmsPaymentService = async (payload = {}) => {
  return await initiateCmsPayment(payload);
};

export { initiateCmsPaymentService };
