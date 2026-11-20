import { expect, Page, Route, test } from "@playwright/test";

const appOrigin = `http://127.0.0.1:${process.env.E2E_PORT || 4173}`;
const businessId = "00000000-0000-4000-8000-000000001101";
const prospectId = "00000000-0000-4000-8000-000000001102";
const approvalId = "00000000-0000-4000-8000-000000001103";
const superAdminId = "00000000-0000-4000-8000-000000001104";
const clientId = "00000000-0000-4000-8000-000000001105";

const corsHeaders = {
  "access-control-allow-origin": appOrigin,
  "access-control-allow-credentials": "true",
  "access-control-allow-methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "*",
  "access-control-expose-headers": "content-range",
};

const json = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({
    status,
    contentType: "application/json",
    headers: corsHeaders,
    body: JSON.stringify(body),
  });
};

async function installPersona(page: Page, role: "super_admin" | "client") {
  const userId = role === "super_admin" ? superAdminId : clientId;
  const email = role === "super_admin" ? "superadmin@example.test" : "customer@example.test";
  const user = {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email,
    user_metadata: {},
    app_metadata: {},
    created_at: new Date().toISOString(),
  };
  const session = {
    access_token: `e2e-${role}-token`,
    refresh_token: "e2e-refresh",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user,
  };
  const profile = {
    id: userId,
    email,
    role,
    business_id: role === "client" ? businessId : null,
    onboarding_completed: role === "client",
    status: "active",
    staff_permissions: [],
    created_at: new Date().toISOString(),
  };
  const business = {
    id: businessId,
    owner_id: clientId,
    name: "Example Dental",
    plan: "business",
    subscription_status: "active",
    status: "active",
    onboarding_steps: {
      customerContact: { name: "Jamie Buyer", email: "customer@example.test" },
      customerAccess: {
        status: "invite_sent",
        email: "customer@example.test",
        onboardingUrl: `${appOrigin}/signup?redirectTo=%2Fdashboard%2Fonboarding&email=customer%40example.test`,
        sentAt: new Date().toISOString(),
      },
    },
  };
  const prospect: any = {
    id: prospectId,
    name: "Example Dental",
    domain: "example.test",
    industry: "Dental Clinic",
    location: "London",
    contact_email: "customer@example.test",
    contact_phone: "+441234567890",
    contact_whatsapp: "441234567890",
    website_status: "weak",
    opportunity_level: "high",
    outreach_status: "not_started",
    status: "active",
    preview_url: null,
    preview_generated_at: null,
    last_audit_at: null,
    created_at: new Date().toISOString(),
  };
  const onboarding = {
    id: "00000000-0000-4000-8000-000000001106",
    business_id: businessId,
    current_step: "Awaiting customer onboarding",
    status: "In Progress",
    progress: 5,
    created_at: new Date().toISOString(),
    businesses: business,
  };
  const approval = {
    id: approvalId,
    business_id: businessId,
    title: "Website launch approval",
    description: "Review the current website version.",
    status: "pending",
    requested_at: new Date().toISOString(),
    preview_url: `${appOrigin}/w/${businessId}`,
    version_label: "Launch candidate",
  };

  await page.route("**/api/public/site-config", (route) =>
    json(route, {
      platform: { maintenanceMode: false, salesPageTitle: "Bennie Studio" },
      landingPage: null,
      policies: [],
      posts: [],
    }),
  );
  await page.route("**/api/platform-events", (route) => json(route, { success: true }));

  const handleSupabase = async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    if (url.pathname.includes("/auth/v1/token")) return json(route, session);
    if (url.pathname.includes("/auth/v1/user")) return json(route, user);
    if (url.pathname.includes("/auth/v1/signup")) return json(route, { user, session });

    const table = url.pathname.split("/").filter(Boolean).at(-1);
    if (table === "profiles") return json(route, profile);
    if (table === "prospects") {
      if (method === "GET") return json(route, [prospect]);
      if (method === "PATCH") {
        const payload = JSON.parse(request.postData() || "{}");
        Object.assign(prospect, payload);
        return json(route, [prospect]);
      }
      return json(route, prospect);
    }
    if (table === "onboarding_sessions") return json(route, method === "GET" ? [onboarding] : onboarding);
    if (table === "businesses") return json(route, business);
    if (table === "customer_approvals") return json(route, role === "client" ? [approval] : []);
    if (table === "settings") return json(route, []);
    return json(route, method === "GET" ? [] : {});
  };

  await page.route("**/auth/v1/**", handleSupabase);
  await page.route("**/rest/v1/**", handleSupabase);
  return { prospect, business };
}

