import PROVIDER_ROUTES from "../constants/provider.routes.js";
import { getProvider, postProviderForm } from "../utils/providerRequest.js";
import { AEPS_BANKS } from "../constants/aepsBanks.js";

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

let cachedProviderBanks = null;

const getBankList = async ({ page = 1, limit = 50, search = "" } = {}) => {
  let banks = cachedProviderBanks;

  if (!banks || banks.length === 0) {
    try {
      const response = await getProvider(PROVIDER_ROUTES.aeps.bankList);
      if (response && Array.isArray(response.BankList) && response.BankList.length > 0) {
        cachedProviderBanks = response.BankList;
        banks = response.BankList;
      } else if (response && Array.isArray(response.data) && response.data.length > 0) {
        cachedProviderBanks = response.data;
        banks = response.data;
      }
    } catch (err) {
      console.warn(
        "[AEPS Bank List] Upstream provider fetch failed, using fallback AEPS bank list:",
        err?.message || err
      );
    }
  }



  if (!banks || !Array.isArray(banks) || banks.length === 0) {
    banks = AEPS_BANKS;
  }

  // Filter by search if provided
  if (search && typeof search === "string" && search.trim()) {
    const q = search.trim().toLowerCase();
    banks = banks.filter(
      (b) =>
        (b.name && String(b.name).toLowerCase().includes(q)) ||
        (b.iin && String(b.iin).includes(q)) ||
        (Array.isArray(b.aliases) && b.aliases.some((a) => a.toLowerCase().includes(q)))
    );
  }

  const effectiveLimit = Math.max(Number(limit) || 50, 1);
  const effectivePage = Math.max(Number(page) || 1, 1);
  const total = banks.length;
  const skip = (effectivePage - 1) * effectiveLimit;

  return {
    data: banks.slice(skip, skip + effectiveLimit),
    meta: {
      total,
      page: effectivePage,
      limit: effectiveLimit,
      totalPages: Math.ceil(total / effectiveLimit) || 1,
    },
  };
};

const doEkyc = (payload) =>
  postProviderForm(PROVIDER_ROUTES.aeps.doEkyc, payload);

const outletRegister = (payload) =>
  postProviderForm(PROVIDER_ROUTES.aeps.outletRegister, payload);

const outletRegisterVerify = (payload) =>
  postProviderForm(PROVIDER_ROUTES.aeps.outletRegisterVerify, payload);

const balanceEnquiry = async (payload) => {
  try {
    const response = await postProviderForm(PROVIDER_ROUTES.aeps.balanceEnquiry, payload);
    console.log("========== [balanceEnquiry Success Response] ==========", response);
    return response;
  } catch (error) {
    console.error("========== [balanceEnquiry Error Response] ==========", error?.response?.data || error?.message || error);
    throw error;
  }
};

const miniStatement = async (payload) => {
  try {
    const response = await postProviderForm(PROVIDER_ROUTES.aeps.miniStatement, payload);
    console.log("========== [miniStatement Success Response] ==========", response);
    return response;
  } catch (error) {
    console.error("========== [miniStatement Error Response] ==========", error?.response?.data || error?.message || error);
    throw error;
  }
};

const cashDeposite = async (payload) => {
  try {
    const response = await postProviderForm(PROVIDER_ROUTES.aeps.deposite, payload);
    console.log("========== [cashDeposite Success Response] ==========", response);
    return response;
  } catch (error) {
    console.error("========== [cashDeposite Error Response] ==========", error?.response?.data || error?.message || error);
    throw error;
  }
};

const cashWithdraw = async (payload) => {
  try {
    const response = await postProviderForm(PROVIDER_ROUTES.aeps.cashWithdraw, payload);
    console.log("========== [cashWithdraw Success Response] ==========", response);
    return response;
  } catch (error) {
    console.error("========== [cashWithdraw Error Response] ==========", error?.response?.data || error?.message || error);
    throw error;
  }
};

const sendOtp = async (payload) => {
  try {
    const response = await postProviderForm(PROVIDER_ROUTES.aeps.sendOtp, payload);
    console.log("========== [sendOtp Success Response] ==========", response);
    return response;
  } catch (error) {
    console.error("========== [sendOtp Error Response] ==========", error?.response?.data || error?.message || error);
    throw error;
  }
};

const doBioEkyc = async (payload) => {
  console.log("========== [doBioEkyc Payload] ==========", payload);
  try {
    const response = await postProviderForm(PROVIDER_ROUTES.aeps.doBioEkyc, payload);
    console.log("========== [doBioEkyc Success Response] ==========", response);
    return response;
  } catch (error) {
    console.error("========== [doBioEkyc Error Response] ==========", error?.response?.data || error?.message || error);
    throw error;
  }
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

const getbankList = (payload) =>
  getProvider(PROVIDER_ROUTES.dmt.bankList, payload);
// UPI Cashpoint services
const initiateUpiCashpointPayment = (payload) =>
  postProviderForm(PROVIDER_ROUTES.upiCashpoint.intiatepayment, payload);


// CMS Payment services
 const merchantRegistration=(payload)=>postProviderForm(PROVIDER_ROUTES.upiCashpoint.merchantRegistration,payload)
  const merchantRegistrationSendOtp=(payload)=>postProviderForm(PROVIDER_ROUTES.upiCashpoint.sendOtp,payload)
   const merchantRegistrationVerifyOtp=(payload)=>postProviderForm(PROVIDER_ROUTES.upiCashpoint.verifyOtp,payload)
   const merchantRegistrationVerify=merchantRegistrationVerifyOtp
    const merchantEKYC = (payload) => postProviderForm(PROVIDER_ROUTES.upiCashpoint.Ekyc, payload);
    const merchantRegistrationEkyc = merchantEKYC;
     const merchantRegistrationOnboarding=(payload)=>postProviderForm(PROVIDER_ROUTES.upiCashpoint.sellerOnboarding,payload)

const initiateCmsPayment = (payload) =>
  postProviderForm(PROVIDER_ROUTES.cmsPayment.initiatePayment, payload);




  const payoutSettlement=(payload)=>postProviderForm(PROVIDER_ROUTES.payoutSettlement.settlement,payload)
  const checkSettlement_status=(payload)=>postProviderForm(PROVIDER_ROUTES.payoutSettlement.checkSettlement_status,payload)
  const payoutSettlementBankList=(payload)=>getProvider(PROVIDER_ROUTES.payoutSettlement.bankList)
export {
  verifyAadhar,
  verifyPan,
  verifyAccount,
  getBankList,
  doEkyc,
  outletRegister,
  outletRegisterVerify,
  balanceEnquiry,
  miniStatement,
  cashWithdraw,
  cashDeposite,
  sendOtp,
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
  getbankList,

  merchantRegistration,
  merchantRegistrationSendOtp,
  merchantRegistrationVerifyOtp,
  merchantRegistrationVerify,
  merchantRegistrationOnboarding,
  merchantRegistrationEkyc,
  merchantEKYC,
  initiateUpiCashpointPayment,




  initiateCmsPayment,

  payoutSettlement,
  payoutSettlementBankList,
  checkSettlement_status
};

export default onboardMerchant;
