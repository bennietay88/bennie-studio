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

// Executes the actual compiled Express routes, never the production database.
// A clean cwd and explicit env keep dotenv and provider credentials isolated.
test("sales API rejects unauthorized callers and malformed privileged actions", { timeout: 20000 }, async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  let role = "business_admin";
  let writes = 0;
  const database = createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    if (req.method !== "GET") writes++;
    if (req.url?.startsWith("/auth/v1/user")) return res.end(JSON.stringify({ id, email: "fixture@example.test" }));
    if (req.url?.startsWith("/rest/v1/profiles")) return res.end(JSON.stringify({ id, role, staff_permissions: [] }));
    res.end("[]");
  });
  const dbPort = await listen(database);
  const portProbe = createServer();
  const port = await listen(portProbe);
  await new Promise<void>((resolve) => portProbe.close(() => resolve()));
  const cwd = await mkdtemp(path.join(tmpdir(), "bennie-sales-api-test-"));
  const child = spawn(process.execPath, [path.resolve("dist/server.cjs")], {
    cwd,
    env: {
      PATH: process.env.PATH, NODE_ENV: "production", HOST: "127.0.0.1", PORT: String(port),
      VITE_SUPABASE_URL: `http://127.0.0.1:${dbPort}`, VITE_SUPABASE_ANON_KEY: "fixture-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "fixture-service-key", CRON_SECRET: "fixture-cron-secret",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const base = `http://127.0.0.1:${port}`;
  const paths = [
    ["POST", "/api/admin/prospects/import"], ["POST", `/api/admin/prospects/${id}/outreach`],
    ["POST", "/api/admin/sales-preview-intake"], ["POST", "/api/admin/sales-preview-site"],
    ["POST", "/api/admin/sales-automation/enroll"], ["POST", "/api/admin/sales-automation/run"],
    ["POST", `/api/admin/sales-automation/messages/${id}/approve`], ["PATCH", `/api/admin/sales-automation/bookings/${id}`],
  ];
  try {
    for (let attempt = 0; ; attempt++) {
      try { await fetch(`${base}/api/cron/sales-automation`); break; }
      catch { if (attempt >= 100 || child.exitCode !== null) throw new Error(`Fixture server failed: ${output}`); }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    for (const [method, route] of paths) {
      const unauthorized = await fetch(base + route, { method, headers: { "Content-Type": "application/json" }, body: "{}" });
      assert.equal(unauthorized.status, 401, `No token: ${route}`);
      const customer = await fetch(base + route, { method, headers: { "Content-Type": "application/json", Authorization: "Bearer fixture-user" }, body: "{}" });
      assert.equal(customer.status, 403, `Customer role: ${route}`);
    }
    assert.equal((await fetch(`${base}/api/cron/sales-automation`)).status, 401);
    role = "super_admin";
    for (const [method, route] of paths.filter(([, route]) => !route.endsWith("/run"))) {
      const response = await fetch(base + route, { method, headers: { "Content-Type": "application/json", Authorization: "Bearer fixture-admin" }, body: JSON.stringify({ csv: 'name,email\nExample,invalid', bodyText: "" }) });
      assert.equal(response.status, 400, `Invalid action: ${route}`);
    }
    const worker = await fetch(`${base}/api/cron/sales-automation`, { headers: { Authorization: "Bearer fixture-cron-secret" } });
    assert.equal(worker.status, 200);
    assert.equal((await worker.json()).sent, 0);
    assert.equal(writes, 0, "No database writes or outbound messages during boundary checks");
  } finally {
    const closed = once(child, "exit");
    if (child.exitCode === null) { child.kill("SIGTERM"); await closed; }
    database.closeAllConnections();
    await new Promise<void>((resolve) => database.close(() => resolve()));
    await rmdir(cwd);
  }
});
