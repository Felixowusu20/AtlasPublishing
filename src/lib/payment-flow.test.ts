import assert from "node:assert/strict";
import { test } from "node:test";
import { parseApcAmountCents } from "@/lib/apc";
import { formatCustomerUsd } from "@/lib/format-usd";
import { apcPaymentEmailHtml, apcReceiptEmailHtml } from "@/lib/mail";
import {
  customerPayloadHasInternalLeak,
  usdToGhsRate,
} from "@/lib/payment-currency";
import { cardholderChargeMessage, otpVerificationFailedMessage } from "@/lib/payment-display";
import {
  customerCheckoutRequestSchema,
  livePendingApcCents,
  toAdminPayment,
  toCustomerPayment,
} from "@/lib/payment-dto";
import {
  internalChargeMatches,
  isApcAlreadyCleared,
} from "@/lib/payment-verify";
import { gatewayCurrencyAttempts, usdToPaystackAmount } from "@/lib/paystack";
import {
  isPaystackChargePaid,
  mapPaystackAuthStatus,
} from "@/lib/paystack-charge-status";

test("$50 USD product displays as \"$50 USD\"", () => {
  assert.equal(formatCustomerUsd(5000), "$50 USD");
  assert.equal(formatCustomerUsd(2500), "$25 USD");
  assert.equal(formatCustomerUsd(125000), "$1,250 USD");
});

test("customer API response contains USD only", () => {
  const customer = toCustomerPayment({
    id: "pay_1",
    amountCents: 5000,
    status: "PENDING",
    internalAmount: 77500,
    internalCurrency: "GHS",
    exchangeRate: 15.5,
    paystackReference: "nahda_ref",
  });
  assert.ok(customer);
  assert.equal(customer.currency, "USD");
  assert.equal(customer.amount, 50);
  assert.equal(customer.amountLabel, "$50 USD");
  assert.equal(customer.status, "PENDING");
});

test("customer API response does not contain GHS", () => {
  const customer = toCustomerPayment({
    id: "pay_1",
    amountCents: 5000,
    status: "PENDING",
    internalAmount: 77500,
    internalCurrency: "GHS",
    exchangeRate: 15.5,
  });
  assert.equal(customerPayloadHasInternalLeak(customer), false);
  assert.equal("internalAmount" in (customer ?? {}), false);
  assert.equal("internalCurrency" in (customer ?? {}), false);
});

test("customer API response does not contain exchange rate", () => {
  const customer = toCustomerPayment({
    id: "pay_1",
    amountCents: 5000,
    status: "PENDING",
    exchangeRate: 15.5,
  });
  assert.ok(customer);
  assert.equal("exchangeRate" in customer, false);
  assert.equal(customerPayloadHasInternalLeak(customer), false);
});

test("pending APC follows the current journal fee", () => {
  const live = livePendingApcCents(
    { apc: "$75", openAccess: true },
    { id: "p", amountCents: 5000, status: "PENDING" },
    "PENDING",
  );
  assert.equal(live, 7500);
  const paid = livePendingApcCents(
    { apc: "$75", openAccess: true },
    { id: "p", amountCents: 5000, status: "PAID" },
    "PAID",
  );
  assert.equal(paid, 5000);
});

test("frontend cannot manipulate the internal Paystack amount", () => {
  const parsed = customerCheckoutRequestSchema.parse({
    submissionId: "sub_trusted",
    amount: 1,
    currency: "GHS",
    exchangeRate: 1,
  });
  assert.deepEqual(parsed, { submissionId: "sub_trusted" });
  assert.equal(parseApcAmountCents("$50"), 5000);
  assert.equal(parseApcAmountCents("N/A"), 0);
  assert.equal(parseApcAmountCents("Free"), 0);
});

test("NOT_REQUIRED manuscripts pick up a journal fee", () => {
  const live = livePendingApcCents(
    { apc: "$50", openAccess: true },
    { id: "p", amountCents: 0, status: "NOT_REQUIRED" },
    "NOT_REQUIRED",
  );
  assert.equal(live, 5000);
});

test("backend calculates the internal GHS amount", () => {
  process.env.USD_TO_GHS_RATE = "15.5";
  assert.equal(usdToGhsRate(), 15.5);
  assert.equal(usdToPaystackAmount(5000, "GHS"), 77500);
});

test("Paystack receives the correct internal amount", () => {
  process.env.USD_TO_GHS_RATE = "15.5";
  const usdCents = parseApcAmountCents("$50");
  const internal = usdToPaystackAmount(usdCents, "GHS");
  assert.equal(usdCents, 5000);
  assert.equal(internal, 77500);
  assert.ok(
    internalChargeMatches({
      verifiedAmount: internal,
      verifiedCurrency: "GHS",
      usdCents,
      storedInternalAmount: internal,
      storedInternalCurrency: "GHS",
    }),
  );
});

test("GHS merchants are charged in GHS only", () => {
  process.env.USD_TO_GHS_RATE = "15.5";
  const attempts = gatewayCurrencyAttempts(5000, ["GHS"]);
  assert.deepEqual(attempts, [{ currency: "GHS", amount: 77500 }]);
});

test("successful Paystack payment matches stored internals", () => {
  assert.equal(
    internalChargeMatches({
      verifiedAmount: 77500,
      verifiedCurrency: "GHS",
      usdCents: 5000,
      storedInternalAmount: 77500,
      storedInternalCurrency: "GHS",
    }),
    true,
  );
  assert.equal(isApcAlreadyCleared("PENDING"), false);
});

