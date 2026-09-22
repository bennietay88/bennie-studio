import { WebsitePage, WebsiteSection, NicheTemplate as BaseNicheTemplate } from "../types";
import { SECTION_TEMPLATES } from "./sectionTemplates";

export interface NicheSection extends Omit<WebsiteSection, "id"> {}

export interface NichePage extends Omit<WebsitePage, "id" | "sections"> {
  sections: NicheSection[];
}

export interface NicheTemplate extends Omit<BaseNicheTemplate, "pages"> {
  pages: NichePage[];
  industry?: string;
  businessCategory?: string;
  conversionGoal?: ConversionGoal;
  secondaryConversionGoals?: ConversionGoal[];
  recommendedPlan?: RecommendedPlan;
  supportedPageCounts?: PageCountOption[];
  ctaStrategy?: string[];
  leadCaptureType?: string;
  localSeoReadiness?: boolean;
  urgencyLevel?: UrgencyLevel;
  stylePreset?: string;
  templateStatus?: "active" | "draft" | "archived";
  isPremium?: boolean;
  templatePack?: TemplatePackId;
  customerName?: string;
  adminName?: string;
  bestFitCustomerProfile?: string;
  sectionPreset?: string[];
  editableFields?: string[];
  seoPreset?: TemplateSeoPreset;
  pageStructures?: Partial<Record<RecommendedPlan, TemplatePageStructure>>;
}

export type TemplatePackId =
  | "local_service"
  | "professional_services"
  | "health_wellness"
  | "hospitality_lifestyle";

export type ConversionGoal =
  | "Appointment Booking"
  | "Quote Request"
  | "Consultation Booking"
  | "Reservation"
  | "Property Lead Capture"
  | "Emergency Call"
  | "Trial Class Booking"
  | "Portfolio Enquiry"
  | "WhatsApp Enquiry"
  | "Demo Booking";

export type RecommendedPlan = "Starter" | "Business" | "Growth";
export type PageCountOption = 1 | 3 | 5;
export type UrgencyLevel = "Low" | "Normal" | "High" | "Emergency";

export interface TemplateSeoPreset {
  title: string;
  metaDescription: string;
  h1: string;
  suggestedH2s: string[];
  servicePageSuggestions: string[];
  locationKeywordFields: string[];
  faqSchemaReady: string[];
  businessSchemaFields: string[];
  imageAltSuggestions: string[];
}

export interface TemplatePageStructure {
  plan: RecommendedPlan;
  pageCount: PageCountOption;
  pages: string[];
  sections: string[];
}

export interface TemplatePack {
  id: TemplatePackId;
  name: string;
  description: string;
  niches: string[];
}

export const WAAS_TEMPLATE_PACKS: TemplatePack[] = [
  {
    id: "local_service",
    name: "Local Service Website Pack",
    description: "Quote, booking, emergency, and WhatsApp-led templates for local service businesses.",
    niches: ["Cleaning Company", "Pest Control", "Plumbing / HVAC", "Renovation Contractor", "Local Shop", "Locksmith / Emergency Service"],
  },
  {
    id: "professional_services",
    name: "Professional Services Pack",
    description: "Consultation and authority templates for advisory, legal, real estate, and B2B firms.",
    niches: ["Law Firm", "Accounting Firm", "Consultant", "Real Estate Agent", "Corporate / B2B Services", "Insurance Agent"],
  },
  {
    id: "health_wellness",
    name: "Health & Wellness Pack",
    description: "Appointment-led clinic, dental, wellness, and practitioner website structures.",
    niches: ["Dental Clinic", "Aesthetic Clinic", "Physiotherapy Clinic", "Wellness / Spa", "Personal Trainer", "Counselling / Therapy Clinic"],
  },
  {
    id: "hospitality_lifestyle",
    name: "Hospitality & Lifestyle Pack",
    description: "Reservation, gallery, portfolio, and lifestyle templates for visual businesses.",
    niches: ["Restaurant", "Boutique", "Hotel / Hospitality", "Portfolio", "Personal Brand", "Salon / Spa"],
  },
];

export const CONVERSION_GOALS: ConversionGoal[] = [
  "Appointment Booking",
  "Quote Request",
  "Consultation Booking",
  "Reservation",
  "Property Lead Capture",
  "Emergency Call",
  "Trial Class Booking",
  "Portfolio Enquiry",
  "WhatsApp Enquiry",
  "Demo Booking",
];

export const REUSABLE_TEMPLATE_BLOCKS = [
  "Hero",
  "Trust bar",
  "Animated logo / trust marquee (verified logos only)",
  "Service cards",
  "Problem selector",
  "Why choose us",
  "Process",
  "Gallery",
  "Before/after",
  "Testimonials",
  "Pricing preview",
  "Service areas",
  "FAQ",
  "CTA banner",
  "Contact form",
  "Footer",
];

export const TEMPLATE_EDITABLE_FIELDS = [
  "Headline",
  "Subheadline",
  "CTA label",
  "CTA link",
  "Image",
  "Service title",
  "Service description",
  "FAQ question",
  "FAQ answer",
  "Review text",
  "Proof logo",
  "Proof logo label / relationship",
  "Business phone",
  "WhatsApp number",
  "Email",
  "Address",
  "Map embed",
  "Opening hours",
  "Service areas",
];

export const PLAN_PAGE_STRUCTURES: Record<RecommendedPlan, TemplatePageStructure> = {
  Starter: {
    plan: "Starter",
    pageCount: 1,
    pages: ["Home"],
    sections: ["Hero", "Trust bar / verified logo marquee", "Services overview", "Why choose us", "Process", "Testimonials", "FAQ", "CTA banner", "Contact section"],
  },
  Business: {
    plan: "Business",
    pageCount: 3,
    pages: ["Home", "Services", "Contact / About"],
    sections: ["Hero", "Services", "Trust proof", "Lead capture", "Contact"],
  },
  Growth: {
    plan: "Growth",
    pageCount: 5,
    pages: ["Home", "Services", "Main service page", "About", "Contact"],
    sections: ["Hero", "Service pages", "About / trust", "Gallery or case studies", "FAQ", "Contact"],
  },
};

const createSection = (type: string, overrides: any = {}): NicheSection => {
  const template = SECTION_TEMPLATES[type];
  if (!template) throw new Error(`Template not found for type: ${type}`);
  return {
    ...template,
    content: {
      ...template.content,
      ...overrides,
    },
  };
};

