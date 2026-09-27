export type CommercialMarket = "MY" | "SG" | "GB" | "INTL";
export type CommercialCurrency = "MYR" | "SGD" | "GBP" | "USD";
export type CommercialProductSlug = "managed-website" | "website-growth" | "growth-partner" | "custom-website";
export const COMMERCIAL_MARKET_CHANGED_EVENT = "bt-commercial-market-changed";
/** Launch offer commitment used by public checkout and customer records. */
export const COMMERCIAL_DEFAULT_COMMITMENT_MONTHS = 3;
/** Contract term for the gated recurring OTC + MRC catalogue. */
export const COMMERCIAL_RECURRING_COMMITMENT_MONTHS = 3;

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
  recurringConfigStatus?: "draft" | "preview" | "live" | "disabled";
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

export const CHECKOUT_CURRENCIES: Array<{ value: CommercialCurrency; label: string }> = [
  { value: "USD", label: "USD" },
  { value: "GBP", label: "GBP" },
  { value: "MYR", label: "MYR" },
  { value: "SGD", label: "SGD" },
];

export const marketForCurrency = (currency?: string | null): CommercialMarket => {
  const normalized = String(currency || "USD").toUpperCase();
  if (normalized === "MYR") return "MY";
  if (normalized === "SGD") return "SG";
  if (normalized === "GBP") return "GB";
  return "INTL";
};

export const formatCommercialMoney = (amount: number | null | undefined, currency: CommercialCurrency) => {
  if (amount === null || amount === undefined) return "Quote required";
  return new Intl.NumberFormat(currency === "MYR" ? "en-MY" : currency === "SGD" ? "en-SG" : currency === "GBP" ? "en-GB" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getMinimumTermMonths = (
  price?: Pick<CommercialPrice, "minimumTermMonths"> | null,
  fallback = COMMERCIAL_DEFAULT_COMMITMENT_MONTHS,
) => {
  const value = Number(price?.minimumTermMonths);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
};

export const formatCommitmentLabel = (months: number) => {
  const normalized = Number.isFinite(months) && months > 0 ? Math.round(months) : COMMERCIAL_DEFAULT_COMMITMENT_MONTHS;
  return normalized === 1 ? "1-month initial commitment" : `${normalized}-month initial commitment`;
};

export const COMMERCIAL_FALLBACK_PRODUCTS: CommercialProduct[] = [
  {
    slug: "managed-website",
    name: "Managed Website",
    description: "A professionally built, hosted and continuously managed website for a service business that needs more qualified enquiries.",
    productType: "managed_website",
    salesMotion: "self_serve",
    prices: [
      ["MY", 199], ["SG", 99], ["GB", 79], ["INTL", 89],
    ].map(([market, monthlyPrice]) => ({ market: market as CommercialMarket, currency: COMMERCIAL_MARKETS[market as CommercialMarket].currency, monthlyPrice: monthlyPrice as number, setupFee: ({ MY: 1099, SG: 399, GB: 249, INTL: 299 } as Record<string, number>)[market as string], annualPrice: null, billingInterval: "month" as const, minimumTermMonths: 3, recurringConfigured: false, recurringConfigStatus: "draft" as const })),
  },
  {
    slug: "website-growth",
    name: "Website Growth",
    description: "A managed website growth system with stronger lead capture, trust sections, analytics and local SEO foundations.",
    productType: "website_growth",
    salesMotion: "self_serve",
    includesProductSlug: "managed-website",
    prices: [["MY", 399], ["SG", 199], ["GB", 149], ["INTL", 179]].map(([market, monthlyPrice]) => ({ market: market as CommercialMarket, currency: COMMERCIAL_MARKETS[market as CommercialMarket].currency, monthlyPrice: monthlyPrice as number, setupFee: ({ MY: 2499, SG: 799, GB: 499, INTL: 599 } as Record<string, number>)[market as string], annualPrice: null, billingInterval: "month" as const, minimumTermMonths: 3, recurringConfigured: false, recurringConfigStatus: "draft" as const })),
  },
  {
    slug: "growth-partner",
    name: "Growth Partner",
    description: "A consultant-led managed website engagement with deeper conversion strategy, landing pages, expanded SEO and growth direction.",
    productType: "growth_partner",
    salesMotion: "self_serve",
    prices: [["MY", 799], ["SG", 399], ["GB", 299], ["INTL", 349]].map(([market, monthlyPrice]) => ({ market: market as CommercialMarket, currency: COMMERCIAL_MARKETS[market as CommercialMarket].currency, monthlyPrice: monthlyPrice as number, setupFee: ({ MY: 4999, SG: 1499, GB: 999, INTL: 1199 } as Record<string, number>)[market as string], annualPrice: null, billingInterval: "month" as const, minimumTermMonths: 3, recurringConfigured: false, recurringConfigStatus: "draft" as const })),
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

/** Customer checkout is enabled only after an operator activates recurring Stripe prices. */
export const isRecurringCheckoutEnabled = (price: Pick<CommercialPrice, "recurringConfigStatus" | "monthlyConfigured"> | null | undefined) =>
  price?.recurringConfigStatus === "live" && price.monthlyConfigured === true;

export const getStoredMarket = (): CommercialMarket => {
  try {
    // A selected billing market passed from the main site takes precedence.
    const requested = typeof window !== "undefined" ? new URLSearchParams(window.location?.search || "").get("market")?.toUpperCase() : null;
    if (requested && ["MY", "SG", "GB", "UK", "INTL"].includes(requested)) return normalizeCommercialMarket(requested);
    const stored = localStorage.getItem("bt_commercial_market");
    if (stored) return normalizeCommercialMarket(stored);

    // Public pricing is USD-first for a global audience. Explicit campaign
    // market parameters and a visitor's saved market still take precedence.
    return "INTL";
  } catch {
    return "INTL";
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
