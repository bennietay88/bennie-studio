export interface Package {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  maxPages: number;
  maxSections: number;
  templateAccess: "basic" | "premium" | "all";
  aiCredits: number;
  blogSupport: boolean;
  seoSetup: boolean;
  revisionLimits: number;
  adminReview: boolean;
}

export const PACKAGES: Package[] = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    description: "Launch a simple one-page business website fast.",
    features: ["Professional 1-page website", "All key sections on home", "Hosting and SSL included", "Lead capture form", "WhatsApp/contact CTA", "Basic SEO setup", "One primary location"],
    maxPages: 1,
    maxSections: 10,
    templateAccess: "basic",
    aiCredits: 50,
    blogSupport: false,
    seoSetup: false,
    revisionLimits: 0,
    adminReview: false
  },
  {
    id: "business",
    name: "Business",
    price: 99,
    description: "Build a complete small business website with the essential pages customers expect.",
    features: ["Everything in Starter", "Up to 5 website pages", "Dedicated service pages", "About and contact pages", "Up to 5 location pages", "Monthly content update support"],
    maxPages: 5,
    maxSections: 35,
    templateAccess: "premium",
    aiCredits: 200,
    blogSupport: true,
    seoSetup: true,
    revisionLimits: 0,
    adminReview: false
  },
  {
    id: "growth",
    name: "Growth",
    price: 199,
    description: "Create a stronger website with authority pages, portfolio/case studies, and better SEO structure.",
    features: ["Everything in Business", "Up to 10 website pages", "Landing page support", "Blog setup", "Up to 25 location pages", "Internal linking suggestions", "Local content publishing checklist"],
    maxPages: 10,
    maxSections: 80,
    templateAccess: "all",
    aiCredits: 1000,
    blogSupport: true,
    seoSetup: true,
    revisionLimits: 0,
    adminReview: false
  }
];