const BASE_NICHE_TEMPLATES: Record<string, NicheTemplate> = {
  "High-Converting Local Service Funnel": {
    id: "service-pro-v1",
    name: "Service Pro",
    premiumName: "High-Converting Local Service Funnel",
    category: "Local Services",
    bestFor: "Renovation, cleaning, repair, pest control, contractors, home services.",
    businessGoal: "Collect Quote Requests",
    visualStyle: "Friendly Local",
    targetMarket: "Local Homeowners & Businesses",
    ctaType: "Get Quote",
    premiumLevel: "Agency Grade",
    description: "Designed for rapid conversion and trust building for local service providers.",
    thumbnail: "/brand-template-preview.svg",
    theme: {
      primaryColor: "#2563eb",
      secondaryColor: "#ffffff",
      fontFamily: "'Inter', sans-serif",
      style: "modern",
      defaultStyle: "modern",
    },
    conversionFeatures: ["Sticky WhatsApp button", "Quote form", "Service area SEO block", "Google review section"],
    seoFocus: "Service keywords, location keywords, problem-based terms",
    trustElements: ["Reviews", "Work photos", "Guarantees", "Years of experience"],
    leadCapture: "Quote form + WhatsApp routing",
    automation: "Lead notification + enquiry confirmation",
    pages: [
      {
        title: "Home",
        slug: "",
        sections: [
          createSection("hero", {
            headline: "Expert Service for Your Home & Business",
            subheadline: "Professional, reliable, and guaranteed quality. Available today in your local area.",
            ctaText: "Get Free Quote",
          }),
          createSection("proof", {
            title: "Trusted by Local Customers",
            stats: [
              { label: "Jobs Completed", value: "2,500+" },
              { label: "Avg. Response", value: "60m" },
              { label: "Customer Rating", value: "4.9/5" },
            ],
          }),
          createSection("benefits", {
            title: "Why Choose Us over the Others",
            items: [
              { title: "Licensed & Insured", description: "Zero risk to you. We are fully covered for your peace of mind." },
              { title: "On-Time Guarantee", description: "If we are late, you get a discount. We value your time." },
              { title: "Price Match", description: "Found a better local quote? We will match it, guaranteed." },
            ]
          }),
          createSection("services", {
            title: "Expert Services to Suit You",
            items: [
              { title: "Standard Services", description: "Reliable solutions for everyday needs." },
              { title: "Premium Repairs", description: "High-level craftsmanship for critical fixes." },
              { title: "Ongoing Maintenance", description: "Keep your property at its best year-round." },
            ],
          }),
          createSection("cta", {
            title: "Ready to Get Started?",
            description: "Contact us now for a no-obligation quote and fast service.",
            buttonText: "Request Quote Now",
          }),
        ],
      },
    ],
  },
  "Managed Website Agency System": {
    id: "managed-website-agency-v1",
    name: "Managed Website Studio",
    premiumName: "Managed Website Agency System",
    category: "Corporate",
    bestFor: "Managed website studios, web design agencies, lead-generation website providers, and digital partners.",
    businessGoal: "Generate Leads",
    visualStyle: "Premium Corporate",
    targetMarket: "Service businesses and growing teams",
    ctaType: "Request Consultation",
    premiumLevel: "Agency Grade",
    description: "A studio-style website system built around managed websites, selected work, delivery process, ongoing improvement, and qualified enquiries.",
    thumbnail: "/brand-template-preview.svg",
    theme: {
      primaryColor: "#5746e8",
      secondaryColor: "#f6f7fb",
      fontFamily: "'Inter', sans-serif",
      style: "corporate",
    },
    conversionFeatures: ["Managed website services", "Selected work", "Delivery process", "Consultation CTA"],
    seoFocus: "Managed websites, web design, lead generation, website management",
    trustElements: ["Real project work", "Process clarity", "Customer-supplied reviews", "Service scope"],
    leadCapture: "Consultation / Website Preview Enquiry",
    automation: "CRM lead capture + enquiry follow-up",
    pages: [
      {
        title: "Home",
        slug: "",
        sections: [
          createSection("hero", {
            headline: "Managed Websites.",
            subheadline: "Strategy, build, hosting, lead capture, and ongoing website improvement in one managed service.",
            ctaText: "Book a Consultation",
          }),
          createSection("problem", {
            title: "A Website Should Keep Working After Launch",
            description: "The structure connects positioning, proof, services, and a clear enquiry path instead of stopping at visual design.",
            painPoints: ["Unclear offer", "Weak proof hierarchy", "No obvious next step", "Website becomes stale after launch"],
          }),
          createSection("solution", {
            title: "A Managed Website System",
            description: "A conversion-focused website paired with ongoing management and improvement.",
            features: ["Clear positioning", "Lead-generation structure", "Managed hosting and updates"],
          }),
          createSection("services", {
            title: "Managed Website Services",
            description: "The website, enquiry path, and ongoing improvements are designed to work as one system.",
            items: [
              { title: "Website Strategy", description: "Clarify the offer, audience, proof, and primary action." },
              { title: "Managed Website Build", description: "Build a responsive, conversion-focused website around the buyer journey." },
              { title: "Ongoing Improvement", description: "Keep the site useful with managed updates and growth support." },
            ],
          }),
          createSection("features", {
            title: "Built Around the Buyer Journey",
            items: ["Clear proposition", "Relevant proof", "Selected work", "Direct enquiry path"],
          }),
          createSection("testimonials", { title: "Customer Feedback", items: [] }),
          createSection("contact", {
            title: "Start With a Website Conversation",
            description: "Share the business, current website, and growth goal to plan the right direction.",
          }),
          createSection("cta", {
            title: "See the Right Website Direction",
            description: "Start with a tailored preview or consultation.",
            buttonText: "Generate a Preview",
          }),
        ],
      },
    ],
  },
  "Enterprise Authority Website": {
    id: "corporate-v1",
    name: "Corporate",
    premiumName: "Enterprise Authority Website",
    category: "Corporate",
    bestFor: "Established B2B companies, management firms, and industries requiring high credibility.",
    businessGoal: "Build Authority",
    visualStyle: "Premium Corporate",
    targetMarket: "Enterprise Leaders & B2B Decision Makers",
    ctaType: "Book Call",
    premiumLevel: "Agency Grade",
    description: "A sophisticated layout that emphasizes scale, stability, and professional excellence.",
    thumbnail: "/brand-template-preview.svg",
    theme: {
      primaryColor: "#0f172a",
      secondaryColor: "#f8fafc",
      fontFamily: "'Inter', sans-serif",
      style: "modern",
    },
    conversionFeatures: ["Capabilities section", "Leadership profiles", "Compliance badges", "Whitepaper lead magnet"],
    seoFocus: "Industry capabilities, solution-oriented keywords",
    trustElements: ["Client logos", "Certifications", "Board profiles", "Case studies"],
    leadCapture: "Consultation Request / Partnership Enquiry",
    automation: "CRM integration + Executive notification",
    pages: [
      {
        title: "Home",
        slug: "",
        sections: [
          createSection("hero", {
            headline: "Strategic Growth. Absolute Stability.",
            subheadline: "Leading the market through innovative solutions and established expertise.",
            ctaText: "Book Strategy Session",
          }),
          createSection("proof", {
            title: "Global Excellence",
            stats: [
              { label: "Market Share", value: "24%" },
              { label: "Global Offices", value: "12" },
              { label: "Success Rate", value: "98%" },
            ],
          }),
          createSection("benefits", {
            title: "The Corporate Standard",
            items: [
              { title: "Global Reach", description: "Expanding boundaries through strategic partnerships." },
              { title: "Innovation Led", description: "Continual improvement in the face of change." },
              { title: "Client Focused", description: "Your success is the measure of our performance." },
            ],
          }),
          createSection("services", {
            title: "Enterprise Solutions",
            items: [
              { title: "Strategic Consulting", description: "Deep-dive analysis and roadmap development." },
              { title: "Digital Transformation", description: "Modernizing infrastructure and workflows." },
              { title: "Risk Management", description: "Protecting assets while maximizing growth." },
            ],
          }),
          createSection("cta", {
            title: "Elevate Your Enterprise",
            description: "Connect with our global consultants to begin your transformation.",
            buttonText: "Schedule Consultation",
          }),
        ],
      },
    ],
  },
  "Property Lead Generation System": {
    id: "real-estate-v1",
    name: "Real Estate",
    premiumName: "Property Lead Generation System",
    category: "Real Estate",
    bestFor: "Real estate agents, property developers, and agencies focused on lead generation.",
    businessGoal: "Generate Leads",
    visualStyle: "Property Premium",
    targetMarket: "Home Buyers & Property Investors",
    ctaType: "View Properties",
    premiumLevel: "Agency Grade",
    description: "Visual-heavy layout designed to showcase listings and capture high-intent buyer leads.",
    thumbnail: "/brand-template-preview.svg",
    theme: {
      primaryColor: "#c29b40",
      secondaryColor: "#111827",
      fontFamily: "'Lora', serif",
      style: "immersive",
    },
    conversionFeatures: ["Property search", "Virtual tour integration", "Booking form", "Market reports"],
    seoFocus: "Area expertise, property keywords, investment terms",
    trustElements: ["Agent profile", "Sold history", "Market awards", "Client testimonials"],
    leadCapture: "Viewing booking + Market report sign-up",
    automation: "Auto-notification to agent + Property alerts",
    pages: [
      {
        title: "Home",
        slug: "",
        sections: [
          createSection("hero", {
            headline: "Discover Your Dream Premium Property",
            subheadline: "Handpicked listings for the most discerning buyers in the most exclusive areas.",
            ctaText: "View Current Listings",
          }),
          createSection("proof", {
            title: "Market Leaders",
            stats: [
              { label: "Properties Sold", value: "$1.2B+" },
              { label: "Active Listings", value: "450+" },
              { label: "Days on Market", value: "-15%" },
            ],
          }),
          createSection("features", {
            title: "Why List With Us",
            items: [
              "Exclusive global marketing network",
              "Professional HD cinematography",
              "AI-driven buyer matching",
              " concierge closing service",
            ],
          }),
          createSection("services", {
            title: "Property Services",
            items: [
              { title: "Residential Sales", description: "Curated lifestyle homes in prime locations." },
              { title: "Investment Portfolios", description: "High-yield commercial property strategy." },
              { title: "Property Management", description: "Hassle-free tenancy and maintenance." },
            ],
          }),
          createSection("cta", {
            title: "Find Your Next Home",
            description: "Browse our exclusive collection of premium listings today.",
            buttonText: "Browse Listings",
          }),
        ],
      },
    ],
  },
  "Legal Trust & Consultation Website": {
    id: "law-firm-v1",
    name: "Law Firm",
    premiumName: "Legal Trust & Consultation Website",
    category: "Legal",
    bestFor: "Law firms, independent attorneys, and legal consultants.",
    businessGoal: "Book Appointments",
    visualStyle: "Professional Legal",
    targetMarket: "Clients seeking high-stakes legal expertise",
    ctaType: "Request Consultation",
    premiumLevel: "Agency Grade",
    description: "Classic design aesthetic that projects authority, depth of experience, and absolute trust.",
    thumbnail: "/template-assets/flagship-professional.jpg",
    theme: {
      primaryColor: "#1e293b",
      secondaryColor: "#f1f5f9",
      fontFamily: "'Playfair Display', serif",
      style: "editorial",
    },
    conversionFeatures: ["Practice area grid", "Case results", "Expert profiles", "Consultation form"],
    seoFocus: "Practice area keywords, legal expertise, jurisdiction keywords",
    trustElements: ["Bar associations", "Awards", "Client testimonials", "Success rate"],
    leadCapture: "Consultation Request Form",
    automation: "Calendar invite + Conflict check notification",
    pages: [
      {
        title: "Home",
        slug: "",
        sections: [
          createSection("hero", {
            headline: "Justice Driven by Experience",
            subheadline: "Protecting your interests with rigorous strategy and personal dedication.",
            ctaText: "Schedule Consultation",
            imageUrl: "/template-assets/flagship-professional.jpg",
          }),
          createSection("proof", {
            title: "Proven Results",
            stats: [
              { label: "Successful Cases", value: "15k+" },
              { label: "Settlements Won", value: "$500M+" },
              { label: "Combined Exp.", value: "45yrs" },
            ],
          }),
          createSection("services", {
            title: "Our Practice Areas",
            items: [
              { title: "Corporate Law", description: "Protecting your business assets and interests." },
              { title: "Family Litigation", description: "Empathetic and sharp legal representation." },
              { title: "Intellectual Property", description: "Securing your innovation in a global market." },
            ]
          }),
          createSection("benefits", {
            title: "The Legal Edge",
            items: [
              { title: "Strategic Counsel", description: "Comprehensive legal roadmaps for complex issues." },
              { title: "Direct Partner Access", description: "Immediate connection to senior legal minds." },
              { title: "Results Driven", description: "Relentless pursuit of the best outcome for you." },
            ],
          }),
          createSection("cta", {
            title: "Get the Advocacy You Deserve",
            description: "Your path to justice begins with a confidential consultation.",
            buttonText: "Request Meeting",
          }),
        ],
      },
    ],
  },
  "Expert Authority Personal Brand Website": {
    id: "personal-brand-v1",
    name: "Personal Brand",
    premiumName: "Expert Authority Personal Brand Website",
    category: "Personal Brand",
    bestFor: "Speakers, authors, high-level consultants, and thought leaders.",
    businessGoal: "Build Authority",
    visualStyle: "Editorial Clean",
    targetMarket: "High-level clients and media",
    ctaType: "Book Call",
    premiumLevel: "Agency Grade",
    description: "A brand-centric design that focuses on story, expertise, and direct engagement.",
    thumbnail: "/brand-template-preview.svg",
    theme: {
      primaryColor: "#6366f1",
      secondaryColor: "#ffffff",
      fontFamily: "'Space Grotesk', sans-serif",
      style: "modern",
    },
    conversionFeatures: ["Authority bio", "Media logos", "Lead magnet", "Booking button"],
    seoFocus: "Personal brand name, expertise keywords, keynote topics",
    trustElements: ["Featured in logos", "Student/client counts", "Speaker reels", "Awards"],
    leadCapture: "Free guide download + Strategy session booking",
    automation: "Email sequence + Booking confirmation",
    pages: [
      {
        title: "Home",
        slug: "",
        sections: [
          createSection("hero", {
            headline: "Elevate Your Thinking. Transform Your Results.",
            subheadline: "Insights from the edge of leadership and personal excellence.",
            ctaText: "Work With Me",
          }),
          createSection("proof", {
            title: "Global Reach",
            stats: [
              { label: "Keynote Stages", value: "250+" },
              { label: "Mentored Leaders", value: "5,000+" },
              { label: "Countries Served", value: "45" },
            ],
          }),
          createSection("benefits", {
            title: "Key Insights",
            items: [
              { title: "Strategic Vision", description: "Anticipate market shifts before they happen." },
              { title: "Executive Mastery", description: "Optimize your leadership performance." },
              { title: "Scalable Systems", description: "Build organizations that thrive without you." },
            ],
          }),
          createSection("cta", {
            title: "Transform Your Vision into Reality",
            description: "Join the elite network of leaders working directly with me.",
            buttonText: "Apply to Work with Me",
          }),
        ],
      },
    ],
  },
  "Patient Booking & Trust Website": {
    id: "dental-clinic-v1",
    name: "Dental Clinic",
    premiumName: "Patient Booking & Trust Website",
    category: "Clinic / Healthcare",
    bestFor: "Dentists, doctors, physiotherapists, and medical specialist clinics.",
    businessGoal: "Book Appointments",
    visualStyle: "Calm Wellness",
    targetMarket: "Health-conscious patients",
    ctaType: "Book Call",
    premiumLevel: "Agency Grade",
    description: "Clean, hygienic, and comforting design to reduce anxiety and promote bookings.",
    thumbnail: "/template-assets/flagship-clinic.jpg",
    theme: {
      primaryColor: "#0ea5e9",
      secondaryColor: "#ffffff",
      fontFamily: "'Inter', sans-serif",
      style: "modern",
    },
    conversionFeatures: ["Doctor profiles", "Online booking", "Insurance info", "Before/After"],
    seoFocus: "Medical service keywords, location based healthcare",
    trustElements: ["Verified reviews", "Certifications", "Cleanliness badge", "Professional team"],
    leadCapture: "Direct appointment booking",
    automation: "Reminder SMS + Email confirmation",
    pages: [
      {
        title: "Home",
        slug: "",
        sections: [
          createSection("hero", {
            headline: "A Healthy Smile for Life",
            subheadline: "Gentle care for all ages in a modern, welcoming environment.",
            ctaText: "Book Appointment",
            imageUrl: "/template-assets/flagship-clinic.jpg",
          }),
          createSection("proof", {
            title: "Patient Trust",
            stats: [
              { label: "Happy Patients", value: "10,000+" },
              { label: "Years in Practice", value: "15" },
              { label: "Awards Won", value: "4" },
            ],
          }),
          createSection("benefits", {
            title: "The Clinic Standard",
            items: [
              { title: "Zero-Pain Tech", description: "We use the latest technology to ensure your comfort." },
              { title: "Family Centric", description: "Specialized care for children and seniors alike." },
              { title: "Insurance Ready", description: "We handle all the paperwork with major providers." },
            ]
          }),
          createSection("services", {
            title: "Our Specialized Care",
            items: [
              { title: "Preventive Care", description: "Complete checkups and dental hygiene." },
              { title: "Cosmetic Dentistry", description: "Veneers, whitening, and smile design." },
              { title: "Restorative Work", description: "Implants, crowns, and precise repairs." },
            ],
          }),
          createSection("cta", {
            title: "Ready for Your New Smile?",
            description: "Book your consultation online in minutes.",
            buttonText: "Book Appointment Now",
          }),
        ],
      },
    ],
  },
  "Premium Portfolio Showcase": {
    id: "portfolio-v1",
    name: "Portfolio",
    premiumName: "Premium Portfolio Showcase",
    category: "Portfolio",
    bestFor: "Designers, architects, photographers, and creative agencies.",
    businessGoal: "Showcase Portfolio",
    visualStyle: "Luxury Minimal",
    targetMarket: "Premium brands & creative clients",
    ctaType: "Book Call",
    premiumLevel: "Agency Grade",
    description: "Minimalist layout that lets work speak for itself with premium typography.",
    thumbnail: "/brand-template-preview.svg",
    theme: {
      primaryColor: "#000000",
      secondaryColor: "#ffffff",
      fontFamily: "'Playfair Display', serif",
      style: "editorial",
    },
    conversionFeatures: ["Immersive gallery", "Project case studies", "Contact form", "Process timeline"],
    seoFocus: "Creative discipline keywords, city based creative",
    trustElements: ["Client list", "Awards", "Testimonials", "Press features"],
    leadCapture: "Project enquiry form",
    automation: "Internal notification + Portfolio link share",
    pages: [
      {
        title: "Home",
        slug: "",
        sections: [
          createSection("hero", {
            headline: "Form. Function. Pure Emotion.",
            subheadline: "Crafting digital experiences that transcend the ordinary.",
            ctaText: "Explore Projects",
          }),
          createSection("benefits", {
            title: "Creative Mastery",
            items: [
              { title: "Intentional Design", description: "Purpose in every pixel and curve." },
              { title: "Technical Precision", description: "Flawless execution of complex ideas." },
              { title: "Strategic Storytelling", description: "Design that drives specific user actions." },
            ],
          }),
          createSection("cta", {
            title: "Begin Your Creative Transformation",
            description: "Let's build something exceptional together.",
            buttonText: "Discuss Your Project",
          }),
        ],
      },
    ],
  },
  "Reservation & Menu Conversion System": {
    id: "restaurant-v1",
    name: "Restaurant",
    premiumName: "Reservation & Menu Conversion System",
    category: "Restaurant",
    bestFor: "Fine dining, bistros, and high-end cafes.",
    businessGoal: "Accept Reservations",
    visualStyle: "Immersive Visual",
    targetMarket: "Foodies and dining enthusiasts",
    ctaType: "Reserve Table",
    premiumLevel: "Agency Grade",
    description: "High-impact visual design focused on menu immersion and easy reservations.",
    thumbnail: "/brand-template-preview.svg",
    theme: {
      primaryColor: "#78350f",
      secondaryColor: "#fffbeb",
      fontFamily: "'Fraunces', serif",
      style: "immersive",
    },
    conversionFeatures: ["Menu preview", "Online reservation", "Opening hours", "Event enquiry"],
    seoFocus: "Cuisine keywords, local dining, best restaurant city",
    trustElements: ["Awards", "Chef profile", "Social proof", "Food photos"],
    leadCapture: "Reservation Request / Private Event Form",
    automation: "Confirmation email + Reservation reminder",
    pages: [
      {
        title: "Home",
        slug: "",
        sections: [
          createSection("hero", {
            headline: "Culinary Excellence in Every Bite",
            subheadline: "A sanctuary of taste designed to awaken your senses.",
            ctaText: "Reserve Your Table",
          }),
          createSection("proof", {
            title: "Recognized Worldwide",
            stats: [
              { label: "Michelin Stars", value: "2" },
              { label: "Years of Heritage", value: "25" },
              { label: "Dishes Crafted", value: "100k+" }
            ]
          }),
          createSection("services", {
            title: "The Dining Experience",
            items: [
              { title: "Signature Menu", description: "Our chef's hand-crafted seasonal selections." },
              { title: "Wine Selection", description: "Rare vintages curated for perfect pairing." },
              { title: "Private Events", description: "Bespoke gatherings for life's milestones." },
            ],
          }),
          createSection("benefits", {
             title: "The Ritual of Taste",
             items: [
               { title: "Farm to Table", description: "Sourcing only the freshest local ingredients daily." },
               { title: "Open Kitchen", description: "Watch the artistry of our chefs in real-time." },
               { title: "Ambient Decor", description: "Interiors designed for absolute sensory immersion." }
             ]
          }),
          createSection("cta", {
            title: "A Sanctuary for Your Senses",
            description: "We are currently accepting reservations for this month.",
            buttonText: "Secure Your Table",
          }),
        ],
      },
    ],
  },
  "SaaS Demo & Trial Conversion Page": {
    id: "saas-landing-v1",
    name: "SaaS Landing",
    premiumName: "SaaS Demo & Trial Conversion Page",
    category: "SaaS",
    bestFor: "Software startups, tech products, and digital platforms.",
    businessGoal: "Drive Demo Calls",
    visualStyle: "Startup Gradient",
    targetMarket: "Tech-savvy professionals and enterprises",
    ctaType: "Request Consultation",
    premiumLevel: "Agency Grade",
    description: "High-performance landing page designed for conversion and feature clarity.",
    thumbnail: "/brand-template-preview.svg",
    theme: {
      primaryColor: "#6366f1",
      secondaryColor: "#ffffff",
      fontFamily: "'Space Grotesk', sans-serif",
      style: "modern",
    },
    conversionFeatures: ["Pricing table", "Feature grid", "Testimonial row", "Interactive demo"],
    seoFocus: "Software product name, solution keywords, trial terms",
    trustElements: ["Trust logos", "User counts", "Security badges", "App ratings"],
    leadCapture: "Website preview request / Demo booking",
    automation: "Onboarding sequence + CRM hook",
    pages: [
      {
        title: "Home",
        slug: "",
        sections: [
          createSection("hero", {
            headline: "Execute at the Speed of Thought",
            subheadline: "The modern infrastructure for builders. Scale faster than ever.",
            ctaText: "Start Deployment",
          }),
          createSection("proof", {
            title: "Infrastructure Strength",
            stats: [
              { label: "Uptime", value: "99.99%" },
              { label: "Active Users", value: "1M+" },
              { label: "Requests/sec", value: "50k" },
            ],
          }),
          createSection("features", {
            title: "The Architecture of Speed",
            items: [
              "Zero-config global deployment",
              "Advanced edge computing logic",
              "Real-time observability engine",
              "Enterprise-grade security shield",
            ],
          }),
          createSection("cta", {
            title: "Ready to Scale?",
            description: "Join 50,000+ teams building the future.",
            buttonText: "Start Deployment Now",
          }),
        ],
      },
    ],
  },
  "Premium Wellness Booking Website": {
    id: "wellness-v1",
    name: "Wellness",
    premiumName: "Premium Wellness Booking Website",
    category: "Wellness",
    bestFor: "Luxury Spas, Wellness Retreats, and Boutiques.",
    businessGoal: "Book Appointments",
    visualStyle: "Calm Wellness",
    targetMarket: "Wellness enthusiasts seeking tranquility",
    ctaType: "Book Call",
    premiumLevel: "Agency Grade",
    description: "Serene, sophisticated design focused on sanctuary and stillness.",
    thumbnail: "/brand-template-preview.svg",
    theme: {
      primaryColor: "#78350f",
      secondaryColor: "#fffbeb",
      fontFamily: "'Fraunces', serif",
      style: "immersive",
    },
    conversionFeatures: ["Treatment menu", "Booking flow", "Ambient video integration", "Testimonial wall"],
    seoFocus: "Spa keywords, wellness retreat terms, luxury relaxation",
    trustElements: ["Awards", "Therapist credentials", "Hygiene guarantee", "Natural product focus"],
    leadCapture: "Booking Request / Stay Inquiry",
    automation: "Confirmation email + Welcome sequence",
    pages: [
      {
        title: "Home",
        slug: "",
        sections: [
          createSection("hero", {
            headline: "Reconnect with Quietude",
            subheadline: "A sanctuary of stillness designed to restore your balance and elevate your well-being.",
            ctaText: "Begin Your Journey",
          }),
          createSection("benefits", {
            title: "The Path to Balance",
            items: [
              { title: "Holistic Restoration", description: "Treating the body as a complete ecosystem." },
              { title: "Expert Practitioners", description: "Guidance from masters of ancient wellness arts." },
              { title: "Pure Ingredients", description: "Organic infusions extracted from nature's heart." },
            ],
          }),
          createSection("cta", {
            title: "Your Sanctuary Awaits",
            description: "Surrender to the silence and begin your restoration today.",
            buttonText: "Reserve Your Retreat",
          }),
        ],
      },
    ],
  },
  "Lifestyle Commerce Brand Website": {
    id: "boutique-v1",
    name: "Boutique",
    premiumName: "Lifestyle Commerce Brand Website",
    category: "Retail / Boutique",
    bestFor: "Independent boutiques, jewelry brands, and lifestyle retail stores.",
    businessGoal: "Sell Packages",
    visualStyle: "Luxury Minimal",
    targetMarket: "Discerning shoppers looking for curated lifestyle products",
    ctaType: "WhatsApp",
    premiumLevel: "Growth OS",
    description: "Elegant, product-focused design with an emphasis on visual storytelling and brand feel.",
    thumbnail: "/brand-template-preview.svg",
    theme: {
      primaryColor: "#111827",
      secondaryColor: "#ffffff",
      fontFamily: "'Inter', sans-serif",
      style: "modern",
    },
    conversionFeatures: ["Lookbook gallery", "Product highlight strips", "WhatsApp shop routing", "Newsletter capture"],
    seoFocus: "Boutique name, lifestyle products, curated fashion",
    trustElements: ["Customer reviews", "In-store photos", "Quality promise", "Featured in logos"],
    leadCapture: "Newsletter sign-up + WhatsApp enquiry",
    automation: "Welcome email + Automated enquiry reply",
    pages: [
      {
        title: "Home",
        slug: "",
        sections: [
          createSection("hero", {
            headline: "Curated Elegance for Modern Living",
            subheadline: "Discover our latest collection of handpicked lifestyle essentials.",
            ctaText: "Shop the Collection",
          }),
          createSection("proof", {
            title: "Our Heritage",
            stats: [
              { label: "Curated Items", value: "250+" },
              { label: "Happy Shoppers", value: "15k" },
              { label: "New Arrivals", value: "Weekly" },
            ],
          }),
          createSection("services", {
            title: "Expert Curation",
            items: [
              { title: "Handpicked Fashion", description: "Timeless pieces from globally emerging designers." },
              { title: "Lifestyle Accents", description: "Artisanal home goods with a modern soul." },
              { title: "Personal Styling", description: "Bespoke guidance to refine your aesthetic." },
            ],
          }),
          createSection("cta", {
            title: "Refine Your Lifestyle",
            description: "Experience the curation that thousands of shoppers trust.",
            buttonText: "Shop Collection",
          }),
        ],
      },
    ],
  },
  "Local Business Trust & Enquiry Website": {
    id: "local-shop-v1",
    name: "Local Shop",
    premiumName: "Local Business Trust & Enquiry Website",
    category: "Retail / Boutique",
    bestFor: "Local bricks-and-mortar stores, repair shops, and community favorite businesses.",
    businessGoal: "Collect Quote Requests",
    visualStyle: "Friendly Local",
    targetMarket: "Local community and neighborhood residents",
    ctaType: "WhatsApp",
    premiumLevel: "Launch",
    description: "A community-focused layout that emphasizes local presence and easy communication.",
    thumbnail: "/brand-template-preview.svg",
    theme: {
      primaryColor: "#059669",
      secondaryColor: "#ffffff",
      fontFamily: "'Inter', sans-serif",
      style: "modern",
      defaultStyle: "modern",
    },
    conversionFeatures: ["Location map", "Opening status", "Quick WhatsApp link", "Community reviews"],
    seoFocus: "Local shop keywords, near me search terms, community service",
    trustElements: ["Local longevity", "Owner profile", "Customer photos", "Community awards"],
    leadCapture: "WhatsApp routing + Phone enquiry",
    automation: "Auto-reply for WhatsApp enquiries",
    pages: [
      {
        title: "Home",
        slug: "",
        sections: [
          createSection("hero", {
            headline: "Serving Our Community with Pride",
            subheadline: "Your reliable local partner for quality products and friendly service.",
            ctaText: "Chat with Us",
          }),
          createSection("proof", {
            title: "Local Favorite",
            stats: [
              { label: "Years in Town", value: "25" },
              { label: "Local Orders", value: "50k+" },
              { label: "Community Rating", value: "5/5" },
            ],
          }),
          createSection("services", {
            title: "What We Offer",
            items: [
              { title: "Fresh Groceries", description: "Daily sourced produce and local goods." },
              { title: "Expert Repairs", description: "Fixing what matters with care and precision." },
              { title: "Home Delivery", description: "Bringing the shop to your doorstep." },
            ]
          }),
          createSection("benefits", {
            title: "The Neighborhood Choice",
            items: [
              { title: "Loyalty Points", description: "Earn rewards with every local purchase." },
              { title: "Community Events", description: "Join us for regular local workshops and meets." },
              { title: "Eco Friendly", description: "Commitment to zero waste and local sourcing." }
            ]
          }),
          createSection("cta", {
            title: "We're Here to Help",
            description: "Stop by or message us today for expert local advice.",
            buttonText: "Message on WhatsApp",
          }),
        ],
      },
    ],
  },
};

