/**
 * Settlement Payout Callback – Test Suite
 *
 * Run with: node --experimental-vm-modules node_modules/.bin/jest tests/payoutCallback.test.js
 * Or:        npx jest tests/payoutCallback.test.js --forceExit
 *
 * This file contains unit tests for the callback service.  It mocks Mongoose
 * models and logger so no database is needed.
 *
 * Also included below (Section B) are manual / integration test scenarios with
 * curl commands and expected outcomes.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SECTION A — Unit Tests (Jest)
// ─────────────────────────────────────────────────────────────────────────────

import { jest } from "@jest/globals";

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.unstable_mockModule("../../../src/modules/transaction/model/transaction.model.js", () => ({
  default: {
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    prototype: { save: jest.fn() },
  },
}));

jest.unstable_mockModule("../../../src/modules/wallet/model/wallet.model.js", () => ({
  default: {
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

jest.unstable_mockModule("../../../src/utils/logger.js", () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.unstable_mockModule("../../../src/config/env.js", () => ({
  default: { PAYOUT_WEBHOOK_SECRET: "test-secret-123" },
}));

jest.unstable_mockModule("mongoose", () => ({
  default: {
    startSession: jest.fn(() => ({
      withTransaction: jest.fn(async (fn) => fn()),
      endSession: jest.fn(),
    })),
    Types: { ObjectId: { isValid: jest.fn(() => true) } },
  },
}));

// ── Import after mocking ───────────────────────────────────────────────────

const { normaliseStatus, extractCallbackFields, verifyCallbackAuthenticity } =
  await import("../../../src/modules/webhooks/services/payoutCallback.service.js");

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("normaliseStatus()", () => {
  test.each([
    ["SUCCESS", "success"],
    ["SUCCESSFUL", "success"],
    ["COMPLETED", "success"],
    ["PENDING", "pending"],
    ["QUEUED", "pending"],
    ["PROCESSING", "pending"],
    ["INITIATED", "pending"],
    ["FAILED", "failed"],
    ["FAILURE", "failed"],
    ["REJECTED", "failed"],
    ["REVERSED", "failed"],
    ["FOOBAR", "unknown"],
    ["", "unknown"],
  ])("maps '%s' → '%s'", (input, expected) => {
    expect(normaliseStatus(input)).toBe(expected);
  });
});

describe("extractCallbackFields()", () => {
  test("returns error when txn_id is missing", () => {
    const result = extractCallbackFields({ status: "SUCCESS" });
    expect(result.error).toBeTruthy();
  });

  test("returns error when status is missing", () => {
    const result = extractCallbackFields({ txn_id: "TXN123" });
    expect(result.error).toBeTruthy();
  });

  test("extracts all fields correctly", () => {
    const result = extractCallbackFields({
      txn_id: "TXN8E43FBC1DDE3",
      status: "SUCCESS",
      amount: "1000",
      operator_id: "123456",
      utr: "BANKUTR123",
    });
    expect(result.error).toBeNull();
    expect(result.providerTxnId).toBe("TXN8E43FBC1DDE3");
    expect(result.rawStatus).toBe("SUCCESS");
    expect(result.utr).toBe("BANKUTR123");
    expect(result.operatorId).toBe("123456");
    expect(result.amount).toBe(1000);
  });

  test("accepts alternate field names", () => {
    const result = extractCallbackFields({
      transaction_id: "TXN999",
      txn_status: "FAILED",
      rrn: "RRN001",
    });
    expect(result.providerTxnId).toBe("TXN999");
    expect(result.rawStatus).toBe("FAILED");
    expect(result.utr).toBe("RRN001");
  });
});

describe("verifyCallbackAuthenticity()", () => {
  const makeReq = (headers = {}, body = {}) => ({ headers, body });

  test("passes when header secret matches", () => {
    const req = makeReq({ "x-webhook-secret": "test-secret-123" });
    expect(verifyCallbackAuthenticity(req).valid).toBe(true);
  });

  test("fails when header secret is wrong", () => {
    const req = makeReq({ "x-webhook-secret": "wrong-secret" });
    const result = verifyCallbackAuthenticity(req);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("invalid_secret");
  });

  test("fails when no secret is provided", () => {
    const req = makeReq();
    const result = verifyCallbackAuthenticity(req);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("missing_secret");
  });

  test("accepts secret in body", () => {
    const req = makeReq({}, { secret: "test-secret-123" });
    expect(verifyCallbackAuthenticity(req).valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECTION B — Manual / Integration Test Scenarios
// ─────────────────────────────────────────────────────────────────────────────
/*

SETUP:
  - Add PAYOUT_WEBHOOK_SECRET=happypay-webhook-secret-2024 to your .env
  - Start the backend server
  - Replace BASE_URL with your actual server URL

─────────────────────────────────────────────────────────────────────────────

SCENARIO 1 — Provider returns PENDING at initiation
Expected: HTTP 200, status=pending, holdBalance increased, NO wallet debit

curl -X POST http://localhost:7000/api/v1/wallet/settlement/payout \
  -H "Authorization: Bearer <RETAILER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "mpin": "1234",
    "benMobile": "9876543210",
    "beneficiary_name": "Test Beneficiary",
    "account_number": "1234567890",
    "ifsc": "SBIN0001234",
    "bank_name": "State Bank of India",
    "mode": "IMPS"
  }'

Expected response:
{
  "success": true,
  "data": {
    "txnid": "TXN...",
    "providerTxnId": "TXN8E43FBC1DDE3",
    "status": "pending",
    "amount": 1000,
    "message": "Transaction is queued for processing..."
  }
}

Verify:
  db.wallets.findOne({user: ObjectId("<userId>")})
  → holdBalance should be increased by netDebitAmount

─────────────────────────────────────────────────────────────────────────────

SCENARIO 2 — Provider returns SUCCESS immediately at initiation
Expected: HTTP 200, status=success, wallet immediately debited

(Same curl as above, with provider returning SUCCESS)
Verify: wallet balance decreased by netDebitAmount, holdBalance unchanged.

─────────────────────────────────────────────────────────────────────────────

SCENARIO 3 — Provider returns FAILED immediately at initiation
Expected: HTTP 400, no wallet changes

─────────────────────────────────────────────────────────────────────────────

SCENARIO 4 — Pending payout receives SUCCESS callback
Prerequisites: Scenario 1 completed, providerTxnId="TXN8E43FBC1DDE3"

curl -X POST http://localhost:7000/api/v1/webhooks/payout/callback \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: happypay-webhook-secret-2024" \
  -d '{
    "txn_id": "TXN8E43FBC1DDE3",
    "status": "SUCCESS",
    "amount": "1000",
    "operator_id": "123456789",
    "utr": "BANKUTR123456"
  }'

Expected response:
{
  "success": true,
  "ack": "ok",
  "status": "success",
  "message": "Payout settled successfully"
}

Verify:
  - wallet balance decreased by netDebitAmount
  - holdBalance decreased by netDebitAmount
  - transaction.status = "success"
  - transaction.utr = "BANKUTR123456"

─────────────────────────────────────────────────────────────────────────────

SCENARIO 5 — Pending payout receives FAILED callback

curl -X POST http://localhost:7000/api/v1/webhooks/payout/callback \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: happypay-webhook-secret-2024" \
  -d '{
    "txn_id": "TXN8E43FBC1DDE3",
    "status": "FAILED",
    "failure_reason": "Beneficiary account invalid"
  }'

Expected response:
{
  "success": true,
  "ack": "ok",
  "status": "failed"
}

Verify:
  - wallet balance UNCHANGED
  - holdBalance released (decreased by netDebitAmount)
  - transaction.status = "failed"
  - transaction.failureReason = "Beneficiary account invalid"

─────────────────────────────────────────────────────────────────────────────

SCENARIO 6 — Duplicate SUCCESS callback (idempotency)
(Send Scenario 4 callback again)

Expected response:
{
  "success": true,
  "ack": "duplicate",
  "message": "Callback already processed – transaction is in terminal state"
}

Verify: wallet balance and holdBalance are UNCHANGED from Scenario 4.

─────────────────────────────────────────────────────────────────────────────

SCENARIO 7 — Duplicate FAILED callback (idempotency)
(Send Scenario 5 callback again)

Expected: { "ack": "duplicate" }, no wallet changes.

─────────────────────────────────────────────────────────────────────────────

SCENARIO 8 — PENDING callback received after SUCCESS
(Send a PENDING callback for a transaction that is already SUCCESS)

Expected: { "ack": "duplicate" } — terminal state not overwritten.

─────────────────────────────────────────────────────────────────────────────

SCENARIO 9 — Unknown provider transaction ID

curl -X POST http://localhost:7000/api/v1/webhooks/payout/callback \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: happypay-webhook-secret-2024" \
  -d '{"txn_id": "TXN_DOES_NOT_EXIST", "status": "SUCCESS"}'

Expected:
{
  "success": true,
  "ack": "not_found",
  "message": "Transaction not found for provider ID"
}

─────────────────────────────────────────────────────────────────────────────

SCENARIO 10 — Invalid authentication

curl -X POST http://localhost:7000/api/v1/webhooks/payout/callback \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: wrong-secret" \
  -d '{"txn_id": "TXN8E43FBC1DDE3", "status": "SUCCESS"}'

Expected: HTTP 401 { "success": false, "ack": "unauthorized" }

─────────────────────────────────────────────────────────────────────────────

SCENARIO 11 — Two simultaneous SUCCESS callbacks
Run scenarios 4 twice simultaneously (e.g. in two terminal windows).

Expected:
  - Exactly one processes successfully (ack: "ok")
  - The other gets ack: "duplicate"
  - Wallet debited exactly ONCE
  - holdBalance released exactly ONCE

─────────────────────────────────────────────────────────────────────────────

SCENARIO 12 — Insufficient balance after hold
  - Retailer wallet balance: ₹500
  - Initiate payout of ₹1000

Expected: HTTP 400, "Insufficient wallet balance for settlement"
  holdBalance must NOT be changed.

─────────────────────────────────────────────────────────────────────────────

SCENARIO 13 — Provider timeout / uncertain outcome
If provider call throws a network error:
  - No transaction record should be created
  - No holdBalance change
  - HTTP 500 / error response to retailer

─────────────────────────────────────────────────────────────────────────────

SCENARIO 14 — Callback processing fails during wallet update
  - Simulate by temporarily making wallet.save() throw
  - Verify: transaction status remains "pending", holdBalance unchanged
  - On retry (send same callback again), processing should succeed

─────────────────────────────────────────────────────────────────────────────
*/

