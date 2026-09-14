export type CommercialMarket = "MY" | "SG" | "GB" | "INTL";
export type CommercialCurrency = "MYR" | "SGD" | "GBP" | "USD";
export type CommercialProductSlug = "managed-website" | "website-growth" | "growth-partner" | "custom-website";
export const COMMERCIAL_MARKET_CHANGED_EVENT = "bt-commercial-market-changed";
/** Launch offer commitment used by public checkout and customer records. */
export const COMMERCIAL_DEFAULT_COMMITMENT_MONTHS = 6;
/** Contract term for the gated recurring OTC + MRC catalogue. */
export const COMMERCIAL_RECURRING_COMMITMENT_MONTHS = 12;

export type CommercialPrice = {
  market: CommercialMarket;
  currency: CommercialCurrency;
  monthlyPrice: number | null;
  setupFee: number;
  annualPrice: number | null;
  monthlyConfigured?: boolean;
  annualConfigured?: boolean;
  billingInterval?: "month" | "year" | "one_time";
  oneTimeConfigured?: boolean;
  recurringMonthlyPrice?: number | null;
  recurringSetupFee?: number | null;
  recurringAnnualPrice?: number | null;
  minimumTermMonths?: number;
  recurringConfigured?: boolean;
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
    name: "Starter Website",
    description: "A focused, conversion-ready website for a business that needs a credible online presence quickly.",
    productType: "managed_website",
    salesMotion: "self_serve",
    prices: [
      ["MY", 999], ["SG", 299], ["GB", 169], ["INTL", 219],
    ].map(([market, monthlyPrice]) => ({ market: market as CommercialMarket, currency: COMMERCIAL_MARKETS[market as CommercialMarket].currency, monthlyPrice: monthlyPrice as number, setupFee: 0, annualPrice: null, billingInterval: "one_time" as const, oneTimeConfigured: false })),
  },
  {
    slug: "website-growth",
    name: "Business Website",
    description: "A complete service-business website with stronger lead capture, trust sections, analytics and local SEO foundations.",
    productType: "website_growth",
    salesMotion: "self_serve",
    includesProductSlug: "managed-website",
    prices: [["MY", 2999], ["SG", 899], ["GB", 509], ["INTL", 659]].map(([market, monthlyPrice]) => ({ market: market as CommercialMarket, currency: COMMERCIAL_MARKETS[market as CommercialMarket].currency, monthlyPrice: monthlyPrice as number, setupFee: 0, annualPrice: null, billingInterval: "one_time" as const, oneTimeConfigured: false })),
  },
  {
    slug: "growth-partner",
    name: "Growth Website",
    description: "A larger website build with deeper conversion structure, service pages, local visibility and launch support.",
    productType: "growth_partner",
    salesMotion: "self_serve",
    prices: [["MY", 4999], ["SG", 1499], ["GB", 849], ["INTL", 1099]].map(([market, monthlyPrice]) => ({ market: market as CommercialMarket, currency: COMMERCIAL_MARKETS[market as CommercialMarket].currency, monthlyPrice: monthlyPrice as number, setupFee: 0, annualPrice: null, billingInterval: "one_time" as const, oneTimeConfigured: false })),
  },
  {
    slug: "custom-website",
    name: "Custom Website",
    description: "A separately scoped exception for requirements outside the standardized managed platform.",
    productType: "custom_website",
    salesMotion: "quote",
    prices: (["MY", "SG", "GB", "INTL"] as CommercialMarket[]).map((market) => ({ market, currency: COMMERCIAL_MARKETS[market].currency, monthlyPrice: null, setupFee: 0, annualPrice: null })),
  },
];

export const getCommercialPrice = (product: CommercialProduct, market: CommercialMarket) => product.prices.find((price) => price.market === market) || product.prices.find((price) => price.market === "INTL");

export const getStoredMarket = (): CommercialMarket => {
  try {
    // A selected billing market passed from the main site takes precedence.
    const requested = typeof window !== "undefined" ? new URLSearchParams(window.location?.search || "").get("market")?.toUpperCase() : null;
    if (requested && ["MY", "SG", "GB", "UK", "INTL"].includes(requested)) return normalizeCommercialMarket(requested);
    const stored = localStorage.getItem("bt_commercial_market");
    if (stored) return normalizeCommercialMarket(stored);

    // MYR is the launch market. Visitors can switch markets using the visible
    // selector, and their choice is persisted after they make it.
    return "MY";
  } catch {
    return "MY";
  }
};

export const persistCommercialMarket = (market: CommercialMarket) => {
  try { localStorage.setItem("bt_commercial_market", market); } catch { /* storage is optional */ }
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("market")) {
      url.searchParams.set("market", market);
      window.history.replaceState(window.history.state, "", url);
    }
  } catch { /* URL synchronization is optional outside a browser. */ }
};
