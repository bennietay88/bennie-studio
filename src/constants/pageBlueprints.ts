import { SECTION_TEMPLATES } from "./sectionTemplates";
import { NICHE_TEMPLATES } from "./nicheTemplates";
import { PLANS } from "./plans";
import { generateId } from "../lib/utils";
import { AssetReadiness, BrandPersonality, BusinessMaturity, Website, WebsiteGenerationMode, WebsitePage, WebsiteSection } from "../types";
import { getVariantForMode, resolveDesignProfileForMode } from "./designProfiles";

export type BlueprintPlanId = "starter" | "business" | "growth";
export type WebsitePlanId = string;

export type SectionBlockType =
  | "hero"
  | "problem"
  | "solution"
  | "trust"
  | "services"
  | "service_detail"
  | "about"
  | "process"
  | "benefits"
  | "testimonials"
  | "portfolio"
  | "faq"
  | "pricing"
  | "contact_form"
  | "whatsapp_cta"
  | "booking_cta"
  | "location"
  | "team"
  | "highlights"
  | "values"
  | "brand_story"
  | "insights"
  | "final_cta";

export interface BlueprintPage {
  name: string;
  slug: string;
  purpose: string;
  sections: SectionBlockType[];
  ctaType: string;
  seoTitle: string;
  metaDescription: string;
  navLabel: string;
}

type BlueprintPageSeed = Omit<BlueprintPage, "seoTitle" | "metaDescription">;

export interface PageBlueprint {
  niche: string;
  plan: WebsitePlanId;
  positioning: string;
  upgradeMessage?: string;
  pages: BlueprintPage[];
}

export interface BlueprintBusinessInput {
  businessName: string;
  nicheId?: string;
  nicheName?: string;
  plan: WebsitePlanId;
  maxPages?: number;
  mainService?: string;
  targetCustomer?: string;
  location?: string;
  country?: string;
  state?: string;
  nearbyAreas?: string[];
  localProof?: string;
  proofLogos?: Array<string | { name?: string; label?: string; url?: string; imageUrl?: string; detail?: string; description?: string; relationship?: string }>;
  ctaPreference?: string;
  tone?: string;
  services?: string[];
  description?: string;
  aboutText?: string;
  sourceDriven?: boolean;
  contactEmail?: string;
  contactPhone?: string;
  whatsappNumber?: string;
  faqs?: string[];
  faqItems?: Array<{ question: string; answer: string }>;
  testimonials?: string[];
  generationMode?: WebsiteGenerationMode;
  brandPersonality?: BrandPersonality;
  businessMaturity?: BusinessMaturity;
  assetReadiness?: AssetReadiness;
  heroImageUrl?: string;
  storyImageUrl?: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  heroTrustItems?: string[];
  preferredHeroVariant?: string;
  compactSubpageHeroes?: boolean;
  teamMembers?: Array<{ name: string; role?: string; bio?: string; imageUrl?: string }>;
  compositionSeed?: number;
}

export const PLAN_POSITIONING: Record<BlueprintPlanId, string> = {
  starter: "Start with a focused managed website built around your primary enquiry path.",
  business: "Build a complete Managed Website with the essential pages customers expect.",
  growth: "Add Website Growth support for stronger SEO structure, landing pages, and ongoing improvements.",
};

export const UPGRADE_MESSAGES: Record<BlueprintPlanId, string> = {
  starter: "Upgrade to Managed Website for dedicated service and contact pages, stronger trust sections, and ongoing support.",
  business: "Upgrade to Website Growth for landing-page support, local SEO expansion, and priority improvements.",
  growth: "You are already on the ongoing Website Growth structure for this generator.",
};

const startCase = (value: string) =>
  value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const getPlanPageLimit = (plan?: string, configuredMaxPages?: number) => {
  if (Number.isFinite(configuredMaxPages) && configuredMaxPages && configuredMaxPages > 0) {
    return Math.floor(configuredMaxPages);
  }

  return PLANS.find((planConfig) => planConfig.id === plan)?.maxPages || 1;
};

export const resolveBlueprintPlan = (plan?: string, configuredMaxPages?: number): BlueprintPlanId => {
  const pageLimit = getPlanPageLimit(plan, configuredMaxPages);

  if (pageLimit <= 1) return "starter";
  if (pageLimit <= 5) return "business";
  return "growth";
};

export const inferBlueprintNiche = (value?: string) => {
  const raw = (value || "").toLowerCase();
  if (/restaurant|cafe|bistro|dining|food|menu/.test(raw)) return "restaurant";
  if (/clinic|dental|dentist|doctor|medical|health|wellness|spa|physio|therapy/.test(raw)) return "clinic";
  if (/contractor|renovation|repair|cleaning|pest|builder|construction|home service/.test(raw)) return "contractor";
  if (/web agency|website agency|marketing agency|digital agency|web design|website design|web development|lead generation|seo agency|managed website/.test(raw)) return "agency";
  if (/coach|consult|consultant|advisor|professional|speaker|trainer|corporate|saas|software/.test(raw)) return "consultant";
  if (/real estate|property|realtor|agent|listing/.test(raw)) return "real_estate";
  if (/law|legal|attorney|solicitor/.test(raw)) return "law";
  if (/boutique|retail|shop|fashion|jewelry|commerce/.test(raw)) return "boutique";
  if (/portfolio|designer|creative|photography|architect/.test(raw)) return "portfolio";
  return "consultant";
};

const page = (
  name: string,
  slug: string,
  purpose: string,
  sections: SectionBlockType[],
  ctaType: string,
  navLabel = name,
): BlueprintPageSeed => ({
  name,
  slug,
  purpose,
  sections,
  ctaType,
  navLabel,
});


export const WEBSITE_GENERATION_RULES = {
  minPreviewPages: 5,
  maxPreviewPages: 8,
  heroMaxWords: 7,
  heroMaxChars: 58,
  sectionTitleMaxWords: 9,
  sectionTitleMaxChars: 72,
  serviceTitleMaxWords: 8,
  serviceTitleMaxChars: 64,
  bodyMaxWords: 34,
  bodyMaxChars: 220,
} as const;

const cleanGeneratedText = (value: string) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();

const clampGeneratedText = (
  value: string,
  maxWords: number,
  maxChars: number,
) => {
  const cleaned = cleanGeneratedText(value);
  if (!cleaned) return "";
  const words = cleaned.split(" ").filter(Boolean);
  let result = words.slice(0, maxWords).join(" ");
  while (result.length > maxChars && result.includes(" ")) {
    result = result.slice(0, result.lastIndexOf(" "));
  }
  if (!result) result = cleaned.slice(0, maxChars).trim();
  return result.replace(/[,:;\-–—]+$/g, "").trim();
};

const generatedHeadline = (value: string) =>
  clampGeneratedText(
    value,
    WEBSITE_GENERATION_RULES.sectionTitleMaxWords,
    WEBSITE_GENERATION_RULES.sectionTitleMaxChars,
  );

const generatedBody = (value: string) =>
  clampGeneratedText(
    value,
    WEBSITE_GENERATION_RULES.bodyMaxWords,
    WEBSITE_GENERATION_RULES.bodyMaxChars,
  );

const generatedServiceTitle = (value: string) =>
  clampGeneratedText(
    value,
    WEBSITE_GENERATION_RULES.serviceTitleMaxWords,
    WEBSITE_GENERATION_RULES.serviceTitleMaxChars,
  );

