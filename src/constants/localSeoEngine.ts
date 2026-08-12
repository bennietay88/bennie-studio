import { PLANS, Plan, findPlan, normalizePlans } from "./plans";

export type LocalPageStatus = "draft" | "needs_improvement" | "ready_for_review" | "published";
export type LocalPageType =
  | "country"
  | "state"
  | "city"
  | "service_location"
  | "industry_location";

export interface LocalSeoLimits {
  standardPages: number;
  locationPages: number;
  monthlyUpdates: string;
  planName: string;
}

export interface LocationNode {
  country: string;
  regions: Array<{
    name: string;
    cities: string[];
  }>;
  ctaLanguage: string[];
  pricingCurrency: string;
  buyerExpectations: string[];
}

export interface LocalSeoInput {
  businessName: string;
  industry: string;
  mainService: string;
  secondaryServices?: string[];
  country: string;
  state?: string;
  city: string;
  district?: string;
  nearbyAreas?: string[];
  targetCustomer?: string;
  physicalLocation?: boolean;
  showAddress?: boolean;
  address?: string;
  phone?: string;
  email?: string;
  whatsappNumber?: string;
  websiteUrl?: string;
  openingHours?: string[];
  sameAs?: string[];
  latitude?: string;
  longitude?: string;
  localProof?: string[];
  testimonials?: string[];
  photos?: string[];
  priceRange?: string;
  ctaGoal?: string;
  businessType?: string;
}

export interface LocalKeywordSet {
  primary: string;
  secondary: string[];
  longTail: string[];
  nearMe: string[];
  commercial: string[];
  informational: string[];
}

export interface LocalContentReview {
  readyForReview: boolean;
  status: LocalPageStatus;
  duplicateRisk: "low" | "medium" | "high";
  checks: Record<
    | "uniqueLocalInputs"
    | "keywordRelevance"
    | "pageDepth"
    | "internalLinks"
    | "localProof"
    | "faqQuality"
    | "metadata"
    | "ctaClarity"
    | "duplicateProtection",
    boolean
  >;
  suggestions: string[];
}

export interface LocalSeoPageDraft {
  id: string;
  type: LocalPageType;
  status: LocalPageStatus;
  slug: string;
  seoTitle: string;
  metaDescription: string;
  h1: string;
  focusKeyword: string;
  supportingKeywords: string[];
  sections: Array<{
    type: string;
    heading: string;
    content: string;
  }>;
  faqs: Array<{ question: string; answer: string }>;
  internalLinks: Array<{ label: string; href: string }>;
  schema: Record<string, unknown>;
  quality: LocalContentReview;
}

export const DEFAULT_LOCAL_SEO_LIMITS: Record<string, LocalSeoLimits> = {
  starter: {
    planName: "Starter",
    standardPages: 1,
    locationPages: 0,
    monthlyUpdates: "Limited monthly update request",
  },
  business: {
    planName: "Business",
    standardPages: 5,
    locationPages: 5,
    monthlyUpdates: "Monthly content update support",
  },
  growth: {
    planName: "Growth",
    standardPages: 10,
    locationPages: 25,
    monthlyUpdates: "Priority monthly optimization recommendations",
  },
};

