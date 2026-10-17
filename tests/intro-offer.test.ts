import test from "node:test";
import assert from "node:assert/strict";
import {
  INTRO_OFFER_CODE,
  INTRO_OFFER_TERM_MONTHS,
  getIntroductoryQuote,
} from "../src/lib/introOffer.ts";
import { isNewIntroOfferCustomer } from "../api/introOfferEligibility.ts";

function mockSupabase(records: Record<string, Array<Record<string, unknown>>>, errors: Record<string, Error> = {}) {
  return {
    from(table: string) {
      const query: any = {
        select() { return query; },
        ilike() { return query; },
        not() { return query; },
        in() { return query; },
        limit() { return Promise.resolve({ data: records[table] || [], error: errors[table] || null }); },
      };
      return query;
    },
  };
}

function mockStripe(customers: Array<unknown> = []) {
  let requestedEmail = "";
  return {
    client: { customers: { list: async ({ email }: { email: string }) => { requestedEmail = email; return { data: customers }; } } },
    requestedEmail: () => requestedEmail,
  };
}

test("first-month-free offer offsets exactly one monthly charge and retains the setup fee", () => {
  const quote = getIntroductoryQuote(199, 1099, 3, true);
  assert.equal(quote.offerCode, INTRO_OFFER_CODE);
  assert.equal(quote.termMonths, INTRO_OFFER_TERM_MONTHS);
  assert.equal(quote.discount, 199);
  assert.equal(quote.firstMonthService, 0);
  assert.equal(quote.dueToday, 1099);
  assert.equal(quote.recurringFromMonth2, 199);
  assert.equal(quote.totalInitialTerm, 1099 + 199 * 11);
});

test("standard offer preserves price and term without a discount", () => {
  const quote = getIntroductoryQuote(99, 399, 3, false);
  assert.equal(quote.offerCode, null);
  assert.equal(quote.termMonths, 3);
  assert.equal(quote.discount, 0);
  assert.equal(quote.dueToday, 498);
  assert.equal(quote.totalInitialTerm, 399 + 99 * 3);
});

test("free month remains currency-independent and never discounts setup", () => {
  for (const [monthly, setup] of [[79, 249], [89, 299], [399, 2499], [349, 1199]]) {
    const quote = getIntroductoryQuote(monthly, setup, 3, true);
    assert.equal(quote.dueToday, setup);
    assert.equal(quote.totalInitialTerm, setup + monthly * 11);
  }
});

test("new-customer eligibility normalizes email and allows an identity with no payment history", async () => {
  const stripe = mockStripe();
  const allowed = await isNewIntroOfferCustomer("  Buyer@Example.Test ", stripe.client, mockSupabase({}));
  assert.equal(allowed, true);
  assert.equal(stripe.requestedEmail(), "buyer@example.test");
});

test("new-customer eligibility rejects prior Stripe customers and business subscriptions", async () => {
  const stripeCustomer = await isNewIntroOfferCustomer("buyer@example.test", mockStripe([{ id: "cus_existing" }]).client, mockSupabase({}));
  assert.equal(stripeCustomer, false);

  const subscription = await isNewIntroOfferCustomer("buyer@example.test", mockStripe().client, mockSupabase({
    profiles: [{ id: "user_existing", business_id: null }],
    user_subscriptions: [{ id: "sub_record", stripe_subscription_id: "sub_existing" }],
  }));
  assert.equal(subscription, false);

  const businessCustomer = await isNewIntroOfferCustomer("buyer@example.test", mockStripe().client, mockSupabase({
    profiles: [{ id: "user_existing", business_id: "business_existing" }],
    businesses: [{ id: "business_existing", stripe_customer_id: "cus_existing", stripe_subscription_id: null }],
  }));
  assert.equal(businessCustomer, false);
});

test("eligibility lookup failures fail closed and missing email is rejected", async () => {
  await assert.rejects(
    isNewIntroOfferCustomer("buyer@example.test", mockStripe().client, mockSupabase({}, { profiles: new Error("lookup failed") })),
    /lookup failed/,
  );
  await assert.rejects(isNewIntroOfferCustomer("", mockStripe().client, mockSupabase({})), /INTRO_OFFER_EMAIL_REQUIRED/);
});