const buildGeneratedHeroHeadline = (service: string, target: string, businessName: string) => {
  const serviceLead = cleanGeneratedText(service).replace(/[,.!?;:]+$/g, "");
  const targetLead = cleanGeneratedText(target).replace(/[,.!?;:]+$/g, "");
  const combined = generatedHeadline(`${serviceLead.charAt(0).toUpperCase() + serviceLead.slice(1)} for ${targetLead}`);
  const combinedWords = combined.split(/\s+/).filter(Boolean).length;

  if (
    combinedWords <= WEBSITE_GENERATION_RULES.heroMaxWords
    && combined.length <= WEBSITE_GENERATION_RULES.heroMaxChars
  ) {
    return combined;
  }

  const serviceOnly = clampGeneratedText(
    serviceLead.charAt(0).toUpperCase() + serviceLead.slice(1),
    WEBSITE_GENERATION_RULES.heroMaxWords,
    WEBSITE_GENERATION_RULES.heroMaxChars,
  );
  if (serviceOnly) return serviceOnly;

  return clampGeneratedText(
    businessName || "Professional service",
    WEBSITE_GENERATION_RULES.heroMaxWords,
    WEBSITE_GENERATION_RULES.heroMaxChars,
  );
};

const SUPPLEMENTAL_BLUEPRINT_PAGES: Record<string, BlueprintPageSeed[]> = {
  restaurant: [
    page("About", "about", "Tell the venue, team and hospitality story.", ["hero", "about", "trust", "final_cta"], "Reserve Table"),
    page("FAQ", "faq", "Answer practical questions before a reservation.", ["hero", "faq", "location", "final_cta"], "Reserve Table"),
    page("Private Events", "private-events", "Explain group dining and event enquiry options.", ["hero", "services", "portfolio", "contact_form", "final_cta"], "Enquire"),
    page("Visit", "visit", "Make location, hours and arrival details easy to find.", ["hero", "location", "faq", "final_cta"], "Reserve Table"),
  ],
  clinic: [
    page("Process", "process", "Explain what patients can expect before booking.", ["hero", "process", "benefits", "faq", "final_cta"], "Book Appointment"),
    page("FAQ", "faq", "Answer common patient questions and reduce booking friction.", ["hero", "faq", "trust", "final_cta"], "Book Appointment"),
    page("Insights", "insights", "Create room for useful patient education and updates.", ["hero", "insights", "final_cta"], "Book Appointment"),
  ],
  contractor: [
    page("Process", "process", "Show how enquiries, scoping and delivery work.", ["hero", "process", "benefits", "final_cta"], "Get Quote"),
    page("FAQ", "faq", "Answer common project and service questions.", ["hero", "faq", "final_cta"], "Get Quote"),
    page("Insights", "insights", "Create room for useful project guides and updates.", ["hero", "insights", "final_cta"], "Get Quote"),
  ],
  consultant: [
    page("Process", "process", "Explain how the engagement works from first call to delivery.", ["hero", "process", "benefits", "final_cta"], "Book Call"),
    page("FAQ", "faq", "Answer common fit, scope and engagement questions.", ["hero", "faq", "final_cta"], "Book Call"),
    page("Insights", "insights", "Show useful thinking, guides and point of view.", ["hero", "insights", "final_cta"], "Book Call"),
  ],
  agency: [
    page("Process", "process", "Explain how strategy, build, launch and ongoing improvement work.", ["hero", "process", "benefits", "faq", "final_cta"], "Book a Consultation"),
    page("Insights", "insights", "Create room for practical website and lead-generation guidance.", ["hero", "insights", "final_cta"], "Book a Consultation"),
    page("FAQ", "faq", "Answer common scope, support, timeline and website questions.", ["hero", "faq", "final_cta"], "Book a Consultation"),
  ],
  real_estate: [
    page("Process", "process", "Explain the buyer and seller journey.", ["hero", "process", "benefits", "final_cta"], "Contact Agent"),
    page("FAQ", "faq", "Answer common buyer and seller questions.", ["hero", "faq", "final_cta"], "Contact Agent"),
    page("Insights", "insights", "Create room for local market guides and updates.", ["hero", "insights", "final_cta"], "Contact Agent"),
  ],
  law: [
    page("Process", "process", "Explain consultation, next steps and client expectations.", ["hero", "process", "benefits", "final_cta"], "Request Consultation"),
    page("FAQ", "faq", "Answer common consultation and service questions.", ["hero", "faq", "final_cta"], "Request Consultation"),
    page("Insights", "insights", "Create room for practical legal updates and guidance.", ["hero", "insights", "final_cta"], "Request Consultation"),
  ],
  boutique: [
    page("About", "about", "Tell the brand, curation and quality story.", ["hero", "about", "benefits", "final_cta"], "WhatsApp"),
    page("FAQ", "faq", "Answer common product and purchase questions.", ["hero", "faq", "final_cta"], "WhatsApp"),
    page("Journal", "journal", "Create room for launches, styling and brand stories.", ["hero", "insights", "final_cta"], "WhatsApp"),
    page("Buying Guide", "buying-guide", "Help customers choose the right option before enquiry.", ["hero", "benefits", "faq", "final_cta"], "WhatsApp"),
  ],
  portfolio: [
    page("Process", "process", "Explain how projects move from brief to delivery.", ["hero", "process", "benefits", "final_cta"], "Book Call"),
    page("FAQ", "faq", "Answer common project and collaboration questions.", ["hero", "faq", "final_cta"], "Book Call"),
    page("Insights", "insights", "Create room for project notes and useful thinking.", ["hero", "insights", "final_cta"], "Book Call"),
  ],
};

const expandBlueprintPages = (
  niche: string,
  pages: BlueprintPageSeed[],
  pageLimit: number,
) => {
  if (pages.length >= pageLimit) return pages.slice(0, pageLimit);

  const expanded = [...pages];
  const terminalSlugs = new Set(["contact", "book-call", "appointment", "quote", "reservation", "consultation"]);
  const terminalPage = expanded.length && terminalSlugs.has(expanded[expanded.length - 1].slug)
    ? expanded.pop()
    : undefined;
  const usedSlugs = new Set(expanded.map((item) => item.slug));
  if (terminalPage) usedSlugs.add(terminalPage.slug);

  const candidates = SUPPLEMENTAL_BLUEPRINT_PAGES[niche] || SUPPLEMENTAL_BLUEPRINT_PAGES.consultant;
  const targetBeforeTerminal = pageLimit - (terminalPage ? 1 : 0);

  for (const candidate of candidates) {
    if (expanded.length >= targetBeforeTerminal) break;
    if (usedSlugs.has(candidate.slug)) continue;
    expanded.push(candidate);
    usedSlugs.add(candidate.slug);
  }

  if (terminalPage && expanded.length < pageLimit) expanded.push(terminalPage);
  return expanded.slice(0, pageLimit);
};

