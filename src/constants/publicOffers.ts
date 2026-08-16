import { PLANS } from "./plans";

export type BasicWebsiteOffer = {
  id: string;
  name: string;
  price: string;
  description: string;
  bestFor: string;
  included: string[];
  isPopular: boolean;
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
      "Three update requests each month",
    ],
  },
  growth: {
    bestFor: "A growing business that needs campaigns, local pages and faster support.",
    included: [
      "Up to five managed pages",
      "Landing and service-area pages",
      "Enquiry tracking and monthly summary",
      "Six update requests each month",
    ],
  },
};

export const BASIC_WEBSITE_OFFERS: BasicWebsiteOffer[] = PLANS
  .filter((plan) => ["starter", "business", "growth"].includes(plan.id))
  .map((plan) => ({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    description: plan.description,
    bestFor: publicDetails[plan.id].bestFor,
    included: publicDetails[plan.id].included,
    isPopular: plan.id === "business",
  }));

export const saveBasicPlanIntent = (planId: string) => {
  localStorage.setItem(
    "bt_checkout_intent",
    JSON.stringify({ planId, billingCycle: "monthly", savedAt: new Date().toISOString() }),
  );
};
