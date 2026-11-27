import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
const ci = readFileSync(".github/workflows/ci.yml", "utf8");
const optionalQa = readFileSync(".github/workflows/feature-preview-order-qa.yml", "utf8");

test("Vercel only builds authorized main and release-candidate branches", () => {
  assert.deepEqual(vercel.git.deploymentEnabled, {
    "**": false,
    main: true,
    "release-candidate/**": true,
  });
  assert.deepEqual(vercel.crons.map((cron: { path: string }) => cron.path), [
    "/api/cron/sales-automation",
    "/api/internal/billing/process-cancellations",
    "/api/cron/website-audits",
  ]);
  assert.ok(vercel.routes.some((route: { src?: string }) => route.src === "^/api(?:/(.*))?$"));
});

test("GitHub CI runs required checks for release, design, and Codex branches", () => {
  assert.match(ci, /workflow_dispatch:/);
  assert.match(ci, /push:[\s\S]*?branches:[\s\S]*?- main[\s\S]*?- 'release-candidate\/\*\*'[\s\S]*?- 'design\/\*\*'[\s\S]*?- 'codex\/\*\*'/);
  assert.match(ci, /pull_request:/);
  assert.match(ci, /concurrency:[\s\S]*?cancel-in-progress:\s*true/);
  assert.match(ci, /jobs:\s*\n\s+verify:/);
  assert.match(ci, /outputs:[\s\S]*?code_changed:/);
  assert.match(ci, /node scripts\/ci-scope\.mjs/);
  assert.match(ci, /git diff --no-renames --name-only/);
  const classify = (paths: string) => {
    const result = spawnSync(process.execPath, ["scripts/ci-scope.mjs"], { input: paths, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return Object.fromEntries(result.stdout.trim().split("\n").map(line => line.split("=")));
  };
  assert.equal(classify("README.md\n").code_changed, "false");
  assert.equal(classify("src/styles/demoDesigns.css\n").browser_scope, "portfolio");
  for (const paths of ["", "__full_regression__\n", "api/index.ts\n", "src/lib/permissions.ts\n", "src/styles/demoDesigns.css\npackage-lock.json\n"]) {
    const scope = classify(paths);
    assert.equal(scope.code_changed, "true");
    assert.equal(scope.browser_scope, "full");
    assert.deepEqual(JSON.parse(scope.matrix), [1,2,3,4]);
  }
  const shard = ci.split("\n  browser-e2e-shard:\n")[1]?.split("\n  browser-e2e:\n")[0] || "";
  assert.match(shard, /needs:\s*verify/);
  assert.match(shard, /if: needs\.verify\.result == 'success' && needs\.verify\.outputs\.code_changed == 'true'/);
  assert.match(shard, /--project=chromium-desktop --project=mobile-chromium --shard=/);
  const gate = ci.split("\n  browser-e2e:\n")[1]?.split("\n  multi-site-sql:\n")[0] || "";
  assert.match(gate, /needs: \[verify, browser-e2e-shard\]/);
  assert.match(gate, /test "\$VERIFY" = success/);
  assert.match(gate, /test "\$BROWSER" = success/);
  assert.match(ci, /schedule:\s*\n\s*-\s*cron:/);
});

test("the separate preview-order QA workflow is manual-only to avoid duplicate pushes", () => {
  assert.match(optionalQa, /workflow_dispatch:/);
  assert.doesNotMatch(optionalQa, /^\s+push:/m);
});
