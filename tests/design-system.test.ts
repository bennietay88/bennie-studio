import test from "node:test";
import assert from "node:assert/strict";
import { DESIGN_PROFILES, resolveDesignProfile } from "../src/constants/designProfiles.ts";
import { buildPagesFromBlueprint } from "../src/constants/pageBlueprints.ts";
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

test("design QA blocks placeholder client proof", () => {
  const result = assessWebsiteDesign({
    id: "preview",
    businessId: "business",
    theme: {
      primaryColor: "#111",
      secondaryColor: "#fff",
      fontFamily: "Inter",
      designProfile: "trust_authority",
      typographyProfile: "authority",
      motionProfile: "subtle",
    },
    pages: [{
      id: "home",
      title: "Home",
      slug: "",
      sections: [
        { id: "hero", type: "hero", content: { headline: "Dental care designed around your family" }, settings: { variant: "minimal_statement" } },
        { id: "proof", type: "proof", content: { title: "Why patients choose us" }, settings: { variant: "minimal" } },
        { id: "testimonials", type: "testimonials", content: { items: [{ name: "Verified Client", text: "The process was clear and professional." }] }, settings: { variant: "review_grid" } },
        { id: "cta", type: "cta", content: { title: "Book an appointment" }, settings: { variant: "consultation" } },
      ],
    }],
    seo: { title: "Example Dental", description: "Dental care for local families", keywords: [] },
    status: "draft",
    updatedAt: Date.now(),
  });

  assert.equal(result.checks.find((check) => check.key === "proof_integrity")?.pass, false);
  assert.equal(result.productionReady, false);
});

test("blueprints do not fabricate testimonials or prices when proof is absent", () => {
  const pages = buildPagesFromBlueprint({
    businessName: "Example Dental",
    nicheId: "dental-clinic",
    nicheName: "Clinic / Healthcare",
    plan: "business",
    maxPages: 3,
    mainService: "Family dentistry",
    targetCustomer: "local families",
    location: "Kuala Lumpur",
    ctaPreference: "Book Appointment",
  });

  const sections = pages.flatMap((page) => page.sections);
  const testimonialSections = sections.filter((section) => section.type === "testimonials");
  const pricingSections = sections.filter((section) => section.type === "pricing");

  assert.ok(testimonialSections.every((section) => section.isVisible === false || (section.content?.items || []).length === 0));
  assert.ok(pricingSections.every((section) => section.isVisible === false));
  assert.doesNotMatch(JSON.stringify(sections), /Verified Client|Happy Customer|Repeat Customer|Local Customer/);
  assert.doesNotMatch(JSON.stringify(sections), /"name":"Essential"|"name":"Recommended"|"name":"Complete"/);
});


test("brand-led mode creates a deeper composition without fabricated people", () => {
  const pages = buildPagesFromBlueprint({
    businessName: "Northstar Advisory",
    nicheName: "Corporate",
    plan: "business",
    maxPages: 3,
    mainService: "Growth advisory",
    targetCustomer: "UK business owners",
    location: "London",
    ctaPreference: "Book Call",
    generationMode: "brand_led",
    brandPersonality: "established",
    businessMaturity: "established",
    assetReadiness: "pending",
  });

  const home = pages[0];
  assert.ok(home.sections.length >= 7);
  assert.equal(home.sections[0]?.settings?.variant, "brand_media");
  assert.ok(home.sections.some((section) => section.settings?.variant === "brand_families"));
  const team = home.sections.find((section) => section.type === "team");
  assert.equal(team?.isVisible, false);
  assert.doesNotMatch(JSON.stringify(home.sections), /Dr\. John Smith|Dr\. Sarah Johnson|Michael Chen|Elena Rodriguez/);
});

test("fast and brand-led modes produce materially different section direction", () => {
  const base = {
    businessName: "Example Consulting",
    nicheName: "Corporate",
    plan: "business",
    maxPages: 3,
    mainService: "Business consulting",
    targetCustomer: "growing companies",
    location: "Manchester",
    ctaPreference: "Book Call",
  };
  const fast = buildPagesFromBlueprint({ ...base, generationMode: "fast" });
  const branded = buildPagesFromBlueprint({ ...base, generationMode: "brand_led" });
  assert.notDeepEqual(
    fast[0].sections.map((section) => section.settings?.variant),
    branded[0].sections.map((section) => section.settings?.variant),
  );
  assert.ok(branded[0].sections.length > fast[0].sections.length);
});

test("brand corporate is an approved production design profile", () => {
  assert.equal(resolveDesignProfile("brand_corporate").label, "Brand-Led Corporate");
});