const makeSeoPreset = (industry: string, services: string[], goal: string): TemplateSeoPreset => ({
  title: `${industry} in [City] | Professional ${goal}`,
  metaDescription: `Trusted ${industry.toLowerCase()} support in [City] with clear services, local enquiries, WhatsApp contact, and conversion-ready website sections.`,
  h1: `${industry} in [City]`,
  suggestedH2s: [
    `Our ${industry} Services`,
    `Why Choose Us in [City]`,
    "How It Works",
    "Frequently Asked Questions",
    "Contact Us",
  ],
  servicePageSuggestions: services,
  locationKeywordFields: ["Country", "State / region", "City", "Nearby areas", "Primary service"],
  faqSchemaReady: [
    `What ${industry.toLowerCase()} services do you provide in [City]?`,
    "How quickly can I get a response?",
    "Can I contact you through WhatsApp?",
    "Do you serve nearby areas?",
  ],
  businessSchemaFields: ["Business name", "Phone", "Email", "Address or service area", "Opening hours", "Services offered", "Areas served"],
  imageAltSuggestions: services.map((service) => `${service} service in [City]`),
});

const buildNicheTemplate = ({
  id,
  key,
  name,
  adminName,
  category,
  pack,
  goal,
  cta,
  leadCapture,
  description,
  bestFor,
  services,
  sectionPreset,
  thumbnail,
  theme,
  urgency = "Normal",
  stylePreset = "Premium Clean",
}: {
  id: string;
  key: string;
  name: string;
  adminName: string;
  category: NicheTemplate["category"];
  pack: TemplatePackId;
  goal: ConversionGoal;
  cta: NicheTemplate["ctaType"];
  leadCapture: string;
  description: string;
  bestFor: string;
  services: string[];
  sectionPreset: string[];
  thumbnail: string;
  theme: NicheTemplate["theme"];
  urgency?: UrgencyLevel;
  stylePreset?: string;
}): Record<string, NicheTemplate> => ({
  [key]: {
    id,
    name,
    customerName: `${name} Website`,
    adminName,
    premiumName: adminName,
    category,
    industry: name,
    businessCategory: category,
    templatePack: pack,
    conversionGoal: goal,
    secondaryConversionGoals: goal === "Emergency Call" ? ["WhatsApp Enquiry", "Quote Request"] : ["WhatsApp Enquiry"],
    recommendedPlan: "Business",
    supportedPageCounts: [1, 3, 5],
    ctaStrategy: [String(cta), "WhatsApp", "Contact form"],
    leadCaptureType: leadCapture,
    localSeoReadiness: true,
    urgencyLevel: urgency,
    stylePreset,
    templateStatus: "active",
    isPremium: true,
    bestFitCustomerProfile: bestFor,
    bestFor,
    businessGoal:
      goal === "Appointment Booking" || goal === "Trial Class Booking"
        ? "Book Appointments"
        : goal === "Reservation"
          ? "Accept Reservations"
          : goal === "Consultation Booking"
            ? "Book Appointments"
            : "Collect Quote Requests",
    visualStyle:
      category === "Clinic / Healthcare"
        ? "Calm Wellness"
        : category === "Corporate" || category === "Consultant" || category === "Legal"
          ? "Premium Corporate"
          : category === "Retail / Boutique" || category === "Hospitality"
            ? "Immersive Visual"
            : "Friendly Local",
    targetMarket: bestFor,
    ctaType: cta,
    premiumLevel: "Business",
    description,
    thumbnail,
    theme,
    conversionFeatures: ["Plan-aware page structure", "CTA-first sections", "Local SEO fields", "Lead form included"],
    seoFocus: `${name} services, [City] keywords, local enquiry intent`,
    trustElements: ["Reviews", "Service proof", "Process clarity", "Location visibility"],
    leadCapture,
    automation: "Lead notification + CRM capture",
    sectionPreset,
    editableFields: TEMPLATE_EDITABLE_FIELDS,
    seoPreset: makeSeoPreset(name, services, goal),
    pageStructures: PLAN_PAGE_STRUCTURES,
    pages: [
      {
        title: "Home",
        slug: "",
        sections: [
          createSection("hero", {
            headline: `${name} Services Built Around Results`,
            subheadline: `A focused website structure for ${bestFor.toLowerCase()} with clear services, local trust, and a direct enquiry path.`,
            ctaText: String(cta),
            imageUrl: thumbnail,
          }),
          createSection("proof", {
            title: "Built for Local Trust",
            stats: [
              { label: "Local SEO", value: "Ready" },
              { label: "CTA", value: String(cta) },
              { label: "Pages", value: "1 / 3 / 5" },
            ],
          }),
          createSection("services", {
            title: `Core ${name} Services`,
            items: services.slice(0, 4).map((service) => ({
              title: service,
              description: `Clear, conversion-ready copy block for ${service.toLowerCase()} with editable details and CTA routing.`,
            })),
          }),
          createSection("benefits", {
            title: "Why Customers Choose You",
            items: [
              { title: "Clear offer", description: "Visitors can quickly understand services, pricing context, and next steps." },
              { title: "Lead-focused", description: "Every page includes enquiry, WhatsApp, or booking paths." },
              { title: "Local search ready", description: "SEO titles, local FAQs, and service-area fields are prepared." },
            ],
          }),
          createSection("faq", {
            title: "Common Questions",
            items: [
              { question: `Do you provide ${name.toLowerCase()} services in [City]?`, answer: "Yes. Update this answer with your actual service area and availability." },
              { question: "How do customers make an enquiry?", answer: `Customers can use ${leadCapture.toLowerCase()}, WhatsApp, phone, or the contact form.` },
              { question: "Can this website support more pages?", answer: "Yes. The page structure can expand as the business and content requirements grow." },
            ],
          }),
          createSection("contact", {
            title: `Start with ${String(cta)}`,
            description: `Capture qualified enquiries through ${leadCapture.toLowerCase()} and route them into the CRM.`,
          }),
        ],
      },
    ],
  },
});

