// IDs remain stable for historical records; public names and pricing use the current catalogue.
export type ReviewPoweredPlanId = "free_preview" | "starter" | "business" | "growth" | "wordpress_custom";

export interface ReviewPoweredPlan {
  id: ReviewPoweredPlanId;
  publicName: string;
  internalName: string;
  price: string;
  hostingType: "preview" | "managed";
  pageLimit: number;
  regenerationLimit: number;
  monthlyEditLimit: number;
  locationPageLimit: number;
  canPublish: boolean;
  features: string[];
  bestFor: string;
  cta: string;
}

export const REVIEW_POWERED_PLANS: ReviewPoweredPlan[] = [
  {
    id: "free_preview",
    publicName: "Free Preview",
    internalName: "Review Scan Preview",
    price: "$0",
    hostingType: "preview",
    pageLimit: 1,
    regenerationLimit: 1,
    monthlyEditLimit: 0,
    locationPageLimit: 0,
    canPublish: false,
    bestFor: "Businesses that want to see what their Google reviews can become before launching.",
    cta: "Generate Limited Preview",
    features: [
      "1 business scan",
      "Limited review analysis",
      "Homepage preview only",
      "Branded preview link",
      "No publishing",
    ],
  },
  {
    id: "starter",
    publicName: "Managed Website",
    internalName: "Managed Website",
    price: "US$99/month",
    hostingType: "managed",
    pageLimit: 1,
    regenerationLimit: 5,
    monthlyEditLimit: 1,
    locationPageLimit: 0,
    canPublish: true,
    bestFor: "Businesses that need a focused, enquiry-generating website with managed hosting and support.",
    cta: "Choose Managed Website",
    features: [
      "Managed-hosted 1-page website",
      "Basic review-powered copy",
      "WhatsApp CTA and contact form",
      "SEO title and meta description",
      "Custom domain support",
      "Limited monthly edits",
    ],
  },
  {
    id: "business",
    publicName: "Website Growth",
    internalName: "Website Growth",
    price: "US$249/month",
    hostingType: "managed",
    pageLimit: 3,
    regenerationLimit: 20,
    monthlyEditLimit: 1,
    locationPageLimit: 1,
    canPublish: true,
    bestFor: "Businesses that need ongoing conversion optimisation, local SEO expansion, and landing-page development.",
    cta: "Choose Website Growth",
    features: [
      "Up to 3 managed-hosted pages",
      "Review-powered homepage and service copy",
      "Local SEO structure",
      "FAQ and lead capture form",
      "1 consolidated update request each month",
      "Ongoing growth improvements",
    ],
  },
  {
    id: "growth",
    publicName: "Growth Partner",
    internalName: "Growth Partner",
    price: "US$799/month",
    hostingType: "managed",
    pageLimit: 5,
    regenerationLimit: 50,
    monthlyEditLimit: 2,
    locationPageLimit: 3,
    canPublish: true,
    bestFor: "Companies wanting consultant-led positioning, conversion strategy, SEO direction, and funnel strategy.",
    cta: "Discuss Growth Partner",
    features: [
      "Up to 5 managed-hosted pages",
      "Review refresh engine",
      "Landing page support",
      "Local SEO recommendations",
      "Conversion recommendations",
      "Consultant-led growth direction",
    ],
  },
  {
    id: "wordpress_custom",
    publicName: "Custom Website",
    internalName: "Custom Website Quote",
    price: "Custom quote",
    hostingType: "managed",
    pageLimit: 999,
    regenerationLimit: 0,
    monthlyEditLimit: 0,
    locationPageLimit: 999,
    canPublish: false,
    bestFor: "Clients who need full CMS control, blog publishing, advanced SEO, many pages, integrations, or ownership transfer.",
    cta: "Request Website Quote",
    features: [
      "Full CMS control",
      "Blog and content publishing",
      "Advanced SEO page structure",
      "CMS editing setup",
      "Custom integrations",
      "Premium custom design",
    ],
  },
];