async function signIn(page: Page, role: "super_admin" | "client") {
  const email = role === "super_admin" ? "superadmin@example.test" : "customer@example.test";
  await page.goto("/login");
  await page.getByTestId("auth-email").fill(email);
  await page.getByTestId("auth-password").fill("Password123!");
  await page.getByTestId("auth-submit").click();
  await page.waitForURL((url) =>
    role === "super_admin" ? url.pathname === "/admin" : url.pathname === "/dashboard",
  );
}

test("customer dashboard shows only reviewed monthly reports with loading, empty and retry states", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "Run the authenticated report flow once in Chromium.");

  await installPersona(page, "client");
  await page.route(`**/api/dashboard/summary/${businessId}`, (route) => json(route, {
    stats: { leads: 0, websites: 1, appointments: 0 },
    recentLeads: [],
    recentAppointments: [],
    business: { id: businessId, name: "Example Dental", plan: "business", status: "active" },
    analytics: [],
    conversionInsights: null,
    measuredResults: { enquiries: 0, whatsAppClicks: 0, callClicks: 0, bookings: 0, pageViews: 0, topEnquiryPage: null, mostUsedEnquiryPath: null, opportunity: "Not enough data yet." },
  }));
  let requestFails = false;
  let includePublished = true;
  let holdFirstReportRequest = true;
  let markReportRequestStarted!: () => void;
  let releaseReportResponse!: () => void;
  const reportRequestStarted = new Promise<void>((resolve) => { markReportRequestStarted = resolve; });
  const reportResponseRelease = new Promise<void>((resolve) => { releaseReportResponse = resolve; });
  let requestedStatus: string | null = null;
  await page.route("**/rest/v1/monthly_growth_reports*", async (route) => {
    const url = new URL(route.request().url());
    requestedStatus = url.searchParams.get("status");
    if (holdFirstReportRequest) {
      holdFirstReportRequest = false;
      markReportRequestStarted();
      await reportResponseRelease;
    }
    if (requestFails) {
      await json(route, { message: "fixture report read failure" }, 503);
      return;
    }
    const reports = requestedStatus !== "eq.published" ? [{ id: "draft-only", report_month: "2026-10", status: "draft", summary: "This draft must stay private." }] : includePublished ? [{
      id: "00000000-0000-4000-8000-000000001140",
      report_month: "2026-10",
      status: "published",
      summary: "2 measured page views, 0 recorded enquiries, and 0 recorded bookings in 2026-10.",
      payload: { measured: { pageViews: 2, viewSessions: 1, enquiries: 0, whatsappClicks: 0, callClicks: 0, bookings: 0 } },
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }] : [];
    await json(route, reports);
  });

  await signIn(page, "client");
  await reportRequestStarted;
  await expect(page.getByRole("status").filter({ hasText: "Loading reviewed reports" })).toBeVisible();
  releaseReportResponse();
  await expect(page.getByText("Monthly Website Reports", { exact: true })).toBeVisible();
  await expect(page.getByText("2026-10", { exact: true })).toBeVisible();
  await expect(page.getByText("This draft must stay private.")).toHaveCount(0);
  expect(requestedStatus).toBe("eq.published");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download", exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("monthly-website-report-2026-10.txt");

  includePublished = false;
  await page.reload();
  await expect(page.getByText("No reviewed monthly reports have been published yet. Unpublished drafts are not shown here.")).toBeVisible();

  requestFails = true;
  await page.reload();
  await expect(page.getByRole("alert").filter({ hasText: "Reviewed reports could not be loaded" })).toBeVisible();
  requestFails = false;
  includePublished = true;
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByText("2026-10", { exact: true })).toBeVisible();
});

