export type GrowthPriority = "High" | "Medium" | "Low";

export interface WebsiteGrowthOpportunity {
  id: string;
  label: string;
  issues: string[];
  recommendedFixes: string[];
  priority: GrowthPriority;
  oneClickSuggestion: string;
}

export interface MonthlyImprovementOpportunity {
  id: string;
  issue: string;
  whyItMatters: string;
  suggestedImprovement: string;
  priority: GrowthPriority;
  featureId?: string;
}

export interface CampaignLandingPageTemplate {
  id: string;
  label: string;
  description: string;
  sections: string[];
  thankYouCopy: string;
}

export interface IndustryPagePack {
  id: string;
  label: string;
  homepageStructure: string[];
  servicesSection: string[];
  ctaExamples: string[];
  faqs: string[];
  trustElements: string[];
  recommendedImages: string[];
  seoKeywords: string[];
  enquiryFormFields: string[];
}

export interface CompetitorGapSignal {
  area: string;
  gap: string;
  suggestedAction: string;
  priority: GrowthPriority;
}

export interface CampaignCalendarIdea {
  month: string;
  campaign: string;
  target: string;
  pageIdea: string;
  cta: string;
}

export const WEBSITE_GROWTH_OPPORTUNITIES: WebsiteGrowthOpportunity[] = [
  {
    id: "design",
    label: "Offer and page clarity",
    issues: ["Hero section could show the core offer faster", "Some proof elements can be moved higher"],
    recommendedFixes: ["Tighten the hero copy", "Add a trust strip near the first CTA"],
    priority: "Medium",
    oneClickSuggestion: "Rewrite hero for clearer offer and stronger first-screen trust.",
  },
  {
    id: "seo",
    label: "Search messaging",
    issues: ["Meta description can be more specific", "Service keywords are not repeated enough in headings"],
    recommendedFixes: ["Generate SEO title and meta description", "Add service + location wording to one H2"],
    priority: "High",
    oneClickSuggestion: "Generate improved SEO metadata for the current homepage.",
  },
  {
    id: "enquiry",
    label: "Enquiry journey",
    issues: ["Primary CTA can be more direct", "WhatsApp message is not service-specific yet"],
    recommendedFixes: ["Use service-specific CTA copy", "Add pre-filled WhatsApp enquiry messages"],
    priority: "High",
    oneClickSuggestion: "Create a WhatsApp CTA for the main service.",
  },
  {
    id: "trust",
    label: "Trust and proof",
    issues: ["Missing concrete proof above the fold", "FAQ does not answer price or timing concerns"],
    recommendedFixes: ["Add proof badges or client examples", "Add buying-objection FAQs"],
    priority: "Medium",
    oneClickSuggestion: "Generate a trust section and 3 objection-handling FAQs.",
  },
  {
    id: "speed",
    label: "Page performance",
    issues: ["Large images should keep optimized dimensions", "Third-party scripts should stay minimal"],
    recommendedFixes: ["Compress hero images", "Audit scripts before adding more tracking"],
    priority: "Low",
    oneClickSuggestion: "Create a speed checklist for the current page.",
  },
  {
    id: "content",
    label: "Service content",
    issues: ["Service descriptions could be more specific", "Content gaps for common buyer questions"],
    recommendedFixes: ["Improve service section copy", "Add missing FAQs and next-step guidance"],
    priority: "Medium",
    oneClickSuggestion: "Rewrite service descriptions with clearer benefits and outcomes.",
  },
];

export const MONTHLY_IMPROVEMENT_OPPORTUNITIES: MonthlyImprovementOpportunity[] = [
  {
    id: "headline",
    issue: "Homepage headline can be more specific",
    whyItMatters: "Visitors decide quickly whether the site matches their problem.",
    suggestedImprovement: "Rewrite the headline around the main service, target customer, and location.",
    priority: "High",
  },
  {
    id: "cta",
    issue: "CTA wording is too generic",
    whyItMatters: "Clear CTAs increase WhatsApp, call, and form actions.",
    suggestedImprovement: "Use direct CTA copy such as 'Request a Quote' or 'Book a Consultation'.",
    priority: "High",
  },
  {
    id: "faq",
    issue: "Missing buyer-objection FAQs",
    whyItMatters: "FAQs reduce hesitation around price, timeline, service area, and next steps.",
    suggestedImprovement: "Add 5 FAQs based on pricing, process, booking, warranty, and service coverage.",
    priority: "Medium",
  },
  {
    id: "campaign",
    issue: "No focused campaign landing page",
    whyItMatters: "Promotions and consultations convert better when traffic goes to a dedicated page.",
    suggestedImprovement: "Create a campaign landing page for a free consultation or limited-time package.",
    priority: "Medium",
    featureId: "campaign_landing_pages",
  },
  {
    id: "local",
    issue: "Local service page opportunity found",
    whyItMatters: "Service + city pages can help local buyers find the right offer faster.",
    suggestedImprovement: "Draft one local growth page for the main service and city.",
    priority: "Medium",
    featureId: "local_growth_pages",
  },
];

