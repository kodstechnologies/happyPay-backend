const PROVIDER_API_PREFIX = "/api/public";

const PROVIDER_ROUTES = {
  onboarding:{
    onboard: `${PROVIDER_API_PREFIX}/aeps5/bank5/onboard`,
    doEkyc: `${PROVIDER_API_PREFIX}/aeps5/bank5/doekyc`,
    loginStatus: `${PROVIDER_API_PREFIX}/aeps5/bank5/LoginStatus`,
    verifyTfa: `${PROVIDER_API_PREFIX}/aeps5/bank5/verify_tfa`,
  },

  demographic: {
    verifyAadhar: `${PROVIDER_API_PREFIX}/demographic/verifyAadhar`,
    verifyPan: `${PROVIDER_API_PREFIX}/demographic/verifyPan`,
    verifyAccount: `${PROVIDER_API_PREFIX}/demographic/AccVerify`,
  },
  aeps: {
    bankList: `${PROVIDER_API_PREFIX}/aeps5/bank5/banks`,
    doEkyc: `${PROVIDER_API_PREFIX}/aeps5/bank5/doekyc`,
    onboard: `${PROVIDER_API_PREFIX}/aeps5/bank5/onboard`,
    loginStatus: `${PROVIDER_API_PREFIX}/aeps5/bank5/LoginStatus`,
    verifyTfa: `${PROVIDER_API_PREFIX}/aeps5/bank5/verify_tfa`,

    balanceEnquiry:`${PROVIDER_API_PREFIX}/aeps5/bank5/be`,
    miniStatement: `${PROVIDER_API_PREFIX}/aeps5/bank5/ms`,
    cashWithdraw: `${PROVIDER_API_PREFIX}/aeps5/bank5/cw`,
    deposite: `${PROVIDER_API_PREFIX}/csd/v3/cashdeposit`,
  },
  bbps: {
    billerCat: `${PROVIDER_API_PREFIX}/_bbps/billers-cat`,
    billers: `${PROVIDER_API_PREFIX}/_bbps/billers`,
    viewBill: `${PROVIDER_API_PREFIX}/_bbps/viewbill`,
    payBill: `${PROVIDER_API_PREFIX}/_bbps/paybill`,
    fetchByCatId: `${PROVIDER_API_PREFIX}/_bbps/billers_by_catid`,
    fetchByCat: `${PROVIDER_API_PREFIX}/_bbps/billers_by_cat`,
  },
  dmt:{
    addBen: `${PROVIDER_API_PREFIX}/rdmt/add-bene`,
    verifyBen: `${PROVIDER_API_PREFIX}/rdmt/verify-bene`,
    getBenificiaries: `${PROVIDER_API_PREFIX}/rdmt/fetch-bene`,
    deleteBen: `${PROVIDER_API_PREFIX}/rdmt/delete-bene`,
    deleteBenVerifyotp: `${PROVIDER_API_PREFIX}/rdmt/delete-bene-verify`,

    generateTransactionOtp: `${PROVIDER_API_PREFIX}/rdmt/pre-transaction`,
    doTransaction: `${PROVIDER_API_PREFIX}/rdmt/do-transaction`,
    transactionStatus: `${PROVIDER_API_PREFIX}/rdmt/status-check`,
    
  },

  upiCashpoint:{
    intiatepayment: `${PROVIDER_API_PREFIX}/upi/cashpoint`,
  },

  cmsPayment:{
    initiatePayment: `${PROVIDER_API_PREFIX}/cms/docms`,
  }


};

export default PROVIDER_ROUTES;
