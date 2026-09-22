export interface OwnSalesSeoFaq {
  question: string;
  answer: string;
}

export interface OwnSalesSeoPage {
  path: string;
  status: "published" | "draft";
  seoTitle: string;
  metaDescription: string;
  h1: string;
  eyebrow: string;
  heroCopy: string;
  offer: string;
  whoFor: string[];
  marketWhy: string;
  pricingNote: string;
  localInputs: string[];
  examples: Array<{
    industry: string;
    plan: string;
    pages: string;
    localSeo: string;
  }>;
  faqs: OwnSalesSeoFaq[];
  links: Array<{ label: string; href: string }>;
  primaryCta: string;
  whatsappCta: string;
  quality: OwnSalesSeoQualityScore;
}

export interface OwnSalesSeoQualityScore {
  score: number;
  breakdown: Record<
    | "uniqueContent"
    | "searchIntent"
    | "localRelevance"
    | "ctaClarity"
    | "pricingClarity"
    | "internalLinks"
    | "faqQuality"
    | "metadata"
    | "duplicateRisk",
    number
  >;
  suggestions: string[];
}

const scoreSeoPage = (page: Omit<OwnSalesSeoPage, "quality" | "status">): OwnSalesSeoQualityScore => {
  const breakdown = {
    uniqueContent: Math.min(15, page.localInputs.length * 4),
    searchIntent: page.h1.toLowerCase().includes("website") ? 12 : 8,
    localRelevance: page.localInputs.length >= 3 ? 12 : 6,
    ctaClarity: page.primaryCta && page.whatsappCta ? 10 : 5,
    pricingClarity: page.pricingNote.includes("$") || page.pricingNote.includes("£") || page.pricingNote.includes("RM") || page.pricingNote.includes("SGD") || page.pricingNote.includes("GBP") || page.pricingNote.includes("AUD") ? 10 : 6,
    internalLinks: Math.min(10, page.links.length * 3),
    faqQuality: Math.min(12, page.faqs.length * 3),
    metadata: page.seoTitle && page.metaDescription ? 10 : 4,
    duplicateRisk: page.localInputs.length >= 4 ? 9 : 6,
  };
  const score = Object.values(breakdown).reduce((sum, item) => sum + item, 0);
  const suggestions = [
    breakdown.uniqueContent < 12 ? "Add more market-specific buyer pain points or proof." : "",
    breakdown.localRelevance < 12 ? "Add at least three unique local inputs." : "",
    breakdown.faqQuality < 9 ? "Add more specific buyer FAQs." : "",
    breakdown.internalLinks < 9 ? "Add more internal links to pricing, demos, and start pages." : "",
  ].filter(Boolean);

  return { score, breakdown, suggestions };
};

// Public SEO records are also consumed by structured-data and preview tooling.
// Normalize historical labels at the source boundary so no caller can
// accidentally publish retired plan names or trial language.
const sanitizePublicCommercialCopy = <T,>(value: T): T => {
  if (typeof value === "string") {
    return value
      .replace(/14[- ]day(?: free)? trial/gi, "free website preview")
      .replace(/card[- ]required trial/gi, "free website preview")
      .replace(/free trial/gi, "free website preview")
      .replace(/RM199(?:\/month)?/g, "current MYR catalogue pricing")
      .replace(/\$49(?:\/month)?/g, "premium scope pricing")
      .replace(/\bStarter plan\b/gi, "Managed Website")
      .replace(/\bBusiness plan\b/gi, "Managed Website")
      .replace(/\bScale plan\b/gi, "Website Growth")
      .replace(/\bAuthority plan\b/gi, "Growth Partner") as T;
  }
  if (Array.isArray(value)) return value.map((item) => sanitizePublicCommercialCopy(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, sanitizePublicCommercialCopy(item)])) as T;
  }
  return value;
};

const publish = (page: Omit<OwnSalesSeoPage, "quality" | "status">): OwnSalesSeoPage => {
  const sanitizedPage = sanitizePublicCommercialCopy(page);
  const quality = scoreSeoPage(sanitizedPage);
  return {
    ...sanitizedPage,
    quality,
    status: quality.score >= 75 ? "published" : "draft",
  };
};

const standardLinks = [
  { label: "View monthly plans", href: "/#pricing" },
  { label: "See portfolio", href: "/portfolio" },
  { label: "Review managed plans", href: "/pricing" },
  { label: "Discuss your website scope", href: "/book-demo" },
];

const cityPath = (city: string) => city.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface CitySalesPageInput {
  country: "UK" | "Malaysia" | "Singapore";
  city: string;
  nearby: string[];
  currencyNote: string;
  pricing: string;
  buyerSignals: string[];
  industries: string[];
  wording: {
    enquiry: string;
    quote: string;
    local: string;
  };
}

