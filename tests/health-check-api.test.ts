import assert from "node:assert/strict";
import test from "node:test";
import { createServer, type Server } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";

const listen = async (server: Server) => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return (server.address() as { port: number }).port;
};

async function startApi(extraEnv: Record<string, string> = {}) {
  const portProbe = createServer();
  const port = await listen(portProbe);
  await new Promise<void>((resolve) => portProbe.close(() => resolve()));
  const cwd = await mkdtemp(path.join(tmpdir(), "bennie-health-api-"));
  const child: ChildProcess = spawn(process.execPath, [path.resolve("dist/server.cjs")], {
    cwd,
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      PORT: String(port),
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout?.on("data", (chunk) => { output += chunk; });
  child.stderr?.on("data", (chunk) => { output += chunk; });
  const base = `http://127.0.0.1:${port}`;

  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(`${base}/api/health-check`, { signal: AbortSignal.timeout(2000) });
      return { child, cwd, base, output: () => output, firstResponse: response };
    } catch {
      if (attempt >= 120 || child.exitCode !== null) {
        if (child.exitCode === null) child.kill("SIGTERM");
        await rmdir(cwd).catch(() => undefined);
        throw new Error(`API fixture did not start: ${output}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}

async function stopApi(child: ChildProcess, cwd: string) {
  if (child.exitCode === null && child.signalCode === null) {
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    await exited;
  }
  await rmdir(cwd);
}

test("health endpoint reports healthy, missing, invalid and unavailable Supabase states without leaking secrets", { timeout: 60000 }, async (t) => {
  await t.test("healthy configuration checks the database and keeps protected APIs authenticated", async () => {
    const db = createServer((_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Range", "0-0/*");
      res.end("[]");
    });
    const dbPort = await listen(db);
    const api = await startApi({
      VITE_SUPABASE_URL: `http://127.0.0.1:${dbPort}`,
      VITE_SUPABASE_ANON_KEY: "fixture-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "fixture-service-key",
    });
    try {
      assert.equal(api.firstResponse.status, 200);
      const body = await api.firstResponse.json();
      assert.equal(body.status, "ok");
      assert.match(body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
      assert.deepEqual(body.dependencies, { supabase: "ok" });
      const protectedStatus = await fetch(`${api.base}/api/system/status`);
      assert.equal(protectedStatus.status, 401, "protected administrative API still requires authentication");
    } finally {
      await stopApi(api.child, api.cwd);
      db.closeAllConnections();
      await new Promise<void>((resolve) => db.close(() => resolve()));
    }
  });

  await t.test("missing configuration starts the API but reports 503", async () => {
    const api = await startApi();
    try {
      const body = await api.firstResponse.json();
      assert.equal(api.firstResponse.status, 503);
      assert.equal(body.status, "degraded");
      assert.equal(body.code, "SUPABASE_CONFIGURATION_MISSING");
      assert.deepEqual(body.missingEnvironment.sort(), [
        "SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_ANON_KEY", "VITE_SUPABASE_URL",
      ]);
      assert.match(api.output(), /supabase_server_configuration_unavailable/);
    } finally {
      await stopApi(api.child, api.cwd);
    }
  });

  await t.test("malformed URL is sanitized and does not expose supplied keys", async () => {
    const anonSecret = "anon-secret-marker";
    const serviceSecret = "service-secret-marker";
    const api = await startApi({
      VITE_SUPABASE_URL: "this is not a URL",
      VITE_SUPABASE_ANON_KEY: anonSecret,
      SUPABASE_SERVICE_ROLE_KEY: serviceSecret,
    });
    try {
      const bodyText = await api.firstResponse.text();
      assert.equal(api.firstResponse.status, 503);
      assert.deepEqual(JSON.parse(bodyText).invalidEnvironment, ["VITE_SUPABASE_URL"]);
      assert.doesNotMatch(bodyText + api.output(), /anon-secret-marker|service-secret-marker|this is not a URL/);
    } finally {
      await stopApi(api.child, api.cwd);
    }
  });

  await t.test("E2E health fixtures do not contact external Supabase projects", async () => {
    const api = await startApi({ E2E_TEST: "true" });
    try {
      const body = await api.firstResponse.json();
      assert.equal(api.firstResponse.status, 200);
      assert.equal(body.status, "ok");
      assert.deepEqual(body.dependencies, { supabase: "test-fixture" });
    } finally {
      await stopApi(api.child, api.cwd);
    }
  });

  await t.test("unavailable database returns a sanitized 503 rather than healthy", async () => {
    const portProbe = createServer();
    const unavailablePort = await listen(portProbe);
    await new Promise<void>((resolve) => portProbe.close(() => resolve()));
    const api = await startApi({
      VITE_SUPABASE_URL: `http://127.0.0.1:${unavailablePort}`,
      VITE_SUPABASE_ANON_KEY: "fixture-anon-secret-marker",
      SUPABASE_SERVICE_ROLE_KEY: "fixture-service-secret-marker",
    });
    try {
      const bodyText = await api.firstResponse.text();
      assert.equal(api.firstResponse.status, 503);
      assert.deepEqual(JSON.parse(bodyText), {
        status: "degraded",
        code: "SUPABASE_UNAVAILABLE",
        dependency: "supabase",
        timestamp: JSON.parse(bodyText).timestamp,
      });
      assert.doesNotMatch(bodyText + api.output(), /fixture-anon-secret-marker|fixture-service-secret-marker/);
    } finally {
      await stopApi(api.child, api.cwd);
    }
  });

  await t.test("rejected Supabase credentials return an actionable config status without echoing credentials", async () => {
    const db = createServer((_req, res) => {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ message: "Invalid API key" }));
    });
    const dbPort = await listen(db);
    const anonSecret = "invalid-anon-secret-marker";
    const serviceSecret = "invalid-service-secret-marker";
    const api = await startApi({
      VITE_SUPABASE_URL: `http://127.0.0.1:${dbPort}`,
      VITE_SUPABASE_ANON_KEY: anonSecret,
      SUPABASE_SERVICE_ROLE_KEY: serviceSecret,
    });
    try {
      const bodyText = await api.firstResponse.text();
      assert.equal(api.firstResponse.status, 503);
      assert.equal(JSON.parse(bodyText).code, "SUPABASE_CREDENTIALS_REJECTED");
      assert.doesNotMatch(bodyText + api.output(), /invalid-anon-secret-marker|invalid-service-secret-marker/);
    } finally {
      await stopApi(api.child, api.cwd);
      db.closeAllConnections();
      await new Promise<void>((resolve) => db.close(() => resolve()));
    }
  });
});
