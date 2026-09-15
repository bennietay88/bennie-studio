/*
 * Safe Stripe test-mode harness.
 *
 * This script deliberately refuses live keys and production environments. It
 * creates only a test-mode Checkout Session for a supplied existing test Price
 * and prints the URL; completing it can be done with Stripe's documented test
 * card (4242 4242 4242 4242). No production customer, subscription, or charge
 * can be created by this script.
 *
 * Required environment variables:
 *   STRIPE_SECRET_KEY=sk_test_...
 *   STRIPE_TEST_PRICE_ID=price_...
 * Optional: STRIPE_TEST_SUCCESS_URL, STRIPE_TEST_CANCEL_URL
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY || "";
const priceId = process.env.STRIPE_TEST_PRICE_ID || "";
const nodeEnv = process.env.NODE_ENV || "development";

if (nodeEnv === "production") {
  throw new Error("Refusing to run in NODE_ENV=production. Use an isolated local/test environment.");
}
if (!key.startsWith("sk_test_")) {
  throw new Error("STRIPE_SECRET_KEY must be a Stripe test-mode key (sk_test_...).");
}
if (!/^price_[A-Za-z0-9]+$/.test(priceId)) {
  throw new Error("STRIPE_TEST_PRICE_ID must be an existing Stripe test Price ID.");
}

const stripe = new Stripe(key);
const session = await stripe.checkout.sessions.create({
  mode: "subscription",
  line_items: [{ price: priceId, quantity: 1 }],
  customer_email: "bennie-e2e@example.test",
  success_url:
    process.env.STRIPE_TEST_SUCCESS_URL ||
    "http://127.0.0.1:4173/checkout/success?session_id={CHECKOUT_SESSION_ID}",
  cancel_url: process.env.STRIPE_TEST_CANCEL_URL || "http://127.0.0.1:4173/pricing",
  metadata: { environment: "local-test", fixture: "controlled-checkout" },
});

console.log(JSON.stringify({
  id: session.id,
  url: session.url,
  mode: session.mode,
  testPaymentMethod: "4242 4242 4242 4242",
}, null, 2));