const makeWebsiteDesignCityPage = (input: CitySalesPageInput) => publish({
  path:
    input.country === "Singapore"
      ? `/website-design/singapore/${cityPath(input.city)}`
      : `/website-design/${cityPath(input.city)}`,
  seoTitle: `Website Design ${input.city} | Managed Websites for ${input.country} Businesses`,
  metaDescription: `Website design for ${input.city} small businesses. Managed website plans with hosting, SSL, ${input.wording.enquiry} forms, ${input.wording.quote} CTAs, and local SEO-ready pages.`,
  h1: `Website Design ${input.city}`,
  eyebrow: `Managed website design for ${input.city} businesses`,
  heroCopy: `Launch a professional website for ${input.city} customers without a slow, expensive agency project. Bennie Studio prepares managed websites with clear service sections, ${input.wording.enquiry} forms, mobile-first CTAs, local SEO-ready structure, and support after launch.`,
  offer: `Your website is prepared from approved templates and adapted for your services, target customers, ${input.city} market expectations, and the action you want visitors to take, such as requesting a quote, booking a call, submitting an enquiry, or contacting you directly.`,
  whoFor: [
    `${input.city} small businesses that need a professional website and clearer ${input.wording.enquiry} flow`,
    `${input.industries.slice(0, 3).join(", ")} and other service businesses serving ${input.city}`,
    `Businesses that want predictable monthly website pricing instead of a large upfront agency cost`,
    `Teams that want a managed website but do not want to maintain WordPress plugins, hosting, and technical setup themselves`,
  ],
  marketWhy: `${input.city} is competitive for local services. Buyers compare trust, speed, proof, pricing clarity, and how easy it is to contact the business. A managed website plan helps your offer look credible and guides visitors towards a ${input.wording.quote}, call, booking, or enquiry.`,
  pricingNote: input.pricing,
  localInputs: [
    ...input.buyerSignals,
    `Nearby/service-area wording can include ${input.nearby.join(", ")}`,
    `${input.wording.quote} CTAs and ${input.wording.enquiry} forms are prioritised over decorative buttons`,
    `Local FAQ and service-area sections help avoid thin city pages`,
  ],
  examples: [
    { industry: input.industries[0] || "Local service", plan: "Website Growth", pages: "Home, Services, Areas Covered, FAQ, Contact", localSeo: `${input.city} service-area copy, local FAQs, and quote CTA` },
    { industry: input.industries[1] || "Professional service", plan: "Growth Partner", pages: "Home, About, Services, Proof, Contact", localSeo: `${input.city} trust sections, service keywords, and enquiry path` },
    { industry: input.industries[2] || "Clinic or consultant", plan: "Website Growth", pages: "Home, Services, About, FAQ, Booking", localSeo: `${input.city} buyer questions, appointment CTA, and local proof prompts` },
  ],
  faqs: [
    { question: `Do you build websites for ${input.city} businesses?`, answer: `Yes. The managed website plans can be prepared for ${input.city} businesses and tailored with service sections, contact paths, local copy, and relevant nearby area wording.` },
    { question: `Can the website target nearby areas around ${input.city}?`, answer: `Yes. Nearby areas such as ${input.nearby.slice(0, 4).join(", ")} can be included as service-area content. Dedicated location pages depend on the selected plan.` },
    { question: "Can I start with a monthly plan instead of a large upfront website project?", answer: `Yes. ${input.currencyNote} Managed plans are designed for businesses that want a professional website, hosting, SSL, lead capture, and support in one predictable monthly service.` },
    { question: "Will the page include working buttons and enquiry forms?", answer: `Yes. CTAs are configured for real actions such as ${input.wording.enquiry} forms, phone links, WhatsApp where suitable, booking links, or quote request sections.` },
    { question: "Can I expand the managed website later?", answer: "Yes. You can review additional pages, locations, integrations, or growth work with Bennie Studio as your needs develop." },
  ],
  links: [
    { label: "View managed plans", href: "/#pricing" },
    { label: "See portfolio", href: "/portfolio" },
    { label: "Generate preview", href: "/generate-preview" },
    { label: "Discuss website scope", href: "/book-demo" },
  ],
  primaryCta: `Generate My ${input.city} Website Preview`,
  whatsappCta: `Ask About Website Design ${input.city}`,
});

const makeSubscriptionMarketPage = (market: "UK" | "Malaysia" | "Singapore") => {
  const config = {
    UK: {
      path: "/website-subscription-service/uk",
      title: "managed website growth service UK",
      price: "Managed website plans include a setup fee, monthly service and a 90-day initial commitment; confirm the current GBP catalogue before checkout.",
      wording: "enquiries, quote requests, GDPR-friendly form consent, cookie banner support, and UK service-area content",
      cities: "London, Manchester, Birmingham, Leeds, Bristol, Glasgow, Liverpool, Sheffield, and Edinburgh",
      buyers: ["UK trades and local service businesses", "consultants and small firms", "clinics, agencies, coaches, and professional services"],
    },
    Malaysia: {
      path: "/website-subscription-service/malaysia",
      title: "managed website growth service Malaysia",
      price: "Malaysia pricing is shown from the premium Website Growth catalogue; Growth Partner is consultation-led.",
      wording: "WhatsApp enquiries, service-area copy, SME-friendly pricing, local proof prompts, and mobile-first CTAs",
      cities: "Kuala Lumpur, Petaling Jaya, Shah Alam, Subang Jaya, Johor Bahru, Penang, Kuching, and Kota Kinabalu",
      buyers: ["Malaysian SMEs", "contractors and clinics", "salons, consultants, local shops, and service providers"],
    },
    Singapore: {
      path: "/website-subscription-service/singapore",
      title: "managed website growth service Singapore",
      price: "Singapore pricing is shown from the central catalogue: Managed Website S$149/month plus setup, and Website Growth S$349/month.",
      wording: "premium service positioning, fast response CTAs, high-trust copy, appointment paths, and Singapore neighbourhood targeting",
      cities: "Singapore, Orchard, Tampines, Jurong, Woodlands, Toa Payoh, Bugis, Paya Lebar, and Ang Mo Kio",
      buyers: ["Singapore consultants", "clinics and wellness providers", "professional services, agencies, salons, and local service brands"],
    },
  }[market];

  return publish({
    path: config.path,
    seoTitle: `${config.title} | Managed Monthly Website Plans`,
    metaDescription: `${config.title} for small businesses. Managed monthly websites with hosting, SSL, lead capture, SEO-ready structure, and ongoing support.`,
    h1: config.title,
    eyebrow: `Managed monthly website plans for ${market}`,
    heroCopy: `A website subscription gives ${market} businesses a professional website, hosting, SSL, lead capture, and support in one managed monthly plan without starting from a blank page or maintaining technical setup alone.`,
    offer: `Bennie Studio prepares approved website structures, adapts the copy for your services and market, configures real CTAs, and supports ongoing improvements after launch.`,
    whoFor: config.buyers,
    marketWhy: `${market} businesses need websites that are easy to trust, easy to contact, and simple to maintain. The subscription model works well when you want predictable cost, faster launch, and room to add pages or locations as demand grows.`,
    pricingNote: config.price,
    localInputs: [
      config.wording,
      `Market coverage can include ${config.cities}`,
      "Managed setup avoids blank-page DIY website builder friction",
      "Expansion path available for additional pages, locations, and approved integrations",
    ],
    examples: [
      { industry: "Local service", plan: "Managed Website", pages: "Core website and enquiry CTA", localSeo: "Primary location and enquiry CTA" },
      { industry: "Professional service", plan: "Website Growth", pages: "Home, Services, About, Contact", localSeo: "Service-area content and local FAQs" },
      { industry: "Established brand", plan: "Growth Partner", pages: "Home, Services, Proof, FAQ, Contact", localSeo: "Location pages, internal links, and conversion sections" },
    ],
    faqs: [
      { question: `What is a managed website growth service in ${market}?`, answer: "It is a managed monthly website plan that combines website setup, hosting, SSL, lead capture, basic SEO structure, and ongoing support." },
      { question: "Why use a managed website plan?", answer: "The approved structures reduce project complexity while keeping hosting, updates, enquiry paths, and ongoing improvements in one managed service." },
      { question: "Can I add local SEO pages?", answer: "Yes. Location pages and service-area content depend on the selected plan and must pass quality checks to avoid thin duplicate pages." },
      { question: "Can I expand the website later?", answer: "Yes. You can add agreed pages, locations, landing pages, and growth work as your needs develop." },
    ],
    links: standardLinks,
    primaryCta: `Start My ${market} Website Subscription`,
    whatsappCta: `Ask About ${market} Website Plans`,
  });
};