test("commercial lifecycle covers conversion, customer access and fresh launch QA", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "Run the lifecycle once in Chromium.");

  const { prospect, business } = await installPersona(page, "super_admin");
  let converted = false;
  let inviteResent = false;
  let outreachSent = false;
  const engagementMessages: any[] = [];

  await page.route("**/api/admin/sales-automation/templates", (route) => json(route, {
    sequenceId: "00000000-0000-4000-8000-000000001130", status: "paused", updatedAt: new Date().toISOString(), overrides: {},
  }));
  await page.route("**/api/admin/sales-inbox", (route) => json(route, { conversations: [] }));
  await page.route(`**/api/admin/prospects/${prospectId}/engagement`, (route) =>
    json(route, { messages: engagementMessages, tasks: [] }),
  );
  let reviewRequestCount = 0;
  await page.route(`**/api/admin/prospects/${prospectId}/website-review`, (route) => {
    reviewRequestCount += 1;
    return json(route, {
      reportUrl: `${appOrigin}/website-audit?report=review-e2e&key=review-key-e2e`,
      preparedAt: new Date().toISOString(),
      report: {
        schemaVersion: 2,
        analyzedUrl: "https://example.test",
        summary: "E2E website review",
        findings: [{
          id: "cta-e2e",
          category: "Conversion",
          title: "CTA can be clearer",
          whatWeFound: "Primary enquiry action is not prominent.",
          whyItMatters: "Visitors may leave without enquiring.",
          recommendation: "Use one clear enquiry CTA.",
          exampleImprovement: "Book an appointment",
          priority: "high",
          observation: "confirmed",
        }],
      },
    });
  });
  await page.route(`**/api/admin/prospects/${prospectId}/outreach`, async (route) => {
    const payload = await route.request().postDataJSON();
    expect(payload.action).toBe("send");
    expect(payload.channel).toBe("email");
    expect(String(payload.bodyText)).toContain("Bennie Studio");
    expect(String(payload.bodyText)).toContain("I help service businesses make their websites clearer and easier for customers to enquire through.");
    expect(String(payload.bodyText)).not.toContain("Primary enquiry action is not prominent");
    expect(String(payload.bodyText)).not.toContain("/website-audit?");
    outreachSent = true;
    prospect.outreach_status = "contacted";
    engagementMessages.push({
      id: "00000000-0000-4000-8000-000000001120",
      direction: "outbound",
      status: "delivered",
      subject: payload.subject,
      body_text: payload.bodyText,
      sent_at: new Date().toISOString(),
    });
    await json(route, { success: true, prospect, message: engagementMessages.at(-1) });
  });
  await page.route("**/api/public/pricing**", (route) =>
    json(route, {
      products: [{
        slug: "managed-website",
        price: { minimumTermMonths: 3, setupFee: 499, monthlyPrice: 99 },
      }],
    }),
  );
  await page.route(`**/api/admin/prospects/${prospectId}/convert`, async (route) => {
    const payload = await route.request().postDataJSON();
    expect(payload.contactEmail).toBe("customer@example.test");
    expect(payload.termMonths).toBe(3);
    converted = true;
    prospect.converted_business_id = businessId;
    prospect.outreach_status = "won";
    await json(route, {
      success: true,
      prospect,
      business: {
        id: businessId,
        accountStatus: "invite_sent",
        customerAccess: business.onboarding_steps.customerAccess,
      },
      onboarding: { progress: 5 },
      project: { status: "awaiting_onboarding" },
    });
  });
  await page.route(`**/api/admin/businesses/${businessId}/onboarding-invite`, async (route) => {
    expect((await route.request().postDataJSON()).requestId).toMatch(/[0-9a-f-]{36}/i);
    inviteResent = true;
    await json(route, {
      success: true,
      customerAccess: {
        ...business.onboarding_steps.customerAccess,
        status: "invite_sent",
        sentAt: new Date().toISOString(),
      },
    });
  });
  await page.route(`**/api/admin/businesses/${businessId}/launch-readiness`, (route) =>
    json(route, {
      ready: true,
      blockers: [],
      warnings: [],
      publicUrl: `${appOrigin}/w/${businessId}`,
      reachable: true,
      httpStatus: 200,
      crawler: {
        pass: true,
        pageCount: 5,
        resourceCount: 12,
        brokenResources: [],
        uncertainResources: [],
        navigationIssues: [],
        discoveredResourceCount: 12,
        truncated: false,
      },
      checks: [
        {
          id: "fresh_crawl",
          label: "Fresh crawl: 5 pages · 12 live targets checked",
          pass: true,
          severity: "blocker",
        },
      ],
    }),
  );
  await page.route(`**/api/website-health?businessId=${businessId}`, (route) =>
    json(route, { reachable: true, httpStatus: 200, latencyMs: 120 }),
  );

  await signIn(page, "super_admin");
  await page.goto("/admin/prospect_explorer");
  const prospectRow = page.getByRole("row", { name: /Example Dental/ });
  await expect(prospectRow).toBeVisible();

  await prospectRow.getByRole("button", { name: "Audit", exact: true }).click();
  await expect.poll(() => reviewRequestCount).toBeGreaterThan(0);
  await expect.poll(() => prospect.outreach_status).toBe("not_started");

  await prospectRow.getByRole("button", { name: "Copy review link", exact: true }).click();
  await expect.poll(() => reviewRequestCount).toBeGreaterThan(0);
  expect(reviewRequestCount).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Prepare & Email", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review first email" })).toBeVisible();
  await expect(page.getByText(/A simple introduction first/i)).toBeVisible();
  await expect(page.locator("textarea").last()).toHaveValue(/I help service businesses make their websites clearer and easier for customers to enquire through/);
  await expect(page.getByText("View or edit saved email templates")).toBeVisible();
  await page.getByRole("checkbox", { name: /confirm this recipient has opted in/i }).check();
  await page.getByRole("button", { name: "Send email", exact: true }).click();
  await expect.poll(() => outreachSent).toBe(true);
  await expect.poll(() => prospect.outreach_status).toBe("contacted");

  // Simulate the inbound Resend webhook result without calling a real email provider.
  prospect.outreach_status = "replied";
  engagementMessages.push({
    id: "00000000-0000-4000-8000-000000001121",
    direction: "inbound",
    status: "replied",
    subject: "Re: Quick website idea",
    body_text: "Yes, please send the next steps.",
    classification: "interested",
    sent_at: new Date().toISOString(),
  });
  await page.reload();
  await expect(page.getByRole("button", { name: "Convert", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Convert", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Convert Example Dental to Customer" })).toBeVisible();
  await expect(page.locator('input[value="customer@example.test"]')).toBeVisible();
  await page.getByRole("button", { name: "Create Customer Workspace" }).click();
  await expect.poll(() => converted).toBe(true);

  await page.goto("/admin/client_onboarding");
  await expect(page.getByRole("heading", { name: "Customer Onboarding" })).toBeVisible();
  await expect(page.getByText("Example Dental", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("customer@example.test", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Resend invite/i }).click();
  await expect.poll(() => inviteResent).toBe(true);
  await page.getByRole("button", { name: "Launch QA" }).click();
  await expect(page.getByText("Ready for launch")).toBeVisible();
  await expect(page.getByText(/Fresh crawl: 5 pages/).first()).toBeVisible();
  await expect(page.getByText(/12\/12 targets/).first()).toBeVisible();
});

