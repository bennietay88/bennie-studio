import type { Website, ButtonHealthIssue } from "../types";
import { isOperatingSystemFlagEnabled } from "./operatingSystemFlags.js";

export const DELIVERY_STANDARD_VERSION = "2026.09.20";

export type PublicPlanSlug = "personal-profile" | "managed-website" | "website-growth" | "growth-partner";

export const PLAN_DELIVERY_STANDARDS: Record<PublicPlanSlug, {
  pages: string;
  revisions: string;
  updates: string;
  landingPages: string;
  seo: string;
  strategy: string;
  targetFirstDraft: string;
  targetUpdateTurnaround: string;
  firstDraftBusinessDays: number;
  updateBusinessDays: number;
  targetLaunchBusinessDays: number;
}> = {
  "personal-profile": {
    pages:"3–5 fixed-format professional profile pages",revisions:"1 consolidated pre-launch revision round",
    updates:"1 small content-edit request per month (up to 15 minutes)",
    landingPages:"Not included",seo:"Basic on-page SEO and social-sharing metadata",
    strategy:"Customer-supplied biography, expertise, genuine work highlights and a contact path",
    targetFirstDraft:"First draft targeted within 5 business days after a complete brief",
    targetUpdateTurnaround:"Small updates targeted within 3 business days",
    firstDraftBusinessDays:5,updateBusinessDays:3,targetLaunchBusinessDays:10,
  },
  "managed-website": {
    pages: "Up to 5 core pages",
    revisions: "1 consolidated pre-launch revision round",
    updates: "Routine content and contact-detail updates within the managed allowance",
    landingPages: "Not included unless separately scoped",
    seo: "Technical and on-page SEO foundation",
    strategy: "Offer, page hierarchy and primary enquiry path",
    targetFirstDraft: "First reviewed draft targeted within 5 business days after a complete brief and required assets",
    targetUpdateTurnaround: "Routine managed updates targeted within 3 business days",
    firstDraftBusinessDays: 5,
    updateBusinessDays: 3,
    targetLaunchBusinessDays: 10,
  },
  "website-growth": {
    pages: "Up to 5 core pages plus plan-based landing-page support",
    revisions: "2 consolidated pre-launch revision rounds",
    updates: "Monthly conversion, content and SEO improvement allowance",
    landingPages: "Included within the active growth scope",
    seo: "SEO foundation plus local-search expansion and content improvements",
    strategy: "Conversion strategy, proof hierarchy, analytics and growth prioritisation",
    targetFirstDraft: "First reviewed draft targeted within 5 business days after a complete brief and required assets",
    targetUpdateTurnaround: "Routine managed updates targeted within 2 business days",
    firstDraftBusinessDays: 5,
    updateBusinessDays: 2,
    targetLaunchBusinessDays: 10,
  },
  "growth-partner": {
    pages: "Core website plus separately prioritised growth pages",
    revisions: "2 consolidated pre-launch revision rounds plus consultant-led review",
    updates: "Ongoing priority growth, content and conversion work",
    landingPages: "Included and prioritised around active campaigns or growth goals",
    seo: "Expanded SEO, landing-page and content direction",
    strategy: "Consultant-led growth direction, testing priorities and conversion roadmap",
    targetFirstDraft: "First reviewed draft targeted within 4 business days after a complete brief and required assets",
    targetUpdateTurnaround: "Priority managed updates targeted within 1–2 business days",
    firstDraftBusinessDays: 4,
    updateBusinessDays: 1,
    targetLaunchBusinessDays: 8,
  },
};

export const DELIVERY_PIPELINE = [
  "Evidence and asset intake",
  "Strategy and conversion direction",
  "Generated foundation",
  "Human creative direction",
  "Technical and responsive QA",
  "Internal approval",
  "Customer review and approval",
  "Launch readiness gate",
  "Publish, monitor and improve",
] as const;

export const REQUIRED_ASSET_CATEGORIES = [
  "brand_identity",
  "people",
  "services",
  "proof",
  "visual_media",
  "business_facts",
  "voice",
  "compliance",
] as const;

export type LaunchGateInput = {
  website: Website;
  buttonIssues?: ButtonHealthIssue[];
  designProductionReady?: boolean;
  internalCreativeReviewApproved?: boolean;
  customerApprovalRecorded?: boolean;
  responsiveQaApproved?: boolean;
};

