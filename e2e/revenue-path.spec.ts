import { expect, Page, Route, test } from "@playwright/test";
import { COMMERCIAL_FALLBACK_PRODUCTS, getCommercialPrice } from "../src/lib/commercialPricing";

const userId = "00000000-0000-4000-8000-000000000001";
const businessId = "00000000-0000-4000-8000-000000000101";
const websiteId = "00000000-0000-4000-8000-000000000201";
const accessToken = "e2e-access-token";
const appOrigin = `http://127.0.0.1:${process.env.E2E_PORT || 4173}`;

const corsHeaders = {
  "access-control-allow-origin": appOrigin,
  "access-control-allow-credentials": "true",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "content-range",
};

const e2eUser = {
  id: userId,
  aud: "authenticated",
  role: "authenticated",
  email: "owner@example.test",
  user_metadata: { initial_role: "business_admin" },
  app_metadata: {},
  created_at: new Date().toISOString(),
};

const e2eSession = {
  access_token: accessToken,
  refresh_token: "e2e-refresh-token",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: e2eUser,
};

const e2eAuthSessionResponse = {
  ...e2eSession,
  user: e2eUser,
};

const e2eProfile = {
  id: userId,
  email: e2eUser.email,
  role: "business_admin",
  business_id: businessId,
  onboarding_completed: true,
  status: "active",
  staff_permissions: [],
  created_at: new Date().toISOString(),
};

const e2eBusiness = {
  id: businessId,
  owner_id: userId,
  name: "Bennie Test Studio",
  slug: "bennie-test-studio",
  subdomain: "bennietest",
  plan: "business",
  subscription_status: "active",
  status: "active",
  settings: {},
  contact_email: "owner@example.test",
  created_at: new Date().toISOString(),
};

const plans = [
  {
    id: "plan_business",
    slug: "business",
    name: "Managed Website",
    price_usd: 99,
    description: "Managed lead-generation website",
    monthly_credit_limit: 100,
    project_limit: 1,
    location_page_limit: 0,
    monthly_update_allowance: "Monthly update support",
    features: ["1-page lead website", "Contact form", "WhatsApp CTA"],
    enabled_features: ["ai_synthesis"],
    is_active: true,
    is_popular: false,
    sort_order: 1,
    stripe_price_id: "price_business_e2e",
    stripe_product_id: "prod_business_e2e",
  },
  {
    id: "plan_growth",
    slug: "growth",
    name: "Website Growth",
    price_usd: 249,
    description: "Managed website with ongoing conversion and SEO growth",
    monthly_credit_limit: 500,
    project_limit: 5,
    location_page_limit: 4,
    monthly_update_allowance: "6 monthly updates",
    features: ["Up to 5 pages", "Review-powered trust", "WhatsApp/quote flow"],
    enabled_features: ["ai_synthesis", "local_seo"],
    is_active: true,
    is_popular: true,
    sort_order: 2,
    stripe_price_id: "price_growth_e2e",
    stripe_product_id: "prod_growth_e2e",
  },
];

const templates = [
  {
    id: "template_service_business",
    name: "Service Business",
    category: "Professional Services",
    description: "Lead-generation website blueprint for local service teams.",
    thumbnail:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 140'%3E%3Crect width='200' height='140' fill='%234f46e5'/%3E%3Ctext x='24' y='78' fill='white' font-size='20'%3EService%3C/text%3E%3C/svg%3E",
    config: {
      theme: { primary: "#4f46e5" },
      seo: {
        title: "Service Business",
        description: "Managed lead-generation website.",
        keywords: ["service"],
      },
      pages: [
        {
          id: "home",
          slug: "",
          title: "Home",
          sections: [
            {
              id: "hero",
              type: "hero",
              isVisible: true,
              content: {
                headline: "Bennie Test Studio",
                subheadline: "Managed service website",
                buttonText: "Get Quote",
              },
            },
            {
              id: "services",
              type: "services",
              isVisible: true,
              content: { title: "Services", items: [] },
            },
            {
              id: "trust",
              type: "testimonials",
              isVisible: true,
              content: { title: "Customer Proof", items: [] },
            },
            {
              id: "contact",
              type: "contact",
              isVisible: true,
              content: { title: "Contact", buttonText: "WhatsApp Us" },
            },
          ],
        },
      ],
    },
  },
];

const json = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({
    status,
    contentType: "application/json",
    headers: corsHeaders,
    body: JSON.stringify(body),
  });
};

