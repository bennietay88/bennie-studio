import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyResendSendError,
  emailProviderStatus,
  hostingerConfiguration,
  selectEmailProvider,
  sendHostingerMail,
} from "../server/emailProviders.js";

test("Hostinger config requires a complete mailbox identity", () => {
  const missing = hostingerConfiguration({ HOSTINGER_SMTP_USER: "hello@example.com", HOSTINGER_SMTP_PORT: "465" });
  assert.equal(missing.configured, false);
  const ready = hostingerConfiguration({
    HOSTINGER_SMTP_USER: "hello@example.com",
    HOSTINGER_SMTP_PASSWORD: "test-not-a-real-password",
    HOSTINGER_FROM_EMAIL: "hello@example.com",
    HOSTINGER_SMTP_PORT: "587",
  });
  assert.equal(ready.configured, true);
  assert.equal(ready.port, 587);
  assert.equal(hostingerConfiguration({
    HOSTINGER_SMTP_USER: "hello@example.com", HOSTINGER_SMTP_PASSWORD: "testing",
    HOSTINGER_FROM_EMAIL: "other@example.com", HOSTINGER_SMTP_PORT: "465",
  }).configured, false);
});

test("provider selector fails safe to Resend and never auto rotates", () => {
  assert.equal(selectEmailProvider("hostinger"), "hostinger");
  assert.equal(selectEmailProvider("unexpected"), "resend");
  assert.equal(selectEmailProvider(undefined), "resend");
});

test("provider status does not disclose credentials", () => {
  const data = emailProviderStatus({
    RESEND_API_KEY: "re_test_secret", RESEND_FROM_EMAIL: "hello@example.com",
    HOSTINGER_SMTP_USER: "hello@example.com", HOSTINGER_SMTP_PASSWORD: "some-password",
  });
  assert.equal(data.hostinger.configured, true);
  assert.equal(JSON.stringify(data).includes("some-password"), false);
  assert.equal(JSON.stringify(data).includes("re_test_secret"), false);
});

test("Resend classifications distinguish quotas, auth and sender problems", () => {
  assert.equal(classifyResendSendError({ statusCode: 429, name: "rate_limit_exceeded" }).category, "throttled");
  assert.equal(classifyResendSendError({ statusCode: 403, name: "daily_limit_exceeded" }).category, "quota");
  assert.equal(classifyResendSendError({ statusCode: 401, name: "invalid_api_key" }).category, "authentication");
  assert.equal(classifyResendSendError({ statusCode: 403, name: "domain_not_verified" }).category, "sender");
});

test("Hostinger cannot send without a distributed quota claim; never contacts SMTP", async () => {
  const env = {
    HOSTINGER_SMTP_USER: "hello@example.com",
    HOSTINGER_SMTP_PASSWORD: "fake-password",
    HOSTINGER_SMTP_PORT: "465",
  };
  await assert.rejects(() => sendHostingerMail({
    to: "recipient@example.com", subject: "Test", html: "<p>Test</p>",
  }, env), /EMAIL_QUOTA_TRACKER_UNAVAILABLE/);
  let reserved = false;
  await assert.rejects(() => sendHostingerMail({
    to: "recipient@example.com", subject: "Test", html: "<p>Test</p>",
  }, env, async () => { reserved = true; return false; }), /EMAIL_RATE_LIMITED/);
  assert.equal(reserved, true);
});
