import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ATOMIC_RATE_LIMIT_LUA,
  SharedAbuseProtection,
  getRateLimitClientIp,
  isSensitiveRateLimit,
} from "../server/sharedAbuseProtection.js";

const sample = {
  keyPrefix: "newsletter-ip-v1",
  identity: "198.51.100.23",
  max: 2,
  windowMs: 60_000,
  sensitive: true,
};

test("Redis script uses an atomic check/set/increment and TTL without extra requests", () => {
  assert.match(ATOMIC_RATE_LIMIT_LUA, /redis\.call\('SET', KEYS\[1\], 1, 'PX', window\)/);
  assert.match(ATOMIC_RATE_LIMIT_LUA, /redis\.call\('INCR', KEYS\[1\]\)/);
  assert.match(ATOMIC_RATE_LIMIT_LUA, /current >= quota/);
  assert.match(ATOMIC_RATE_LIMIT_LUA, /redis\.call\('PTTL'/);
});

test("shared counters enforce quotas across multiple simulated server instances", async () => {
  let count = 0;
  let calls = 0;
  let lastKey = "";
  const redis = {
    async eval(_script: string, keys: string[], args: (string | number)[]) {
      calls++;
      lastKey = keys[0];
      const max = Number(args[0]);
      if (count >= max) return [0, count, 5_000];
      return [1, ++count, 5_000];
    },
  };
  const a = new SharedAbuseProtection({ redis, hashSecret: "isolated-test-secret" });
  const b = new SharedAbuseProtection({ redis, hashSecret: "isolated-test-secret" });
  const results = await Promise.all([a.consume(sample), b.consume(sample), a.consume(sample)]);
  assert.deepEqual(results.map((r) => r.status), ["allowed", "allowed", "limited"]);
  assert.equal(calls, 3);
  assert.match(lastKey, /^bs:rate:v2:newsletter-ip-v1:[a-f0-9]{64}$/);
  assert.ok(!lastKey.includes(sample.identity));
});

test("memory fallback is bounded by time and tracks a separate identity", async () => {
  let now = 1_000;
  const limiter = new SharedAbuseProtection({ now: () => now });
  const result = await Promise.all([limiter.consume(sample), limiter.consume(sample), limiter.consume(sample)]);
  assert.deepEqual(result.map((r) => r.status), ["allowed", "allowed", "limited"]);
  assert.equal((await limiter.consume({ ...sample, identity: "203.0.113.2" })).status, "allowed");
  now += 61_000;
  assert.equal((await limiter.consume(sample)).status, "allowed");
});

test("a configured Redis outage blocks sensitive writes rather than reverting to per-instance memory", async () => {
  const redis = { async eval(): Promise<never> { throw new Error("private connection string must not leak"); } };
  const warnings: Array<{ message: string; context: Record<string, string> }> = [];
  const limiter = new SharedAbuseProtection({ redis, warn: (message, context) => warnings.push({ message, context }) });
  assert.deepEqual(await limiter.consume(sample), {
    status: "unavailable", source: "unavailable", remaining: 0, retryAfterMs: 30_000,
  });
  assert.equal((await limiter.consume({ ...sample, keyPrefix: "public-pricing", sensitive: false })).source, "memory");
  assert.equal(warnings.length, 2);
  assert.equal(JSON.stringify(warnings).includes("private connection"), false);
});

test("strict rollout blocks sensitive writes even when Redis credentials are absent", async () => {
  const strict = new SharedAbuseProtection({ requireShared: true });
  assert.equal((await strict.consume(sample)).status, "unavailable");
  assert.equal((await strict.consume({ ...sample, keyPrefix: "public-pricing", sensitive: false })).status, "allowed");
});

test("allowlisted sensitive prefixes separate newsletter, checkout and ordinary reads", () => {
  for (const prefix of [
    "newsletter-ip-v1", "newsletter-address-v1", "platform-leads-burst-v3",
    "preview-intake-lead-v3", "public-plan-checkout", "preview-checkout-email",
    "public-funnel-submit", "call-bookings", "seo-audit", "public-proposal-accept",
  ]) assert.equal(isSensitiveRateLimit(prefix), true, prefix);
  for (const prefix of ["public-pricing", "public-studio-showcases", "admin-leads", "preview-checkout-status", "public-funnel-checkout-status"]) {
    assert.equal(isSensitiveRateLimit(prefix), false, prefix);
  }
});

test("forwarded headers are only trusted for Vercel requests and invalid addresses are ignored", () => {
  const request = {
    headers: { "x-forwarded-for": "198.51.100.7, 203.0.113.3" },
    socket: { remoteAddress: "192.0.2.20" },
  };
  assert.equal(getRateLimitClientIp(request, true), "198.51.100.7");
  assert.equal(getRateLimitClientIp(request, false), "192.0.2.20");
  assert.equal(getRateLimitClientIp({ headers: { "x-forwarded-for": "not-an-ip" }, socket: { remoteAddress: "::ffff:192.0.2.3" } }, true), "192.0.2.3");
});

test("API uses the common middleware and never invokes legacy incr/expire across multiple requests", () => {
  const api = readFileSync("api/index.ts", "utf8");
  assert.match(api, /new SharedAbuseProtection/);
  assert.match(api, /abuseProtection\.consume/);
  assert.match(api, /result\.status === "unavailable"/);
  assert.doesNotMatch(api, /redis\.incr\(/);
  assert.doesNotMatch(api, /redis\.expire\(/);
});
