// Read-only production smoke with no credentials or customer writes.
const origin = "https://app.bennietay.com";
const checks = [
  { path: "/api/health-check", expected: 200 },
  { path: "/api/system/status", expected: 401 },
  { path: "/api/admin/finance/summary", expected: 401 },
  { path: "/api/dashboard/summary/00000000-0000-4000-8000-000000001101", expected: 401 },
  { path: "/api/jobs/00000000-0000-4000-8000-000000001102", expected: 401 },
  { path: "/api/checkout-session/status?session_id=cs_test_testsmoke", expected: 401 },
];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let failures = 0;
for (const { path, expected } of checks) {
  let last = "no response";
  let passed = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(new URL(path, origin), {
        method: "GET", redirect: "manual",
        headers: { "user-agent": "BennieStudio-ProductionReadOnlySmoke/1.0" },
        signal: AbortSignal.timeout(12_000),
      });
      last = "HTTP " + response.status;
      if (response.status === expected) { passed = true; break; }
    } catch (error) { last = error instanceof Error ? error.name : "network error"; }
    if (attempt < 2) await pause(2_000 * (attempt + 1));
  }
  console.log((passed ? "PASS" : "FAIL") + " " + path.split("?")[0] + " expected " + expected + ", got " + last);
  if (!passed) failures++;
}
if (failures) { console.error("Production read-only smoke failed for " + failures + " route(s)."); process.exitCode = 1; }