const emptyResultFor = (method: string) => {
  if (method === "GET") return [];
  return {};
};

async function mockSupabaseAndStripe(page: Page) {
  const calls = {
    checkoutCreated: false,
    checkoutVerified: false,
    websiteUpserted: false,
    onboardingCompleted: false,
  };

  await page.route("https://ipapi.co/json/", (route) =>
    json(route, { country_code: "MY", country_name: "Malaysia" }),
  );

  await page.route("**/api/create-checkout-session", async (route) => {
    calls.checkoutCreated = true;
    const payload = await route.request().postDataJSON();
    expect(payload.businessId).toBe(businessId);
    expect(payload.priceId).toBe("price_growth_e2e");
    await json(route, {
      id: "cs_e2e_growth",
      url: "/checkout/success?session_id=cs_e2e_growth",
    });
  });

  await page.route("**/api/checkout-session/status?**", async (route) => {
    calls.checkoutVerified = true;
    await json(route, {
      success: true,
      status: "complete",
      paymentStatus: "paid",
      planId: "growth",
      billingCycle: "monthly",
    });
  });

  await page.route("**/api/onboarding/complete", async (route) => {
    calls.onboardingCompleted = true;
    const payload = await route.request().postDataJSON();
    expect(payload.businessId).toBe(businessId);
    expect(payload.planId).toBe("growth");
    await json(route, { success: true });
  });

  await page.route("**/api/platform-events", (route) => json(route, { success: true }));
  await page.route("**/api/public/pricing**", (route) => {
    const market = new URL(route.request().url()).searchParams.get("market") || "MY";
    return json(route, {
      products: COMMERCIAL_FALLBACK_PRODUCTS.map((product) => ({
        ...product,
        price: {
          ...getCommercialPrice(product, market as "MY" | "SG" | "GB" | "INTL"),
          monthlyConfigured: product.salesMotion === "self_serve",
          recurringConfigured: product.salesMotion === "self_serve",
          recurringConfigStatus: product.salesMotion === "self_serve" ? "live" : "draft",
        },
      })),
    });
  });

  const handleSupabaseRequest = async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    if (url.pathname.includes("/auth/v1/signup")) {
      await json(route, e2eAuthSessionResponse);
      return;
    }
    if (url.pathname.includes("/auth/v1/token")) {
      await json(route, e2eAuthSessionResponse);
      return;
    }
    if (url.pathname.includes("/auth/v1/user")) {
      await json(route, { user: e2eUser });
      return;
    }

    const table = url.pathname.split("/").filter(Boolean).at(-1);

    if (table === "plans") {
      await json(route, plans);
      return;
    }
    if (table === "templates") {
      await json(route, templates);
      return;
    }
    if (table === "profiles") {
      if (method === "PATCH") {
        await json(route, { ...e2eProfile, onboarding_completed: true });
      } else {
        await json(route, e2eProfile);
      }
      return;
    }
    if (table === "businesses") {
      if (method === "PATCH" || method === "POST") {
        await json(route, e2eBusiness);
      } else {
        await json(route, e2eBusiness);
      }
      return;
    }
    if (table === "websites") {
      if (method === "POST" || method === "PATCH") {
        calls.websiteUpserted = true;
        await json(route, {
          id: websiteId,
          business_id: businessId,
          status: "draft",
          published: false,
        });
      } else {
        await json(route, null);
      }
      return;
    }
    if (table === "settings") {
      if (url.search.includes("id=eq.platform")) {
        await json(route, { id: "platform", content: { defaultTrialDays: 14 } });
      } else {
        await json(route, { id: "plans", content: { pricing: plans } });
      }
      return;
    }

    await json(route, emptyResultFor(method));
  };

  await page.route("**/auth/v1/**", handleSupabaseRequest);
  await page.route("**/rest/v1/**", handleSupabaseRequest);

  return calls;
}

