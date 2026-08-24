/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion, useScroll, useTransform } from "motion/react";
import {
  Globe,
  ArrowRight,
  Zap,
  Shield,
  BarChart3,
  Users,
  Star,
  HelpCircle,
  X,
  Sparkles,
  Check,
  TrendingUp,
  Home,
  Heart,
  Building,
  Search,
  Mail,
  MessageCircle,
  Cookie,
  ExternalLink,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Helmet } from "react-helmet-async";
import { cn } from "@/src/lib/utils";
import { Pricing } from "./Pricing";
import { DEFAULT_LANDING_CONTENT } from "../constants/landingPageContent";
import { SafeImage } from "./SafeImage";
import { useGeoPricing } from "../hooks/useGeoPricing";
import { trackPublicEvent } from "../lib/publicTracking";
import { BENNIE_ECOSYSTEM_LINKS } from "../constants/businessEcosystem";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";
import { countryToRevenueMarket, getOfferForMarket } from "../constants/revenueOffer";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const imageHover = {
  hover: { scale: 1.02, transition: { duration: 0.4, ease: "easeOut" } }
};

const buildWhatsAppHref = (rawValue?: string, message?: string) => {
  const value = rawValue?.trim();
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) return value;

  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";

  const text = message?.trim()
    ? `?text=${encodeURIComponent(message.trim())}`
    : "";
  return `https://wa.me/${digits}${text}`;
};

const SALES_COOKIE_CONSENT_KEY = "bt_sales_cookie_consent";
const SALES_COOKIE_CONSENT_VERSION = "uk-sales-consent-v1";

type SalesCookieConsent = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: string;
};

