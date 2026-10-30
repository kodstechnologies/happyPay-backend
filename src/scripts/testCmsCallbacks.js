import mongoose from "mongoose";
import env from "../config/env.js";
import User from "../modules/auth/model/user.model.js";
import Wallet from "../modules/wallet/model/wallet.model.js";
import Transaction from "../modules/transaction/model/transaction.model.js";
import { handleCmsCallbackService } from "../modules/CMS/services/cms.service.js";

async function runTests() {
  console.log("=== STARTING CMS CALLBACK END-TO-END TEST SUITE ===\n");
  await mongoose.connect(env.MONGO_URI);
  console.log("Connected to MongoDB:", mongoose.connection.name);

  // Setup a test retailer and wallet
  const testMobile = "9999888877";
  let testUser = await User.findOne({ mobile: testMobile });
  if (!testUser) {
    testUser = await User.create({
      mobile: testMobile,
      firstName: "CMS Test",
      lastName: "Retailer",
      registrationStatus: "COMPLETED",
      isMobileVerified: true,
      shop: { name: "Test CMS Store" },
    });
  }

  // Ensure test wallet has known balance
  let testWallet = await Wallet.findOne({ user: testUser._id });
  if (!testWallet) {
    testWallet = await Wallet.create({
      user: testUser._id,
      balance: 1000,
      holdBalance: 100, // Available balance = 900
      status: "active",
    });
  } else {
    testWallet.balance = 1000;
    testWallet.holdBalance = 100; // Available = 900
    testWallet.status = "active";
    await testWallet.save();
  }

  console.log(`Test User ID: ${testUser._id}, Mobile: ${testUser.mobile}`);
  console.log(`Wallet Balance: ${testWallet.balance}, Hold: ${testWallet.holdBalance}, Available: ${testWallet.balance - testWallet.holdBalance}\n`);

  let passed = 0;
  let failed = 0;

  async function assertCase(description, fn) {
    try {
      await fn();
      console.log(`✓ PASS: ${description}`);
      passed++;
    } catch (err) {
      console.error(`✗ FAIL: ${description}`);
      console.error(`  Details: ${err.message}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // NEGATIVE SCENARIOS
  // -------------------------------------------------------------------------

  // Scenario 1: Missing event
  await assertCase("Negative 1: Missing event parameter should return HTTP 400", async () => {
    const res = await handleCmsCallbackService({}, {});
    if (res.httpStatus !== 400 || res.response.status !== 400) {
      throw new Error(`Expected 400, got ${res.httpStatus} / ${res.response.status}`);
    }
  });

  // Scenario 2: Unknown event
  await assertCase("Negative 2: Unknown event should return HTTP 400", async () => {
    const res = await handleCmsCallbackService({ event: "FOO_BAR", mobile: testMobile }, {});
    if (res.httpStatus !== 400 || res.response.status !== 400) {
      throw new Error(`Expected 400, got ${res.httpStatus} / ${res.response.status}`);
    }
  });

  // Scenario 3: Missing mobile number
  await assertCase("Negative 3: Missing mobile number should return HTTP 400", async () => {
    const res = await handleCmsCallbackService({ event: "CMS_BALANCE_INQUIRY", amount: 100 }, {});
    if (res.httpStatus !== 400 || res.response.status !== 400) {
      throw new Error(`Expected 400, got ${res.httpStatus} / ${res.response.status}`);
    }
  });

  // Scenario 4: Non-existent mobile number
  await assertCase("Negative 4: Unregistered mobile number should return HTTP 400", async () => {
    const res = await handleCmsCallbackService({
      event: "CMS_BALANCE_INQUIRY",
      mobile_no: "0000000000",
      amount: 100,
    }, {});
    if (res.httpStatus !== 400 || res.response.status !== 400) {
      throw new Error(`Expected 400, got ${res.httpStatus} / ${res.response.status}`);
    }
  });

  // Scenario 5: Inquiry with zero or negative amount
  await assertCase("Negative 5: CMS_BALANCE_INQUIRY with zero/negative amount should return HTTP 400", async () => {
    const res = await handleCmsCallbackService({
      event: "CMS_BALANCE_INQUIRY",
      param: { mobile_no: testMobile, amount: 0 },
    }, {});
    if (res.httpStatus !== 400 || res.response.status !== 400) {
      throw new Error(`Expected 400, got ${res.httpStatus} / ${res.response.status}`);
    }
  });

  // Scenario 6: Inquiry with insufficient wallet balance (> 900 available)
  await assertCase("Negative 6: CMS_BALANCE_INQUIRY with insufficient balance (req: 1500, avail: 900) should return HTTP 400", async () => {
    const res = await handleCmsCallbackService({
      event: "CMS_BALANCE_INQUIRY",
      param: { mobile_no: testMobile, amount: 1500 },
    }, {});
    if (res.httpStatus !== 400 || res.response.status !== 400) {
      throw new Error(`Expected 400, got ${res.httpStatus} / ${res.response.status}`);
    }
  });

  // Scenario 7: Debit with zero or negative amount
  await assertCase("Negative 7: CMS_BALANCE_DEBIT with zero/negative amount should return HTTP 400", async () => {
    const res = await handleCmsCallbackService({
      event: "CMS_BALANCE_DEBIT",
      param: { mobile_no: testMobile, amount: -50, refid: "NEG_AMT_01" },
    }, {});
    if (res.httpStatus !== 400 || res.response.status !== 400) {
      throw new Error(`Expected 400, got ${res.httpStatus} / ${res.response.status}`);
    }
  });

  // Scenario 8: Debit with insufficient wallet balance (> 900 available)
  await assertCase("Negative 8: CMS_BALANCE_DEBIT with insufficient balance should return HTTP 400", async () => {
    const res = await handleCmsCallbackService({
      event: "CMS_BALANCE_DEBIT",
      param: { mobile_no: testMobile, amount: 2000, refid: "EXCEED_BAL_01" },
    }, {});
    if (res.httpStatus !== 400 || res.response.status !== 400) {
      throw new Error(`Expected 400, got ${res.httpStatus} / ${res.response.status}`);
    }
  });

  // -------------------------------------------------------------------------
  // POSITIVE & IDEMPOTENCY SCENARIOS
  // -------------------------------------------------------------------------

  // Scenario 9: Successful Inquiry when balance is sufficient (500 <= 900)
  await assertCase("Positive 9: CMS_BALANCE_INQUIRY with sufficient balance should return HTTP 200", async () => {
    const res = await handleCmsCallbackService({
      event: "CMS_BALANCE_INQUIRY",
      param: { mobile_no: testMobile, amount: 500, refid: "INQ_OK_01" },
    }, {});
    if (res.httpStatus !== 200 || res.response.status !== 200) {
      throw new Error(`Expected 200, got ${res.httpStatus} / ${res.response.status}`);
    }
    if (res.response.message !== "Transaction completed successfully") {
      throw new Error(`Unexpected message: ${res.response.message}`);
    }
  });

  // Scenario 10: Successful Debit when balance is sufficient
  const testRefId = `TEST_CMS_${Date.now()}`;
  await assertCase("Positive 10: CMS_BALANCE_DEBIT with sufficient balance should return HTTP 200 and debit wallet", async () => {
    const balBefore = (await Wallet.findOne({ user: testUser._id })).balance;
    const res = await handleCmsCallbackService({
      event: "CMS_BALANCE_DEBIT",
      param: {
        mobile_no: testMobile,
        amount: 200,
        refid: testRefId,
        biller_name: "Swiggy Cash Drop",
      },
    }, {});

    if (res.httpStatus !== 200 || res.response.status !== 200) {
      throw new Error(`Expected 200, got ${res.httpStatus} / ${res.response.status}`);
    }

    const balAfter = (await Wallet.findOne({ user: testUser._id })).balance;
    if (balBefore - balAfter !== 200) {
      throw new Error(`Expected balance reduction of 200, but before=${balBefore}, after=${balAfter}`);
    }

    // Verify transaction record was saved
    const txn = await Transaction.findOne({ transactionId: testRefId });
    if (!txn || txn.type !== "debit" || txn.service !== "CMS") {
      throw new Error("Transaction entry in MongoDB not found or incorrect");
    }
  });

  // Scenario 11: Idempotency Check (Duplicate Debit with exact same refid)
  await assertCase("Positive 11: Duplicate CMS_BALANCE_DEBIT with same refid must NOT double-debit (Idempotency)", async () => {
    const balBefore = (await Wallet.findOne({ user: testUser._id })).balance;
    const res = await handleCmsCallbackService({
      event: "CMS_BALANCE_DEBIT",
      param: {
        mobile_no: testMobile,
        amount: 200,
        refid: testRefId, // Exact same refid as Scenario 10
        biller_name: "Swiggy Cash Drop",
      },
    }, {});

    if (res.httpStatus !== 200 || res.response.status !== 200) {
      throw new Error(`Expected 200, got ${res.httpStatus} / ${res.response.status}`);
    }

    const balAfter = (await Wallet.findOne({ user: testUser._id })).balance;
    if (balBefore !== balAfter) {
      throw new Error(`Double debit occurred! Before: ${balBefore}, After: ${balAfter}`);
    }
  });

  // Scenario 12: Query parameters callback (GET request simulation)
  await assertCase("Positive 12: CMS_BALANCE_INQUIRY via Query Params should succeed", async () => {
    const res = await handleCmsCallbackService({}, {
      event: "CMS_BALANCE_INQUIRY",
      mobile_no: testMobile,
      amount: "100",
      refid: "QUERY_PARAM_TEST",
    });
    if (res.httpStatus !== 200 || res.response.status !== 200) {
      throw new Error(`Expected 200, got ${res.httpStatus} / ${res.response.status}`);
    }
  });

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  // Cleanup test user, wallet & transactions
  await Transaction.deleteMany({ transactionId: testRefId });
  await mongoose.disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(async (err) => {
  console.error("Test execution failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
