import { z } from "zod";
import { DESIGN_PROFILES, APPROVED_VARIANTS, type DesignProfileId, type MotionProfileId, type TypographyProfileId, type SpacingProfileId } from "../constants/designProfiles.js";

export const DesignDirectionSchema = z.object({
  designProfile: z.enum(["editorial_luxury", "modern_minimal", "bold_contemporary", "trust_authority", "craft_organic"]),
  typographyProfile: z.enum(["luxury_editorial", "architectural", "modern_professional", "friendly_humanist", "bold_contemporary", "authority"]),
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

export const DESIGN_DIRECTOR_SYSTEM_PROMPT = `You are Bennie Studio's internal design director. Choose only from approved Bennie Studio profiles and variants. Recommend a restrained, industry-appropriate composition based on the business and verified inputs. Never output CSS, arbitrary tokens, or unapproved component names. Do not invent proof. Return JSON only matching the requested schema. A staff member must review the recommendation before rendering or publishing.`;

export function buildDesignDirectionPrompt(input: {
  industry: string;
  businessName: string;
  targetCustomer?: string;
  services?: string[];
  photographyAvailable?: boolean;
  goal?: string;
}) {
  return JSON.stringify({
    task: "recommend an approved premium design direction",
    approvedProfiles: Object.values(DESIGN_PROFILES).map(({ id, label, description }) => ({ id, label, description })),
    approvedVariants: APPROVED_VARIANTS,
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