export const WHATSAPP_ENQUIRY_KIT = {
  floatingButton: true,
  serviceSpecificButtons: true,
  defaultMessage: "Hi, I found your website and I’m interested in [service]. Can I get more details?",
  suggestedFollowUps: [
    "Thanks for reaching out. Which service are you interested in?",
    "Would you like a quick quote or a consultation time?",
    "Can you share your location and preferred appointment time?",
  ],
  trackedActions: ["WhatsApp click", "Call click", "Email click", "Form submission", "Booking click", "Quote button click"],
};

export const ENQUIRY_PATH_TRACKER = {
  metrics: ["Total enquiries", "Conversion actions by page", "Top CTA", "Weakest page", "Recommended improvement"],
  sampleActions: [
    { label: "WhatsApp clicks", value: 0 },
    { label: "Call clicks", value: 0 },
    { label: "Email clicks", value: 0 },
    { label: "Form submissions", value: 0 },
    { label: "Booking clicks", value: 0 },
    { label: "Quote button clicks", value: 0 },
  ],
};

export const CAMPAIGN_LANDING_PAGE_TEMPLATES: CampaignLandingPageTemplate[] = [
  {
    id: "free-consultation",
    label: "Free Consultation",
    description: "Capture qualified enquiries for a service consultation.",
    sections: ["Hero headline", "Offer section", "Benefits", "Proof section", "FAQ", "Form", "WhatsApp CTA", "Tracking"],
    thankYouCopy: "Thanks for requesting a consultation. We will contact you shortly with the next step.",
  },
  {
    id: "seasonal-offer",
    label: "Seasonal Offer",
    description: "Promote a limited-time package or monthly campaign.",
    sections: ["Hero headline", "Offer deadline", "Package benefits", "Proof", "FAQ", "Lead form", "WhatsApp CTA", "Tracking"],
    thankYouCopy: "Thanks for your interest. Your offer request has been received.",
  },
  {
    id: "workshop-signup",
    label: "Workshop / Webinar Signup",
    description: "Collect registrations for events, workshops, or webinars.",
    sections: ["Event hero", "Who it is for", "Agenda", "Speaker proof", "FAQ", "Signup form", "WhatsApp CTA", "Thank-you copy"],
    thankYouCopy: "You are registered. We will send the event details and reminders soon.",
  },
];

export const INDUSTRY_PAGE_PACKS: IndustryPagePack[] = [
  {
    id: "clinic",
    label: "Clinic",
    homepageStructure: ["Hero", "Treatments", "Practitioner trust", "Testimonials", "FAQ", "Appointment CTA"],
    servicesSection: ["Consultation", "Treatment categories", "Patient process"],
    ctaExamples: ["Book Appointment", "WhatsApp Clinic", "Request Treatment Info"],
    faqs: ["Do I need an appointment?", "What should I bring?", "How long does treatment take?"],
    trustElements: ["Doctor credentials", "Clinic photos", "Patient guidance", "Operating hours"],
    recommendedImages: ["Clinic exterior", "Treatment room", "Practitioner portrait"],
    seoKeywords: ["clinic near me", "private clinic", "health consultation"],
    enquiryFormFields: ["Name", "Phone", "Preferred treatment", "Preferred date"],
  },
  {
    id: "dental",
    label: "Dental",
    homepageStructure: ["Hero", "Treatments", "Dentist trust", "Before/after proof", "FAQ", "Booking CTA"],
    servicesSection: ["Checkup", "Whitening", "Braces", "Implants"],
    ctaExamples: ["Book Dental Appointment", "Ask About Treatment", "WhatsApp Dental Clinic"],
    faqs: ["How much is a consultation?", "Do you treat children?", "Can I book on WhatsApp?"],
    trustElements: ["Dentist profiles", "Treatment photos", "Patient reviews", "Sterilization process"],
    recommendedImages: ["Dental chair", "Dentist portrait", "Smile close-up"],
    seoKeywords: ["dental clinic", "dentist near me", "teeth whitening"],
    enquiryFormFields: ["Name", "Phone", "Treatment interest", "Pain / concern"],
  },
  {
    id: "renovation",
    label: "Renovation Contractor",
    homepageStructure: ["Hero", "Services", "Project gallery", "Why choose us", "Testimonials", "Quote CTA"],
    servicesSection: ["Home renovation", "Kitchen", "Bathroom", "Commercial fit-out"],
    ctaExamples: ["Request Quote", "WhatsApp Project Details", "Book Site Visit"],
    faqs: ["Do you provide site visits?", "How long does renovation take?", "Can I see past work?"],
    trustElements: ["Project photos", "Warranty/reassurance", "Process timeline", "Client testimonials"],
    recommendedImages: ["Before/after renovation", "Team on site", "Finished interior"],
    seoKeywords: ["renovation contractor", "home renovation", "interior renovation"],
    enquiryFormFields: ["Name", "Phone", "Property type", "Budget range", "Location"],
  },
  {
    id: "consultant",
    label: "Consultant",
    homepageStructure: ["Hero", "Problem/solution", "Services", "Proof", "FAQ", "Book call CTA"],
    servicesSection: ["Consulting offer", "Programs", "Workshops", "Retainers"],
    ctaExamples: ["Book Strategy Call", "Request Proposal", "Ask About Consulting"],
    faqs: ["Who is this for?", "How does the process work?", "Can we start with a call?"],
    trustElements: ["Case studies", "Client logos", "Credentials", "Results"],
    recommendedImages: ["Professional portrait", "Workshop scene", "Client meeting"],
    seoKeywords: ["business consultant", "consulting services", "strategy consultant"],
    enquiryFormFields: ["Name", "Company", "Email", "Business challenge", "Budget range"],
  },
];

