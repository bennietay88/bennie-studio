import type { IndustryCategory, Website } from "../types";

export type DesignProfileId =
  | "editorial_luxury"
  | "modern_minimal"
  | "bold_contemporary"
  | "trust_authority"
  | "craft_organic";

export type TypographyProfileId =
  | "luxury_editorial"
  | "architectural"
  | "modern_professional"
  | "friendly_humanist"
  | "bold_contemporary"
  | "authority";

export type SpacingProfileId = "compact" | "balanced" | "editorial" | "immersive";
export type MotionProfileId = "none" | "subtle" | "refined" | "expressive" | "cinematic";

export interface DesignProfile {
  id: DesignProfileId;
  label: string;
  description: string;
  typography: TypographyProfileId;
  spacing: SpacingProfileId;
  motion: MotionProfileId;
  displayFont: string;
  bodyFont: string;
  defaultStyle: NonNullable<Website["theme"]["style"]>;
  radii: "sharp" | "soft" | "round";
  imageTreatment: "editorial" | "clean" | "graphic" | "documentary" | "organic";
}

export const DESIGN_PROFILES: Record<DesignProfileId, DesignProfile> = {
  editorial_luxury: {
    id: "editorial_luxury",
    label: "Editorial Luxury",
    description: "Large type, strong photography, asymmetric rhythm, and restrained motion.",
    typography: "luxury_editorial",
    spacing: "immersive",
    motion: "refined",
    displayFont: "Fraunces, serif",
    bodyFont: "Inter, sans-serif",
    defaultStyle: "prestige",
    radii: "soft",
    imageTreatment: "editorial",
  },
  modern_minimal: {
    id: "modern_minimal",
    label: "Modern Minimal",
    description: "A precise grid, calm palette, and sharp hierarchy for clear business communication.",
    typography: "modern_professional",
    spacing: "balanced",
    motion: "subtle",
    displayFont: "Space Grotesk, sans-serif",
    bodyFont: "Inter, sans-serif",
    defaultStyle: "editorial",
    radii: "sharp",
    imageTreatment: "clean",
  },
  bold_contemporary: {
    id: "bold_contemporary",
    label: "Bold Contemporary",
    description: "Oversized type, decisive colour, and expressive but purposeful composition.",
    typography: "bold_contemporary",
    spacing: "compact",
    motion: "expressive",
    displayFont: "Bricolage Grotesque, sans-serif",
    bodyFont: "Public Sans, sans-serif",
    defaultStyle: "action",
    radii: "round",
    imageTreatment: "graphic",
  },
  trust_authority: {
    id: "trust_authority",
    label: "Trust / Authority",
    description: "Proof-first structure, readable typography, and restrained conversion-focused details.",
    typography: "authority",
    spacing: "balanced",
    motion: "subtle",
    displayFont: "Plus Jakarta Sans, sans-serif",
    bodyFont: "Public Sans, sans-serif",
    defaultStyle: "authority",
    radii: "soft",
    imageTreatment: "documentary",
  },
  craft_organic: {
    id: "craft_organic",
    label: "Craft / Organic",
    description: "Warm type, human-scale layouts, real work imagery, and tactile local character.",
    typography: "friendly_humanist",
    spacing: "editorial",
    motion: "refined",
    displayFont: "Fraunces, serif",
    bodyFont: "Plus Jakarta Sans, sans-serif",
    defaultStyle: "editorial",
    radii: "soft",
    imageTreatment: "organic",
  },
};

export const DESIGN_PROFILE_OPTIONS = Object.values(DESIGN_PROFILES);

export const DESIGN_PROFILE_BY_INDUSTRY: Partial<Record<IndustryCategory, DesignProfileId>> = {
  "Clinic / Healthcare": "trust_authority",
  Legal: "trust_authority",
  Consultant: "modern_minimal",
  Corporate: "modern_minimal",
  "Local Services": "craft_organic",
  Fitness: "bold_contemporary",
  Wellness: "craft_organic",
  Portfolio: "editorial_luxury",
  "Retail / Boutique": "editorial_luxury",
  Hospitality: "editorial_luxury",
  Restaurant: "craft_organic",
  "Real Estate": "editorial_luxury",
};

export function resolveDesignProfile(
  profile?: string | null,
  industry?: string | null,
  fallback: DesignProfileId = "modern_minimal",
): DesignProfile {
  if (profile && profile in DESIGN_PROFILES) return DESIGN_PROFILES[profile as DesignProfileId];
  const byIndustry = industry && DESIGN_PROFILE_BY_INDUSTRY[industry as IndustryCategory];
  return DESIGN_PROFILES[byIndustry || fallback];
}

export const DESIGN_TOKENS = {
  spacing: {
    compact: { section: "clamp(4.5rem, 8vw, 7rem)", gap: "1.25rem", content: "72rem" },
    balanced: { section: "clamp(5rem, 10vw, 8rem)", gap: "1.75rem", content: "76rem" },
    editorial: { section: "clamp(6rem, 12vw, 10rem)", gap: "2.25rem", content: "78rem" },
    immersive: { section: "clamp(7rem, 15vw, 13rem)", gap: "3rem", content: "82rem" },
  },
  motion: {
    none: { duration: "0ms", easing: "linear" },
    subtle: { duration: "220ms", easing: "cubic-bezier(.2,.7,.2,1)" },
    refined: { duration: "520ms", easing: "cubic-bezier(.21,.47,.32,.98)" },
    expressive: { duration: "720ms", easing: "cubic-bezier(.16,1,.3,1)" },
    cinematic: { duration: "1100ms", easing: "cubic-bezier(.16,1,.3,1)" },
  },
} as const;

export const APPROVED_VARIANTS = {
  hero: ["editorial_split", "full_bleed", "minimal_statement", "media_split", "service_conversion"],
  services: ["editorial_list", "image_grid", "minimal", "alternating", "cards"],
  testimonials: ["editorial_quote", "review_grid", "featured", "slider", "proof_wall"],
  cta: ["minimal", "full_bleed", "consultation", "editorial"],
  faq: ["accordion", "two_column", "editorial"],
  gallery: ["masonry", "horizontal", "before_after", "case_study"],
} as const;

export function getDefaultVariant(type: string, profile: DesignProfileId): string | undefined {
  const variants = APPROVED_VARIANTS[type as keyof typeof APPROVED_VARIANTS];
  if (!variants?.length) return undefined;
  const index = {
    editorial_luxury: 0,
    modern_minimal: 2,
    bold_contemporary: 1,
    trust_authority: 2,
    craft_organic: 1,
  }[profile];
  return variants[Math.min(index, variants.length - 1)];
}

export const INDUSTRY_COMPOSITIONS: Record<string, string[]> = {
  renovation: ["hero", "proof", "services", "industry_content", "testimonials", "faq", "contact", "cta"],
  healthcare: ["hero", "proof", "services", "about", "testimonials", "faq", "appointment", "cta"],
  consultant: ["hero", "problem", "solution", "services", "proof", "about", "cta", "contact"],
  local_service: ["hero", "proof", "services", "benefits", "testimonials", "faq", "contact", "cta"],
  luxury: ["hero", "about", "industry_content", "proof", "testimonials", "contact", "cta"],
};