const generatedOwnSalesSeoPages = [
  makeSubscriptionMarketPage("UK"),
  makeSubscriptionMarketPage("Malaysia"),
  makeSubscriptionMarketPage("Singapore"),
  ...[
    { country: "UK" as const, city: "London", nearby: ["Camden", "Islington", "Westminster", "Croydon", "Richmond"], currencyNote: "UK pricing is confirmed during your growth consultation.", pricing: "Website Growth uses the current GBP managed-service catalogue with setup and monthly billing; Growth Partner and custom work are consultation-led.", buyerSignals: ["London buyers expect strong credibility, fast response, and clear proof before enquiring", "Useful for consultants, clinics, trades, agencies, and premium local services"], industries: ["Consultants", "Clinics", "Trades businesses"], wording: { enquiry: "enquiry", quote: "quote", local: "local" } },
    { country: "UK" as const, city: "Manchester", nearby: ["Salford", "Stockport", "Bolton", "Oldham", "Trafford"], currencyNote: "UK pricing is confirmed during your growth consultation.", pricing: "Website Growth uses the current GBP managed-service catalogue with setup and monthly billing; Growth Partner and custom work are consultation-led.", buyerSignals: ["Manchester service businesses need clear quote paths and area coverage", "Useful for SMEs comparing agency quotes and pay monthly website options"], industries: ["Local services", "Consultants", "Small agencies"], wording: { enquiry: "enquiry", quote: "quote", local: "local" } },
    { country: "UK" as const, city: "Birmingham", nearby: ["Solihull", "Wolverhampton", "Dudley", "Walsall", "Coventry"], currencyNote: "UK pricing is confirmed during your growth consultation.", pricing: "Website Growth uses the current GBP managed-service catalogue with setup and monthly billing; Growth Partner and custom work are consultation-led.", buyerSignals: ["Birmingham businesses often need practical quote-focused pages", "Service-area sections help cover West Midlands demand"], industries: ["Trades businesses", "Clinics", "Professional services"], wording: { enquiry: "enquiry", quote: "quote", local: "local" } },
    { country: "UK" as const, city: "Leeds", nearby: ["Bradford", "Wakefield", "York", "Huddersfield", "Harrogate"], currencyNote: "UK pricing is confirmed during your growth consultation.", pricing: "Website Growth uses the current GBP managed-service catalogue with setup and monthly billing; Growth Partner and custom work are consultation-led.", buyerSignals: ["Leeds SMEs need professional service positioning and local trust", "Good fit for service-area pages across West Yorkshire"], industries: ["Professional services", "Local services", "Consultants"], wording: { enquiry: "enquiry", quote: "quote", local: "local" } },
    { country: "UK" as const, city: "Bristol", nearby: ["Bath", "Filton", "Keynsham", "Weston-super-Mare", "South Gloucestershire"], currencyNote: "UK pricing is confirmed during your growth consultation.", pricing: "Website Growth uses the current GBP managed-service catalogue with setup and monthly billing; Growth Partner and custom work are consultation-led.", buyerSignals: ["Bristol local businesses benefit from clear service pages and proof sections", "Strong fit for consultants, wellness, trades, and creative service firms"], industries: ["Consultants", "Wellness providers", "Trades businesses"], wording: { enquiry: "enquiry", quote: "quote", local: "local" } },
    { country: "UK" as const, city: "Glasgow", nearby: ["Paisley", "East Kilbride", "Clydebank", "Hamilton", "Motherwell"], currencyNote: "UK pricing is confirmed during your growth consultation.", pricing: "Website Growth uses the current GBP managed-service catalogue with setup and monthly billing; Growth Partner and custom work are consultation-led.", buyerSignals: ["Glasgow businesses need clear enquiry flow and service-area language", "Useful for companies wanting a professional site without a large upfront build"], industries: ["Local services", "Clinics", "Professional firms"], wording: { enquiry: "enquiry", quote: "quote", local: "local" } },
    { country: "Malaysia" as const, city: "Petaling Jaya", nearby: ["Damansara", "Subang Jaya", "Shah Alam", "Kelana Jaya", "Puchong"], currencyNote: "Malaysia pricing is shown in MYR when selected.", pricing: "Managed Website is the starting offer; Website Growth and Growth Partner are available when the business needs deeper ongoing support.", buyerSignals: ["PJ businesses often rely on WhatsApp enquiries and fast mobile contact", "Good fit for Klang Valley service-area coverage"], industries: ["Clinics", "Salons", "Consultants"], wording: { enquiry: "enquiry", quote: "quote", local: "local" } },
    { country: "Malaysia" as const, city: "Shah Alam", nearby: ["Klang", "Subang Jaya", "Petaling Jaya", "Setia Alam", "Puchong"], currencyNote: "Malaysia pricing is shown in MYR when selected.", pricing: "Managed Website is the starting offer; Website Growth and Growth Partner are available when the business needs deeper ongoing support.", buyerSignals: ["Shah Alam businesses need SME-friendly pricing and WhatsApp-first CTAs", "Useful for renovation companies, clinics, wellness providers, beauty salons, and home services"], industries: ["Renovation companies", "Clinics", "Home services"], wording: { enquiry: "enquiry", quote: "quote", local: "local" } },
    { country: "Malaysia" as const, city: "Subang Jaya", nearby: ["USJ", "Sunway", "Petaling Jaya", "Puchong", "Shah Alam"], currencyNote: "Malaysia pricing is shown in MYR when selected.", pricing: "Managed Website is the starting offer; Website Growth and Growth Partner are available for deeper ongoing support.", buyerSignals: ["Subang Jaya buyers often compare convenience, trust, and quick response", "Strong fit for education, clinics, lifestyle, and service brands"], industries: ["Tuition centres", "Clinics", "Lifestyle services"], wording: { enquiry: "enquiry", quote: "quote", local: "local" } },
    { country: "Malaysia" as const, city: "Johor Bahru", nearby: ["Iskandar Puteri", "Skudai", "Pasir Gudang", "Kulai", "Tebrau"], currencyNote: "Malaysia pricing is shown in MYR when selected.", pricing: "Managed Website is the starting offer; Website Growth and Growth Partner are available for deeper ongoing support.", buyerSignals: ["JB businesses may target both local and cross-border buyers", "Useful for service providers, clinics, property, and local shops"], industries: ["Property services", "Clinics", "Local shops"], wording: { enquiry: "enquiry", quote: "quote", local: "local" } },
    { country: "Malaysia" as const, city: "Penang", nearby: ["George Town", "Bayan Lepas", "Bukit Mertajam", "Butterworth", "Tanjung Bungah"], currencyNote: "Malaysia pricing is shown in MYR when selected.", pricing: "Managed Website is the starting offer; Website Growth and Growth Partner are available for deeper ongoing support.", buyerSignals: ["Penang businesses benefit from local proof, service-area content, and mobile-first enquiries", "Good fit for clinics, hospitality, SMEs, and service providers"], industries: ["Clinics", "Hospitality", "SMEs"], wording: { enquiry: "enquiry", quote: "quote", local: "local" } },
    { country: "Malaysia" as const, city: "Kuching", nearby: ["Samarahan", "Batu Kawa", "Padawan", "Matang", "Santubong"], currencyNote: "Malaysia pricing is shown in MYR when selected.", pricing: "Managed Website is the starting offer; Website Growth and Growth Partner are available for deeper ongoing support.", buyerSignals: ["Kuching businesses need clear local credibility and direct enquiry paths", "Useful for local service providers and growing SMEs in Sarawak"], industries: ["Local services", "Consultants", "Clinics"], wording: { enquiry: "enquiry", quote: "quote", local: "local" } },
    { country: "Singapore" as const, city: "Orchard", nearby: ["Somerset", "Dhoby Ghaut", "Tanglin", "Newton", "River Valley"], currencyNote: "Singapore pricing is shown in SGD when selected.", pricing: "Managed Website is the starting offer; Website Growth and Growth Partner are available for deeper ongoing support.", buyerSignals: ["Orchard buyers expect premium presentation and high-trust service copy", "Useful for wellness, aesthetic, consultant, and lifestyle brands"], industries: ["Aesthetic clinics", "Consultants", "Lifestyle brands"], wording: { enquiry: "enquiry", quote: "consultation", local: "local" } },
    { country: "Singapore" as const, city: "Tampines", nearby: ["Bedok", "Pasir Ris", "Simei", "Changi", "Paya Lebar"], currencyNote: "Singapore pricing is shown in SGD when selected.", pricing: "Managed Website is the starting offer; Website Growth and Growth Partner are available for deeper ongoing support.", buyerSignals: ["Tampines businesses need clear services, appointment paths, and fast response CTAs", "Good fit for neighbourhood service providers and clinics"], industries: ["Clinics", "Local services", "Tuition centres"], wording: { enquiry: "enquiry", quote: "consultation", local: "local" } },
    { country: "Singapore" as const, city: "Jurong", nearby: ["Jurong East", "Jurong West", "Clementi", "Bukit Batok", "Boon Lay"], currencyNote: "Singapore pricing is shown in SGD when selected.", pricing: "Managed Website is the starting offer; Website Growth and Growth Partner are available for deeper ongoing support.", buyerSignals: ["Jurong businesses benefit from area-specific positioning and practical service pages", "Useful for education, local services, clinics, and B2B firms"], industries: ["Education providers", "Local services", "B2B services"], wording: { enquiry: "enquiry", quote: "consultation", local: "local" } },
    { country: "Singapore" as const, city: "Woodlands", nearby: ["Marsiling", "Admiralty", "Sembawang", "Yishun", "Kranji"], currencyNote: "Singapore pricing is shown in SGD when selected.", pricing: "Managed Website is the starting offer; Website Growth and Growth Partner are available for deeper ongoing support.", buyerSignals: ["Woodlands service providers need mobile-first contact and neighbourhood trust", "Useful for local businesses wanting clear enquiries and appointment flow"], industries: ["Local services", "Clinics", "Home services"], wording: { enquiry: "enquiry", quote: "consultation", local: "local" } },
    { country: "Singapore" as const, city: "Toa Payoh", nearby: ["Novena", "Balestier", "Bishan", "Serangoon", "Kallang"], currencyNote: "Singapore pricing is shown in SGD when selected.", pricing: "Managed Website is the starting offer; Website Growth and Growth Partner are available for deeper ongoing support.", buyerSignals: ["Toa Payoh businesses can benefit from local trust copy and fast booking paths", "Good fit for clinics, wellness, tuition, and professional services"], industries: ["Clinics", "Wellness providers", "Tuition centres"], wording: { enquiry: "enquiry", quote: "consultation", local: "local" } },
  ].map(makeWebsiteDesignCityPage),
];