export const SUPPORTED_LOCATION_MARKETS: LocationNode[] = [
  {
    country: "Malaysia",
    pricingCurrency: "RM",
    ctaLanguage: ["WhatsApp us", "Request a quote", "Book a consultation"],
    buyerExpectations: ["WhatsApp-first enquiries", "Klang Valley service coverage", "SME-friendly pricing", "Google review proof"],
    regions: [
      { name: "Kuala Lumpur", cities: ["Kuala Lumpur", "Bangsar", "Cheras", "Mont Kiara", "Wangsa Maju"] },
      { name: "Selangor", cities: ["Shah Alam", "Petaling Jaya", "Subang Jaya", "Klang", "Puchong"] },
      { name: "Johor", cities: ["Johor Bahru", "Iskandar Puteri", "Batu Pahat"] },
      { name: "Penang", cities: ["George Town", "Bayan Lepas", "Bukit Mertajam"] },
      { name: "Sarawak", cities: ["Kuching", "Miri", "Sibu"] },
      { name: "Sabah", cities: ["Kota Kinabalu", "Sandakan", "Tawau"] },
      { name: "Perak", cities: ["Ipoh", "Taiping", "Kampar"] },
    ],
  },
  {
    country: "Singapore",
    pricingCurrency: "SGD",
    ctaLanguage: ["Book a consultation", "WhatsApp us", "Request a proposal"],
    buyerExpectations: ["Premium service positioning", "Fast response", "High trust copy", "Mobile-first enquiries"],
    regions: [
      { name: "Singapore", cities: ["Singapore", "Orchard", "Tampines", "Jurong", "Woodlands", "Toa Payoh", "Bugis", "Paya Lebar", "Ang Mo Kio"] },
    ],
  },
  {
    country: "United Kingdom",
    pricingCurrency: "GBP",
    ctaLanguage: ["Request a quote", "Send an enquiry", "Book a call"],
    buyerExpectations: ["Quote-led buying journey", "Town and city relevance", "Clear service coverage", "Small business budget clarity"],
    regions: [
      { name: "England", cities: ["London", "Manchester", "Birmingham", "Leeds", "Bristol"] },
      { name: "Scotland", cities: ["Glasgow", "Edinburgh"] },
    ],
  },
  {
    country: "Australia",
    pricingCurrency: "AUD",
    ctaLanguage: ["Get a quote", "Request a callback", "Book a call"],
    buyerExpectations: ["Service-area clarity", "Suburb coverage", "Quote-ready pages", "Local business proof"],
    regions: [
      { name: "New South Wales", cities: ["Sydney", "Newcastle", "Wollongong"] },
      { name: "Victoria", cities: ["Melbourne", "Geelong", "Ballarat"] },
      { name: "Queensland", cities: ["Brisbane", "Gold Coast", "Cairns"] },
      { name: "Western Australia", cities: ["Perth", "Fremantle"] },
      { name: "South Australia", cities: ["Adelaide"] },
    ],
  },
  {
    country: "United States",
    pricingCurrency: "USD",
    ctaLanguage: ["Get a quote", "Book a consultation", "Request a callback"],
    buyerExpectations: ["State and city search intent", "ZIP or service-area clarity", "Review proof", "Fast contact options"],
    regions: [
      { name: "California", cities: ["Los Angeles", "San Francisco", "San Diego"] },
      { name: "Texas", cities: ["Austin", "Dallas", "Houston"] },
      { name: "Florida", cities: ["Miami", "Orlando", "Tampa"] },
      { name: "New York", cities: ["New York", "Buffalo", "Rochester"] },
    ],
  },
  {
    country: "Canada",
    pricingCurrency: "CAD",
    ctaLanguage: ["Request a quote", "Book a call", "Send an enquiry"],
    buyerExpectations: ["City and province relevance", "Local service-area copy", "Trust proof", "Clear pricing guidance"],
    regions: [
      { name: "Ontario", cities: ["Toronto", "Ottawa", "Mississauga"] },
      { name: "British Columbia", cities: ["Vancouver", "Victoria"] },
    ],
  },
  {
    country: "New Zealand",
    pricingCurrency: "NZD",
    ctaLanguage: ["Get a quote", "Request a callback", "Book a call"],
    buyerExpectations: ["Local service-area clarity", "Practical quote path", "Small business trust", "Mobile contact"],
    regions: [
      { name: "Auckland", cities: ["Auckland", "North Shore", "Manukau"] },
      { name: "Wellington", cities: ["Wellington", "Lower Hutt"] },
    ],
  },
  {
    country: "UAE",
    pricingCurrency: "AED",
    ctaLanguage: ["Request a proposal", "Book a consultation", "WhatsApp us"],
    buyerExpectations: ["Premium positioning", "Fast response", "Multilingual market awareness", "Trust-led copy"],
    regions: [
      { name: "Dubai", cities: ["Dubai", "Jumeirah", "Business Bay"] },
      { name: "Abu Dhabi", cities: ["Abu Dhabi", "Al Ain"] },
    ],
  },
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenSimilarity = (left: string, right: string) => {
  const leftTokens = new Set(normalizeText(left).split(" ").filter((token) => token.length > 3));
  const rightTokens = new Set(normalizeText(right).split(" ").filter((token) => token.length > 3));
  if (!leftTokens.size || !rightTokens.size) return 0;
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / Math.max(leftTokens.size, rightTokens.size);
};

export const getLocalSeoLimits = (
  plan?: string,
  configuredMaxPages?: number,
  configuredPlan?: Partial<Plan>,
): LocalSeoLimits => {
  const normalizedPlan = (plan || "starter").toLowerCase();
  const defaultLimit = DEFAULT_LOCAL_SEO_LIMITS[normalizedPlan] || DEFAULT_LOCAL_SEO_LIMITS.starter;
  const staticPlan = PLANS.find((item) => item.id === normalizedPlan);
  const planConfig = configuredPlan || staticPlan;
  const standardPages = configuredMaxPages || planConfig?.maxPages || defaultLimit.standardPages;
  const locationPages =
    planConfig?.maxLocationPages ??
    (normalizedPlan === "growth" ? 25 : normalizedPlan === "business" ? 5 : 0);

  return {
    ...defaultLimit,
    planName: planConfig?.name || defaultLimit.planName,
    standardPages,
    locationPages,
    monthlyUpdates: planConfig?.monthlyUpdates || defaultLimit.monthlyUpdates,
  };
};

export const generateLocalKeywords = (input: Pick<LocalSeoInput, "mainService" | "industry" | "city" | "state" | "country" | "targetCustomer">): LocalKeywordSet => {
  const service = input.mainService || "service";
  const city = input.city || input.state || input.country || "your area";
  const industry = input.industry || "business";
  const audience = input.targetCustomer || "small businesses";

  return {
    primary: `${service} in ${city}`,
    secondary: [
      `${service} ${city}`,
      `${industry} ${service} ${city}`,
      `${service} company in ${city}`,
      `${service} provider in ${city}`,
    ],
    longTail: [
      `${service} for ${audience} in ${city}`,
      `affordable ${service} in ${city}`,
      `professional ${service} in ${city}`,
      `${service} specialist in ${city}`,
    ],
    nearMe: [`${service} near me`, `best ${service} near me`, `${industry} near me`],
    commercial: [
      `best ${service} in ${city}`,
      `${service} quote ${city}`,
      `${service} agency in ${city}`,
      `${service} consultation ${city}`,
    ],
    informational: [
      `how to choose ${service} in ${city}`,
      `how much does ${service} cost in ${city}`,
      `${city} ${service} checklist`,
    ],
  };
};

export const buildInternalLinks = (input: LocalSeoInput) => {
  const country = slugify(input.country || "locations");
  const state = slugify(input.state || input.city || "area");
  const city = slugify(input.city || "city");
  const service = slugify(input.mainService || "services");

  return [
    { label: "Main service page", href: `/services/${service}/` },
    { label: `${input.country} locations`, href: `/locations/${country}/` },
    { label: `${input.state || input.city} service area`, href: `/locations/${country}/${state}/` },
    { label: `${input.city} page`, href: `/locations/${country}/${state}/${city}/` },
    { label: "Contact", href: "/contact/" },
  ];
};

export const reviewLocalContent = (input: LocalSeoInput, existingPages: LocalSeoPageDraft[] = []): LocalContentReview => {
  const uniqueInputs = [
    input.localProof?.join(" "),
    input.testimonials?.join(" "),
    input.photos?.join(" "),
    input.nearbyAreas?.join(" "),
    input.address,
    input.priceRange,
    input.phone,
  ].filter(Boolean).length;

  const duplicateMatches = existingPages.filter((page) => {
    const sameCity = page.slug.includes(slugify(input.city || ""));
    const sameService = page.slug.includes(slugify(input.mainService || ""));
    return sameCity || sameService;
  }).length;
  const draftText = [
    input.businessName,
    input.industry,
    input.mainService,
    input.city,
    input.state,
    input.country,
    input.nearbyAreas?.join(" "),
    input.localProof?.join(" "),
    input.testimonials?.join(" "),
  ].filter(Boolean).join(" ");
  const similarityScores = existingPages.map((page) =>
    tokenSimilarity(
      draftText,
      [
        page.h1,
        page.seoTitle,
        page.metaDescription,
        page.sections.map((section) => `${section.heading} ${section.content}`).join(" "),
        page.faqs.map((faq) => `${faq.question} ${faq.answer}`).join(" "),
      ].join(" "),
    ),
  );
  const highestSimilarity = similarityScores.length ? Math.max(...similarityScores) : 0;
  const repeatedFaqRisk = existingPages.some((page) =>
    page.faqs.some((faq) => normalizeText(faq.question).includes(normalizeText(input.city || "")) && page.slug.includes(slugify(input.mainService || ""))),
  );
  const checks = {
    uniqueLocalInputs: uniqueInputs >= 3,
    keywordRelevance: Boolean(input.mainService && input.city),
    pageDepth: Boolean(input.secondaryServices?.length || input.nearbyAreas?.length),
    internalLinks: true,
    localProof: Boolean(input.localProof?.length || input.testimonials?.length),
    faqQuality: Boolean(input.city && input.mainService),
    metadata: Boolean(input.businessName && input.mainService && input.city),
    ctaClarity: Boolean(input.ctaGoal || input.whatsappNumber || input.phone),
    duplicateProtection: duplicateMatches <= 2 && highestSimilarity <= 0.48 && !repeatedFaqRisk,
  };
  const suggestions = [
    uniqueInputs < 3 ? "Add at least 3 unique local inputs such as nearby areas, proof, photos, reviews, address, pricing note, or local service notes." : "",
    !input.localProof?.length && !input.testimonials?.length ? "Add real local proof before publishing important city pages." : "",
    !input.nearbyAreas?.length ? "Add nearby areas served to strengthen local relevance." : "",
    duplicateMatches > 0 ? "Review similar location pages and rewrite repeated sections before publishing." : "",
    highestSimilarity > 0.48 ? "This draft is textually similar to another local page. Rewrite the hero, FAQs, proof, and metadata before publishing." : "",
    repeatedFaqRisk ? "FAQ pattern appears repeated across similar service pages. Add location-specific questions or real customer concerns." : "",
    !input.ctaGoal && !input.whatsappNumber && !input.phone ? "Add a clear CTA, phone, or WhatsApp contact method." : "",
  ].filter(Boolean);

  const duplicateRisk = duplicateMatches > 2 || highestSimilarity > 0.72 || repeatedFaqRisk ? "high" : duplicateMatches > 0 || highestSimilarity > 0.48 ? "medium" : "low";
  const readyForReview = suggestions.length === 0 && duplicateRisk !== "high";

  return {
    readyForReview,
    status: readyForReview ? "ready_for_review" : "needs_improvement",
    duplicateRisk,
    checks,
    suggestions,
  };
};

export const buildLocalBusinessSchema = (input: LocalSeoInput) => {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": input.businessType || "LocalBusiness",
    name: input.businessName,
    url: input.websiteUrl || undefined,
    areaServed: [input.city, input.state, input.country].filter(Boolean),
    telephone: input.phone || input.whatsappNumber || undefined,
    email: input.email || undefined,
    priceRange: input.priceRange || undefined,
    openingHours: input.openingHours?.filter(Boolean),
    sameAs: input.sameAs?.filter(Boolean),
    makesOffer: {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: input.mainService,
      },
    },
  };

  if (input.physicalLocation && input.showAddress && input.address) {
    schema.address = {
      "@type": "PostalAddress",
      streetAddress: input.address,
      addressLocality: input.city,
      addressRegion: input.state,
      addressCountry: input.country,
    };
  }

  if (input.latitude && input.longitude) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: input.latitude,
      longitude: input.longitude,
    };
  }

  return JSON.parse(JSON.stringify(schema));
};

