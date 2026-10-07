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
  return await billercategories();
};

/**
 * Service to fetch all BBPS billers
 */
const getAllBillersService = async () => {
  return await billers();
};

/**
 * Service to fetch billers by Category ID
 * @param {Object} payload - { cat_id }
 */
const getBillersByCategoryIdService = async (payload = {}) => {
  return await fetchByCatId(payload);
};

/**
 * Service to fetch billers by Category Name
 * @param {Object} payload - { category }
 */
const getBillersByCategoryNameService = async (payload = {}) => {
  return await fetchByCat(payload);
};

/**
 * Service to fetch / view consumer bill
 * @param {Object} payload - Bill fetch parameters
 */
const fetchBillService = async (payload = {}) => {
  return await viewBill(payload);
};

/**
 * Service to process bill payment
 * @param {Object} payload - Payment details
 */
const payBillService = async (payload = {}) => {
  return await payBill(payload);
};

export {
  getBillerCategoriesService,
  getAllBillersService,
  getBillersByCategoryIdService,
  getBillersByCategoryNameService,
  fetchBillService,
  payBillService,
};
