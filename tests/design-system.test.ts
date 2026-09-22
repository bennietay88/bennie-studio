import test from "node:test";
import assert from "node:assert/strict";
import { DESIGN_PROFILES, resolveDesignProfile } from "../src/constants/designProfiles.ts";
import { buildPagesFromBlueprint, getBlueprintTheme } from "../src/constants/pageBlueprints.ts";
import { parseDesignDirection } from "../src/lib/designDirector.ts";
import { assessWebsiteDesign } from "../src/lib/designQa.ts";
import { SECTION_TEMPLATES } from "../src/constants/sectionTemplates.ts";
import { NICHE_TEMPLATES } from "../src/constants/nicheTemplates.ts";
import { CUSTOMER_SITE_CAPABILITIES } from "../src/constants/customerSiteCapabilities.ts";
import { inferButtonAction } from "../src/lib/websiteButtons.ts";
import {
  CONTRAST_TEST_DARK_SURFACE,
  CONTRAST_TEST_LIGHT_SURFACE,
  contrastRatio,
  resolveAccessibleThemeColors,
  WCAG_AA_NORMAL_TEXT_RATIO,
} from "../src/lib/colorContrast.ts";

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

test("public brand uses product-led positioning guardrails", async () => {
  const [homepage, chrome, pricing] = await Promise.all([
    import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/components/BrandLedLandingPage.tsx", import.meta.url), "utf8")),
    import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/components/PublicSiteChrome.tsx", import.meta.url), "utf8")),
    import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/components/Pricing.tsx", import.meta.url), "utf8")),
  ]);

  assert.match(homepage, /managed website system/i);
  assert.match(homepage, /Managed, not handed off/i);
  assert.doesNotMatch(chrome, /Website Design Orchard|Website Design Petaling Jaya|Website Design London/);
  assert.doesNotMatch(pricing, /hidden overflow-x-auto md:block/);
});

