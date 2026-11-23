import React from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Globe, MessageSquare, MapPin, PhoneCall, Search, FileText } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { findOwnSalesSeoPage } from "../constants/ownSalesSeoPages";
import { COMMERCIAL_FALLBACK_PRODUCTS, formatCommercialMoney, getCommercialPrice, type CommercialMarket } from "../lib/commercialPricing";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";
import { TemplatePreviewThumbnail } from "./TemplatePreviewThumbnail";
import { usePublishedPlatformCms } from "../lib/platformSiteCms";
import { PlatformCmsFinalCta, PlatformCmsSections } from "./PlatformCmsSections";

const sanitizeLegacyCommercialCopy = <T,>(value: T): T => {
  if (typeof value === "string") {
    return (value
      .replace(/Growth Partner/g, "__GROWTH_PARTNER__")
      .replace(/Website Growth/g, "__WEBSITE_GROWTH__")
      .replace(/\$49(?:\/month)?/g, "premium scope pricing")
      .replace(/\$99(?:\/month)?/g, "premium scope pricing")
      .replace(/\$199(?:\/month)?/g, "premium scope pricing")
      .replace(/RM199(?:\/month)?/g, "current package pricing")
      .replace(/RM399(?:\/month)?/g, "current package pricing")
      .replace(/RM799(?:\/month)?/g, "current package pricing")
      .replace(/£49(?:\/month)?/g, "current package pricing")
      .replace(/£99(?:\/month)?/g, "current package pricing")
      .replace(/£199(?:\/month)?/g, "current package pricing")
      .replace(/£1,990(?:\/month)?/g, "current GBP catalogue pricing")
      .replace(/14[- ]day(?: free)? trial/gi, "free website preview")
      .replace(/card[- ]required trial/gi, "free website preview")
      .replace(/free trial/gi, "free website preview")
      .replace(/Starter/g, "Managed Website")
      .replace(/\bBusiness\b/g, "Managed Website")
      .replace(/Authority/g, "Growth Partner")
      .replace(/Scale/g, "Website Growth")
      .replace(/\bGrowth\b/g, "Website Growth")
      .replace(/__GROWTH_PARTNER__/g, "Growth Partner")
      .replace(/__WEBSITE_GROWTH__/g, "Website Growth")
      ) as T;
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
  const cms = usePublishedPlatformCms();
  const pageCms = cms.pages[location.pathname];
  const page = sanitizeLegacyCommercialCopy(findOwnSalesSeoPage(location.pathname));

  if (!page) return <Navigate to="/" replace />;
  const cmsHeading = pageCms?.heroTitle || page.h1;

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
      { "@type": "ListItem", position: 2, name: cmsHeading, item: `https://app.bennietay.com${page.path}/` },
    ],
  };

  const isUk = page.path.includes("/uk") || /UK|London|Manchester|Birmingham|Leeds|Bristol|Glasgow/.test(page.h1);
  const isMalaysia = page.path.includes("malaysia") || /Malaysia|Kuala Lumpur|Petaling Jaya|Shah Alam|Subang Jaya|Johor Bahru|Penang|Kuching/.test(page.h1);
  const isSingapore = page.path.includes("singapore") || /Singapore|Orchard|Tampines|Jurong|Woodlands|Toa Payoh/.test(page.h1);
  const marketLabel = isUk ? "UK" : isMalaysia ? "Malaysia" : isSingapore ? "Singapore" : "your market";
  const isCityPage = page.path.startsWith("/website-design/");
  const isCountryPage = page.path.startsWith("/website-subscription-service/") && ["UK", "Malaysia", "Singapore"].includes(marketLabel);
  const cityName = isCityPage ? page.h1.replace(/^Website Design\s+/i, "") : marketLabel;
  const revenueMarket: CommercialMarket = "INTL";
  const managedProduct = COMMERCIAL_FALLBACK_PRODUCTS.find((product) => product.slug === "managed-website")!;
  const managedPrice = getCommercialPrice(managedProduct, revenueMarket)!;
  const coreOffer = { name: managedProduct.name, description: managedProduct.description, monthlyLabel: formatCommercialMoney(managedPrice.monthlyPrice, managedPrice.currency), setupLabel: formatCommercialMoney(managedPrice.setupFee, managedPrice.currency), prices: { [revenueMarket]: { currency: managedPrice.currency } } } as any;
  const packageOptions = COMMERCIAL_FALLBACK_PRODUCTS
    .filter((product) => ["managed-website", "website-growth", "growth-partner"].includes(product.slug))
    .map((product) => {
      const price = getCommercialPrice(product, revenueMarket)!;
      const planMeta = product.slug === "managed-website"
        ? {
            label: "Starting point",
            features: ["Hosting and SSL", "Conversion-focused structure", "WhatsApp and enquiry paths", "Managed updates"],
          }
        : product.slug === "website-growth"
          ? {
              label: "Recommended",
              features: ["Monthly conversion optimisation", "Local SEO expansion", "Landing and location pages", "Priority support"],
            }
          : {
              label: "For deeper growth",
              features: ["Ongoing growth planning", "Advanced conversion work", "Campaign landing pages", "Strategic reviews"],
            };
      return {
        id: product.slug,
        name: product.name,
        price: `${formatCommercialMoney(price.monthlyPrice, price.currency)}/mo`,
        setupPrice: formatCommercialMoney(price.setupFee, price.currency),
        description: product.description,
        ...planMeta,
      };
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
      itemListElement: packageOptions.map((plan) => ({
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
  const marketSwitcherLinks: Array<{ label: string; href: string }> = [];
  const footerColumns = [
    {
      title: "Services",
      links: [
        { label: "Website Subscription Service", href: "/website-subscription-service" },
        { label: "Managed Website Plans", href: "/pricing" },
        { label: "Website Preview", href: "/generate-preview" },
        { label: "Portfolio", href: "/portfolio" },
      ],
    },
    {
      title: "Explore",
      links: [
        { label: "How It Works", href: "/how-it-works" },
        { label: "Case Studies", href: "/case-studies" },
        { label: "Website Audit", href: "/website-audit" },
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
    <div className="brand-public min-h-screen overflow-x-hidden bg-[#f8f8f5] text-[#141821]">
      <Helmet>
        <title>{pageCms?.seoTitle || page.seoTitle}</title>
        <meta name="description" content={pageCms?.seoDescription || page.metaDescription} />
        {pageCms?.noIndex && <meta name="robots" content="noindex,nofollow" />}
        <meta property="og:title" content={pageCms?.seoTitle || page.seoTitle} />
        <meta property="og:description" content={pageCms?.seoDescription || page.metaDescription} />
        {pageCms?.ogImage && <meta property="og:image" content={pageCms.ogImage} />}
        {page.status === "draft" && <meta name="robots" content="noindex,nofollow" />}
        {/* Keep canonical URLs aligned with the no-trailing-slash paths published in sitemap.xml. */}
        <link rel="canonical" href={pageCms?.canonicalUrl || `https://app.bennietay.com${page.path.replace(/\/$/, "") || "/"}`} />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(serviceSchema)}</script>
      </Helmet>

      <PublicSiteHeader />

      <main id="main-content">
        <section className="relative overflow-hidden border-b border-[#dfe3e8] bg-[#f8f8f5] text-[#15191f]">
          
          <div className="brand-shell relative grid min-w-0 gap-10 py-14 sm:py-20 lg:grid-cols-12 lg:items-center lg:gap-14">
            <div className="lg:col-span-5">
              <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold !text-[#5e6b79]">
                <Link to="/" className="hover:!text-[#1741ed]">Home</Link><span>/</span><span>{cmsHeading}</span>
              </nav>
              
              <h1 className="mt-5 max-w-[16ch] !text-[#15191f]">{cmsHeading}</h1>
              <p className="brand-copy !text-[#526071] mt-6">{pageCms?.heroDescription || page.heroCopy}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button onClick={() => navigate(pageCms?.primaryCtaHref || "/generate-preview")} className="min-h-12 rounded-lg bg-[#1741ed] px-6 py-3 font-bold text-white hover:bg-[#1035c2]">
                  {pageCms?.primaryCtaLabel || page.primaryCta} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => navigate("/book-demo")} className="min-h-12 rounded-lg border-[#bfc7d3] bg-white px-6 py-3 font-bold text-[#1741c9] hover:bg-[#e6ebff] hover:text-[#1741ed]">
                  <MessageSquare className="mr-2 h-4 w-4" /> {page.whatsappCta}
                </Button>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#526071]">
                {heroProofPoints.slice(0,3).map((point) => <span key={point} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[#b9b1ff]" />{point}</span>)}
              </div>
            </div>

            <div className="min-w-0 lg:col-span-7"><div className="rounded-2xl border border-[#dbe1ea] bg-[#1741ed] p-4 sm:p-6"><div className="overflow-hidden rounded-lg bg-white p-2 shadow-[0_24px_55px_-24px_rgba(4,18,66,.5)]"><TemplatePreviewThumbnail templateId="managed-website-agency-v1" templateName="Managed website service" className="min-h-[280px] sm:h-[390px]" /></div><p className="mt-5 text-xs font-medium leading-5 !text-white/90">Illustrative studio-built concept · Not commissioned client work</p></div></div>
          </div>
          <div className="border-t border-[#dfe3e8] bg-white">
            <div className="brand-shell grid gap-px md:grid-cols-3">
              {heroSupportCards.map((item) => (
                <div key={item.label} className="border-[#dfe3e8] py-5 md:border-r md:px-5 first:pl-0 last:border-r-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] !text-[#1741ed]">{item.label}</p>
                  <p className="mt-2 max-w-sm text-sm font-semibold !text-[#15191f]/70">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {isCountryPage && (
          <section className="px-5 pb-8">
            <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
              <div>
                <Badge className="mb-3 bg-indigo-50 text-indigo-700">Other markets</Badge>
                <h2 className="text-2xl font-bold text-slate-950">Compare website subscription pages by market</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {marketSwitcherLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
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
            <div className="mx-auto max-w-7xl rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { label: "City focus", value: `${cityName} service buyers need trust, speed, and a clear next step.`, icon: MapPin },
                  { label: "Content architecture", value: "The page mix is tailored around services, proof, local intent, and the preferred enquiry path.", icon: FileText },
                  { label: "Lead path", value: "Quote request, booking, phone, WhatsApp, or enquiry form.", icon: PhoneCall },
                  { label: "SEO angle", value: `Service keywords, ${cityName} intent, nearby areas, and local FAQs.`, icon: Search },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-slate-50 p-5">
                    <item.icon className="mb-4 h-6 w-6 text-indigo-600" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-600">{item.label}</p>
                    <p className="mt-3 text-sm font-bold leading-relaxed text-slate-700">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="brand-shell py-14 sm:py-20" aria-labelledby="seo-offer-heading">
          <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] lg:gap-14">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1741ed]">01 · The managed approach</p>
              <h2 id="seo-offer-heading" className="mt-4 max-w-xl text-3xl font-bold leading-tight tracking-tight text-[#15191f] sm:text-4xl">{isCityPage ? `${cityName} website setup, made manageable.` : "A website with the important details taken care of."}</h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-[#526071]">{page.offer}</p>
              <div className="mt-6 border-t border-[#dbe1ea] pt-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1741ed]">Pricing context</p>
                <p className="mt-3 text-sm leading-7 text-[#526071]">{page.pricingNote}</p>
                <Link to="/pricing" className="mt-4 inline-flex items-center text-sm font-bold text-[#1741c9] underline underline-offset-4 hover:text-[#1035a2]">Review current plans <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </div>
            </div>
            <div className="min-w-0 border-t border-[#dbe1ea]">
              <p className="py-4 text-xs font-bold uppercase tracking-[0.14em] text-[#526071]">Who this service is suited to</p>
              {page.whoFor.map((item,index)=>(
                <div key={item} className="flex min-w-0 items-start gap-5 border-t border-[#dbe1ea] py-5">
                  <span className="shrink-0 text-sm font-bold text-[#1741ed]">{String(index+1).padStart(2,"0")}</span>
                  <p className="text-base leading-7 text-[#25364b]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#dfe2ea] bg-white">
          <div className="brand-shell brand-section">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                
                <h2 className="mt-4">Choose the level of ongoing support, not a rigid website template.</h2>
                <p className="brand-copy mt-5">The page count and structure can vary by scope. The plans mainly change how much optimisation, local SEO and growth support continues after launch.</p>
              </div>
              <p className="text-sm font-semibold text-[#707b8a] lg:col-span-5 lg:text-right">Prices shown in {coreOffer.prices[revenueMarket].currency} · preview before commitment</p>
            </div>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {packageOptions.map((plan) => {
                const isGrowth = plan.id === "website-growth";
                return (
                  <article key={plan.id} className={isGrowth ? "border border-[#101827] bg-[#101827] p-6 text-white shadow-[0_28px_80px_-48px_rgba(15,23,42,.75)]" : "border border-[#dfe2ea] bg-white p-6"}>
                    <p className={isGrowth ? "text-xs font-semibold uppercase tracking-[0.08em] !text-[#b9b1ff]" : "text-xs font-semibold uppercase tracking-[0.08em] text-[#5746e8]"}>{plan.label}</p>
                    <h3 className={isGrowth ? "mt-2 !text-white" : "mt-2"}>{plan.name}</h3>
                    <p className={isGrowth ? "mt-5 text-3xl font-semibold !text-white" : "mt-5 text-3xl font-semibold text-[#141821]"}>{plan.price}</p>
                    <p className={isGrowth ? "mt-1 text-sm !text-white/75" : "mt-1 text-sm text-[#707b8a]"}>+ {plan.setupPrice} setup</p>
                    <p className={isGrowth ? "mt-4 text-sm leading-6 !text-white/70" : "mt-4 text-sm leading-6 text-[#526071]"}>{plan.description}</p>
                    <div className={isGrowth ? "mt-5 space-y-3 border-t border-white/25 pt-4" : "mt-5 space-y-3 border-t border-[#dfe2ea] pt-4"}>
                      {plan.features.map((feature) => <div key={feature} className={isGrowth ? "flex gap-2 text-sm !text-white/80" : "flex gap-2 text-sm text-[#526071]"}><Check className={isGrowth ? "mt-0.5 h-4 w-4 shrink-0 text-[#b9b1ff]" : "mt-0.5 h-4 w-4 shrink-0 text-emerald-600"} /><span>{feature}</span></div>)}
                    </div>
                    <Button onClick={()=>{localStorage.setItem("bt_checkout_intent",JSON.stringify({productSlug:plan.id,market:revenueMarket,currency:coreOffer.prices[revenueMarket].currency,billingCycle:"monthly",savedAt:new Date().toISOString()}));navigate("/generate-preview");}} className={isGrowth ? "mt-6 min-h-12 w-full bg-white px-5 font-semibold text-[#101827] hover:bg-[#eeebff]" : "mt-6 min-h-12 w-full bg-[#141821] px-5 font-semibold text-white hover:bg-[#5746e8]"}>
                      See website direction <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-5 py-14">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              
              <h2 className="mt-4">{isCityPage ? "Built for " + cityName + " enquiries" : "Built for the way this market buys"}</h2>
              <p className="brand-copy mt-5">{isCityPage ? "The page focuses on the services, nearby areas, trust cues and contact options that matter for " + cityName + " searches." : "The page is written for real local intent: relevant services, nearby areas, trust signals and a direct enquiry path."}</p>
            </div>
            <div className="brand-rule-list lg:col-span-7">
              {page.localInputs.map((input)=><div key={input} className="flex items-start gap-3 border-b border-[#d8d9dc] py-5"><MapPin className="mt-1 h-4 w-4 shrink-0 text-[#5746e8]"/><span className="text-[#526071]">{input}</span></div>)}
            </div>
          </div>
        </section>

        
        <section className="border-y border-[#d8d9dc] bg-white px-5 py-14">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
              <div className="lg:col-span-7">
                
                <h2 className="mt-4">Website directions for this market.</h2>
              </div>
              <Button onClick={()=>navigate("/case-studies")} variant="outline" className="min-h-11 lg:col-span-5 lg:justify-self-end">View example library</Button>
            </div>
            <div className="mt-8 border-t border-[#d8d9dc]">
              {page.examples.map((example)=>(
                <div key={example.industry} className="grid gap-4 border-b border-[#d8d9dc] py-6 md:grid-cols-[1fr_1fr_1.4fr]">
                  <h3>{example.industry}</h3>
                  <p className="font-semibold">{example.plan}</p>
                  <div><p className="text-sm text-[#526071]">{example.pages}</p><p className="mt-2 text-sm font-semibold text-[#5746e8]">{example.localSeo}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        
        <section className="px-5 py-14">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              
              <h2 className="mt-4">Questions buyers ask before starting.</h2>
              <div className="mt-6 flex flex-wrap gap-2">{page.links.map((link)=><Link key={link.href} to={link.href} className="border border-[#d8d9dc] bg-white px-3 py-2 text-sm font-semibold text-[#526071]">{link.label}</Link>)}</div>
            </div>
            <div className="border-t border-[#d8d9dc] lg:col-span-8">
              {page.faqs.map((faq)=>(
                <details key={faq.question} className="border-b border-[#d8d9dc] py-5">
                  <summary className="cursor-pointer text-lg font-semibold">{faq.question}</summary>
                  <p className="mt-4 max-w-2xl text-[#526071]">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {relatedLocationPages && (
          <section className="bg-white px-5 py-10">
            <div className="mx-auto max-w-7xl">
              <div className="mb-8 text-center">
                <Badge className="mb-4 bg-indigo-50 text-indigo-700">{relatedLocationPages.label}</Badge>
                <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{relatedLocationPages.title}</h2>
                <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-relaxed text-slate-600">
                  {relatedLocationPages.description}
                </p>
              </div>
              <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5">
                {relatedLocationPages.links.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="bg-[#1741ed] px-5 py-14 text-white">
            <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-lg border border-white/30 bg-white/10">
              <PhoneCall className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-4xl">Ready to launch a clearer business website?</h2>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/85">
              Start with a monthly website plan, then add pages, locations, and support as your business grows.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <Button onClick={() => navigate("/generate-preview")} className="min-h-12 rounded-lg bg-white px-7 py-3 text-sm font-bold text-[#1741c9] hover:bg-[#eef3ff]">
                {page.primaryCta}
              </Button>
              <Button onClick={() => navigate("/book-demo")} variant="outline" className="min-h-12 rounded-lg border-white/30 bg-white/10 px-7 py-3 text-sm font-bold text-white hover:bg-white hover:text-[#1741c9]">
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
                <span className="text-xl font-bold text-slate-950">Bennie Studio</span>
              </button>
              <p className="mt-4 max-w-md text-sm font-semibold leading-relaxed text-slate-600">
                Managed website subscriptions for small businesses that want a professional website, enquiry flow, hosting, support, and a clear upgrade path when they grow.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {footerColumns.map((column) => (
                <div key={column.title}>
                  <h3 className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">{column.title}</h3>
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
        <PlatformCmsFinalCta path={location.pathname} />
        <PlatformCmsSections path={location.pathname} />
        <PublicSiteFooter />
      </main>
    </div>
  );
}