export const buildLocalSeoPageDraft = (
  input: LocalSeoInput,
  type: LocalPageType = "service_location",
  existingPages: LocalSeoPageDraft[] = [],
): LocalSeoPageDraft => {
  const keywords = generateLocalKeywords(input);
  const nearby = input.nearbyAreas?.filter(Boolean) || [];
  const services = [input.mainService, ...(input.secondaryServices || [])].filter(Boolean);
  const cta = input.ctaGoal || (input.whatsappNumber ? "WhatsApp us" : "Request a quote");
  const slug =
    type === "industry_location"
      ? `/industries/${slugify(input.industry)}/${slugify(input.city)}/`
      : `/services/${slugify(input.mainService)}/${slugify(input.city)}/`;

  const draftBase = {
    id: `${Date.now()}-${slugify(input.city)}-${slugify(input.mainService)}`,
    type,
    status: "draft" as LocalPageStatus,
    slug,
    seoTitle: `${input.mainService} in ${input.city} | ${input.businessName}`.slice(0, 68),
    metaDescription: `${input.businessName} provides ${input.mainService} for ${input.targetCustomer || "customers"} in ${input.city}. ${cta} for clear pricing and support.`.slice(0, 155),
    h1: `${input.mainService} in ${input.city}`,
    focusKeyword: keywords.primary,
    supportingKeywords: [...keywords.secondary, ...keywords.longTail].slice(0, 8),
    sections: [
      {
        type: "hero",
        heading: `${input.mainService} in ${input.city}`,
        content: `${input.businessName} helps ${input.targetCustomer || "local customers"} in ${input.city} with ${input.mainService}. ${cta} to discuss your needs.`,
      },
      {
        type: "local_problem",
        heading: `The local challenge in ${input.city}`,
        content: `${input.city} customers need clear information, fast response, and a provider that can explain the service before they enquire.`,
      },
      {
        type: "solution",
        heading: `How ${input.businessName} helps`,
        content: `The service page is structured to explain ${input.mainService}, show relevant options, answer common questions, and make the next step easy.`,
      },
      {
        type: "services",
        heading: `Services available in ${input.city}`,
        content: services.join(", "),
      },
      {
        type: "nearby_areas",
        heading: "Nearby areas served",
        content: nearby.length ? nearby.join(", ") : "Add nearby cities, suburbs, districts, or regions before publishing.",
      },
      {
        type: "proof",
        heading: "Local proof",
        content: input.localProof?.length
          ? input.localProof.join(" ")
          : "Add real project examples, reviews, photos, or local testimonials before publishing high-value location pages.",
      },
      {
        type: "final_cta",
        heading: cta,
        content: `Contact ${input.businessName} for ${input.mainService} in ${input.city}.`,
      },
    ],
    faqs: [
      {
        question: `Do you provide ${input.mainService} in ${input.city}?`,
        answer: `Yes. ${input.businessName} can support ${input.mainService} enquiries for ${input.city} and relevant nearby areas.`,
      },
      {
        question: `How do I request ${input.mainService} pricing in ${input.city}?`,
        answer: `Use the contact form, call, or WhatsApp CTA to share your requirements so the team can respond with the right next step.`,
      },
      {
        question: `Which nearby areas do you serve?`,
        answer: nearby.length ? `Nearby areas include ${nearby.join(", ")}.` : "Nearby areas can be added after you confirm your actual service coverage.",
      },
      {
        question: "Can this page include local reviews?",
        answer: "Yes, but only real reviews or testimonials should be added. The system does not invent local proof.",
      },
      {
        question: "Can this page be published immediately?",
        answer: "It should pass the local content publishing checklist first to avoid thin or duplicated location pages.",
      },
    ],
    internalLinks: buildInternalLinks(input),
    schema: buildLocalBusinessSchema(input),
  };

  const quality = reviewLocalContent(input, existingPages);
  return {
    ...draftBase,
    quality,
    status: quality.status,
  };
};

