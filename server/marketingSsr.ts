type MarketingRoute = "/" | "/pricing" | "/generate-preview";

import {
  COMMERCIAL_FALLBACK_PRODUCTS,
  formatCommercialMoney,
  getCommercialPrice,
  normalizeCommercialMarket,
  type CommercialMarket,
} from "../src/lib/commercialPricing.js";

const routeData: Record<MarketingRoute, { title: string; description: string; image: string; body: string }> = {
  "/": {
    title: "Managed Websites That Generate Enquiries | Bennie Studio",
    description: "Bennie Studio plans, builds, hosts and continuously improves managed websites for service businesses that want clearer enquiries.",
    image: "/og-home.svg",
    body: `
      <main class="marketing-shell">
        <p class="eyebrow">Managed website growth</p>
        <h1>Your managed website team, without hiring one.</h1>
        <p class="lede">We plan, build, host, manage and improve a conversion-focused website around your offer and the enquiries you want.</p>
        <div class="actions"><a class="primary" href="/generate-preview">See my website preview</a><a class="secondary" href="/pricing">Compare all plans</a></div>
        <section><h2>Built around enquiries, not just pages</h2><p>Get a clear offer, trust-building content, enquiry paths, managed hosting and ongoing improvements in one service.</p><ul><li>Website strategy and build</li><li>Managed hosting and launch support</li><li>WhatsApp, call, booking and quotation paths</li><li>Local SEO foundation and analytics</li></ul></section>
        <section><h2>Choose the right managed website package</h2><p>Start with a free preview, then compare the full scope, setup fee, monthly service and commitment before you decide.</p><a class="primary" href="/pricing">View full plan comparison</a></section>
      </main>`,
  },
  "/pricing": {
    title: "Managed Website Plans and Pricing | Bennie Studio",
    description: "Compare Bennie Studio managed website packages, setup fees, monthly service, trial terms and cancellation expectations before checkout.",
    image: "/og-pricing.svg",
    body: `
      <main class="marketing-shell wide">
        <p class="eyebrow">Managed website pricing</p>
        <h1>Choose the website package that fits your next stage.</h1>
        <p class="lede">Every package includes managed hosting and launch support. Scope, setup fee, billing start and cancellation terms are visible before checkout.</p>
        <div class="plan-grid">
          <article class="plan"><p class="eyebrow">Best starting point</p><h2>Managed Website</h2><p>Professionally planned, built, hosted and continuously managed for service businesses.</p><p class="price">From RM 1,099 setup · RM 199/month</p><p class="terms"><strong>Trial:</strong> No 14-day paid trial. A free preview is available with no card. <strong>Billing:</strong> setup fee and first month are due at checkout. <strong>Cancel:</strong> follow the written service terms after the initial commitment.</p><a class="primary" href="/generate-preview?product=managed-website">Start with a preview</a></article>
          <article class="plan featured"><p class="eyebrow">Most popular</p><h2>Website Growth</h2><p>Managed website growth with stronger lead capture, trust sections, analytics and local SEO foundations.</p><p class="price">From RM 2,499 setup · RM 399/month</p><p class="terms"><strong>Trial:</strong> No 14-day paid trial. A free preview is available with no card. <strong>Billing:</strong> setup fee and first month are due at checkout. <strong>Cancel:</strong> follow the written service terms after the initial commitment.</p><a class="primary" href="/generate-preview?product=website-growth">See the growth preview</a></article>
          <article class="plan"><p class="eyebrow">For larger teams</p><h2>Growth Partner</h2><p>Consultant-led website growth with deeper conversion strategy, landing pages and expanded SEO direction.</p><p class="price">From RM 4,999 setup · RM 799/month</p><p class="terms"><strong>Trial:</strong> No 14-day paid trial. Book a scope review before committing. <strong>Billing:</strong> billing begins on the agreed start date. <strong>Cancel:</strong> follow the written service terms and signed scope.</p><a class="secondary" href="/book-demo?product=growth-partner">Discuss scope first</a></article>
        </div>
        <section><h2>Before you choose</h2><p>Paid advertising, ad spend and guaranteed traffic, rankings or sales are not included. Custom software and bespoke integrations require a separate quote. We confirm page scope, content responsibilities, update allowance, launch schedule, billing start, cancellation and export arrangements in writing.</p></section>
      </main>`,
  },
  "/generate-preview": {
    title: "Free Website Preview Generator | Bennie Studio",
    description: "Share your business basics and get a tailored website direction before choosing a Bennie Studio managed website package.",
    image: "/og-preview.svg",
    body: `
      <main class="marketing-shell">
        <p class="eyebrow">Free website preview</p>
        <h1>See a website direction built around your business.</h1>
        <p class="lede">Tell us your business type, location, service and enquiry goal. We’ll show the structure, proof and next action your website should lead with.</p>
        <form class="preview-form" action="/generate-preview" method="get"><label>Business name<input name="business" required /></label><label>City or area served<input name="city" required /></label><label>Main service<input name="service" required /></label><button class="primary" type="submit">Generate my free preview</button></form>
        <section><h2>What happens next</h2><ol><li>Generate a tailored preview direction.</li><li>Review the recommended managed website package.</li><li>Carry the preview brief into checkout or book a scope review.</li></ol><p>No card is required for the preview.</p></section>
      </main>`,
  },
};

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function isMarketingRoute(pathname: string): pathname is MarketingRoute {
  return pathname === "/" || pathname === "/pricing" || pathname === "/generate-preview";
}

