import { expect, Page, Route, test } from "@playwright/test";
import { testPersonas } from "./fixtures/personas";

const businessId = "00000000-0000-4000-8000-000000000101";
const appOrigin = `http://127.0.0.1:${process.env.E2E_PORT || 4173}`;

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

type Persona = (typeof testPersonas)[keyof typeof testPersonas];

type CustomerState = {
  subscriptionStatus?: "active" | "trialing" | "canceled";
  trialEndsAt?: string | null;
};

async function installPersonaMocks(
  page: Page,
  persona: Persona,
  customerState: CustomerState = { subscriptionStatus: "active", trialEndsAt: null },
) {
  const isInternal = persona.role === "super_admin" || persona.role === "platform_staff";
  const isBusinessMember = ["business_admin", "staff", "client"].includes(persona.role);
  const calls = { signupKind: null as string | null, customerResponses: 0 };
  const updateRequest: any = {
    id: "00000000-0000-4000-8000-000000000109",
    business_id: businessId,
    profile_id: testPersonas.businessAdmin.id,
    request_type: "monthly_update",
    status: "waiting_for_customer",
    title: "Update the service page",
    details: "Please confirm the service hours before we publish the update.",
    admin_response: "Could you confirm your weekday and weekend opening hours?",
    customer_response: null,
    allowance_period: new Date().toISOString().slice(0, 7),
    created_at: new Date().toISOString(),
    submitted_at: new Date().toISOString(),
    estimated_response_at: new Date(Date.now() + 86400000).toISOString(),
    sla_paused_at: new Date().toISOString(),
    business: { name: "Persona Test Business", plan: "business" },
  };
  const user = {
    id: persona.id,
    aud: "authenticated",
    role: "authenticated",
    email: persona.email,
    user_metadata: {},
    app_metadata: {},
    created_at: new Date().toISOString(),
  };
  const session = {
    access_token: `e2e-${persona.role}-token`,
    refresh_token: `e2e-${persona.role}-refresh`,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user,
  };
  const profile = {
    id: persona.id,
    email: persona.email,
    role: persona.role,
    business_id: isBusinessMember ? businessId : null,
    onboarding_completed: true,
    status: "active",
    staff_permissions: persona.role === "platform_staff" ? ["delivery", "customer_health"] : [],
    created_at: new Date().toISOString(),
  };
  const business = {
    id: businessId,
    owner_id: testPersonas.businessAdmin.id,
    name: "Persona Test Business",
    slug: "persona-test-business",
    subdomain: "persona-test",
    plan: "business",
    subscription_status: customerState.subscriptionStatus || "active",
    trial_ends_at: customerState.trialEndsAt ?? null,
    status: "active",
    settings: {},
    contact_email: "owner@example.test",
    created_at: new Date().toISOString(),
  };

  await page.route("**/api/public/site-config", (route) =>
    json(route, { platform: { maintenanceMode: false, salesPageTitle: "Bennie Studio" } }),
  );
  await page.route("**/api/platform-events", (route) => json(route, { success: true }));
  await page.route("https://ipapi.co/json/", (route) =>
    json(route, { country_code: "MY", country_name: "Malaysia" }),
  );

  const handleSupabase = async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    if (url.pathname.includes("/auth/v1/signup")) {
      const payload = request.postDataJSON();
      calls.signupKind = String(payload?.data?.signup_kind || "");
      await json(route, { user, session });
      return;
    }
    if (url.pathname.includes("/auth/v1/token")) {
      await json(route, session);
      return;
    }
    if (url.pathname.includes("/auth/v1/user")) {
      await json(route, user);
      return;
    }
    if (url.pathname.endsWith("/rpc/get_monthly_update_allowance")) {
      await json(route, [{ allowance_period: new Date().toISOString().slice(0, 7), base_allowance: 1, extra_allowance: 0, used_allowance: 0, remaining_allowance: 1 }]);
      return;
    }
    if (url.pathname.endsWith("/rpc/customer_respond_monthly_update_request")) {
      const payload = request.postDataJSON();
      calls.customerResponses += 1;
      updateRequest.customer_response = payload.p_response;
      updateRequest.customer_response_at = new Date().toISOString();
      updateRequest.status = "submitted";
      updateRequest.sla_paused_at = null;
      await json(route, updateRequest);
      return;
    }

    const table = url.pathname.split("/").filter(Boolean).at(-1);
    if (table === "profiles") {
      if (url.searchParams.has("business_id")) {
        await json(route, [profile]);
      } else {
        await json(route, profile);
      }
      return;
    }
    if (table === "businesses") {
      await json(route, business);
      return;
    }
    if (table === "monthly_update_requests") {
      await json(route, [updateRequest]);
      return;
    }
    if (table === "settings") {
      await json(route, []);
      return;
    }

    await json(route, method === "GET" ? [] : {});
  };

  await page.route("**/auth/v1/**", handleSupabase);
  await page.route("**/rest/v1/**", handleSupabase);
  await page.route("**/rest/v1/rpc/customer_respond_monthly_update_request", async (route) => {
    calls.customerResponses += 1;
    const payload = route.request().postDataJSON();
    updateRequest.customer_response = payload?.p_response;
    updateRequest.customer_response_at = new Date().toISOString();
    updateRequest.status = "submitted";
    updateRequest.sla_paused_at = null;
    await json(route, updateRequest);
  });
  return calls;
}

