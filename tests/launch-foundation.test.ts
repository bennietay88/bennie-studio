import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_LAUNCH_FLAGS, normalizeLaunchFlags } from "../src/lib/launchFlags.ts";
import { InternalContentBriefSchema, InternalContentDraftSchema, buildInternalContentPrompt } from "../src/lib/internalAiContentEngine.ts";

test("launch flags fail closed and never enable customer AI by default", () => {
  assert.deepEqual(normalizeLaunchFlags(undefined), DEFAULT_LAUNCH_FLAGS);
  assert.equal(DEFAULT_LAUNCH_FLAGS.otc_mrc_catalogue, false);
  assert.equal(DEFAULT_LAUNCH_FLAGS.customer_ai_controls, false);
  assert.equal(normalizeLaunchFlags({ otc_mrc_catalogue: true }).otc_mrc_catalogue, true);
});

test("internal content brief requires verified facts and drafts stay schema-bound", () => {
  const brief = InternalContentBriefSchema.parse({
    businessName: "Example Clinic",
    industry: "Dental clinic",
    services: ["Dental cleaning"],
    verifiedFacts: ["Open Monday to Friday"],
  });
  assert.match(buildInternalContentPrompt(brief), /verifiedFacts/);
  assert.throws(() => InternalContentDraftSchema.parse({ headline: "Unsupported claim" }));
  assert.equal(InternalContentDraftSchema.parse({
    headline: "Clear dental care",
    subheadline: "Care for your next visit",
    body: "Book a consultation.",
    cta: "Book a consultation",
    seoTitle: "Example Clinic | Dental care",
    seoDescription: "Dental care information for local patients.",
    claimsToVerify: ["Years in business"],
  }).claimsToVerify[0], "Years in business");
});
