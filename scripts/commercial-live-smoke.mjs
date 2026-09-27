import { createClient } from "@supabase/supabase-js";

const baseUrl = String(process.env.COMMERCIAL_E2E_BASE_URL || "").replace(/\/+$/, "");
const supabaseUrl = process.env.COMMERCIAL_E2E_SUPABASE_URL;
const supabaseAnonKey = process.env.COMMERCIAL_E2E_SUPABASE_ANON_KEY;
const adminEmail = process.env.COMMERCIAL_E2E_ADMIN_EMAIL;
const adminPassword = process.env.COMMERCIAL_E2E_ADMIN_PASSWORD;
const prospectId = process.env.COMMERCIAL_E2E_PROSPECT_ID;
const businessId = process.env.COMMERCIAL_E2E_BUSINESS_ID;
const customerEmail = process.env.COMMERCIAL_E2E_CUSTOMER_EMAIL;
const customerPassword = process.env.COMMERCIAL_E2E_CUSTOMER_PASSWORD;
const approvalId = process.env.COMMERCIAL_E2E_APPROVAL_ID;

const required = {
  COMMERCIAL_E2E_BASE_URL: baseUrl,
  COMMERCIAL_E2E_SUPABASE_URL: supabaseUrl,
  COMMERCIAL_E2E_SUPABASE_ANON_KEY: supabaseAnonKey,
  COMMERCIAL_E2E_ADMIN_EMAIL: adminEmail,
  COMMERCIAL_E2E_ADMIN_PASSWORD: adminPassword,
  COMMERCIAL_E2E_PROSPECT_ID: prospectId,
  COMMERCIAL_E2E_BUSINESS_ID: businessId,
  COMMERCIAL_E2E_CUSTOMER_EMAIL: customerEmail,
  COMMERCIAL_E2E_CUSTOMER_PASSWORD: customerPassword,
  COMMERCIAL_E2E_APPROVAL_ID: approvalId,
};
const missing = Object.entries(required).filter(([,value]) => !value).map(([key]) => key);
if (missing.length) throw new Error(`Missing commercial E2E env vars: ${missing.join(", ")}`);

const host = new URL(baseUrl).hostname.toLowerCase();
if (
  (host === "app.bennietay.com" || host.endsWith(".bennietay.com"))
  && process.env.ALLOW_PRODUCTION_COMMERCIAL_E2E !== "true"
) {
  throw new Error("Commercial live E2E refuses production by default. Use a preview/staging URL.");
}
if (!String(customerEmail).endsWith(".test") && !String(customerEmail).includes("+e2e@")) {
  throw new Error("Commercial live E2E requires an isolated test customer email.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`Login failed for ${email}`);
  return data.session.access_token;
}

async function api(path, token, init = {}) {
  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${init.method || "GET"} ${path} failed: ${response.status} ${payload.error || ""}`);
  return payload;
}

const adminToken = await signIn(adminEmail, adminPassword);
const pricingResponse = await fetch(new URL("/api/public/pricing?market=INTL", baseUrl));
if (!pricingResponse.ok) throw new Error(`Pricing lookup failed: ${pricingResponse.status}`);
const pricing = await pricingResponse.json();
const managed = (pricing.products || []).find((product) => product.slug === "managed-website");
if (!managed?.price) throw new Error("Managed Website pricing is unavailable for the fixture market.");

const conversion = await api(`/api/admin/prospects/${prospectId}/convert`, adminToken, {
  method: "POST",
  body: JSON.stringify({
    productSlug: "managed-website",
    market: "INTL",
    termMonths: Number(managed.price.minimumTermMonths || 3),
    setupFee: Number(managed.price.setupFee || 0),
    recurringFee: Number(managed.price.monthlyPrice || 0),
    customerName: "Bennie Studio E2E Fixture",
    contactName: "E2E Customer",
    contactEmail: customerEmail,
  }),
});
if (conversion.business?.id !== businessId) {
  throw new Error(`Fixture business mismatch: expected ${businessId}, got ${conversion.business?.id || "none"}`);
}

const invite = await api(`/api/admin/businesses/${businessId}/onboarding-invite`, adminToken, {
  method: "POST",
  body: JSON.stringify({ requestId: crypto.randomUUID() }),
});
if (!["invite_sent", "existing_user_notified"].includes(String(invite.customerAccess?.status || ""))) {
  throw new Error("Onboarding invitation did not reach a sent state.");
}

const launchQa = await api(`/api/admin/businesses/${businessId}/launch-readiness`, adminToken);
if (launchQa.crawler?.truncated) throw new Error("Launch crawler did not verify every discovered resource.");
if (launchQa.crawler?.navigationIssues?.length) throw new Error("Launch crawler found invalid internal navigation.");

await supabase.auth.signOut();
const customerToken = await signIn(customerEmail, customerPassword);
const approval = await api(`/api/customer/approvals/${approvalId}/respond`, customerToken, {
  method: "POST",
  body: JSON.stringify({ status: "approved", notes: "Automated preview/staging commercial E2E approval." }),
});
if (approval.approval?.status !== "approved") throw new Error("Customer approval did not persist.");

console.log(JSON.stringify({
  ok: true,
  conversion: conversion.business?.accountStatus,
  invite: invite.customerAccess?.status,
  launchReady: Boolean(launchQa.ready),
  launchBlockers: launchQa.blockers?.length || 0,
  crawlerResources: launchQa.crawler?.resourceCount || 0,
  approval: approval.approval?.status,
}, null, 2));