const ADDITIONAL_NICHE_TEMPLATES: Record<string, NicheTemplate> = {
  ...buildNicheTemplate({
    id: "aesthetic-clinic-v1",
    key: "Aesthetic Clinic Appointment Website",
    name: "Aesthetic Clinic",
    adminName: "Aesthetic Clinic — Consultation Booking — Premium Clean",
    category: "Clinic / Healthcare",
    pack: "health_wellness",
    goal: "Appointment Booking",
    cta: "Request Consultation",
    leadCapture: "Consultation form",
    description: "For aesthetic clinics that need treatment categories, trust sections, results galleries, and consultation bookings.",
    bestFor: "Skin clinics, medspas, facial clinics, and aesthetic practitioners.",
    services: ["Skin consultation", "Facial treatments", "Laser treatments", "Injectables"],
    sectionPreset: ["Premium hero", "Treatment categories", "Skin concern selector", "Results gallery", "Consultation form"],
    thumbnail: "/template-assets/flagship-clinic.jpg",
    theme: { primaryColor: "#7c3aed", secondaryColor: "#f5f3ff", fontFamily: "'Plus Jakarta Sans', sans-serif", style: "corporate" },
  }),
  ...buildNicheTemplate({
    id: "physiotherapy-clinic-v1",
    key: "Physiotherapy Recovery Website",
    name: "Physiotherapy Clinic",
    adminName: "Physiotherapy Clinic — Assessment Booking — Clinical Trust",
    category: "Clinic / Healthcare",
    pack: "health_wellness",
    goal: "Appointment Booking",
    cta: "Book Call",
    leadCapture: "Assessment booking form",
    description: "For physio clinics that need condition selectors, recovery benefits, treatment process, and booking CTAs.",
    bestFor: "Physiotherapy, rehabilitation, sports recovery, and pain management clinics.",
    services: ["Back pain treatment", "Sports injury rehab", "Post-surgery recovery", "Mobility assessment"],
    sectionPreset: ["Hero with assessment CTA", "Pain selector", "Conditions treated", "Recovery benefits", "Booking form"],
    thumbnail: "/template-assets/flagship-clinic.jpg",
    theme: { primaryColor: "#0f766e", secondaryColor: "#ecfdf5", fontFamily: "'Plus Jakarta Sans', sans-serif", style: "modern" },
  }),
  ...buildNicheTemplate({
    id: "renovation-contractor-v1",
    key: "Renovation Contractor Quote Website",
    name: "Renovation Contractor",
    adminName: "Renovation Contractor — Quote Request — Project Gallery",
    category: "Local Services",
    pack: "local_service",
    goal: "Quote Request",
    cta: "Get Quote",
    leadCapture: "Quote request form",
    description: "For renovation and contractor businesses that need project proof, before/after sections, and quote capture.",
    bestFor: "Renovation contractors, builders, interior contractors, and home improvement companies.",
    services: ["Home renovation", "Kitchen renovation", "Bathroom renovation", "Office renovation"],
    sectionPreset: ["Quote hero", "Service categories", "Project gallery", "Before/after", "Service areas"],
    thumbnail: "/template-assets/flagship-renovation.jpg",
    theme: { primaryColor: "#ea580c", secondaryColor: "#fff7ed", fontFamily: "'Plus Jakarta Sans', sans-serif", style: "modern" },
  }),
  ...buildNicheTemplate({
    id: "cleaning-company-v1",
    key: "Cleaning Company Booking Website",
    name: "Cleaning Company",
    adminName: "Cleaning Company — Booking Enquiry — Local Service",
    category: "Local Services",
    pack: "local_service",
    goal: "Quote Request",
    cta: "Get Quote",
    leadCapture: "Booking form",
    description: "For cleaning companies that need service cards, pricing preview, service areas, reviews, and booking enquiries.",
    bestFor: "Home cleaning, office cleaning, move-out cleaning, and commercial cleaning companies.",
    services: ["Home cleaning", "Office cleaning", "Deep cleaning", "Move-out cleaning"],
    sectionPreset: ["Booking hero", "Cleaning service cards", "Pricing preview", "How it works", "Service areas"],
    thumbnail: "/brand-template-preview.svg",
    theme: { primaryColor: "#0284c7", secondaryColor: "#f0f9ff", fontFamily: "'Inter', sans-serif", style: "modern" },
  }),
  ...buildNicheTemplate({
    id: "pest-control-v1",
    key: "Pest Control Emergency Website",
    name: "Pest Control",
    adminName: "Pest Control — Emergency Enquiry — High-Contrast Action",
    category: "Local Services",
    pack: "local_service",
    goal: "Emergency Call",
    cta: "Call Now",
    leadCapture: "Inspection form + urgent call CTA",
    description: "For pest control teams that need urgent call CTAs, pest selectors, safety/warranty sections, and service-area targeting.",
    bestFor: "Pest control, termite treatment, rodent removal, and emergency inspection services.",
    services: ["Termite control", "Rodent control", "Cockroach treatment", "Bed bug treatment"],
    sectionPreset: ["Emergency hero", "Sticky call bar", "Pest selector", "Warranty section", "Inspection form"],
    thumbnail: "/brand-template-preview.svg",
    theme: { primaryColor: "#dc2626", secondaryColor: "#fef2f2", fontFamily: "'Plus Jakarta Sans', sans-serif", style: "action" },
    urgency: "Emergency",
    stylePreset: "High-Contrast Action",
  }),
  ...buildNicheTemplate({
    id: "accounting-firm-v1",
    key: "Accounting Firm Consultation Website",
    name: "Accounting Firm",
    adminName: "Accounting Firm — Consultation Booking — Corporate Trust",
    category: "Corporate",
    pack: "professional_services",
    goal: "Consultation Booking",
    cta: "Request Consultation",
    leadCapture: "Consultation form",
    description: "For accounting and advisory firms that need services, packages, who-we-help sections, and consultation enquiries.",
    bestFor: "Accounting firms, tax consultants, bookkeepers, and financial advisory providers.",
    services: ["Tax filing", "Bookkeeping", "Payroll", "Business advisory"],
    sectionPreset: ["Professional hero", "Services", "Who we help", "Packages preview", "Consultation form"],
    thumbnail: "/brand-template-preview.svg",
    theme: { primaryColor: "#1e3a8a", secondaryColor: "#eff6ff", fontFamily: "'Inter', sans-serif", style: "corporate" },
  }),
  ...buildNicheTemplate({
    id: "tuition-centre-v1",
    key: "Tuition Centre Trial Class Website",
    name: "Tuition Centre",
    adminName: "Tuition Centre — Trial Class Booking — Friendly Trust",
    category: "Personal Brand",
    pack: "professional_services",
    goal: "Trial Class Booking",
    cta: "Book Call",
    leadCapture: "Trial class enquiry form",
    description: "For tuition centres that need program cards, age/level selectors, results sections, and trial class enquiries.",
    bestFor: "Tuition centres, enrichment centres, private tutors, and education businesses.",
    services: ["Primary tuition", "Secondary tuition", "Exam preparation", "Trial class"],
    sectionPreset: ["Trial class hero", "Program cards", "Age selector", "Results section", "Enquiry form"],
    thumbnail: "/template-assets/flagship-education.jpg",
    theme: { primaryColor: "#4f46e5", secondaryColor: "#eef2ff", fontFamily: "'Plus Jakarta Sans', sans-serif", style: "modern" },
  }),
  ...buildNicheTemplate({
    id: "salon-spa-v1",
    key: "Salon Spa Appointment Website",
    name: "Salon / Spa",
    adminName: "Salon / Spa — Appointment Booking — Lifestyle Premium",
    category: "Wellness",
    pack: "hospitality_lifestyle",
    goal: "Appointment Booking",
    cta: "Book Call",
    leadCapture: "Appointment form",
    description: "For salons and spas that need service menus, treatment highlights, gallery proof, and appointment bookings.",
    bestFor: "Hair salons, beauty salons, spas, nail studios, and lifestyle treatment businesses.",
    services: ["Hair styling", "Facial treatment", "Massage", "Nail services"],
    sectionPreset: ["Lifestyle hero", "Service menu", "Treatment highlights", "Gallery", "Appointment form"],
    thumbnail: "/template-assets/flagship-beauty.jpg",
    theme: { primaryColor: "#be185d", secondaryColor: "#fdf2f8", fontFamily: "'Fraunces', serif", style: "immersive" },
  }),
  ...buildNicheTemplate({
    id: "it-support-company-v1",
    key: "IT Support Lead Website",
    name: "IT Support Company",
    adminName: "IT Support Company — Consultation Booking — B2B Service",
    category: "Corporate",
    pack: "professional_services",
    goal: "Consultation Booking",
    cta: "Book Call",
    leadCapture: "Support consultation form",
    description: "For IT support companies that need managed service packages, response-time proof, and consultation leads.",
    bestFor: "MSPs, IT support teams, cybersecurity providers, and business technology consultants.",
    services: ["Managed IT support", "Cybersecurity", "Cloud migration", "Helpdesk support"],
    sectionPreset: ["B2B hero", "Service packages", "Response proof", "Security trust", "Consultation form"],
    thumbnail: "/brand-template-preview.svg",
    theme: { primaryColor: "#2563eb", secondaryColor: "#eff6ff", fontFamily: "'Space Grotesk', sans-serif", style: "corporate" },
  }),
  ...buildNicheTemplate({
    id: "recruitment-agency-v1",
    key: "Recruitment Agency Enquiry Website",
    name: "Recruitment Agency",
    adminName: "Recruitment Agency — Employer Enquiry — Corporate Trust",
    category: "Corporate",
    pack: "professional_services",
    goal: "Consultation Booking",
    cta: "Request Consultation",
    leadCapture: "Employer enquiry form",
    description: "For recruitment agencies that need employer/candidate routing, industry specialisms, and consultation enquiries.",
    bestFor: "Recruitment agencies, staffing firms, headhunters, and HR service providers.",
    services: ["Permanent hiring", "Temporary staffing", "Executive search", "Candidate screening"],
    sectionPreset: ["Employer hero", "Specialisms", "Hiring process", "Candidate CTA", "Employer form"],
    thumbnail: "/brand-template-preview.svg",
    theme: { primaryColor: "#334155", secondaryColor: "#f8fafc", fontFamily: "'Inter', sans-serif", style: "corporate" },
  }),
  ...buildNicheTemplate({
    id: "insurance-agent-v1",
    key: "Insurance Agent Consultation Website",
    name: "Insurance Agent",
    adminName: "Insurance Agent — Consultation Booking — Professional Trust",
    category: "Consultant",
    pack: "professional_services",
    goal: "Consultation Booking",
    cta: "Request Consultation",
    leadCapture: "Coverage consultation form",
    description: "For insurance agents who need package comparison, trust proof, FAQ clarity, and consultation bookings.",
    bestFor: "Insurance agents, financial planners, takaful advisors, and coverage consultants.",
    services: ["Life insurance", "Medical insurance", "Business insurance", "Retirement planning"],
    sectionPreset: ["Trust hero", "Coverage cards", "Who we help", "FAQ", "Consultation form"],
    thumbnail: "/brand-template-preview.svg",
    theme: { primaryColor: "#0f766e", secondaryColor: "#f0fdfa", fontFamily: "'Inter', sans-serif", style: "authority" },
  }),
  ...buildNicheTemplate({
    id: "interior-designer-v1",
    key: "Interior Designer Portfolio Website",
    name: "Interior Designer",
    adminName: "Interior Designer — Portfolio Enquiry — Visual Premium",
    category: "Portfolio",
    pack: "hospitality_lifestyle",
    goal: "Portfolio Enquiry",
    cta: "Get Quote",
    leadCapture: "Project enquiry form",
    description: "For interior designers that need visual portfolio sections, process, before/after proof, and project enquiries.",
    bestFor: "Interior designers, decor studios, styling consultants, and design-build firms.",
    services: ["Residential design", "Commercial design", "Space planning", "Project styling"],
    sectionPreset: ["Visual hero", "Portfolio gallery", "Before/after", "Design process", "Project form"],
    thumbnail: "/brand-template-preview.svg",
    theme: { primaryColor: "#111827", secondaryColor: "#f9fafb", fontFamily: "'Playfair Display', serif", style: "prestige" },
  }),
};