const BLUEPRINTS: Record<string, Record<BlueprintPlanId, { pages: BlueprintPageSeed[] }>> = {
  restaurant: {
    starter: {
      pages: [
        page("Home", "", "Convert visitors into reservations from one complete page.", ["hero", "services", "portfolio", "testimonials", "location", "contact_form", "final_cta"], "Reserve Table"),
      ],
    },
    business: {
      pages: [
        page("Home", "", "Introduce the dining experience and drive reservations.", ["hero", "trust", "benefits", "testimonials", "final_cta"], "Reserve Table"),
        page("Menu", "menu", "Show signature dishes, offers, and dining options.", ["hero", "services", "portfolio", "pricing", "final_cta"], "View Menu"),
        page("Reservation", "reservation", "Make it easy to reserve a table or enquire about events.", ["hero", "contact_form", "location", "faq", "booking_cta"], "Reserve Table", "Reserve"),
      ],
    },
    growth: {
      pages: [
        page("Home", "", "Create a premium first impression and route visitors to menu or booking.", ["hero", "trust", "benefits", "testimonials", "final_cta"], "Reserve Table"),
        page("Menu", "menu", "Show core menu categories and dining packages.", ["hero", "services", "pricing", "final_cta"], "View Menu"),
        page("About", "about", "Tell the chef, origin, and hospitality story.", ["hero", "about", "process", "trust", "final_cta"], "Reserve Table"),
        page("Gallery", "gallery", "Show ambience, dishes, promotions, and private dining.", ["hero", "portfolio", "testimonials", "final_cta"], "Reserve Table", "Gallery"),
        page("Reservation", "reservation", "Capture bookings, private events, and location intent.", ["hero", "contact_form", "location", "faq", "booking_cta"], "Reserve Table", "Reserve"),
      ],
    },
  },
  clinic: {
    starter: {
      pages: [
        page("Home", "", "Build trust and drive appointments from one focused page.", ["hero", "services", "trust", "testimonials", "faq", "booking_cta", "final_cta"], "Book Appointment"),
      ],
    },
    business: {
      pages: [
        page("Home", "", "Introduce the clinic and create immediate appointment intent.", ["hero", "trust", "benefits", "testimonials", "final_cta"], "Book Appointment"),
        page("Treatments", "treatments", "Explain treatments and patient outcomes.", ["hero", "services", "service_detail", "faq", "final_cta"], "Book Appointment"),
        page("Appointment", "appointment", "Capture patient enquiries and appointment requests.", ["hero", "contact_form", "location", "booking_cta"], "Book Appointment", "Book"),
      ],
    },
    growth: {
      pages: [
        page("Home", "", "Position the clinic as trustworthy and easy to book.", ["hero", "trust", "benefits", "testimonials", "final_cta"], "Book Appointment"),
        page("Practitioners", "practitioners", "Introduce the team and clinical credibility.", ["hero", "about", "trust", "testimonials", "final_cta"], "Book Appointment", "About"),
        page("Treatments", "treatments", "Present treatments with clear benefits and patient fit.", ["hero", "services", "service_detail", "pricing", "final_cta"], "Book Appointment"),
        page("Patient Info", "patient-info", "Answer common patient questions and reduce booking friction.", ["hero", "faq", "process", "benefits", "final_cta"], "Book Appointment", "FAQ"),
        page("Appointment", "appointment", "Make booking and clinic location clear.", ["hero", "contact_form", "location", "booking_cta"], "Book Appointment", "Book"),
      ],
    },
  },
  contractor: {
    starter: {
      pages: [
        page("Home", "", "Capture quote requests with services, proof, and project highlights.", ["hero", "services", "portfolio", "benefits", "testimonials", "contact_form", "final_cta"], "Get Quote"),
      ],
    },
    business: {
      pages: [
        page("Home", "", "Build local trust and direct visitors to services or quote request.", ["hero", "trust", "benefits", "testimonials", "final_cta"], "Get Quote"),
        page("Services", "services", "Explain core services and work process.", ["hero", "services", "process", "faq", "final_cta"], "Get Quote"),
        page("Quote Request", "quote", "Collect project details and contact information.", ["hero", "contact_form", "location", "final_cta"], "Get Quote", "Quote"),
      ],
    },
    growth: {
      pages: [
        page("Home", "", "Show credibility and route visitors to quote request.", ["hero", "trust", "portfolio", "testimonials", "final_cta"], "Get Quote"),
        page("About", "about", "Explain the team, standards, and guarantee.", ["hero", "about", "benefits", "trust", "final_cta"], "Get Quote"),
        page("Services", "services", "Break down services and ideal project types.", ["hero", "services", "service_detail", "process", "final_cta"], "Get Quote"),
        page("Projects", "projects", "Show proof through completed jobs and before/after work.", ["hero", "portfolio", "testimonials", "final_cta"], "Get Quote"),
        page("Quote Request", "quote", "Capture qualified quote enquiries.", ["hero", "contact_form", "location", "faq", "final_cta"], "Get Quote", "Quote"),
      ],
    },
  },
  consultant: {
    starter: {
      pages: [
        page("Home", "", "Explain the problem, solution, services, proof, and booking CTA.", ["hero", "problem", "solution", "services", "trust", "faq", "booking_cta", "final_cta"], "Book Call"),
      ],
    },
    business: {
      pages: [
        page("Home", "", "Build authority and direct visitors to programs or call booking.", ["hero", "problem", "solution", "trust", "final_cta"], "Book Call"),
        page("Programs", "programs", "Explain services, programs, and outcomes.", ["hero", "services", "service_detail", "pricing", "faq", "final_cta"], "Book Call", "Services"),
        page("Book a Call", "book-call", "Capture consultation requests.", ["hero", "contact_form", "booking_cta", "faq"], "Book Call", "Contact"),
      ],
    },
    growth: {
      pages: [
        page("Home", "", "Position authority and route visitors to programs or proof.", ["hero", "problem", "solution", "trust", "final_cta"], "Book Call"),
        page("About", "about", "Tell the founder story and credibility.", ["hero", "about", "trust", "testimonials", "final_cta"], "Book Call"),
        page("Programs", "programs", "Explain services and program fit.", ["hero", "services", "service_detail", "pricing", "final_cta"], "Book Call", "Services"),
        page("Results", "results", "Show case studies, testimonials, and measurable outcomes.", ["hero", "portfolio", "testimonials", "trust", "final_cta"], "Book Call"),
        page("Book a Call", "book-call", "Convert qualified prospects into booked conversations.", ["hero", "contact_form", "booking_cta", "faq"], "Book Call", "Contact"),
      ],
    },
  },
  agency: {
    starter: {
      pages: [
        page("Home", "", "Explain the managed website offer, proof and enquiry path.", ["hero", "services", "highlights", "process", "final_cta"], "Book a Consultation"),
      ],
    },
    business: {
      pages: [
        page("Home", "", "Position the managed website offer around enquiries and ongoing support.", ["hero", "highlights", "services", "process", "final_cta"], "Book a Consultation"),
        page("Services", "services", "Explain managed website, lead-generation and ongoing improvement services.", ["hero", "services", "service_detail", "faq", "final_cta"], "Book a Consultation"),
        page("Contact", "contact", "Capture consultation and website preview enquiries.", ["hero", "contact_form", "faq", "final_cta"], "Book a Consultation"),
      ],
    },
    growth: {
      pages: [
        page("Home", "", "Lead with the managed website proposition, proof, work and conversion path.", ["hero", "highlights", "services", "portfolio", "process", "final_cta"], "Book a Consultation"),
        page("Services", "services", "Explain managed websites, lead generation, support and ongoing improvement.", ["hero", "services", "service_detail", "process", "faq", "final_cta"], "Book a Consultation"),
        page("Work", "work", "Show selected websites, case studies and project outcomes.", ["hero", "portfolio", "testimonials", "final_cta"], "View Work"),
        page("About", "about", "Explain the studio, approach and managed-service model.", ["hero", "about", "benefits", "trust", "final_cta"], "Book a Consultation"),
        page("Contact", "contact", "Capture qualified consultations and website enquiries.", ["hero", "contact_form", "faq", "final_cta"], "Book a Consultation"),
      ],
    },
  },
  real_estate: {
    starter: {
      pages: [
        page("Home", "", "Show featured properties and capture buyer/seller enquiries.", ["hero", "portfolio", "services", "testimonials", "contact_form", "final_cta"], "View Properties"),
      ],
    },
    business: {
      pages: [
        page("Home", "", "Position the agent and route visitors to listings or contact.", ["hero", "trust", "portfolio", "testimonials", "final_cta"], "View Properties"),
        page("Listings", "listings", "Show listings and buyer/seller services.", ["hero", "portfolio", "services", "faq", "final_cta"], "View Properties"),
        page("Contact", "contact", "Capture buyer, seller, and valuation enquiries.", ["hero", "contact_form", "location", "final_cta"], "Contact Agent"),
      ],
    },
    growth: {
      pages: [
        page("Home", "", "Create confidence and route visitors to listings or guides.", ["hero", "trust", "portfolio", "testimonials", "final_cta"], "View Properties"),
        page("About", "about", "Build agent credibility and local market trust.", ["hero", "about", "trust", "testimonials", "final_cta"], "Contact Agent"),
        page("Listings", "listings", "Show property listings and service options.", ["hero", "portfolio", "services", "final_cta"], "View Properties"),
        page("Buyer / Seller Guide", "buyer-seller-guide", "Educate buyers and sellers before enquiry.", ["hero", "process", "faq", "benefits", "final_cta"], "Get Guide", "Guide"),
        page("Contact", "contact", "Capture enquiries and valuation requests.", ["hero", "contact_form", "location", "final_cta"], "Contact Agent"),
      ],
    },
  },
  law: {
    starter: {
      pages: [
        page("Home", "", "Build legal trust and capture consultation requests.", ["hero", "trust", "services", "testimonials", "faq", "contact_form", "final_cta"], "Request Consultation"),
      ],
    },
    business: {
      pages: [
        page("Home", "", "Establish legal authority and route visitors to practice areas.", ["hero", "trust", "benefits", "testimonials", "final_cta"], "Request Consultation"),
        page("Practice Areas", "practice-areas", "Explain legal services and client fit.", ["hero", "services", "service_detail", "faq", "final_cta"], "Request Consultation", "Services"),
        page("Consultation", "consultation", "Capture confidential consultation requests.", ["hero", "contact_form", "booking_cta", "faq"], "Request Consultation", "Contact"),
      ],
    },
    growth: {
      pages: [
        page("Home", "", "Build authority and route visitors to practice areas or consultation.", ["hero", "trust", "benefits", "testimonials", "final_cta"], "Request Consultation"),
        page("About", "about", "Show credentials, approach, and firm principles.", ["hero", "about", "trust", "team", "final_cta"], "Request Consultation"),
        page("Practice Areas", "practice-areas", "Explain services and legal outcomes.", ["hero", "services", "service_detail", "faq", "final_cta"], "Request Consultation", "Services"),
        page("Case Results", "case-results", "Show proof, results, and testimonials without overpromising.", ["hero", "portfolio", "testimonials", "trust", "final_cta"], "Request Consultation", "Results"),
        page("Consultation", "consultation", "Capture qualified legal enquiries.", ["hero", "contact_form", "booking_cta", "faq"], "Request Consultation", "Contact"),
      ],
    },
  },
  boutique: {
    starter: {
      pages: [
        page("Home", "", "Show the collection, trust proof, and route shoppers to enquiry.", ["hero", "portfolio", "services", "testimonials", "whatsapp_cta", "final_cta"], "WhatsApp"),
      ],
    },
    business: {
      pages: [
        page("Home", "", "Create a premium retail first impression.", ["hero", "trust", "portfolio", "testimonials", "final_cta"], "WhatsApp"),
        page("Collection", "collection", "Show products, categories, and styling services.", ["hero", "portfolio", "services", "pricing", "final_cta"], "WhatsApp"),
        page("Contact", "contact", "Capture enquiries and store visit intent.", ["hero", "contact_form", "location", "whatsapp_cta"], "WhatsApp"),
      ],
    },
    growth: {
      pages: [
        page("Home", "", "Build a premium brand impression and route visitors to collection.", ["hero", "trust", "portfolio", "testimonials", "final_cta"], "WhatsApp"),
        page("About", "about", "Tell the brand, curation, and quality story.", ["hero", "about", "benefits", "trust", "final_cta"], "WhatsApp"),
        page("Collection", "collection", "Show products, categories, and offers.", ["hero", "portfolio", "services", "pricing", "final_cta"], "WhatsApp"),
        page("Lookbook", "lookbook", "Show visual proof and seasonal campaigns.", ["hero", "portfolio", "testimonials", "final_cta"], "WhatsApp"),
        page("Contact", "contact", "Capture store visits and WhatsApp enquiries.", ["hero", "contact_form", "location", "whatsapp_cta"], "WhatsApp"),
      ],
    },
  },
  portfolio: {
    starter: {
      pages: [
        page("Home", "", "Show best work, credibility, and project enquiry CTA.", ["hero", "portfolio", "benefits", "testimonials", "contact_form", "final_cta"], "Book Call"),
      ],
    },
    business: {
      pages: [
        page("Home", "", "Position the creative offer and route visitors to work or contact.", ["hero", "trust", "portfolio", "testimonials", "final_cta"], "Book Call"),
        page("Work", "work", "Show selected projects and creative capabilities.", ["hero", "portfolio", "services", "process", "final_cta"], "View Work"),
        page("Contact", "contact", "Capture project enquiries.", ["hero", "contact_form", "faq", "final_cta"], "Book Call"),
      ],
    },
    growth: {
      pages: [
        page("Home", "", "Create a premium first impression and route visitors to work.", ["hero", "trust", "portfolio", "testimonials", "final_cta"], "Book Call"),
        page("About", "about", "Tell the studio story and creative standards.", ["hero", "about", "process", "trust", "final_cta"], "Book Call"),
        page("Services", "services", "Explain creative services and project fit.", ["hero", "services", "service_detail", "pricing", "final_cta"], "Book Call"),
        page("Work", "work", "Show portfolio and case studies.", ["hero", "portfolio", "testimonials", "final_cta"], "View Work"),
        page("Contact", "contact", "Capture qualified project enquiries.", ["hero", "contact_form", "faq", "final_cta"], "Book Call"),
      ],
    },
  },
};