export const OWN_SALES_SEO_PAGES: OwnSalesSeoPage[] = [
  publish({
    path: "/pay-monthly-websites",
    seoTitle: "Premium Website Growth for Service Businesses | Bennie Studio",
    metaDescription: "Start a managed lead-generation website with hosting, enquiry paths, WhatsApp CTAs, local search structure and ongoing support.",
    h1: "Premium Website Growth for Service Businesses",
    eyebrow: "Managed lead-generation websites",
    heroCopy: "Get a professional website with a clear premium scope and onboarding. Choose a monthly plan, submit your business details, review your pages, and launch with hosting, SSL, lead capture, and support included.",
    offer: "Bennie Studio prepares your website from approved templates, sets up the key sections, and gives you simple editing tools for ongoing updates.",
    whoFor: ["Small businesses that need a clean website fast", "Service providers that want enquiries", "Consultants, clinics, salons, contractors, coaches, and local companies"],
    marketWhy: "Pay monthly websites work well when you want a professional launch, predictable cost, and ongoing support instead of managing a one-off web project alone.",
    pricingNote: "Managed Website and Website Growth pricing is shown from the central market catalogue. Start with a free preview.",
    localInputs: ["No large upfront website cost", "Monthly support included", "Suitable for service businesses in multiple markets", "Local SEO options available as you grow"],
    examples: [
      { industry: "Consultant", plan: "Managed Website", pages: "Home, About, Services, Contact", localSeo: "Primary city and service-area copy" },
      { industry: "Clinic", plan: "Website Growth", pages: "Home, Treatments, FAQ, Booking, Contact", localSeo: "Treatment and location FAQs" },
      { industry: "Contractor", plan: "Managed Website", pages: "Home, Services, Projects, Quote", localSeo: "Areas served and quote CTA" },
    ],
    faqs: [
      { question: "What is a managed website growth system?", answer: "It is a managed website plan where setup, hosting, SSL, templates, lead capture, and support are bundled into a monthly fee." },
      { question: "How is the website built?", answer: "The monthly plans use approved templates and managed structures for speed, reliability, and a clear ongoing support model." },
      { question: "Can I edit the website myself?", answer: "Yes. You can update key sections, services, FAQs, contact details, and SEO fields from your dashboard." },
      { question: "Can I add more pages later?", answer: "Yes. You can upgrade your plan when you need more pages, locations, landing pages, or advanced features." },
    ],
    links: standardLinks,
    primaryCta: "Generate Free Website Preview",
    whatsappCta: "Ask About Website Growth",
  }),
  publish({
    path: "/pay-monthly-websites/malaysia",
    seoTitle: "Premium Website Growth Malaysia | Managed Website Plans",
    metaDescription: "Managed websites for Malaysian small businesses with hosting, WhatsApp enquiry paths, local search structure and ongoing support.",
    h1: "Premium Website Growth Malaysia",
    eyebrow: "Website subscription plans for Malaysian businesses",
    heroCopy: "For Malaysian SMEs, clinics, contractors, consultants, salons, and service businesses that need a professional website without paying a large upfront build fee.",
    offer: "Your website can include clear service sections, WhatsApp enquiry buttons, local SEO fields, and city targeting options for Kuala Lumpur, Selangor, Johor, Penang, and other service areas.",
    whoFor: ["Malaysian SMEs that rely on WhatsApp enquiries", "Local service businesses targeting cities or states", "Businesses that want predictable monthly website costs"],
    marketWhy: "Malaysia buyers often compare trust, speed, WhatsApp response, and affordability. A managed monthly website helps you look professional while keeping launch cost predictable.",
    pricingNote: "Managed Website, Website Growth and Growth Partner include setup, monthly management and a 90-day initial commitment. Current MYR pricing is shown in the central catalogue.",
    localInputs: ["WhatsApp CTA should be prominent", "Kuala Lumpur and Selangor service-area targeting", "SME-friendly pricing expectations", "Local proof can include project areas, Google reviews, and screenshots"],
    examples: [
      { industry: "Renovation contractor", plan: "Managed Website", pages: "Home, Services, Projects, Quote", localSeo: "KL and Selangor service areas" },
      { industry: "Aesthetic clinic", plan: "Website Growth", pages: "Home, Treatments, About, FAQ, Booking", localSeo: "Treatment FAQs and city targeting" },
      { industry: "Consultant", plan: "Managed Website", pages: "Home, Services, About, Contact", localSeo: "Malaysia buyer pain points and WhatsApp CTA" },
    ],
    faqs: [
      { question: "Can Malaysian businesses use WhatsApp on the website?", answer: "Yes. WhatsApp CTA buttons can be added so visitors can enquire quickly from mobile." },
      { question: "Can I target Kuala Lumpur and Selangor?", answer: "Yes. Managed Website and Website Growth can support location content, with scope confirmed during onboarding." },
      { question: "Is this suitable for SMEs?", answer: "Yes. The monthly plans are designed for small businesses that want a professional website and support without agency-level upfront cost." },
      { question: "Can pricing be shown in RM?", answer: "Yes. Malaysia plan pricing is displayed and billed in Malaysian Ringgit." },
    ],
    links: standardLinks,
    primaryCta: "Build My Malaysia Website",
    whatsappCta: "WhatsApp About Malaysia Website Plans",
  }),
  publish({
    path: "/pay-monthly-websites/singapore",
    seoTitle: "Premium Website Growth Singapore | Premium Website Subscription",
    metaDescription: " Premium managed website growth for Singapore service businesses, consultants, clinics, and service brands that need credibility, speed, and lead capture.",
    h1: "Premium Website Growth Singapore",
    eyebrow: "Premium managed website growth service for Singapore businesses",
    heroCopy: "Launch a polished business website for the Singapore market with clear positioning, trust sections, service pages, contact forms, and WhatsApp enquiry paths.",
    offer: "We use structured templates and guided setup so your website can go live faster while still looking credible for a high-trust market.",
    whoFor: ["Singapore consultants and professional services", "Clinics, wellness brands, salons, and local service companies", "Businesses that want a premium website without a slow agency process"],
    marketWhy: "Singapore buyers expect clarity, speed, credibility, and professional presentation. A managed website plan helps your offer look established from day one.",
    pricingNote: "Singapore pricing is shown in SGD from the central catalogue. Start with a free website preview.",
    localInputs: ["High-trust buyer expectations", "Premium service positioning", "Singapore as both country and city market", "Fast launch and mobile-first enquiries"],
    examples: [
      { industry: "Consultant", plan: "Managed Website", pages: "Home, Services, Case Studies, Contact", localSeo: "Consultant-specific Singapore copy" },
      { industry: "Clinic", plan: "Website Growth", pages: "Home, Treatments, Practitioners, FAQ, Booking", localSeo: "Patient FAQ and service location content" },
      { industry: "Salon", plan: "Managed Website", pages: "Home, Services, Gallery, Booking", localSeo: "Neighbourhood and appointment CTA" },
    ],
    faqs: [
      { question: "Is this suitable for Singapore consultants?", answer: "Yes. The structure can highlight expertise, services, proof, and consultation CTAs for Singapore buyers." },
      { question: "Can I add location or service-area content?", answer: "Yes. Website Growth supports local SEO expansion and dedicated location content; scope is confirmed during onboarding." },
      { question: "Can the website look premium?", answer: "Yes. Templates are selected for the business type and can be styled for professional, premium, or friendly positioning." },
      { question: "Can I use WhatsApp for enquiries?", answer: "Yes. WhatsApp CTAs can be included alongside forms and booking links." },
    ],
    links: standardLinks,
    primaryCta: "Start My Singapore Website",
    whatsappCta: "Ask About Singapore Website Plans",
  }),
  publish({
    path: "/pay-monthly-websites/uk",
    seoTitle: "Premium Website Growth UK | Bennie Studio",
    metaDescription: "Premium managed website plans for UK service businesses with hosting, SSL, enquiry forms, SEO setup, local pages and continuous support.",
    h1: "Premium Website Growth UK",
    eyebrow: "Premium UK website growth engagements",
    heroCopy: "Launch a professional small business website with a clear premium scope and onboarding. Bennie Studio helps UK service businesses get online with clear pages, enquiry-focused CTAs, managed hosting, SSL, basic SEO setup, and monthly support.",
    offer: "Choose a managed website subscription, submit your business details, preview your site, request refinements, and launch with a website structured for UK enquiries, quotes, service areas, and local credibility.",
    whoFor: [
      "UK trades, clinics, consultants, agencies, coaches, and local service firms that need enquiries",
      "Small businesses that want predictable monthly website costs instead of a large upfront agency project",
      "Companies that need a professional website, contact forms, quote CTAs, and location-ready SEO structure",
      "Businesses that want a managed, polished website without taking on technical maintenance",
    ],
    marketWhy: "UK small businesses often compare high agency quotes, DIY website builders, legacy website maintenance, and premium managed website growth. This page is built around the UK buyer journey: clear pricing, quote-ready wording, enquiry forms, local service-area visibility, and a managed setup that feels lower-risk than a traditional project.",
    pricingNote: "UK Website Growth and Growth Partner pricing are scoped around your commercial goals; premium custom work is quoted separately.",
    localInputs: [
      "UK spelling and buyer language: enquiries, optimised, quote, local businesses, service areas",
      "City expansion potential for London, Manchester, Birmingham, Leeds, Bristol, Glasgow, Liverpool, Sheffield, and Edinburgh",
      "Small business budget sensitivity: monthly website cost is easier to approve than a large upfront build",
      "Quote-focused CTAs for trades, consultants, clinics, agencies, coaches, and professional services",
      "Service-area pages and local FAQs for businesses serving towns, boroughs, counties, or nearby areas",
      "GDPR-friendly form consent, cookie banner support, privacy/cookie policy structure, and secure lead capture",
    ],
    examples: [
      { industry: "Trades business", plan: "Website Growth", pages: "Home, Services, Areas Covered, FAQ, Contact", localSeo: "Quote CTAs, town/service-area copy, local FAQs, and phone enquiry path" },
      { industry: "Consultant", plan: "Growth Partner", pages: "Home, About, Services, Case Studies, Book a Call", localSeo: "UK enquiry wording, proof sections, service pages, and consultation CTAs" },
      { industry: "Clinic or wellness provider", plan: "Website Growth", pages: "Home, Treatments, About, FAQ, Appointment", localSeo: "Treatment FAQs, appointment CTAs, trust sections, and local area content" },
      { industry: "Small agency", plan: "Growth Partner", pages: "Home, Services, Portfolio, Insights, Contact", localSeo: "Portfolio proof, service-location copy, internal links, and lead capture" },
    ],
    faqs: [
      { question: "How much does a premium managed website growth system cost in the UK?", answer: "Pricing is shown in GBP from the central catalogue and includes setup, recurring monthly management and the agreed 90-day initial commitment." },
      { question: "How is the website structured?", answer: "The monthly plans use managed, approved website structures so you can launch faster with less complexity and receive ongoing support." },
      { question: "Can UK businesses use enquiry forms and quote buttons?", answer: "Yes. Pages can include contact forms, quote request buttons, phone links, email links, booking links, and WhatsApp where suitable. The copy is written around UK-style enquiries and quote requests." },
      { question: "Can the website target UK towns, cities, or service areas?", answer: "Yes. Depending on the plan, your website can include service-area sections, local FAQs, and dedicated location pages for cities or towns such as London, Manchester, Birmingham, Leeds, Bristol, Glasgow, Liverpool, Sheffield, and Edinburgh." },
      { question: "Is hosting and SSL included?", answer: "Yes. Managed website plans include hosting and SSL while the subscription is active, so you do not need to manage hosting plugins, server updates, or technical maintenance yourself." },
      { question: "Can I request monthly changes?", answer: "Yes. Monthly update support depends on the selected plan. You can request content refinements, service updates, FAQ changes, CTA updates, and other supported website changes within your plan allowance." },
      { question: "Is the website GDPR and cookie-ready?", answer: "The platform includes practical compliance features such as cookie banner support, privacy/cookie policy page structure, secure form consent text, and optional marketing consent. These are not legal advice and should be reviewed for your business." },
      { question: "What if I need bookings or integrations?", answer: "Share the requirement during the website review so Bennie Studio can confirm whether it fits the managed scope or needs a separate implementation plan." },
    ],
    links: [
      { label: "View managed plans", href: "/#pricing" },
      { label: "See portfolio", href: "/portfolio" },
      { label: "Generate preview", href: "/generate-preview" },
      { label: "Discuss website scope", href: "/book-demo" },
    ],
    primaryCta: "Generate My UK Website Preview",
    whatsappCta: "Ask About UK Website Plans",
  }),
  publish({
    path: "/pay-monthly-websites/australia",
    seoTitle: "Website Growth Australia | managed website growth service",
    metaDescription: " Premium managed website growth for Australian service businesses with hosting, SSL, lead capture, local service-area content, and ongoing support.",
    h1: "Website Growth Australia",
    eyebrow: "Website subscription plans for Australian local businesses",
    heroCopy: "A managed website option for Australian small businesses that want a clean site, get-a-quote CTAs, local business credibility, and support after launch.",
    offer: "Start with a template-based website plan and expand into service pages, location pages, and content updates as your business grows.",
    whoFor: ["Australian local service businesses", "Coaches, consultants, clinics, and trades", "Businesses that want quote-ready pages and local visibility"],
    marketWhy: "Australian buyers often look for local providers, clear service areas, and quote-based next steps. Your website should make those decisions easy.",
    pricingNote: "International pricing is shown in USD from the central catalogue. Start with a free website preview.",
    localInputs: ["Use get a quote wording", "Sydney, Melbourne, Brisbane, Perth, and Adelaide expansion potential", "Service-area business support", "Local business and mobile-first expectations"],
    examples: [
      { industry: "Fitness coach", plan: "Managed Website", pages: "Home, Programs, Results, Contact", localSeo: "City and training-area copy" },
      { industry: "Local service", plan: "Website Growth", pages: "Home, Services, Areas, FAQ, Quote", localSeo: "Nearby suburbs and FAQs" },
      { industry: "Consultant", plan: "Managed Website", pages: "Home, Services, About, Contact", localSeo: "Australia buyer questions and trust sections" },
    ],
    faqs: [
      { question: "Can Australian businesses target suburbs or service areas?", answer: "Yes. Website Growth can add location content and location pages within the agreed scope." },
      { question: "Can I add a get a quote CTA?", answer: "Yes. Quote CTAs, contact forms, and WhatsApp buttons can be included." },
      { question: "Is hosting included?", answer: "Yes. Hosting and SSL are included while your subscription is active." },
      { question: "Can I upgrade later?", answer: "Yes. You can start with a smaller plan and upgrade when you need more pages or local SEO coverage." },
    ],
    links: standardLinks,
    primaryCta: "Start My Australia Website",
    whatsappCta: "Ask About Australia Website Plans",
  }),
  publish({
    path: "/website-design/kuala-lumpur",
    seoTitle: "Website Design Kuala Lumpur | Pay Monthly Business Websites",
    metaDescription: "Website design for Kuala Lumpur businesses that need a modern site, lead capture, WhatsApp CTA, SEO setup, and managed monthly support.",
    h1: "Website Design Kuala Lumpur",
    eyebrow: "Managed website design for KL businesses",
    heroCopy: "Build a professional business website for Kuala Lumpur customers without starting a slow, expensive web project from scratch.",
    offer: "We prepare your website from proven templates and adapt the content for your services, contact flow, and KL business audience.",
    whoFor: ["KL service businesses that need enquiries", "Consultants, clinics, salons, agencies, and contractors", "Businesses that want landing page design and monthly support"],
    marketWhy: "Kuala Lumpur is competitive. Buyers compare trust, speed, proof, and ease of contact. Your website should explain your offer quickly and guide visitors to enquire.",
    pricingNote: "Premium website growth engagements are scoped in MYR during consultation.",
    localInputs: ["KL service buyer competition", "WhatsApp-first enquiry behaviour", "Landing page design demand", "Nearby Selangor and Klang Valley coverage"],
    examples: [
      { industry: "Beauty clinic", plan: "Website Growth", pages: "Home, Treatments, FAQ, Booking, Contact", localSeo: "KL treatment page and FAQs" },
      { industry: "Renovation service", plan: "Managed Website", pages: "Home, Services, Projects, Quote", localSeo: "Klang Valley service areas" },
      { industry: "Consultant", plan: "Managed Website", pages: "Home, Services, About, Contact", localSeo: "KL business audience copy" },
    ],
    faqs: [
      { question: "Do you build websites for Kuala Lumpur businesses?", answer: "Yes. The website plans can be prepared for KL businesses and expanded with location content where appropriate." },
      { question: "Can I target Klang Valley areas?", answer: "Yes. Nearby areas can be added as service-area content or dedicated location pages based on your plan." },
      { question: "Can I use WhatsApp as the main CTA?", answer: "Yes. WhatsApp enquiry buttons can be made prominent for Malaysian visitors." },
      { question: "Can I request landing page design?", answer: "Yes. Website Growth includes ongoing landing-page development within the agreed scope." },
    ],
    links: standardLinks,
    primaryCta: "Build My KL Website",
    whatsappCta: "WhatsApp About KL Website Design",
  }),
  publish({
    path: "/website-design/singapore",
    seoTitle: "Website Design Singapore | Managed Website Service",
    metaDescription: "Website design for Singapore small businesses, consultants, clinics, and local service brands that need premium presentation and lead capture.",
    h1: "Website Design Singapore",
    eyebrow: "Premium managed website service in Singapore",
    heroCopy: "Launch a clean, credible website for the Singapore market with service pages, trust sections, contact forms, WhatsApp CTA, and managed support.",
    offer: "Instead of starting from a blank page, your website is prepared from approved templates and tailored to your business details and goals.",
    whoFor: ["Singapore small businesses that need credibility", "Professional services and consultants", "Local service brands that want booking or enquiry flows"],
    marketWhy: "Singapore visitors expect polish, clarity, and proof. Your website should quickly show what you do, who you help, and how to contact you.",
    pricingNote: "Managed Website and Website Growth pricing is shown from the central catalogue. Growth Partner scope is confirmed during consultation.",
    localInputs: ["Premium trust expectations", "High-value professional service buyers", "Singapore neighbourhood targeting", "Fast mobile enquiry path"],
    examples: [
      { industry: "Consultant", plan: "Managed Website", pages: "Home, Services, Results, Contact", localSeo: "Singapore service positioning" },
      { industry: "Clinic", plan: "Website Growth", pages: "Home, Treatments, Practitioners, FAQ, Booking", localSeo: "Treatment FAQs and trust copy" },
      { industry: "Local service", plan: "Managed Website", pages: "Home, Services, Areas, Contact", localSeo: "Singapore service-area content" },
    ],
    faqs: [
      { question: "Is this suitable for Singapore small businesses?", answer: "Yes. The plans are built for businesses that need a professional website, clear positioning, and simple lead capture." },
      { question: "Can I show prices in SGD?", answer: "Localized price display can be supported when enabled in the platform." },
      { question: "Can I add booking or WhatsApp?", answer: "Yes. Booking, forms, and WhatsApp CTAs can be supported depending on your plan and scope." },
      { question: "Can I expand the managed service?", answer: "Yes. Review additional pages, booking flows, and approved integrations with Bennie Studio as your needs develop." },
    ],
    links: standardLinks,
    primaryCta: "Start My Singapore Website",
    whatsappCta: "Ask About Website Design Singapore",
  }),
  publish({
    path: "/website-design/consultants/singapore",
    seoTitle: "Website Design for Consultants Singapore | Lead-Generation Websites",
    metaDescription: "Consultant website design in Singapore with service positioning, proof sections, booking CTAs, local SEO setup, and managed monthly support.",
    h1: "Website Design for Consultants Singapore",
    eyebrow: "Lead-generation websites for Singapore consultants",
    heroCopy: "A consultant website should make your expertise clear, build trust before the first call, and guide qualified prospects to book or enquire.",
    offer: "We prepare consultant websites using proven sections for positioning, services, proof, FAQs, consultation CTAs, and Singapore-focused messaging.",
    whoFor: ["Business consultants", "Coaches and advisors", "B2B service providers", "Independent experts selling high-trust services"],
    marketWhy: "Singapore consultant buyers need clarity, credibility, and a reason to take the next step. A structured website helps turn interest into booked conversations.",
    pricingNote: "Managed Website is the starting point; Website Growth is recommended when you need ongoing SEO, landing pages or conversion improvements.",
    localInputs: ["Consultation-led buyer journey", "High-trust Singapore professional market", "Proof and results sections matter", "Book a call CTA over generic contact copy"],
    examples: [
      { industry: "B2B consultant", plan: "Managed Website", pages: "Home, Services, About, Book a Call", localSeo: "Singapore consultant keywords" },
      { industry: "Coach", plan: "Website Growth", pages: "Home, Programs, Results, FAQ, Contact", localSeo: "Program and local FAQ content" },
      { industry: "Advisor", plan: "Website Growth", pages: "Home, About, Services, Insights, Contact", localSeo: "Expert positioning and internal linking" },
    ],
    faqs: [
      { question: "What should a consultant website include?", answer: "It should include a clear offer, services, proof, FAQs, and a direct book-a-call or enquiry CTA." },
      { question: "Can you write my consultant website copy?", answer: "The system can help prepare professional copy from your inputs. It will not invent fake results or testimonials." },
      { question: "Can I add case studies?", answer: "Yes. Website Growth is recommended if case studies, results pages, or multiple service pages are important." },
      { question: "Can the website target Singapore searches?", answer: "Yes. Local SEO fields, Singapore-specific copy, and relevant FAQs can be included." },
    ],
    links: standardLinks,
    primaryCta: "Build My Consultant Website",
    whatsappCta: "Ask About Consultant Websites",
  }),
  publish({
    path: "/website-design/small-business/malaysia",
    seoTitle: "Small Business Website Design Malaysia | Affordable Monthly Plans",
    metaDescription: "Small business website design in Malaysia with affordable monthly plans, hosting, SSL, WhatsApp CTA, SEO setup, and managed support.",
    h1: "Small Business Website Design Malaysia",
    eyebrow: "Affordable managed websites for Malaysian SMEs",
    heroCopy: "A practical website service for Malaysian small businesses that need a professional online presence, WhatsApp enquiries, and simple monthly support.",
    offer: "Start with a clear template-based site, then upgrade when you need more pages, service areas, or local SEO content.",
    whoFor: ["Malaysian SMEs starting their first proper website", "Local companies that rely on WhatsApp and referrals", "Service providers that need trust and enquiries"],
    marketWhy: "Many Malaysian businesses need a better website but do not want a large upfront bill. A monthly plan helps launch sooner and improve over time.",
    pricingNote: "Website Growth and Growth Partner are scoped in MYR around your growth goals.",
    localInputs: ["Affordable SME website demand", "WhatsApp-driven enquiries", "Malaysia city and state targeting", "Start small and upgrade later positioning"],
    examples: [
      { industry: "Salon", plan: "Managed Website", pages: "One-page website", localSeo: "Primary location and WhatsApp CTA" },
      { industry: "Contractor", plan: "Managed Website", pages: "Home, Services, Projects, Quote", localSeo: "State and city targeting" },
      { industry: "Clinic", plan: "Website Growth", pages: "Home, Treatments, FAQ, Booking, Contact", localSeo: "Treatment pages and FAQs" },
    ],
    faqs: [
      { question: "Is Managed Website enough for a Malaysian small business?", answer: "Managed Website is suitable for a focused enquiry-generating site. Website Growth is better when you need ongoing landing pages, local SEO expansion, and conversion work." },
      { question: "Can I add more Malaysian cities later?", answer: "Yes. Website Growth supports dedicated location pages within the agreed scope and quality controls." },
      { question: "Can I use my own domain?", answer: "Yes. Domain connection can be supported depending on your plan and setup." },
      { question: "Do you support WhatsApp enquiries?", answer: "Yes. WhatsApp CTA is a key part of the website setup for Malaysian businesses." },
    ],
    links: standardLinks,
    primaryCta: "Start My Malaysia Business Website",
    whatsappCta: "WhatsApp About SME Website Plans",
  }),
  publish({
    path: "/website-subscription-service",
    seoTitle: "managed website growth service for Small Businesses",
    metaDescription: "A managed managed website growth service with website setup, hosting, SSL, SEO fields, lead capture, updates, and monthly support.",
    h1: "managed website growth service",
    eyebrow: "Managed monthly website service",
    heroCopy: "A website subscription gives your business a professional site, hosting, SSL, lead capture, and support in one monthly plan.",
    offer: "Bennie Studio uses approved website templates, guided setup, and section-by-section editing so your website stays manageable after launch.",
    whoFor: ["Small businesses that want predictable website costs", "Service providers that need enquiries", "Teams that want support without hiring developers"],
    marketWhy: "A subscription model works best when your website needs ongoing updates, clear support, and room to grow without restarting from scratch.",
    pricingNote: "Managed Website and Website Growth pricing is shown from the central catalogue. Growth Partner scope is confirmed during consultation.",
    localInputs: ["Managed monthly support", "Hosting and SSL included", "Expansion path for more pages and cities", "Clear ongoing service scope"],
    examples: [
      { industry: "Local service", plan: "Managed Website", pages: "Focused website", localSeo: "Primary location fields" },
      { industry: "Professional service", plan: "Managed Website", pages: "Home, Services, Contact", localSeo: "Primary market positioning" },
      { industry: "Growing business", plan: "Website Growth", pages: "Home, Services, About, Landing Page, Contact", localSeo: "Ongoing location expansion" },
    ],
    faqs: [
      { question: "What is included in a managed website growth service?", answer: "The monthly plan includes website setup, hosting, SSL, lead capture, basic SEO fields, and support based on your plan." },
      { question: "Is there a minimum term?", answer: "Managed website subscriptions start with a 90-day initial commitment so setup and support can be delivered properly." },
      { question: "What happens if I need more functionality?", answer: "Share the requirement during a review so Bennie Studio can confirm the supported managed scope and next implementation step." },
      { question: "Can local SEO be added?", answer: "Yes. Website Growth includes ongoing location content and dedicated location pages within the agreed scope." },
    ],
    links: standardLinks,
    primaryCta: "Start My Website Subscription",
    whatsappCta: "Ask About Website Subscriptions",
  }),
  ...generatedOwnSalesSeoPages,
];

export const findOwnSalesSeoPage = (pathname: string) => {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return OWN_SALES_SEO_PAGES.find((page) => page.path === normalized);
};