const ALL_BASE_NICHE_TEMPLATES: Record<string, NicheTemplate> = {
  ...BASE_NICHE_TEMPLATES,
  ...ADDITIONAL_NICHE_TEMPLATES,
};

// Repeatable vertical variants let the sales team offer a relevant starting point
// without creating a one-off site for every adjacent niche. Each variant inherits
// the tested structure, conversion flow, SEO fields, and editable content from a
// proven base template while presenting a niche-specific catalogue entry.
const EXTENDED_TEMPLATE_VARIANTS: Record<string, NicheTemplate> = Object.fromEntries([
  {
    id: "chiropractor-v1",
    source: "physiotherapy-clinic-v1",
    name: "Chiropractic Clinic",
    adminName: "Chiropractic Clinic — Assessment Booking — Clinical Trust",
    category: "Clinic / Healthcare",
    templatePack: "health_wellness",
    conversionGoal: "Appointment Booking",
    customerName: "Chiropractic Clinic Website",
    bestFitCustomerProfile: "Chiropractors and spinal care practices that need treatment pages, trust proof, and assessment bookings.",
    description: "A treatment-led clinic website with clear conditions, practitioner trust, and assessment booking flow.",
    services: ["Spinal assessment", "Chiropractic care", "Posture correction", "Sports injury support"],
  },
  {
    id: "electrician-v1",
    source: "service-pro-v1",
    name: "Electrician",
    adminName: "Electrician — Emergency Quote — Local Trust",
    category: "Local Services",
    templatePack: "local_service",
    conversionGoal: "Emergency Call",
    customerName: "Electrician Lead Website",
    bestFitCustomerProfile: "Electricians and electrical contractors that need emergency calls, quote requests, and service-area visibility.",
    description: "A fast, mobile-first local service template built for urgent calls, quote requests, and proof of workmanship.",
    services: ["Emergency electrical work", "Rewiring", "Consumer unit upgrades", "Lighting installation"],
  },
  {
    id: "roofing-v1",
    source: "service-pro-v1",
    name: "Roofing Contractor",
    adminName: "Roofing Contractor — Quote Request — Local Proof",
    category: "Local Services",
    templatePack: "local_service",
    conversionGoal: "Quote Request",
    customerName: "Roofing Contractor Website",
    bestFitCustomerProfile: "Roofers and building contractors that sell through local trust, project proof, and quote requests.",
    description: "A project-proof template for roof repairs, replacements, inspections, and local quote generation.",
    services: ["Roof repairs", "Roof replacement", "Gutter and fascia", "Roof inspections"],
  },
  {
    id: "mortgage-advisor-v1",
    source: "accounting-firm-v1",
    name: "Mortgage Advisor",
    adminName: "Mortgage Advisor — Consultation Booking — Trust-led",
    category: "Professional Services",
    templatePack: "professional_services",
    conversionGoal: "Consultation Booking",
    customerName: "Mortgage Advisor Website",
    bestFitCustomerProfile: "Mortgage brokers and financial advisers that need a compliant, trust-led consultation funnel.",
    description: "A trust-first advisory template with service pathways, FAQs, proof, and consultation booking.",
    services: ["First-time buyer mortgages", "Remortgages", "Buy-to-let", "Protection advice"],
  },
  {
    id: "childcare-centre-v1",
    source: "tuition-centre-v1",
    name: "Childcare Centre",
    adminName: "Childcare Centre — Enquiry & Tour Booking — Family Trust",
    category: "Education / Family",
    templatePack: "professional_services",
    conversionGoal: "Consultation Booking",
    customerName: "Childcare Centre Website",
    bestFitCustomerProfile: "Nurseries, preschools, and childcare centres that need tour enquiries and parent reassurance.",
    description: "A warm, parent-focused template for programmes, facilities, reviews, FAQs, and tour enquiries.",
    services: ["Early years care", "Preschool programme", "After-school care", "Holiday clubs"],
  },
  {
    id: "catering-v1",
    source: "restaurant-v1",
    name: "Catering Company",
    adminName: "Catering Company — Event Enquiry — Menu-led",
    category: "Hospitality",
    templatePack: "hospitality_lifestyle",
    conversionGoal: "Quote Request",
    customerName: "Catering Company Website",
    bestFitCustomerProfile: "Event caterers and private dining teams that need menus, gallery proof, and quote enquiries.",
    description: "A visual menu and event-enquiry template for weddings, corporate catering, and private events.",
    services: ["Wedding catering", "Corporate catering", "Private dining", "Canapés and grazing tables"],
  },
  {
    id: "florist-v1",
    source: "boutique-v1",
    name: "Florist",
    adminName: "Florist — Order Enquiry — Visual Local",
    category: "Retail / Lifestyle",
    templatePack: "hospitality_lifestyle",
    conversionGoal: "WhatsApp Enquiry",
    customerName: "Florist Website",
    bestFitCustomerProfile: "Florists and floral designers that sell through visual proof, occasion packages, and fast enquiries.",
    description: "A gallery-led local retail template for occasion flowers, weddings, gifting, and WhatsApp orders.",
    services: ["Bouquets", "Wedding flowers", "Corporate arrangements", "Sympathy flowers"],
  },
  {
    id: "photographer-v1",
    source: "portfolio-v1",
    name: "Photographer",
    adminName: "Photographer — Session Enquiry — Portfolio Premium",
    category: "Creative Services",
    templatePack: "hospitality_lifestyle",
    conversionGoal: "Portfolio Enquiry",
    customerName: "Photographer Portfolio Website",
    bestFitCustomerProfile: "Photographers that need a focused portfolio, packages, proof, and session enquiries.",
    description: "A visual portfolio template with service packages, galleries, testimonials, and enquiry flow.",
    services: ["Wedding photography", "Brand photography", "Family sessions", "Event photography"],
  },
].map((variant) => {
  // Base templates are keyed by their human-facing catalogue key, while
  // variants refer to the stable template id. Resolve by id so extending the
  // catalogue cannot break module initialisation when keys and ids differ.
  const source = Object.values(ALL_BASE_NICHE_TEMPLATES).find((item) => item.id === variant.source);
  if (!source) throw new Error(`Missing base template for ${variant.id}: ${variant.source}`);
  const { source: _source, ...metadata } = variant;
  return [variant.id, {
    ...source,
    ...metadata,
    id: variant.id,
    // The catalogue metadata array is intentionally data-driven, so preserve
    // the domain union here instead of widening conversionGoal to `string`.
    conversionGoal: variant.conversionGoal as NicheTemplate["conversionGoal"],
    templatePack: variant.templatePack as NicheTemplate["templatePack"],
    category: variant.category as NicheTemplate["category"],
    templateStatus: "active",
    isPremium: false,
    pages: source.pages.map((page) => ({ ...page, sections: page.sections.map((section) => ({ ...section })) })),
    theme: { ...source.theme },
  } satisfies NicheTemplate] as const;
}));

