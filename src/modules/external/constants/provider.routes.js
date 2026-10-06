const PROVIDER_API_PREFIX = "/api/public";

const PROVIDER_ROUTES = {
  demographic: {
    verifyAadhar: `${PROVIDER_API_PREFIX}/demographic/verifyAadhar`,
    verifyPan: `${PROVIDER_API_PREFIX}/demographic/verifyPan`,
    verifyAccount: `${PROVIDER_API_PREFIX}/demographic/AccVerify`,
  },
  aeps: {
    bankList: `${PROVIDER_API_PREFIX}/aeps5/bank5/banks`,
    doEkyc: `${PROVIDER_API_PREFIX}/aeps5/bank5/doekyc`,
    doBioEkyc: `${PROVIDER_API_PREFIX}/aeps5/bank5/dobioekyc`,
    verifyTfa: `${PROVIDER_API_PREFIX}/aeps5/bank5/verify_tfa`,
    loginStatus: `${PROVIDER_API_PREFIX}/aeps5/bank5/LoginStatus`,
    onboard: `${PROVIDER_API_PREFIX}/aeps5/bank5/onboard`,
  },
};

export default PROVIDER_ROUTES;
