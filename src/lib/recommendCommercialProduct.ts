export function recommendCommercialProduct(input: { goal: string; notes: string; industry: string; requestedPages?: number }) {
  const text = `${input.goal} ${input.notes} ${input.industry}`.toLowerCase();
  const pages = Math.max(1, Number(input.requestedPages || 5));
  if (/ecommerce|e-commerce|membership|wordpress|woocommerce|integration|multilingual|custom software/.test(text)) {
    return { slug: "custom-website", label: "Custom Website", reason: "Your brief includes custom functionality, so the scope should be confirmed before checkout." };
  }
  if (pages > 5 || /seo|search|location|locations|traffic|growth|landing page|multiple services|scale/.test(text)) {
    return { slug: "website-growth", label: "Website Growth", reason: pages > 5 ? "Your requested page count is beyond the core five-page managed website scope." : "Your goals point to ongoing optimisation, local search expansion and landing-page support." };
  }
  return { slug: "managed-website", label: "Managed Website", reason: "A managed five-page website is the clearest starting point for this enquiry journey." };
}
