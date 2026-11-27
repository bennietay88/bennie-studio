import { useEffect, useState, useSyncExternalStore } from "react";
import { createPublicContentResource } from "./publicContentResource";

export type PlatformCmsItem = { title: string; body: string; imageUrl?: string };
export type PlatformCmsSection = {
  id: string;
  type: "rich_text" | "feature_grid" | "faq" | "image_text" | "cta";
  title: string;
  body: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
  items: PlatformCmsItem[];
};
export type PlatformCmsPage = {
  replacePageContent?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  ogImage?: string;
  noIndex?: boolean;
  heroTitle?: string;
  heroDescription?: string;
  primaryCtaLabel?: string;
  primaryCtaHref?: string;
  finalCtaTitle?: string;
  finalCtaDescription?: string;
  sections: PlatformCmsSection[];
};
export type PlatformSiteCms = {
  header: {
    navigation: Array<{ label: string; href: string }>;
    primaryCtaLabel: string;
    primaryCtaHref: string;
  };
  footer: {
    tagline: string;
    copyrightText: string;
    groups: Array<{ title: string; links: Array<{ label: string; href: string; external?: boolean }> }>;
  };
  pages: Record<string, PlatformCmsPage>;
};
export type PlatformSiteCmsEnvelope = {
  draft: PlatformSiteCms | null;
  published: PlatformSiteCms | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
  revisions?: Array<{ publishedAt: string; content: PlatformSiteCms }>;
};

export const PLATFORM_CMS_PAGES = [
  { path: "/", label: "Home" },
  { path: "/services", label: "Services" },
  { path: "/about", label: "About" },
  { path: "/resources", label: "Resources" },
  { path: "/contact", label: "Contact" },
  { path: "/templates", label: "Website templates" },
  { path: "/pricing", label: "Pricing" },
  { path: "/how-it-works", label: "How it works" },
  { path: "/case-studies", label: "Case studies" },
  { path: "/website-audit", label: "Website audit" },
  { path: "/generate-preview", label: "Free preview" },
  { path: "/dental-clinics", label: "Dental clinics" },
  { path: "/clinic-website-design", label: "Clinic websites" },
  { path: "/renovation-contractor-website-design", label: "Contractors" },
  { path: "/beauty-salon-website-design", label: "Beauty & wellness" },
  { path: "/tuition-centre-website-design", label: "Tuition centres" },
  { path: "/consultant-website-design", label: "Consultants" },
  { path: "/professional-services-website-design", label: "Professional services" },
  { path: "/accounting-firm-website-design", label: "Accounting firms" },
  { path: "/local-service-website-design", label: "Local services" },
  { path: "/pay-monthly-websites", label: "Pay monthly websites" },
  { path: "/website-subscription-service", label: "Website subscription" },
] as const;
export const CMS_REPLACEABLE_PATHS = new Set([
  "/services", "/about", "/resources", "/templates", "/how-it-works", "/case-studies",
  "/dental-clinics", "/clinic-website-design", "/renovation-contractor-website-design",
  "/beauty-salon-website-design", "/tuition-centre-website-design", "/consultant-website-design",
  "/professional-services-website-design", "/accounting-firm-website-design", "/local-service-website-design",
]);

export const DEFAULT_PLATFORM_CMS: PlatformSiteCms = {
  header: {
    navigation: [
      { label: "Services", href: "/services" },
      { label: "Website Examples", href: "/case-studies" },
      { label: "Pricing", href: "/pricing" },
      { label: "How it works", href: "/how-it-works" },
      { label: "About", href: "/about" },
    ],
    primaryCtaLabel: "",
    primaryCtaHref: "",
  },
  footer: {
    tagline: "",
    copyrightText: "",
    groups: [
      { title: "Explore", links: [{ label: "Website Services", href: "/services" }, { label: "Website Examples", href: "/case-studies" }, { label: "Pricing", href: "/pricing" }, { label: "How it works", href: "/how-it-works" }] },
      { title: "Resources", links: [{ label: "Insights", href: "/resources" }, { label: "Website Review", href: "/website-audit" }, { label: "Design Directions", href: "/templates" }, { label: "Try a Website Direction", href: "/generate-preview" }] },
      { title: "Company", links: [{ label: "About Bennie Studio", href: "/about" }, { label: "Contact", href: "/contact" }, { label: "Discuss your website", href: "/book-demo" }, { label: "One-time WordPress builds · SiteFoundry", href: "https://web.bennietay.com/#packages", external: true }, { label: "Bennie Tay Insights", href: "https://bennietay.com", external: true }] },
      { title: "Legal", links: [{ label: "Privacy Policy", href: "/privacy" }, { label: "Cookie Policy", href: "/cookie-policy" }, { label: "Terms of Service", href: "/terms" }] },
    ],
  },
  pages: {},
};

