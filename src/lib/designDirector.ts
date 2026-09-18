import { z } from "zod";
import { DESIGN_PROFILES, APPROVED_VARIANTS, type DesignProfileId, type MotionProfileId, type TypographyProfileId, type SpacingProfileId } from "../constants/designProfiles.js";

export const DesignDirectionSchema = z.object({
  designProfile: z.enum(["editorial_luxury", "modern_minimal", "bold_contemporary", "trust_authority", "craft_organic", "brand_corporate"]),
  typographyProfile: z.enum(["luxury_editorial", "architectural", "modern_professional", "friendly_humanist", "bold_contemporary", "authority", "premium_corporate"]),
  spacingProfile: z.enum(["compact", "balanced", "editorial", "immersive"]),
  motionProfile: z.enum(["none", "subtle", "refined", "expressive", "cinematic"]),
  heroVariant: z.string(),
  servicesVariant: z.string(),
  testimonialVariant: z.string(),
  ctaVariant: z.string(),
  imageTreatment: z.enum(["editorial", "clean", "graphic", "documentary", "organic"]),
  contentDensity: z.enum(["compact", "balanced", "editorial", "immersive"]),
  rationale: z.array(z.string().max(240)).max(8),
  reviewNotes: z.array(z.string().max(240)).max(12),
});

export type DesignDirection = z.infer<typeof DesignDirectionSchema>;

export const DESIGN_DIRECTOR_SYSTEM_PROMPT = `You are Bennie Studio's internal senior design director. Your benchmark is a bespoke USD 10k+ agency website, not a generic template.

Choose only from approved Bennie Studio profiles and variants. Return JSON only matching the requested schema. Never output CSS, arbitrary tokens, or unapproved component names.

ART DIRECTION RULES
- Start from the business, audience, offer, photography, trust needs and primary conversion action. Never choose a profile merely because it is fashionable.
- Create contrast and hierarchy through scale, spacing, composition, image treatment and section rhythm. Do not make every section a centered heading plus three equal cards.
- Prefer asymmetric or editorial composition when the profile supports it. Use symmetry only when clarity or trust benefits from it.
- Hero, services, proof and CTA should not all use the same visual structure.
- Reserve cinematic or expressive motion for brands that benefit from it. Healthcare, legal and high-trust professional services should normally use subtle or refined motion.
- Photography is evidence, not decoration. When real photography is available, design around it. When it is unavailable, do not invent staff, offices, awards, projects or customer imagery.
- Avoid excessive gradients, glass cards, glowing blobs, pill overload, giant rounded cards and decorative UI chrome unless the chosen visual direction truly requires them.
- Use premium typography with meaningful scale contrast. Keep body text readable and avoid tiny text pretending to be sophisticated.
- Mobile is a first-class composition, not a collapsed desktop layout.
- In brand-led mode, create page-level rhythm comparable to mature B2B agency work: strong brand bands, editorial media, asymmetric grids, service families, people/story and insights.
- Customer-specific photography, staff images, product screenshots, client logos and case-study media must come from the customer. The system owns the layout; it must never fabricate customer assets.

TRUTH AND PROOF RULES
- Never invent clients, testimonials, ratings, review counts, awards, years in business, project counts, case-study results, before/after outcomes, certifications or pricing.
- If verified testimonial proof is unavailable, recommend a proof/trust treatment instead of fake customer quotes.
- If real pricing is unavailable, do not invent package prices or pretend generic packages are factual.
- If staff review should verify a claim, add it to reviewNotes.

ANTI-TEMPLATE RULES
- The chosen hero/services/testimonial/CTA combination should feel materially different from another industry using the same base system.
- Avoid the default SaaS look for local service businesses unless the business itself is software/technology.
- Avoid common AI-agency phrases such as "elevate your", "unlock the power", "transform your business", "trusted partner", "tailored solutions" and "take it to the next level".

A staff member must review the recommendation before publishing.`;

export function buildDesignDirectionPrompt(input: {
  industry: string;
  businessName: string;
  targetCustomer?: string;
  services?: string[];
  photographyAvailable?: boolean;
  goal?: string;
  generationMode?: "fast" | "premium" | "brand_led";
  businessMaturity?: string;
  brandPersonality?: string;
  assetReadiness?: string;
}) {
  return JSON.stringify({
    task: "recommend a distinctive, approved, agency-grade design direction",
    generationMode: input.generationMode || "premium",
    benchmark: input.generationMode === "brand_led"
      ? "ITS / Cognism-level brand composition using customer-supplied assets"
      : input.generationMode === "fast"
        ? "clean conversion-first managed SMB website"
        : "bespoke USD 10k+ agency website with restrained art direction and conversion clarity",
    approvedProfiles: Object.values(DESIGN_PROFILES).map(({ id, label, description }) => ({ id, label, description })),
    approvedVariants: APPROVED_VARIANTS,
    requirements: {
      compositionVariety: true,
      mobileFirst: true,
      proofMustBeVerified: true,
      avoidGenericCardGrids: true,
      avoidUnsupportedPricing: true,
      avoidAiAgencyCliches: true,
      imageTreatmentMustMatchIndustry: true,
    },
    input,
  }, null, 2);
}

export function parseDesignDirection(value: unknown): DesignDirection {
  const parsed = DesignDirectionSchema.parse(typeof value === "string" ? JSON.parse(value) : value);
  const allowed = (key: keyof typeof APPROVED_VARIANTS) => new Set(APPROVED_VARIANTS[key]);
  if (!allowed("hero").has(parsed.heroVariant as never)) throw new Error("Unapproved hero variant");
  if (!allowed("services").has(parsed.servicesVariant as never)) throw new Error("Unapproved services variant");
  if (!allowed("testimonials").has(parsed.testimonialVariant as never)) throw new Error("Unapproved testimonial variant");
  if (!allowed("cta").has(parsed.ctaVariant as never)) throw new Error("Unapproved CTA variant");
  return parsed;
}

export function applyDesignDirection(theme: Record<string, unknown>, direction: DesignDirection) {
  return {
    ...theme,
    designProfile: direction.designProfile as DesignProfileId,
    typographyProfile: direction.typographyProfile as TypographyProfileId,
    spacingProfile: direction.spacingProfile as SpacingProfileId,
    layoutDensity: direction.contentDensity as SpacingProfileId,
    motionProfile: direction.motionProfile as MotionProfileId,
    imageProfile: direction.imageTreatment,
  };
}
