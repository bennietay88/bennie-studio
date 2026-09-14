import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT || 4173);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: `env VITE_SUPABASE_URL=https://e2e.supabase.co VITE_SUPABASE_ANON_KEY=e2e-anon-key npm run build && env E2E_TEST=true VITE_SUPABASE_URL=https://e2e.supabase.co VITE_SUPABASE_ANON_KEY=e2e-anon-key SUPABASE_SERVICE_ROLE_KEY=e2e-service-role-key STRIPE_SECRET_KEY=sk_test_e2e STRIPE_WEBHOOK_SECRET=whsec_e2e NODE_ENV=production HOST=127.0.0.1 PORT=${port} npm start`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
