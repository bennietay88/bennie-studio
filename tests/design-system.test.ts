import test from "node:test";
import assert from "node:assert/strict";
import { DESIGN_PROFILES, resolveDesignProfile } from "../src/constants/designProfiles.ts";
import { parseDesignDirection } from "../src/lib/designDirector.ts";
import { assessWebsiteDesign } from "../src/lib/designQa.ts";

test("all approved design profiles have complete production defaults", () => {
  for (const profile of Object.values(DESIGN_PROFILES)) {
    assert.ok(profile.displayFont);
    assert.ok(profile.bodyFont);
    assert.ok(profile.spacing);
    assert.ok(profile.motion);
  }
});

test("legacy themes resolve to a safe modern profile", () => {
  assert.equal(resolveDesignProfile(undefined, undefined).id, "modern_minimal");
  assert.equal(resolveDesignProfile("editorial_luxury").typography, "luxury_editorial");
});

test("design director rejects unapproved variants", () => {
  assert.throws(() => parseDesignDirection({
    designProfile: "modern_minimal",
    typographyProfile: "modern_professional",
    spacingProfile: "balanced",
    motionProfile: "subtle",
    heroVariant: "random_css",
    servicesVariant: "minimal",
    testimonialVariant: "review_grid",
    ctaVariant: "minimal",
    imageTreatment: "clean",
    contentDensity: "balanced",
    rationale: [],
    reviewNotes: [],
  }));
});

test("design QA flags sites with no conversion path", () => {
  const result = assessWebsiteDesign({
    id: "preview",
    businessId: "business",
    theme: { primaryColor: "#111", secondaryColor: "#fff", fontFamily: "Inter" },
    pages: [{ id: "home", title: "Home", slug: "", sections: [{ id: "hero", type: "hero", content: { headline: "Hello" } }] }],
    seo: { title: "Example", description: "Example", keywords: [] },
    status: "draft",
    updatedAt: Date.now(),
  });
  assert.equal(result.productionReady, false);
  assert.equal(result.checks.find((check) => check.key === "cta")?.pass, false);
});
