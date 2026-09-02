export type CommercialMarket = "MY" | "SG" | "GB" | "INTL";
export type CommercialCurrency = "MYR" | "SGD" | "GBP" | "USD";
export type CommercialProductSlug = "managed-website" | "website-growth" | "growth-partner" | "custom-website";
export const COMMERCIAL_MARKET_CHANGED_EVENT = "bt-commercial-market-changed";

export type CommercialPrice = {
  market: CommercialMarket;
  currency: CommercialCurrency;
  monthlyPrice: number | null;
  setupFee: number;
  annualPrice: number | null;
  monthlyConfigured?: boolean;
  annualConfigured?: boolean;
};

export type CommercialProduct = {
  id?: string;
  slug: CommercialProductSlug;
  name: string;
  description: string;
  productType: "managed_website" | "website_growth" | "growth_partner" | "custom_website";
  salesMotion: "self_serve" | "proposal" | "quote";
  includesProductSlug?: CommercialProductSlug | null;
  prices: CommercialPrice[];
};

export const COMMERCIAL_MARKETS: Record<CommercialMarket, { label: string; currency: CommercialCurrency; symbol: string }> = {
  MY: { label: "Malaysia", currency: "MYR", symbol: "RM" },
  SG: { label: "Singapore", currency: "SGD", symbol: "S$" },
  GB: { label: "United Kingdom", currency: "GBP", symbol: "£" },
  INTL: { label: "International", currency: "USD", symbol: "$" },
};

export const normalizeCommercialMarket = (value?: string | null): CommercialMarket => {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "MY") return "MY";
  if (normalized === "SG") return "SG";
  if (normalized === "GB" || normalized === "UK") return "GB";
  return "INTL";
};

export const marketForCountry = normalizeCommercialMarket;

export const formatCommercialMoney = (amount: number | null | undefined, currency: CommercialCurrency) => {
  if (amount === null || amount === undefined) return "Quote required";
  return new Intl.NumberFormat(currency === "MYR" ? "en-MY" : currency === "SGD" ? "en-SG" : currency === "GBP" ? "en-GB" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const COMMERCIAL_FALLBACK_PRODUCTS: CommercialProduct[] = [
  {
    slug: "managed-website",
    name: "Managed Website",
    description: "Your business website built, hosted, maintained and continuously managed to turn more visitors into enquiries.",
    productType: "managed_website",
    salesMotion: "self_serve",
    prices: [
      ["MY", 299, 499, 2990], ["SG", 149, 249, null], ["GB", 99, 199, null], ["INTL", 99, 199, null],
    ].map(([market, monthlyPrice, setupFee, annualPrice]) => ({ market: market as CommercialMarket, currency: COMMERCIAL_MARKETS[market as CommercialMarket].currency, monthlyPrice: monthlyPrice as number, setupFee: setupFee as number, annualPrice: annualPrice as number | null })),
  },
  {
    slug: "website-growth",
    name: "Website Growth",
    description: "Ongoing website growth, conversion optimisation, local SEO expansion and performance improvement.",
    productType: "website_growth",
    salesMotion: "self_serve",
    includesProductSlug: "managed-website",
    prices: [["MY", 699, 499], ["SG", 349, 249], ["GB", 249, 199], ["INTL", 249, 199]].map(([market, monthlyPrice, setupFee]) => ({ market: market as CommercialMarket, currency: COMMERCIAL_MARKETS[market as CommercialMarket].currency, monthlyPrice: monthlyPrice as number, setupFee: setupFee as number, annualPrice: null })),
  },
  {
    slug: "growth-partner",
    name: "Growth Partner",
    description: "Ongoing website, conversion, SEO and digital growth strategy led personally by Bennie Studio.",
    productType: "growth_partner",
    salesMotion: "proposal",
    prices: [["MY", 2500, 3000], ["SG", 1250, 0], ["GB", 750, 0], ["INTL", 799, 0]].map(([market, monthlyPrice, setupFee]) => ({ market: market as CommercialMarket, currency: COMMERCIAL_MARKETS[market as CommercialMarket].currency, monthlyPrice: monthlyPrice as number, setupFee: setupFee as number, annualPrice: null })),
  },
  {
    slug: "custom-website",
    name: "Custom Website",
    description: "A bespoke website for ecommerce, complex integrations, multilingual content or custom functionality.",
    productType: "custom_website",
    salesMotion: "quote",
    prices: [["MY", 5000], ["SG", 2500], ["GB", 1500], ["INTL", 1800]].map(([market, fromPrice]) => ({ market: market as CommercialMarket, currency: COMMERCIAL_MARKETS[market as CommercialMarket].currency, monthlyPrice: null, setupFee: fromPrice as number, annualPrice: null })),
  },
];

export const getCommercialPrice = (product: CommercialProduct, market: CommercialMarket) => product.prices.find((price) => price.market === market) || product.prices.find((price) => price.market === "INTL");

export const getStoredMarket = (): CommercialMarket => {
  try {
    const stored = localStorage.getItem("bt_commercial_market");
    if (stored) return normalizeCommercialMarket(stored);

    // USD is the intentional first-visit default. Local pricing is opt-in via
    // the visible market selector and is persisted after the user chooses it.
    return "INTL";
  } catch {
    return "INTL";
  }
};

export const persistCommercialMarket = (market: CommercialMarket) => {
  try { localStorage.setItem("bt_commercial_market", market); } catch { /* storage is optional */ }
};