async function mockAnonymousPublicDependencies(page: Page) {
  await page.route("https://ipapi.co/json/", (route) => json(route, { country_code: "US", country_name: "United States" }));
  await page.route("**/auth/v1/**", (route) => json(route, { user: null, session: null }));
  await page.route("**/rest/v1/**", (route) => json(route, []));
  await page.route("**/api/platform-events", (route) => json(route, { success: true }));
  await page.route("**/api/public/pricing**", (route) => {
    const market = new URL(route.request().url()).searchParams.get("market") || "INTL";
    return json(route, {
      products: COMMERCIAL_FALLBACK_PRODUCTS.map((product) => ({
        ...product,
        price: {
          ...getCommercialPrice(product, market as "MY" | "SG" | "GB" | "INTL"),
          monthlyConfigured: product.salesMotion === "self_serve",
          recurringConfigured: product.salesMotion === "self_serve",
          recurringConfigStatus: product.salesMotion === "self_serve" ? "live" : "draft",
        },
      })),
    });
  });
}

test("covers signup and a usable billing handoff", async ({ page }) => {
  const calls = await mockSupabaseAndStripe(page);

  await page.goto("/signup?redirectTo=%2Fdashboard%2Fbilling");
  await expect(page.getByTestId("signup-form")).toBeVisible();
  await page.getByTestId("auth-email").fill("owner@example.test");
  await page.getByTestId("auth-password").fill("Password123!");
  await page.getByTestId("auth-terms").check();
  await page.getByTestId("auth-submit").click();

  await page.waitForURL("**/dashboard/billing");
  await expect(page.getByRole("heading", { name: "Available Plans" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Website Growth", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Choose plan|Discuss plan/ }).nth(1)).toBeVisible();
});

test("connects the website growth review to a prefilled preview", async ({ page }) => {
  const leadId = "00000000-0000-4000-8000-000000000301";
  const jobId = "00000000-0000-4000-8000-000000000302";
  const report = {
    schemaVersion: 2,
    analyzedUrl: "https://example.test",
    analyzedAt: new Date().toISOString(),
    summary: "We found 1 opportunity to make it easier for visitors to become enquiries.",
    findings: [{
      id: "cta",
      category: "Enquiry journey",
      title: "The next enquiry action is not obvious",
      whatWeFound: "No clear service-specific contact action was found.",
      whyItMatters: "Visitors may need to work harder to take the next step.",
      recommendation: "Add one clear quotation CTA near the hero.",
      exampleImprovement: "Request a Website Quote",
      priority: "high",
      observation: "confirmed",
    }],
    enquiryJourney: {
      current: ["Search", "Homepage", "Generic contact page"],
      recommended: ["Relevant search", "Service page", "Trust proof", "Quotation CTA"],
    },
    whatWeWouldChange: [{ area: "CTA", current: "Contact Us", recommended: "Request a Website Quote" }],
    recommendedWebsiteDirection: {
      hero: { headline: "Managed websites for Malaysian service businesses", subheadline: "A clearer website and enquiry journey.", cta: "Request a Website Quote" },
      services: ["Managed website service"],
      trust: ["Customer case studies"],
      localRelevance: ["Malaysia service coverage"],
      faq: ["What is included?"],
      cta: { label: "Request a Website Quote", supportingCopy: "Tell us what you need." },
    },
    recommendedPlan: "business",
    performance: { responseTimeMs: 200, htmlBytes: 12000, imageCount: 4, scriptCount: 2 },
  };

  await page.route("**/api/platform-events", (route) => json(route, { success: true }));
  await page.route("**/api/platform-leads", (route) => json(route, { success: true, leadId }));
  await page.route("**/api/public/website-audit/jobs/**", (route) => json(route, { id: jobId, status: "completed", report }));
  await page.route("**/api/public/website-audit", (route) => json(route, { success: true, queued: true, jobId, status: "queued" }, 202));

  await page.goto("/website-audit");
  await page.getByLabel("Website URL").fill("https://example.test");
  await page.getByLabel("Business name").fill("Example Studio");
  await page.getByLabel("Email").fill("owner@example.test");
  await page.getByRole("button", { name: /Get my free website review/i }).click();

  await expect(page.getByRole("heading", { name: report.summary })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("What we found", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("The next enquiry action is not obvious")).toBeVisible();
  await expect(page.getByText(/\/100/)).toHaveCount(0);

  await page.getByRole("link", { name: "See a website direction" }).click();
  await expect(page).toHaveURL(/\/generate-preview/);
  await page.getByRole("button", { name: /I already have a website/i }).click();
  await expect(page.getByText("Example Studio", { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel("Current website URL")).toHaveValue("https://example.test");
});

test("records a Growth Partner consultation through the public booking flow", async ({ page }) => {
  await page.route("https://ipapi.co/json/", (route) => json(route, { country_code: "SG", country_name: "Singapore" }));
  await page.route("**/api/platform-events", (route) => json(route, { success: true }));
  await page.route("**/api/public/call-availability", (route) => json(route, { slots: [new Date(Date.now() + 86_400_000).toISOString()], timezone: "Asia/Kuala_Lumpur" }));
  await page.route("**/api/public/call-bookings", (route) => json(route, { booking: { id: "00000000-0000-4000-8000-000000000402" }, manageUrl: "/manage-call/test" }, 201));
  await page.route("**/api/platform-leads", async (route) => {
    const payload = await route.request().postDataJSON();
    expect(payload.leadType).toBe("growth_partner_consultation");
    expect(payload.country).toBe("INTL");
    await json(route, { success: true, leadId: "00000000-0000-4000-8000-000000000401" });
  });

  await page.goto("/book-demo?product=growth-partner&market=INTL");
  await expect(page).toHaveURL(/\/book-demo/);
  await page.getByLabel("Your name").fill("Jane Buyer");
  await page.getByLabel("Email", { exact: true }).fill("jane@example.test");
  await page.getByRole("textbox", { name: "Business" }).fill("Example Services");
  await page.getByText("Optional: add website details or choose a call time").click();
  await page.getByLabel("Industry (optional)").fill("Professional services");
  await page.getByLabel(/Available 30-minute times/i).selectOption({ index: 1 });
  await page.getByRole("button", { name: /Confirm Growth Consultation/i }).click();
  await expect(page.getByRole("heading", { name: "Call confirmed" })).toBeVisible();
});

test("homepage presents a free preview and the current four-plan catalogue", async ({ page }) => {
  await mockAnonymousPublicDependencies(page);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Websites that help service businesses get more enquiries/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Get your free website preview/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /See case studies/i })).toBeVisible();
  const plans = page.locator("#plans");
  await expect(plans).toBeVisible();
  await expect(plans.getByRole("heading", { name: "Personal Profile", exact: true })).toBeVisible();
  await expect(plans.getByRole("heading", { name: "Managed Website", exact: true })).toBeVisible();
  await expect(plans.getByRole("heading", { name: "Website Growth", exact: true })).toBeVisible();
  await expect(plans.getByRole("heading", { name: "Growth Partner", exact: true })).toBeVisible();
  await expect(plans.locator("article").filter({ hasText: "Personal Profile" })).toContainText("$29");
  await expect(plans.locator("article").filter({ hasText: "Managed Website" })).toContainText("$59");
  await page.getByRole("button", { name: /Get your free website preview/i }).first().click();
  await expect(page).toHaveURL(/\/generate-preview$/);
  await expect(page.getByLabel("Main service")).toBeVisible();
});

test("routes homepage plan cards to the intended pricing details", async ({ page }) => {
  await mockAnonymousPublicDependencies(page);
  await page.route("**/api/platform-events", (route) => json(route, { success: true }));

  await page.goto("/");
  await page.locator("article").filter({ has: page.getByRole("heading", { name: "Website Growth", exact: true }) }).getByRole("button", { name: /See scope & choose plan/i }).click();
  await expect(page).toHaveURL(/\/pricing#plan-website-growth$/);
  await expect(page.getByRole("heading", { name: "Website Growth", exact: true })).toBeVisible();
});

test("pricing checkout reaches Stripe before signup for a new customer", async ({ page }) => {
  await mockAnonymousPublicDependencies(page);
  await page.route("**/api/public/plan-checkout", async (route) => {
    const payload = await route.request().postDataJSON();
    expect(payload.productSlug).toBe("website-growth");
    expect(payload.currency).toBe("USD");
    expect(payload.introOffer).toBe("FIRST_MONTH_FREE_12M");
    await json(route, {
      success: true,
      url: "/checkout/success?session_id=cs_e2e_public&public_order=1&preview_id=checkout_e2e_12345678&direct_checkout=1",
    });
  });
  await page.route("**/api/public/preview-checkout/status?**", (route) => json(route, {
    status: "complete",
    paymentStatus: "paid",
    complete: true,
    email: "buyer@example.test",
    businessId: "00000000-0000-4000-8000-000000000902",
    productSlug: "website-growth",
    claimToken: "claim-token-e2e-abcdefghijklmnopqrstuvwxyz-1234567890",
  }));

  await page.goto("/pricing", { waitUntil: "networkidle" });
  const plansSection = page.locator("#plans");
  await expect(plansSection).toBeVisible();
  const growthCard = plansSection.locator("article").filter({ hasText: "Website Growth" });
  await expect(growthCard).toBeVisible();
  await page.getByRole("checkbox", { name: /new-customer offer/i }).check();
  await growthCard.getByRole("button", { name: /Choose this plan/i }).click();
  await expect(page.getByRole("dialog", { name: "Order summary" })).toBeVisible();
  await expect(page.getByText(/No account is required before payment/i)).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Order summary" }).getByText("USD ($)", { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Order summary" }).getByText("12 months")).toBeVisible();
  await page.getByRole("dialog", { name: "Order summary" }).getByRole("checkbox").check();
  await page.getByRole("dialog", { name: "Order summary" }).getByLabel("Email for offer eligibility").fill("buyer@example.test");
  await page.getByRole("button", { name: /Continue to secure checkout/i }).click();
  await expect(page).toHaveURL(/\/checkout\/success\?/);
  await expect(page).not.toHaveURL(/\/signup/);
  await expect(page.getByRole("heading", { name: "Payment confirmed" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Activate my account" })).toBeVisible();
});

test("preview order carries the captured lead into payment without signup", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("bt_preview_intent", JSON.stringify({
      previewId: "preview_e2e_12345678",
      leadId: "00000000-0000-4000-8000-000000000901",
      email: "buyer@example.test",
      businessName: "Example Studio",
      recommendedProduct: "website-growth",
      previewProfile: { businessName: "Example Studio", sourceUrl: "https://example.test" },
    }));
  });

  await page.goto("/preview-order");
  await expect(page.getByRole("heading", { name: /Turn the Example Studio direction into the real site/i })).toBeVisible();
  await expect(page.getByText(/No signup before payment/i)).toBeVisible();
  await expect(page.getByText("3 months", { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: /Optional: first month of management free/i }).check();
  await expect(page.getByText(/12-month initial commitment/i).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue to secure checkout/i })).toBeVisible();
});