const PREMIUM_HOME_COMPOSITIONS: Record<string, SectionBlockType[]> = {
  restaurant: ["hero", "highlights", "services", "brand_story", "portfolio", "testimonials", "faq", "final_cta"],
  clinic: ["hero", "highlights", "services", "brand_story", "trust", "testimonials", "faq", "booking_cta", "final_cta"],
  contractor: ["hero", "trust", "services", "brand_story", "portfolio", "process", "testimonials", "faq", "final_cta"],
  consultant: ["hero", "highlights", "brand_story", "services", "values", "trust", "insights", "faq", "final_cta"],
  agency: ["hero", "highlights", "services", "portfolio", "process", "brand_story", "values", "faq", "final_cta"],
  real_estate: ["hero", "highlights", "portfolio", "brand_story", "services", "testimonials", "faq", "final_cta"],
  law: ["hero", "highlights", "services", "brand_story", "values", "trust", "insights", "faq", "final_cta"],
  boutique: ["hero", "highlights", "portfolio", "brand_story", "services", "testimonials", "final_cta"],
  portfolio: ["hero", "highlights", "portfolio", "brand_story", "services", "insights", "final_cta"],
};

const BRAND_LED_HOME_COMPOSITIONS: Record<string, SectionBlockType[]> = {
  restaurant: ["hero", "highlights", "brand_story", "services", "portfolio", "values", "testimonials", "insights", "faq", "final_cta"],
  clinic: ["hero", "highlights", "brand_story", "services", "values", "trust", "team", "insights", "faq", "booking_cta", "final_cta"],
  contractor: ["hero", "highlights", "brand_story", "services", "values", "portfolio", "process", "testimonials", "insights", "faq", "final_cta"],
  consultant: ["hero", "highlights", "brand_story", "services", "values", "trust", "team", "insights", "faq", "final_cta"],
  agency: ["hero", "highlights", "services", "portfolio", "process", "brand_story", "values", "insights", "faq", "final_cta"],
  real_estate: ["hero", "highlights", "brand_story", "portfolio", "services", "values", "team", "insights", "faq", "final_cta"],
  law: ["hero", "highlights", "services", "brand_story", "values", "trust", "team", "insights", "faq", "final_cta"],
  boutique: ["hero", "highlights", "brand_story", "portfolio", "services", "values", "insights", "final_cta"],
  portfolio: ["hero", "highlights", "brand_story", "portfolio", "services", "values", "insights", "final_cta"],
};

