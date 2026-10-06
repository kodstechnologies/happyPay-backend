import FormData from "form-data";
import providerClient from "../../../config/provider.client.js";

const postProviderForm = async (path, payload = {}) => {
  const form = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (value == null) continue;
    form.append(key, String(value));
  }

  const response = await providerClient.post(path, form, {
    headers: form.getHeaders(),
  });

  return response.data;
};

const getProvider = async (path, config = {}) => {
  const response = await providerClient.get(path, config);
  return response.data;
};

export { postProviderForm, getProvider };