export const createBulkLocationDrafts = (
  input: Omit<LocalSeoInput, "city">,
  cities: string[],
  existingPages: LocalSeoPageDraft[] = [],
) =>
  cities
    .map((city) => city.trim())
    .filter(Boolean)
    .map((city) => buildLocalSeoPageDraft({ ...input, city }, "service_location", existingPages));

export const parseLocalSeoCsv = (csv: string): Array<Partial<LocalSeoInput> & { city: string }> => {
  const rows = csv
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
  if (!rows.length) return [];

  const splitRow = (row: string) =>
    row
      .split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
      .map((cell) => cell.replace(/^"|"$/g, "").trim());

  const header = splitRow(rows[0]).map((cell) => cell.toLowerCase().replace(/\s+/g, "_"));
  const hasHeader = header.includes("city") || header.includes("country") || header.includes("main_service");
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const parsedRows: Array<Partial<LocalSeoInput> & { city?: string }> = dataRows
    .map((row) => {
      const cells = splitRow(row);
      if (!hasHeader) {
        return {
          city: cells[0] || "",
          state: cells[1],
          country: cells[2],
          localProof: cells[3] ? [cells[3]] : [],
        };
      }
      const record: Record<string, string> = {};
      header.forEach((key, index) => {
        record[key] = cells[index] || "";
      });
      return {
        city: record.city,
        state: record.state || record.region,
        country: record.country,
        mainService: record.main_service || record.service,
        nearbyAreas: record.nearby_areas ? record.nearby_areas.split("|").map((item) => item.trim()).filter(Boolean) : undefined,
        localProof: record.local_proof ? record.local_proof.split("|").map((item) => item.trim()).filter(Boolean) : undefined,
        testimonials: record.testimonials ? record.testimonials.split("|").map((item) => item.trim()).filter(Boolean) : undefined,
        photos: record.photos ? record.photos.split("|").map((item) => item.trim()).filter(Boolean) : undefined,
        priceRange: record.price_note || record.price_range,
      };
    });

  return parsedRows
    .filter((row) => Boolean(row.city))
    .map((row) => ({ ...row, city: row.city as string }));
};

