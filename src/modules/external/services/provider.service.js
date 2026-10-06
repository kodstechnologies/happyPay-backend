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
  console.log("========== DO BIO EKYC PAYLOAD ==========");
  console.log("payload:", payload);
  console.log("=======================================");

   return postProviderForm(PROVIDER_ROUTES.aeps.doBioEkyc, payload)};

const verifyTfa = (payload) =>
  postProviderForm(PROVIDER_ROUTES.aeps.verifyTfa, payload);

const getLoginStatus = (payload) =>
  postProviderForm(PROVIDER_ROUTES.aeps.loginStatus, payload);

const verifyBiometric = doEkyc;

//for AEPS5
const onboardMerchant = (payload) =>
  postProviderForm(PROVIDER_ROUTES.aeps.onboard, payload);

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
};

export default onboardMerchant;