const publishedCms = createPublicContentResource<PlatformSiteCms | null>(null, async (signal) => {
  const response = await fetch("/api/public/platform-site-cms", { headers: { Accept: "application/json" }, signal });
  if (!response.ok) throw new Error("Published CMS unavailable");
  const content = (await response.json())?.content;
  return content && typeof content === "object" ? normalizePlatformCms(content) : null;
});
export function fetchPublishedPlatformCms(force = false) { return publishedCms.ensure(force); }

export function usePublishedPlatformCms() {
  const content = useSyncExternalStore(publishedCms.subscribe, publishedCms.getSnapshot, publishedCms.getSnapshot);
  useEffect(() => { void fetchPublishedPlatformCms(); }, []);
  return content || DEFAULT_PLATFORM_CMS;
}

export function normalizePlatformCms(input: unknown): PlatformSiteCms {
  const value = input && typeof input === "object" ? input as Partial<PlatformSiteCms> : {};
  const pages = value.pages && typeof value.pages === "object" ? value.pages : {};
  const safePages: Record<string, PlatformCmsPage> = {};
  for (const { path } of PLATFORM_CMS_PAGES) {
    const page = (pages as Record<string, Partial<PlatformCmsPage>>)[path];
    if (!page || typeof page !== "object") continue;
    safePages[path] = {
      replacePageContent: page.replacePageContent === true,
      seoTitle: String(page.seoTitle || ""),
      seoDescription: String(page.seoDescription || ""),
      canonicalUrl: String(page.canonicalUrl || ""),
      ogImage: String(page.ogImage || ""),
      noIndex: page.noIndex === true,
      heroTitle: String(page.heroTitle || ""),
      heroDescription: String(page.heroDescription || ""),
      primaryCtaLabel: String(page.primaryCtaLabel || ""),
      primaryCtaHref: String(page.primaryCtaHref || ""),
      finalCtaTitle: String(page.finalCtaTitle || ""),
      finalCtaDescription: String(page.finalCtaDescription || ""),
      sections: Array.isArray(page.sections) ? page.sections.slice(0, 30).map((section) => ({
        id: String(section.id || crypto.randomUUID()),
        type: ["rich_text", "feature_grid", "faq", "image_text", "cta"].includes(String(section.type)) ? section.type as PlatformCmsSection["type"] : "rich_text",
        title: String(section.title || ""),
        body: String(section.body || ""),
        imageUrl: String(section.imageUrl || ""),
        ctaLabel: String(section.ctaLabel || ""),
        ctaHref: String(section.ctaHref || ""),
        items: Array.isArray(section.items) ? section.items.slice(0, 16).map((item) => ({ title: String(item.title || ""), body: String(item.body || ""), imageUrl: String(item.imageUrl || "") })) : [],
      })) : [],
    };
  }
  const nav = Array.isArray(value.header?.navigation) ? value.header.navigation.slice(0, 12).map((item) => ({ label: String(item.label || ""), href: String(item.href || "") })) : DEFAULT_PLATFORM_CMS.header.navigation;
  const groups = Array.isArray(value.footer?.groups) ? value.footer.groups.slice(0, 8).map((group) => ({
    title: String(group.title || ""),
    links: Array.isArray(group.links) ? group.links.slice(0, 12).map((link) => ({ label: String(link.label || ""), href: String(link.href || ""), external: Boolean(link.external) })) : [],
  })) : DEFAULT_PLATFORM_CMS.footer.groups;
  return {
    header: {
      navigation: nav,
      primaryCtaLabel: String(value.header?.primaryCtaLabel || DEFAULT_PLATFORM_CMS.header.primaryCtaLabel),
      primaryCtaHref: String(value.header?.primaryCtaHref || DEFAULT_PLATFORM_CMS.header.primaryCtaHref),
    },
    footer: {
      tagline: String(value.footer?.tagline || ""),
      copyrightText: String(value.footer?.copyrightText || ""),
      groups,
    },
    pages: safePages,
  };
}
