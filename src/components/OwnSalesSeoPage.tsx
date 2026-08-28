import React from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Globe, MessageSquare, Rocket, Shield, Sparkles, MapPin, PhoneCall, Search, FileText } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { findOwnSalesSeoPage } from "../constants/ownSalesSeoPages";
import { COMMERCIAL_FALLBACK_PRODUCTS, COMMERCIAL_MARKETS, formatCommercialMoney, getCommercialPrice, type CommercialMarket } from "../lib/commercialPricing";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";

const sanitizeLegacyCommercialCopy = <T,>(value: T): T => {
  if (typeof value === "string") {
    return value
      // Preserve already-localized current prices while translating stale copy.
      .replace(/US\$99\/month/g, "__CURRENT_US_99__")
      .replace(/US\$199\/month/g, "__CURRENT_US_199__")
      .replace(/\$49(?:\/month)?/g, "US$99/month")
      .replace(/\$99(?:\/month)?/g, "US$99/month")
      .replace(/\$199(?:\/month)?/g, "US$199/month")
      .replace(/RM199(?:\/month)?/g, "RM299/month")
      .replace(/RM399(?:\/month)?/g, "RM699/month")
      .replace(/RM799(?:\/month)?/g, "RM699/month")
      .replace(/£49(?:\/month)?/g, "£99/month")
      .replace(/£99(?:\/month)?/g, "£99/month")
      .replace(/£199(?:\/month)?/g, "£249/month")
      .replace(/14[- ]day(?: free)? trial/gi, "free website preview")
      .replace(/card[- ]required trial/gi, "free website preview")
      .replace(/free trial/gi, "free website preview")
      .replace(/Starter/g, "Managed Website")
      .replace(/\bBusiness\b/g, "Managed Website")
      .replace(/Authority/g, "Growth Partner")
      .replace(/Scale/g, "Website Growth")
      .replace(/__CURRENT_US_99__/g, "US$99/month")
      .replace(/__CURRENT_US_199__/g, "US$199/month") as T;
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeLegacyCommercialCopy(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => {
        if (key === "plan" && typeof item === "string") {
          const normalized = item.trim().toLowerCase();
          if (["starter", "launch", "business"].includes(normalized)) return [key, "Managed Website"];
          if (["growth", "scale"].includes(normalized)) return [key, "Website Growth"];
          if (["authority", "agency"].includes(normalized)) return [key, "Growth Partner"];
        }
        return [key, sanitizeLegacyCommercialCopy(item)];
      }),
    ) as T;
  }
  return value;
};

