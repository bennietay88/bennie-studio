import assert from "node:assert/strict";
import test from "node:test";
import { createServer, type Server } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";

const listen = async (server: Server) => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return (server.address() as { port: number }).port;
};

test("monthly reporting routes are permission-gated and remain off by default", { timeout: 20000 }, async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  let role = "business_admin";
  let monthlyReportingEnabled = false;
  let writes = 0;
  let createdReport = false;
  const rpcCalls: string[] = [];
  const database = createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.method !== "GET") writes += 1;
    if (req.url?.startsWith("/auth/v1/user")) return res.end(JSON.stringify({ id, email: "fixture@example.test" }));
    if (req.url?.startsWith("/rest/v1/profiles")) return res.end(JSON.stringify({ id, role, staff_permissions: [] }));
    if (req.url?.startsWith("/rest/v1/settings")) return res.end(JSON.stringify({ content: { monthly_reporting_workflow: monthlyReportingEnabled } }));
    if (req.url?.includes("/rpc/")) {
      const rpc = req.url.split("/rpc/")[1]?.split("?")[0] || "";
      rpcCalls.push(rpc);
      if (rpc === "get_monthly_growth_report_source_data") return res.end(JSON.stringify([{
        business_id: "20000000-0000-4000-8000-000000000001", website_id: "30000000-0000-4000-8000-000000000001",
        page_views: 3, view_sessions: 2, enquiries: 1, whatsapp_clicks: 1, call_clicks: 0,
        bookings: 0, top_enquiry_page: "/contact", most_used_enquiry_path: "whatsapp_click", completed_work: [],
      }]));
      if (rpc === "create_monthly_growth_report_draft") {
        if (createdReport) return res.end(JSON.stringify([{ report_id: null, created: false, report_version: null }]));
        createdReport = true;
        return res.end(JSON.stringify([{ report_id: "50000000-0000-4000-8000-000000000001", created: true, report_version: 1 }]));
      }
      if (rpc === "publish_monthly_growth_report") return res.end(JSON.stringify([{
        id: "50000000-0000-4000-8000-000000000001", status: "published", notification_status: "dashboard_only", report_version: 2,
      }]));
    }
    res.end("[]");
  });
  const dbPort = await listen(database);
  const probe = createServer();
  const port = await listen(probe);
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  const cwd = await mkdtemp(path.join(tmpdir(), "bennie-monthly-report-api-"));
  const child = spawn(process.execPath, [path.resolve("dist/server.cjs")], {
    cwd,
    env: {
      PATH: process.env.PATH, NODE_ENV: "production", HOST: "127.0.0.1", PORT: String(port),
      VITE_SUPABASE_URL: `http://127.0.0.1:${dbPort}`, VITE_SUPABASE_ANON_KEY: "fixture-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "fixture-service-key",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const base = `http://127.0.0.1:${port}`;
  const validPublish = `/api/admin/monthly-growth-reports/${id}/publish`;
  try {
    for (let attempt = 0; ; attempt++) {
      try { await fetch(`${base}/api/health-check`); break; }
      catch { if (attempt >= 100 || child.exitCode !== null) throw new Error(`Fixture server failed: ${output}`); }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    for (const route of ["/api/admin/monthly-growth-reports/generate", validPublish]) {
      assert.equal((await fetch(base + route, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 401);
      assert.equal((await fetch(base + route, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer fixture-user" }, body: "{}" })).status, 403);
    }

    role = "super_admin";
    const headers = { "Content-Type": "application/json", Authorization: "Bearer fixture-admin" };
    const generate = await fetch(`${base}/api/admin/monthly-growth-reports/generate`, { method: "POST", headers, body: "{}" });
    assert.equal(generate.status, 409, "generation is disabled unless the release flag is explicitly enabled");
    const invalidMonth = await fetch(`${base}/api/admin/monthly-growth-reports/generate`, { method: "POST", headers, body: JSON.stringify({ month: "2026-13" }) });
    assert.equal(invalidMonth.status, 400);
    const invalidId = await fetch(`${base}/api/admin/monthly-growth-reports/not-a-uuid/publish`, { method: "POST", headers });
    assert.equal(invalidId.status, 400);
    const publish = await fetch(base + validPublish, { method: "POST", headers });
    assert.equal(publish.status, 409, "publishing is also disabled until the workflow flag is enabled");
    assert.equal(writes, 0, "default-off checks do not write report records or send notifications");

    monthlyReportingEnabled = true;
    const flags = await fetch(`${base}/api/admin/launch-flags`, { headers: { Authorization: "Bearer fixture-admin" } });
    assert.equal((await flags.json()).flags.monthly_reporting_workflow, true);
    const firstRun = await fetch(`${base}/api/admin/monthly-growth-reports/generate`, { method: "POST", headers, body: JSON.stringify({ month: "2026-10" }) });
    assert.deepEqual(await firstRun.json(), { success: true, month: "2026-10", eligible: 1, created: 1, alreadyExists: 0 });
    const retry = await fetch(`${base}/api/admin/monthly-growth-reports/generate`, { method: "POST", headers, body: JSON.stringify({ month: "2026-10" }) });
    assert.deepEqual(await retry.json(), { success: true, month: "2026-10", eligible: 1, created: 0, alreadyExists: 1 });
    const reviewed = await fetch(base + validPublish, { method: "POST", headers });
    const reviewedResult = await reviewed.json();
    assert.equal(reviewed.status, 200);
    assert.equal(reviewedResult.delivery, "customer dashboard only; no email sent");
    assert.equal(reviewedResult.report.notification_status, "dashboard_only");
    assert.deepEqual(rpcCalls, ["get_monthly_growth_report_source_data", "create_monthly_growth_report_draft", "get_monthly_growth_report_source_data", "create_monthly_growth_report_draft", "publish_monthly_growth_report"]);
  } finally {
    const closed = once(child, "exit");
    if (child.exitCode === null) { child.kill("SIGTERM"); await closed; }
    database.closeAllConnections();
    await new Promise<void>((resolve) => database.close(() => resolve()));
    await rmdir(cwd);
  }
});
