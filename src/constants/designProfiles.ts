import type { AssetReadiness, BrandPersonality, BusinessMaturity, IndustryCategory, Website, WebsiteGenerationMode } from "../types";

export type DesignProfileId =
  | "editorial_luxury"
  | "modern_minimal"
  | "bold_contemporary"
  | "trust_authority"
  | "craft_organic"
  | "brand_corporate";

export type TypographyProfileId =
  | "luxury_editorial"
  | "architectural"
  | "modern_professional"
  | "friendly_humanist"
  | "bold_contemporary"
  | "authority"
  | "premium_corporate";

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
    displayFont: "Outfit, sans-serif",
    bodyFont: "Inter, sans-serif",
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
    bodyFont: "Inter, sans-serif",
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
  brand_corporate: {
    id: "brand_corporate",
    label: "Brand-Led Corporate",
    description: "Agency-style brand composition with strong colour, editorial media, asymmetric grids, substantial typography and restrained motion.",
    typography: "premium_corporate",
    spacing: "immersive",
    motion: "refined",
    displayFont: "Space Grotesk, sans-serif",
    bodyFont: "Inter, sans-serif",
    defaultStyle: "corporate",
    radii: "sharp",
    imageTreatment: "editorial",
  },
};

export const GENERATION_MODE_OPTIONS: Array<{
  id: WebsiteGenerationMode;
  label: string;
  description: string;
  benchmark: string;
}> = [
  {
    id: "fast",
    label: "Fast",
    description: "Focused conversion-first composition for straightforward local and service businesses.",
    benchmark: "Clean managed SMB website",
  },
  {
    id: "premium",
    label: "Premium",
    description: "Richer editorial composition, stronger hierarchy, customer imagery slots and varied section rhythm.",
    benchmark: "Premium agency website",
  },
  {
    id: "brand_led",
    label: "Brand-led",
    description: "Deep brand composition for established firms: bold media, asymmetric grids, story, capabilities, people and insights.",
    benchmark: "ITS / Cognism-level design language",
  },
];

export const DESIGN_PROFILE_OPTIONS = Object.values(DESIGN_PROFILES);

