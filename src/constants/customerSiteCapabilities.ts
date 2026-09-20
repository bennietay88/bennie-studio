export type CustomerSiteCapabilityKind = "section" | "runtime" | "theme";

export interface CustomerSiteCapability {
  id: string;
  label: string;
  kind: CustomerSiteCapabilityKind;
  sectionType?: string;
  variants?: string[];
  notes: string;
  requiresVerifiedBusinessInput?: boolean;
}

/**
 * Bennie Studio's own public site is the reference implementation for visual
 * and conversion patterns. Customer websites should receive equivalent
 * reusable capabilities through the shared renderer rather than one-off code.
 */
export const CUSTOMER_SITE_CAPABILITIES: CustomerSiteCapability[] = [
  {
    id: "hero_composition",
    label: "Premium hero compositions",
    kind: "section",
    sectionType: "hero",
    variants: ["brand_media", "editorial_split", "full_bleed_editorial", "statement_media"],
    notes: "Responsive hero layouts with deliberate desktop/mobile composition and motion.",
  },
  {
    id: "logo_marquee",
    label: "Animated logo / trust marquee",
    kind: "section",
    sectionType: "proof",
    variants: ["logo_marquee", "logo_wall", "certification_strip", "trust_strip"],
    notes: "Right-to-left credibility strip for real client, partner, association, certification, platform or technology logos.",
    requiresVerifiedBusinessInput: true,
  },
  {
    id: "proof_system",
    label: "Proof and credibility",
    kind: "section",
    sectionType: "proof",
    variants: ["metrics", "logo_wall", "certification_strip", "trust_strip", "logo_marquee"],
    notes: "Verified metrics, logos and evidence supplied by the business.",
    requiresVerifiedBusinessInput: true,
  },
  {
    id: "capability_sections",
    label: "Capability and benefit systems",
    kind: "section",
    sectionType: "features",
    variants: ["editorial_strip", "capability_matrix", "media_cards", "bento"],
    notes: "Reusable value, process and capability storytelling patterns.",
  },
  {
    id: "services",
    label: "Service presentation",
    kind: "section",
    sectionType: "services",
    variants: ["brand_families", "editorial_list", "image_grid", "alternating", "minimal", "cards"],
    notes: "Service architecture adapted to the business and customer journey.",
  },
  {
    id: "customer_reviews",
    label: "Customer reviews and testimonials",
    kind: "section",
    sectionType: "testimonials",
    variants: ["editorial_quote", "review_grid", "featured", "slider", "proof_wall"],
    notes: "Only real customer-supplied or approved reviews are publishable.",
    requiresVerifiedBusinessInput: true,
  },
  {
    id: "faq",
    label: "FAQ and objection handling",
    kind: "section",
    sectionType: "faq",
    variants: ["media_accordion", "accordion", "two_column", "editorial"],
    notes: "Responsive FAQ patterns for buying questions and search intent.",
  },
  {
    id: "conversion_cta",
    label: "Conversion CTA systems",
    kind: "section",
    sectionType: "cta",
    variants: ["brand_band", "minimal", "full_bleed", "consultation", "editorial"],
    notes: "Primary and secondary conversion actions with interaction tracking.",
  },
  {
    id: "lead_capture",
    label: "Lead capture",
    kind: "section",
    sectionType: "contact",
    notes: "Forms, enquiry routing and lead interaction tracking.",
  },
  {
    id: "booking",
    label: "Appointment and booking flows",
    kind: "section",
    sectionType: "appointment",
    notes: "Booking-oriented sections and appointment capture.",
  },
  {
    id: "blog",
    label: "Blog and insights",
    kind: "section",
    sectionType: "blog_list",
    notes: "Search-friendly content publishing and article rendering.",
  },
  {
    id: "whatsapp",
    label: "WhatsApp enquiry path",
    kind: "runtime",
    notes: "Tracked WhatsApp buttons and floating enquiry action when configured.",
  },
  {
    id: "analytics",
    label: "Analytics and interaction tracking",
    kind: "runtime",
    notes: "Page, CTA and lead-intent interaction tracking with consent-aware analytics support.",
  },
  {
    id: "seo",
    label: "SEO and structured metadata",
    kind: "runtime",
    notes: "Page metadata, local SEO fields, canonicals and structured website data.",
  },
  {
    id: "cookie_consent",
    label: "Cookie consent controls",
    kind: "runtime",
    notes: "Consent-aware functional, analytics and marketing cookie preferences.",
  },
  {
    id: "responsive_motion",
    label: "Responsive motion system",
    kind: "theme",
    notes: "Shared responsive layouts, motion profiles and reduced-motion support.",
  },
];

export const CUSTOMER_SITE_PARITY_PRINCIPLES = [
  "If a Bennie Studio public-site pattern improves clarity, trust, conversion or usability, implement an equivalent reusable customer-site capability where relevant.",
  "Prefer shared renderer section variants or runtime capabilities over customer-specific one-off components.",
  "Never fabricate clients, testimonials, performance metrics, certifications, partnerships, awards or brand relationships.",
  "Proof-based components remain hidden or empty until the business supplies or approves the evidence.",
  "Every motion-heavy capability must have a usable mobile layout and a reduced-motion fallback.",
] as const;

export const getCustomerSiteCapabilityPrompt = () =>
  [
    "Customer-site capability rules:",
    ...CUSTOMER_SITE_PARITY_PRINCIPLES.map((rule) => `- ${rule}`),
    "- Available credibility treatment: Proof with variant logo_marquee for verified business-supplied logos.",
  ].join("\n");