async function navigateTo(page: Page, path: string) {
  try {
    await page.goto(path, { waitUntil: "commit" });
  } catch {
    // Firefox/WebKit can report an interrupted navigation when the app redirects
    // an unauthorized route or retries a dynamically loaded chunk. The assertions
    // after this helper verify the resulting route and rendered access state.
  }
}

async function signInAs(page: Page, persona: Persona, state?: CustomerState) {
  const calls = await installPersonaMocks(page, persona, state);
  await page.goto("/login");
  await page.getByTestId("auth-email").fill(persona.email);
  await page.getByTestId("auth-password").fill("Password123!");
  await page.getByTestId("auth-submit").click();
  const expected = persona.role === "super_admin" || persona.role === "platform_staff" ? "/admin" : "/dashboard";
  await page.waitForURL((url) => url.pathname === expected);
  if (expected === "/dashboard") {
    // waitForURL observes the auth redirect before the dashboard's lazy chunks
    // finish loading. Settling the shell here prevents the next direct route
    // navigation from cancelling those imports in Firefox and WebKit.
    await page
      .getByRole("link", { name: "Overview", exact: true })
      .or(page.getByRole("heading", { name: "Subscription access paused" }))
      .waitFor({ state: "visible" });
  }
  return calls;
}

test("business admin can open team management", async ({ page }) => {
  await signInAs(page, testPersonas.businessAdmin);
  await navigateTo(page, "/dashboard/team");
  await expect(page.getByRole("heading", { name: "Team Management" })).toBeVisible();
});

test("authenticated customer can reply to an update request and resume its paused SLA", async ({ page }) => {
  const calls = await signInAs(page, testPersonas.client);
  await navigateTo(page, "/dashboard/update-requests");
  await expect(page.getByRole("heading", { name: "Monthly Update Requests" })).toBeVisible();
  await expect(page.getByText("Your response is needed · SLA paused")).toBeVisible();
  await page.getByRole("textbox", { name: "Reply to the studio" }).fill("Weekdays 9 am to 6 pm, Saturday 10 am to 2 pm.");
  await page.getByRole("button", { name: "Send response and resume request" }).click();
  await expect.poll(() => calls.customerResponses).toBe(1);
  await expect(page.getByText("SLA has resumed")).toBeVisible();
  await expect(page.getByText(/Weekdays 9 am to 6 pm/)).toBeVisible();
});

test("active staff can use dashboard but cannot open billing or team administration", async ({ page }) => {
  await signInAs(page, testPersonas.staff);
  await expect(page.getByRole("heading", { name: "Subscription access paused" })).toHaveCount(0);

  await navigateTo(page, "/dashboard/billing");
  await page.waitForURL((url) => url.pathname === "/dashboard");

  await navigateTo(page, "/dashboard/team");
  await page.waitForURL((url) => url.pathname === "/dashboard");
});

