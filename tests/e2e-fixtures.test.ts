import test from "node:test";
import assert from "node:assert/strict";
import { testPersonas, testStripe } from "../e2e/fixtures/personas.ts";

test("local test personas and Stripe fixtures are isolated", () => {
  assert.equal(testPersonas.businessAdmin.email.endsWith(".test"), true);
  assert.equal(testPersonas.client.role, "client");
  assert.equal(testStripe.secretKey.startsWith("sk_test_"), true);
  assert.equal(testStripe.paymentMethod, "pm_card_visa");
  assert.equal(testStripe.cardNumber, "4242 4242 4242 4242");
});