export const CUSTOM_WEBSITE_QUOTE_RANGES = [
  { label: "Custom Landing Page", minUsd: 1500, maxUsd: 3500 },
  { label: "5-Page Custom Website", minUsd: 2500, maxUsd: 5500 },
  { label: "Premium SEO Website", minUsd: 5000, maxUsd: 10000 },
  { label: "Website + Funnel + Automation", minUsd: 7000, maxUsd: 15000 },
];

export const HOSTING_COMPARISON = [
  ["Best for", "Speed and simplicity", "Full control and long-term content growth"],
  ["Pricing model", "Monthly subscription", "Custom project quote"],
  ["Hosting", "Managed secure hosting", "Project or client hosting"],
  ["Launch speed", "Fast launch", "Longer custom build"],
  ["Maintenance", "Included while subscribed", "Optional care plan"],
  ["Editing", "WAAS/admin workflow", "CMS or custom editor"],
  ["Blog support", "Not included", "Quoted separately"],
  ["SEO expansion", "Plan-based SEO expansion", "Advanced SEO expansion"],
  ["Custom integrations", "Limited integrations", "Advanced integrations"],
  ["Ownership/control", "Managed platform license", "Higher ownership and CMS control"],
];

const keywordGroups = {
  praise: ["friendly", "helpful", "professional", "patient", "clean", "quality", "excellent", "trusted"],
  speed: ["fast", "quick", "responsive", "same day", "on time", "punctual", "efficient"],
  value: ["price", "affordable", "reasonable", "worth", "value", "transparent"],
  team: ["staff", "team", "doctor", "dentist", "consultant", "owner", "technician"],
  location: ["near", "location", "parking", "convenient", "kl", "kuala lumpur", "singapore", "city"],
  risk: ["late", "expensive", "rude", "slow", "wait", "cancel", "problem", "poor"],
};

export interface ReviewIntelligenceInput {
  businessName?: string;
  industry?: string;
  city?: string;
  country?: string;
  mainServices?: string;
  targetCustomer?: string;
  preferredCta?: string;
  googleBusinessUrl?: string;
  reviews?: string;
}

export const assessManualReviewInput = (reviews?: string) => {
  const text = (reviews || "").trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const likelyReviewCount = Math.max(
    lines.length,
    (text.match(/(?:\b5\s*star\b|\b4\s*star\b|\breview\b|\bsaid\b|\bhighly recommend\b|⭐|★)/gi) || []).length,
  );
  const hasSpecifics = [
    keywordGroups.praise,
    keywordGroups.speed,
    keywordGroups.value,
    keywordGroups.team,
    keywordGroups.location,
  ].reduce((sum, group) => sum + group.filter((word) => text.toLowerCase().includes(word)).length, 0);
  const hasNegativeSignals = keywordGroups.risk.some((word) => text.toLowerCase().includes(word));
  const suggestions = [
    words < 120 ? "Paste more review text. Aim for at least 5-10 real reviews or 120+ words." : "",
    likelyReviewCount < 5 ? "Separate reviews on new lines so the system can detect more patterns." : "",
    hasSpecifics < 5 ? "Include reviews that mention service quality, staff, speed, price/value, location, or results." : "",
    !hasNegativeSignals ? "If there are recurring objections or complaints, paste a few so the website can address them honestly." : "",
  ].filter(Boolean);

  return {
    words,
    likelyReviewCount,
    hasSpecificSignals: hasSpecifics,
    suggestions,
  };
};

