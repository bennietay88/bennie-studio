import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  getEditableProspectTemplate, PORTFOLIO_URL, PROSPECT_EMAIL_TEMPLATE_DEFINITIONS,
  renderProspectEmailTemplate, validateProspectEmailTemplate,
} from "../src/lib/prospectOutreachTemplates.ts";
import { renderProspectFollowUpStage, renderProspectInitialEmail } from "../server/salesOperations.ts";

const noSite = { name: "American Carpentry NC LLC", website_status: "no_website", domain: null };
const existing = { name: "Example Dental", website_status: "weak", domain: "example.org" };

test("all nine editable templates have valid, supported variables", () => {
  assert.equal(PROSPECT_EMAIL_TEMPLATE_DEFINITIONS.length, 9);
  for (const definition of PROSPECT_EMAIL_TEMPLATE_DEFINITIONS) {
    assert.equal(validateProspectEmailTemplate(definition.id, definition.defaultTemplate), null, definition.id);
  }
});

test("saved no-website Day 3 template changes the email used by the sender", () => {
  const key = "day3_portfolio_no_site";
  const overrides = {
    [key]: {
      subject: "Following up — {{business_name}}",
      body: "Hi {{first_name}},\n\nHere is our work: {{portfolio_url}}\n\nWould you like to chat?",
    },
  };
  const rendered = renderProspectFollowUpStage(noSite, 1, null, overrides);
  assert.equal(rendered.subject, "Following up — American Carpentry NC LLC");
  assert.match(rendered.body_text, /Here is our work: https:\/\/app\.bennietay\.com\/portfolio/);
  assert.doesNotMatch(rendered.body_text, /\{\{|\}\}/);
  assert.doesNotMatch(rendered.body_text, /I reviewed|your existing website/i);
});

test("review and personalized redesign retain verified asset links", () => {
  const review = renderProspectFollowUpStage({
    ...existing,
    notes: "Verified website observation: The contact form is difficult to find on mobile.",
  }, 1, { kind: "audit", url: "https://app.bennietay.com/website-audit?report=xyz&key=key" });
  assert.match(review.body_text, /website-audit\?report=/);
  const withoutEvidence = renderProspectFollowUpStage(existing, 1, {kind:"audit",url:"https://app.bennietay.com/website-audit?report=xyz&key=key"});
  assert.doesNotMatch(withoutEvidence.body_text, /I reviewed|website-audit\?report=/);
  const design = renderProspectFollowUpStage(existing, 1, { kind: "design", url: "https://app.bennietay.com/preview/prospect/concept_123456" });
  assert.match(design.body_text, /preview\/prospect\/concept_123456/);
  assert.doesNotMatch(design.body_text, /\{\{/);
});

test("custom Day 8 and final variants override sent email copy for the correct prospect", () => {
  const customized = {
    day8_no_site: { subject: "Options for {{business_name}}", body: "Hi {{first_name}},\n\nWe can help with setup and maintenance." },
    day15_existing: { subject: "One last note — {{business_name}}", body: "Hi {{first_name}},\n\nThis is my final check-in." },
  };
  assert.equal(renderProspectFollowUpStage(noSite, 2, null, customized).subject, "Options for American Carpentry NC LLC");
  assert.equal(renderProspectFollowUpStage(existing, 3, null, customized).subject, "One last note — Example Dental");
  assert.notEqual(renderProspectFollowUpStage(existing, 2, null, customized).subject, customized.day8_no_site.subject);
});

test("initial email is editable for first-message previews", () => {
  const rendered = renderProspectInitialEmail(noSite, {
    intro: { subject: "Hello {{business_name}}", body: "Hi {{first_name}},\n\nI'd like to introduce Bennie Studio." },
  });
  assert.equal(rendered.subject, "Hello American Carpentry NC LLC");
  assert.match(rendered.body_text, /introduce Bennie Studio/);
});

test("invalid and incomplete templates cannot override safe defaults", () => {
  const missingAsset = { subject: "Review", body: "Hi, here is the report" };
  assert.match(validateProspectEmailTemplate("day3_audit", missingAsset) || "", /asset_url/);
  const unknown = { subject: "Hello {{unapproved}}", body: "Hi" };
  assert.match(validateProspectEmailTemplate("day8_no_site", unknown) || "", /Unsupported variable/);
  const fallback = renderProspectEmailTemplate("day3_audit", {
    first_name: "Alex", business_name: "Example", asset_url: "https://app.bennietay.com/website-audit?report=x&key=y",
  }, { day3_audit: missingAsset });
  assert.match(fallback.body_text, /https:\/\/app\.bennietay\.com\/website-audit/);
});

test("admin editor and authenticated endpoints are connected to the real delivery engine", () => {
  const api = readFileSync("api/index.ts", "utf8");
  const sales = readFileSync("server/salesOperations.ts", "utf8");
  const home = readFileSync("src/components/SuperAdmin/SalesHome.tsx", "utf8");
  const prospect = readFileSync("src/components/SuperAdmin/ProspectExplorer.tsx", "utf8");
  assert.match(api, /app\.patch\("\/api\/admin\/sales-automation\/templates", authenticate/);
  assert.match(api, /validateProspectEmailTemplate/);
  assert.match(api, /renderProspectInitialEmail/);
  assert.match(sales, /loadProspectEmailOverrides\(db\)/);
  assert.match(sales, /enrollment\.outreach_sequences\?\.settings\?\.emailTemplateOverrides/);
  assert.match(home, /<ProspectEmailTemplateEditor/);
  assert.match(prospect, /\/api\/admin\/sales-automation\/templates/);
  assert.match(prospect, /personalizedIntro\(prospect, currentIntroOverrides\)/);
});

test("portfolio URL remains available for safe prospect fallbacks", () => {
  const template = getEditableProspectTemplate("day3_portfolio_no_site");
  assert.ok(template.body.includes("{{portfolio_url}}"));
  assert.match(renderProspectFollowUpStage(noSite, 1).body_text, new RegExp(PORTFOLIO_URL.replace(/\./g, "\\.")));
});
