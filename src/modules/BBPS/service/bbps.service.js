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
  const category = cleanPayload.category || cleanPayload.catname || "";
  return await fetchByCat({ category });
};

// Service to fetch / view consumer bill
const fetchBillService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);

  const customerParams =
    typeof cleanPayload.customer_params === "object" && cleanPayload.customer_params !== null
      ? cleanPayload.customer_params
      : {};

  const operator =
    cleanPayload.operator ||
    cleanPayload.opcode ||
    cleanPayload.biller_id ||
    cleanPayload.billerId;

  const canumber =
    cleanPayload.canumber ||
    cleanPayload.consumer_number ||
    cleanPayload.account_number ||
    cleanPayload.mobile;

  const ad1 =
    cleanPayload.ad1 ||
    cleanPayload.field1 ||
    cleanPayload.FIELD1 ||
    cleanPayload.dob ||
    customerParams.ad1 ||
    customerParams.FIELD1 ||
    customerParams.field1;

  const ad2 =
    cleanPayload.ad2 ||
    cleanPayload.field2 ||
    cleanPayload.FIELD2 ||
    customerParams.ad2 ||
    customerParams.FIELD2 ||
    customerParams.field2;

  const ad3 =
    cleanPayload.ad3 ||
    cleanPayload.field3 ||
    cleanPayload.FIELD3 ||
    customerParams.ad3 ||
    customerParams.FIELD3 ||
    customerParams.field3;

  const referenceid =
    cleanPayload.referenceid ||
    cleanPayload.reference_id ||
    cleanPayload.client_ref_id ||
    `BBP${Date.now()}`;

  const mode = cleanPayload.mode || "online";

  // Omit customer_params so raw nested objects are not passed to provider form
  const { customer_params, ...restPayload } = cleanPayload;

  const requestPayload = {
    ...restPayload,
    operator,
    canumber,
    ad1,
    ad2,
    ad3,
    referenceid,
    mode,
  };

  return await viewBill(sanitizePayload(requestPayload));
};

// Service to process bill payment
const payBillService = async (payload = {}) => {
  const cleanPayload = sanitizePayload(payload);

  const customerParams =
    typeof cleanPayload.customer_params === "object" && cleanPayload.customer_params !== null
      ? cleanPayload.customer_params
      : {};

  const operator =
    cleanPayload.operator ||
    cleanPayload.opcode ||
    cleanPayload.biller_id ||
    cleanPayload.billerId;

  const canumber =
    cleanPayload.canumber ||
    cleanPayload.consumer_number ||
    cleanPayload.account_number ||
    cleanPayload.mobile;

  const amount = cleanPayload.amount;

  const referenceid =
    cleanPayload.referenceid ||
    cleanPayload.reference_id ||
    cleanPayload.client_ref_id ||
    `PAY${Date.now()}`;

  const latitude = cleanPayload.latitude || "0";
  const longitude = cleanPayload.longitude || "0";

  const billnumber = cleanPayload.billnumber || cleanPayload.bill_number;
  const billdate = cleanPayload.billdate || cleanPayload.bill_date;
  const duedate = cleanPayload.duedate || cleanPayload.due_date;

  const ad1 =
    cleanPayload.ad1 ||
    cleanPayload.field1 ||
    cleanPayload.FIELD1 ||
    cleanPayload.dob ||
    customerParams.ad1 ||
    customerParams.FIELD1 ||
    customerParams.field1;

  const ad2 =
    cleanPayload.ad2 ||
    cleanPayload.field2 ||
    cleanPayload.FIELD2 ||
    customerParams.ad2 ||
    customerParams.FIELD2 ||
    customerParams.field2;

  const ad3 =
    cleanPayload.ad3 ||
    cleanPayload.field3 ||
    cleanPayload.FIELD3 ||
    customerParams.ad3 ||
    customerParams.FIELD3 ||
    customerParams.field3;

  // Omit customer_params so raw nested objects are not passed to provider form
  const { customer_params, ...restPayload } = cleanPayload;

  const requestPayload = {
    ...restPayload,
    operator,
    canumber,
    amount,
    referenceid,
    latitude,
    longitude,
    billnumber,
    billdate,
    duedate,
    ad1,
    ad2,
    ad3,
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
