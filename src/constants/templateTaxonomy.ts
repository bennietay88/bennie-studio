export const TEMPLATE_CATEGORIES = [
  "Landing Page",
  "Single Page Website",
  "Sales Funnel",
  "Homepage",
  "About Page",
  "Services Page",
  "Contact Page",
  "Pricing Page",
  "Blog Page",
  "Thank You Page",
  "Lead Generation Page",
  "Booking Page",
  "Webinar Page",
  "Product Launch Page",
] as const;

export const TEMPLATE_INDUSTRIES = [
  "Consultant",
  "Coach",
  "Agency",
  "Local Services",
  "Beauty Salon",
  "Dental Clinic",
  "Fitness Studio",
  "Contractor",
  "Real Estate",
  "Accountant",
  "Lawyer",
  "Restaurant",
  "Education Centre",
  "Cleaning Service",
  "Home Repair",
] as const;

export const TEMPLATE_PAGE_TYPES = [
  "Landing Page",
  "Single Page",
  "Multi Page",
  "Homepage",
  "Content Page",
  "Funnel Step",
  "Utility Page",
] as const;

export const TEMPLATE_FILTER_TAGS = [
  "Popular",
  "New",
  "Conversion-focused",
  "SEO-focused",
  "Premium",
  "Free",
] as const;

export const TEMPLATE_PLAN_ACCESS = ["Managed Website", "Website Growth", "Growth Partner", "Custom Website"] as const;

export const normalizeTemplatePlanLabel = (value?: string | null) => {
  const normalized = String(value || "").toLowerCase();
  if (["launch", "starter", "business"].includes(normalized)) return "Managed Website";
  if (["growth", "scale"].includes(normalized)) return "Website Growth";
  if (["authority", "agency"].includes(normalized)) return "Growth Partner";
  if (normalized === "custom") return "Custom Website";
  return value || "Managed Website";
};

// Curated website pairings only. Avoid mono fonts in customer-facing templates;
// they read like developer tooling rather than a premium service business site.
export const FONT_PAIRINGS = [
  "Space Grotesk / Plus Jakarta Sans",
  "Fraunces / Plus Jakarta Sans",
  "Playfair Display / Plus Jakarta Sans",
  "Outfit / Plus Jakarta Sans",
  "Lora / Plus Jakarta Sans",
] as const;

export const SECTION_LIBRARY = [
  { id: "hero", name: "Hero", category: "Conversion", variants: ["Centered", "Split", "Image-led", "Dark focus"] },
  { id: "services", name: "Services", category: "Offer", variants: ["Grid", "Cards", "Detailed list"] },
  { id: "features", name: "Features", category: "Offer", variants: ["Icon grid", "Alternating rows"] },
  { id: "benefits", name: "Benefits", category: "Conversion", variants: ["Checklist", "Outcome cards"] },
  { id: "pricing", name: "Pricing", category: "Sales", variants: ["Three tiers", "Simple cards", "Comparison"] },
  { id: "testimonials", name: "Testimonials", category: "Trust", variants: ["Cards", "Quote wall", "Featured quote"] },
  { id: "faq", name: "FAQ", category: "Trust", variants: ["Accordion", "Two-column", "Compact"] },
  { id: "contact", name: "Contact", category: "Lead Capture", variants: ["Form", "Map + form", "Minimal"] },
  { id: "cta", name: "CTA", category: "Conversion", variants: ["Banner", "Dark block", "Inline"] },
  { id: "process", name: "Process", category: "Trust", variants: ["Steps", "Timeline", "Numbered cards"] },
  { id: "portfolio", name: "Portfolio", category: "Proof", variants: ["Gallery", "Case cards", "Before/after"] },
  { id: "comparison", name: "Comparison", category: "Sales", variants: ["Table", "Cards", "Before/after"] },
  { id: "trust_logos", name: "Trust Logos", category: "Trust", variants: ["Logo row", "Badge grid"] },
  { id: "lead_capture", name: "Lead Capture", category: "Lead Capture", variants: ["Inline form", "Two-step", "Lead magnet"] },
  { id: "whatsapp_cta", name: "WhatsApp CTA", category: "Lead Capture", variants: ["Floating", "Section", "Service-specific"] },
  { id: "booking_cta", name: "Booking CTA", category: "Lead Capture", variants: ["Calendar block", "Appointment card"] },
] as const;

export const TEMPLATE_GOAL_FLOW = [
  "Get more enquiries",
  "Book appointments",
  "Sell a service",
  "Promote an offer",
  "Launch a campaign",
  "Build trust",
  "Improve local SEO",
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];
export type TemplateIndustry = (typeof TEMPLATE_INDUSTRIES)[number];