export default function OwnSalesSeoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const page = sanitizeLegacyCommercialCopy(findOwnSalesSeoPage(location.pathname));

  if (!page) return <Navigate to="/" replace />;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://app.bennietay.com/" },
      { "@type": "ListItem", position: 2, name: page.h1, item: `https://app.bennietay.com${page.path}/` },
    ],
  };

  const isUk = page.path.includes("/uk") || /UK|London|Manchester|Birmingham|Leeds|Bristol|Glasgow/.test(page.h1);
  const isMalaysia = page.path.includes("malaysia") || /Malaysia|Kuala Lumpur|Petaling Jaya|Shah Alam|Subang Jaya|Johor Bahru|Penang|Kuching/.test(page.h1);
  const isSingapore = page.path.includes("singapore") || /Singapore|Orchard|Tampines|Jurong|Woodlands|Toa Payoh/.test(page.h1);
  const marketLabel = isUk ? "UK" : isMalaysia ? "Malaysia" : isSingapore ? "Singapore" : "your market";
  const isCityPage = page.path.startsWith("/website-design/");
  const isCountryPage = page.path.startsWith("/website-subscription-service/") && ["UK", "Malaysia", "Singapore"].includes(marketLabel);
  const cityName = isCityPage ? page.h1.replace(/^Website Design\s+/i, "") : marketLabel;
  const revenueMarket: CommercialMarket = isUk ? "GB" : isMalaysia ? "MY" : isSingapore ? "SG" : "INTL";
  const managedProduct = COMMERCIAL_FALLBACK_PRODUCTS.find((product) => product.slug === "managed-website")!;
  const managedPrice = getCommercialPrice(managedProduct, revenueMarket)!;
  const coreOffer = { name: managedProduct.name, description: managedProduct.description, monthlyLabel: formatCommercialMoney(managedPrice.monthlyPrice, managedPrice.currency), setupLabel: formatCommercialMoney(managedPrice.setupFee, managedPrice.currency), prices: { [revenueMarket]: { currency: managedPrice.currency } } } as any;
  const packageOptions = COMMERCIAL_FALLBACK_PRODUCTS.filter((product) => ["managed-website", "website-growth"].includes(product.slug)).map((product, index) => {
    const price = getCommercialPrice(product, revenueMarket)!;
    return { id: product.slug, name: product.name, price: `${formatCommercialMoney(price.monthlyPrice, price.currency)}/mo`, description: product.description, label: index === 0 ? "Recommended starting point" : "For active growth", features: index === 0 ? ["Hosting and SSL", "Conversion-focused structure", "WhatsApp and enquiry paths", "Managed updates"] : ["Monthly conversion optimisation", "Local SEO expansion", "Landing and location pages", "Priority support"] };
  });
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: page.h1,
    description: page.metaDescription,
    provider: {
      "@type": "Organization",
      name: "Bennie Studio",
      url: "https://app.bennietay.com/",
    },
    areaServed: marketLabel,
    serviceType: isCityPage ? "Website design and managed website subscription" : "Website subscription service",
    offers: {
      "@type": "OfferCatalog",
      name: `Website service options for ${marketLabel}`,
      itemListElement: [...packageOptions, {
        name: coreOffer.name,
        description: coreOffer.description,
        price: coreOffer.monthlyLabel,
      }].map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        description: plan.description,
        priceSpecification: {
          "@type": "PriceSpecification",
          priceCurrency: coreOffer.prices[revenueMarket].currency,
          price: plan.price.replace(/[^0-9.]/g, "") || undefined,
        },
      })),
    },
  };
  const relatedLocationPages = isUk
    ? {
      label: "UK city pages",
      title: "Related UK website design pages",
      description: "City links stay focused on the UK market so visitors only see relevant local pages.",
      links: [
        { label: "London", href: "/website-design/london" },
        { label: "Manchester", href: "/website-design/manchester" },
        { label: "Birmingham", href: "/website-design/birmingham" },
        { label: "Leeds", href: "/website-design/leeds" },
        { label: "Bristol", href: "/website-design/bristol" },
        { label: "Glasgow", href: "/website-design/glasgow" },
      ],
    }
    : isMalaysia
      ? {
      label: "Malaysia city pages",
      title: "Related Malaysia website design pages",
      description: "City links stay focused on Malaysia so visitors only see relevant local pages.",
      links: [
        { label: "Petaling Jaya", href: "/website-design/petaling-jaya" },
        { label: "Shah Alam", href: "/website-design/shah-alam" },
        { label: "Subang Jaya", href: "/website-design/subang-jaya" },
        { label: "Johor Bahru", href: "/website-design/johor-bahru" },
        { label: "Penang", href: "/website-design/penang" },
        { label: "Kuching", href: "/website-design/kuching" },
      ],
    }
      : isSingapore
        ? {
      label: "Singapore area pages",
      title: "Related Singapore website design pages",
      description: "Area links stay focused on Singapore so visitors only see relevant neighbourhood pages.",
      links: [
        { label: "Orchard", href: "/website-design/singapore/orchard" },
        { label: "Tampines", href: "/website-design/singapore/tampines" },
        { label: "Jurong", href: "/website-design/singapore/jurong" },
        { label: "Woodlands", href: "/website-design/singapore/woodlands" },
        { label: "Toa Payoh", href: "/website-design/singapore/toa-payoh" },
      ],
    }
        : null;
  const heroProofPoints = isCityPage
    ? [
      `${cityName} service-area positioning`,
      "Quote, booking, call, or enquiry CTA included",
      "Nearby area and FAQ sections prepared",
      "Upgrade path for more pages or a custom website build",
    ]
    : [
      "Managed monthly website setup",
      "Contact form and enquiry CTA included",
      "SEO title, meta description, and local sections",
      "Upgrade path for more pages or a custom website build",
    ];
  const heroSupportCards = [
    {
      label: "Best for",
      value: isCityPage
        ? `Service businesses targeting ${cityName} and nearby areas`
        : `${marketLabel} businesses that need a clearer enquiry path`,
    },
    {
      label: "Included",
      value: isCityPage
        ? "City copy, service sections, nearby areas, and working enquiry CTAs"
        : "Website preview, enquiry CTA, SEO title, and local sections",
    },
    {
      label: "Next step",
      value: "Generate the first preview, then choose the managed package",
    },
  ];
  const marketSwitcherLinks = [
    { label: "UK", href: "/website-subscription-service/uk" },
    { label: "Malaysia", href: "/website-subscription-service/malaysia" },
    { label: "Singapore", href: "/website-subscription-service/singapore" },
  ];
  const footerColumns = [
    {
      title: "Services",
      links: [
        { label: "Website Subscription Service", href: "/website-subscription-service" },
        { label: "Managed Website Plans", href: "/pay-monthly-websites" },
        { label: "Portfolio", href: "/portfolio" },
      ],
    },
    {
      title: "Markets",
      links: marketSwitcherLinks,
    },
    {
      title: "Local SEO Pages",
      links: [
        { label: "Website Design London", href: "/website-design/london" },
        { label: "Website Design Kuala Lumpur", href: "/website-design/kuala-lumpur" },
        { label: "Website Design Singapore", href: "/website-design/singapore" },
        { label: "Website Design Petaling Jaya", href: "/website-design/petaling-jaya" },
        { label: "Website Design Orchard", href: "/website-design/singapore/orchard" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "/privacy-policy" },
        { label: "Cookie Policy", href: "/cookie-policy" },
        { label: "Terms of Service", href: "/terms-of-service" },
        { label: "Subprocessor List", href: "/subprocessors" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <Helmet>
        <title>{page.seoTitle}</title>
        <meta name="description" content={page.metaDescription} />
        {page.status === "draft" && <meta name="robots" content="noindex,nofollow" />}
        <link rel="canonical" href={`https://app.bennietay.com${page.path}/`} />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
      </Helmet>

      <PublicSiteHeader />

      <main>
        <section className="relative overflow-hidden px-5 py-10 lg:py-14">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_10%,rgba(79,70,229,0.18),transparent_32%),linear-gradient(135deg,#ffffff_0%,#f8fafc_52%,#eef2ff_100%)]" />
          <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                <Link to="/" className="hover:text-indigo-600">Home</Link>
                <span>/</span>
                <span>{page.h1}</span>
              </nav>
              <Badge className="mb-4 border-indigo-100 bg-indigo-50 px-4 py-1.5 text-indigo-700">
                {page.eyebrow}
              </Badge>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl leading-[0.95]">
                {page.h1}
              </h1>
              <p className="mt-5 max-w-3xl text-base font-semibold leading-relaxed text-slate-600 sm:text-lg">
                {page.heroCopy}
              </p>
              <div className="mt-7 flex flex-col gap-4 sm:flex-row">
                <Button onClick={() => navigate("/generate-preview")} className="h-14 rounded-2xl bg-indigo-600 px-8 text-sm font-black uppercase tracking-widest">
                  {page.primaryCta} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/book-demo")}
                  className="h-14 rounded-2xl border-2 px-8 text-sm font-black uppercase tracking-widest text-indigo-600"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {page.whatsappCta}
                </Button>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {heroProofPoints.map((point) => (
                  <div key={point} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm">
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-600">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-indigo-100/60">
              <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white lg:min-h-[360px]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600">
                    <Rocket className="h-5 w-5 text-white" />
                  </div>
                  <p className="mt-7 text-[10px] font-black uppercase tracking-[0.25em] text-indigo-300">
                    {isCityPage ? `${cityName} launch focus` : "Recommended setup"}
                  </p>
                  <h2 className="mt-3 text-2xl font-black leading-tight text-white">
                    {isCityPage
                      ? `Build a website that helps ${cityName} visitors contact you faster.`
                      : "Preview first. Launch after the right package is selected."}
                  </h2>
                  <p className="mt-4 text-sm font-medium leading-relaxed text-slate-200">
                    {page.marketWhy}
                  </p>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {heroSupportCards.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600">{item.label}</p>
                <p className="mt-2 text-sm font-black leading-relaxed text-slate-800">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {packageOptions.map((plan) => (
              <div key={plan.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{plan.label}</p>
                    <p className="mt-2 text-xl font-black text-slate-950">{plan.name}</p>
                  </div>
                  <p className="rounded-full bg-slate-950 px-3 py-1 text-sm font-black text-white">{plan.price}</p>
                </div>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">{plan.description}</p>
              </div>
            ))}
          </div>
          </div>
        </section>

        {isCountryPage && (
          <section className="px-5 pb-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
              <div>
                <Badge className="mb-3 bg-indigo-50 text-indigo-700">Other markets</Badge>
                <h2 className="text-2xl font-black text-slate-950">Compare website subscription pages by market</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {marketSwitcherLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                      link.label === marketLabel
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {isCityPage && (
          <section className="px-5 py-8">
            <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { label: "City focus", value: `${cityName} service buyers need trust, speed, and a clear next step.`, icon: MapPin },
                  { label: "Suggested structure", value: "Home, services, proof, FAQs, nearby areas, and contact.", icon: FileText },
                  { label: "Lead path", value: "Quote request, booking, phone, WhatsApp, or enquiry form.", icon: PhoneCall },
                  { label: "SEO angle", value: `Service keywords, ${cityName} intent, nearby areas, and local FAQs.`, icon: Search },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-slate-50 p-5">
                    <item.icon className="mb-4 h-6 w-6 text-indigo-600" />
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600">{item.label}</p>
                    <p className="mt-3 text-sm font-bold leading-relaxed text-slate-700">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="px-5 py-10">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <Shield className="mb-6 h-8 w-8 text-indigo-600" />
              <h2 className="text-2xl font-black">{isCityPage ? `${cityName} Website Setup` : "The Offer"}</h2>
              <p className="mt-4 text-base font-medium leading-relaxed text-slate-600">{page.offer}</p>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
              <Sparkles className="mb-6 h-8 w-8 text-indigo-600" />
              <h2 className="text-2xl font-black">{isCityPage ? `Best Fit in ${cityName}` : "Who It Is For"}</h2>
              <ul className="mt-4 space-y-3">
                {page.whoFor.map((item) => (
                  <li key={item} className="flex gap-3 text-sm font-bold text-slate-700">
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-xl shadow-slate-200">
              <Globe className="mb-6 h-8 w-8 text-white" />
              <h2 className="text-2xl font-black text-white">Pricing Reference</h2>
              <p className="mt-4 text-base font-semibold leading-relaxed text-slate-200">{page.pricingNote}</p>
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <Badge className="mb-4 bg-indigo-50 text-indigo-700">SEO landing page structure</Badge>
                <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                  {isCityPage ? `Built as a focused ${cityName} service page` : "Built as a focused search landing page"}
                </h2>
                <p className="mt-5 text-base font-semibold leading-relaxed text-slate-600">
                  {isCityPage
                    ? `This page is structured around ${cityName} buyer intent, relevant service sections, nearby area wording, local FAQs, package options, and a direct enquiry path.`
                    : "Each page has a clear H1, local or market-specific copy, package options, FAQs, internal links, demo examples, and a direct start CTA. The goal is useful search content, not thin city-name swapping."}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { title: "Search intent", copy: "Targets pay-monthly websites, website subscription, and city website design terms.", icon: Search },
                  { title: "Buyer clarity", copy: "Explains who the package is for, pricing context, and what happens after preview.", icon: FileText },
                  { title: "Local relevance", copy: "Includes service-area expectations, nearby market language, and local enquiry behaviour.", icon: MapPin },
                  { title: "Sales path", copy: "Moves visitors towards preview generation, package selection, or a book-call path.", icon: Rocket },
                ].map((item) => (
                  <div key={item.title} className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
                    <item.icon className="mb-5 h-7 w-7 text-indigo-600" />
                    <h3 className="text-xl font-black text-slate-950">{item.title}</h3>
                    <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">{item.copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 text-center">
              <Badge className="mb-4 bg-indigo-50 text-indigo-700">Choose your starting point</Badge>
              <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Simple managed website options</h2>
              <p className="mx-auto mt-4 max-w-2xl text-base font-semibold text-slate-600">
                Start with a managed website or add ongoing growth support. Prices are shown in {coreOffer.prices[revenueMarket].currency}. Generate a preview first, then choose the right path.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {packageOptions.map((plan, index) => (
                <div
                  key={plan.name}
                  className={`rounded-[2rem] border bg-white p-7 shadow-sm ${index === 1 ? "border-indigo-300 shadow-indigo-100 ring-4 ring-indigo-50" : "border-slate-200"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600">{plan.label}</p>
                      <h3 className="mt-2 text-2xl font-black text-slate-950">{plan.name}</h3>
                    </div>
                    {index === 1 && <Badge className="bg-indigo-600 text-white">Popular</Badge>}
                  </div>
                  <p className="mt-5 text-4xl font-black text-slate-950">{plan.price}</p>
                  <p className="mt-4 min-h-[72px] text-sm font-semibold leading-relaxed text-slate-600">{plan.description}</p>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-3 text-sm font-bold text-slate-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => {
                      localStorage.setItem("bt_checkout_intent", JSON.stringify({ productSlug: plan.id, market: revenueMarket, currency: coreOffer.prices[revenueMarket].currency, billingCycle: "monthly", savedAt: new Date().toISOString() }));
                      navigate("/generate-preview");
                    }}
                    className={`mt-7 h-12 w-full rounded-xl font-black ${index === 1 ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-950 hover:bg-indigo-600"}`}
                  >
                    Generate Preview
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-7 rounded-[2rem] border border-indigo-200 bg-indigo-50 p-6 shadow-sm lg:flex lg:items-center lg:justify-between lg:gap-8">
              <div>
                <Badge className="border-0 bg-indigo-600 text-white">Core managed service</Badge>
                <h3 className="mt-4 text-2xl font-black text-slate-950">{coreOffer.name}</h3>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                  Bennie Studio leads the strategy, copy, build, tracking, and monthly improvements. This is for businesses that want an accountable growth partner, not another website tool.
                </p>
              </div>
              <div className="mt-5 shrink-0 lg:mt-0 lg:text-right">
                <p className="text-3xl font-black text-slate-950">{coreOffer.monthlyLabel}<span className="text-sm text-slate-500">/month</span></p>
                <p className="mt-1 text-xs font-bold text-slate-500">plus {coreOffer.setupLabel} setup</p>
                <Button onClick={() => navigate("/book-demo")} className="mt-4 h-12 rounded-xl bg-slate-950 px-6 font-black hover:bg-indigo-600">
                  Book a Growth Call
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-10">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <Badge className="mb-4 bg-indigo-50 text-indigo-700">Local relevance</Badge>
              <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
                {isCityPage ? `Built for ${cityName} enquiries` : "Built for the way this market buys"}
              </h2>
              <p className="mt-5 text-base font-semibold leading-relaxed text-slate-600">
                {isCityPage
                  ? `The page highlights the parts that matter for ${cityName} searches: services, nearby areas, trust cues, working CTAs, and clear contact options.`
                  : "These pages are written for real local intent: nearby areas, service categories, enquiry paths, and trust signals that help small businesses look credible."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {page.localInputs.map((input) => (
                <div key={input} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                  <span className="text-sm font-bold leading-relaxed text-slate-700">{input}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50 px-5 py-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <Badge className="mb-4 bg-white text-indigo-600">Demo examples</Badge>
                <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Website examples for this market</h2>
              </div>
              <Button onClick={() => navigate("/portfolio")} variant="outline" className="h-12 rounded-xl font-black">
                View Demo Library
              </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {page.examples.map((example) => (
                <div key={example.industry} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600">{example.industry}</p>
                  <h3 className="mt-4 text-2xl font-black">{example.plan}</h3>
                  <p className="mt-3 text-sm font-semibold text-slate-600">{example.pages}</p>
                  <p className="mt-5 rounded-2xl bg-indigo-50 p-4 text-sm font-bold text-indigo-700">{example.localSeo}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-12">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.75fr_1.25fr]">
            <div>
              <Badge className="mb-4 bg-indigo-50 text-indigo-700">Common questions</Badge>
              <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Questions buyers ask before starting</h2>
              <div className="mt-8 flex flex-wrap gap-3">
                {page.links.map((link) => (
                  <Link key={link.href} to={link.href} className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 hover:border-indigo-200 hover:text-indigo-600">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="space-y-5">
              {page.faqs.map((faq) => (
                <div key={faq.question} className="rounded-[1.5rem] border border-slate-200 bg-white p-6">
                  <h3 className="text-lg font-black text-slate-950">{faq.question}</h3>
                  <p className="mt-3 text-base font-medium leading-relaxed text-slate-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {relatedLocationPages && (
          <section className="bg-white px-5 py-10">
            <div className="mx-auto max-w-7xl">
              <div className="mb-8 text-center">
                <Badge className="mb-4 bg-indigo-50 text-indigo-700">{relatedLocationPages.label}</Badge>
                <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">{relatedLocationPages.title}</h2>
                <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-relaxed text-slate-600">
                  {relatedLocationPages.description}
                </p>
              </div>
              <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-3 rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
                {relatedLocationPages.links.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="bg-slate-950 px-5 py-14 text-white">
            <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
              <PhoneCall className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-4xl font-black tracking-tight text-white sm:text-6xl">Ready to launch a clearer business website?</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-semibold leading-relaxed text-indigo-50">
              Start with a monthly website plan, then add pages, locations, and support as your business grows.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <Button onClick={() => navigate("/generate-preview")} className="h-14 rounded-2xl bg-white px-8 text-sm font-black uppercase tracking-widest text-indigo-600 hover:bg-slate-950 hover:text-white">
                {page.primaryCta}
              </Button>
              <Button onClick={() => navigate("/book-demo")} variant="outline" className="h-14 rounded-2xl border-white/30 bg-white/10 px-8 text-sm font-black uppercase tracking-widest text-white hover:bg-white hover:text-indigo-600">
                Book a Call
              </Button>
            </div>
          </div>
        </section>

        <footer className="hidden border-t border-slate-200 bg-white px-5 py-12">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.15fr_2fr]">
            <div>
              <button onClick={() => navigate("/")} className="flex items-center gap-2 bg-transparent border-0 p-0 cursor-pointer">
                <Globe className="h-7 w-7 text-indigo-600" />
                <span className="text-xl font-black text-slate-950">Bennie Studio</span>
              </button>
              <p className="mt-4 max-w-md text-sm font-semibold leading-relaxed text-slate-600">
                Managed website subscriptions for small businesses that want a professional website, enquiry flow, hosting, support, and a clear upgrade path when they grow.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {footerColumns.map((column) => (
                <div key={column.title}>
                  <h3 className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">{column.title}</h3>
                  <div className="mt-4 space-y-3">
                    {column.links.map((link) => (
                      <Link key={link.href} to={link.href} className="block text-sm font-bold text-slate-600 hover:text-indigo-600">
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-slate-200 pt-6 text-xs font-bold text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Bennie Studio. All rights reserved.</p>
            <p>Professional websites for small businesses, built and managed for one monthly fee.</p>
          </div>
        </footer>
        <PublicSiteFooter />
      </main>
    </div>
  );
}