test("invited customer email is prefilled and client can approve", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "Run the lifecycle once in Chromium.");

  await installPersona(page, "client");
  let approved = false;

  await page.route(`**/api/customer/approvals/${approvalId}/respond`, async (route) => {
    const payload = await route.request().postDataJSON();
    expect(payload.status).toBe("approved");
    approved = true;
    await json(route, { success: true, approval: { id: approvalId, status: "approved" } });
  });

  await page.goto("/signup?redirectTo=%2Fdashboard%2Fonboarding&email=customer%40example.test");
  await expect(page.getByTestId("auth-email")).toHaveValue("customer@example.test");

  await signIn(page, "client");
  await page.goto("/dashboard/approvals");
  await expect(page.getByRole("heading", { name: "Website Approvals" })).toBeVisible();
  await page.getByRole("button", { name: "Review & Respond" }).click();
  await page.getByRole("button", { name: "Approve Version" }).click();
  await expect.poll(() => approved).toBe(true);
});

test("public launch surface has no horizontal overflow at launch viewports", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "Responsive matrix runs once in Chromium.");

  await page.route("**/api/public/site-config", (route) =>
    json(route, { platform: { maintenanceMode: false }, landingPage: null, policies: [], posts: [] }),
  );
  await page.route("**/api/platform-events", (route) => json(route, { success: true }));
  await page.route("**/api/public/pricing**", (route) => json(route, { products: [] }));
  await page.route("https://ipapi.co/json/", (route) =>
    json(route, { country_code: "MY", country_name: "Malaysia" }),
  );

  for (const viewport of [
    { width: 375, height: 812 },
    { width: 768, height: 1024 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const overflow = await page.evaluate(() =>
      Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    );
    expect(overflow).toBe(0);
  }
});
