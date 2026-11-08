import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const api = readFileSync(new URL("../api/index.ts", import.meta.url), "utf8");
const jobQueue = readFileSync(new URL("../server/jobQueue.ts", import.meta.url), "utf8");

test("audit cron dispatches bounded independent workers and never runs inline Promise.all", () => {
  const start = api.indexOf('app.get("/api/cron/website-audits"');
  const end = api.indexOf('app.get("/api/public/website-audit/jobs/:jobId"', start);
  assert.ok(start > 0 && end > start);
  const cron = api.slice(start, end);
  assert.match(cron, /\.limit\(4\)/);
  assert.match(cron, /Promise\.allSettled/);
  assert.match(cron, /AbortSignal\.timeout\(40_000\)/);
  assert.doesNotMatch(cron, /await processQueuedJob\(/);
  assert.match(cron, /\.eq\("locked_at", staleJob\.locked_at\)/);
  assert.match(cron, /exhaustedStaleJobs/);
});

test("the cron worker only accepts a website audit with a cron authorization token", () => {
  const start = api.indexOf('app.post("/api/cron/website-audit-worker"');
  const end = api.indexOf('app.get("/api/cron/website-audits"', start);
  assert.ok(start > 0 && end > start);
  const worker = api.slice(start, end);
  assert.match(worker, /req\.headers\.authorization/);
  assert.match(worker, /candidate\.job_type !== "website_audit"/);
  assert.match(worker, /processQueuedJob\(body\.jobId\)/);
});

test("lease tokens guard claims and completion against old executions", () => {
  assert.match(jobQueue, /\.eq\("attempts", candidate\.attempts\)/);
  assert.match(jobQueue, /\.eq\("run_after", candidate\.run_after\)/);
  assert.match(jobQueue, /JOB_LEASE_LOST/);
  assert.match(jobQueue, /\.eq\("locked_by", workerId\)/);
  assert.match(jobQueue, /\.eq\("locked_by", job\.locked_by\)/);
  assert.match(api, /crypto\.randomUUID\(\)/);
  assert.match(api, /completeAsyncJob\(supabaseAdmin, job\.id, result, job\.locked_by\)/);
});

test("website audit fetch has a bounded overall redirect budget", () => {
  assert.match(api, /const totalBudgetMs = 16_000/);
  assert.match(api, /Math\.min\(5_000, remainingMs\)/);
});

test("production public asynchronous audit is dispatched outside the HTTP request", () => {
  const start = api.indexOf('app.post(\n    "/api/public/website-audit"');
  const end = api.indexOf('app.post(\n    "/api/admin/prospects/:prospectId/website-review"', start);
  assert.ok(start > 0 && end > start);
  const route = api.slice(start, end);
  assert.match(route, /waitUntil\(workerPromise\)/);
  assert.match(route, /inlineTestFallback/);
  assert.match(route, /status !== "completed" && !existing \? 202 : 200/);
});
