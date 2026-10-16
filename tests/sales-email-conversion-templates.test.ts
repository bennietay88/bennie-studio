import test from "node:test";
import assert from "node:assert/strict";
import { EMAIL_TEMPLATES, buildEmailTemplateDraft, hasUnresolvedEmailPlaceholders } from "../src/components/SuperAdmin/EmailTemplateHub.tsx";

const prospect = { name: "Example Services", location: "Kuala Lumpur", contact_first_name: "Alex" };
const finding = "the main contact button is missing from the service detail page";

test("prospect library covers the full reply-to-conversion journey", () => {
  assert.ok(EMAIL_TEMPLATES.length >= 16);
  const ids = EMAIL_TEMPLATES.map((template) => template.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ["enquiry", "portfolio", "services", "mobile", "no-site", "managed", "booking", "local", "trust", "pricing-clarity", "location", "follow-up", "follow-up-last", "interested", "call", "proposal"]) {
    assert.ok(ids.includes(id), id);
  }
});

test("first contact templates ask one concrete reply question without unsupported performance claims", () => {
  for (const template of EMAIL_TEMPLATES.filter((item) => item.stage === "First contact")) {
    const draft = buildEmailTemplateDraft(template.id, prospect, finding);
    assert.match(draft, /Alex/);
    assert.match(draft, /Example Services/);
    assert.match(draft, /the main contact button/);
    const messageBody = draft.slice(draft.indexOf("\n\n") + 2);
    assert.ok((messageBody.match(/\?/g) || []).length === 1, template.id);
    assert.match(draft, /reply stop/i);
    assert.doesNotMatch(draft, /guarantee|double your leads|100% growth/i);
    assert.equal(hasUnresolvedEmailPlaceholders(draft), false, template.id);
  }
});

test("follow-ups offer an explicit close-out option", () => {
  for (const id of ["follow-up", "follow-up-last"]) {
    const draft = buildEmailTemplateDraft(id, prospect, finding);
    assert.match(draft, /close/i);
    assert.match(draft, /reply stop/i);
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
