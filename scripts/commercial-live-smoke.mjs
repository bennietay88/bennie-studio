import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";

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

const { data: fixtureProspect, error: fixtureProspectError } = await supabase
  .from("prospects")
  .select("id,name,contact_email,converted_business_id")
  .eq("id", prospectId)
  .maybeSingle();
if (fixtureProspectError || !fixtureProspect) {
  throw new Error("Commercial E2E prospect fixture is missing or inaccessible.");
}
if (!/e2e/i.test(String(fixtureProspect.name || ""))) {
  throw new Error("Commercial E2E refuses to mutate a prospect whose name is not explicitly marked E2E.");
}
if (String(fixtureProspect.contact_email || "").trim().toLowerCase() !== String(customerEmail).trim().toLowerCase()) {
  throw new Error("Commercial E2E fixture prospect email does not match the isolated test customer.");
}

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
    customerName: String(fixtureProspect.name || "Bennie Studio E2E Fixture"),
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


async function verifyRenderedWebsite(publicUrl) {
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 1440, height: 1000 },
  ];
  const results = [];

  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const pageErrors = [];
      const sameOriginFailures = [];
      const publicOrigin = new URL(publicUrl).origin;

      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("response", (response) => {
        try {
          const url = new URL(response.url());
          if (url.origin === publicOrigin && response.status() >= 400) {
            sameOriginFailures.push({ url: response.url(), status: response.status() });
          }
        } catch {
          // Ignore non-URL response records.
        }
      });

      const response = await page.goto(publicUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      if (!response || response.status() < 200 || response.status() >= 400) {
        throw new Error(`Rendered website failed at ${viewport.width}px with HTTP ${response?.status() || "none"}.`);
      }
      await page.waitForTimeout(750);

      const assertRenderedState = async (label) => {
        const state = await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
          const overflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
          const brokenImages = [...document.images]
            .filter((image) => image.getBoundingClientRect().width > 0 && image.getBoundingClientRect().height > 0)
            .filter((image) => image.complete && image.naturalWidth === 0)
            .map((image) => image.currentSrc || image.src || "(unknown)");
          const bodyText = document.body.innerText || "";
          const forms = [...document.querySelectorAll("form")].map((form) => ({
            inputs: form.querySelectorAll("input,textarea,select").length,
            submitters: form.querySelectorAll('button[type="submit"],input[type="submit"]').length,
          }));
          return {
            overflow,
            brokenImages,
            noContent: bodyText.includes("No Content Available"),
            forms,
          };
        });
        if (state.noContent) throw new Error(`${label}: renderer showed No Content Available.`);
        if (state.overflow > 1) throw new Error(`${label}: horizontal overflow is ${state.overflow}px.`);
        if (state.brokenImages.length) throw new Error(`${label}: ${state.brokenImages.length} visible image(s) failed to render.`);
        if (state.forms.some((form) => form.inputs > 0 && form.submitters === 0)) {
          throw new Error(`${label}: a form has fields but no submit control.`);
        }
      };

      await assertRenderedState(`${viewport.width}px home`);
      const pageNav = page.locator("[data-website-page-nav]");
      const navCount = await pageNav.count();
      for (let index = 0; index < navCount; index += 1) {
        const navItem = page.locator("[data-website-page-nav]").nth(index);
        const slug = (await navItem.getAttribute("data-website-page-nav")) || `page-${index + 1}`;
        await navItem.click();
        await page.waitForTimeout(250);
        await assertRenderedState(`${viewport.width}px ${slug}`);
      }

      if (pageErrors.length) {
        throw new Error(`Rendered website raised browser errors at ${viewport.width}px: ${pageErrors.join(" | ")}`);
      }
      if (sameOriginFailures.length) {
        throw new Error(`Rendered website returned same-origin HTTP failures at ${viewport.width}px: ${JSON.stringify(sameOriginFailures)}`);
      }

      results.push({ viewport, pagesChecked: Math.max(1, navCount), pageErrors: 0, sameOriginFailures: 0 });
      await context.close();
    }
  } finally {
    await browser.close();
  }

  return results;
}

const launchQa = await api(`/api/admin/businesses/${businessId}/launch-readiness`, adminToken);
if (launchQa.crawler?.truncated) throw new Error("Launch crawler did not verify every discovered resource.");
if (launchQa.crawler?.navigationIssues?.length) throw new Error("Launch crawler found invalid internal navigation.");
if (!launchQa.publicUrl) throw new Error("Launch QA did not return a public website URL.");
const renderedWebsite = await verifyRenderedWebsite(launchQa.publicUrl);

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
  renderedWebsite,
  approval: approval.approval?.status,
}, null, 2));
