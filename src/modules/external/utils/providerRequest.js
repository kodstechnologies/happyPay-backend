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
    let rawMsg = data.msg || data.message || "Provider error occurred";
    if (typeof rawMsg === "object" && rawMsg !== null) {
      try {
        const flatMsgs = Object.values(rawMsg)
          .flat()
          .filter(Boolean)
          .join(", ");
        rawMsg = flatMsgs || JSON.stringify(rawMsg);
      } catch {
        rawMsg = JSON.stringify(rawMsg);
      }
    }

    // Check if upstream provider quirk returned "Transaction Successful" despite status FAILED/ERROR
    const normalizedMsg = String(rawMsg || "").trim().toLowerCase();
    if (normalizedMsg.includes("transaction successful") || normalizedMsg === "success" || normalizedMsg === "successful") {
      return null;
    }

    const error = new Error(rawMsg);
    const rawCode = Number(data.code || data.errorCode || data.statusCode || data.status_code);
    error.statusCode = rawCode >= 400 && rawCode < 600 ? rawCode : 400;
    error.providerError = true;
    error.providerData = {
      status: data.status,
      message: data.msg || data.message,
      ip: data.ip,
      code: data.code || data.errorCode,
      details: data
    };
    error.data = data;
    error.meta = data;
    return error;
  }

  return null;
};

const postProviderForm = async (path, payload = {}) => {
  try {
    const form = new FormData();

    for (const [key, value] of Object.entries(payload)) {
      if (value === undefined || value === null) continue;

      if (Buffer.isBuffer(value) || typeof value?.pipe === "function") {
        form.append(key, value);
      } else if (typeof value === "object") {
        form.append(key, JSON.stringify(value));
      } else {
        form.append(key, String(value));
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
    if (error?.response?.data) {
      const errData = error.response.data;
      let rawMsg = errData.msg || errData.message || errData.error;
      if (typeof rawMsg === "object" && rawMsg !== null) {
        try {
          rawMsg = Object.values(rawMsg).flat().filter(Boolean).join(", ");
        } catch {
          rawMsg = JSON.stringify(rawMsg);
        }
      }
      if (rawMsg && typeof rawMsg === "string" && rawMsg.trim()) {
        error.message = rawMsg.trim();
      }
      error.providerError = true;
      error.providerData = errData;
      const rawCode = Number(errData.code || errData.errorCode || errData.statusCode || error.response.status);
      error.statusCode = rawCode >= 400 && rawCode < 600 ? rawCode : (error.response.status || 400);
    }
    throw error;
  }
};

const getProvider = async (path, config = {}) => {
  try {
    const response = await providerClient.get(path, config);

    // Check for provider-level errors in response
    const providerError = checkProviderError(response.data);
    if (providerError) {
      throw providerError;
    }

    return response.data;
  } catch (error) {
    console.error(`[PROVIDER GET ERROR] Path: ${path} | Error:`, error?.response?.data || error?.message || error);
    if (error?.response?.data) {
      const errData = error.response.data;
      let rawMsg = errData.msg || errData.message || errData.error;
      if (typeof rawMsg === "object" && rawMsg !== null) {
        try {
          rawMsg = Object.values(rawMsg).flat().filter(Boolean).join(", ");
        } catch {
          rawMsg = JSON.stringify(rawMsg);
        }
      }
      if (rawMsg && typeof rawMsg === "string" && rawMsg.trim()) {
        error.message = rawMsg.trim();
      }
      error.providerError = true;
      error.providerData = errData;
      const rawCode = Number(errData.code || errData.errorCode || errData.statusCode || error.response.status);
      error.statusCode = rawCode >= 400 && rawCode < 600 ? rawCode : (error.response.status || 400);
    }
    throw error;
  }
};

export { postProviderForm, getProvider };
