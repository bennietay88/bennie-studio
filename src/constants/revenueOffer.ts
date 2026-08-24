export type RevenueMarket = "MY" | "SG" | "GB" | "US";

export type RevenueOfferPrice = {
  monthly: number;
  setup: number;
  currency: "MYR" | "SGD" | "GBP" | "USD";
  locale: string;
};

export const PRIMARY_REVENUE_OFFER = {
  id: "website_growth_partner",
  planId: "website_growth_partner",
  name: "Website Growth Partner",
  commitmentMonths: 6,
  description:
    "A consultant-led managed website service for service businesses that need a clearer enquiry journey and ongoing improvement after launch.",
  included: [
    "Website strategy, copy and managed build",
    "Service-focused pages and local positioning",
    "WhatsApp, call, form or booking enquiry paths",
    "Hosting, maintenance and monthly improvements",
    "Enquiry tracking and a concise monthly results summary",
    "One accountable website growth partner",
  ],
  prices: {
    US: { monthly: 799, setup: 1800, currency: "USD", locale: "en-US" },
    GB: { monthly: 750, setup: 0, currency: "GBP", locale: "en-GB" },
    SG: { monthly: 1250, setup: 0, currency: "SGD", locale: "en-SG" },
    MY: { monthly: 2500, setup: 3000, currency: "MYR", locale: "en-MY" },
  } satisfies Record<RevenueMarket, RevenueOfferPrice>,
} as const;

export const REVENUE_MARKETS: Record<RevenueMarket, { label: string; shortLabel: string }> = {
  MY: { label: "Malaysia", shortLabel: "MY" },
  SG: { label: "Singapore", shortLabel: "SG" },
  GB: { label: "United Kingdom", shortLabel: "UK" },
  US: { label: "International / USD", shortLabel: "Global" },
};

export const formatOfferMoney = (market: RevenueMarket, amount: number) => {
  const price = PRIMARY_REVENUE_OFFER.prices[market];
  return new Intl.NumberFormat(price.locale, {
    style: "currency",
    currency: price.currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getOfferForMarket = (market: RevenueMarket) => {
  const price = PRIMARY_REVENUE_OFFER.prices[market];
  return {
    ...PRIMARY_REVENUE_OFFER,
    market,
    monthlyPrice: price.monthly,
    setupFee: price.setup,
    monthlyLabel: formatOfferMoney(market, price.monthly),
    setupLabel: formatOfferMoney(market, price.setup),
  };
};

export const countryToRevenueMarket = (countryCode?: string): RevenueMarket => {
  const code = String(countryCode || "").toUpperCase();
  if (code === "MY") return "MY";
  if (code === "SG") return "SG";
  if (code === "GB" || code === "UK") return "GB";
  return "US";
};

export const REVENUE_NICHES = {
  MY: ["Renovation & interior design", "Home services", "Aesthetic & wellness", "Professional services"],
  SG: ["Renovation & interior design", "Aesthetic & wellness", "Professional services", "Education & enrichment"],
  GB: ["Trades & home services", "Clinics & wellness", "Professional services", "Property services"],
  US: ["Home services", "Professional services", "Clinics & wellness"],
} satisfies Record<RevenueMarket, readonly string[]>;
