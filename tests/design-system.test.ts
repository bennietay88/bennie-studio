import test from "node:test";
import assert from "node:assert/strict";
import { DESIGN_PROFILES, resolveDesignProfile } from "../src/constants/designProfiles.ts";
import { buildPagesFromBlueprint, getBlueprintTheme } from "../src/constants/pageBlueprints.ts";
import { parseDesignDirection } from "../src/lib/designDirector.ts";
import { assessWebsiteDesign } from "../src/lib/designQa.ts";
import { SECTION_TEMPLATES } from "../src/constants/sectionTemplates.ts";

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


test("blueprint themes always resolve to approved renderer styles", () => {
  const approvedStyles = new Set([
    "modern", "neumorphic", "glassmorphic", "brutalist", "editorial", "action",
    "immersive", "authority", "corporate", "prestige", "luxury_dark",
  ]);
  const themes = [
    getBlueprintTheme("dental-clinic-v1", "fast"),
    getBlueprintTheme("accounting-firm-v1", "premium"),
    getBlueprintTheme("accounting-firm-v1", "brand_led"),
  ];
  for (const theme of themes) {
    assert.ok(theme.style && approvedStyles.has(theme.style), `Unexpected renderer style: ${theme.style}`);
  }
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
  assert.equal(home.sections[0]?.settings?.variant, "statement_media");
  assert.ok(
    home.sections.some((section) =>
      ["brand_families", "editorial_list"].includes(String(section.settings?.variant || "")),
    ),
  );
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


test("premium composition seeds create distinct art directions", () => {
  const base = {
    businessName: "Northstar Advisory",
    nicheName: "Corporate",
    plan: "business",
    maxPages: 3,
    mainService: "Growth advisory",
    targetCustomer: "UK business owners",
    location: "London",
    ctaPreference: "Book Call",
    generationMode: "brand_led" as const,
  };
  const a = buildPagesFromBlueprint({ ...base, compositionSeed: 0 });
  const b = buildPagesFromBlueprint({ ...base, compositionSeed: 1 });
  assert.notDeepEqual(
    a[0].sections.map((section) => `${section.type}:${section.settings?.variant || ""}`),
    b[0].sections.map((section) => `${section.type}:${section.settings?.variant || ""}`),
  );
});

test("reusable section defaults do not fabricate people, prices or performance metrics", () => {
  const risky = JSON.stringify({
    products: SECTION_TEMPLATES.products,
    team: SECTION_TEMPLATES.team,
    comparison: SECTION_TEMPLATES.comparison,
    market_stats: SECTION_TEMPLATES.market_stats,
    executive_team: SECTION_TEMPLATES.executive_team,
  });
  assert.doesNotMatch(risky, /Dr\. John Smith|Michael Chen|340%|25h\/mo|5x faster|\$2,499|\$4,999|24\/7 priority/i);
  assert.equal(SECTION_TEMPLATES.team.isVisible, false);
  assert.equal(SECTION_TEMPLATES.market_stats.isVisible, false);
  assert.equal(SECTION_TEMPLATES.products.isVisible, false);
});


test("design QA can evaluate brand-led customer asset slots", () => {
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
    assetReadiness: "pending",
  });
  const website: any = {
    id: "qa",
    businessId: "qa",
    theme: {
      primaryColor: "#111827",
      secondaryColor: "#ffffff",
      fontFamily: "Inter, sans-serif",
      style: "corporate",
      designProfile: "brand_corporate",
      typographyProfile: "premium_corporate",
      motionProfile: "refined",
      generationMode: "brand_led",
    },
    pages,
    seo: { title: "Northstar Advisory", description: "Growth advisory in London" },
    status: "draft",
    updatedAt: Date.now(),
  };
  const result = assessWebsiteDesign(website);
  assert.ok(result.checks.some((check) => check.key === "customer_asset_plan"));
  assert.equal(typeof result.metrics.aiTemplateRisk, "number");
});

test("generated services do not invent prices", () => {
  const pages = buildPagesFromBlueprint({
    businessName: "Northstar Advisory",
    nicheName: "Corporate",
    plan: "business",
    maxPages: 3,
    mainService: "Growth advisory",
    targetCustomer: "UK business owners",
    location: "London",
    ctaPreference: "Book Call",
    generationMode: "premium",
  });
  const services = pages.flatMap((page) => page.sections).find((section) => section.type === "services");
  assert.ok(services);
  assert.doesNotMatch(JSON.stringify(services?.content || {}), /Custom Quote|Enquire|"price"/i);
});


test("brand personality changes premium art direction", () => {
  const elegant = buildPagesFromBlueprint({
    businessName: "Aurelia",
    nicheName: "Corporate",
    plan: "business",
    maxPages: 3,
    mainService: "Advisory",
    targetCustomer: "business leaders",
    location: "London",
    ctaPreference: "Book Call",
    generationMode: "brand_led",
    brandPersonality: "elegant",
    assetReadiness: "professional",
  });
  const bold = buildPagesFromBlueprint({
    businessName: "Aurelia",
    nicheName: "Corporate",
    plan: "business",
    maxPages: 3,
    mainService: "Advisory",
    targetCustomer: "business leaders",
    location: "London",
    ctaPreference: "Book Call",
    generationMode: "brand_led",
    brandPersonality: "bold",
    assetReadiness: "professional",
  });
  assert.notDeepEqual(
    elegant[0].sections.map((section) => section.settings?.variant),
    bold[0].sections.map((section) => section.settings?.variant),
  );
});

test("asset readiness changes brand-led hero composition", () => {
  const base = {
    businessName: "Aurelia",
    nicheName: "Corporate",
    plan: "business",
    maxPages: 3,
    mainService: "Advisory",
    targetCustomer: "business leaders",
    location: "London",
    ctaPreference: "Book Call",
    generationMode: "brand_led" as const,
  };
  const pending = buildPagesFromBlueprint({ ...base, assetReadiness: "pending" as const });
  const ready = buildPagesFromBlueprint({ ...base, assetReadiness: "professional" as const });
  assert.equal(pending[0].sections[0].settings?.variant, "statement_media");
  assert.equal(ready[0].sections[0].settings?.variant, "brand_media");
});

test("multi-location maturity adds location architecture in premium modes", () => {
  const pages = buildPagesFromBlueprint({
    businessName: "Northstar Clinics",
    nicheName: "Clinic / Healthcare",
    plan: "business",
    maxPages: 3,
    mainService: "Private healthcare",
    targetCustomer: "patients",
    location: "London",
    ctaPreference: "Book Appointment",
    generationMode: "brand_led",
    businessMaturity: "multi_location",
  });
  assert.ok(pages[0].sections.some((section) => section.type === "contact"));
});
