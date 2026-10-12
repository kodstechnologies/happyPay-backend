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

  const generate11DigitOrderId = () => {
    // Generate an 11-digit numeric string (e.g., 45645634434)
    const firstDigit = Math.floor(Math.random() * 9) + 1; // 1-9
    const remainingDigits = Math.floor(Math.random() * 10000000000)
      .toString()
      .padStart(10, "0");
    return `${firstDigit}${remainingDigits}`;
  };

  const orderid = String(
    cleanPayload.orderid ||
    cleanPayload.orderId ||
    cleanPayload.order_id ||
    generate11DigitOrderId()
  );

  const opcode = String(
    cleanPayload.opcode ||
    cleanPayload.operator ||
    cleanPayload.biller_id ||
    cleanPayload.billerId ||
    ""
  );

  const operator = opcode;

  const CUSTNO = String(
    cleanPayload.CUSTNO ||
    cleanPayload.custno ||
    cleanPayload.canumber ||
    cleanPayload.consumer_number ||
    cleanPayload.account_number ||
    cleanPayload.mobile ||
    ""
  );

  const canumber = CUSTNO;

  const REFMOBILENO = String(
    cleanPayload.REFMOBILENO ||
    cleanPayload.refmobileno ||
    cleanPayload.ref_mobile_no ||
    cleanPayload.mobile ||
    cleanPayload.phone ||
    cleanPayload.customer_mobile ||
    (CUSTNO.match(/^[6-9]\d{9}$/) ? CUSTNO : "9876543210")
  );

  const AMT = String(
    cleanPayload.AMT !== undefined && cleanPayload.AMT !== null && cleanPayload.AMT !== ""
      ? cleanPayload.AMT
      : cleanPayload.amount !== undefined && cleanPayload.amount !== null && cleanPayload.amount !== ""
      ? cleanPayload.amount
      : "0"
  );

  const service_id = String(
    cleanPayload.service_id !== undefined && cleanPayload.service_id !== null && cleanPayload.service_id !== ""
      ? cleanPayload.service_id
      : cleanPayload.serviceId !== undefined && cleanPayload.serviceId !== null && cleanPayload.serviceId !== ""
      ? cleanPayload.serviceId
      : cleanPayload.biller_id !== undefined && cleanPayload.biller_id !== null && cleanPayload.biller_id !== ""
      ? cleanPayload.biller_id
      : cleanPayload.billerId !== undefined && cleanPayload.billerId !== null && cleanPayload.billerId !== ""
      ? cleanPayload.billerId
      : cleanPayload.category_id !== undefined && cleanPayload.category_id !== null && cleanPayload.category_id !== ""
      ? cleanPayload.category_id
      : cleanPayload.cat_id !== undefined && cleanPayload.cat_id !== null && cleanPayload.cat_id !== ""
      ? cleanPayload.cat_id
      : "0"
  );

  const referenceid = String(
    cleanPayload.referenceid ||
    cleanPayload.reference_id ||
    cleanPayload.client_ref_id ||
    orderid
  );

  const mode = cleanPayload.mode || "online";

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
    // 6 required fields in body
    REFMOBILENO,
    AMT,
    CUSTNO,
    orderid,
    opcode,
    service_id,
    // Compatible aliases
    operator,
    canumber,
    mobile: REFMOBILENO,
    amount: AMT,
    biller_id: service_id,
    referenceid,
    mode,
    ad1,
    ad2,
    ad3,
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

  const generate11DigitOrderId = () => {
    const firstDigit = Math.floor(Math.random() * 9) + 1;
    const remainingDigits = Math.floor(Math.random() * 10000000000)
      .toString()
      .padStart(10, "0");
    return `${firstDigit}${remainingDigits}`;
  };

  const orderid = String(
    cleanPayload.orderid ||
    cleanPayload.orderId ||
    cleanPayload.order_id ||
    generate11DigitOrderId()
  );

  const opcode = String(
    cleanPayload.opcode ||
    cleanPayload.operator ||
    cleanPayload.biller_id ||
    cleanPayload.billerId ||
    ""
  );

  const operator = opcode;

  const CUSTNO = String(
    cleanPayload.CUSTNO ||
    cleanPayload.custno ||
    cleanPayload.canumber ||
    cleanPayload.consumer_number ||
    cleanPayload.account_number ||
    cleanPayload.mobile ||
    ""
  );

  const canumber = CUSTNO;

  const REFMOBILENO = String(
    cleanPayload.REFMOBILENO ||
    cleanPayload.refmobileno ||
    cleanPayload.ref_mobile_no ||
    cleanPayload.mobile ||
    cleanPayload.phone ||
    cleanPayload.customer_mobile ||
    (CUSTNO.match(/^[6-9]\d{9}$/) ? CUSTNO : "9876543210")
  );

  const amount = cleanPayload.amount || cleanPayload.AMT || "0";
  const AMT = String(amount);

  const service_id = String(
    cleanPayload.service_id !== undefined && cleanPayload.service_id !== null && cleanPayload.service_id !== ""
      ? cleanPayload.service_id
      : cleanPayload.serviceId !== undefined && cleanPayload.serviceId !== null && cleanPayload.serviceId !== ""
      ? cleanPayload.serviceId
      : cleanPayload.biller_id !== undefined && cleanPayload.biller_id !== null && cleanPayload.biller_id !== ""
      ? cleanPayload.biller_id
      : cleanPayload.billerId !== undefined && cleanPayload.billerId !== null && cleanPayload.billerId !== ""
      ? cleanPayload.billerId
      : cleanPayload.category_id !== undefined && cleanPayload.category_id !== null && cleanPayload.category_id !== ""
      ? cleanPayload.category_id
      : cleanPayload.cat_id !== undefined && cleanPayload.cat_id !== null && cleanPayload.cat_id !== ""
      ? cleanPayload.cat_id
      : "0"
  );

  const referenceid = String(
    cleanPayload.referenceid ||
    cleanPayload.reference_id ||
    cleanPayload.client_ref_id ||
    orderid
  );

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
    // 6 required fields in body
    REFMOBILENO,
    AMT,
    CUSTNO,
    orderid,
    opcode,
    service_id,
    // Aliases & payment fields
    operator,
    canumber,
    amount,
    mobile: REFMOBILENO,
    biller_id: service_id,
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
