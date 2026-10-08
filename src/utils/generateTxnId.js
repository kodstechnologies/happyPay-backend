import crypto from "crypto";
export const generate15CharTxnId = (prefix = "TXN") => {
  const cleanPrefix = String(prefix || "");
  const remainingLen = Math.max(0, 15 - cleanPrefix.length);
  const randomStr = crypto
    .randomBytes(Math.ceil(remainingLen / 2) + 2)
    .toString("hex")
    .slice(0, remainingLen)
    .toUpperCase();

  return `${cleanPrefix}_${randomStr}`;
};


export default generate15CharTxnId;