export const DESIGN_PROFILE_BY_INDUSTRY: Partial<Record<IndustryCategory, DesignProfileId>> = {
  "Clinic / Healthcare": "trust_authority",
  Legal: "trust_authority",
  Consultant: "modern_minimal",
  Corporate: "brand_corporate",
  SaaS: "brand_corporate",
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

export function resolveDesignProfileForMode(
  mode: WebsiteGenerationMode = "fast",
  industry?: string | null,
  requestedProfile?: string | null,
  intent?: {
    brandPersonality?: BrandPersonality;
    businessMaturity?: BusinessMaturity;
    assetReadiness?: AssetReadiness;
  },
): DesignProfile {
  if (requestedProfile && requestedProfile in DESIGN_PROFILES) {
    return DESIGN_PROFILES[requestedProfile as DesignProfileId];
  }

  const base = resolveDesignProfile(undefined, industry);
  if (mode === "fast") return base;

  const personality = intent?.brandPersonality;
  if (personality === "bold") return DESIGN_PROFILES.bold_contemporary;
  if (personality === "friendly" || personality === "approachable") {
    if (industry === "Clinic / Healthcare" || industry === "Legal") return DESIGN_PROFILES.trust_authority;
    return DESIGN_PROFILES.craft_organic;
  }
  if (personality === "elegant") return DESIGN_PROFILES.editorial_luxury;
  if (personality === "technical" || personality === "established") return DESIGN_PROFILES.brand_corporate;
  if (personality === "premium") {
    if (industry === "Hospitality" || industry === "Retail / Boutique" || industry === "Portfolio" || industry === "Real Estate") {
      return DESIGN_PROFILES.editorial_luxury;
    }
    return DESIGN_PROFILES.brand_corporate;
  }

  if (mode === "brand_led") {
    if (industry === "Clinic / Healthcare" || industry === "Legal") return DESIGN_PROFILES.trust_authority;
    if (industry === "Hospitality" || industry === "Retail / Boutique" || industry === "Portfolio" || industry === "Real Estate") {
      return DESIGN_PROFILES.editorial_luxury;
    }
    return DESIGN_PROFILES.brand_corporate;
  }

  if (base.id === "craft_organic" || base.id === "bold_contemporary") return base;
  if (industry === "Corporate" || industry === "SaaS") return DESIGN_PROFILES.brand_corporate;
  return base.id === "modern_minimal" ? DESIGN_PROFILES.brand_corporate : base;
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
  hero: ["brand_media", "editorial_split", "full_bleed_editorial", "statement_media", "source_brand_hero", "page_masthead", "service_conversion", "full_bleed", "minimal_statement", "media_split"],
  services: ["brand_families", "editorial_list", "image_grid", "alternating", "minimal", "cards"],
  about: ["split_media_left", "split_media_right", "editorial_story", "founder_feature"],
  features: ["editorial_strip", "capability_matrix", "media_cards", "bento"],
  benefits: ["editorial_values", "icon_grid", "numbered_principles"],
  proof: ["logo_wall", "logo_marquee", "certification_strip", "metrics", "trust_strip"],
  team: ["founder_story", "leadership_grid", "editorial_people"],
  blog_list: ["insights_editorial", "featured_article", "news_grid"],
  testimonials: ["editorial_quote", "review_grid", "featured", "slider", "proof_wall"],
  cta: ["brand_band", "minimal", "full_bleed", "consultation", "editorial"],
  faq: ["media_accordion", "accordion", "two_column", "editorial"],
  gallery: ["masonry", "horizontal", "before_after", "case_study"],
} as const;

export function getDefaultVariant(type: string, profile: DesignProfileId): string | undefined {
  const variants = APPROVED_VARIANTS[type as keyof typeof APPROVED_VARIANTS];
  if (!variants?.length) return undefined;
  const index = {
    editorial_luxury: 1,
    modern_minimal: Math.min(2, variants.length - 1),
    bold_contemporary: Math.min(2, variants.length - 1),
    trust_authority: Math.min(1, variants.length - 1),
    craft_organic: Math.min(1, variants.length - 1),
    brand_corporate: 0,
  }[profile];
  return variants[Math.min(index, variants.length - 1)];
}

export function getVariantForMode(
  type: string,
  profile: DesignProfileId,
  mode: WebsiteGenerationMode = "fast",
  ordinal = 0,
  intent?: {
    brandPersonality?: BrandPersonality;
    businessMaturity?: BusinessMaturity;
    assetReadiness?: AssetReadiness;
  },
): string | undefined {
  if (mode === "fast") return getDefaultVariant(type, profile);

  if (type === "hero") {
    if (intent?.assetReadiness === "pending") {
      return mode === "brand_led" ? "statement_media" : "editorial_split";
    }
    if (intent?.assetReadiness === "professional") {
      return mode === "brand_led" ? "brand_media" : "editorial_split";
    }
  }

  if (type === "about" && intent?.brandPersonality === "elegant") return "editorial_story";
  if (type === "services" && intent?.brandPersonality === "bold") return "alternating";
  if (type === "features" && intent?.brandPersonality === "technical") return "capability_matrix";

  const premium: Record<string, string[]> = {
    hero: ["editorial_split", "statement_media"],
    services: ["editorial_list", "alternating"],
    about: ["split_media_left", "editorial_story"],
    features: ["editorial_strip", "capability_matrix"],
    benefits: ["editorial_values", "numbered_principles"],
    proof: ["trust_strip", "logo_wall"],
    team: ["editorial_people", "founder_story"],
    blog_list: ["insights_editorial", "featured_article"],
    testimonials: ["editorial_quote", "featured"],
    cta: ["consultation", "editorial"],
    faq: ["two_column", "media_accordion"],
  };
  const brand: Record<string, string[]> = {
    hero: ["brand_media", "full_bleed_editorial"],
    services: ["brand_families", "editorial_list"],
    about: ["split_media_right", "editorial_story"],
    features: ["editorial_strip", "capability_matrix"],
    benefits: ["editorial_values", "numbered_principles"],
    proof: ["logo_wall", "certification_strip"],
    team: ["leadership_grid", "founder_story"],
    blog_list: ["featured_article", "insights_editorial"],
    testimonials: ["editorial_quote", "featured"],
    cta: ["brand_band", "full_bleed"],
    faq: ["media_accordion", "two_column"],
  };
  const options = (mode === "brand_led" ? brand : premium)[type];
  if (!options?.length) return getDefaultVariant(type, profile);
  return options[ordinal % options.length];
}

export const INDUSTRY_COMPOSITIONS: Record<string, string[]> = {
  renovation: ["hero", "proof", "services", "industry_content", "testimonials", "faq", "contact", "cta"],
  healthcare: ["hero", "proof", "services", "about", "testimonials", "faq", "appointment", "cta"],
  consultant: ["hero", "problem", "solution", "services", "proof", "about", "cta", "contact"],
  local_service: ["hero", "proof", "services", "benefits", "testimonials", "faq", "contact", "cta"],
  luxury: ["hero", "about", "industry_content", "proof", "testimonials", "contact", "cta"],
};
