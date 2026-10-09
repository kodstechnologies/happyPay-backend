 const sanitizePayload = (obj = {}) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      acc[key] = typeof value === "string" ? value.trim() : value;
    }
    return acc;
  }, {});
};

export default sanitizePayload;