const createAlternateComposition = (base: SectionBlockType[]): SectionBlockType[] => {
  if (base.length < 5) return base;
  const first = base[0];
  const last = base[base.length - 1];
  const middle = [...base.slice(1, -1)];

  const storyIndex = middle.indexOf("brand_story");
  const servicesIndex = middle.indexOf("services");
  if (storyIndex >= 0 && servicesIndex >= 0 && storyIndex < servicesIndex) {
    [middle[storyIndex], middle[servicesIndex]] = [middle[servicesIndex], middle[storyIndex]];
  }

  const valuesIndex = middle.indexOf("values");
  const highlightsIndex = middle.indexOf("highlights");
  if (valuesIndex >= 0 && highlightsIndex >= 0 && valuesIndex > highlightsIndex + 1) {
    const [values] = middle.splice(valuesIndex, 1);
    middle.splice(highlightsIndex + 1, 0, values);
  }

  return [first, ...middle, last];
};

const resolveHomeComposition = (
  niche: string,
  mode: WebsiteGenerationMode,
  fallback: SectionBlockType[],
  seed = 0,
  maturity?: BusinessMaturity,
): SectionBlockType[] => {
  if (mode === "fast") return fallback;
  const base = mode === "brand_led"
    ? [...(BRAND_LED_HOME_COMPOSITIONS[niche] || BRAND_LED_HOME_COMPOSITIONS.consultant)]
    : [...(PREMIUM_HOME_COMPOSITIONS[niche] || PREMIUM_HOME_COMPOSITIONS.consultant)];

  if (maturity === "new") {
    return base.filter((block) => !["team", "insights"].includes(block));
  }

  if (maturity === "multi_location" && !base.includes("location")) {
    const finalIndex = Math.max(1, base.length - 1);
    base.splice(finalIndex, 0, "location");
  }

  return seed % 2 === 0 ? base : createAlternateComposition(base);
};

const sectionTypeMap: Record<SectionBlockType, string> = {
  hero: "hero",
  problem: "benefits",
  solution: "features",
  trust: "proof",
  services: "services",
  service_detail: "features",
  about: "about",
  process: "features",
  benefits: "benefits",
  testimonials: "testimonials",
  portfolio: "features",
  faq: "faq",
  pricing: "pricing",
  contact_form: "contact",
  whatsapp_cta: "cta",
  booking_cta: "appointment",
  location: "contact",
  team: "team",
  highlights: "features",
  values: "benefits",
  brand_story: "about",
  insights: "blog_list",
  final_cta: "cta",
};

const cloneSection = (type: string) =>
  JSON.parse(
    JSON.stringify({
      ...SECTION_TEMPLATES[type],
      id: generateId(),
      isVisible: true,
    }),
  ) as WebsiteSection;

export const getNicheTemplateById = (nicheId?: string) =>
  Object.values(NICHE_TEMPLATES).find((template) => template.id === nicheId);

export const getBlueprint = (nicheValue: string | undefined, plan: WebsitePlanId, maxPages?: number): PageBlueprint => {
  const niche = inferBlueprintNiche(nicheValue);
  const blueprintPlan = resolveBlueprintPlan(plan, maxPages);
  const blueprint = BLUEPRINTS[niche] || BLUEPRINTS.consultant;
  const pageLimit = getPlanPageLimit(plan, maxPages);
  // A five-page allowance should produce a real five-page website. Previously
  // the "business" blueprint stopped at three pages even when the plan allowed
  // five, which made generated previews look incomplete.
  const structurePlan: BlueprintPlanId =
    blueprintPlan === "business" && pageLimit >= 5 ? "growth" : blueprintPlan;
  const structure = blueprint[structurePlan];
  const expandedPages = expandBlueprintPages(niche, structure.pages, pageLimit);

  return {
    niche,
    plan: blueprintPlan,
    positioning: PLAN_POSITIONING[blueprintPlan],
    upgradeMessage: UPGRADE_MESSAGES[blueprintPlan],
    ...structure,
    pages: expandedPages.map((blueprintPage) => ({
      ...blueprintPage,
      seoTitle: `${blueprintPage.name} | {businessName}`,
      metaDescription: `${blueprintPage.purpose} Serving {targetCustomer} in {location}.`,
    })),
  };
};

const getServiceItems = (input: BlueprintBusinessInput) => {
  const fallbackService = input.mainService || "Professional Service";
  const raw = (input.services || []).filter(Boolean);
  const services = raw.length > 0
    ? raw
    : input.sourceDriven
      ? [fallbackService]
      : [fallbackService, "Consultation", "Ongoing Support"];
  return services.slice(0, input.sourceDriven ? 5 : 6).map((service) => {
    const title = generatedServiceTitle(service);
    return {
      title,
      description: input.sourceDriven
        ? ""
        : generatedBody(`${title} designed for ${input.targetCustomer || "your customers"} in ${input.location || "your area"}.`),
      imageUrl: undefined,
    };
  });
};

const getFaqItems = (input: BlueprintBusinessInput) => {
  const verifiedFaqItems = (input.faqItems || [])
    .filter((item) => item?.question && item?.answer)
    .slice(0, 6)
    .map((item) => ({
      question: item.question.includes("?") ? item.question : `${item.question}?`,
      answer: item.answer,
    }));
  if (verifiedFaqItems.length > 0) return verifiedFaqItems;

  if (input.sourceDriven) return [];

  const customFaqs = (input.faqs || []).filter(Boolean);
  if (customFaqs.length > 0) {
    return customFaqs.slice(0, 6).map((question) => ({
      question: question.includes("?") ? question : `${question}?`,
      answer: `Contact ${input.businessName} for a clear answer based on your needs.`,
    }));
  }

  return [
    {
      question: `Do you serve ${input.location || "my area"}?`,
      answer: `Yes. ${input.businessName} works with ${input.targetCustomer || "customers"} in ${input.location || "the local area"}.`,
    },
    {
      question: "How do I get started?",
      answer: `Use the ${input.ctaPreference || "contact"} button and the team will guide you through the next step.`,
    },
    {
      question: "Can I ask questions before booking?",
      answer: "Yes. Send an enquiry and the team will help you understand the best option before you commit.",
    },
  ];
};

const getTestimonials = (input: BlueprintBusinessInput) => {
  const custom = (input.testimonials || []).map((text) => text.trim()).filter(Boolean);
  return custom.slice(0, 3).map((text) => ({
    name: "Customer review",
    role: input.sourceDriven ? "Review found on the public website" : "Review supplied by the business",
    text,
    verified: true,
    sourceLabel: input.sourceDriven ? "Public website review" : "Business-supplied review",
  }));
};

