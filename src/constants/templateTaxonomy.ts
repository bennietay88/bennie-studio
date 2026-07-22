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

export const TEMPLATE_PLAN_ACCESS = ["Launch", "Starter", "Business", "Growth", "Scale", "Custom"] as const;

export const FONT_PAIRINGS = [
  "Geist Sans / Geist Mono",
  "Inter / Merriweather",
  "Poppins / Inter",
  "DM Sans / Playfair Display",
  "Montserrat / Source Sans 3",
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
