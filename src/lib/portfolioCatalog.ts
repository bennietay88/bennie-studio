/** Curated portfolio briefs. Published designs have image assets and interactive previews. */
export type PortfolioItem = {
  slug: string;
  title: string;
  category: string;
  style: string;
  headline: string;
  goal: string;
  challenge: string;
  approach: string;
  industry: string;
  sections: string[];
  livePreviewSlug: string;
  published: boolean;
  featured: boolean;
  order: number;
  coverImage: string;
  desktopImage: string;
  mobileImage: string;
  imageAlt: string;
};

export const DEFAULT_PORTFOLIO_ITEMS: PortfolioItem[] = [
  {
    "slug": "dental-clinic",
    "title": "Dental clinic",
    "category": "Healthcare",
    "style": "Calm clinical",
    "headline": "A calmer path from treatment search to appointment",
    "goal": "Appointment enquiry",
    "challenge": "Patients need treatment clarity, practitioner information and easy booking.",
    "approach": "Clarify treatments, show the care team and make booking easy.",
    "industry": "clinic",
    "livePreviewSlug": "dental-clinic",
    "published": true,
    "featured": true,
    "order": 1,
    "coverImage": "",
    "desktopImage": "",
    "mobileImage": "",
    "imageAlt": "",
    "sections": [
      "Treatments",
      "Practitioners",
      "Patient FAQs",
      "Opening hours",
      "Appointment CTA"
    ]
  },
  {
    "slug": "renovation-contractor",
    "title": "Renovation contractor",
    "category": "Home services",
    "style": "Architectural bold",
    "headline": "From project interest to a better quote request",
    "goal": "Quotation request",
    "challenge": "Prospects need to understand scope and service areas before sharing project details.",
    "approach": "Use project imagery, a clear process and an organised quote request.",
    "industry": "contractor",
    "livePreviewSlug": "renovation-contractor",
    "published": true,
    "featured": true,
    "order": 2,
    "coverImage": "",
    "desktopImage": "",
    "mobileImage": "",
    "imageAlt": "",
    "sections": [
      "Services",
      "Project gallery",
      "Process",
      "Service areas",
      "Quote CTA"
    ]
  },
  {
    "slug": "professional-advisory",
    "title": "Professional advisory",
    "category": "Professional services",
    "style": "Editorial authority",
    "headline": "Positioning expertise for a confident first consultation",
    "goal": "Consultation request",
    "challenge": "Buyers need evidence of relevant professional expertise.",
    "approach": "Lead with credibility and a precise service offering.",
    "industry": "consultant",
    "livePreviewSlug": "professional-advisory",
    "published": true,
    "featured": false,
    "order": 3,
    "coverImage": "",
    "desktopImage": "",
    "mobileImage": "",
    "imageAlt": "",
    "sections": [
      "Expertise",
      "Services",
      "People",
      "Approach",
      "Consultation CTA"
    ]
  },
  {
    "slug": "tuition-centre",
    "title": "Tuition centre",
    "category": "Education",
    "style": "Bright academic",
    "headline": "Helping parents find the right programme",
    "goal": "Trial class enquiry",
    "challenge": "Parents compare classes, levels, teachers and schedules.",
    "approach": "Organise programmes by level and present a simple trial enquiry.",
    "industry": "education",
    "livePreviewSlug": "tuition-centre",
    "published": true,
    "featured": false,
    "order": 4,
    "coverImage": "",
    "desktopImage": "",
    "mobileImage": "",
    "imageAlt": "",
    "sections": [
      "Programmes",
      "Levels",
      "Teachers",
      "Parent FAQs",
      "Trial class CTA"
    ]
  },
  {
    "slug": "beauty-wellness",
    "title": "Beauty & wellness",
    "category": "Beauty & wellness",
    "style": "Soft luxury",
    "headline": "An inviting route from treatment discovery to booking",
    "goal": "Treatment booking",
    "challenge": "Visitors need to compare treatments and feel confident in quality.",
    "approach": "Use atmospheric photography, concise menus and booking paths.",
    "industry": "beauty",
    "livePreviewSlug": "beauty-wellness",
    "published": true,
    "featured": false,
    "order": 5,
    "coverImage": "",
    "desktopImage": "",
    "mobileImage": "",
    "imageAlt": "",
    "sections": [
      "Treatment menu",
      "Gallery",
      "Packages",
      "Visit details",
      "Booking CTA"
    ]
  },
  {
    "slug": "accounting-firm",
    "title": "Accounting firm",
    "category": "Finance",
    "style": "Structured corporate",
    "headline": "Making professional services easier to evaluate",
    "goal": "Consultation enquiry",
    "challenge": "Business owners seek capability, credentials and client fit.",
    "approach": "Explain accounting and tax support with a focused next step.",
    "industry": "consultant",
    "livePreviewSlug": "accounting-firm",
    "published": true,
    "featured": false,
    "order": 6,
    "coverImage": "",
    "desktopImage": "",
    "mobileImage": "",
    "imageAlt": "",
    "sections": [
      "Client fit",
      "Services",
      "Credentials",
      "FAQs",
      "Consultation CTA"
    ]
  },
  {
    "slug": "physiotherapy-clinic",
    "title": "Physiotherapy clinic",
    "category": "Healthcare",
    "style": "Active wellness",
    "headline": "Helping patients take the first step toward recovery",
    "goal": "Appointment enquiry",
    "challenge": "Patients want to understand treatment options and practitioners.",
    "approach": "Combine treatment pathways, confidence-building credentials and booking.",
    "industry": "clinic",
    "livePreviewSlug": "",
    "published": true,
    "featured": false,
    "order": 7,
    "coverImage": "",
    "desktopImage": "",
    "mobileImage": "",
    "imageAlt": "",
    "sections": [
      "Conditions",
      "Treatments",
      "Practitioners",
      "Patient FAQs",
      "Booking"
    ]
  },
  {
    "slug": "real-estate-agency",
    "title": "Boutique real estate",
    "category": "Property",
    "style": "Luxury editorial",
    "headline": "Turning property interest into a useful viewing enquiry",
    "goal": "Viewing enquiry",
    "challenge": "Buyers want to browse neighbourhoods and evaluate properties.",
    "approach": "Lead with curated listings and clear viewing requests.",
    "industry": "property",
    "livePreviewSlug": "",
    "published": true,
    "featured": false,
    "order": 8,
    "coverImage": "",
    "desktopImage": "",
    "mobileImage": "",
    "imageAlt": "",
    "sections": [
      "Listings",
      "Neighbourhoods",
      "Agent profiles",
      "Viewing CTA"
    ]
  },
  {
    "slug": "cleaning-service",
    "title": "Cleaning service",
    "category": "Home services",
    "style": "Clean vibrant",
    "headline": "An easy way to book dependable cleaning",
    "goal": "Quote request",
    "challenge": "Buyers want pricing context and evidence of reliability.",
    "approach": "Present packages, service coverage and fast quote requests.",
    "industry": "contractor",
    "livePreviewSlug": "",
    "published": true,
    "featured": false,
    "order": 9,
    "coverImage": "",
    "desktopImage": "",
    "mobileImage": "",
    "imageAlt": "",
    "sections": [
      "Packages",
      "Coverage",
      "Quality process",
      "Reviews",
      "Quote CTA"
    ]
  },
  {
    "slug": "hvac-specialist",
    "title": "HVAC specialist",
    "category": "Home services",
    "style": "Industrial precise",
    "headline": "From service urgency to a qualified repair booking",
    "goal": "Service booking",
    "challenge": "Customers need urgent help and clear coverage.",
    "approach": "Make emergency contact prominent alongside service categories.",
    "industry": "contractor",
    "livePreviewSlug": "",
    "published": true,
    "featured": false,
    "order": 10,
    "coverImage": "",
    "desktopImage": "",
    "mobileImage": "",
    "imageAlt": "",
    "sections": [
      "Service types",
      "Coverage",
      "Response process",
      "Booking CTA"
    ]
  },
  {
    "slug": "landscape-design",
    "title": "Landscape design studio",
    "category": "Home services",
    "style": "Natural premium",
    "headline": "Spaces that look as good as they feel",
    "goal": "Consultation request",
    "challenge": "Homeowners want to see project taste and process.",
    "approach": "Use project visuals and a simple design consultation path.",
    "industry": "contractor",
    "livePreviewSlug": "",
    "published": true,
    "featured": false,
    "order": 11,
    "coverImage": "",
    "desktopImage": "",
    "mobileImage": "",
    "imageAlt": "",
    "sections": [
      "Portfolio",
      "Design process",
      "Services",
      "Enquiry CTA"
    ]
  },
  {
    "slug": "business-consulting",
    "title": "Business consultancy",
    "category": "Professional services",
    "style": "Modern editorial",
    "headline": "Clarity for complex business decisions",
    "goal": "Discovery call",
    "challenge": "Executives need a credible and concise statement of expertise.",
    "approach": "Use a focused editorial hierarchy with a direct discovery call.",
    "industry": "consultant",
    "livePreviewSlug": "",
    "published": true,
    "featured": false,
    "order": 12,
    "coverImage": "",
    "desktopImage": "",
    "mobileImage": "",
    "imageAlt": "",
    "sections": [
      "Offer",
      "Expertise",
      "Method",
      "FAQs",
      "Book call"
    ]
  },
  {
    "slug": "interior-design",
    "title": "Interior design studio",
    "category": "Creative services",
    "style": "Gallery minimal",
    "headline": "Designed spaces, presented with purpose",
    "goal": "Project enquiry",
    "challenge": "Clients judge taste from visuals and completed work.",
    "approach": "Lead with an immersive project gallery and project brief.",
    "industry": "creative",
    "livePreviewSlug": "",
    "published": true,
    "featured": false,
    "order": 13,
    "coverImage": "",
    "desktopImage": "",
    "mobileImage": "",
    "imageAlt": "",
    "sections": [
      "Projects",
      "Studio",
      "Process",
      "Enquiry"
    ]
  },
  {
    "slug": "auto-detailing",
    "title": "Premium auto detailing",
    "category": "Automotive",
    "style": "Dark cinematic",
    "headline": "Exceptional finish. Simple booking.",
    "goal": "Booking enquiry",
    "challenge": "Car owners want to inspect finish quality and packages.",
    "approach": "Pair high-contrast photography with package clarity.",
    "industry": "automotive",
    "livePreviewSlug": "",
    "published": true,
    "featured": false,
    "order": 14,
    "coverImage": "",
    "desktopImage": "",
    "mobileImage": "",
    "imageAlt": "",
    "sections": [
      "Services",
      "Gallery",
      "Packages",
      "Booking CTA"
    ]
  },
  {
    "slug": "fitness-coaching",
    "title": "Personal training studio",
    "category": "Fitness",
    "style": "Bold energetic",
    "headline": "A stronger start to a healthier routine",
    "goal": "Trial session",
    "challenge": "Prospects need to understand coaching format and environment.",
    "approach": "Show programmes, coaches and easy trial scheduling.",
    "industry": "fitness",
    "livePreviewSlug": "",
    "published": true,
    "featured": false,
    "order": 15,
    "coverImage": "",
    "desktopImage": "",
    "mobileImage": "",
    "imageAlt": "",
    "sections": [
      "Programmes",
      "Coaches",
      "Studio",
      "Trial CTA"
    ]
  },
  {
    "slug": "photography-studio",
    "title": "Photography studio",
    "category": "Creative services",
    "style": "Visual storytelling",
    "headline": "Stories worth remembering, beautifully captured",
    "goal": "Booking enquiry",
    "challenge": "Clients choose based on portfolio style and packages.",
    "approach": "Use immersive gallery layouts and clear session offerings.",
    "industry": "creative",
    "livePreviewSlug": "",
    "published": true,
    "featured": false,
    "order": 16,
    "coverImage": "",
    "desktopImage": "",
    "mobileImage": "",
    "imageAlt": "",
    "sections": [
      "Gallery",
      "Packages",
      "About",
      "Availability"
    ]
  },
  {
    "slug": "pet-wellness",
    "title": "Pet wellness centre",
    "category": "Pet services",
    "style": "Warm approachable",
    "headline": "Care for the companions who matter",
    "goal": "Appointment booking",
    "challenge": "Pet owners need trust, care clarity and simple appointment steps.",
    "approach": "Use friendly imagery, service guidance and booking.",
    "industry": "pet",
    "livePreviewSlug": "",
    "published": true,
    "featured": false,
    "order": 17,
    "coverImage": "",
    "desktopImage": "",
    "mobileImage": "",
    "imageAlt": "",
    "sections": [
      "Care services",
      "Team",
      "FAQs",
      "Booking"
    ]
  },
  {
    "slug": "event-planning",
    "title": "Event planning studio",
    "category": "Events",
    "style": "Romantic editorial",
    "headline": "Thoughtfully planned moments, beautifully delivered",
    "goal": "Consultation enquiry",
    "challenge": "Couples and organisers need to feel confident in style and process.",
    "approach": "Use event galleries, packages and a consultation request.",
    "industry": "events",
    "livePreviewSlug": "",
    "published": true,
    "featured": false,
    "order": 18,
    "coverImage": "",
    "desktopImage": "",
    "mobileImage": "",
    "imageAlt": "",
    "sections": [
      "Events",
      "Planning services",
      "Gallery",
      "Consultation"
    ]
  }
];

export const isSafePortfolioMediaUrl = (value: string): boolean =>
  value === "" || (/^\/(?!\/)[^\s]*$/.test(value) && !value.includes("\\"))
  || /^https:\/\/[^\s]+$/i.test(value);

export function resolvePortfolioCatalog(saved: unknown): PortfolioItem[] {
  if (!Array.isArray(saved)) return DEFAULT_PORTFOLIO_ITEMS;
  // The API validates writes. Reject malformed stored records without exposing broken links.
  return saved.filter((item): item is PortfolioItem =>
    item && typeof item === "object" && typeof item.slug === "string"
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)
    && typeof item.title === "string"
    && typeof item.category === "string"
    && typeof item.published === "boolean"
    && typeof item.order === "number"
    && ["coverImage","desktopImage","mobileImage"].every((key) =>
      typeof item[key] === "string" && isSafePortfolioMediaUrl(item[key])
    )
  ).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export function publicPortfolioCatalog(saved: unknown): PortfolioItem[] {
  return resolvePortfolioCatalog(saved).filter((item) => item.published);
}