const BASE_TEMPLATE_CATALOG: Record<string, NicheTemplate> = {
  ...ALL_BASE_NICHE_TEMPLATES,
  ...EXTENDED_TEMPLATE_VARIANTS,
};

type TemplateStyleVariant = {
  key: string;
  label: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  style: string;
};

// Every niche can be sold in a distinct visual direction while retaining the
// same tested conversion blocks and editable content. This keeps delivery fast
// and gives prospects meaningful creative choice.
const TEMPLATE_STYLE_VARIANTS: TemplateStyleVariant[] = [
  { key: "clean", label: "Clean", primaryColor: "#4f46e5", secondaryColor: "#eef2ff", fontFamily: "'Geist', sans-serif", style: "clean" },
  { key: "bold", label: "Bold", primaryColor: "#0f172a", secondaryColor: "#f1f5f9", fontFamily: "'Montserrat', sans-serif", style: "bold" },
  { key: "editorial", label: "Editorial", primaryColor: "#7c3aed", secondaryColor: "#faf5ff", fontFamily: "'Playfair Display', serif", style: "editorial" },
  { key: "warm", label: "Warm", primaryColor: "#c2410c", secondaryColor: "#fff7ed", fontFamily: "'DM Sans', sans-serif", style: "warm" },
];

const TEMPLATE_CATALOG: Record<string, NicheTemplate> = {
  ...BASE_TEMPLATE_CATALOG,
  ...Object.fromEntries(
    Object.values(BASE_TEMPLATE_CATALOG).flatMap((template) =>
      TEMPLATE_STYLE_VARIANTS.map((variant) => {
        const variantId = `${template.id}-${variant.key}`;
        return [variantId, {
          ...template,
          id: variantId,
          name: `${template.name} — ${variant.label}`,
          adminName: `${template.adminName || template.name} — ${variant.label}`,
          customerName: `${template.customerName || template.name} (${variant.label})`,
          description: `${template.description} Presented in a ${variant.label.toLowerCase()} visual direction.`,
          stylePreset: variant.label,
          templateStatus: "active",
          isPremium: false,
          theme: {
            ...template.theme,
            primaryColor: variant.primaryColor,
            secondaryColor: variant.secondaryColor,
            fontFamily: variant.fontFamily,
            style: variant.style,
          },
          pages: template.pages.map((page) => ({
            ...page,
            sections: page.sections.map((section) => ({ ...section })),
          })),
        } satisfies NicheTemplate];
      }),
    ),
  ),
};