export const getUpgradeRecommendation = (args: {
  currentPlan?: string;
  configuredPlans?: Array<Partial<Plan> & { id?: string }>;
  currentPlanConfig?: Partial<Plan>;
  requestedPages?: number;
  requestedLocationPages?: number;
  wantsEcommerce?: boolean;
  wantsBooking?: boolean;
  wantsCustomDesign?: boolean;
  wantsBulkImport?: boolean;
  wantsMultiCountry?: boolean;
}) => {
  const plan = (args.currentPlan || "starter").toLowerCase();
  const configuredPlans = normalizePlans(args.configuredPlans);
  const currentPlanConfig = args.currentPlanConfig || findPlan(configuredPlans, plan);
  const limits = getLocalSeoLimits(plan, currentPlanConfig.maxPages, currentPlanConfig);
  const orderedPlans = configuredPlans
    .filter((item) => item.id !== plan)
    .sort((a, b) => (a.maxPages + a.maxLocationPages) - (b.maxPages + b.maxLocationPages));
  const nextPlanFor = (minimumPages: number, minimumLocationPages: number) =>
    orderedPlans.find((item) => item.maxPages >= minimumPages && item.maxLocationPages >= minimumLocationPages);

  const exceedsCurrentLimits =
    (args.requestedPages || 0) > limits.standardPages ||
    (args.requestedLocationPages || 0) > limits.locationPages;

  if (
    args.wantsEcommerce ||
    args.wantsBooking ||
    args.wantsCustomDesign ||
    args.wantsBulkImport ||
    args.wantsMultiCountry ||
    (exceedsCurrentLimits && !nextPlanFor(args.requestedPages || 0, args.requestedLocationPages || 0))
  ) {
    return {
      recommendedPlan: "Custom Website",
      reason: currentPlanConfig.upgradePrompt || "Custom scope is recommended for ecommerce, booking, bespoke design, bulk import, multi-country SEO, or requirements above plan limits.",
    };
  }

  if (exceedsCurrentLimits) {
    const recommended = nextPlanFor(args.requestedPages || 0, args.requestedLocationPages || 0);
    return {
      recommendedPlan: recommended?.name || "Custom Website",
      reason: currentPlanConfig.upgradePrompt || `Upgrade to unlock more than ${limits.standardPages} website page(s) or ${limits.locationPages} location page(s).`,
    };
  }

  return {
    recommendedPlan: limits.planName,
    reason: "Your current plan fits this request.",
  };
};