test("expired staff is blocked by the business subscription gate", async ({ page }) => {
  await signInAs(page, testPersonas.staff, {
    subscriptionStatus: "trialing",
    trialEndsAt: new Date(Date.now() - 60_000).toISOString(),
  });
  await expect(page.getByRole("heading", { name: "Subscription access paused" })).toBeVisible();
});

test("client cannot enter the platform admin area", async ({ page }) => {
  await signInAs(page, testPersonas.client);
  await navigateTo(page, "/admin");
  await page.waitForURL((url) => url.pathname === "/dashboard");
});

test("affiliate signup uses the constrained affiliate provisioning intent", async ({ page }) => {
  const calls = await installPersonaMocks(page, testPersonas.affiliate);
  await page.goto("/affiliate/signup");
  await page.locator('input[type="email"]').fill(testPersonas.affiliate.email);
  await page.getByPlaceholder("••••••••").fill("Password123!");
  await page.getByLabel(/I agree to the Partner Terms & Conditions/i).check();
  await expect(page.locator("#agreed")).toBeChecked();
  await page.getByRole("button", { name: "Launch My Partnership" }).click();
  await expect.poll(() => calls.signupKind).toBe("affiliate");
});

test("affiliate is isolated from customer business routes", async ({ page }) => {
  await signInAs(page, testPersonas.affiliate);
  await navigateTo(page, "/dashboard/my-website");
  await page.waitForURL((url) => url.pathname === "/dashboard/affiliate/dashboard");
  await navigateTo(page, "/dashboard/billing");
  await page.waitForURL((url) => url.pathname === "/dashboard/affiliate/dashboard");
});

test("platform staff can enter the platform admin area", async ({ page }) => {
  await signInAs(page, testPersonas.platformStaff);
  await expect(page).toHaveURL(/\/admin/);
});

test("super admin can enter the platform admin area", async ({ page }) => {
  await signInAs(page, testPersonas.superAdmin);
  await expect(page).toHaveURL(/\/admin/);
});

// Authenticated UI integration with deterministic test personas and isolated mocked API state.
test("website portfolio preserves independent site selection and quotas",async({page})=>{
 await signInAs(page,testPersonas.businessAdmin);
 const first="00000000-0000-4000-8000-000000000201",second="00000000-0000-4000-8000-000000000202";
 const sites=[{id:first,business_id:businessId,name:"Primary fixture",status:"published",is_primary:true},{id:second,business_id:businessId,name:"Secondary fixture",status:"draft",is_primary:false}];
 let mutation:any;
 await page.route("**/api/account/websites",async route=>{
  if(route.request().method()==="POST"){mutation=route.request().postDataJSON();return json(route,{siteId:second});}
  return json(route,{businessId,sites,capacity:{websiteLimit:2,websitesUsed:2,websitesRemaining:0,projectLimit:7,pagesPerWebsite:4,locationPagesPerWebsite:1},lifecycleEnabled:true});
 });
 await page.route("**/api/account/website-addons",route=>json(route,{businessId,enabled:false,price:null,orders:[]}));
 await page.route("**/api/account/websites/*/preview",route=>json(route,{error:"Fixture thumbnail unavailable"},503));
 await navigateTo(page,"/dashboard/websites");
 await expect(page.getByRole("heading",{name:"My Websites"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Create site"})).toBeDisabled();
 await page.getByRole("button",{name:"List view"}).click();
 const secondary=page.locator("article").filter({hasText:"Secondary fixture"});
 await expect(secondary.getByRole("link",{name:"Manage site"})).toHaveAttribute("href","/dashboard/websites/"+second);
 await expect(secondary.getByRole("button",{name:"Duplicate"})).toBeDisabled();
 page.once("dialog",dialog=>dialog.accept());
 await secondary.getByRole("button",{name:"Archive"}).click();
 await expect.poll(()=>mutation?.siteId).toBe(second);
 await expect.poll(()=>mutation?.action).toBe("archive");
});