test("all catalogue templates resolve to WCAG AA text contrast", () => {
  const templates = Object.values(NICHE_TEMPLATES);
  assert.ok(templates.length >= 160, `Expected full template catalogue, received ${templates.length}`);

  for (const template of templates) {
    const colors = resolveAccessibleThemeColors(
      template.theme?.primaryColor,
      template.theme?.secondaryColor,
    );

    assert.ok(
      contrastRatio(colors.primaryForeground, colors.primarySurface) >= WCAG_AA_NORMAL_TEXT_RATIO,
      `${template.id}: primary fill foreground fails AA`,
    );
    assert.ok(
      contrastRatio(colors.secondaryForeground, colors.secondarySurface) >= WCAG_AA_NORMAL_TEXT_RATIO,
      `${template.id}: secondary fill foreground fails AA`,
    );
    assert.ok(
      contrastRatio(colors.primaryInk, CONTRAST_TEST_LIGHT_SURFACE) >= WCAG_AA_NORMAL_TEXT_RATIO,
      `${template.id}: primary text on light surfaces fails AA`,
    );
    assert.ok(
      contrastRatio(colors.secondaryInk, CONTRAST_TEST_LIGHT_SURFACE) >= WCAG_AA_NORMAL_TEXT_RATIO,
      `${template.id}: secondary text on light surfaces fails AA`,
    );
    assert.ok(
      contrastRatio(colors.primaryOnDark, CONTRAST_TEST_DARK_SURFACE) >= WCAG_AA_NORMAL_TEXT_RATIO,
      `${template.id}: primary text on dark surfaces fails AA`,
    );
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


test("source-site hero copy is preserved on redesign previews", () => {
  const pages = buildPagesFromBlueprint({
    businessName: "Harbour Dental",
    nicheId: "dental-clinic-v1",
    nicheName: "Dental Clinic",
    plan: "business",
    maxPages: 5,
    mainService: "Family dentistry",
    targetCustomer: "patients",
    location: "Kuala Lumpur",
    ctaPreference: "Book Appointment",
    generationMode: "brand_led",
    heroHeadline: "Comfortable Dentistry for the Whole Family",
    heroSubheadline: "Modern treatment, a calm clinic experience, and straightforward advice from your first visit.",
  });

  const homeHero = pages[0]?.sections.find((section) => section.type === "hero");
  assert.equal(homeHero?.content?.headline, "Comfortable Dentistry for the Whole Family");
  assert.match(String(homeHero?.content?.subheadline || ""), /calm clinic experience/i);
});

test("five-page managed previews use the full five-page website architecture", () => {
  const pages = buildPagesFromBlueprint({
    businessName: "Example Dental",
    nicheId: "dental-clinic-v1",
    nicheName: "Clinic / Healthcare",
    plan: "business",
    maxPages: 5,
    mainService: "Family dentistry",
    targetCustomer: "local families",
    location: "Kuala Lumpur",
    ctaPreference: "Book Appointment",
    generationMode: "brand_led",
  });

  assert.equal(pages.length, 5);
  assert.equal(new Set(pages.map((page) => page.slug)).size, 5);
  assert.ok(pages.some((page) => page.slug === "treatments"));
  assert.ok(pages.some((page) => page.slug === "appointment"));
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


test("public-site credibility marquee is available to generated customer sites", async () => {
  const [homepage, renderer] = await Promise.all([
    import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../src/components/BrandLedLandingPage.tsx", import.meta.url), "utf8"),
    ),
    import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../src/components/WebsiteRenderer.tsx", import.meta.url), "utf8"),
    ),
  ]);

  assert.match(homepage, /TechnologyMarquee/);
  assert.equal(SECTION_TEMPLATES.logo_marquee.type, "proof");
  assert.equal(SECTION_TEMPLATES.logo_marquee.settings?.variant, "logo_marquee");
  assert.match(renderer, /proofVariant === "logo_marquee"/);
  assert.match(renderer, /useReducedMotion/);
});

test("customer-site capability catalog covers core Bennie Studio website patterns", () => {
  const ids = new Set(CUSTOMER_SITE_CAPABILITIES.map((capability) => capability.id));
  for (const id of [
    "hero_composition",
    "logo_marquee",
    "proof_system",
    "capability_sections",
    "services",
    "customer_reviews",
    "faq",
    "conversion_cta",
    "lead_capture",
    "booking",
    "blog",
    "whatsapp",
    "analytics",
    "seo",
    "cookie_consent",
    "responsive_motion",
  ]) {
    assert.ok(ids.has(id), `Missing customer-site parity capability: ${id}`);
  }
});

test("logo marquee defaults never fabricate brand relationships", () => {
  const section = SECTION_TEMPLATES.logo_marquee;
  assert.deepEqual(section.content.logos, []);
  assert.equal(section.content.providedByBusiness, false);
  assert.doesNotMatch(JSON.stringify(section), /Google|Meta|Vercel|Nike|Apple|Microsoft|Trusted by/i);
});


test("preview generation enforces concise hero copy and supports eight pages", () => {
  const pages = buildPagesFromBlueprint({
    businessName: "Bennie Studio",
    nicheName: "Corporate",
    plan: "business",
    maxPages: 8,
    mainService: "Managed website services for service businesses and growing teams",
    targetCustomer: "service businesses and growing teams",
    location: "Kuala Lumpur",
    ctaPreference: "Book a Consultation",
    generationMode: "brand_led",
    brandPersonality: "professional",
    businessMaturity: "established",
    assetReadiness: "some",
  });

  assert.equal(pages.length, 8);
  assert.equal(new Set(pages.map((page) => page.slug)).size, 8);

  const homeHero = pages[0]?.sections.find((section) => section.type === "hero");
  const headline = String(homeHero?.content?.headline || "");
  assert.ok(headline.length <= 58, `Hero exceeded 58 characters: ${headline}`);
  assert.ok(headline.split(/\s+/).filter(Boolean).length <= 7, `Hero exceeded 7 words: ${headline}`);
});


test("managed website agency previews use agency architecture instead of consultant programs", () => {
  const pages = buildPagesFromBlueprint({
    businessName: "Bennie Studio",
    nicheId: "managed-website-agency-v1",
    nicheName: "Web / Marketing Agency",
    plan: "business",
    maxPages: 8,
    mainService: "Managed website services",
    targetCustomer: "service businesses and growing teams",
    location: "Kuala Lumpur",
    ctaPreference: "Book a Consultation",
    generationMode: "brand_led",
    brandPersonality: "premium",
    businessMaturity: "established",
    assetReadiness: "some",
  });

  const titles = pages.map((page) => page.title);
  assert.equal(pages.length, 8);
  assert.ok(titles.includes("Services"));
  assert.ok(titles.includes("Work"));
  assert.ok(titles.includes("About"));
  assert.ok(titles.includes("Process"));
  assert.ok(titles.includes("Insights"));
  assert.ok(titles.includes("FAQ"));
  assert.equal(titles[titles.length - 1], "Contact");
  assert.ok(!titles.includes("Programs"));

  const home = pages[0];
  const visibleTypes = home.sections.filter((section) => section.isVisible !== false).map((section) => section.type);
  assert.ok(visibleTypes.includes("services"));
  assert.ok(visibleTypes.includes("features"));
  assert.ok(visibleTypes.includes("cta"));
});

test("brand-led corporate preview theme resolves AA-safe foregrounds", () => {
  const theme = getBlueprintTheme("managed-website-agency-v1", "brand_led", {
    brandPersonality: "premium",
    businessMaturity: "established",
    assetReadiness: "some",
  });
  assert.equal(theme.primaryColor, "#5746e8");
  assert.equal(theme.designProfile, "brand_corporate");
  const colors = resolveAccessibleThemeColors(theme.primaryColor, theme.secondaryColor);
  assert.ok(contrastRatio(colors.primaryForeground, colors.primary) >= WCAG_AA_NORMAL_TEXT_RATIO);
  assert.ok(contrastRatio(colors.secondaryForeground, colors.secondary) >= WCAG_AA_NORMAL_TEXT_RATIO);
  assert.ok(contrastRatio(colors.primaryInk, CONTRAST_TEST_LIGHT_SURFACE) >= WCAG_AA_NORMAL_TEXT_RATIO);
  assert.ok(contrastRatio(colors.primaryOnDark, CONTRAST_TEST_DARK_SURFACE) >= WCAG_AA_NORMAL_TEXT_RATIO);
});


test("generated renderer readability guard colors clear WCAG AA", () => {
  assert.ok(contrastRatio("#475569", "#f8fafc") >= WCAG_AA_NORMAL_TEXT_RATIO, "light-surface muted copy must clear AA");
  assert.ok(contrastRatio("#475569", "#ffffff") >= WCAG_AA_NORMAL_TEXT_RATIO, "preview navigation copy must clear AA");
  assert.ok(contrastRatio("#94a3b8", "#020617") >= WCAG_AA_NORMAL_TEXT_RATIO, "dark footer utility copy must clear AA");
});


test("public preview chrome avoids known low-contrast text tokens", async () => {
  const [previewPages, landing, chrome, renderer] = await Promise.all([
    import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/components/PublicMarketingPages.tsx", import.meta.url), "utf8")),
    import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/components/BrandLedLandingPage.tsx", import.meta.url), "utf8")),
    import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/components/PublicSiteChrome.tsx", import.meta.url), "utf8")),
    import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/components/WebsiteRenderer.tsx", import.meta.url), "utf8")),
  ]);

  assert.doesNotMatch(previewPages, /#8b93a0|#7b8491/i);
  assert.doesNotMatch(landing, /text-white\/(?:35|40|48)/);
  assert.doesNotMatch(chrome, /text-slate-400 xl:block/);
  assert.match(renderer, /color: brandHero \? accessibleTheme\.primaryForeground/);
  assert.match(renderer, /footer \.text-slate-500/);
  assert.doesNotMatch(renderer, /text-white\/55/);
  assert.match(renderer, /text-\[8px\][\s\S]{0,220}font-size: 0\.75rem/);
});


test("public brand muted text tokens remain AA-safe on light and dark surfaces", async () => {
  const css = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../src/styles/publicBrand.css", import.meta.url), "utf8"),
  );

  assert.ok(contrastRatio("#5f6673", "#f6f7fb") >= WCAG_AA_NORMAL_TEXT_RATIO);
  assert.ok(contrastRatio("#94a3b8", "#0b1020") >= WCAG_AA_NORMAL_TEXT_RATIO);
  assert.ok(contrastRatio("#5746e8", "#f6f7fb") >= WCAG_AA_NORMAL_TEXT_RATIO);
  assert.ok(contrastRatio("#c9c4ff", "#0b1020") >= WCAG_AA_NORMAL_TEXT_RATIO);
  assert.doesNotMatch(css, /--brand-soft:\s*#707b8a/i);
  assert.doesNotMatch(css, /brand-logo-detail[\s\S]{0,180}color:\s*#7a8493/i);
});


test("managed website agency template exists without fabricated proof", () => {
  const template = Object.values(NICHE_TEMPLATES).find((item) => item.id === "managed-website-agency-v1");
  assert.ok(template);
  assert.match(template?.description || "", /managed websites|managed website/i);
  assert.equal(template?.theme?.primaryColor, "#5746e8");
  const serialized = JSON.stringify(template?.pages || []);
  assert.doesNotMatch(serialized, /99\.99%|1M\+|50,000\+|Maya Chen|Daniel Wong|Aisha Rahman/i);
});


test("managed website agency preview keeps the right 5 to 8 page architecture", () => {
  for (const count of [5, 6, 7, 8]) {
    const pages = buildPagesFromBlueprint({
      businessName: "Bennie Studio",
      nicheId: "managed-website-agency-v1",
      nicheName: "Web / Marketing Agency",
      plan: "business",
      maxPages: count,
      mainService: "Managed website services",
      targetCustomer: "service businesses and growing teams",
      location: "Kuala Lumpur",
      ctaPreference: "Book a Consultation",
      generationMode: "brand_led",
      brandPersonality: "premium",
      businessMaturity: "established",
      assetReadiness: "some",
    });
    const titles = pages.map((page) => page.title);
    assert.equal(pages.length, count);
    assert.equal(titles[0], "Home");
    assert.equal(titles[titles.length - 1], "Contact");
    assert.ok(titles.includes("Services"));
    assert.ok(titles.includes("Work"));
    assert.ok(!titles.includes("Programs"));
  }
});


test("source-site previews use a premium home hero and compact inner-page mastheads", () => {
  const pages = buildPagesFromBlueprint({
    businessName: "Harbour Dental",
    nicheId: "dental-clinic-v1",
    nicheName: "Dental Clinic",
    plan: "business",
    maxPages: 5,
    mainService: "Family dentistry",
    targetCustomer: "patients",
    location: "Kuala Lumpur",
    ctaPreference: "Book Appointment",
    generationMode: "brand_led",
    assetReadiness: "some",
    heroImageUrl: "https://example.test/hero.jpg",
    heroHeadline: "Comfortable Dentistry for the Whole Family",
    heroSubheadline: "Modern treatment and straightforward advice.",
    heroTrustItems: ["Established 2012", "Registered clinicians"],
    preferredHeroVariant: "source_brand_hero",
    compactSubpageHeroes: true,
  });

  const homeHero = pages[0]?.sections.find((section) => section.type === "hero");
  assert.equal(homeHero?.settings?.variant, "source_brand_hero");
  assert.equal(homeHero?.content?.imageUrl, "https://example.test/hero.jpg");
  assert.deepEqual(homeHero?.content?.trustItems, ["Established 2012", "Registered clinicians"]);

  for (const page of pages.slice(1)) {
    const hero = page.sections.find((section) => section.type === "hero");
    if (!hero) continue;
    assert.equal(hero.settings?.variant, "page_masthead");
    assert.equal(hero.content?.imageUrl, undefined);
  }
});


test("source-driven previews remove generic agency copy and fake booking widgets", () => {
  const pages = buildPagesFromBlueprint({
    businessName: "Smile Plus Pro Sdn Bhd",
    nicheId: "dental-clinic-v1",
    nicheName: "Dental Clinic",
    plan: "business",
    maxPages: 5,
    mainService: "Teeth Whitening",
    targetCustomer: "patients",
    ctaPreference: "Book Appointment",
    generationMode: "brand_led",
    sourceDriven: true,
    aboutText: "Smile Plus Pro provides professional dental care with a focus on patient comfort.",
    services: ["Teeth Whitening"],
    testimonials: ["The team explained the treatment clearly and made the visit comfortable."],
    heroHeadline: "Your Smile Is Our Highest Priority",
    heroSubheadline: "Professional teeth whitening treatment.",
    heroImageUrl: "https://example.test/hero.jpg",
    preferredHeroVariant: "source_brand_hero",
    compactSubpageHeroes: true,
  });

  const serialized = JSON.stringify(pages);
  assert.doesNotMatch(serialized, /Evidence before claims|Responsive by design|Useful restraint|Action without pressure|Treatment Process|Surface Cleaning/);
  assert.doesNotMatch(serialized, /Available Times|Local business hours/);

  assert.deepEqual(pages.map((page) => page.title), ["Home", "Treatments", "About", "Reviews", "Appointment"]);

  const appointmentPage = pages.find((page) => page.slug === "appointment");
  assert.ok(appointmentPage);
  const visibleAppointmentSections = appointmentPage!.sections.filter((section) => section.isVisible !== false);
  assert.deepEqual(visibleAppointmentSections.map((section) => section.type), ["hero", "contact"]);
  assert.equal(visibleAppointmentSections.find((section) => section.type === "contact")?.settings?.variant, "source_contact");

  const home = pages[0];
  const visibleSections = home.sections.filter((section) => section.isVisible !== false);
  assert.deepEqual(visibleSections.map((section) => section.type), ["hero", "services", "about", "testimonials", "cta"]);
  assert.equal(visibleSections.find((section) => section.type === "services")?.settings?.variant, "source_services");
  assert.equal(visibleSections.find((section) => section.type === "about")?.settings?.variant, "source_about");
  assert.equal(visibleSections.find((section) => section.type === "testimonials")?.settings?.variant, "source_testimonials");
  assert.equal(visibleSections.find((section) => section.type === "cta")?.settings?.variant, "brand_band");
});

test("source-driven clinic previews use verified FAQ evidence instead of a filler reviews page", () => {
  const pages = buildPagesFromBlueprint({
    businessName: "Harbour Dental",
    nicheId: "dental-clinic-v1",
    nicheName: "Dental Clinic",
    plan: "business",
    maxPages: 5,
    mainService: "Family Dentistry",
    targetCustomer: "patients",
    location: "Kuala Lumpur",
    ctaPreference: "Book Appointment",
    generationMode: "brand_led",
    sourceDriven: true,
    services: ["Family Dentistry", "Teeth Whitening"],
    aboutText: "Harbour Dental provides preventive and restorative care.",
    testimonials: ["A calm and professional visit from start to finish."],
    faqItems: [
      { question: "Do you accept new patients?", answer: "Yes. Contact the clinic to arrange your first appointment." },
      { question: "How do I book?", answer: "Use the appointment form or call the clinic." },
    ],
    heroHeadline: "Comfortable Dentistry for the Whole Family",
    heroImageUrl: "https://example.test/hero.jpg",
    preferredHeroVariant: "source_brand_hero",
    compactSubpageHeroes: true,
  });

  assert.deepEqual(pages.map((page) => page.title), ["Home", "Treatments", "About", "Patient Info", "Appointment"]);
  const patientInfo = pages.find((page) => page.slug === "patient-info");
  assert.ok(patientInfo);
  const faq = patientInfo!.sections.find((section) => section.type === "faq");
  assert.ok(faq);
  assert.equal(faq!.settings?.variant, "source_faq");
  assert.deepEqual(faq!.content.items, [
    { question: "Do you accept new patients?", answer: "Yes. Contact the clinic to arrange your first appointment." },
    { question: "How do I book?", answer: "Use the appointment form or call the clinic." },
  ]);
});

test("source-driven preview QA blocks fake availability and internal design language", () => {
  const pages = buildPagesFromBlueprint({
    businessName: "Harbour Dental",
    nicheId: "dental-clinic-v1",
    nicheName: "Dental Clinic",
    plan: "business",
    maxPages: 5,
    mainService: "Dental care",
    targetCustomer: "patients",
    ctaPreference: "Book Appointment",
    generationMode: "brand_led",
    sourceDriven: true,
    services: ["Dental care"],
    heroHeadline: "Care designed around you",
    preferredHeroVariant: "source_brand_hero",
    compactSubpageHeroes: true,
  });
  pages[0].sections.push({
    id: "bad-preview-copy",
    type: "features",
    isVisible: true,
    content: { title: "Evidence before claims", description: "Available Times during Local business hours" },
  } as any);

  const result = assessWebsiteDesign({
    id: "preview-quality",
    businessId: "preview-quality",
    theme: {
      ...getBlueprintTheme("dental-clinic-v1", "brand_led"),
      sourceDriven: true,
      previewPurpose: "sales_preview",
    },
    pages,
    seo: { title: "Harbour Dental", description: "Dental care", keywords: [] },
    status: "draft",
    updatedAt: Date.now(),
  } as any);

  assert.equal(result.checks.find((check) => check.key === "source_preview_language")?.pass, false);
  assert.equal(result.checks.find((check) => check.key === "source_preview_availability")?.pass, false);
  assert.equal(result.productionReady, false);
});

test("prospect preview chrome keeps the website visually primary and comparison-ready", async () => {
  const [page, renderer, generator] = await Promise.all([
    import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/components/ProspectPreviewPage.tsx", import.meta.url), "utf8")),
    import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/components/WebsiteRenderer.tsx", import.meta.url), "utf8")),
    import("node:fs/promises").then((fs) => fs.readFile(new URL("../src/components/PublicMarketingPages.tsx", import.meta.url), "utf8")),
  ]);

  assert.match(page, /Website preview for/);
  assert.match(page, /Original site/);
  assert.match(page, /Open website only/);
  assert.match(page, /Interactive preview/);
  assert.match(page, /WebsiteRenderer initialData=\{preview\.website\}/);
  assert.doesNotMatch(renderer, /Initialize Connection|Synthesis Successful|Strategic Initiative|Execution Strategy/);
  assert.match(renderer, /source_services/);
  assert.match(renderer, /source_about/);
  assert.match(renderer, /source_contact/);

  const sourceContactStart = renderer.indexOf('section.settings?.variant === "source_contact"');
  assert.ok(sourceContactStart >= 0);
  const sourceContactBlock = renderer.slice(sourceContactStart, sourceContactStart + 9000);
  assert.match(sourceContactBlock, /<textarea/);
  assert.doesNotMatch(sourceContactBlock, /<Textarea\b/);

  assert.match(generator, /text-sm leading-6 text-slate-300">\{copy\}/);
  assert.match(generator, /text-sm leading-6 text-slate-300">Your preview details carry into the next step/);
});


test("source-driven previews do not invent pages when source evidence is sparse", () => {
  const pages = buildPagesFromBlueprint({
    businessName: "Focused Dental",
    nicheId: "dental-clinic-v1",
    nicheName: "Dental Clinic",
    plan: "business",
    maxPages: 5,
    mainService: "Teeth Whitening",
    targetCustomer: "patients",
    ctaPreference: "Book Appointment",
    generationMode: "brand_led",
    sourceDriven: true,
    services: ["Teeth Whitening"],
    heroHeadline: "A brighter smile, clearly explained",
    preferredHeroVariant: "source_brand_hero",
    compactSubpageHeroes: true,
  });

  assert.deepEqual(pages.map((page) => page.title), ["Home", "Treatments", "Appointment"]);
  assert.equal(pages.some((page) => page.title === "About"), false);
  assert.equal(pages.some((page) => page.title === "Reviews"), false);
  assert.equal(pages.some((page) => page.title === "Patient Info"), false);
});


test("source-driven services use source descriptions without inventing filler", () => {
  const pages = buildPagesFromBlueprint({
    businessName: "Harbour Dental",
    nicheId: "dental-clinic-v1",
    nicheName: "Dental Clinic",
    plan: "business",
    maxPages: 5,
    mainService: "Teeth Whitening",
    targetCustomer: "patients",
    ctaPreference: "Book Appointment",
    generationMode: "brand_led",
    sourceDriven: true,
    services: ["Teeth Whitening", "Dental Implants"],
    serviceDetails: [
      { title: "Teeth Whitening", description: "Professional whitening options are explained after an assessment." },
      { title: "Dental Implants", description: "Implant consultations cover suitability and treatment stages." },
    ],
    heroHeadline: "Comfortable dentistry",
    preferredHeroVariant: "source_brand_hero",
    compactSubpageHeroes: true,
  });

  const homeServices = pages[0].sections.find((section) => section.type === "services");
  assert.ok(homeServices);
  assert.deepEqual(homeServices!.content.items, [
    { title: "Teeth Whitening", description: "Professional whitening options are explained after an assessment.", imageUrl: undefined },
    { title: "Dental Implants", description: "Implant consultations cover suitability and treatment stages.", imageUrl: undefined },
  ]);
  assert.doesNotMatch(JSON.stringify(homeServices), /designed for patients|your customers|your area/i);
});


test("appointment and contact CTAs fall back to the preview enquiry page", () => {
  const pages = [
    {
      id: "home",
      title: "Home",
      slug: "",
      sections: [{ id: "hero", type: "hero", content: {}, settings: {}, isVisible: true }],
    },
    {
      id: "appointment",
      title: "Appointment",
      slug: "appointment",
      sections: [{ id: "contact", type: "contact", content: {}, settings: {}, isVisible: true }],
    },
  ] as any;

  const appointment = inferButtonAction("Book Appointment", {}, pages);
  const contact = inferButtonAction("Get in touch", {}, pages);

  assert.equal(appointment.actionType, "contact_form");
  assert.equal(appointment.target, "#contact");
  assert.equal(contact.actionType, "contact_form");
  assert.equal(contact.target, "#contact");
});
