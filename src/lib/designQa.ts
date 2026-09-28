import type { Website } from "../types";

export type DesignQaCheck = { key: string; label: string; pass: boolean; severity: "high" | "medium" | "low"; note: string };

const PLACEHOLDER_PROOF = /verified client|happy customer|repeat customer|local customer/i;
const GENERIC_PRICING = /essential[\s\S]*recommended[\s\S]*complete/i;
const CARD_GRID_FINGERPRINT = /cards|card grid|three cards|3 cards/i;

export interface DesignQualityMetrics {
  visualVariety: number;
  hierarchy: number;
  proofQuality: number;
  conversionClarity: number;
  identityPreservation: number;
  redesignAdvantage: number;
  aiTemplateRisk: number;
}

export function assessWebsiteDesign(website: Website): { score: number; productionReady: boolean; checks: DesignQaCheck[]; metrics: DesignQualityMetrics } {
  const pages = website.pages || [];
  const sections = pages.flatMap((page) => page.sections || []).filter((section) => section.isVisible !== false);
  const text = JSON.stringify(sections).toLowerCase();
  const hasHero = sections.some((section) => section.type === "hero");
  const hasCta = sections.some((section) => section.type === "cta" || section.type === "contact" || section.type === "appointment");
  const hasProof = sections.some((section) => ["proof", "testimonials"].includes(section.type));
  const hasImagery = /image|imageurl|gallery|media/.test(text);
  const hasAltText = !sections.some((section) => Array.isArray(section.content?.images) && section.content.images.some((image: any) => image?.url && !image?.alt));
  const duplicateTypes = sections.length > 5 && new Set(sections.map((section) => section.type)).size < Math.ceil(sections.length / 2);
  const aiFingerprint = /transform your|elevate your|unlock the power|trusted partner|tailored solutions|bringing your vision|take your business to the next level|next-level/i.test(text);
  const heroHeadlines = sections
    .filter((section) => section.type === "hero")
    .map((section) => String(section.content?.headline || "").trim())
    .filter(Boolean);
  const hasHeadline = heroHeadlines.some((headline) => headline.length >= 12);
  const conciseHeroHeadlines = heroHeadlines.every((headline) =>
    headline.length <= 72 && headline.split(/\s+/).filter(Boolean).length <= 9
  );
  const generationMode = website.theme?.generationMode || "fast";
  const sourceDriven = website.theme?.sourceDriven === true;
  const previewPurpose = website.theme?.previewPurpose;
  const hasPlaceholder = /lorem ipsum|your business name|replace this|sample text|coming soon|example\.com/i.test(text);
  const hasPlaceholderMedia = /brand-template-preview\.svg/i.test(text) && generationMode !== "fast";
  const hasSeo = Boolean(website.seo?.title?.trim() && website.seo?.description?.trim());
  const hasNavigation = pages.length >= 1 && pages.every((page) => Boolean(page.title?.trim() && page.slug !== undefined));
  const hasPlaceholderProof = PLACEHOLDER_PROOF.test(text);
  const hasGenericPricing = sections.some((section) => section.type === "pricing" && GENERIC_PRICING.test(JSON.stringify(section.content || {})));
  const hasProfile = Boolean(website.theme?.designProfile);
  const hasTypographyDirection = Boolean(website.theme?.typographyProfile);
  const hasMotionDirection = Boolean(website.theme?.motionProfile);
  const variants = sections.map((section) => section.settings?.variant).filter(Boolean);
  const hasVariantDirection = variants.length >= Math.min(3, sections.length);
  const repeatedVariant = variants.length >= 4 && new Set(variants).size <= 1;
  const genericCardFingerprint = CARD_GRID_FINGERPRINT.test(text) && sections.length > 4;
  const centeredSections = sections.filter((section) => section.settings?.textAlign === "center").length;
  const centeredRatio = sections.length ? centeredSections / sections.length : 0;
  const cardHeavyVariants = variants.filter((variant) => ["cards", "review_grid", "icon_grid"].includes(String(variant))).length;
  const cardHeavyRatio = variants.length ? cardHeavyVariants / variants.length : 0;
  const customerAssetSlots = sections.filter((section) => section.content?.assetSlots || section.content?.imageSlot).length;
  const premiumAssetPlan = sourceDriven || generationMode === "fast" || customerAssetSlots >= Math.min(2, Math.max(1, sections.length));
  const homeSections = pages[0]?.sections?.filter((section) => section.isVisible !== false) || [];
  const compositionDepth = sourceDriven
    ? homeSections.length >= 5 && homeSections.length <= 10
    : homeSections.length >= (generationMode === "brand_led" ? 7 : generationMode === "premium" ? 6 : 4);
  const sourceForbiddenLanguage = /evidence before claims|useful restraint|action without pressure|responsive by design|execution strategy|strategic initiative|initialize connection|synthesis successful|capability system|business-supplied evidence|proof from the business|explore capability/i.test(text);
  const fakeAvailability = sourceDriven && /available times|local business hours/i.test(text);
  const contactSectionCount = sections.filter((section) => section.type === "contact").length;
  const sourceContactDiscipline = !sourceDriven || contactSectionCount === 1;
  const sourceHeroVariant = pages[0]?.sections?.find((section) => section.type === "hero")?.settings?.variant;
  const sourceHeroReady = !sourceDriven || sourceHeroVariant === "source_brand_hero";
  const sourcePageCountReady = !sourceDriven || (pages.length >= 3 && pages.length <= 5);
  const sourceIdentity = website.theme?.sourceIdentity;
  const sourcePeopleExpected = sourceDriven && Number(sourceIdentity?.peopleCount || 0) > 0;
  const sourceTestimonialsExpected = sourceDriven && Number(sourceIdentity?.testimonialCount || 0) > 0;
  const sourceHeritageExpected = sourceDriven && (Number(sourceIdentity?.historyCount || 0) > 0 || Number(sourceIdentity?.pressCount || 0) > 0);
  const sourceLogoExpected = sourceDriven && sourceIdentity?.hasLogo === true;
  const sourceServicesExpected = sourceDriven && Number(sourceIdentity?.serviceCount || 0) > 1;
  const sourceFaqExpected = sourceDriven && Number(sourceIdentity?.faqCount || 0) > 0;
  const sourcePeoplePreserved = !sourcePeopleExpected || sections.some((section) =>
    section.type === "team" && Array.isArray(section.content?.members) && section.content.members.length > 0
  );
  const sourceTestimonialsPreserved = !sourceTestimonialsExpected || sections.some((section) =>
    section.type === "testimonials" && Array.isArray(section.content?.items) && section.content.items.length > 0
  );
  const sourceHeritagePreserved = !sourceHeritageExpected || sections.some((section) =>
    section.type === "proof" && (
      /history|story|archive|press/i.test(String(section.content?.title || "") + " " + String(section.content?.eyebrow || ""))
      || (Array.isArray(section.content?.items) && section.content.items.length > 0)
    )
  );
  const sourceLogoPreserved = !sourceLogoExpected || Boolean(website.theme?.logoUrl);
  const sourceServicesPreserved = !sourceServicesExpected || sections.some((section) =>
    section.type === "services" && Array.isArray(section.content?.items) && section.content.items.length >= Math.min(2, Number(sourceIdentity?.serviceCount || 0))
  );
  const sourceFaqPreserved = !sourceFaqExpected || sections.some((section) =>
    section.type === "faq" && Array.isArray(section.content?.items) && section.content.items.length > 0
  );
  const sourceTypographyPreserved = !sourceDriven
    || sourceIdentity?.typographyStyle !== "heritage"
    || /serif/i.test(String(website.theme?.displayFont || ""));
  const redesignAdvantageSignals = [
    hasHero,
    conciseHeroHeadlines,
    hasCta,
    hasNavigation,
    !repeatedVariant,
    cardHeavyRatio <= 0.45,
    centeredRatio <= 0.6,
    sourcePeoplePreserved,
    sourceTestimonialsPreserved,
    sourceHeritagePreserved,
    sourceLogoPreserved,
    sourceServicesPreserved,
    sourceFaqPreserved,
    sourceTypographyPreserved,
    !sourceForbiddenLanguage,
  ];
  const redesignAdvantage = sourceDriven
    ? Math.round((redesignAdvantageSignals.filter(Boolean).length / redesignAdvantageSignals.length) * 100)
    : 100;
  const sourceRedesignAdvantageReady = !sourceDriven || redesignAdvantage >= 87;

  const checks: DesignQaCheck[] = [
    { key: "hero", label: "Clear hero", pass: hasHero, severity: "high", note: hasHero ? "Hero section is present." : "Add a clear primary hero." },
    { key: "headline", label: "Readable headline", pass: hasHeadline, severity: "high", note: hasHeadline ? "A meaningful headline is present." : "Add a specific, customer-facing headline." },
    { key: "headline_length", label: "Concise hero headline", pass: conciseHeroHeadlines, severity: "high", note: conciseHeroHeadlines ? "Hero headlines stay within readable responsive limits." : "Shorten hero headlines before publishing; generated hero copy should fit the layout without excessive wrapping." },
    { key: "source_preview_language", label: "Prospect-facing language", pass: !sourceDriven || !sourceForbiddenLanguage, severity: "high", note: sourceForbiddenLanguage ? "Internal design-system or agency language leaked into the prospect preview." : "No internal design-system language is exposed." },
    { key: "source_preview_availability", label: "No fake availability", pass: !fakeAvailability, severity: "high", note: fakeAvailability ? "A generated preview must not imply live appointment availability without an integration." : "No unsupported live availability is shown." },
    { key: "source_preview_contact", label: "Contact form discipline", pass: sourceContactDiscipline, severity: "high", note: sourceContactDiscipline ? "One contact form is concentrated on the dedicated conversion page." : "Source previews should contain exactly one contact form on the conversion page." },
    { key: "source_preview_hero", label: "Source-aware hero", pass: sourceHeroReady, severity: "high", note: sourceHeroReady ? "URL-based previews use the source-aware hero." : "Use the source-aware hero for URL-based redesign previews." },
    { key: "source_preview_pages", label: "Evidence-led page count", pass: sourcePageCountReady, severity: "medium", note: sourcePageCountReady ? "The source preview uses a focused three-to-five page architecture." : "Do not force empty pages into a source-driven prospect preview." },
    { key: "source_identity_people", label: "People preserved", pass: sourcePeoplePreserved, severity: "high", note: sourcePeoplePreserved ? "Important people from the source business remain visible." : "The source site contains real people, but the redesign dropped them." },
    { key: "source_identity_testimonials", label: "Customer proof preserved", pass: sourceTestimonialsPreserved, severity: "high", note: sourceTestimonialsPreserved ? "Real testimonial evidence remains visible." : "The source site contains testimonials, but the redesign dropped them." },
    { key: "source_identity_heritage", label: "History preserved", pass: sourceHeritagePreserved, severity: "high", note: sourceHeritagePreserved ? "History and archival proof are retained when present." : "The source site contains history or press material, but the redesign lost it." },
    { key: "source_identity_logo", label: "Brand identity preserved", pass: sourceLogoPreserved, severity: "high", note: sourceLogoPreserved ? "The existing logo is retained when available." : "The source logo was available but not retained." },
    { key: "source_identity_services", label: "Service depth preserved", pass: sourceServicesPreserved, severity: "high", note: sourceServicesPreserved ? "The redesign keeps the source service depth visible." : "The source site contains multiple services, but the redesign collapsed them too far." },
    { key: "source_identity_faq", label: "Useful source information preserved", pass: sourceFaqPreserved, severity: "medium", note: sourceFaqPreserved ? "Useful source FAQs remain available." : "The source site contains useful FAQs, but the redesign dropped them." },
    { key: "source_identity_typography", label: "Typography matches identity", pass: sourceTypographyPreserved, severity: "medium", note: sourceTypographyPreserved ? "Typography direction respects the source business character." : "An established heritage-led business should not be flattened into a generic sans-serif identity." },
    { key: "source_redesign_advantage", label: "Better-than-existing redesign gate", pass: sourceRedesignAdvantageReady, severity: "high", note: sourceRedesignAdvantageReady ? "The redesign clears the combined identity, hierarchy, conversion and anti-template floor." : "Do not show this concept yet; it has not earned a clear redesign advantage over the source site." },
    { key: "cta", label: "Conversion path", pass: hasCta, severity: "high", note: hasCta ? "A conversion section is present." : "Add contact, booking, or CTA path." },
    { key: "proof", label: "Proof", pass: hasProof, severity: "medium", note: hasProof ? "Trust/proof section is present." : "Add verified proof or a factual trust section." },
    { key: "proof_integrity", label: "Proof integrity", pass: !hasPlaceholderProof, severity: "high", note: hasPlaceholderProof ? "Placeholder client/testimonial labels detected. Replace with verified proof or remove the testimonial block." : "No placeholder client proof detected." },
    { key: "pricing_integrity", label: "Pricing integrity", pass: !hasGenericPricing, severity: "high", note: hasGenericPricing ? "Generic Essential/Recommended/Complete pricing detected. Use verified pricing or remove the pricing block." : "No unsupported generic pricing detected." },
    { key: "imagery", label: "Intentional imagery", pass: hasImagery, severity: "medium", note: hasImagery ? "Media is used in the page content." : "Use real business imagery where available, or intentionally design without photography." },
    { key: "alt", label: "Image accessibility", pass: hasAltText, severity: "high", note: hasAltText ? "Known image records include alt text." : "Add alt text to every published image." },
    { key: "profile", label: "Design profile", pass: hasProfile, severity: "medium", note: hasProfile ? "An approved design profile is configured." : "Assign an approved design profile before publishing." },
    { key: "typography_direction", label: "Typography direction", pass: hasTypographyDirection, severity: "medium", note: hasTypographyDirection ? "Typography profile is configured." : "Assign a deliberate typography profile." },
    { key: "motion_direction", label: "Motion direction", pass: hasMotionDirection, severity: "low", note: hasMotionDirection ? "Motion profile is configured." : "Choose an explicit motion profile, including none when appropriate." },
    { key: "variant_direction", label: "Composition variants", pass: hasVariantDirection && !repeatedVariant, severity: "medium", note: !hasVariantDirection ? "Too few sections have explicit composition variants." : repeatedVariant ? "Too many sections repeat the same composition variant." : "Section variants show deliberate composition direction." },
    { key: "rhythm", label: "Section rhythm", pass: !duplicateTypes && !genericCardFingerprint, severity: "medium", note: duplicateTypes || genericCardFingerprint ? "The page risks feeling template-driven. Vary section types, scale and composition." : "Section types have reasonable variation." },
    { key: "anti_ai_copy", label: "Natural copy", pass: !aiFingerprint, severity: "medium", note: aiFingerprint ? "Copy contains a common AI/agency cliché; rewrite it before launch." : "No common AI copy fingerprint detected." },
    { key: "placeholders", label: "No placeholders", pass: !hasPlaceholder, severity: "high", note: hasPlaceholder ? "Replace placeholder or sample copy before publishing." : "No obvious placeholder copy detected." },
    { key: "media_integrity", label: "Customer media integrity", pass: !hasPlaceholderMedia, severity: generationMode === "brand_led" ? "high" : "medium", note: hasPlaceholderMedia ? "Premium output is still using a generic template image. Use a customer asset slot or supplied media instead." : "No generic template image is masquerading as customer media." },
    { key: "seo", label: "Search metadata", pass: hasSeo, severity: "medium", note: hasSeo ? "Title and description are configured." : "Add a page title and meta description." },
    { key: "navigation", label: "Page structure", pass: hasNavigation, severity: "medium", note: hasNavigation ? "Pages have usable titles and slugs." : "Give each published page a stable title and slug." },
    { key: "composition_depth", label: "Composition depth", pass: compositionDepth, severity: generationMode === "fast" ? "low" : "medium", note: compositionDepth ? "The homepage has enough compositional depth for its generation mode." : "Add more purposeful homepage rhythm for the selected generation mode." },
    { key: "customer_asset_plan", label: "Customer asset plan", pass: premiumAssetPlan, severity: generationMode === "brand_led" ? "medium" : "low", note: premiumAssetPlan ? "Customer-specific media slots are planned without fabricated assets." : "Premium/brand-led output should reserve intentional slots for customer-supplied photography or product media." },
    { key: "anti_card_wall", label: "Avoid card-wall layout", pass: cardHeavyRatio <= 0.45, severity: "medium", note: cardHeavyRatio <= 0.45 ? "Cards are not dominating the composition." : "Too many sections resolve to card grids; switch to editorial, split, band or list compositions." },
    { key: "alignment_variety", label: "Alignment variety", pass: centeredRatio <= 0.6, severity: "low", note: centeredRatio <= 0.6 ? "Alignment is sufficiently varied." : "Too much of the site is centered; introduce left-led editorial composition." },
  ];

  const score = Math.round((checks.filter((check) => check.pass).length / checks.length) * 100);
  const highFailures = checks.filter((check) => check.severity === "high" && !check.pass).length;
  const visualVariety = Math.max(0, Math.min(100, 100 - (repeatedVariant ? 35 : 0) - (duplicateTypes ? 25 : 0) - Math.round(cardHeavyRatio * 35)));
  const hierarchy = Math.max(0, Math.min(100, (hasHero ? 30 : 0) + (hasHeadline ? 25 : 0) + (compositionDepth ? 25 : 0) + (centeredRatio <= 0.6 ? 20 : 5)));
  const proofQuality = Math.max(0, Math.min(100, (hasProof ? 45 : 20) + (!hasPlaceholderProof ? 35 : 0) + (!hasGenericPricing ? 20 : 0)));
  const conversionClarity = Math.max(0, Math.min(100, (hasCta ? 55 : 0) + (hasHero ? 20 : 0) + (hasNavigation ? 15 : 0) + (hasSeo ? 10 : 0)));
  const identityChecks = [
    sourcePeoplePreserved,
    sourceTestimonialsPreserved,
    sourceHeritagePreserved,
    sourceLogoPreserved,
    sourceServicesPreserved,
    sourceFaqPreserved,
    sourceTypographyPreserved,
  ];
  const identityPreservation = sourceDriven
    ? Math.round((identityChecks.filter(Boolean).length / identityChecks.length) * 100)
    : 100;
  const aiTemplateRisk = Math.max(0, Math.min(100,
    (aiFingerprint ? 30 : 0) +
    (repeatedVariant ? 25 : 0) +
    (duplicateTypes ? 20 : 0) +
    Math.round(cardHeavyRatio * 25) +
    (centeredRatio > 0.6 ? 15 : 0) +
    (hasPlaceholderMedia ? 20 : 0) +
    (sourceDriven && sourceForbiddenLanguage ? 35 : 0) +
    (fakeAvailability ? 35 : 0) +
    (!sourceContactDiscipline ? 20 : 0) +
    (!sourceHeroReady ? 25 : 0)
  ));
  const metrics = { visualVariety, hierarchy, proofQuality, conversionClarity, identityPreservation, redesignAdvantage, aiTemplateRisk };
  const threshold = previewPurpose
    ? (sourceDriven ? 88 : 85)
    : generationMode === "brand_led"
      ? 86
      : generationMode === "premium"
        ? 83
        : 80;
  const productionReady = score >= threshold
    && highFailures === 0
    && aiTemplateRisk <= (sourceDriven ? 25 : generationMode === "brand_led" ? 35 : 45)
    && (!sourceDriven || (identityPreservation >= 80 && redesignAdvantage >= 87));
  return { score, productionReady, checks, metrics };
}


export const evaluateGeneratedDesign = assessWebsiteDesign;
