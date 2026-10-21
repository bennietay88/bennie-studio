import { COMMERCIAL_FALLBACK_PRODUCTS, getCommercialPrice } from "../lib/commercialPricing";

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
  name: "Growth Partner",
  commitmentMonths: 3,
  description:
    "An AI-assisted, automatically produced managed website with clearer enquiry paths, priority support and consultant-led website improvements after launch.",
  included: [
    "Customer-guided brief, AI-assisted content and managed website build",
    "Service-focused pages and local positioning",
    "WhatsApp, call, form or booking enquiry paths",
    "Managed hosting, maintenance and scoped monthly improvements",
    "Enquiry tracking and a concise monthly results summary",
    "One accountable website growth partner",
  ],
  prices: Object.fromEntries(
    (["US", "GB", "SG", "MY"] as RevenueMarket[]).map((market) => {
      // Country is retained for targeting; the published price book is USD.
      const product = COMMERCIAL_FALLBACK_PRODUCTS.find((item) => item.slug === "growth-partner")!;
      const price = getCommercialPrice(product, "INTL")!;
      return [market, {
        monthly: Number(price.monthlyPrice || 0),
        setup: Number(price.setupFee || 0),
        currency: price.currency,
        locale: price.currency === "MYR" ? "en-MY" : price.currency === "SGD" ? "en-SG" : price.currency === "GBP" ? "en-GB" : "en-US",
      }];
    }),
  ) as Record<RevenueMarket, RevenueOfferPrice>,
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
  MY: ["Cleaning companies", "Tuition & education centres", "Accounting & bookkeeping firms"],
  SG: ["Cleaning companies", "Tuition & education centres", "Accounting & bookkeeping firms"],
  GB: ["Cleaning companies", "Tutoring & education centres", "Accounting & bookkeeping firms"],
  US: ["Cleaning companies", "Tutoring & education centres", "Accounting & bookkeeping firms"],
} satisfies Record<RevenueMarket, readonly string[]>;