test("shows and accepts a public proposal without exposing checkout secrets", async ({ page }) => {
  const proposalToken = "00000000-0000-4000-8000-000000000501";
  await page.route("**/api/platform-events", (route) => json(route, { success: true }));
  await page.route(`**/api/public/proposals/${proposalToken}`, (route) => json(route, { proposal: {
    id: "00000000-0000-4000-8000-000000000502",
    title: "Website Growth Partner proposal",
    package_name: "Website Growth Partner",
    value: 799,
    setup_fee: 1800,
    status: "Sent",
    expires_at: "2026-08-31",
    scope: ["Website strategy, copy and managed build", "Monthly improvements"],
    outcome: "A clearer managed website and enquiry journey.",
    config: { market: "US", commitmentMonths: 6 },
    leads: { name: "Jane Buyer", raw_fields: { businessName: "Example Services" } },
  } }));
  await page.route(`**/api/public/proposals/${proposalToken}/accept`, async (route) => {
    expect((await route.request().postDataJSON()).email).toBe("jane@example.test");
    await json(route, { success: true, checkoutUrl: null });
  });

  await page.goto(`/proposal/${proposalToken}`);
  await expect(page.getByRole("heading", { name: "Website Growth Partner proposal" })).toBeVisible();
  await page.getByLabel("Confirm your email").fill("jane@example.test");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /Accept proposal/i }).click();
  await expect(page.getByRole("heading", { name: "Proposal accepted" })).toBeVisible();
});

