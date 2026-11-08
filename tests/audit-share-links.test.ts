import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createAuditShareCode, isAuditShareCode, auditReportPath } from "../server/auditShareLinks.js";

test("128-bit review code is URL-safe and difficult to guess", () => {
  const codes = Array.from({ length: 500 }, () => createAuditShareCode());
  assert.equal(new Set(codes).size, codes.length);
  for (const code of codes) assert.ok(isAuditShareCode(code));
  for (const invalid of ["", "123", "../admin", "a".repeat(21), "a".repeat(23), "a".repeat(64)]) assert.equal(isAuditShareCode(invalid), false);
});

test("new reports use short branded paths; existing reports keep their working legacy URL", () => {
  const id = "00000000-0000-4000-8000-000000000123";
  const key = "a".repeat(64);
  const code = createAuditShareCode();
  assert.equal(auditReportPath({ id, payload: { reportAccessKey: key, shareCode: code } }), `/review/${code}`);
  assert.equal(auditReportPath({ id, payload: { reportAccessKey: key } }), `/website-audit?report=${id}&key=${key}`);
});

test("short review endpoint validates the code and never returns secret payload", () => {
  const api = readFileSync(new URL("../api/index.ts", import.meta.url), "utf8");
  const a = api.indexOf('app.get("/api/public/website-audit/shares/:code"');
  const b = api.indexOf('app.get("/api/public/website-audit/jobs/:jobId"', a);
  assert.ok(a > 0 && b > a);
  const route = api.slice(a, b);
  assert.match(route, /isAuditShareCode\(code\)/);
  assert.match(route, /\.contains\("payload", \{ shareCode: code \}\)/);
  assert.match(route, /Cache-Control", "private, no-store"/);
  assert.doesNotMatch(route, /res\.json\(job\)|payload: job\.payload|reportAccessKey:/);
});

test("new admin, public and email review links share the compact path helper", () => {
  const api = readFileSync(new URL("../api/index.ts", import.meta.url), "utf8");
  assert.match(api, /const reportUrl = `\$\{publicAppUrl\(\)\}\$\{auditReportPath\(job\)\}`/);
  assert.match(api, /reportUrl: auditReportPath\(job\)/);
  assert.match(api, /shareCode: createAuditShareCode\(\)/);
  assert.match(api, /const shareCode = createAuditShareCode\(\)/);
});