test("failed payment does not match a successful charge", () => {
  assert.equal(
    internalChargeMatches({
      verifiedAmount: 100,
      verifiedCurrency: "GHS",
      usdCents: 5000,
      storedInternalAmount: 77500,
      storedInternalCurrency: "GHS",
    }),
    false,
  );
  assert.equal(isApcAlreadyCleared("PENDING"), false);
});

test("duplicate webhook does not duplicate payment", () => {
  assert.equal(isApcAlreadyCleared("PAID"), true);
  assert.equal(isApcAlreadyCleared("WAIVED"), true);
  assert.equal(isApcAlreadyCleared("NOT_REQUIRED"), true);
});

test("customer success copy shows \"$50 USD\"", () => {
  const html = apcReceiptEmailHtml({
    authorName: "Ada",
    title: "A study",
    manuscriptId: "N-1",
    journalTitle: "Nahda Journal",
    amountLabel: formatCustomerUsd(5000),
    paidAtLabel: "Aug 20, 2026",
    receiptNumber: "NPR-1",
    submissionUrl: "https://example.com/submissions/1",
  });
  assert.match(html, /\$50 USD/);
  assert.doesNotMatch(html, /\bGHS\b/);
  assert.doesNotMatch(html, /exchange rate/i);
});

test("customer payment message shows \"$50 USD\"", () => {
  const html = apcPaymentEmailHtml({
    authorName: "Ada",
    title: "A study",
    manuscriptId: "N-1",
    journalTitle: "Nahda Journal",
    amountLabel: formatCustomerUsd(5000),
    checkoutUrl: "https://example.com/pay/pay_1",
  });
  assert.match(html, /Payment request/i);
  assert.match(html, /\$50 USD/);
  assert.match(html, /Pay \$50 USD/);
  assert.match(html, /https:\/\/example.com\/pay\/pay_1/);
  assert.doesNotMatch(html, /opens Nahda checkout/i);
  assert.doesNotMatch(html, /not your manuscript file/i);
  assert.doesNotMatch(html, /\/submissions\//);
  assert.doesNotMatch(html, /Open manuscript/i);
  assert.doesNotMatch(html, /\bGHS\b/);
  assert.doesNotMatch(html, /₵/);
  assert.doesNotMatch(html, /Cedis/i);
});

test("admin can still see the internal GHS transaction information", () => {
  const admin = toAdminPayment({
    id: "pay_1",
    amountCents: 5000,
    status: "PAID",
    internalAmount: 77500,
    internalCurrency: "GHS",
    exchangeRate: 15.5,
    paystackReference: "nahda_ref",
  });
  assert.ok(admin);
  assert.equal(admin.amountLabel, "$50 USD");
  assert.equal(admin.internalAmount, 77500);
  assert.equal(admin.internalCurrency, "GHS");
  assert.equal(admin.internalAmountLabel, "GHS 775.00");
  assert.equal(admin.exchangeRate, 15.5);
  assert.equal(admin.paystackReference, "nahda_ref");
});

test("abandoned authorization is not shown as a customer error", () => {
  const msg = cardholderChargeMessage({
    message: "Authorization was abandoned. Please try again.",
    amountLabel: "$50 USD",
  });
  assert.equal(msg, null);
});

test("bank OTP is not invented from an abandoned charge", () => {
  assert.equal(isPaystackChargePaid({ status: "success" }), true);
  assert.deepEqual(mapPaystackAuthStatus({ status: "send_otp" }, "start"), {
    status: "send_otp",
    paid: false,
  });
  assert.deepEqual(mapPaystackAuthStatus({ status: "abandoned" }, "start"), {
    status: "abandoned",
    paid: false,
  });
  assert.deepEqual(
    mapPaystackAuthStatus({ status: "success", paid_at: "2026-08-20" }, "auth"),
    { status: "success", paid: true },
  );
});

test("bank 3DS uses Nahda OTP fields instead of a bank page", () => {
  assert.deepEqual(
    mapPaystackAuthStatus(
      { status: "open_url", url: "https://acs.example" },
      "start",
    ),
    { status: "send_otp", paid: false },
  );
  assert.deepEqual(
    mapPaystackAuthStatus(
      { status: "abandoned", url: "https://acs.example" },
      "start",
    ),
    { status: "send_otp", paid: false },
  );
});

test("other Paystack errors are shown to the customer", () => {
  const msg = cardholderChargeMessage({
    message: "Do not honor",
    amountLabel: "$50 USD",
  });
  assert.equal(msg, "Do not honor");
});

test("OTP verification shows the actual bank error", () => {
  assert.equal(
    otpVerificationFailedMessage("Insufficient funds"),
    "Insufficient funds",
  );
  assert.equal(
    otpVerificationFailedMessage("Authorization was abandoned. Please try again."),
    "Enter the OTP sent to your account.",
  );
  assert.equal(
    otpVerificationFailedMessage("Invalid OTP"),
    "Invalid OTP",
  );
  assert.equal(
    otpVerificationFailedMessage(null),
    "Enter the OTP sent to your account.",
  );
});

test("GHS remains available internally for Paystack processing", () => {
  process.env.USD_TO_GHS_RATE = "15.5";
  const record = {
    id: "pay_1",
    amountCents: 5000,
    status: "PENDING" as const,
    internalAmount: usdToPaystackAmount(5000, "GHS"),
    internalCurrency: "GHS",
    exchangeRate: usdToGhsRate(),
  };
  const admin = toAdminPayment(record);
  const customer = toCustomerPayment(record);
  assert.equal(record.internalAmount, 77500);
  assert.equal(admin?.internalCurrency, "GHS");
  assert.equal(customerPayloadHasInternalLeak(customer), false);
  assert.equal(customerPayloadHasInternalLeak(admin), true);
});
