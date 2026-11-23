import assert from "node:assert/strict";
import test from "node:test";
import { shouldRetryAsyncJobFailure } from "../server/jobQueue.js";

const websiteJob = { job_type: "website_audit" as const, attempts: 1, max_attempts: 3 };

test("website audit never retries permanent denied, missing or invalid targets", () => {
  for (const code of [400, 401, 403, 404, 410, 422]) {
    assert.equal(shouldRetryAsyncJobFailure(websiteJob, code), false, `HTTP ${code} must be terminal`);
  }
});

test("website audit retries transient upstream responses and transport failures within budget", () => {
  for (const code of [429, 500, 503, undefined]) {
    assert.equal(shouldRetryAsyncJobFailure(websiteJob, code), true, `HTTP ${code ?? "network"} may be retried`);
  }
});

test("jobs never retry beyond configured attempt limit", () => {
  assert.equal(shouldRetryAsyncJobFailure({ ...websiteJob, attempts: 3 }, 503), false);
  assert.equal(shouldRetryAsyncJobFailure({ ...websiteJob, attempts: 4 }, undefined), false);
});

test("other asynchronous jobs preserve existing bounded retry policy", () => {
  const seoJob = { job_type: "seo_audit" as const, attempts: 1, max_attempts: 2 };
  assert.equal(shouldRetryAsyncJobFailure(seoJob, 422), true);
  assert.equal(shouldRetryAsyncJobFailure({ ...seoJob, attempts: 2 }, 503), false);
});
