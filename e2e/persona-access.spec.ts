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
  const calls = { signupKind: null as string | null };
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
    if (table === "settings") {
      await json(route, []);
      return;
    }

    await json(route, method === "GET" ? [] : {});
  };

  await page.route("**/auth/v1/**", handleSupabase);
  await page.route("**/rest/v1/**", handleSupabase);
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
  await installPersonaMocks(page, persona, state);
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
}

test("business admin can open team management", async ({ page }) => {
  await signInAs(page, testPersonas.businessAdmin);
  await navigateTo(page, "/dashboard/team");
  await expect(page.getByRole("heading", { name: "Team Management" })).toBeVisible();
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