const PLACEHOLDER_PATTERN = /\b(lorem ipsum|sample text|placeholder|your business|business name|verified client|coming soon)\b/i;
const UNSUPPORTED_CLAIM_PATTERN = /\b(best|#1|number one|guaranteed results|guaranteed leads|guaranteed sales|award[- ]winning)\b/i;

export function evaluateWorldClassLaunchGate(input: LaunchGateInput) {
  const { website } = input;
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!isOperatingSystemFlagEnabled("launch_readiness")) {
    blockers.push("Launch readiness checks are disabled. Contact a platform administrator.");
  }

  const pages = website.pages || [];
  const home = pages.find((page) => page.slug === "" || page.slug === "home") || pages[0];
  const allSections = pages.flatMap((page) => page.sections || []);
  const serialized = JSON.stringify(pages);
  const contact = allSections.find((section) => section.type === "contact")?.content || {};
  const hasLeadCaptureSection = allSections.some((section) =>
    ["contact", "contact_form", "appointment", "booking"].includes(String(section.type || "")),
  );
  const hasContactMethod = Boolean(
    contact.email ||
      contact.contactEmail ||
      contact.phone ||
      contact.contactPhone ||
      contact.whatsapp ||
      contact.whatsappNumber ||
      website.theme?.footer?.contactEmail ||
      website.theme?.footer?.contactPhone ||
      website.seo?.phone ||
      hasLeadCaptureSection,
  );
  const hasPrimaryCta = Boolean(
    home?.sections?.some((section) =>
      Boolean(section.content?.ctaText || section.content?.buttonText || section.content?.primaryButtonLabel),
    ),
  );
  const seoComplete = Boolean(website.seo?.title && website.seo?.description);
  const brokenCritical = (input.buttonIssues || []).filter(
    (issue) => issue.critical && issue.status !== "working",
  );

  if (!home || (home.sections || []).length < 3) blockers.push("Homepage needs a complete customer journey.");
  if (!hasPrimaryCta) blockers.push("Homepage needs a working primary conversion action.");
  if (!hasContactMethod) blockers.push("At least one verified customer contact or lead-capture path is required.");
  if (!seoComplete) blockers.push("SEO title and description must be completed before launch.");
  if (PLACEHOLDER_PATTERN.test(serialized)) blockers.push("Placeholder or sample content is still present.");
  if (brokenCritical.length) blockers.push(`${brokenCritical.length} critical CTA/button issue(s) must be fixed.`);
  if (input.designProductionReady === false) blockers.push("Design QA has unresolved production-blocking issues.");
  if (!input.responsiveQaApproved) blockers.push("Responsive QA must be explicitly approved.");
  if (!input.internalCreativeReviewApproved) blockers.push("Internal creative review must be approved.");
  if (!input.customerApprovalRecorded) blockers.push("Customer approval must be recorded before launch.");
  if (UNSUPPORTED_CLAIM_PATTERN.test(serialized)) {
    warnings.push("High-risk marketing claims detected. Verify supporting evidence before publishing.");
  }

  const version = website.seo?.deliveryStandardVersion;
  if (version !== DELIVERY_STANDARD_VERSION) {
    warnings.push("Website was generated under an older delivery-standard version.");
  }

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    checkedAt: new Date().toISOString(),
    standardVersion: DELIVERY_STANDARD_VERSION,
  };
}

export const PUBLIC_DELIVERY_PROMISES = [
  "A human reviews and art-directs every paid build before customer review.",
  "Nothing launches until responsive, conversion, content and technical checks pass.",
  "Claims, reviews, logos and credentials are published only from customer-supplied or approved evidence.",
  "Customers approve the final website version before it is published.",
  "The managed service continues after launch with hosting, maintenance, tracking and plan-based improvements.",
] as const;


export function addBusinessDays(from: Date, businessDays: number) {
  const result = new Date(from);
  let remaining = Math.max(0, Math.floor(businessDays));
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const day = result.getUTCDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return result;
}

export function legacyPlanToPublicPlanSlug(plan?: string | null): PublicPlanSlug {
  const normalized = String(plan || "").toLowerCase();
  if (["profile","personal-profile","personal_profile"].includes(normalized)) return "personal-profile";
  if (["growth_partner", "growth-partner", "partner"].includes(normalized)) return "growth-partner";
  if (["growth", "premium", "website_growth", "website-growth"].includes(normalized)) return "website-growth";
  return "managed-website";
}