const buildSectionContent = (
  section: WebsiteSection,
  block: SectionBlockType,
  pageBlueprint: BlueprintPage,
  input: BlueprintBusinessInput,
) => {
  const businessName = input.businessName || "Your Business";
  const service = input.mainService || "professional service";
  const target = input.targetCustomer || "local customers";
  const location = input.location || "your area";
  const cta = input.ctaPreference || pageBlueprint.ctaType || "Get Started";
  const tone = input.tone || "Professional";
  const premiumHeroHeadline = buildGeneratedHeroHeadline(service, target, businessName);
  const suppliedHeroHeadline = clampGeneratedText(input.heroHeadline || "", 10, 82);
  const suppliedHeroSubheadline = generatedBody(input.heroSubheadline || "");

  if (section.type === "hero") {
    section.content = {
      ...section.content,
      headline:
        pageBlueprint.slug === ""
          ? suppliedHeroHeadline
            || (input.generationMode === "fast"
              ? buildGeneratedHeroHeadline(businessName, target, businessName)
              : premiumHeroHeadline)
          : input.generationMode === "fast"
            ? generatedHeadline(`${pageBlueprint.name} Built Around ${generatedServiceTitle(service)}`)
            : generatedHeadline(pageBlueprint.name),
      subheadline: generatedBody(
        pageBlueprint.slug === ""
          ? suppliedHeroSubheadline
            || input.description
            || (input.sourceDriven ? "" : `${tone} ${generatedServiceTitle(service)} in ${location}, designed to help ${target} take the next step with confidence.`)
          : input.sourceDriven
            ? ""
            : input.description
              || `${tone} ${generatedServiceTitle(service)} in ${location}, designed to help ${target} take the next step with confidence.`,
      ),
      ctaText: cta,
      trustItems: pageBlueprint.slug === "" ? (input.heroTrustItems || []).filter(Boolean).slice(0, 3) : [],
      imageUrl: pageBlueprint.slug === "" ? input.heroImageUrl || undefined : undefined,
      imageAlt: pageBlueprint.slug === "" && input.heroImageUrl ? `${businessName} - ${service}` : undefined,
      assetSlots: pageBlueprint.slug === "" ? {
        heroImage: {
          source: "customer",
          status: input.heroImageUrl ? "provided" : "needed",
          guidance: "Customer-supplied hero photography, product screenshot, project image or brand artwork.",
        },
      } : undefined,
    };
  }

  if (section.type === "services") {
    section.content = {
      ...section.content,
      title:
        block === "pricing"
          ? "Services & Options"
          : pageBlueprint.name.includes("Menu")
            ? "Menu Highlights"
            : pageBlueprint.name.includes("Practice")
              ? "Practice Areas"
              : pageBlueprint.name.includes("Treatment")
                ? "Treatments & Services"
                : "Services Built Around Your Needs",
      description: input.sourceDriven
        ? undefined
        : `Clear options for ${target} looking for ${service} in ${location}.`,
      items: getServiceItems(input),
      assetSlots: input.generationMode === "fast" ? undefined : {
        serviceImages: {
          source: "customer",
          status: "needed",
          guidance: "Optional customer-supplied service, project or product imagery. Layout remains complete without fabricated photography.",
        },
      },
    };
  }

  if (section.type === "proof") {
    const suppliedProof = (input.localProof || "").trim();
    const suppliedLogos = Array.isArray(input.proofLogos) ? input.proofLogos.filter(Boolean) : [];
    const hasBusinessProof = Boolean(suppliedProof || suppliedLogos.length);
    section.content = {
      ...section.content,
      title: suppliedLogos.length
        ? "Trusted Connections"
        : suppliedProof
          ? "Proof From the Business"
          : "Proof",
      description: suppliedProof || undefined,
      stats: [],
      logos: suppliedLogos,
      items: suppliedProof
        ? [{ title: "Business-supplied evidence", description: suppliedProof }]
        : [],
      providedByBusiness: hasBusinessProof,
      sourceLabel: hasBusinessProof ? "Business-supplied proof" : undefined,
    };
    section.isVisible = hasBusinessProof;
  }

  if (section.type === "about") {
    const sourceAboutText = String(input.aboutText || input.description || "").trim();
    section.content = {
      ...section.content,
      title: `About ${businessName}`,
      text: input.sourceDriven
        ? sourceAboutText
        : `${businessName} helps ${target} in ${location} with ${service}. The approach is clear, practical, and focused on helping every customer understand their options before taking action.\n\nThe website structure is designed to answer common questions and make it easy to enquire without inventing claims the business has not supplied.`,
      imageUrl: input.storyImageUrl || undefined,
      assetSlots: {
        storyImage: {
          source: "customer",
          status: input.storyImageUrl ? "provided" : "needed",
          guidance: "Customer-supplied founder, team, office, service, project or environment photography.",
        },
      },
    };
    if (input.sourceDriven && !sourceAboutText) section.isVisible = false;
  }

  if (section.type === "features") {
    section.content = {
      ...section.content,
      title:
        block === "portfolio"
          ? (pageBlueprint.slug === "" ? "Selected Work" : pageBlueprint.name)
          : block === "process"
            ? "How It Works"
            : "What Makes This Different",
      description: `A simple path from first visit to ${cta.toLowerCase()}.`,
      items:
        block === "process"
          ? ["Understand your needs", "Recommend the right option", "Confirm the next step", "Follow up clearly"]
          : block === "portfolio"
            ? ["Selected work", "Customer-supplied project photography", "Verified project details", "Recent highlights"]
            : block === "highlights"
              ? [
                  { title: "Clear proposition", description: `${service} explained around what ${target} need to know.` },
                  { title: "Evidence before claims", description: input.localProof ? "Business-supplied proof is brought forward in the journey." : "Customer proof slots stay empty until real evidence is supplied." },
                  { title: "Easy next step", description: `The page keeps ${cta.toLowerCase()} visible without turning every section into a button wall.` },
                  { title: "Responsive by design", description: "Desktop and mobile use deliberate composition rather than a simple shrink-down." },
                ]
              : ["Clear service information", "Trust-focused page flow", "Fast enquiry path", "Mobile-first experience"],
      assetSlots: block === "portfolio" ? {
        projectImages: {
          source: "customer",
          status: "needed",
          guidance: "Customer-supplied projects, case-study images or portfolio media.",
        },
      } : undefined,
    };
  }

  if (section.type === "benefits") {
    section.content = {
      ...section.content,
      title: `Designed for ${target}`,
      items: block === "values"
        ? [
            { title: "Clarity first", description: "The offer is easy to understand before visual decoration is added." },
            { title: "Evidence led", description: "Customer reviews, people, projects, certifications and logos appear only when supplied." },
            { title: "Useful restraint", description: "Typography, spacing and brand colour carry the design instead of excessive effects." },
            { title: "Action without pressure", description: `The next step stays visible while the page earns enough trust to support ${cta.toLowerCase()}.` },
          ]
        : [
            { title: "Clear next step", description: `Visitors always know how to ${cta.toLowerCase()}.` },
            { title: "Less uncertainty", description: "Service details and FAQs help people understand what happens next." },
            { title: "Local relevance", description: `Content is shaped around ${location} and the customers you want.` },
          ],
    };
  }

  if (section.type === "team") {
    const members = (input.teamMembers || []).filter((member) => member?.name);
    section.content = {
      ...section.content,
      title: "People Behind the Business",
      description: "Customer-supplied leadership and team profiles.",
      members,
      assetSlots: {
        teamImages: {
          source: "customer",
          status: members.length ? "provided" : "needed",
          guidance: "Add real staff names, roles, biographies and portraits before publishing this section.",
        },
      },
    };
    section.isVisible = members.length > 0;
  }

  if (section.type === "blog_list") {
    section.content = {
      ...section.content,
      title: "Insights & Updates",
      description: `Useful thinking from ${businessName} for ${target}.`,
      showExcerpts: true,
      postsPerPage: input.generationMode === "brand_led" ? 5 : 3,
    };
  }

  if (section.type === "testimonials") {
    const items = getTestimonials(input);
    section.content = {
      ...section.content,
      title: items.length ? "Customer Feedback" : "Customer Feedback",
      items,
    };
    section.isVisible = items.length > 0;
  }

  if (section.type === "faq") {
    const items = getFaqItems(input);
    section.content = {
      ...section.content,
      title: "Common Questions",
      items,
    };
    if (input.sourceDriven && items.length === 0) section.isVisible = false;
  }

  if (section.type === "pricing") {
    section.content = {
      ...section.content,
      title: "Services & Options",
      description: `Pricing depends on the scope of ${service}. Contact ${businessName} for the options that fit your needs.`,
      plans: [],
      items: getServiceItems(input).map(({ title, description }) => ({ title, description })),
      ctaText: cta,
    };
    section.isVisible = false;
  }

  if (section.type === "contact") {
    section.content = {
      ...section.content,
      title: pageBlueprint.ctaType.includes("Reserve")
        ? "Reserve Your Table"
        : pageBlueprint.ctaType.includes("Quote")
          ? "Request a Quote"
          : pageBlueprint.ctaType.includes("Appointment")
            ? "Book an Appointment"
            : "Contact Us",
      description: input.sourceDriven
        ? `Send your details and ${businessName} will follow up.`
        : `Send your details and ${businessName} will follow up about ${service}.`,
      email: input.contactEmail,
      phone: input.contactPhone,
      whatsapp: input.whatsappNumber,
    };
  }

  if (section.type === "appointment") {
    section.content = {
      ...section.content,
      title: pageBlueprint.ctaType,
      description: `Choose a time to speak with ${businessName} about ${service}.`,
      buttonText: pageBlueprint.ctaType,
      calendarTitle: "Available Times",
      workingHours: "Local business hours",
      location,
    };
    if (input.sourceDriven) section.isVisible = false;
  }

  if (section.type === "cta") {
    const sourceCtaTitle = /appointment/i.test(cta)
      ? "Ready to book an appointment?"
      : /quote/i.test(cta)
        ? "Ready to request a quote?"
        : /whatsapp/i.test(cta)
          ? "Prefer to chat on WhatsApp?"
          : /call/i.test(cta)
            ? "Ready to speak with the team?"
            : "Ready to get in touch?";
    section.content = {
      ...section.content,
      title:
        block === "whatsapp_cta"
          ? "Prefer WhatsApp?"
          : input.sourceDriven
            ? sourceCtaTitle
            : generatedHeadline(`Ready to talk about ${generatedServiceTitle(service)}?`),
      description: input.sourceDriven
        ? generatedBody(`Contact ${businessName} when you are ready to take the next step.`)
        : generatedBody(`Take the next step with ${businessName} in ${location}.`),
      buttonText: cta,
    };
  }

  return section;
};

