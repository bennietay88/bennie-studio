import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getConfirmedReviewObservation, appendRecipientReviewLink } from "../src/lib/salesAutomation.ts";
import { buildEmailTemplateDraft, hasUnresolvedEmailPlaceholders } from "../src/components/SuperAdmin/EmailTemplateHub.tsx";

const reviewUrl = "https://app.example.com/website-audit?report=00000000-0000-4000-8000-000000000001&key=secret";
const prospect = { name: "Example Dental", location: "London", preview_url: reviewUrl };
const finding = "No clear contact or booking action was found in the sampled page links";

test("confirmed audit evidence is used, not unverified assumptions", () => {
  assert.equal(getConfirmedReviewObservation({ findings: [
    { observation: "needs_review", priority: "high", whatWeFound: "Assumed UX failure" },
    { observation: "confirmed", priority: "medium", whatWeFound: finding },
  ] }), finding);
  assert.equal(getConfirmedReviewObservation({ findings: [
    { observation: "needs_review", whatWeFound: "We think something is wrong" },
  ] }), "");
});

test("new outreach drafts present verified findings without automatically exposing the audit link", () => {
  for (const templateId of ["enquiry", "portfolio", "services", "mobile", "booking", "follow-up"]) {
    const draft = buildEmailTemplateDraft(templateId, prospect, finding);
    assert.equal(draft.split(reviewUrl).length - 1, 0, templateId);
    assert.equal(hasUnresolvedEmailPlaceholders(draft), false, templateId);
    assert.match(draft, /No clear contact or booking action/);
  }
});

test("missing verified observation is blocked until a human records evidence", () => {
  const draft = buildEmailTemplateDraft("enquiry", prospect, "");
  assert.equal(hasUnresolvedEmailPlaceholders(draft), true);
  assert.match(draft, /add a specific, verified page or listing observation/);
  assert.doesNotMatch(draft, /website-audit\?/);
});

test("review link is not duplicated by repeated draft rendering", () => {
  const draft = buildEmailTemplateDraft("enquiry", prospect, finding);
  const first = appendRecipientReviewLink(draft, reviewUrl);
  assert.equal(first.split(reviewUrl).length - 1, 1);
  assert.equal(appendRecipientReviewLink(first, reviewUrl), first);
  assert.equal(appendRecipientReviewLink("Hello", "javascript:alert(1)"), "Hello");
});

test("prospect workflow loads evidence from an existing report but does not auto-insert report URL into the draft", () => {
  const ui = readFileSync("src/components/SuperAdmin/ProspectExplorer.tsx", "utf8");
  assert.match(ui, /getConfirmedReviewObservation\(payload\.report\)/);
  assert.match(ui, /\/api\/public\/website-audit\/jobs\/\$\{encodeURIComponent\(jobId\)\}/);
  assert.match(ui, /reviewCache\.current/);
  assert.match(ui, /buildEmailTemplateDraft/);
});
