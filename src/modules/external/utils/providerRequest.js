import FormData from "form-data";
import providerClient from "../../../config/provider.client.js";
import logger from "../../../utils/logger.js";

/**
 * Normalizes provider errors by extracting meaningful status codes and error messages
 * while preserving the underlying Axios error response for backward compatibility.
 */
const handleProviderError = (error, path) => {
  const providerStatus = error.response?.status;
  const providerData = error.response?.data;

  logger.error(`Provider request failed [${path}]:`, {
    status: providerStatus,
    data: providerData,
    message: error.message,
  });

  let statusCode = 502;
  let message = "Third-party provider error";

  if (error.code === "ECONNABORTED") {
    statusCode = 504;
    message = "Third-party provider request timed out";
  } else if (!error.response && error.request) {
    statusCode = 503;
    message = "Unable to connect to third-party provider";
  } else if (providerStatus) {
    statusCode = providerStatus >= 400 && providerStatus < 500 ? providerStatus : 502;
    message =
      providerData?.msg ||
      providerData?.message ||
      providerData?.error ||
      error.message ||
      "Third-party provider error";
  }

  error.statusCode = statusCode;
  error.message = message;
  error.meta = providerData || null;

  throw error;
};

const postProviderForm = async (path, payload = {}) => {
  try {
    const form = new FormData();

    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null) {
        form.append(key, value);
      }
    }

    const response = await providerClient.post(path, form, {
      headers: form.getHeaders(),
    });

    return response.data;
  } catch (error) {
    return handleProviderError(error, path);
  }
};

const getProvider = async (path, config = {}) => {
  try {
    const response = await providerClient.get(path, config);
    return response.data;
  } catch (error) {
    return handleProviderError(error, path);
  }
};

export { postProviderForm, getProvider };