const COMMERCIAL_TEMPLATE_OVERRIDES: Record<string, Partial<NicheTemplate>> = {
  "service-pro-v1": {
    customerName: "Local Service Lead Website",
    adminName: "Local Service — Quote Request — ServicePro Base",
    industry: "Local Service",
    businessCategory: "Local Services",
    templatePack: "local_service",
    conversionGoal: "Quote Request",
    recommendedPlan: "Business",
    supportedPageCounts: [1, 3, 5],
    ctaStrategy: ["Get Quote", "WhatsApp", "Call Now"],
    leadCaptureType: "Quote form + WhatsApp",
    localSeoReadiness: true,
    urgencyLevel: "High",
    stylePreset: "Friendly Local",
    templateStatus: "active",
    isPremium: true,
    bestFitCustomerProfile: "Local service providers that need fast quote requests and service-area visibility.",
    sectionPreset: ["Hero", "Trust bar", "Service cards", "Why choose us", "Process", "Service areas", "FAQ", "Quote form"],
  },
  "corporate-v1": {
    customerName: "B2B Service Website",
    adminName: "B2B Service — Consultation Booking — Corporate Base",
    industry: "B2B Services",
    businessCategory: "Professional Services",
    templatePack: "professional_services",
    conversionGoal: "Consultation Booking",
    recommendedPlan: "Growth",
    supportedPageCounts: [1, 3, 5],
    ctaStrategy: ["Book Call", "Request Consultation"],
    leadCaptureType: "Consultation request form",
    localSeoReadiness: true,
    urgencyLevel: "Normal",
    stylePreset: "Premium Corporate",
  },
  "law-firm-v1": {
    customerName: "Law Firm Website",
    adminName: "Law Firm — Consultation Booking — Editorial Clean",
    industry: "Law Firm",
    businessCategory: "Professional Services",
    templatePack: "professional_services",
    conversionGoal: "Consultation Booking",
    recommendedPlan: "Growth",
    supportedPageCounts: [1, 3, 5],
    ctaStrategy: ["Request Consultation", "Call Now"],
    leadCaptureType: "Case enquiry form",
    localSeoReadiness: true,
    urgencyLevel: "Normal",
    stylePreset: "Professional Legal",
  },
  "dental-clinic-v1": {
    customerName: "Dental Clinic Website",
    adminName: "Dental Clinic — Appointment Booking — Premium Clean",
    industry: "Dental Clinic",
    businessCategory: "Healthcare / Local Service",
    templatePack: "health_wellness",
    conversionGoal: "Appointment Booking",
    secondaryConversionGoals: ["Emergency Call", "WhatsApp Enquiry"],
    recommendedPlan: "Business",
    supportedPageCounts: [1, 3, 5],
    ctaStrategy: ["Book Appointment", "WhatsApp Clinic", "Call Now"],
    leadCaptureType: "Appointment form",
    localSeoReadiness: true,
    urgencyLevel: "Normal",
    stylePreset: "Premium Clean",
    sectionPreset: ["Appointment hero", "Trust bar", "Dental services", "Emergency banner", "Patient journey", "Reviews", "FAQ", "Location map"],
  },
  "restaurant-v1": {
    customerName: "Restaurant Website",
    adminName: "Restaurant — Reservation — Hospitality Story",
    industry: "Restaurant",
    businessCategory: "Hospitality",
    templatePack: "hospitality_lifestyle",
    conversionGoal: "Reservation",
    recommendedPlan: "Business",
    supportedPageCounts: [1, 3, 5],
    ctaStrategy: ["Reserve Table", "WhatsApp", "Call Now"],
    leadCaptureType: "Reservation form",
    localSeoReadiness: true,
    urgencyLevel: "Normal",
    stylePreset: "Narrative Immersive",
  },
  "real-estate-v1": {
    customerName: "Real Estate Agent Website",
    adminName: "Real Estate Agent — Property Lead Capture — Premium Visual",
    industry: "Real Estate Agent",
    businessCategory: "Professional Services",
    templatePack: "professional_services",
    conversionGoal: "Property Lead Capture",
    recommendedPlan: "Growth",
    supportedPageCounts: [1, 3, 5],
    ctaStrategy: ["View Properties", "Request Consultation"],
    leadCaptureType: "Property lead form",
    localSeoReadiness: true,
    urgencyLevel: "Normal",
    stylePreset: "Property Premium",
  },
  "wellness-v1": {
    customerName: "Wellness & Appointment Website",
    adminName: "Wellness — Appointment Booking — Calm Wellness",
    industry: "Wellness / Spa",
    businessCategory: "Health & Wellness",
    templatePack: "health_wellness",
    conversionGoal: "Appointment Booking",
    recommendedPlan: "Business",
    supportedPageCounts: [1, 3, 5],
    ctaStrategy: ["Book Call", "WhatsApp"],
    leadCaptureType: "Booking form",
    localSeoReadiness: true,
    urgencyLevel: "Normal",
    stylePreset: "Calm Wellness",
  },
  "boutique-v1": {
    customerName: "Boutique Website",
    adminName: "Boutique — WhatsApp Enquiry — Lifestyle Premium",
    industry: "Boutique",
    businessCategory: "Hospitality & Lifestyle",
    templatePack: "hospitality_lifestyle",
    conversionGoal: "WhatsApp Enquiry",
    recommendedPlan: "Business",
    supportedPageCounts: [1, 3, 5],
    ctaStrategy: ["WhatsApp", "View Collection"],
    leadCaptureType: "WhatsApp enquiry",
    localSeoReadiness: true,
    urgencyLevel: "Low",
    stylePreset: "Lifestyle Premium",
  },
  "portfolio-v1": {
    customerName: "Portfolio Website",
    adminName: "Portfolio — Portfolio Enquiry — Editorial Gallery",
    industry: "Portfolio",
    businessCategory: "Hospitality & Lifestyle",
    templatePack: "hospitality_lifestyle",
    conversionGoal: "Portfolio Enquiry",
    recommendedPlan: "Business",
    supportedPageCounts: [1, 3, 5],
    ctaStrategy: ["Get Quote", "Book Call"],
    leadCaptureType: "Project enquiry form",
    localSeoReadiness: false,
    urgencyLevel: "Low",
    stylePreset: "Editorial Gallery",
  },
  "local-shop-v1": {
    customerName: "Local Shop Website",
    adminName: "Local Shop — WhatsApp Enquiry — Friendly Local",
    industry: "Local Shop",
    businessCategory: "Local Services",
    templatePack: "local_service",
    conversionGoal: "WhatsApp Enquiry",
    recommendedPlan: "Starter",
    supportedPageCounts: [1, 3, 5],
    ctaStrategy: ["WhatsApp", "Call Now"],
    leadCaptureType: "WhatsApp enquiry",
    localSeoReadiness: true,
    urgencyLevel: "Normal",
    stylePreset: "Friendly Local",
  },
};

const premiumThemeOverrides: Record<string, Partial<NicheTemplate["theme"]>> = {
  "service-pro-v1": {
    primaryColor: "#2563eb",
    secondaryColor: "#14b8a6",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    style: "modern",
    defaultStyle: "modern",
  },
  "corporate-v1": {
    primaryColor: "#334155",
    secondaryColor: "#f8fafc",
    fontFamily: "'Space Grotesk', sans-serif",
    style: "corporate",
  },
  "real-estate-v1": {
    primaryColor: "#d4a94f",
    secondaryColor: "#020617",
    fontFamily: "'Playfair Display', serif",
    style: "prestige",
  },
  "law-firm-v1": {
    primaryColor: "#475569",
    secondaryColor: "#f8fafc",
    fontFamily: "'Playfair Display', serif",
    style: "authority",
  },
  "personal-brand-v1": {
    primaryColor: "#4f46e5",
    secondaryColor: "#f8fafc",
    fontFamily: "'Space Grotesk', sans-serif",
    style: "modern",
  },
  "dental-clinic-v1": {
    primaryColor: "#0891b2",
    secondaryColor: "#f0fdfa",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    style: "corporate",
  },
  "portfolio-v1": {
    primaryColor: "#111827",
    secondaryColor: "#f9fafb",
    fontFamily: "'Playfair Display', serif",
    style: "prestige",
  },
  "restaurant-v1": {
    primaryColor: "#b45309",
    secondaryColor: "#fffbeb",
    fontFamily: "'Fraunces', serif",
    style: "immersive",
  },
  "saas-landing-v1": {
    primaryColor: "#6366f1",
    secondaryColor: "#22d3ee",
    fontFamily: "'Space Grotesk', sans-serif",
    style: "luxury_dark",
  },
  "wellness-v1": {
    primaryColor: "#0f766e",
    secondaryColor: "#ecfdf5",
    fontFamily: "'Fraunces', serif",
    style: "immersive",
  },
  "boutique-v1": {
    primaryColor: "#111827",
    secondaryColor: "#f8fafc",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    style: "prestige",
  },
  "local-shop-v1": {
    primaryColor: "#059669",
    secondaryColor: "#ecfdf5",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    style: "modern",
    defaultStyle: "modern",
  },
};

const inferCommercialMetadata = (template: NicheTemplate): Partial<NicheTemplate> => {
  const categoryPack: Record<string, TemplatePackId> = {
    "Local Services": "local_service",
    "Clinic / Healthcare": "health_wellness",
    Legal: "professional_services",
    Consultant: "professional_services",
    Corporate: "professional_services",
    "Real Estate": "professional_services",
    Restaurant: "hospitality_lifestyle",
    Hospitality: "hospitality_lifestyle",
    "Retail / Boutique": "hospitality_lifestyle",
    Portfolio: "hospitality_lifestyle",
    Wellness: "health_wellness",
    Fitness: "health_wellness",
  };

  const goalMap: Partial<Record<NicheTemplate["businessGoal"], ConversionGoal>> = {
    "Book Appointments": "Appointment Booking",
    "Collect Quote Requests": "Quote Request",
    "Accept Reservations": "Reservation",
    "Drive Demo Calls": "Demo Booking",
    "Showcase Portfolio": "Portfolio Enquiry",
    "Generate Leads": "WhatsApp Enquiry",
    "Build Authority": "Consultation Booking",
  };

  return {
    customerName: template.customerName || `${template.name} Website`,
    adminName: template.adminName || `${template.name} — ${goalMap[template.businessGoal] || "Lead Capture"} — ${template.visualStyle}`,
    industry: template.industry || template.name,
    businessCategory: template.businessCategory || template.category,
    conversionGoal: template.conversionGoal || goalMap[template.businessGoal] || "WhatsApp Enquiry",
    recommendedPlan: template.recommendedPlan || (template.premiumLevel === "Growth OS" || template.premiumLevel === "Agency Grade" ? "Growth" : "Business"),
    supportedPageCounts: template.supportedPageCounts || [1, 3, 5],
    ctaStrategy: template.ctaStrategy || [template.ctaType, "WhatsApp", "Contact form"],
    leadCaptureType: template.leadCaptureType || template.leadCapture,
    localSeoReadiness: template.localSeoReadiness ?? !template.category.includes("SaaS"),
    urgencyLevel: template.urgencyLevel || (template.ctaType === "Call Now" ? "Emergency" : "Normal"),
    stylePreset: template.stylePreset || template.visualStyle,
    templateStatus: template.templateStatus || "active",
    isPremium: template.isPremium ?? template.premiumLevel !== "Launch",
    templatePack: template.templatePack || categoryPack[template.category] || "professional_services",
    bestFitCustomerProfile: template.bestFitCustomerProfile || template.bestFor,
    sectionPreset: template.sectionPreset || ["Hero", "Trust bar", "Services", "Why choose us", "Testimonials", "FAQ", "Contact form"],
    editableFields: template.editableFields || TEMPLATE_EDITABLE_FIELDS,
    seoPreset: template.seoPreset || makeSeoPreset(template.name, template.conversionFeatures.slice(0, 4), goalMap[template.businessGoal] || "Lead Capture"),
    pageStructures: template.pageStructures || PLAN_PAGE_STRUCTURES,
  };
};