function renderPricingBody(market: CommercialMarket) {
  const body = routeData["/pricing"].body;
  const prices = COMMERCIAL_FALLBACK_PRODUCTS.slice(0, 3).map((product) => {
    const price = getCommercialPrice(product, market);
    return `From ${formatCommercialMoney(price?.setupFee, price?.currency || "USD")} setup · ${formatCommercialMoney(price?.monthlyPrice, price?.currency || "USD")}/month`;
  });
  return body
    .replace("From RM 1,099 setup · RM 199/month", prices[0])
    .replace("From RM 2,499 setup · RM 399/month", prices[1])
    .replace("From RM 4,999 setup · RM 799/month", prices[2]);
}

export function renderMarketingDocument(pathname: MarketingRoute, clientScript = "/src/main.tsx", requestedMarket?: string | null) {
  const data = routeData[pathname];
  const market = normalizeCommercialMarket(requestedMarket);
  const body = pathname === "/pricing" ? renderPricingBody(market) : data.body;
  const origin = "https://app.bennietay.com";
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>${escapeAttr(data.title)}</title><meta name="description" content="${escapeAttr(data.description)}"/><meta name="robots" content="index,follow"/><link rel="canonical" href="${origin}${pathname}"/><meta property="og:type" content="website"/><meta property="og:title" content="${escapeAttr(data.title)}"/><meta property="og:description" content="${escapeAttr(data.description)}"/><meta property="og:url" content="${origin}${pathname}"/><meta property="og:image" content="${origin}${data.image}"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="${escapeAttr(data.title)}"/><meta name="twitter:description" content="${escapeAttr(data.description)}"/><meta name="twitter:image" content="${origin}${data.image}"/><style>body{margin:0;background:#f8fafc;color:#0f172a;font:16px/1.6 system-ui,-apple-system,sans-serif}.marketing-shell{max-width:960px;margin:0 auto;padding:72px 24px}.marketing-shell.wide{max-width:1180px}.eyebrow{color:#4f46e5;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.marketing-shell h1{max-width:820px;font-size:clamp(2.5rem,6vw,5rem);line-height:1.03;letter-spacing:-.05em;margin:16px 0}.marketing-shell h2{font-size:clamp(1.5rem,3vw,2.3rem);line-height:1.1;margin:0 0 12px}.lede{max-width:720px;color:#475569;font-size:1.2rem}.actions{display:flex;gap:12px;flex-wrap:wrap;margin:28px 0 56px}.primary,.secondary{display:inline-flex;align-items:center;justify-content:center;border-radius:14px;padding:13px 18px;font-weight:800;text-decoration:none}.primary{background:#4f46e5;color:#fff}.secondary{border:1px solid #cbd5e1;background:#fff;color:#0f172a}.marketing-shell section{margin-top:34px;border-radius:24px;background:#fff;border:1px solid #e2e8f0;padding:28px}.marketing-shell li{margin:8px 0}.plan-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:34px}.plan{border:1px solid #cbd5e1;border-radius:24px;background:#fff;padding:24px;display:flex;flex-direction:column}.plan.featured{background:#4f46e5;color:#fff;border-color:#4f46e5}.plan.featured .eyebrow,.plan.featured .terms{color:#e0e7ff}.plan .price{font-size:1.25rem;font-weight:900}.plan .terms{font-size:.9rem;color:#475569;min-height:100px}.plan .primary,.plan .secondary{margin-top:auto}.preview-form{display:grid;gap:16px;max-width:560px;margin:32px 0}.preview-form label{display:grid;gap:6px;font-weight:800}.preview-form input{height:46px;border:1px solid #cbd5e1;border-radius:12px;padding:0 12px;font-size:1rem}@media(max-width:800px){.plan-grid{grid-template-columns:1fr}.marketing-shell{padding:48px 18px}}</style></head><body><div id="root">${body}</div><script type="module" src="${clientScript}"></script></body></html>`;
}
