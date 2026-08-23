import { PLANS, formatPlanMoney, getPlanMarketPrice } from "./plans";

export type BasicWebsiteOffer = {
  id: string;
  name: string;
  price: string;
  description: string;
  bestFor: string;
  included: string[];
  isPopular: boolean;
  setupFee: string;
  commitmentMonths: number;
};

const publicDetails: Record<string, Pick<BasicWebsiteOffer, "bestFor" | "included">> = {
  starter: {
    bestFor: "A simple first website with one clear enquiry action.",
    included: [
      "One-page website",
      "Hosting, SSL and mobile setup",
      "Contact form and WhatsApp CTA",
      "Basic search setup",
    ],
  },
  business: {
    bestFor: "A small service business that needs separate service and contact pages.",
    included: [
      "Up to three managed pages",
      "Service, trust and FAQ sections",
      "Local search-ready structure",
      "One consolidated update each month",
    ],
  },
  growth: {
    bestFor: "A growing business that needs campaigns, local pages and faster support.",
    included: [
      "Up to five managed pages",
      "Landing and service-area pages",
      "Enquiry tracking and monthly summary",
      "Two managed updates each month",
    ],
  },
};

export const getBasicWebsiteOffers = (market = "US"): BasicWebsiteOffer[] => PLANS
  .filter((plan) => ["starter", "business", "growth"].includes(plan.id))
  .map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: formatPlanMoney(plan, market),
    setupFee: formatPlanMoney(plan, market, "setupFee"),
    commitmentMonths: plan.commitmentMonths,
    description: plan.description,
    bestFor: publicDetails[plan.id].bestFor,
    included: publicDetails[plan.id].included,
    isPopular: plan.id === "business",
  }));

export const BASIC_WEBSITE_OFFERS = getBasicWebsiteOffers("US");

export const saveBasicPlanIntent = (planId: string, market = "US") => {
  const plan = PLANS.find((item) => item.id === planId) || PLANS[0];
  const pricing = getPlanMarketPrice(plan, market);
  localStorage.setItem(
    "bt_checkout_intent",
    JSON.stringify({ planId, market, currency: pricing.currency, billingCycle: "monthly", savedAt: new Date().toISOString() }),
  );
};
