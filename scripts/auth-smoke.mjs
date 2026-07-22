import { createClient } from "@supabase/supabase-js";

const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const requiredEnv = [
  "SMOKE_BUSINESS_EMAIL",
  "SMOKE_BUSINESS_PASSWORD",
  "SMOKE_SUPERADMIN_EMAIL",
  "SMOKE_SUPERADMIN_PASSWORD",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
];

const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required auth smoke env vars: ${missing.join(", ")}`);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const assertAppShell = async (route) => {
  const response = await fetch(new URL(route, baseUrl), {
    redirect: "manual",
  });
  if (![200, 301, 302, 307, 308].includes(response.status)) {
    throw new Error(`${route} returned HTTP ${response.status}`);
  }
  if (response.status === 200) {
    const html = await response.text();
    if (!html.includes('<div id="root"')) {
      throw new Error(`${route} did not return the app shell`);
    }
  }
};

const signIn = async (label, email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.session || !data.user) {
    throw new Error(`${label} login failed`);
  }
  return data;
};

const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, business_id")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) {
    throw new Error("Authenticated user profile was not found");
  }
  return data;
};

const health = await fetch(new URL("/api/health-check", baseUrl));
if (!health.ok) throw new Error(`Health check failed: HTTP ${health.status}`);

const business = await signIn(
  "Business",
  process.env.SMOKE_BUSINESS_EMAIL,
  process.env.SMOKE_BUSINESS_PASSWORD,
);
const businessProfile = await getProfile(business.user.id);
if (!["business_admin", "client", "affiliate", "staff"].includes(businessProfile.role)) {
  throw new Error(`Business smoke account has unexpected role: ${businessProfile.role}`);
}

for (const route of [
  "/dashboard",
  "/dashboard/leads",
  "/dashboard/appointments",
  "/dashboard/billing",
  "/dashboard/settings",
  "/dashboard/ai-usage",
  "/dashboard/status",
  "/dashboard/approvals",
]) {
  await assertAppShell(route);
}

await supabase.auth.signOut();

const admin = await signIn(
  "Superadmin",
  process.env.SMOKE_SUPERADMIN_EMAIL,
  process.env.SMOKE_SUPERADMIN_PASSWORD,
);
const adminProfile = await getProfile(admin.user.id);
if (adminProfile.role !== "super_admin") {
  throw new Error("Superadmin smoke account does not have super_admin role");
}

for (const route of [
  "/admin",
  "/admin/businesses",
  "/admin/users",
  "/admin/settings",
  "/admin/plans",
  "/admin/status",
  "/admin/ai_credits",
  "/admin/operations",
  "/admin/projects",
  "/admin/client_onboarding",
]) {
  await assertAppShell(route);
}

console.log("Authenticated smoke check passed");
