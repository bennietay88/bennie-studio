export type EcosystemLink = {
  id: "main" | "app" | "portfolio";
  label: string;
  shortLabel: string;
  description: string;
  url: string;
};

const cleanUrl = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
};

export const BENNIE_ECOSYSTEM_LINKS: EcosystemLink[] = [
  {
    id: "main",
    label: "Bennie Tay Main Website",
    shortLabel: "Main Website",
    description: "Brand hub, service positioning, audit request, and WordPress sales pages.",
    url: cleanUrl(import.meta.env.VITE_MAIN_WEBSITE_URL, "https://bennietay.com"),
  },
  {
    id: "app",
    label: "Bennie Studio App",
    shortLabel: "Client Portal",
    description: "Managed website plans, checkout, onboarding, project tracking, and support.",
    url: cleanUrl(import.meta.env.VITE_APP_PUBLIC_URL, "https://app.bennietay.com"),
  },
  {
    id: "portfolio",
    label: "Bennie Studio Portfolio",
    shortLabel: "Portfolio",
    description: "Website case studies, style directions, buyer journeys, and proof of build quality.",
    url: cleanUrl(import.meta.env.VITE_PORTFOLIO_URL, "https://portfolio.bennietay.com"),
  },
];

export const getEcosystemLink = (id: EcosystemLink["id"]) =>
  BENNIE_ECOSYSTEM_LINKS.find((link) => link.id === id);

export const openEcosystemLink = (id: EcosystemLink["id"]) => {
  const link = getEcosystemLink(id);
  if (!link || typeof window === "undefined") return;
  window.open(link.url, "_blank", "noopener,noreferrer");
};