const makeSourceBlueprintPage = (
  name: string,
  slug: string,
  purpose: string,
  ctaType: string,
  navLabel = name,
): BlueprintPage => ({
  name,
  slug,
  purpose,
  sections: ["hero"],
  ctaType,
  navLabel,
  seoTitle: `${name} | {businessName}`,
  metaDescription: `${purpose} Serving {targetCustomer} in {location}.`,
});

const resolveSourceDrivenBlueprintPages = (
  blueprint: PageBlueprint,
  input: BlueprintBusinessInput,
  limit: number,
): BlueprintPage[] => {
  const hasAbout = Boolean(String(input.aboutText || input.description || "").trim());
  const hasFaqs = (input.faqItems || []).some((item) => item?.question && item?.answer);
  const hasTestimonials = (input.testimonials || []).filter(Boolean).length > 0;
  const hasServices = (input.services || []).filter(Boolean).length > 0 || Boolean(input.mainService);
  const ctaType = input.ctaPreference || blueprint.pages[blueprint.pages.length - 1]?.ctaType || "Contact Us";

  const home = makeSourceBlueprintPage(
    "Home",
    "",
    "Present the clearest business proposition, services, proof and next step.",
    ctaType,
  );
  const about = makeSourceBlueprintPage(
    "About",
    "about",
    "Explain the business, team and approach using verified source content.",
    ctaType,
  );
  const reviews = makeSourceBlueprintPage(
    "Reviews",
    "reviews",
    "Show genuine customer feedback already published by the business.",
    ctaType,
  );
  const faq = makeSourceBlueprintPage(
    blueprint.niche === "clinic" ? "Patient Info" : "FAQ",
    blueprint.niche === "clinic" ? "patient-info" : "faq",
    "Answer common questions using verified source information.",
    ctaType,
    blueprint.niche === "clinic" ? "Patient Info" : "FAQ",
  );

  let pages: BlueprintPage[] = [home];

  if (hasServices) {
    const serviceName =
      blueprint.niche === "clinic"
        ? "Treatments"
        : blueprint.niche === "restaurant"
          ? "Menu"
          : "Services";
    pages.push(makeSourceBlueprintPage(
      serviceName,
      blueprint.niche === "clinic" ? "treatments" : blueprint.niche === "restaurant" ? "menu" : "services",
      "Present the real services or offers already identified from the source website.",
      ctaType,
    ));
  }

  if (hasAbout) pages.push(about);
  if (hasFaqs) pages.push(faq);
  else if (hasTestimonials) pages.push(reviews);

  const contactName =
    blueprint.niche === "clinic"
      ? "Appointment"
      : blueprint.niche === "contractor"
        ? "Request a Quote"
        : blueprint.niche === "restaurant"
          ? "Contact"
          : "Contact";
  const contactSlug =
    blueprint.niche === "clinic"
      ? "appointment"
      : blueprint.niche === "contractor"
        ? "quote"
        : "contact";
  const contactNav =
    blueprint.niche === "clinic"
      ? "Book"
      : blueprint.niche === "contractor"
        ? "Quote"
        : "Contact";

  pages.push(makeSourceBlueprintPage(
    contactName,
    contactSlug,
    "Give visitors a direct, credible way to contact the business.",
    ctaType,
    contactNav,
  ));

  // A strong preview is allowed to have fewer than five pages when the source
  // website does not contain enough trustworthy material. Empty pages sell
  // templates; concise evidence-led pages sell redesigns.
  return pages.slice(0, Math.max(1, limit));
};

const resolveSourceDrivenBlockPlan = (
  page: BlueprintPage,
  input: BlueprintBusinessInput,
): SectionBlockType[] => {
  const hasAbout = Boolean(String(input.aboutText || input.description || "").trim());
  const hasTestimonials = (input.testimonials || []).filter(Boolean).length > 0;
  const hasFaqs = (input.faqItems || []).some((item) => item?.question && item?.answer);

  if (page.slug === "") {
    return [
      "hero",
      "services",
      ...(hasAbout ? ["about" as SectionBlockType] : []),
      ...(hasTestimonials ? ["testimonials" as SectionBlockType] : []),
      ...(hasFaqs ? ["faq" as SectionBlockType] : []),
      "final_cta",
    ];
  }

  if (/^(treatments?|services?|menu|programs?|practice-areas?)$/.test(page.slug)) {
    return ["hero", "services", ...(hasFaqs ? ["faq" as SectionBlockType] : []), "final_cta"];
  }

  if (/^(about|practitioners?|team|our-team)$/.test(page.slug)) {
    return ["hero", ...(hasAbout ? ["about" as SectionBlockType] : []), ...(hasTestimonials ? ["testimonials" as SectionBlockType] : []), "final_cta"];
  }

  if (/^(reviews|results|testimonials)$/.test(page.slug)) {
    return ["hero", ...(hasTestimonials ? ["testimonials" as SectionBlockType] : []), "final_cta"];
  }

  if (/^(faq|patient-info|info|process)$/.test(page.slug)) {
    return ["hero", ...(hasFaqs ? ["faq" as SectionBlockType] : []), "final_cta"];
  }

  if (/^(appointment|contact|quote|book-call|consultation|reservation)$/.test(page.slug)) {
    return ["hero", "contact_form"];
  }

  return ["hero", "services", "final_cta"];
};

