import type { Website, WebsiteSection } from "../types";
import { APPROVED_VARIANTS, DESIGN_PROFILES, type DesignProfileId } from "../constants/designProfiles";
import { contrastRatio, pickReadableTextColor } from "./colorContrast";
import { applyDesignDirection, type DesignDirection } from "./designDirector";

/**
 * Design packs are stable, reviewable visual recipes layered onto the existing
 * renderer. Content, verified claims, contact details and publishing remain
 * owned by the website; switching a pack never generates fabricated evidence.
 */
export type DesignPackId = "conversion_local" | "editorial_authority" | "organic_human";
export type DesignPackStatus = "approved" | "candidate" | "retired";
export type DesignPack = {
  id: DesignPackId;
  version: string;
  status: DesignPackStatus;
  label: string;
  description: string;
  bestFor: string[];
  profile: DesignProfileId;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  imageTreatment: "clean" | "editorial" | "organic";
  motion: "none" | "subtle" | "refined";
  sections: Partial<Record<keyof typeof APPROVED_VARIANTS, string>>;
  notes: string[];
  sources: string[];
};

export const DESIGN_PACKS: Record<DesignPackId, DesignPack> = {
  conversion_local: {
    id: "conversion_local", version: "1.0.0", status: "approved",
    label: "Conversion-First Local", description: "Mobile-first service clarity, obvious enquiry paths and credible local trust.",
    bestFor: ["Local Services", "Renovation", "Trades", "Home Services", "Electrician"],
    profile: "modern_minimal", primaryColor: "#175D70", secondaryColor: "#EDF5F6",
    fontFamily: "Inter, sans-serif", imageTreatment: "clean", motion: "subtle",
    sections: { hero: "service_conversion", services: "editorial_list", proof: "trust_strip",
      testimonials: "review_grid", cta: "consultation", faq: "accordion", features: "bento" },
    notes: ["Prioritise phone and enquiry CTAs", "Use approved reviews only", "Show real service areas"],
    sources: ["https://web.dev/vitals/", "https://www.w3.org/WAI/WCAG22/quickref/"],
  },
  editorial_authority: {
    id: "editorial_authority", version: "1.0.0", status: "approved",
    label: "Editorial Authority", description: "Quiet typography-led credibility with measured spacing and founder or practitioner proof.",
    bestFor: ["Consultant", "Legal", "Corporate", "Professional Services", "Clinic / Healthcare"],
    profile: "trust_authority", primaryColor: "#243F53", secondaryColor: "#F1EFE9",
    fontFamily: "'Source Sans 3', sans-serif", imageTreatment: "editorial", motion: "subtle",
    sections: { hero: "editorial_split", services: "editorial_list", about: "founder_feature",
      proof: "certification_strip", testimonials: "editorial_quote", cta: "editorial", faq: "two_column" },
    notes: ["Preserve credentials and practice identity", "Do not invent qualifications", "Use real people when provided"],
    sources: ["https://www.w3.org/WAI/WCAG22/quickref/", "https://web.dev/vitals/"],
  },
  organic_human: {
    id: "organic_human", version: "1.0.0", status: "approved",
    label: "Organic Human", description: "Warm editorial rhythm, approachable presentation and authentic people or product imagery.",
    bestFor: ["Wellness", "Education", "Restaurant", "Hospitality", "Beauty", "Community"],
    profile: "craft_organic", primaryColor: "#41634E", secondaryColor: "#F4F1E6",
    fontFamily: "Plus Jakarta Sans, sans-serif", imageTreatment: "organic", motion: "refined",
    sections: { hero: "media_split", services: "alternating", about: "editorial_story",
      features: "media_cards", testimonials: "featured", cta: "minimal", gallery: "masonry" },
    notes: ["Use genuine customer photography", "Keep booking/enquiry path readable", "Avoid decorative animation"],
    sources: ["https://web.dev/vitals/", "https://www.w3.org/WAI/WCAG22/quickref/"],
  },
};
export const DESIGN_PACK_LIST = Object.values(DESIGN_PACKS);

