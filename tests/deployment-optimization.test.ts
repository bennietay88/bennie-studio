import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
  assert.match(ci, /push:[\s\S]*?branches:[\s\S]*?- main[\s\S]*?- 'release-candidate\/\*\*'[\s\S]*?- 'design\/\*\*'[\s\S]*?- 'codex\/\*\*'/);
  assert.match(ci, /pull_request:/);
  assert.match(ci, /concurrency:[\s\S]*?cancel-in-progress:\s*true/);
  assert.match(ci, /jobs:\s*\n\s+verify:/);
  assert.match(ci, /outputs:[\s\S]*?code_changed:/);
  assert.match(ci, /code_changed=true/);
  assert.match(ci, /\(\^\|\/\)\[\^\/\]\+\\\.md\$/);
  assert.match(ci, /browser-e2e:[\s\S]*?needs:\s*verify/);
  assert.match(ci, /if:\s*\$\{\{ !cancelled\(\) && \(needs\.verify\.outputs\.code_changed == 'true'/);
});

test("the separate preview-order QA workflow is manual-only to avoid duplicate pushes", () => {
  assert.match(optionalQa, /workflow_dispatch:/);
  assert.doesNotMatch(optionalQa, /^\s+push:/m);
});