export const analyzeReviewSignals = (input: ReviewIntelligenceInput) => {
  const text = (input.reviews || "").toLowerCase();
  const countMatches = (words: string[]) => words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
  const praiseMatches = countMatches(keywordGroups.praise);
  const speedMatches = countMatches(keywordGroups.speed);
  const valueMatches = countMatches(keywordGroups.value);
  const teamMatches = countMatches(keywordGroups.team);
  const locationMatches = countMatches(keywordGroups.location);
  const riskMatches = countMatches(keywordGroups.risk);
  const businessName = input.businessName || "Your Business";
  const service = input.mainServices || input.industry || "your service";
  const location = [input.city, input.country].filter(Boolean).join(", ") || "your local area";
  const cta = input.preferredCta || "WhatsApp";
  const hasReviews = Boolean(input.reviews?.trim());

  const differentiators = [
    praiseMatches ? "Customers mention trust, service quality, and confidence." : "Use real customer proof to strengthen trust.",
    speedMatches ? "Speed and responsiveness appear as a buying reason." : "Add response-time proof if available.",
    valueMatches ? "Price/value clarity can reduce hesitation." : "Add transparent package or quote guidance if appropriate.",
    teamMatches ? "Team or expert mentions should be used in trust sections." : "Add real team credentials or founder story.",
    locationMatches ? "Location and convenience can support local SEO copy." : `Add nearby areas and service coverage around ${location}.`,
  ];

  return {
    hasReviews,
    googleBusinessUrl: input.googleBusinessUrl || "",
    topPraises: [
      praiseMatches ? "Provided review text mentions service quality — verify before publishing" : "Clear service explanation needed",
      teamMatches ? "Provided review text mentions the team — verify before publishing" : "Founder/team credibility opportunity",
      speedMatches ? "Provided review text mentions response speed — verify before publishing" : "Response speed proof opportunity",
    ],
    buyingReasons: [
      valueMatches ? "Customers compare value and pricing before enquiring" : "Visitors need clear reasons to choose the business",
      locationMatches ? "Convenience and local access matter" : "Local relevance should be made explicit",
      teamMatches ? "People trust specific staff or experts" : "Authority should be shown with real credentials",
    ],
    objections: [
      riskMatches ? "Negative review patterns should be addressed with clear process and expectations" : "Unclear pricing, timing, and process may block enquiries",
      "Visitors may hesitate if reviews are not connected to services",
      "Generic claims should be replaced with review-backed proof",
    ],
    differentiators,
    localKeywords: [
      `${service} in ${location}`,
      `${input.industry || service} near me`,
      `best ${service} ${input.city || ""}`.trim(),
      `${businessName} reviews`,
    ],
    faqs: [
      `How do I book ${service} with ${businessName}?`,
      `Do you serve customers in ${location}?`,
      `What makes ${businessName} different?`,
      `Can I contact ${businessName} by ${cta}?`,
    ],
    risks: riskMatches
      ? ["Review risk detected: add expectation-setting copy, process clarity, and service guarantees only if true."]
      : [hasReviews ? "No obvious negative pattern detected; manually review the supplied text before publishing." : "No reviews supplied. Add genuine, approved customer evidence before making proof claims."],
  };
};

export const buildReviewWebsiteStrategy = (input: ReviewIntelligenceInput) => {
  const intelligence = analyzeReviewSignals(input);
  const businessName = input.businessName || "Your Business";
  const service = input.mainServices || input.industry || "your service";
  const city = input.city || "your area";
  const target = input.targetCustomer || "local customers";
  const cta = input.preferredCta || "WhatsApp";
  const recommendedPlan: ReviewPoweredPlanId =
    intelligence.hasReviews && input.city && input.mainServices && input.targetCustomer ? "growth" :
    intelligence.hasReviews ? "business" : "starter";

  return {
    intelligence,
    recommendedPlan,
    positioningAngle: `Use real customer language to position ${businessName} as a trusted choice for ${target} looking for ${service} in ${city}.`,
    heroHeadline: `${service} in ${city}.`,
    subheadline: `Explore ${businessName} services, find answers to common questions, and contact the team by ${cta}.`,
    coreOffer: service,
    primaryCta: cta === "call" ? "Call Now" : cta === "booking" ? "Book Appointment" : cta === "form" ? "Request Quote" : "WhatsApp Us",
    secondaryCta: "View Services",
    trustSignals: intelligence.topPraises,
    recommendedPages:
      recommendedPlan === "starter"
        ? ["Home"]
        : recommendedPlan === "business"
          ? ["Home", "Services", "Contact"]
          : ["Home", "Services", "About", "Contact", "Landing Page"],
    sectionBlueprint: [
      "Hero",
      "Trust Bar",
      "Problem Section",
      "Services",
      "Why Choose Us",
      "Review Highlights",
      "Process",
      "FAQ",
      "Contact",
      "Final CTA",
    ],
  };
};
