export type CommercialMarket = "MY" | "SG" | "GB" | "INTL";
export type CommercialCurrency = "MYR" | "SGD" | "GBP" | "USD";
export type CommercialProductSlug = "personal-profile" | "managed-website" | "website-growth" | "growth-partner" | "custom-website";
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
  standardSetupFee?: number;
  otcWaiver?: "global" | "customer" | null;
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
  MY: { label: "Malaysia", currency: "USD", symbol: "$" },
  SG: { label: "Singapore", currency: "USD", symbol: "$" },
  GB: { label: "United Kingdom", currency: "USD", symbol: "$" },
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
];

// New sales and checkouts use the verified international USD catalogue.
export const marketForCurrency = (_currency?: string | null): CommercialMarket => "INTL";

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
    description: "Customer-guided, AI-assisted website creation with managed hosting, essential enquiry paths and straightforward ongoing website care.",
    productType: "managed_website",
    salesMotion: "self_serve",
    prices: [
      ["MY", 59], ["SG", 59], ["GB", 59], ["INTL", 59],
    ].map(([market, monthlyPrice]) => ({ market: market as CommercialMarket, currency: COMMERCIAL_MARKETS[market as CommercialMarket].currency, monthlyPrice: monthlyPrice as number, setupFee: ({ MY: 199, SG: 199, GB: 199, INTL: 199 } as Record<string, number>)[market as string], annualPrice: null, billingInterval: "month" as const, minimumTermMonths: 3, recurringConfigured: false, recurringConfigStatus: "draft" as const })),
  },
  {
    slug: "website-growth",
    name: "Website Growth",
    description: "An AI-assisted, done-for-you business website with lead capture, trust sections, analytics, local SEO foundations and monthly improvement guidance.",
    productType: "website_growth",
    salesMotion: "self_serve",
    includesProductSlug: "managed-website",
    prices: [["MY", 99], ["SG", 99], ["GB", 99], ["INTL", 99]].map(([market, monthlyPrice]) => ({ market: market as CommercialMarket, currency: COMMERCIAL_MARKETS[market as CommercialMarket].currency, monthlyPrice: monthlyPrice as number, setupFee: ({ MY: 299, SG: 299, GB: 299, INTL: 299 } as Record<string, number>)[market as string], annualPrice: null, billingInterval: "month" as const, minimumTermMonths: 3, recurringConfigured: false, recurringConfigStatus: "draft" as const })),
  },
  {
    slug: "growth-partner",
    name: "Growth Partner",
    description: "An AI-assisted managed website with priority support, expanded page options, performance reporting and consultant-led growth guidance.",
    productType: "growth_partner",
    salesMotion: "self_serve",
    prices: [["MY", 199], ["SG", 199], ["GB", 199], ["INTL", 199]].map(([market, monthlyPrice]) => ({ market: market as CommercialMarket, currency: COMMERCIAL_MARKETS[market as CommercialMarket].currency, monthlyPrice: monthlyPrice as number, setupFee: ({ MY: 499, SG: 499, GB: 499, INTL: 499 } as Record<string, number>)[market as string], annualPrice: null, billingInterval: "month" as const, minimumTermMonths: 3, recurringConfigured: false, recurringConfigStatus: "draft" as const })),
  },
  {
    slug: "personal-profile", name: "Personal Profile",
    description: "A streamlined AI-assisted professional profile website, using fixed-format pages, contact links, basic SEO and managed hosting.",
    productType: "managed_website", salesMotion: "self_serve",
    prices: [["MY",29],["SG",29],["GB",29],["INTL",29]].map(([market,monthlyPrice])=>({
      market:market as CommercialMarket, currency:COMMERCIAL_MARKETS[market as CommercialMarket].currency,
      monthlyPrice:monthlyPrice as number,setupFee:({MY:99,SG:99,GB:99,INTL:99} as Record<string,number>)[market as string],
      annualPrice:null,billingInterval:"month" as const,minimumTermMonths:3,recurringConfigured:false,recurringConfigStatus:"draft" as const,
    })),
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

export const getCommercialPrice = (product: CommercialProduct, _market: CommercialMarket) => product.prices.find((price) => price.market === "INTL" && price.currency === "USD");

/** Customer checkout is enabled only after an operator activates recurring Stripe prices. */
export const isRecurringCheckoutEnabled = (price: Pick<CommercialPrice, "recurringConfigStatus" | "monthlyConfigured"> | null | undefined) =>
  price?.recurringConfigStatus === "live" && price.monthlyConfigured === true;

// Ignore older country/currency preferences and campaign overrides for pricing.
export const getStoredMarket = (): CommercialMarket => "INTL";

export const persistCommercialMarket = (_market: CommercialMarket) => {
  try { localStorage.setItem("bt_commercial_market", "INTL"); } catch { /* optional */ }
};