export default function LandingPage() {
  const { user, error, clearError } = useAuth();
  const navigate = useNavigate();
  const geoPricing = useGeoPricing();
  const { scrollY } = useScroll();
  const [content, setContent] = React.useState<any>(null);
  const [platformPolicies, setPlatformPolicies] = React.useState<any[]>([]);
  const [blogPosts, setBlogPosts] = React.useState<any[]>([]);
  const [platformSettings, setPlatformSettings] = React.useState<any>(null);
  const [showCookiePreferences, setShowCookiePreferences] = React.useState(false);
  const [cookieDraft, setCookieDraft] = React.useState<SalesCookieConsent>({
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
    timestamp: "",
    version: SALES_COOKIE_CONSENT_VERSION,
  });
  const [salesCookieConsent, setSalesCookieConsent] =
    React.useState<SalesCookieConsent | null>(() => {
      if (typeof window === "undefined") return null;
      try {
        const stored = window.localStorage.getItem(SALES_COOKIE_CONSENT_KEY);
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        if (parsed?.version !== SALES_COOKIE_CONSENT_VERSION) return null;
        return {
          necessary: true,
          functional: Boolean(parsed.functional),
          analytics: Boolean(parsed.analytics),
          marketing: Boolean(parsed.marketing),
          timestamp: parsed.timestamp || "",
          version: SALES_COOKIE_CONSENT_VERSION,
        };
      } catch {
        return null;
      }
    });

  const saveSalesCookieConsent = React.useCallback(
    (next: Partial<SalesCookieConsent>) => {
      const payload: SalesCookieConsent = {
        necessary: true,
        functional: Boolean(next.functional),
        analytics: Boolean(next.analytics),
        marketing: Boolean(next.marketing),
        timestamp: new Date().toISOString(),
        version: SALES_COOKIE_CONSENT_VERSION,
      };
      setSalesCookieConsent(payload);
      setCookieDraft(payload);
      setShowCookiePreferences(false);
      try {
        window.localStorage.setItem(
          SALES_COOKIE_CONSENT_KEY,
          JSON.stringify(payload),
        );
      } catch {
        // Consent persistence should not block the page.
      }
    },
    [],
  );

  React.useEffect(() => {
    if (salesCookieConsent) {
      setCookieDraft(salesCookieConsent);
    }
  }, [salesCookieConsent]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const referralCode = params.get("ref")?.trim();
    if (!referralCode) return;

    const visitorId =
      localStorage.getItem("bt_affiliate_visitor_id") ||
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    localStorage.setItem("bt_affiliate_visitor_id", visitorId);
    localStorage.setItem("bt_platform_affiliate_ref", referralCode);

    fetch("/api/affiliate/track-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referralCode,
        visitorId,
        sourceUrl: window.location.href,
      }),
    }).catch(() => {
      // Tracking must never block the landing page.
    });
  }, []);

  const scrollToId = (id: string) => {
    const element = document.getElementById(id.replace("#", "")) || document.querySelector(id);
    if (element) {
      const offset = 100; // Increased offset for better visibility
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    } else if (id === "#") {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  };

  const trackAndNavigate = (
    path: string,
    label: string,
    eventType = "sales_cta_clicked",
  ) => {
    trackPublicEvent({ eventType, label, target: path });
    navigate(path);
  };

  const trackAndScroll = (
    target: string,
    label: string,
    eventType = "sales_cta_clicked",
  ) => {
    trackPublicEvent({ eventType, label, target });
    scrollToId(target);
  };

  const y1 = useTransform(scrollY, [0, 1000], [0, 150]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -100]);
  const y3 = useTransform(scrollY, [0, 1000], [0, 50]);

  const salesWhatsAppHref = buildWhatsAppHref(
    platformSettings?.salesWhatsappLink,
    platformSettings?.salesWhatsappMessage,
  );
  const showSalesWhatsApp =
    platformSettings?.salesWhatsappEnabled !== false && Boolean(salesWhatsAppHref);
  const salesCookieBannerEnabled =
    platformSettings?.salesCookieBannerEnabled !== false;
  const analyticsAllowed =
    !salesCookieBannerEnabled || Boolean(salesCookieConsent?.analytics);
  const marketingAllowed =
    !salesCookieBannerEnabled || Boolean(salesCookieConsent?.marketing);
  const showCookieBanner =
    salesCookieBannerEnabled && (!salesCookieConsent || showCookiePreferences);

  React.useEffect(() => {
    const init = async () => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 5000);

      try {
        const configResponse = await fetch("/api/public/site-config", { signal: controller.signal });
        const siteConfig = configResponse.ok ? await configResponse.json() : null;

        if (siteConfig?.platform) setPlatformSettings(siteConfig.platform);
        if (siteConfig?.landingPage && typeof siteConfig.landingPage === "object") {
          setContent({ ...DEFAULT_LANDING_CONTENT, ...siteConfig.landingPage });
        }
        if (Array.isArray(siteConfig?.policies)) setPlatformPolicies(siteConfig.policies);

        setBlogPosts(Array.isArray(siteConfig?.posts) ? siteConfig.posts : []);
      } catch (err) {
        if (import.meta.env.DEV) {
          console.debug("Landing page optional data unavailable; using defaults.", err);
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    };
    init();
  }, []);

  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const c = React.useMemo(
    () => ({
      ...DEFAULT_LANDING_CONTENT,
      ...(content || {}),
      hero: { ...DEFAULT_LANDING_CONTENT.hero },
      reviewEngine: null,
      reviewCopyExample: null,
      launchModels: { ...DEFAULT_LANDING_CONTENT.launchModels },
      problem: { ...DEFAULT_LANDING_CONTENT.problem },
      whatIsBennieTay: { ...DEFAULT_LANDING_CONTENT.whatIsBennieTay },
      whatYouGet: { ...DEFAULT_LANDING_CONTENT.whatYouGet },
      whoIsItFor: { ...DEFAULT_LANDING_CONTENT.whoIsItFor },
      monthlyService: { ...DEFAULT_LANDING_CONTENT.monthlyService },
      howItWorks: { ...DEFAULT_LANDING_CONTENT.howItWorks },
      comparison: { ...DEFAULT_LANDING_CONTENT.comparison },
      pricing: { ...DEFAULT_LANDING_CONTENT.pricing },
      customServices: {
        ...DEFAULT_LANDING_CONTENT.customServices,
        ...((content || {}).customServices || {}),
        items:
          (content as any)?.customServices?.items ||
          DEFAULT_LANDING_CONTENT.customServices.items,
      },
      faq: { ...DEFAULT_LANDING_CONTENT.faq },
      cta: { ...DEFAULT_LANDING_CONTENT.cta },
      testimonials: null,
      successStory: null,
    }),
    [content],
  );
  const customQuoteMinUsd = Number(c.customServices?.quoteMinUsd || 1500);
  const customQuoteMaxUsd = Number(c.customServices?.quoteMaxUsd || 3500);
  const customWebsiteQuote = geoPricing.formatUsdRange(customQuoteMinUsd, customQuoteMaxUsd, {
    from: true,
    plus: true,
    applyGeoDiscount: false,
  });
  const growthPartnerOffer = getOfferForMarket(
    countryToRevenueMarket(geoPricing.countryCode),
  );
  const salesPageTitle =
    typeof platformSettings?.salesPageTitle === "string" &&
    platformSettings.salesPageTitle.trim()
      ? platformSettings.salesPageTitle.trim()
      : "Bennie Studio";
  const socials = (c.footer?.socials || []).filter(
    (social: any) =>
      typeof social.url === "string" &&
      social.url.trim() &&
      social.url.trim() !== "#",
  );

  const IconComponent = ({
    name,
    className,
  }: {
    name: string;
    className?: string;
  }) => {
    const icons: any = {
      Globe,
      Zap,
      Shield,
      BarChart3,
      Users,
      Star,
      HelpCircle,
      ArrowRight,
      X,
      Home,
      Heart,
      Building,
      Check,
      Search,
      Mail,
    };
    const Icon = icons[name] || Zap;
    return <Icon className={className} />;
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <Helmet>
        <title>{salesPageTitle}</title>
        <meta name="description" content={c.hero.subheadline} />

        {/* Platform GA4 */}
        {analyticsAllowed && platformSettings?.gaMeasurementId && (
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${platformSettings.gaMeasurementId}`}
          />
        )}
        {analyticsAllowed && platformSettings?.gaMeasurementId && (
          <script>
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${platformSettings.gaMeasurementId}');
            `}
          </script>
        )}

        {/* Platform Meta Pixel */}
        {marketingAllowed && platformSettings?.metaPixelId && (
          <script>
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${platformSettings.metaPixelId}');
              fbq('track', 'PageView');
            `}
          </script>
        )}

        {/* Global Platform Header Scripts */}
        {marketingAllowed && platformSettings?.trackingScriptsHeader && (
          <script
            dangerouslySetInnerHTML={{
              __html: platformSettings.trackingScriptsHeader,
            }}
          />
        )}
      </Helmet>
      <PublicSiteHeader />

      {/* Hero */}
      <section className="relative px-4 sm:px-8 pt-8 sm:pt-14 lg:pt-32 pb-12 lg:pb-20 max-w-7xl mx-auto overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <motion.div
            style={{ y: y1 }}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full"
          />
          <motion.div
            style={{ y: y2 }}
            className="absolute bottom-0 left-1/4 w-[600px] h-[400px] bg-purple-500/10 blur-[100px] rounded-full"
          />
          <motion.div
            style={{ y: y3 }}
            className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="relative z-10 min-w-0 text-center lg:text-left"
          >
            <motion.div variants={fadeInUp}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-8 shadow-sm">
                <Zap className="h-4 w-4 text-indigo-600 animate-pulse" />
                <span className="text-xs sm:text-sm font-semibold text-indigo-600 tracking-wide uppercase">
                  {c.hero.badge}
                </span>
              </div>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="mx-auto mb-4 max-w-[21rem] whitespace-normal break-words text-3xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:max-w-3xl sm:text-5xl lg:mx-0 lg:text-6xl"
            >
              {c.hero.headline}
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mx-auto mb-8 max-w-[21rem] whitespace-normal break-words text-base font-semibold leading-relaxed text-slate-700 sm:max-w-3xl sm:text-xl lg:mx-0"
            >
              {c.hero.subheadline}
            </motion.p>

            {c.hero.valueProp && (
              <motion.div
                variants={fadeInUp}
                className="mx-auto mb-8 flex w-full max-w-[21rem] items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-left sm:max-w-3xl lg:mx-0 lg:w-fit"
              >
                <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                <span className="text-sm font-bold text-slate-900 tracking-tight">{c.hero.valueProp}</span>
              </motion.div>
            )}

            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 sm:gap-6 mb-8 relative z-20"
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 sm:flex-initial"
              >
                <Button
                  size="lg"
                  onClick={() => trackAndNavigate("/generate-preview", "Hero Generate Free Website Preview", "click_generate_preview")}
                  className="gap-3 h-12 sm:h-14 px-10 sm:px-12 text-lg sm:text-lg shadow-2xl shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700 transition-all w-full sm:w-auto rounded-2xl font-black uppercase tracking-widest"
                >
                  {c.hero.ctaPrimary} <ArrowRight className="h-6 w-6" />
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 sm:flex-initial"
              >
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => trackAndNavigate("/website-audit", "Hero Website Growth Audit", "click_request_audit")}
                  className="h-12 sm:h-14 px-10 sm:px-12 text-lg sm:text-lg w-full sm:w-auto rounded-2xl border-2 hover:bg-slate-50 transition-all shadow-lg shadow-slate-200/50 bg-white font-black uppercase tracking-widest text-indigo-600"
                >
                  {c.hero.ctaSecondary}
                </Button>
              </motion.div>
            </motion.div>

            <motion.div variants={fadeInUp} className="mb-12">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-4">No complicated setup. No developer needed. Launch support included.</p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                {["Free Website Preview", "Fast Managed Workflow", "Lead Capture Ready", "SEO + Mobile Optimized"].map((badge) => (
                  <div key={badge} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 shadow-sm">
                    <Check className="h-3 w-3 text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{badge}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Social Proof & Featured In */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col items-center lg:items-start gap-6 mt-8"
            >
              <div className="flex flex-col items-center lg:items-start gap-4">
                <div className="flex flex-wrap gap-2">
                  {["Managed setup", "Real enquiry tracking", "Monthly improvements"].map((label) => (
                    <span key={label} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 shadow-sm">{label}</span>
                  ))}
                </div>
                <p className="text-sm font-semibold text-slate-500 tracking-wide uppercase">
                  {c.hero?.socialProof?.text}
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="hidden lg:block relative group"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-30 transition duration-1000" />
            <div className="relative bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 p-2">
              <SafeImage
                src="/brand-template-preview.svg"
                alt="Dashboard Preview"
                loading="eager"
                className="w-full h-full object-cover transform group-hover:scale-[1.05] transition-transform duration-700"
                containerClassName="rounded-[2rem] bg-slate-100 aspect-video lg:aspect-square xl:aspect-video flex items-center justify-center relative"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-transparent mix-blend-overlay pointer-events-none" />
            </div>

            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-6 -left-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 flex items-center gap-3 z-20"
            >
              <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 leading-none mb-1">
                  Managed Setup
                </div>
                <div className="text-[10px] text-slate-500">
                  Hosting and support included
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1,
              }}
              className="absolute -bottom-6 -right-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50 flex items-center gap-3 z-20"
            >
              <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 leading-none mb-1">
                  Local SEO Ready
                </div>
                <div className="text-[10px] text-slate-500">
                  City pages supported
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50 px-4 py-12 sm:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                Bennie Tay ecosystem
              </p>
              <h2 className="max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Three connected places, one managed website service.
              </h2>
            </div>
            <p className="max-w-2xl text-sm font-semibold leading-7 text-slate-600 sm:text-base">
              Use the main website to understand the service, the case studies to inspect buyer journeys, and this app to start, pay, onboard, approve, and manage your website.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {BENNIE_ECOSYSTEM_LINKS.map((link) => {
              const isApp = link.id === "app";
              const href = isApp ? "/generate-preview" : link.url;
              return (
                <a
                  key={link.id}
                  href={href}
                  target={isApp ? undefined : "_blank"}
                  rel={isApp ? undefined : "noreferrer"}
                  onClick={(event) => {
                    trackPublicEvent({
                      eventType: "ecosystem_link_clicked",
                      label: `Ecosystem ${link.shortLabel}`,
                      target: href,
                    });
                    if (isApp) {
                      event.preventDefault();
                      navigate("/generate-preview");
                    }
                  }}
                  className="group flex min-h-[180px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/50"
                >
                  <div>
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                      {link.id === "portfolio" ? (
                        <Building className="h-5 w-5" />
                      ) : (
                        <Globe className="h-5 w-5" />
                      )}
                    </div>
                    <h3 className="mb-2 text-lg font-black text-slate-950">
                      {link.shortLabel}
                    </h3>
                    <p className="text-sm font-semibold leading-6 text-slate-600">
                      {link.description}
                    </p>
                  </div>
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
                    {isApp ? "Start in the app" : "Open"}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust & Social Proof Section */}
      {c.trust && (
        <section className="py-12 bg-white border-y border-slate-50">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex flex-col items-center justify-center">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-12 lg:gap-24">
                {(c.trust.stats || []).map((stat: any, i: number) => (
                  <div key={i} className="text-center group">
                    <div className="text-3xl sm:text-4xl font-black text-indigo-600 mb-1 group-hover:scale-110 transition-transform">{stat.value}</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Optional Internal Analysis Section */}
      {c.reviewEngine && (
        <section className="px-4 py-16 sm:px-8 lg:py-24 bg-slate-950 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:42px_42px]" />
          <div className="relative mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <Badge className="mb-6 border border-indigo-400/30 bg-indigo-500/15 px-4 py-1 text-indigo-100">
                  Website Planning Engine
                </Badge>
                <h2 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl">
                  {c.reviewEngine.title}
                </h2>
                <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-slate-300">
                  {c.reviewEngine.subtitle}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={() => trackAndNavigate("/generate-preview", "Launch Model Generate Limited Preview", "click_generate_preview")}
                    className="h-14 rounded-2xl bg-white px-8 font-black uppercase tracking-widest text-slate-950 hover:bg-indigo-100"
                  >
                    Generate Limited Preview
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => scrollToId("#launch-models")}
                    className="h-14 rounded-2xl border-white/20 bg-white/5 px-8 font-black uppercase tracking-widest text-white hover:bg-white hover:text-slate-950"
                  >
                    See managed website options
                  </Button>
                </div>
              </motion.div>

              <div className="grid gap-4 sm:grid-cols-2">
                {(c.reviewEngine.steps || []).map((step: any, i: number) => (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                    className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6"
                  >
                    <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-100">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-black text-white">{step.title}</h3>
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-300">{step.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Optional Copy Example */}
      {c.reviewCopyExample && (
        <section className="bg-white px-4 py-16 sm:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-10 max-w-3xl text-center">
              <Badge className="mb-5 bg-indigo-50 px-4 py-1 text-indigo-700 hover:bg-indigo-50">
                Real Review Input
              </Badge>
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                {c.reviewCopyExample.title}
              </h2>
              <p className="mt-5 text-lg font-medium leading-8 text-slate-600">
                {c.reviewCopyExample.subtitle}
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 sm:p-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {c.reviewCopyExample.reviewLabel}
                </p>
                <p className="mt-5 text-xl font-bold leading-9 text-slate-800">
                  "{c.reviewCopyExample.review}"
                </p>
              </div>
              <div className="rounded-[2rem] border border-indigo-100 bg-indigo-50 p-6 sm:p-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                  {c.reviewCopyExample.outputLabel}
                </p>
                <h3 className="mt-5 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
                  {c.reviewCopyExample.headline}
                </h3>
                <p className="mt-5 text-base font-semibold leading-7 text-slate-700">
                  {c.reviewCopyExample.body}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {(c.reviewCopyExample.insights || []).map((insight: string) => (
                    <span key={insight} className="rounded-full bg-white px-3 py-1.5 text-xs font-black uppercase tracking-widest text-indigo-700">
                      {insight}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-center">
              <Button
                onClick={() => trackAndNavigate("/signup", "Managed Website Start CTA", "registration_intent_clicked")}
                className="h-14 rounded-2xl bg-indigo-600 px-8 font-black uppercase tracking-widest hover:bg-indigo-700"
              >
                View Managed Plans
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Launch Models */}
      {c.launchModels && (
        <section id="launch-models" className="px-4 py-16 sm:px-8 lg:py-24 bg-white">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <Badge className="mb-5 bg-indigo-50 px-4 py-1 text-indigo-700 hover:bg-indigo-50">
                Managed Subscription or Custom Website
              </Badge>
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
                {c.launchModels.title}
              </h2>
              <p className="mt-5 text-lg font-medium leading-8 text-slate-600">
                {c.launchModels.subtitle}
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {(c.launchModels.items || []).map((item: any, index: number) => (
                <motion.article
                  key={item.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08 }}
                  className={cn(
                    "rounded-[2rem] border p-6 shadow-sm sm:p-8",
                    index === 0
                      ? "border-indigo-200 bg-indigo-50/50"
                      : "border-slate-200 bg-white",
                  )}
                >
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <Badge className={index === 0 ? "bg-indigo-600 text-white" : "bg-slate-900 text-white"}>
                      {item.badge}
                    </Badge>
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                      {index === 0 ? "Managed Hosting Included" : "Built to Scope"}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    {item.title}
                  </h3>
                  <p className="mt-4 text-base font-medium leading-7 text-slate-600">
                    {item.description}
                  </p>
                  <p className="mt-4 rounded-2xl bg-white p-4 text-sm font-bold leading-6 text-slate-700">
                    {item.bestFor}
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {(item.features || []).map((feature: string) => (
                      <div key={feature} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                        <Check className="h-4 w-4 text-indigo-600" />
                        {feature}
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => navigate(item.href)}
                    className={cn(
                      "mt-8 h-14 rounded-2xl px-8 font-black uppercase tracking-widest",
                      index === 0 ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-950 hover:bg-slate-800",
                    )}
                  >
                    {item.cta}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </motion.article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Problem Section */}
      {c.problem && (
        <section className="py-20 lg:py-32 px-8 bg-white relative overflow-hidden">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-8">
                {c.problem.headline}
              </h2>
              <div className="space-y-6 text-left max-w-2xl mx-auto">
                {(c.problem.bullets || []).map((bullet: string, i: number) => (
                  <div key={i} className="flex gap-4 items-start bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="h-6 w-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-1">
                      <X className="h-4 w-4" />
                    </div>
                    <span className="text-lg font-medium text-slate-700">{bullet}</span>
                  </div>
                ))}
              </div>
              <p className="mt-12 text-2xl font-black text-indigo-600 italic">
                {c.problem.transition}
              </p>
            </motion.div>
          </div>
        </section>
      )}

      {/* What Is Bennie Studio? */}
      {c.whatIsBennieTay && (
        <section className="py-20 lg:py-32 px-8 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 blur-[120px] rounded-full -z-10" />
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <Badge className="bg-indigo-600 text-white border-none px-4 py-1 mb-6">Managed Website Solution</Badge>
                <h2 className="text-4xl sm:text-6xl font-black mb-8 tracking-tighter leading-none uppercase text-white">
                  {c.whatIsBennieTay.headline}
                </h2>
                <p className="text-xl text-slate-200 font-medium mb-12 leading-relaxed">
                  {c.whatIsBennieTay.description}
                </p>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                  {(c.whatIsBennieTay.features || []).map((feat: string, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="h-5 w-5 bg-indigo-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                        <Check className="h-3 w-3 stroke-[4]" />
                      </div>
                      <span className="text-slate-100 font-bold">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className="absolute -inset-4 bg-indigo-500/20 blur-3xl rounded-full" />
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] p-4 sm:p-8">
                  <div className="aspect-video bg-slate-800 rounded-[2rem] overflow-hidden relative group">
                    <SafeImage 
                      src="/brand-template-preview.svg"
                      alt="Managed lead-generation website platform"
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                    <div className="absolute bottom-8 left-8">
                      <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-widest">Hosted, Managed, and Ready</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      {c.whatYouGet && (
        <section id="features" className="py-20 lg:py-32 px-8 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 px-4 py-1 mb-6">Business Benefits</Badge>
              <h2 className="text-3xl sm:text-6xl font-black text-slate-950 tracking-tighter leading-none uppercase italic">
                {c.whatYouGet.title}
              </h2>
                <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto mt-6">
                {c.whatYouGet.subtitle}
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {(c.whatYouGet.items || []).map((item: any, i: number) => (
                <div key={i} className="p-10 rounded-[3rem] bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:bg-white hover:shadow-2xl transition-all duration-500 group">
                  <div className="h-14 w-14 rounded-2xl bg-white shadow-sm text-indigo-600 flex items-center justify-center mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                    <IconComponent name={item.icon} className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">{item.title}</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Who this is for */}
      {c.whoIsItFor && (
        <section id="who-this-is-for" className="py-16 lg:py-24 px-8 bg-slate-50 relative overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
                {c.whoIsItFor.title}
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium">
                {c.whoIsItFor.subtitle}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {(c.whoIsItFor?.items || []).map((item: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                  whileHover={{ y: -8, transition: { duration: 0.3 } }}
                  className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-indigo-100 transition-all duration-500 group"
                >
                  <div className="h-14 w-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                    <IconComponent name={item.icon} className="h-7 w-7" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">{item.title}</h3>
                  <p className="text-slate-600 font-medium leading-relaxed">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Monthly Service Ritual */}
      {c.monthlyService && (
        <section id="monthly-service" className="py-16 lg:py-24 px-8 bg-slate-950 text-white relative overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div>
                <Badge className="mb-6 border border-emerald-400/30 bg-emerald-500/15 px-4 py-1 text-emerald-100">
                  Recurring Value
                </Badge>
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
                  {c.monthlyService.title}
                </h2>
                <p className="mt-6 text-lg font-medium leading-8 text-slate-300">
                  {c.monthlyService.subtitle}
                </p>
                <Button
                  onClick={() => trackAndScroll("#growth-partner", "Monthly Service Growth Partner CTA", "pricing_cta_clicked")}
                  className="mt-8 h-12 rounded-2xl bg-white px-6 font-black uppercase tracking-widest text-slate-950 hover:bg-emerald-100"
                >
                  Explore Growth Partner
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {(c.monthlyService.items || []).map((item: string, i: number) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                    <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-100">
                      <span className="text-sm font-black">{i + 1}</span>
                    </div>
                    <p className="text-sm font-black leading-6 text-white">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Local Growth Section */}
      {false && c.localGrowth && (
        <section id="local-growth" className="py-20 lg:py-28 px-8 bg-slate-950 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:44px_44px]" />
          <div className="max-w-7xl mx-auto relative">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-14 items-center">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <Badge className="bg-indigo-500/15 text-indigo-100 border border-indigo-400/30 px-4 py-1 mb-6">
                  Local Search Ready
                </Badge>
                <h2 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none mb-8 text-white">
                  {c.localGrowth.headline}
                </h2>
                <p className="text-lg sm:text-xl text-slate-300 font-medium leading-relaxed max-w-3xl mb-10">
                  {c.localGrowth.copy}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    onClick={() => trackAndNavigate("/generate-preview", "How It Works Generate Preview CTA", "click_generate_preview")}
                    className="h-14 rounded-2xl bg-white text-slate-950 hover:bg-indigo-100 font-black uppercase tracking-widest px-8"
                  >
                    {c.localGrowth.cta}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/pay-monthly-websites/malaysia")}
                    className="h-14 rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white hover:text-slate-950 font-black uppercase tracking-widest px-8"
                  >
                    View Local SEO Example
                  </Button>
                </div>
              </motion.div>

              <div className="grid sm:grid-cols-2 gap-4">
                {(c.localGrowth.items || []).map((item: string, i: number) => (
                  <motion.div
                    key={item}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                    className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6 min-h-[130px] flex flex-col justify-between"
                  >
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-100 flex items-center justify-center">
                      <Search className="h-5 w-5" />
                    </div>
                    <p className="text-lg font-black text-white">{item}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
      {/* How It Works (Bento Steps) */}
      {c.howItWorks && (
        <section id="process" className="py-16 lg:py-32 px-8 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mb-4 tracking-tight">
                {c.howItWorks.title}
              </h2>
              <p className="text-lg text-slate-600 font-medium max-w-2xl mx-auto">
                {c.howItWorks.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
              {(c.howItWorks.steps || []).map((step: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="relative group h-full"
                >
                  {i < (c.howItWorks.steps.length - 1) && (
                    <div className="hidden lg:block absolute top-12 left-full w-full h-[2px] bg-indigo-50 -translate-x-1/2 z-0" />
                  )}
                  
                  <div className="relative bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group-hover:shadow-2xl group-hover:border-indigo-100 transition-all duration-500 flex flex-col items-center text-center h-full">
                    <div className="h-16 w-16 bg-slate-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm relative z-10">
                      <IconComponent name={step.icon} className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-4">{step.title}</h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Comparison Table Section */}
      {c.comparison && (
        <section className="py-20 lg:py-32 px-8 bg-slate-50 relative overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mb-4 tracking-tight">
                {c.comparison.title}
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium">
                {c.comparison.subtitle}
              </p>
            </div>
            
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[260px] h-20 text-slate-900 font-bold px-6 sm:px-10">Category</TableHead>
                    {c.comparison.plans.map((plan: string) => (
                      <TableHead key={plan} className="text-center text-indigo-600 font-black h-20 px-6 sm:px-10 uppercase tracking-widest">{plan}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {c.comparison.features.map((feature: any, i: number) => (
                    <TableRow key={i} className="hover:bg-slate-50/30 transition-colors border-slate-100 h-16">
                      <TableCell className="font-bold text-slate-700 px-6 sm:px-10">{feature.label}</TableCell>
                      <TableCell className="text-center px-6 sm:px-10">
                        {typeof feature.launch === 'boolean' ? (
                          feature.launch ? <Check className="h-5 w-5 text-emerald-500 mx-auto" /> : <X className="h-5 w-5 text-slate-200 mx-auto" />
                        ) : (
                          <span className="text-sm font-bold text-slate-600">{feature.launch}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center px-6 sm:px-10 bg-indigo-50/10">
                        {typeof feature.business === 'boolean' ? (
                          feature.business ? <Check className="h-5 w-5 text-indigo-600 mx-auto" /> : <X className="h-5 w-5 text-slate-200 mx-auto" />
                        ) : (
                          <span className="text-sm font-bold text-indigo-700">{feature.business}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-12 flex justify-center">
              <Button 
                onClick={() => trackAndScroll("#pricing", "Solution View Managed Plans", "pricing_cta_clicked")}
                className="gap-2 rounded-2xl h-14 px-8 font-black uppercase tracking-widest bg-indigo-600"
              >
                View Managed Plans <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Core Website Growth Partner Offer */}
      <section id="growth-partner" className="relative overflow-hidden bg-indigo-600 px-5 py-16 text-white lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_90%_80%,rgba(15,23,42,0.28),transparent_35%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
          <div>
            <Badge className="border border-white/20 bg-white/15 px-4 py-1.5 text-white">
              Core managed service
            </Badge>
            <h2 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-6xl">
              Website Growth Partner
            </h2>
            <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-indigo-100">
              For businesses that want Bennie Studio to lead the website strategy, copy, build, enquiry tracking, and ongoing improvement—not simply provide another website tool.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {growthPartnerOffer.included.slice(0, 5).map((feature) => (
                <div key={feature} className="flex gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm font-bold leading-6 text-white">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2.5rem] border border-white/20 bg-slate-950 p-7 shadow-2xl sm:p-9">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Consultant-led partnership</p>
            <p className="mt-5 text-5xl font-black tracking-tight text-white">
              {growthPartnerOffer.monthlyLabel}
              <span className="text-base text-slate-400">/month</span>
            </p>
            <p className="mt-3 text-sm font-bold text-slate-300">
              Plus {growthPartnerOffer.setupLabel} one-time strategy, copy, and build fee.
            </p>
            <p className="mt-5 rounded-2xl bg-white/10 p-4 text-sm font-semibold leading-6 text-slate-200">
              Six-month initial commitment. Scope and launch timing are confirmed during the website growth call.
            </p>
            <Button
              onClick={() => {
                localStorage.setItem("bt_offer_intent", JSON.stringify({
                  offerId: growthPartnerOffer.id,
                  planId: growthPartnerOffer.planId,
                  market: growthPartnerOffer.market,
                  monthly: growthPartnerOffer.monthlyPrice,
                  setupFee: growthPartnerOffer.setupFee,
                  savedAt: new Date().toISOString(),
                }));
                trackAndNavigate("/book-demo", "Homepage Website Growth Partner", "click_growth_partner_home");
              }}
              className="mt-7 min-h-14 w-full rounded-2xl bg-white px-6 py-4 text-sm font-black uppercase tracking-[0.12em] text-slate-950 shadow-xl hover:bg-indigo-100"
            >
              Book a Website Growth Call <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={() => trackAndScroll("#pricing", "Homepage View Basic Plans", "pricing_cta_clicked")}
              className="mt-4 w-full rounded-xl px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-indigo-200 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              Or view managed website pricing
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="bg-slate-900 py-16 lg:py-24 px-8 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-500/20 blur-[120px] rounded-full -z-10" />

        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
              {c.pricing?.title || "Simple, Transparent Pricing"}
            </h2>
            <p className="text-slate-300 text-lg font-semibold">
              {c.pricing?.subtitle ||
                "Choose the launch option that fits your business stage."}
            </p>
            <p className="mt-4 inline-flex rounded-full border border-indigo-400/30 bg-indigo-500/10 px-5 py-2 text-sm font-black uppercase tracking-[0.16em] text-indigo-100">
                {c.pricing?.trialNote || "Start with a free, limited website preview before choosing a managed service."}
            </p>
          </motion.div>

          <Pricing onSelectPlan={() => trackAndNavigate("/signup", "Pricing Plan Selected", "click_start_plan")} onDark />
        </div>
      </section>

      {/* Premium Custom Website Option */}
      <section id="custom-website" className="bg-slate-50 px-4 py-16 sm:px-8 lg:py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-[2rem] sm:rounded-[4rem] border-4 sm:border-8 border-slate-900 p-6 sm:p-12 lg:p-24 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-3xl rounded-full" />
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
              <div className="min-w-0 space-y-6 sm:space-y-8">
                <Badge className="bg-slate-900 text-white border-none py-1.5 px-4 font-black uppercase tracking-widest">Premium Option</Badge>
                <h2 className="max-w-full break-words text-3xl font-black uppercase leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                  {c.customServices.title}
                </h2>
                <p className="text-lg sm:text-xl text-slate-600 font-medium leading-8">
                  {c.customServices.subtitle}
                </p>
                <div className="p-6 sm:p-8 bg-indigo-50 rounded-[2rem] border border-indigo-100">
                  <div className="text-2xl sm:text-3xl font-black text-indigo-600 mb-2">{customWebsiteQuote}</div>
                  <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{c.customServices?.priceCaption || "Fully Done-For-You Strategy & Build"}</p>
                </div>
                <Button 
                  size="lg"
                  onClick={() => trackAndNavigate("/apply-custom", "Custom Website Quote CTA", "click_custom_strategy")}
                  className="h-auto min-h-16 w-full whitespace-normal px-6 py-5 text-base sm:w-auto sm:px-10 sm:text-lg lg:text-xl font-black bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl uppercase tracking-widest transition-all"
                >
                  Request Custom Website Quote
                </Button>
              </div>
              <div className="space-y-6">
                <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">Best for businesses that need:</p>
                <div className="space-y-4">
                  {(c.customServices.items[0].features || []).map((feat: string, i: number) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                      <div className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-indigo-600">
                        <Check className="h-4 w-4 stroke-[3]" />
                      </div>
                      <span className="font-bold text-slate-700">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results / Testimonials Section */}
      {c.testimonials && (
        <section id="testimonials" className="py-16 lg:py-24 px-8 bg-white relative overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-12">
              <div className="max-w-2xl text-center lg:text-left">
                <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
                  {c.testimonials.title}
                </h2>
                <p className="text-lg text-slate-600 font-medium">
                  {c.testimonials.subtitle}
                </p>
              </div>

              {/* Metric Cards Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
                {(c.testimonials.metrics || []).map((metric: any, i: number) => (
                  <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                    <span className="text-2xl font-black text-indigo-600 mb-1">{metric.value}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{metric.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {(c.testimonials.items || []).map((t: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group relative"
                >
                  <div className="flex gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-lg text-slate-700 font-medium italic mb-10 leading-relaxed group-hover:text-slate-900 transition-colors">
                    "{t.text}"
                  </p>
                  <div className="flex items-center gap-4 mt-auto border-t border-slate-50 pt-8">
                    <SafeImage 
                      src={t.avatar} 
                      alt={t.name} 
                      className="w-full h-full object-cover" 
                      containerClassName="h-12 w-12 rounded-full border border-slate-100" 
                    />
                    <div>
                      <div className="text-sm font-black text-slate-900 uppercase tracking-widest">{t.name}</div>
                      <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{t.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}


      {/* Success Story Section */}
      {c.successStory && (
        <section className="py-16 lg:py-24 px-6 sm:px-8 bg-slate-50 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] sm:w-[800px] h-[300px] sm:h-[600px] bg-indigo-500/5 blur-[60px] sm:blur-[120px] rounded-full -z-10" />
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="order-2 lg:order-1"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 border border-indigo-200 mb-6 sm:mb-8 text-indigo-600">
                  <Star className="h-4 w-4 fill-indigo-600" />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">
                    Success Story
                  </span>
                </div>
                <h2 className="text-3xl sm:text-5xl font-black text-slate-900 mb-6 sm:mb-8 tracking-tighter leading-tight italic uppercase">
                  {c.successStory.title}
                </h2>
                <p className="text-lg sm:text-xl text-slate-600 mb-8 sm:mb-10 leading-relaxed font-medium">
                  {c.successStory.content}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8 mb-10 sm:mb-12">
                  {(c.successStory?.stats || []).map((stat: any, i: number) => (
                    <div key={i}>
                      <div className="text-2xl sm:text-3xl font-black text-indigo-600 mb-1">
                        {stat.value}
                      </div>
                      <div className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  size="lg"
                  onClick={() => trackAndScroll("#pricing", "FAQ Pricing CTA", "pricing_cta_clicked")}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-indigo-100"
                >
                  Start Your Story <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
              <div className="relative order-1 lg:order-2">
                <div className="absolute -inset-4 bg-indigo-500/10 blur-3xl rounded-full" />
                <div className="relative">
                  <SafeImage
                    src={c.successStory.image}
                    alt="Success Story"
                    loading="lazy"
                    className="w-full h-auto aspect-video sm:aspect-auto object-cover rounded-[2rem] sm:rounded-[3rem]"
                    containerClassName="relative shadow-2xl border-8 border-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Blog Section */}
      {blogPosts.length > 0 && (
        <section id="blog" className="py-16 lg:py-24 px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl sm:text-5xl font-black mb-6 tracking-tight text-slate-900"
              >
                {c.blog?.title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-lg text-slate-600 max-w-2xl mx-auto font-medium"
              >
                {c.blog?.subtitle}
              </motion.p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.map((post, i) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col"
                >
                  <SafeImage
                    src={
                      post.image_url ||
                      `/brand-template-preview.svg`
                    }
                    alt={post.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    containerClassName="aspect-video relative"
                  />
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
                        Article
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-4 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-slate-600 mb-8 line-clamp-3 text-sm leading-relaxed">
                      {post.excerpt}
                    </p>
                    <div className="mt-auto">
                      <Button
                        variant="ghost"
                        className="p-0 h-auto text-indigo-600 font-bold hover:bg-transparent hover:text-indigo-700 group/btn"
                        onClick={() => navigate(`/blog/${post.slug}`)}
                      >
                        Read Article{" "}
                        <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      <section id="faq" className="py-16 lg:py-24 px-8 bg-white relative">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-4 tracking-tight flex items-center justify-center gap-4">
              <HelpCircle className="h-10 w-10 text-indigo-600" />
              {c.faq?.title}
            </h2>
            <p className="text-lg text-slate-600 font-medium">
              {c.faq?.subtitle}
            </p>
          </div>
          <Accordion className="space-y-4">
            {(c.faq?.items || []).map((faq: any, i: number) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-2xl border border-slate-200 bg-white px-6 shadow-sm transition-all hover:shadow-md"
              >
                <AccordionTrigger className="py-6 text-left text-base font-black text-slate-900 no-underline hover:no-underline sm:text-lg">
                  {faq.question || faq.q}
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-base font-medium leading-7 text-slate-600">
                  {faq.answer || faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>      {/* Final CTA Section */}
      <section
        id="contact"
        className="py-20 lg:py-40 px-8 relative overflow-hidden bg-indigo-600"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-white/10 blur-[150px] rounded-full -z-10" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-400/20 blur-[120px] rounded-full -z-10" />

        <div className="max-w-5xl mx-auto text-center text-white relative z-10">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="space-y-12"
          >
            <div className="space-y-6">
              <h2 className="text-4xl sm:text-7xl font-black tracking-tighter leading-none uppercase italic text-white">
                {c.cta?.headline || "Ready to Launch Your High-Performance Studio?"}
              </h2>
              <p className="text-xl sm:text-2xl text-indigo-50 font-medium max-w-3xl mx-auto leading-relaxed">
                {c.cta?.subheadline || "Join the high-growth agencies and consultants who have automated their business presence."}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto"
              >
                <Button
                  size="lg"
                  onClick={() => trackAndNavigate("/generate-preview", c.cta?.buttonText || "Final Generate Free Website Preview", "click_generate_preview")}
                  className="h-20 px-12 text-2xl font-black uppercase tracking-widest bg-white text-indigo-600 hover:bg-slate-900 hover:text-white rounded-[2rem] shadow-2xl transition-all w-full sm:w-auto"
                >
                  {c.cta?.buttonText || "View Managed Plans"}
                </Button>
              </motion.div>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto"
              >
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => trackAndNavigate("/website-audit", c.cta?.secondaryButtonText || "Final Website Growth Audit", "click_request_audit")}
                  className="h-20 px-12 text-2xl font-black uppercase tracking-widest border-2 border-white/20 text-white bg-white/5 backdrop-blur-md hover:bg-white hover:text-indigo-600 transition-all rounded-[2rem] w-full sm:w-auto"
                >
                  {c.cta?.secondaryButtonText || "Book Strategy Call"}
                </Button>
              </motion.div>
            </div>
            
            <div className="pt-8 flex flex-col items-center gap-6">
              <div className="flex items-center gap-4 text-white font-bold bg-white/10 px-6 py-3 rounded-2xl border border-white/20 backdrop-blur-sm">
                <Check className="h-5 w-5" />
                <span>Managed launch support included</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-200">
                Built for speed, enquiries, and simple monthly management
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      <PublicSiteFooter tagline={c.footer?.tagline} email={c.footer?.email} onManageCookies={() => setShowCookiePreferences(true)} />
      {showCookieBanner && (
        <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-slate-200 bg-white/95 px-4 py-3 shadow-2xl shadow-slate-950/10 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-3xl gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 sm:flex">
                <Cookie className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-slate-950">Cookie Preferences</p>
                <p className="mt-1 text-xs font-medium leading-5 text-slate-600">Necessary cookies keep Bennie Studio working. Optional analytics help us improve the website.</p>
                <button
                  onClick={() => navigate("/cookie-policy")}
                  className="mt-2 text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
                >
                  Read Cookie Policy
                </button>
                {showCookiePreferences && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {[
                      ["functional", "Functional"],
                      ["analytics", "Analytics"],
                      ["marketing", "Marketing"],
                    ].map(([key, label]) => (
                      <label
                        key={key}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700"
                      >
                        <span>{label}</span>
                        <input
                          type="checkbox"
                          checked={Boolean((cookieDraft as any)[key])}
                          onChange={(event) =>
                            setCookieDraft((prev) => ({
                              ...prev,
                              [key]: event.target.checked,
                            }))
                          }
                          className="h-4 w-4 accent-indigo-600"
                        />
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:pt-1">
              <Button
                variant="outline"
                onClick={() =>
                  saveSalesCookieConsent({
                    functional: false,
                    analytics: false,
                    marketing: false,
                  })
                }
                className="rounded-2xl font-black uppercase tracking-widest"
              >
                Reject Non-Essential
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  showCookiePreferences
                    ? saveSalesCookieConsent(cookieDraft)
                    : setShowCookiePreferences(true)
                }
                className="rounded-2xl font-black uppercase tracking-widest"
              >
                {showCookiePreferences ? "Save Preferences" : "Manage Preferences"}
              </Button>
              <Button
                onClick={() =>
                  saveSalesCookieConsent({
                    functional: true,
                    analytics: true,
                    marketing: true,
                  })
                }
                className="rounded-2xl bg-indigo-600 font-black uppercase tracking-widest text-white hover:bg-indigo-700"
              >
                Accept All
              </Button>
            </div>
          </div>
        </div>
      )}
      {showSalesWhatsApp && (
        <a
          href={salesWhatsAppHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={platformSettings?.salesWhatsappAriaLabel || "Chat with Bennie Studio on WhatsApp"}
          className={cn(
            "fixed right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl shadow-emerald-500/30 ring-1 ring-white/40 transition-transform hover:-translate-y-1 hover:bg-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-300 md:right-7 md:h-16 md:w-16",
            showCookieBanner ? "bottom-44 md:bottom-32" : "bottom-5 md:bottom-7",
          )}
        >
          <MessageCircle className="h-7 w-7 md:h-8 md:w-8" />
          <span className="sr-only">Open WhatsApp chat</span>
        </a>
      )}
      {marketingAllowed && platformSettings?.trackingScriptsFooter && (
        <div
          dangerouslySetInnerHTML={{
            __html: platformSettings.trackingScriptsFooter,
          }}
        />
      )}
    </div>
  );
}