const getTemplateProblemTitle = (template: NicheTemplate) => {
  if (template.category.includes("Healthcare")) return "The Patient Friction We Remove";
  if (template.category.includes("Restaurant")) return "The Reservation Gap We Close";
  if (template.category.includes("SaaS")) return "The Scaling Friction We Remove";
  if (template.category.includes("Real Estate")) return "The Buyer Confidence Gap";
  if (template.category.includes("Legal")) return "The Uncertainty We Clarify";
  if (template.category.includes("Retail")) return "The Trust Gap We Close";
  return "The Growth Gap We Close";
};

const getTemplateSolutionTitle = (template: NicheTemplate) => {
  if (template.category.includes("Healthcare")) return "A Calm Booking Journey";
  if (template.category.includes("Restaurant")) return "A Premium Reservation Flow";
  if (template.category.includes("SaaS")) return "A Product-Led Conversion System";
  if (template.category.includes("Real Estate")) return "A Buyer-Ready Property Funnel";
  if (template.category.includes("Legal")) return "A Trust-First Consultation System";
  if (template.category.includes("Portfolio")) return "A Case-Study Led Portfolio";
  return "A Complete Conversion System";
};

const buildPremiumSections = (template: NicheTemplate): NicheSection[] => {
  const proofPoints = [
    ...(template.conversionFeatures || []),
    ...(template.trustElements || []),
  ].slice(0, 4);

  const solutionFeatures = proofPoints.length >= 3
    ? proofPoints.slice(0, 3)
    : [
        "Clear conversion path for high-intent visitors",
        "Premium proof sections that establish credibility fast",
        "Mobile-first structure built for speed and action",
      ];

  const actionSection =
    template.businessGoal === "Book Appointments" ||
    template.businessGoal === "Accept Reservations"
      ? createSection("appointment", {
          title: template.ctaType === "Reserve Table" ? "Priority Reservation" : "Priority Consultation",
          description: `Let visitors choose a clear next step and start the ${template.leadCapture.toLowerCase()} flow without friction.`,
          buttonText: template.ctaType,
          calendarTitle: "Available Times",
          workingHours: "Local business hours",
          location: "Online or in-person",
        })
      : createSection("contact", {
          title: `Start with ${template.ctaType}`,
          description: `Capture qualified enquiries through ${template.leadCapture.toLowerCase()} and route every lead into a clear follow-up path.`,
        });

  return [
    createSection("problem", {
      title: getTemplateProblemTitle(template),
      description: `${template.targetMarket} need clarity, proof, and a direct action path before they enquire. This template removes the hesitation points that usually leak leads.`,
      painPoints: [
        "Visitors cannot quickly understand the offer",
        "Trust proof is buried too low or missing",
        "Mobile visitors do not see a clear next step",
        "Follow-up intent gets lost after the first visit",
      ],
    }),
    createSection("solution", {
      title: getTemplateSolutionTitle(template),
      description: `A premium, motion-ready page structure built around ${template.businessGoal.toLowerCase()}, stronger trust signals, and a faster route to action.`,
      features: solutionFeatures,
    }),
    createSection("testimonials", {
      items: [
        {
          name: "Maya Chen",
          role: "Founder",
          text: "The page immediately felt more premium, more trustworthy, and easier for customers to act on.",
        },
        {
          name: "Daniel Wong",
          role: "Operations Lead",
          text: "The structure made our offer clearer and turned more casual visitors into serious enquiries.",
        },
        {
          name: "Aisha Rahman",
          role: "Business Owner",
          text: "The motion, proof blocks, and CTA flow gave the site the polish of a much larger brand.",
        },
      ],
    }),
    actionSection,
  ];
};

const completeTemplateSections = (template: NicheTemplate, sections: NicheSection[]) => {
  const existingTypes = new Set(sections.map((section) => section.type));
  const premiumSections = buildPremiumSections(template).filter(
    (section) => !existingTypes.has(section.type),
  );

  if (premiumSections.length === 0) return sections;

  const finalCtaIndex = sections.map((section) => section.type).lastIndexOf("cta");
  if (finalCtaIndex === -1) return [...sections, ...premiumSections];

  const insertAfter = Math.min(2, finalCtaIndex);
  const introSections = sections.slice(0, insertAfter);
  const bodySections = sections.slice(insertAfter, finalCtaIndex);
  const finalSections = sections.slice(finalCtaIndex);

  return [...introSections, ...premiumSections.slice(0, 2), ...bodySections, ...premiumSections.slice(2), ...finalSections];
};

export const NICHE_TEMPLATES: Record<string, NicheTemplate> = Object.fromEntries(
  Object.entries(TEMPLATE_CATALOG).map(([key, template]) => [
    key,
    (() => {
      const commercialTemplate = {
      ...template,
      ...inferCommercialMetadata(template),
      ...(COMMERCIAL_TEMPLATE_OVERRIDES[template.id] || {}),
      theme: {
        ...template.theme,
        ...(premiumThemeOverrides[template.id] || {}),
      },
      pages: template.pages.map((page, pageIndex) => ({
        ...page,
        sections: pageIndex === 0 ? completeTemplateSections(template, page.sections) : page.sections,
      })),
    };
      return {
        ...commercialTemplate,
        seoPreset: commercialTemplate.seoPreset || makeSeoPreset(commercialTemplate.name, commercialTemplate.conversionFeatures.slice(0, 4), commercialTemplate.conversionGoal || "Lead Capture"),
      };
    })(),
  ]),
) as Record<string, NicheTemplate>;

export const getTemplateCommercialMetadata = (template: Partial<NicheTemplate> | string | null | undefined): Partial<NicheTemplate> => {
  const resolved =
    typeof template === "string"
      ? Object.values(NICHE_TEMPLATES).find((item) => item.id === template || item.name === template || item.customerName === template)
      : template;
  if (!resolved) return {};
  const constantTemplate = Object.values(NICHE_TEMPLATES).find(
    (item) =>
      item.id === resolved.id ||
      item.name?.toLowerCase() === resolved.name?.toLowerCase() ||
      item.customerName?.toLowerCase() === resolved.name?.toLowerCase(),
  );
  const source = constantTemplate || resolved;
  return {
    customerName: source.customerName || source.name,
    adminName: source.adminName || source.premiumName || source.name,
    industry: source.industry || source.name,
    businessCategory: source.businessCategory || source.category,
    conversionGoal: source.conversionGoal,
    recommendedPlan: source.recommendedPlan,
    supportedPageCounts: source.supportedPageCounts || [1, 3, 5],
    ctaStrategy: source.ctaStrategy || (source.ctaType ? [source.ctaType] : []),
    leadCaptureType: source.leadCaptureType || source.leadCapture,
    localSeoReadiness: source.localSeoReadiness,
    urgencyLevel: source.urgencyLevel,
    stylePreset: source.stylePreset || source.visualStyle,
    templateStatus: source.templateStatus || "active",
    isPremium: source.isPremium,
    templatePack: source.templatePack,
    bestFitCustomerProfile: source.bestFitCustomerProfile || source.bestFor,
    sectionPreset: source.sectionPreset,
    editableFields: source.editableFields,
    seoPreset: source.seoPreset,
    pageStructures: source.pageStructures || PLAN_PAGE_STRUCTURES,
  };
};

export const getTemplatePlanStructure = (
  template: Partial<NicheTemplate> | string,
  plan: RecommendedPlan = "Business",
): TemplatePageStructure => {
  const metadata = getTemplateCommercialMetadata(template);
  return metadata.pageStructures?.[plan] || PLAN_PAGE_STRUCTURES[plan];
};

export const getTemplateCustomerName = (template: Partial<NicheTemplate> | string) =>
  getTemplateCommercialMetadata(template).customerName || (typeof template === "string" ? template : template.name || "Business Website");

export const getTemplateAdminName = (template: Partial<NicheTemplate> | string) =>
  getTemplateCommercialMetadata(template).adminName || (typeof template === "string" ? template : template.premiumName || template.name || "Template");

export const getTemplateReadiness = (template: Partial<NicheTemplate> | string) => {
  const metadata = getTemplateCommercialMetadata(template);
  const record = typeof template === "string" ? metadata : (template as any);
  const pages = record.pages || record.config?.pages || [];
  const checks = [
    { label: "page content", passed: pages.length > 0 && pages.some((page: any) => (page.sections || []).length > 0) },
    { label: "primary CTA", passed: Boolean(metadata.ctaStrategy?.length || metadata.ctaType) },
    { label: "lead capture", passed: Boolean(metadata.leadCaptureType || metadata.leadCapture) },
    { label: "best-fit customer", passed: Boolean(metadata.bestFitCustomerProfile || metadata.bestFor) },
    { label: "SEO structure", passed: Boolean(metadata.seoPreset || metadata.localSeoReadiness || record.seo_readiness || record.config?.commercial?.seoReadiness) },
    { label: "preview image", passed: Boolean(record.thumbnail || record.preview_image || record.config?.commercial?.previewImage) },
    { label: "active status", passed: (metadata.templateStatus || "active") === "active" },
  ];
  const completed = checks.filter((check) => check.passed).length;
  return {
    ready: completed === checks.length,
    completed,
    total: checks.length,
    percent: Math.round((completed / checks.length) * 100),
    missing: checks.filter((check) => !check.passed).map((check) => check.label),
  };
};

export const getRecommendedNicheTemplate = ({
  industry,
  goal,
  cta,
  style,
}: {
  industry?: string;
  goal?: string;
  cta?: string;
  style?: string;
}) => {
  const haystack = [industry, goal, cta, style].filter(Boolean).join(" ").toLowerCase();
  const templates = Object.values(NICHE_TEMPLATES);
  return (
    templates.find((template) => haystack.includes((template.industry || template.name).toLowerCase())) ||
    templates.find((template) => haystack.includes((template.conversionGoal || "").toLowerCase())) ||
    templates.find((template) => haystack.includes((template.ctaType || "").toLowerCase())) ||
    templates[0]
  );
};
