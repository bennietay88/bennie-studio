import { expect, test } from "@playwright/test";
// Exercise unmocked local API authorization without production credentials.
test("private API routes deny anonymous callers", async ({ request }) => {
  for (const path of [
    "/api/system/status",
    "/api/account/websites",
    "/api/account/website-addons",
    "/api/admin/website-operations",
    "/api/admin/website-commercial-audit",
    "/api/account/websites/00000000-0000-4000-8000-000000000021/backups",
    "/api/account/websites/00000000-0000-4000-8000-000000000021/export",
    "/api/admin/finance/summary",
    "/api/dashboard/summary/00000000-0000-4000-8000-000000001101",
    "/api/jobs/00000000-0000-4000-8000-000000001102",
    "/api/checkout-session/status?session_id=cs_test_testsmoke",
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(401);
  }
});