test("prospect sales preview presents consistent plan-aware CTAs and responsive device controls", async ({ page }, testInfo) => {
  await mockSupabaseAndStripe(page);
  const previewId = "preview_sales_e2e_12345678";
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

  await page.route("**/api/platform-events", (route) => json(route, { success: true }));
  await page.route(`**/api/public/prospect-preview/${previewId}`, (route) => json(route, {
    preview: {
      previewId,
      businessName: "Example Plumbing",
      headline: "Example Plumbing, presented with a clearer website direction",
      opportunitySummary: "Your business is stronger than the current website communicates. This direction makes the services, proof and next action easier to understand.",
      proposedStructure: ["Home", "Services", "About", "Reviews", "Contact"],
      proofSignals: ["Founded 2008", "Licensed and insured"],
      primaryConversionPath: "Request a Quote",
      recommendedProduct: {
        slug: "website-growth",
        label: "Website Growth",
        reason: "The brief needs broader local-search and service-page support.",
        salesMotion: "self_serve",
      },
      website: {
        id: "00000000-0000-4000-8000-000000000777",
        businessId: "00000000-0000-4000-8000-000000000778",
        status: "draft",
        updatedAt: Date.now(),
        theme: { primaryColor: "#4f46e5", secondaryColor: "#0f172a", backgroundColor: "#ffffff", textColor: "#0f172a" },
        seo: { title: "Example Plumbing", description: "Plumbing services", keywords: ["plumbing"] },
        pages: [{
          id: "page-home",
          title: "Home",
          slug: "home",
          sections: [{
            id: "hero",
            type: "hero",
            content: {
              headline: "Reliable plumbing for local homes",
              subheadline: "Clear service, trusted proof and a simple quotation path.",
              primaryCta: "Request a Quote",
            },
          }],
        }],
      },
    },
  }));

  await page.goto(`/preview/prospect/${previewId}`);
  await expect(page.getByRole("heading", { name: /Example Plumbing, presented with a clearer website direction/i })).toBeVisible();
  await expect(page.getByText("Website Growth", { exact: true })).toBeVisible();
  const primaryCtas = page.getByRole("link", { name: "Launch this website" });
  expect(await primaryCtas.count()).toBeGreaterThanOrEqual(2);
  const primaryHrefs = await primaryCtas.evaluateAll((links) => links.map((link) => link.getAttribute("href") || ""));
  expect(primaryHrefs.every((href) => /\/pricing\?product=website-growth/.test(href))).toBe(true);

  const deviceGroup = page.getByRole("group", { name: "Preview device" });
  const deviceControls = deviceGroup.getByRole("button", { name: /^(Mobile|Tablet|Desktop)$/ });
  if (testInfo.project.name.includes("mobile")) {
    // On a real mobile viewport the preview already renders at device width,
    // so desktop viewport-switch controls are intentionally not shown.
    await expect(deviceControls).toHaveCount(0);
  } else {
    const mobileControl = deviceGroup.getByRole("button", { name: "Mobile", exact: true });
    const tabletControl = deviceGroup.getByRole("button", { name: "Tablet", exact: true });
    const desktopControl = deviceGroup.getByRole("button", { name: "Desktop", exact: true });
    await mobileControl.click();
    await expect(mobileControl).toHaveAttribute("aria-pressed", "true");
    await tabletControl.click();
    await expect(tabletControl).toHaveAttribute("aria-pressed", "true");
    // WebKit can lose the sticky header's pointer hit target after the preview
    // iframe changes width. Keyboard activation exercises the same native
    // button behavior without depending on that browser hit-testing quirk.
    await desktopControl.focus();
    await desktopControl.press("Space");
    await expect(desktopControl).toHaveAttribute("aria-pressed", "true");
  }

  expect(consoleErrors).toEqual([]);
});


