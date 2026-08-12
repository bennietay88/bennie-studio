import { expect, Page, Route, test } from "@playwright/test";

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
  plan: "growth",
  subscription_status: "active",
  status: "active",
  trial_ends_at: new Date(Date.now() + 14 * 86_400_000).toISOString(),
  settings: {},
  contact_email: "owner@example.test",
  created_at: new Date().toISOString(),
};

const plans = [
  {
    id: "plan_starter",
    slug: "starter",
    name: "Starter",
    price_usd: 49,
    description: "Starter website subscription plan",
    monthly_credit_limit: 100,
    project_limit: 1,
    location_page_limit: 0,
    monthly_update_allowance: "Monthly update support",
    features: ["1-page lead website", "Contact form", "WhatsApp CTA"],
    enabled_features: ["ai_synthesis"],
    is_active: true,
    is_popular: false,
    sort_order: 1,
    stripe_price_id: "price_starter_e2e",
    stripe_product_id: "prod_starter_e2e",
  },
  {
    id: "plan_growth",
    slug: "growth",
    name: "Growth",
    price_usd: 199,
    description: "Growth website subscription plan",
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
  {
    id: "plan_scale",
    slug: "scale",
    name: "Scale",
    price_usd: 399,
    description: "Scale website subscription plan",
    monthly_credit_limit: 900,
    project_limit: 10,
    location_page_limit: 8,
    monthly_update_allowance: "Priority update support",
    features: ["Up to 10 pages", "Campaign landing pages", "Priority support"],
    enabled_features: ["ai_synthesis", "local_seo"],
    is_active: true,
    is_popular: false,
    sort_order: 3,
    stripe_price_id: "price_scale_e2e",
    stripe_product_id: "prod_scale_e2e",
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

test("covers signup, plan checkout, checkout confirmation, onboarding, and website handoff", async ({ page }) => {
  const calls = await mockSupabaseAndStripe(page);

  await page.goto("/signup?redirectTo=%2Fdashboard%2Fbilling");
  await expect(page.getByTestId("signup-form")).toBeVisible();
  await page.getByTestId("auth-email").fill("owner@example.test");
  await page.getByTestId("auth-password").fill("Password123!");
  await page.getByTestId("auth-terms").check();
  await page.getByTestId("auth-submit").click();

  await page.waitForURL("**/dashboard/billing");
  await page.getByTestId("plan-checkout-growth").click();
  await expect(page).toHaveURL(/\/checkout\/success\?session_id=cs_e2e_growth/);
  await expect(page.getByText("Checkout confirmed")).toBeVisible();
  await page.getByRole("link", { name: "Continue Setup" }).click();

  await expect(page.getByTestId("onboarding-flow")).toBeVisible();
  await page.getByTestId("onboarding-business-name").fill("Bennie Test Studio");
  await page.getByRole("button", { name: /Initialize Trial/i }).click();
  await page.getByTestId("onboarding-subdomain").fill("bennietest");
  await page.getByTestId("onboarding-template").selectOption("template_service_business");
  await page.getByRole("button", { name: /Continue to Strategic Intel/i }).click();
  await page.getByPlaceholder("e.g. Malaysia, Singapore, Global").fill("Malaysia");
  await page.getByPlaceholder("e.g. Free Strategy Session, 20% Off Design").fill("Free Website Review");
  await page.getByPlaceholder("e.g. Klang Valley, Nationwide").fill("Klang Valley");
  await page.getByRole("button", { name: /Continue to Services/i }).click();
  await page.getByPlaceholder("Service 1").fill("Managed website service");
  await page.getByPlaceholder("WhatsApp Number (e.g. +601...)").fill("+60123456789");
  await page.getByPlaceholder("Contact Email").fill("owner@example.test");
  await page.getByRole("button", { name: /Style & Content/i }).click();
  await page.getByPlaceholder("Paste a few client reviews here...").fill("Clear communication and fast turnaround.");
  await page.getByRole("button", { name: /Proceed to Activation/i }).click();
  await page.getByRole("button", { name: /Use Recommendation/i }).click();
  await page.locator("#agree-protocols").check();
  await page.getByTestId("onboarding-launch").click();

  await expect.poll(() => calls.onboardingCompleted).toBe(true);
  await expect.poll(() => calls.websiteUpserted).toBe(true);
  expect(calls.checkoutCreated).toBe(true);
  expect(calls.checkoutVerified).toBe(true);
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
  await page.getByPlaceholder("Website URL").fill("https://example.test");
  await page.getByPlaceholder("Business name").fill("Example Studio");
  await page.getByPlaceholder("Email").fill("owner@example.test");
  await page.getByRole("button", { name: /Start My Website Growth Review/i }).click();

  await expect(page.getByRole("heading", { name: report.summary })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("What we found", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("The next enquiry action is not obvious")).toBeVisible();
  await expect(page.getByText(/\/100/)).toHaveCount(0);

  await page.getByRole("link", { name: "See My Website Preview" }).click();
  await expect(page).toHaveURL(/\/generate-preview/);
  await expect(page.getByPlaceholder("Business name")).toHaveValue("Example Studio");
  await expect(page.getByPlaceholder("Current website URL optional")).toHaveValue("https://example.test");
  await expect(page.getByPlaceholder("Email")).toHaveValue("owner@example.test");
});