export const generateLocalBlogIdeas = (input: Pick<LocalSeoInput, "mainService" | "city" | "country" | "industry">) => {
  const service = input.mainService || "website design";
  const city = input.city || input.country || "your area";
  const industry = input.industry || "local businesses";

  return [
    {
      title: `Best ${service} options for ${industry} in ${city}`,
      targetKeyword: `best ${service} in ${city}`,
      searchIntent: "Commercial comparison",
      outline: ["Common options", "What to compare", "Pricing expectations", "Questions to ask", "Next step CTA"],
      internalLinks: [`/services/${slugify(service)}/${slugify(city)}/`, "/contact/"],
      cta: "Request a quote",
    },
    {
      title: `How much does ${service} cost in ${city}?`,
      targetKeyword: `${service} cost ${city}`,
      searchIntent: "Pricing research",
      outline: ["Cost factors", "Typical scope", "What affects pricing", "How to prepare", "Quote CTA"],
      internalLinks: [`/services/${slugify(service)}/`, `/locations/${slugify(input.country || city)}/`],
      cta: "Ask for pricing",
    },
    {
      title: `${city} ${industry} checklist for getting more local enquiries`,
      targetKeyword: `${industry} local enquiries ${city}`,
      searchIntent: "Informational",
      outline: ["Clear offer", "Trust proof", "Location content", "Contact methods", "Follow-up process"],
      internalLinks: [`/services/${slugify(service)}/${slugify(city)}/`, "/contact/"],
      cta: "Improve this page",
    },
  ];
};
