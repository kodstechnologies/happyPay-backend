import FormData from "form-data";
import providerClient from "../../../config/provider.client.js";

/**
 * Check if provider response contains an error
 * @param {Object} data - Provider response data
 * @returns {Object|null} - Error object if error exists, null otherwise
 */
const checkProviderError = (data) => {
  if (!data) return null;

  const status = String(data.status || "").toUpperCase();

  if (status === "ERROR" || status === "FAILED" || status === "FAILURE") {
    const error = new Error(data.msg || data.message || "Provider error occurred");
    error.statusCode = 400;
    error.providerError = true;
    error.providerData = {
      status: data.status,
      message: data.msg || data.message,
      ip: data.ip,
      code: data.code || data.errorCode,
      details: data
    };
    return error;
  }

  return null;
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

    console.log(`[PROVIDER API RESPONSE] Path: ${path} | Status: ${response.status}`, response.data);

    // Check for provider-level errors in response
    const providerError = checkProviderError(response.data);
    if (providerError) {
      throw providerError;
    }

    return response.data;
  } catch (error) {
    console.error(`[PROVIDER API ERROR] Path: ${path} | Error:`, error?.response?.data || error?.message || error);
    throw error;
  }
};

const getProvider = async (path, config = {}) => {
  const response = await providerClient.get(path, config);

  // Check for provider-level errors in response
  const providerError = checkProviderError(response.data);
  if (providerError) {
    throw providerError;
  }

  return response.data;
};

export { postProviderForm, getProvider };