export const LOCAL_GROWTH_PAGE_BLUEPRINT = {
  requiredInputs: ["service", "city", "area", "state", "country"],
  sections: ["Unique local headline", "Service description", "Local FAQ", "CTA", "Internal links", "SEO title", "Meta description"],
  duplicateWarnings: [
    "Hero copy is too similar to another location page.",
    "FAQ content repeats across too many pages.",
    "Add at least three local inputs before publishing.",
  ],
};

export const BUSINESS_OFFER_BUILDER = {
  inputs: ["main service", "target customer", "starting price or price range", "consultation type", "guarantee/reassurance", "preferred CTA"],
  outputs: ["offer headline", "CTA copy", "package section", "FAQ", "WhatsApp script", "form copy"],
};

export const WEBSITE_GROWTH_AUTOPILOT = {
  title: "Monthly Website Improvement Plan",
  monthlyActions: [
    "Improve the weakest CTA",
    "Add one missing buyer FAQ",
    "Refresh one service section",
    "Check local SEO metadata",
    "Suggest one new proof element",
  ],
};

export const ENQUIRY_LOSS_DETECTOR = {
  signals: [
    "Visitors reach services but do not click a CTA",
    "Contact page views do not become form submissions",
    "WhatsApp clicks are not followed up",
    "Pricing views do not become quote requests",
  ],
  defaultRecommendation: "Move the strongest CTA higher and add a second contact option near the decision section.",
};

export const COMPETITOR_GAP_SCANNER: CompetitorGapSignal[] = [
  {
    area: "Services",
    gap: "Competitors may show service-specific landing pages while your website only has a general service section.",
    suggestedAction: "Create one page or section for the highest-value service.",
    priority: "High",
  },
  {
    area: "Trust",
    gap: "Competitors may show reviews, guarantees, team photos, or project examples more clearly.",
    suggestedAction: "Add a trust proof block above the first major CTA.",
    priority: "High",
  },
  {
    area: "Local SEO",
    gap: "Competitors may target city and service combinations that your website does not cover.",
    suggestedAction: "Draft one local growth page for your main service and city.",
    priority: "Medium",
  },
  {
    area: "Offer",
    gap: "Competitors may make pricing, packages, or consultation next steps easier to understand.",
    suggestedAction: "Review the service offer clarity, target customer, and CTA.",
    priority: "Medium",
  },
];

export const OFFER_STRENGTH_CRITERIA = [
  "Clear service",
  "Clear target customer",
  "Clear result or outcome",
  "Proof or reassurance",
  "Specific CTA",
  "Pricing or next-step clarity",
];

export const WHATSAPP_FOLLOW_UP_CRM = {
  statuses: ["New", "Replied", "Quoted", "Follow-up needed", "Won", "Lost"],
  templates: [
    "Hi, thanks for your enquiry. Which service are you most interested in?",
    "Would you like a quick quote or a short consultation first?",
    "Just checking in. Do you still need help with this?",
    "Here is the next step if you would like to proceed.",
  ],
};

