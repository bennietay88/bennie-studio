import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EMAIL_TEMPLATES, buildEmailTemplateDraft, hasUnresolvedEmailPlaceholders } from "../src/components/SuperAdmin/EmailTemplateHub.tsx";

const prospect = { name: "Example Services", location: "Kuala Lumpur", contact_first_name: "Alex" };
const finding = "the main contact button is missing from the service detail page";

test("prospect library covers the full reply-to-conversion journey", () => {
  assert.ok(EMAIL_TEMPLATES.length >= 16);
  const ids = EMAIL_TEMPLATES.map((template) => template.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ["introduction", "audit-follow-up", "enquiry", "portfolio", "services", "mobile", "no-site", "managed", "booking", "local", "trust", "pricing-clarity", "location", "follow-up", "follow-up-last", "interested", "call", "proposal"]) {
    assert.ok(ids.includes(id), id);
  }
});

test("first contact templates ask one concrete reply question without unsupported performance claims", () => {
  for (const template of EMAIL_TEMPLATES.filter((item) => item.stage === "First contact")) {
    const draft = buildEmailTemplateDraft(template.id, prospect, finding);
    assert.match(draft, /Alex/);
    assert.match(draft, /Example Services/);
    const messageBody = draft.slice(draft.indexOf("\n\n") + 2);
    assert.ok((messageBody.match(/\?/g) || []).length === 1, template.id);
    if (template.id === "introduction") {
      assert.match(messageBody, /Bennie Studio/);
      assert.match(messageBody, /short website review/);
      assert.doesNotMatch(messageBody, /the main contact button|practical improvement/i);
    } else {
      assert.match(draft, /the main contact button/);
    }
    assert.doesNotMatch(draft, /reply stop|no.obligation|no pressure|not a priority/i);
    assert.ok(draft.length < 520, template.id);
    assert.doesNotMatch(draft, /guarantee|double your leads|100% growth/i);
    assert.equal(hasUnresolvedEmailPlaceholders(draft), false, template.id);
  }
});

test("the audit follow-up is a separate, delayed message with the prepared review link", () => {
  const draft = buildEmailTemplateDraft("audit-follow-up", { ...prospect, preview_url: "https://app.bennietay.com/website-audit?report=abc&key=secret" }, finding);
  assert.match(draft, /website-audit\?report=abc&key=secret/);
  assert.match(draft, /short website review/);
  assert.equal(hasUnresolvedEmailPlaceholders(draft), false);
});

test("follow-ups offer an explicit close-out option", () => {
  for (const id of ["follow-up", "follow-up-last"]) {
    const draft = buildEmailTemplateDraft(id, prospect, finding);
    assert.match(draft, /change|fix|recommended first/i);
    assert.doesNotMatch(draft, /https?:\/\//i);
    assert.doesNotMatch(draft, /reply stop|no.obligation/i);
    assert.equal(hasUnresolvedEmailPlaceholders(draft), false);
  }
});

test("unverified observations and personalisation are never presented as finished drafts", () => {
  const missingEvidence = buildEmailTemplateDraft("mobile", prospect, "");
  assert.equal(hasUnresolvedEmailPlaceholders(missingEvidence), true);
  const personalReply = buildEmailTemplateDraft("interested", prospect, finding);
  assert.equal(hasUnresolvedEmailPlaceholders(personalReply), true);
});

test("Singapore advertising subject prefix remains intact", () => {
  const draft = buildEmailTemplateDraft("enquiry", { ...prospect, location: "Singapore" }, finding);
  assert.match(draft, /^Subject: <ADV> /);
});

test("reply-to-sale messages ask for a call or a concrete proposal decision", () => {
  assert.match(buildEmailTemplateDraft("interested", prospect, finding), /15 minutes/);
  assert.match(buildEmailTemplateDraft("proposal", prospect, finding), /proceed/);
  assert.match(buildEmailTemplateDraft("call", prospect, finding), /booked discussion/);
});

test("sending layer retains one-click unsubscribe without repeating it in prospect copy", () => {
  const api = readFileSync("api/index.ts", "utf8");
  assert.match(api, /"List-Unsubscribe"/);
  assert.match(api, /Stop receiving these emails: \$\{unsubscribeUrl\}/);
  for (const item of EMAIL_TEMPLATES) {
    assert.doesNotMatch(item.body, /reply stop|unsubscribe|opt.?out/i, item.id);
  }
});

test("verified actionable recommendation is included directly instead of linking to a report", () => {
  const recommendation = "Put a Request a Quote button beside the main service description";
  const draft = buildEmailTemplateDraft("enquiry", prospect, finding, recommendation);
  assert.match(draft, /Put a Request a Quote button beside the main service description/);
  assert.match(draft, /the main contact button is missing/);
  assert.match(draft, /scope and price/i);
  assert.doesNotMatch(draft, /https?:\/\/|website-audit\?|homepage concept|send you the review/i);
});

test("default recommendations remain useful when only a verified observation exists", () => {
  const draft = buildEmailTemplateDraft("mobile", prospect, finding);
  assert.match(draft, /easy to tap/i);
  assert.equal(hasUnresolvedEmailPlaceholders(draft), false);
});