export const buildPagesFromBlueprint = (input: BlueprintBusinessInput): WebsitePage[] => {
  const template = getNicheTemplateById(input.nicheId);
  const nicheName = input.nicheName || template?.category || template?.name || input.nicheId;
  const blueprint = getBlueprint(nicheName, input.plan, input.maxPages);
  const limit = getPlanPageLimit(input.plan, input.maxPages);
  const generationMode = input.generationMode || "fast";
  const profile = resolveDesignProfileForMode(generationMode, template?.category || template?.name, undefined, {
    brandPersonality: input.brandPersonality,
    businessMaturity: input.businessMaturity,
    assetReadiness: input.assetReadiness,
  });

  const effectivePages = input.sourceDriven
    ? resolveSourceDrivenBlueprintPages(blueprint, input, limit)
    : blueprint.pages.slice(0, limit);

  return effectivePages.map((blueprintPage) => {
    const blockPlan = input.sourceDriven
      ? resolveSourceDrivenBlockPlan(blueprintPage, input)
      : blueprintPage.slug === ""
        ? resolveHomeComposition(blueprint.niche, generationMode, blueprintPage.sections, input.compositionSeed || 0, input.businessMaturity)
        : blueprintPage.sections;
    const sections = blockPlan.map((block, blockIndex) => {
      const sectionType = sectionTypeMap[block];
      const section = cloneSection(sectionType);
      const configured = buildSectionContent(section, block, blueprintPage, input);
      const sourceVariant = input.sourceDriven
        ? sectionType === "hero"
          ? (blueprintPage.slug === "" ? (input.preferredHeroVariant || "source_brand_hero") : "page_masthead")
          : sectionType === "services"
            ? "source_services"
            : sectionType === "about"
              ? "source_about"
              : sectionType === "testimonials"
                ? "source_testimonials"
                : sectionType === "faq"
                  ? "source_faq"
                  : sectionType === "contact"
                    ? "source_contact"
                    : sectionType === "cta"
                      ? "brand_band"
                      : undefined
        : undefined;
      const variant =
        sourceVariant
        || (sectionType === "proof" && (input.proofLogos?.length || 0) > 0
          ? "logo_marquee"
          : sectionType === "hero" && blueprintPage.slug === "" && input.preferredHeroVariant
            ? input.preferredHeroVariant
            : sectionType === "hero" && blueprintPage.slug !== "" && input.compactSubpageHeroes
              ? "page_masthead"
              : getVariantForMode(sectionType, profile.id, generationMode, blockIndex + (input.compositionSeed || 0), {
                  brandPersonality: input.brandPersonality,
                  businessMaturity: input.businessMaturity,
                  assetReadiness: input.assetReadiness,
                }));
      return variant
        ? {
            ...configured,
            settings: {
              ...(configured.settings || {}),
              variant,
              designProfile: profile.id,
              motionProfile: profile.motion,
              textAlign: generationMode === "fast" ? configured.settings?.textAlign : "left",
              ...(input.sourceDriven ? { sourceDriven: true } : {}),
            },
          }
        : configured;
    });

    return {
      id: generateId(),
      title: blueprintPage.name,
      slug: blueprintPage.slug,
      sections,
      seo: {
        title: blueprintPage.seoTitle.replace("{businessName}", input.businessName),
        description: blueprintPage.metaDescription
          .replace("{targetCustomer}", input.targetCustomer || "local customers")
          .replace("{location}", input.location || "your area"),
        keywords: [input.businessName, input.mainService, input.location, nicheName].filter(Boolean) as string[],
      },
    };
  });
};

export const buildNavigationPreview = (input: Pick<BlueprintBusinessInput, "nicheId" | "nicheName" | "plan" | "maxPages">) => {
  const template = getNicheTemplateById(input.nicheId);
  const nicheName = input.nicheName || template?.category || template?.name || input.nicheId;
  return getBlueprint(nicheName, input.plan, input.maxPages).pages.slice(0, getPlanPageLimit(input.plan, input.maxPages));
};

const APPROVED_WEBSITE_STYLES = new Set<NonNullable<Website["theme"]["style"]>>([
  "modern",
  "neumorphic",
  "glassmorphic",
  "brutalist",
  "editorial",
  "action",
  "immersive",
  "authority",
  "corporate",
  "prestige",
  "luxury_dark",
]);

const normalizeBlueprintWebsiteStyle = (style?: string): NonNullable<Website["theme"]["style"]> => {
  const candidate = String(style || "").trim() as NonNullable<Website["theme"]["style"]>;
  return APPROVED_WEBSITE_STYLES.has(candidate) ? candidate : "modern";
};

export const getBlueprintTheme = (
  nicheId?: string,
  generationMode: WebsiteGenerationMode = "fast",
  intent?: {
    brandPersonality?: BrandPersonality;
    businessMaturity?: BusinessMaturity;
    assetReadiness?: AssetReadiness;
  },
): Website["theme"] => {
  const template = getNicheTemplateById(nicheId);
  const baseTheme = template?.theme || {
    primaryColor: "#4f46e5",
    secondaryColor: "#ffffff",
    fontFamily: "'Inter', sans-serif",
    style: "modern",
  };
  const profile = resolveDesignProfileForMode(generationMode, template?.category || template?.name, undefined, intent);
  const baseStyle = normalizeBlueprintWebsiteStyle(baseTheme.style);
  return {
    ...baseTheme,
    style: generationMode === "fast" ? baseStyle : profile.defaultStyle,
    fontFamily: generationMode === "fast" ? baseTheme.fontFamily : profile.bodyFont,
    displayFont: profile.displayFont,
    bodyFont: profile.bodyFont,
    designProfile: profile.id,
    typographyProfile: profile.typography,
    spacingProfile: profile.spacing,
    layoutDensity: profile.spacing,
    motionProfile: profile.motion,
    imageProfile: profile.imageTreatment,
    generationMode,
    brandPersonality: intent?.brandPersonality,
    businessMaturity: intent?.businessMaturity,
    assetReadiness: intent?.assetReadiness,
  };
};

export const getBlueprintSeo = (input: BlueprintBusinessInput) => {
  const template = getNicheTemplateById(input.nicheId);
  const nicheName = input.nicheName || template?.category || template?.name || "Business";
  const service = input.mainService || nicheName;
  const location = input.location || "Local Area";

  return {
    title: `${input.businessName} | ${service} in ${location}`,
    description:
      input.description ||
      `${input.businessName} helps ${input.targetCustomer || "customers"} with ${service} in ${location}.`,
    keywords: [input.businessName, service, location, nicheName].filter(Boolean),
    businessType: inferBlueprintNiche(nicheName) === "restaurant" ? "Restaurant" : "LocalBusiness",
    region: location,
    placename: location,
    brandVoice: input.tone || "Professional",
  };
};

export const createPlanLimitUpgradeMessage = (plan: WebsitePlanId) =>
  "You've reached your page limit. Upgrade to unlock more pages and grow your website.";

export const getPlanUpgradeValue = (plan: WebsitePlanId, maxPages?: number) => {
  const blueprintPlan = resolveBlueprintPlan(plan, maxPages);
  return UPGRADE_MESSAGES[blueprintPlan];
};

export const getReadablePlanName = (plan: WebsitePlanId) =>
  plan === "starter" ? "Managed Website" : plan === "business" ? "Website Growth" : "Growth Partner";

export const getSectionBlockLabel = (block: SectionBlockType) => startCase(block);