const SECTION_ALIASES: Record<string, keyof typeof APPROVED_VARIANTS> = {
  service: "services", services: "services", testimonial: "testimonials", testimonials: "testimonials",
  feature: "features", features: "features", contact_cta: "cta", call_to_action: "cta",
};
export function sectionVariantForPack(section: WebsiteSection, pack: DesignPack): string | undefined {
  const type = String(section.type || "").toLowerCase();
  const key = (SECTION_ALIASES[type] || type) as keyof typeof APPROVED_VARIANTS;
  const suggested = pack.sections[key];
  const allowed = APPROVED_VARIANTS[key] as readonly string[] | undefined;
  return suggested && allowed?.includes(suggested) ? suggested : undefined;
}
export function recommendDesignPack(input: { industry?: string; goal?: string; personality?: string }): {
  pack: DesignPack; rationale: string[];
} {
  const signal = [input.industry, input.goal, input.personality].filter(Boolean).join(" ").toLowerCase();
  if (/clinic|medical|healthcare|law|legal|consult|account|corporate|professional|authority|trust/.test(signal)) {
    return { pack: DESIGN_PACKS.editorial_authority, rationale: ["Professional credibility and clarity are primary.", "Editorial proof works better than decorative effects."] };
  }
  if (/wellness|beauty|spa|education|tuition|school|restaurant|cafe|hospitality|friendly|organic/.test(signal)) {
    return { pack: DESIGN_PACKS.organic_human, rationale: ["Human connection and imagery are important.", "A warm visual direction supports approachability."] };
  }
  return { pack: DESIGN_PACKS.conversion_local, rationale: ["Fast enquiry access matters most for a service business.", "A clean, mobile-first structure reduces friction."] };
}
export function applyDesignPack(website: Website, packId: DesignPackId): Website {
  const pack = DESIGN_PACKS[packId];
  if (!pack || pack.status !== "approved") throw new Error("Design pack is not approved.");
  const profile = DESIGN_PROFILES[pack.profile];
  const pages = website.pages.map(page => ({
    ...page,
    sections: page.sections.map(section => {
      // Source-driven layouts use evidence-aware renderers. Never replace
      // their protected hero or specialist source variants with pack presets.
      if (website.theme?.sourceDriven && (section.type === "hero" || String(section.settings?.variant || "").startsWith("source_"))) return section;
      const variant = sectionVariantForPack(section, pack);
      return variant ? { ...section, settings: { ...section.settings, variant } } : section;
    }),
  }));
  return {
    ...website,
    pages,
    theme: {
      ...website.theme,
      designPackId: pack.id,
      designPackVersion: pack.version,
      designProfile: pack.profile,
      typographyProfile: profile.typography,
      spacingProfile: profile.spacing,
      layoutDensity: profile.spacing,
      motionProfile: pack.motion,
      imageProfile: pack.imageTreatment,
      style: profile.defaultStyle,
      primaryColor: pack.primaryColor,
      secondaryColor: pack.secondaryColor,
      fontFamily: pack.fontFamily,
    },
  };
}
export function assessDesignPackRelease(pack: DesignPack): string[] {
  const failures: string[] = [];
  if (!/^\d+\.\d+\.\d+$/.test(pack.version)) failures.push("Use semantic versioning.");
  if (!DESIGN_PROFILES[pack.profile]) failures.push("Unknown design profile.");
  for (const [section, variant] of Object.entries(pack.sections)) {
    const allowed = APPROVED_VARIANTS[section as keyof typeof APPROVED_VARIANTS] as readonly string[] | undefined;
    if (!allowed?.includes(String(variant))) failures.push(`Unapproved ${section} variant: ${variant}`);
  }
  if (!pack.sources.length) failures.push("Document research and accessibility sources.");
  if (!pack.notes.length) failures.push("Document client asset and content constraints.");
  if (!/^#[0-9a-f]{6}$/i.test(pack.primaryColor) || !/^#[0-9a-f]{6}$/i.test(pack.secondaryColor)) failures.push("Colors must be valid six-digit hex codes.");
  else {
    if (contrastRatio(pack.primaryColor, pack.secondaryColor) < 4.5) failures.push("Foreground/background contrast must meet WCAG AA.");
    if (contrastRatio(pickReadableTextColor(pack.primaryColor), pack.primaryColor) < 4.5) failures.push("Primary button text contrast must meet WCAG AA.");
  }
  return failures;
}

/** Apply an AI-generated direction only after strict schema and allowlist validation. */
export function applyApprovedDesignDirection(website: Website, direction: DesignDirection): Website {
  const overrides: Partial<Record<string, string>> = {
    hero: direction.heroVariant,
    services: direction.servicesVariant,
    testimonials: direction.testimonialVariant,
    cta: direction.ctaVariant,
  };
  return {
    ...website,
    pages: website.pages.map(page => ({
      ...page,
      sections: page.sections.map(section => {
        if (website.theme?.sourceDriven && (section.type === "hero" || String(section.settings?.variant || "").startsWith("source_"))) return section;
        const variant = overrides[section.type];
        return variant ? { ...section, settings: { ...section.settings, variant } } : section;
      }),
    })),
    theme: {
      ...website.theme,
      ...applyDesignDirection(website.theme, direction),
      // AI customization is not the same as a pinned versioned design pack.
      designPackId: undefined,
      designPackVersion: undefined,
    },
  };
}
