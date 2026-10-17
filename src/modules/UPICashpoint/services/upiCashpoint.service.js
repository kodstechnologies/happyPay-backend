import { initiateUpiCashpointPayment } from "../../external/services/provider.service.js";

const initiateUpiCashpointService = async (payload = {}) => {
  return await initiateUpiCashpointPayment(payload);
};

export { initiateUpiCashpointService };

