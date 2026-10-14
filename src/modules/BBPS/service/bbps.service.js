import sanitizePayload from "../../../utils/sanitizePayload.js";
import {
  billercategories,
  billers,
  fetchByCatId,
  fetchByCat,
  viewBill,
  payBill,
} from "../../external/services/provider.service.js";


//  Service to fetch all BBPS biller categories
const getBillerCategoriesService = async () => {
  return await billercategories();
};

// Service to fetch all BBPS billers
const getAllBillersService = async () => {
  return await billers();
};

//  Service to fetch billers by Category ID

const getBillersByCategoryIdService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  return await fetchByCatId(cleanPayload);
};

//  Service to fetch billers by Category Name
const getBillersByCategoryNameService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);
  return await fetchByCat(cleanPayload);
};

// Service to fetch / view consumer bill
const fetchBillService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);

  const generate11DigitOrderId = () => {
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    const remainingDigits = Math.floor(Math.random() * 10000000000)
      .toString()
      .padStart(10, "0");
    return `${firstDigit}${remainingDigits}`;
  };

  const orderid = String(cleanPayload.orderid || generate11DigitOrderId());
  const opcode = String(cleanPayload.opcode || cleanPayload.operator || "");
  const CUSTNO = String(cleanPayload.CUSTNO || cleanPayload.canumber || "");
  const REFMOBILENO = String(cleanPayload.REFMOBILENO || cleanPayload.mobile || CUSTNO || "9876543210");
  const AMT = String(cleanPayload.AMT ?? cleanPayload.amount ?? "0");
  const service_id = String(cleanPayload.service_id ?? cleanPayload.biller_id ?? "0");

  const field2Value =
    cleanPayload.FIELD2 ?? cleanPayload.email ?? cleanPayload.email_id;

  const requestPayload = {
    REFMOBILENO,
    AMT,
    CUSTNO,
    orderid,
    opcode,
    service_id,
    ...(cleanPayload.FIELD1 ? { FIELD1: String(cleanPayload.FIELD1).trim() } : {}),
    ...(field2Value ? { FIELD2: String(field2Value).trim() } : {}),
  };

  return await viewBill(sanitizePayload(requestPayload));
};

// Service to process bill payment
const payBillService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);

  const generate11DigitOrderId = () => {
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    const remainingDigits = Math.floor(Math.random() * 10000000000)
      .toString()
      .padStart(10, "0");
    return `${firstDigit}${remainingDigits}`;
  };

  const orderid = String(cleanPayload.orderid || generate11DigitOrderId());
  const opcode = String(cleanPayload.opcode || cleanPayload.operator || "");
  const CUSTNO = String(cleanPayload.CUSTNO || cleanPayload.canumber || "");
  const REFMOBILENO = String(cleanPayload.REFMOBILENO || cleanPayload.mobile || CUSTNO || "9876543210");
  const AMT = String(cleanPayload.AMT ?? cleanPayload.amount ?? "0");
  const service_id = String(cleanPayload.service_id ?? cleanPayload.biller_id ?? "0");
  const field2Value =
    cleanPayload.FIELD2 ?? cleanPayload.email ?? cleanPayload.email_id;

  const requestPayload = {
    REFMOBILENO,
    AMT,
    CUSTNO,
    orderid,
    opcode,
    service_id,
    amount: cleanPayload.amount ?? AMT,
    billnumber: cleanPayload.billnumber || "",
    billdate: cleanPayload.billdate || "",
    duedate: cleanPayload.duedate || "",
    referenceid: String(cleanPayload.referenceid || orderid),
    latitude: cleanPayload.latitude || "0",
    longitude: cleanPayload.longitude || "0",
    ...(cleanPayload.FIELD1 ? { FIELD1: String(cleanPayload.FIELD1).trim() } : {}),
    ...(field2Value ? { FIELD2: String(field2Value).trim() } : {}),
  };

  return await payBill(sanitizePayload(requestPayload));
};

export {
  getBillerCategoriesService,
  getAllBillersService,
  getBillersByCategoryIdService,
  getBillersByCategoryNameService,
  fetchBillService,
  payBillService,
};
