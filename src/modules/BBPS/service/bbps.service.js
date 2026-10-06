import ApiError from "../../../utils/ApiError.js";
import {
  billercategories,
  billers,
  fetchByCatId,
  fetchByCat,
  viewBill,
  payBill,
} from "../../external/services/provider.service.js";

/**
 * Service to fetch all BBPS biller categories
 */
const getBillerCategoriesService = async () => {
  const result = await billercategories();
  return result;
};

/**
 * Service to fetch all BBPS billers
 */
const getAllBillersService = async () => {
  const result = await billers();
  return result;
};

/**
 * Service to fetch billers by Category ID
 * @param {Object} payload - { cat_id }
 */
const getBillersByCategoryIdService = async (payload = {}) => {
  
  const result = await fetchByCatId(payload);
  return result;
};

/**
 * Service to fetch billers by Category Name
 * @param {Object} payload - { category }
 */
const getBillersByCategoryNameService = async (payload = {}) => {
 

  const result = await fetchByCat(payload);
  return result;
};

/**
 * Service to fetch / view consumer bill
 * @param {Object} payload - Details required by provider for bill fetching (e.g., biller_id, consumer_number, etc.)
 */
const fetchBillService = async (payload = {}) => {

  const result = await viewBill(payload);
  return result;
};

/**
 * Service to process bill payment
 * @param {Object} payload - Payment details required by provider (e.g., biller_id, amount, consumer details, etc.)
 */
const payBillService = async (payload = {}) => {

  const result = await payBill(payload);
  return result;
};

export {
  getBillerCategoriesService,
  getAllBillersService,
  getBillersByCategoryIdService,
  getBillersByCategoryNameService,
  fetchBillService,
  payBillService,
};