export const LOCAL_SEO_OPPORTUNITY_MAP = {
  opportunities: [
    "Primary city page missing",
    "Nearby areas not listed",
    "Main service has no local FAQ",
    "No internal link from service page to location page",
    "No proof tied to the service area",
  ],
  suggestedCities: ["Kuala Lumpur", "Petaling Jaya", "Subang Jaya", "Shah Alam", "Singapore"],
};

export const TRUST_PROOF_BUILDER = {
  proofTypes: [
    "Customer reviews",
    "Project photos",
    "Before/after examples",
    "Certifications",
    "Client logos",
    "Years of experience",
    "Guarantee or reassurance",
    "Team photos",
  ],
  sectionOutput: ["Trust headline", "Proof cards", "FAQ reassurance", "CTA support copy"],
};

export const CAMPAIGN_CALENDAR: CampaignCalendarIdea[] = [
  {
    month: "January",
    campaign: "New Year Service Refresh",
    target: "Customers planning improvements after the holidays",
    pageIdea: "Start the year with a cleaner, faster service experience",
    cta: "Request January Quote",
  },
  {
    month: "March",
    campaign: "School Holiday / Family Campaign",
    target: "Family-focused buyers and appointment-based services",
    pageIdea: "Limited school holiday appointments or packages",
    cta: "Check Available Slots",
  },
  {
    month: "June",
    campaign: "Mid-Year Growth Push",
    target: "Businesses reviewing budgets and performance",
    pageIdea: "Mid-year consultation or audit landing page",
    cta: "Book Mid-Year Review",
  },
  {
    month: "November",
    campaign: "Year-End Package",
    target: "Buyers trying to complete work before year end",
    pageIdea: "Year-end offer with clear deadline and enquiry form",
    cta: "Claim Year-End Slot",
  },
];

export const SALES_PAGE_DOCTOR = {
  checks: [
    "Hero explains the offer within 5 seconds",
    "Primary CTA appears above the fold",
    "Services are specific, not generic",
    "Trust proof appears before the final CTA",
    "FAQs answer price, timing, process, and risk",
    "Contact path has WhatsApp or form fallback",
  ],
};

export const DONE_FOR_YOU_REQUEST_PORTAL = {
  requestTypes: [
    "Change website text",
    "Replace image",
    "Add service",
    "Create campaign page",
    "Create local growth page",
    "Improve SEO title/meta",
    "Request Website quote",
  ],
  statuses: ["New request", "In review", "Queued", "Completed"],
};

export const REVIEW_TO_WEBSITE_IMPORT = {
  inputs: ["Manual Google review paste", "Customer phrases", "Repeated buying reasons", "Common objections"],
  outputs: [
    "Customer-language headlines",
    "Buying reason bullets",
    "Review-backed FAQ ideas",
    "Trust section copy",
    "Proof block suggestions",
  ],
  safetyRules: [
    "Do not invent reviews",
    "Do not create fake testimonials",
    "Use only the pasted review meaning",
    "Keep claims neutral when proof is weak",
  ],
};

export const LOCAL_SEARCH_CHECKLIST = [
  "Service + city keyword in page title",
  "Local FAQ present",
  "Contact method visible",
  "Google Business Profile link added",
  "Nearby areas listed",
  "Local proof included",
  "NAP details consistent",
  "Location page is unique",
];

export const MONTHLY_WEBSITE_REPORT = {
  sections: [
    "Measured website results",
    "What changed this month",
    "What we noticed",
    "Recommended next improvement",
    "Customer action",
  ],
  title: "Monthly Website Growth Report",
};

export const TRUST_PROOF_VAULT = {
  assetTypes: [
    "Reviews",
    "Case studies",
    "Before/after images",
    "Certifications",
    "Team photos",
    "Client logos",
    "Guarantees",
    "Awards",
  ],
  placements: ["Hero trust strip", "Service proof block", "FAQ reassurance", "Final CTA support"],
};

export const AI_RECEPTIONIST_TRIAGE = {
  questions: [
    "Which service do you need?",
    "Where are you located?",
    "How urgent is this?",
    "What budget range are you considering?",
    "What is the best contact method?",
  ],
  outputs: ["Lead summary", "Urgency tag", "Service interest", "Recommended follow-up", "CRM note"],
};

export const BEFORE_AFTER_RESCUE_TOOL = {
  beforeIssues: [
    "Unclear first-screen offer",
    "Weak CTA visibility",
    "Missing trust proof",
    "Slow or heavy visual structure",
    "No local SEO path",
  ],
  afterStructure: [
    "Clear hero promise",
    "Service-specific sections",
    "Trust proof above CTA",
    "WhatsApp/contact path",
    "Local SEO-ready page structure",
  ],
};
