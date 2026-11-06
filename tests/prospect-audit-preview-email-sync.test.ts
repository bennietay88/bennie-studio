import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getConfirmedReviewObservation, getConfirmedReviewInsight, appendRecipientReviewLink } from "../src/lib/salesAutomation.ts";
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
  const introduction = buildEmailTemplateDraft("introduction", prospect, finding);
  assert.match(introduction, /two specific edits/);
  assert.doesNotMatch(introduction, /practical improvement|https?:\/\//);
  const auditFollowUp = buildEmailTemplateDraft("audit-follow-up", prospect, finding);
  assert.match(auditFollowUp, /website-audit\?report=/);
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

test("audit inline insight selects verified issue with its corresponding fix, not a generic link", () => {
  const report = { findings: [
    { observation: "needs_review", priority: "high", whatWeFound: "Suspicious issue not yet verified", recommendation: "Do not use this" },
    { observation: "confirmed", priority: "medium", whatWeFound: "Service area is missing from the service page", recommendation: "List the towns served beside the enquiry action" },
    { observation: "confirmed", priority: "high", whatWeFound: "The main quote button is not visible on the homepage", recommendation: "Put a Request a Quote action beside the service headline" },
  ] };
  const insight = getConfirmedReviewInsight(report);
  assert.deepEqual(insight, {
    observation: "The main quote button is not visible on the homepage",
    recommendation: "Put a Request a Quote action beside the service headline",
  });
  const draft = buildEmailTemplateDraft("enquiry", prospect, insight!.observation, insight!.recommendation);
  assert.match(draft, /main quote button is not visible/);
  assert.match(draft, /Put a Request a Quote action beside the service headline/);
  assert.doesNotMatch(draft, /website-audit\?|https?:\/\//);
  assert.equal(getConfirmedReviewInsight({ findings: [
    { observation: "needs_review", whatWeFound: "This needs checking on the page", recommendation: "Make the contact path clearer" },
  ] }), null);
});

test("sequence enrollment composes stage-aware verified preview or honest portfolio drafts", () => {
  const api = readFileSync("api/index.ts", "utf8");
  assert.match(api, /body_text: followUpDraft\?\.body_text \|\| render\(step\.body_template\),/);
  assert.match(api, /resolveProspectFollowUpAsset\(entity\)/);
  assert.match(api, /renderProspectFollowUpStage\(/);
  assert.doesNotMatch(api, /Your website review: \$\{savedReview\}/);
  assert.match(api, /recommendation: body\.recommendation/);
});

test("prospect composer keeps the introduction simple and schedules three separately labelled follow-ups", () => {
  const ui = readFileSync("src/components/SuperAdmin/ProspectExplorer.tsx", "utf8");
  assert.match(ui, /getConfirmedReviewInsight/);
  assert.match(ui, /Review first email/);
  assert.doesNotMatch(ui, /Recommended fix \(included in the email\)/);
  assert.doesNotMatch(ui, /outreachRecommendation/);
  const operations = readFileSync("server/salesOperations.ts", "utf8");
  assert.match(operations, /directProspectFollowUp: true/);
  assert.match(operations, /\[3, 8, 15\] as const/);
  assert.match(operations, /delayHours: \[72, 120, 168\]\[i\]/);
  assert.doesNotMatch(ui, /prospect\.preview_url \? ` I prepared a quick preview here:/);
});