test("legacy market URLs resolve into the geographically generic public journey", async ({ page }) => {
  await page.goto("/website-subscription-service/malaysia", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/website-subscription-service$/);
  await expect(page.locator("body")).not.toContainText("Compare website subscription pages by market");
  await expect(page.locator("h1:visible").first()).toBeVisible();

  await page.goto("/clinic-website-design-malaysia", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/clinic-website-design$/);
  await expect(page.locator("body")).not.toContainText("Malaysia");
  await expect(page.locator("h1:visible").first()).toBeVisible();

  await page.goto("/");
  await expect(page.locator("body")).not.toContainText("MYR");
  await expect(page.locator("body")).not.toContainText("United Kingdom");
  await expect(page.locator("body")).not.toContainText("Singapore");
});


test("internal sales preview asks for company and URL without requiring prospect contact details", async ({ page }) => {
  await mockSupabaseAndStripe(page);
  await page.goto("/generate-preview?sales=1");
  await expect(page.getByText(/Internal sales mode · prospect email not required/i)).toBeVisible();
  await page.getByRole("button", { name: /I already have a website/i }).click();
  await expect(page.getByLabel("Company name")).toBeVisible();
  await expect(page.getByLabel("Website URL").first()).toBeVisible();

  const email = page.getByLabel("Email");
  expect(await email.getAttribute("required")).toBeNull();
  const phone = page.getByLabel(/WhatsApp \/ phone/);
  expect(await phone.getAttribute("required")).toBeNull();
});
