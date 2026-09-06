export function recommendCommercialProduct(input: { goal: string; notes: string; industry: string; requestedPages?: number }) {
  const text = `${input.goal} ${input.notes} ${input.industry}`.toLowerCase();
  if (/ecommerce|e-commerce|membership|wordpress|woocommerce|integration|multilingual|custom software/.test(text)) {
    return { slug: "custom-website", label: "Custom Website", reason: "Your brief includes custom functionality. Confirm a separate scope and quotation before choosing a plan." };
  }
  if (/seo|search|location|locations|traffic|growth|landing page|multiple services|scale/.test(text)) {
    return { slug: "website-growth", label: "Website Growth Partner", reason: "Your goals point to ongoing optimisation, local search expansion and new landing pages." };
  }
  return { slug: "managed-website", label: "Website Growth System", reason: "A premium managed website is the clearest starting point for your enquiry journey." };
}
