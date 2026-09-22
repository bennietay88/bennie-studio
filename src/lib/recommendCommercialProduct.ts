export type CommercialRecommendationInput = {
  goal: string;
  notes: string;
  industry: string;
  requestedPages?: number;
  serviceCount?: number;
  locationCount?: number;
  seoIntent?: boolean;
  landingPageNeeds?: boolean;
  customFunctionality?: boolean;
  integrations?: boolean;
  ongoingGrowth?: boolean;
};

export function recommendCommercialProduct(input: CommercialRecommendationInput) {
  const text = `${input.goal} ${input.notes} ${input.industry}`.toLowerCase();
  const pages = Math.max(1, Number(input.requestedPages || 5));
  const serviceCount = Math.max(0, Number(input.serviceCount || 0));
  const locationCount = Math.max(0, Number(input.locationCount || 0));
  const customFunctionality = Boolean(input.customFunctionality)
    || /ecommerce|e-commerce|membership|portal|booking engine|custom software|custom function|bespoke function/.test(text);
  const integrations = Boolean(input.integrations)
    || /integration|crm|api|hubspot|salesforce|woocommerce|shopify|stripe connect|erp/.test(text);
  const seoIntent = Boolean(input.seoIntent)
    || /\bseo\b|search visibility|local search|google ranking|organic traffic/.test(text);
  const landingPageNeeds = Boolean(input.landingPageNeeds)
    || /landing page|campaign page|service page|location page/.test(text);
  const ongoingGrowth = Boolean(input.ongoingGrowth)
    || /ongoing|continuous|monthly|scale|growth|content cadence|conversion optimisation|conversion optimization/.test(text);

  if (customFunctionality || integrations) {
    return {
      slug: "custom-website",
      label: "Custom Website",
      reason: "The brief needs separately scoped functionality or integrations before checkout.",
      salesMotion: "review" as const,
    };
  }

  const broadGrowthScope =
    pages > 5
    || serviceCount >= 4
    || locationCount >= 2
    || seoIntent
    || landingPageNeeds;

  const partnerScope =
    ongoingGrowth
    && (
      locationCount >= 3
      || serviceCount >= 6
      || (seoIntent && landingPageNeeds)
      || /multi-location|multiple locations|content strategy|campaigns|ongoing optimisation|ongoing optimization/.test(text)
    );

  if (partnerScope) {
    return {
      slug: "growth-partner",
      label: "Growth Partner",
      reason: "The brief combines ongoing growth work with broader service, location, SEO or campaign needs.",
      salesMotion: "self_serve" as const,
    };
  }

  if (broadGrowthScope) {
    return {
      slug: "website-growth",
      label: "Website Growth",
      reason: pages > 5
        ? "The requested scope extends beyond the core five-page managed website."
        : "The brief needs broader SEO, service, location or landing-page support beyond the core managed website.",
      salesMotion: "self_serve" as const,
    };
  }

  return {
    slug: "managed-website",
    label: "Managed Website",
    reason: "A managed website with up to five core pages is the clearest starting point for this enquiry journey.",
    salesMotion: "self_serve" as const,
  };
}
