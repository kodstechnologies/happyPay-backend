import PROVIDER_ROUTES from "../constants/provider.routes.js";
import { getProvider, postProviderForm } from "../utils/providerRequest.js";

const verifyAadhar = (payload) =>
  postProviderForm(
    PROVIDER_ROUTES.demographic.verifyAadhar,
    payload
  );

const verifyPan = (payload) =>
  postProviderForm(
    PROVIDER_ROUTES.demographic.verifyPan,
    payload
  );

const verifyAccount = (payload) =>
  postProviderForm(
    PROVIDER_ROUTES.demographic.verifyAccount,
    payload
  );

const getBankList = async ({ page = 1, limit = 10 } = {}) => {
  const response = await getProvider(PROVIDER_ROUTES.aeps.bankList);

  console.log("========== BANK API RESPONSE ==========");
  console.log("response.data:", response);
  console.log("BankList:", response?.BankList);
  console.log("Is Array:", Array.isArray(response?.BankList));
  console.log("=======================================");

  const banks = response?.BankList || [];
  const total = banks.length;
  const skip = (page - 1) * limit;

  return {
    data: banks.slice(skip, skip + limit),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const doEkyc = (payload) =>
  postProviderForm(PROVIDER_ROUTES.aeps.doEkyc, payload);

const doBioEkyc = (payload) =>{
  

   return postProviderForm(PROVIDER_ROUTES.aeps.doBioEkyc, payload)
  };

const verifyTfa = (payload) =>
  postProviderForm(PROVIDER_ROUTES.aeps.verifyTfa, payload);

const getLoginStatus = (payload) =>
  postProviderForm(PROVIDER_ROUTES.aeps.loginStatus, payload);

const verifyBiometric = doEkyc;

// for AEPS5
const onboardMerchant = (payload) =>
  postProviderForm(PROVIDER_ROUTES.aeps.onboard, payload);

// bbps services
const billercategories = () =>
  getProvider(PROVIDER_ROUTES.bbps.billerCat);

const billers = () =>
  getProvider(PROVIDER_ROUTES.bbps.billers);

const viewBill = (payload) =>
  postProviderForm(PROVIDER_ROUTES.bbps.viewBill, payload);

const payBill = (payload) =>
  postProviderForm(PROVIDER_ROUTES.bbps.payBill, payload);

const fetchByCatId = (payload) =>
  postProviderForm(PROVIDER_ROUTES.bbps.fetchByCatId, payload);

const fetchByCat = (payload) =>
  postProviderForm(PROVIDER_ROUTES.bbps.fetchByCat, payload);

// dmt services
const registerRemitter = (payload) =>
  postProviderForm(PROVIDER_ROUTES.dmt.registerRemitter, payload);

const registerRemitterVerify = (payload) =>
  postProviderForm(PROVIDER_ROUTES.dmt.registerRemitterVerify, payload);

const loginRemitter = (payload) =>
  postProviderForm(PROVIDER_ROUTES.dmt.loginRemitter, payload);

const remitterEkyc = (payload) =>
  postProviderForm(PROVIDER_ROUTES.dmt.remitterEkyc, payload);

const addBeneficiary = (payload) =>
  postProviderForm(PROVIDER_ROUTES.dmt.addBen, payload);

const verifyBeneficiary = (payload) =>
  postProviderForm(PROVIDER_ROUTES.dmt.verifyBen, payload);

const getBeneficiaries = (payload) =>
  postProviderForm(PROVIDER_ROUTES.dmt.getBenificiaries, payload);

const deleteBeneficiary = (payload) =>
  postProviderForm(PROVIDER_ROUTES.dmt.deleteBen, payload);

const deleteBeneficiaryVerifyOtp = (payload) =>
  postProviderForm(PROVIDER_ROUTES.dmt.deleteBenVerifyotp, payload);

const generateTransactionOtp = (payload) =>
  postProviderForm(PROVIDER_ROUTES.dmt.generateTransactionOtp, payload);

const doTransaction = (payload) =>
  postProviderForm(PROVIDER_ROUTES.dmt.doTransaction, payload);

const getTransactionStatus = (payload) =>
  postProviderForm(PROVIDER_ROUTES.dmt.transactionStatus, payload);

// UPI Cashpoint services
const initiateUpiCashpointPayment = (payload) =>
  postProviderForm(PROVIDER_ROUTES.upiCashpoint.intiatepayment, payload);


// CMS Payment services
const initiateCmsPayment = (payload) =>
  postProviderForm(PROVIDER_ROUTES.cmsPayment.initiatePayment, payload);

export {
  verifyAadhar,
  verifyPan,
  verifyAccount,
  getBankList,
  doEkyc,
  doBioEkyc,
  verifyTfa,
  getLoginStatus,
  verifyBiometric,
  onboardMerchant,
  billercategories,
  billers,
  viewBill,
  payBill,
  fetchByCatId,
  fetchByCat,

  registerRemitter,
  registerRemitterVerify,
  loginRemitter,
  remitterEkyc,

  addBeneficiary,
  verifyBeneficiary,
  getBeneficiaries,
  deleteBeneficiary,
  deleteBeneficiaryVerifyOtp,
  generateTransactionOtp,
  doTransaction,
  getTransactionStatus,
  initiateUpiCashpointPayment,
  initiateCmsPayment
};

export default onboardMerchant;
