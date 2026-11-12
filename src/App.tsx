/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy as reactLazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { Globe } from "lucide-react";
import { supabase } from "./lib/supabase";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoadingFallback } from "./components/LoadingFallback";
import "./styles/publicBrand.css";
import "./styles/studioCaseStudies.css";
import { AgencyMotionDirector } from "./components/AgencyMotionDirector";
import { classifyTenantHost } from "./lib/tenantDomains";
import { shouldRetryLazyChunkLoad } from "./lib/lazyChunkRecovery";

const CHUNK_RETRY_KEY = "bt_chunk_retry_once";
let documentNavigationStarted = false;

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => { documentNavigationStarted = true; }, { once: true });
  window.addEventListener("pagehide", () => { documentNavigationStarted = true; }, { once: true });
}

// Vite assets are content-hashed. A browser that cached the previous index
// can request an old lazy chunk after a deployment, so recover once with a
// cache-busting URL before showing the global error boundary.
const lazy = <T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
) => reactLazy(async () => {
  try {
    const module = await importer();
    try {
      sessionStorage.removeItem(CHUNK_RETRY_KEY);
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.has("_chunk_retry")) {
        currentUrl.searchParams.delete("_chunk_retry");
        window.history.replaceState({}, "", currentUrl.toString());
      }
    } catch {
      // Storage/history may be unavailable in privacy-restricted browsers.
    }
    return module;
  } catch (error) {
    try {
      if (shouldRetryLazyChunkLoad({
        navigationStarted: documentNavigationStarted,
        retryUsed: Boolean(sessionStorage.getItem(CHUNK_RETRY_KEY)),
      })) {
        sessionStorage.setItem(CHUNK_RETRY_KEY, "1");
        const retryUrl = new URL(window.location.href);
        retryUrl.searchParams.set("_chunk_retry", String(Date.now()));
        window.location.replace(retryUrl.toString());
      }
    } catch {
      // Let ErrorBoundary handle the failure if recovery is unavailable.
    }
    throw error;
  }
});

// --- Lazy Loaded Components ---
const LandingPage = lazy(() => import("./components/BrandLedLandingPage"));
const PersonalProfilePage = lazy(() => import("./components/PersonalProfilePage"));
const LoginPage = lazy(() => import("./components/LoginPage"));
const OwnSalesSeoPage = lazy(() => import("./components/OwnSalesSeoPage"));
const ComparisonGuidePage = lazy(() => import("./components/ComparisonGuidePage"));
const PublicMarketingPages = lazy(() => import("./components/PublicMarketingPages"));
const StudioCaseStudyDetail = lazy(() => import("./components/StudioCaseStudyDetail"));
const StudioShowcaseLivePreview = lazy(() => import("./components/StudioShowcasePreviewRouter"));
const PublicBlogPostPage = lazy(() => import("./components/PublicBlogPostPage"));
const PublicResourceArticlePage = lazy(() => import("./components/PublicResourceArticlePage"));
const WaasSamplePage = lazy(() => import("./components/WaasSamplePage"));
const BookDemo = lazy(() => import("./components/BookDemo"));
const ManageCallBooking = lazy(() => import("./components/ManageCallBooking"));
const PublicProposalPage = lazy(() => import("./components/PublicProposalPage"));
const ProspectPreviewPage = lazy(() => import("./components/ProspectPreviewPage"));
const ForgotPasswordPage = lazy(
  () => import("./components/ForgotPasswordPage"),
);
const ResetPasswordPage = lazy(() => import("./components/ResetPasswordPage"));
const DashboardOverview = lazy(() => import("./components/DashboardOverview"));
const ComingSoonPage = lazy(() => import("./components/ComingSoonPage"));
const SuperAdminDashboard = lazy(
  () => import("./components/SuperAdminDashboard"),
);

const LeadCRM = lazy(() =>
  import("./components/LeadCRM").then((m) => ({ default: m.LeadCRM })),
);
const Appointments = lazy(() =>
  import("./components/Appointments").then((m) => ({
    default: m.Appointments,
  })),
);
const WebsiteEditor = lazy(() =>
  import("./components/WebsiteEditor").then((m) => ({
    default: m.WebsiteEditor,
  })),
);
const PoliciesCMS = lazy(() =>
  import("./components/PoliciesCMS").then((m) => ({ default: m.PoliciesCMS })),
);
const Billing = lazy(() =>
  import("./components/Billing").then((m) => ({ default: m.Billing })),
);
const BusinessSettings = lazy(() =>
  import("./components/BusinessSettings").then((m) => ({
    default: m.BusinessSettings,
  })),
);
const Profile = lazy(() =>
  import("./components/Profile").then((m) => ({ default: m.Profile })),
);
const Support = lazy(() =>
  import("./components/Support").then((m) => ({ default: m.Support })),
);
const IndustryContentManager = lazy(() =>
  import("./components/IndustryContentManager").then((m) => ({
    default: m.IndustryContentManager,
  })),
);
const ReviewManagement = lazy(() =>
  import("./components/ReviewManagement").then((m) => ({
    default: m.ReviewManagement,
  })),
);
const LocalSeoDashboard = lazy(() => import("./components/LocalSeoDashboard"));
const MarketingHub = lazy(() =>
  import("./components/MarketingHub").then((m) => ({ default: m.MarketingHub })),
);
const BlogCMS = lazy(() =>
  import("./components/BlogCMS").then((m) => ({ default: m.BlogCMS })),
);
const FunnelsDashboard = lazy(() =>
  import("./components/funnels/FunnelsDashboard").then((m) => ({ default: m.FunnelsDashboard })),
);
const FunnelPlansPortal = lazy(() =>
  import("./components/funnels/FunnelPlansPortal").then((m) => ({ default: m.FunnelPlansPortal })),
);
const FunnelWorkspace = lazy(() =>
  import("./components/funnels/FunnelWorkspace").then((m) => ({ default: m.FunnelWorkspace })),
);
const PublicFunnelPage = lazy(() =>
  import("./components/funnels/PublicFunnelPage").then((m) => ({ default: m.PublicFunnelPage })),
);
const MonthlyUpdateRequests = lazy(() => import("./components/MonthlyUpdateRequests"));
const TeamManagement = lazy(() => import("./components/TeamManagement"));
const AffiliateDashboard = lazy(() =>
  import("./components/AffiliateDashboard").then((m) => ({
    default: m.AffiliateDashboard,
  })),
);
const AffiliateJoinPage = lazy(() => import("./components/AffiliateJoinPage"));
const AffiliateAuthPage = lazy(() => import("./components/AffiliateAuthPage"));
const PolicyPage = lazy(() =>
  import("./components/Policies").then((m) => ({ default: m.PolicyPage })),
);
const WebsiteRenderer = lazy(() =>
  import("./components/WebsiteRenderer").then((m) => ({
    default: m.WebsiteRenderer,
  })),
);

import { useTrafficTracker } from "./hooks/useTrafficTracker";

const DashboardLayout = lazy(() =>
  import("./components/DashboardLayout").then((m) => ({ default: m.DashboardLayout })),
);
const FeatureGate = lazy(() =>
  import("./components/FeatureGate").then((m) => ({ default: m.FeatureGate })),
);
const ProtectedRoute = lazy(() =>
  import("./components/ProtectedRoute").then((m) => ({ default: m.ProtectedRoute })),
);
const BusinessDashboard = lazy(() =>
  import("./components/BusinessDashboard").then((m) => ({ default: m.BusinessDashboard })),
);
const FeatureTour = lazy(() =>
  import("./components/FeatureTour").then((m) => ({ default: m.FeatureTour })),
);
const DemoModePage = lazy(() =>
  import("./components/DemoModePage").then((m) => ({ default: m.DemoModePage })),
);
const CustomerOnboardingPage = lazy(() =>
  import("./components/CustomerOnboardingPage").then((m) => ({ default: m.CustomerOnboardingPage })),
);
const CheckoutStatusPage = lazy(() =>
  import("./components/CheckoutStatusPage").then((m) => ({ default: m.CheckoutStatusPage })),
);
const SEOSetupGuide = lazy(() =>
  import("./components/SEOSetupGuide").then((m) => ({ default: m.SEOSetupGuide })),
);
const TemplateMarketplace = lazy(() =>
  import("./components/TemplateMarketplace").then((m) => ({ default: m.TemplateMarketplace })),
);
const SystemStatusPage = lazy(() =>
  import("./components/SystemStatusPage").then((m) => ({ default: m.SystemStatusPage })),
);
const CustomerApprovals = lazy(() =>
  import("./components/CustomerApprovals").then((m) => ({ default: m.CustomerApprovals })),
);
const MyWebsitePage = lazy(() =>
  import("./components/MyWebsitePage").then((m) => ({ default: m.MyWebsitePage })),
);
const SeoGrowthWorkspace = lazy(() => import("./modules/seo/components/SeoGrowthWorkspace"));

function TrafficTracker() {
  useTrafficTracker();
  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

const PRIVATE_ROUTE_PREFIXES = [
  "/admin",
  "/dashboard",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/checkout",
  "/proposal",
  "/manage-call",
  "/preview/template",
  "/preview/prospect",
  "/w/",
  "/affiliate",
];

const SALES_CONSENT_KEY = "bt_sales_cookie_consent";
const SALES_CONSENT_VERSION = "uk-sales-consent-v1";

type SalesAnalyticsConsent = {
  necessary: true;
  functional: false;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
  version: string;
};

function readSalesAnalyticsConsent(): SalesAnalyticsConsent | null {
  try {
    const value = JSON.parse(localStorage.getItem(SALES_CONSENT_KEY) || "null");
    return value?.version === SALES_CONSENT_VERSION &&
      typeof value?.analytics === "boolean" &&
      typeof value?.marketing === "boolean"
      ? value
      : null;
  } catch {
    return null;
  }
}

function PublicAnalytics({ settings }: { settings: any }) {
  const { pathname, search } = useLocation();
  const [consent, setConsent] = React.useState<SalesAnalyticsConsent | null>(
    readSalesAnalyticsConsent,
  );

  React.useEffect(() => {
    setConsent(readSalesAnalyticsConsent());
  }, [pathname]);

  const privateRoute = PRIVATE_ROUTE_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(prefix.endsWith("/") ? prefix : prefix + "/"),
  );
  const analyticsAllowed =
    settings?.salesCookieBannerEnabled === false ||
    (consent?.version === SALES_CONSENT_VERSION && consent.analytics === true);

  React.useEffect(() => {
    // The homepage has its own consent-aware Google tag.
    if (pathname === "/" || privateRoute || !analyticsAllowed) return;

    const measurementId = String(settings?.gaMeasurementId || "").trim();
    if (!/^G-[A-Z0-9]+$/.test(measurementId)) return;

    const analyticsWindow = window as any;
    analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
    if (typeof analyticsWindow.gtag !== "function") {
      analyticsWindow.gtag = function () {
        analyticsWindow.dataLayer.push(arguments);
      };
    }

    if (!document.querySelector('script[data-bt-ga="' + measurementId + '"]')) {
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://www.googletagmanager.com/gtag/js?id=" + measurementId;
      script.setAttribute("data-bt-ga", measurementId);
      document.head.appendChild(script);
    }

    analyticsWindow.__btGa4Configured = analyticsWindow.__btGa4Configured || {};
    if (!analyticsWindow.__btGa4Configured[measurementId]) {
      analyticsWindow.gtag("js", new Date());
      analyticsWindow.gtag("config", measurementId, { send_page_view: false });
      analyticsWindow.__btGa4Configured[measurementId] = true;
    }

    const allowedParams = new URLSearchParams();
    const currentParams = new URLSearchParams(search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_term", "utm_content"].forEach(
      (key) => {
        const value = currentParams.get(key);
        if (value) allowedParams.set(key, value);
      },
    );
    const query = allowedParams.toString();
    const pagePath = pathname + (query ? "?" + query : "");
    analyticsWindow.gtag("event", "page_view", {
      page_location: window.location.origin + pagePath,
      page_path: pagePath,
      page_title: document.title,
    });
  }, [
    analyticsAllowed,
    pathname,
    privateRoute,
    search,
    settings?.gaMeasurementId,
  ]);

  const saveConsent = (analytics: boolean, marketing: boolean) => {
    const next: SalesAnalyticsConsent = {
      necessary: true,
      functional: false,
      analytics,
      marketing,
      timestamp: new Date().toISOString(),
      version: SALES_CONSENT_VERSION,
    };
    try {
      localStorage.setItem(SALES_CONSENT_KEY, JSON.stringify(next));
    } catch {
      // Consent remains session-scoped when persistent storage is unavailable.
    }
    setConsent(next);
  };

  const showCookieBanner =
    pathname !== "/" &&
    !privateRoute &&
    settings?.salesCookieBannerEnabled !== false &&
    !consent;

  if (!showCookieBanner) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed inset-x-4 bottom-4 z-[120] mx-auto max-w-4xl border border-white/10 bg-[#0c1224] p-5 text-white shadow-2xl"
    >
      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-sm font-semibold">Cookie preferences</p>
          <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-white/75">
            Necessary cookies keep the site working. Analytics and marketing cookies are optional and only load after consent.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => saveConsent(false, false)}
            className="border border-white/20 px-4 py-2 text-xs font-black"
          >
            Necessary only
          </button>
          <button
            onClick={() => saveConsent(true, true)}
            className="bg-white px-4 py-2 text-xs font-black text-[#10131c]"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

function PublicRouteTransition({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const isPublicRoute = !PRIVATE_ROUTE_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`),
  );

  if (!isPublicRoute) return <>{children}</>;

  return (
    <div key={pathname} className="bt-public-route-transition">
      {children}
    </div>
  );
}

function RouteRobotsMeta() {
  const { pathname } = useLocation();
  const privateRoute =
    /^\/(admin|dashboard|checkout|preview-order|login|signup|forgot-password|reset-password|profile)(\/|$)/.test(pathname) ||
    /^\/(manage-call|proposal|preview\/(?:template|prospect)|w)(\/|$)/.test(pathname) ||
    /^\/affiliate\/(login|signup)(\/|$)/.test(pathname);
  const host = window.location.hostname.toLowerCase();
  const isVercelPreview = host.endsWith(".vercel.app");
  const robots = privateRoute
    ? "noindex,nofollow"
    : isVercelPreview
      ? "noindex,follow"
      : "index,follow";
  return <Helmet><meta name="robots" content={robots} /></Helmet>;
}

function isCustomerDomainHost() {
  const host = window.location.hostname.toLowerCase();
  const tenant = classifyTenantHost(host, {
    PLATFORM_HOSTS: import.meta.env.VITE_PLATFORM_HOSTS,
    WAAS_ROOT_DOMAIN: import.meta.env.VITE_WAAS_ROOT_DOMAIN,
    WAAS_ROOT_DOMAINS: import.meta.env.VITE_WAAS_ROOT_DOMAINS,
  });
  return Boolean(host) && tenant.kind !== "platform" && !host.endsWith(".local");
}

function CustomDomainWebsiteRoute() {
  const [businessId, setBusinessId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;

    const resolveDomain = async () => {
      try {
        const response = await fetch(
          `/api/custom-domain/resolve?host=${encodeURIComponent(window.location.hostname)}`,
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Domain is not connected.");
        if (!cancelled) setBusinessId(payload.businessId);
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Domain is not connected.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    resolveDomain();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LoadingFallback message="Loading website..." />;

  if (error || !businessId) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
          <Globe className="h-10 w-10 mx-auto mb-4 text-indigo-300" />
          <h1 className="text-2xl font-black mb-3">Domain Not Connected</h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            This domain is pointing to Bennie Studio, but it is not connected to
            a published customer website yet.
          </p>
          <p className="mt-4 text-xs text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return <WebsiteRenderer businessIdOverride={businessId} />;
}

export default function App() {
  const { logout, profile } = useAuth();
  const [platformSettings, setPlatformSettings] = React.useState<any>(() => {
    try {
      const cached = sessionStorage.getItem("bts_platform_settings");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [, setLoadingSettings] = React.useState(() => {
    try {
      return !sessionStorage.getItem("bts_platform_settings");
    } catch {
      return true;
    }
  });
  const defaultSiteTitle =
    typeof platformSettings?.salesPageTitle === "string" &&
    platformSettings.salesPageTitle.trim()
      ? platformSettings.salesPageTitle.trim()
      : "Bennie Studio";

  React.useEffect(() => {
    let cancelled = false;
    const fetchSettings = async () => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch("/api/public/site-config", { signal: controller.signal });
        if (!response.ok) throw new Error("Public site settings are unavailable");
        const data = await response.json();

        if (data?.platform) {
          if (!cancelled) setPlatformSettings(data.platform);
          try {
            sessionStorage.setItem("bts_platform_settings", JSON.stringify(data.platform));
          } catch {
            // Settings cache is an optimization only.
          }
        }
      } catch (err) {
        console.error("Error fetching platform settings:", err);
      } finally {
        window.clearTimeout(timeoutId);
        if (!cancelled) setLoadingSettings(false);
      }
    };

    fetchSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isCustomerDomainHost()) {
    return (
      <HelmetProvider>
        <ErrorBoundary>
          <Router>
            <ScrollToTop />
            <AgencyMotionDirector />
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="*" element={<CustomDomainWebsiteRoute />} />
              </Routes>
            </Suspense>
          </Router>
        </ErrorBoundary>
      </HelmetProvider>
    );
  }

  // If maintenance mode is on and user is NOT a super admin, show coming soon page
  if (platformSettings?.maintenanceMode && profile?.role !== "super_admin") {
    return (
      <HelmetProvider>
        <Router>
          <ScrollToTop />
          <RouteRobotsMeta />
          <TrafficTracker />
            <PublicAnalytics settings={platformSettings} />
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="*"
                element={<ComingSoonPage settings={platformSettings} />}
              />
            </Routes>
          </Suspense>
        </Router>
      </HelmetProvider>
    );
  }

  return (
    <HelmetProvider>
      <ErrorBoundary>
        <Router>
          <ScrollToTop />
          <RouteRobotsMeta />
          <TrafficTracker />
            <PublicAnalytics settings={platformSettings} />
          <AgencyMotionDirector />
          <Helmet>
            <title>{defaultSiteTitle}</title>
            <meta
              name="keywords"
              content="lead generation website, managed website plans, small business website design, WhatsApp enquiry website, local SEO website, clinic website design, renovation contractor website, beauty salon website, consultant website, Bennie Studio"
            />
            {/* Platform SEO */}
            <meta
              property="og:title"
              content={defaultSiteTitle}
            />
            <meta
              property="og:description"
              content="Premium managed website growth for service businesses: clearer offers, stronger CTAs, lead capture, local SEO foundations and continuous improvement."
            />
            <meta property="og:type" content="website" />
            <meta name="twitter:card" content="summary_large_image" />
            <script type="application/ld+json">
              {`
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": "Bennie Studio",
                "url": "https://app.bennietay.com/",
                "description": "Premium managed website growth systems for service businesses.",
                "sameAs": []
              }
            `}
            </script>
          </Helmet>
          <Toaster position="top-right" />
          <Suspense fallback={<LoadingFallback />}>
            <PublicRouteTransition>
              <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/personal-profile" element={<PersonalProfilePage />} />
              <Route path="/pay-monthly-websites" element={<OwnSalesSeoPage />} />
              <Route path="/pay-monthly-websites/:market" element={<Navigate to="/pay-monthly-websites" replace />} />
              <Route path="/website-design/*" element={<Navigate to="/website-subscription-service" replace />} />
              <Route path="/website-subscription-service" element={<OwnSalesSeoPage />} />
              <Route path="/website-subscription-service/:market" element={<Navigate to="/website-subscription-service" replace />} />
              <Route path="/managed-website-vs-diy" element={<ComparisonGuidePage kind="diy" />} />
              <Route path="/managed-website-vs-agency" element={<ComparisonGuidePage kind="agency" />} />
              <Route path="/portfolio" element={<Navigate to="/case-studies" replace />} />
              <Route path="/services" element={<PublicMarketingPages />} />
              <Route path="/about" element={<PublicMarketingPages />} />
              <Route path="/resources" element={<PublicMarketingPages />} />
              <Route path="/resources/:slug" element={<PublicResourceArticlePage />} />
              <Route path="/contact" element={<PublicMarketingPages />} />
              <Route path="/templates" element={<PublicMarketingPages />} />
              <Route path="/pricing" element={<PublicMarketingPages />} />
              <Route path="/how-it-works" element={<PublicMarketingPages />} />
              <Route path="/case-studies" element={<PublicMarketingPages />} />
              <Route path="/case-studies/showcase/:slug" element={<StudioCaseStudyDetail />} />
              <Route path="/case-studies/showcase/:slug/preview" element={<StudioShowcaseLivePreview />} />
              <Route path="/case-studies/showcase/:slug/preview/:page" element={<StudioShowcaseLivePreview />} />
              <Route path="/dental-clinics" element={<PublicMarketingPages />} />
              <Route path="/examples" element={<Navigate to="/case-studies" replace />} />
              <Route path="/website-audit" element={<PublicMarketingPages />} />
              <Route path="/review/:code" element={<PublicMarketingPages />} />
              <Route path="/generate-preview" element={<PublicMarketingPages />} />
              <Route path="/preview-order" element={<PublicMarketingPages />} />
              <Route path="/blog/:slug" element={<PublicBlogPostPage />} />
              <Route path="/clinic-website-design" element={<PublicMarketingPages />} />
              <Route path="/clinic-website-design-malaysia" element={<Navigate to="/clinic-website-design" replace />} />
              <Route path="/renovation-contractor-website-design" element={<PublicMarketingPages />} />
              <Route path="/beauty-salon-website-design" element={<PublicMarketingPages />} />
              <Route path="/tuition-centre-website-design" element={<PublicMarketingPages />} />
              <Route path="/consultant-website-design" element={<PublicMarketingPages />} />
              <Route path="/professional-services-website-design" element={<PublicMarketingPages />} />
              <Route path="/accounting-firm-website-design" element={<PublicMarketingPages />} />
              <Route path="/local-service-website-design" element={<PublicMarketingPages />} />
              <Route path="/portfolio/sample/:sampleType" element={<WaasSamplePage />} />
              <Route path="/demo" element={<DemoModePage />} />
              <Route path="/book-demo" element={<BookDemo />} />
              <Route path="/apply-custom" element={<Navigate to="/book-demo" replace />} />
              <Route path="/manage-call/:token" element={<ManageCallBooking />} />
              <Route path="/proposal/:token" element={<PublicProposalPage />} />
              <Route path="/preview/prospect/:previewId" element={<ProspectPreviewPage />} />
              <Route path="/privacy" element={<PolicyPage type="privacy" />} />
              <Route path="/privacy-policy" element={<PolicyPage type="privacy" />} />
              <Route path="/terms" element={<PolicyPage type="terms" />} />
              <Route path="/terms-of-service" element={<PolicyPage type="terms" />} />
              <Route path="/cookie-policy" element={<PolicyPage type="cookie" />} />
              <Route path="/data-processing-agreement" element={<PolicyPage type="dpa" />} />
              <Route path="/subprocessors" element={<PolicyPage type="subprocessors" />} />
              <Route path="/acceptable-use-policy" element={<PolicyPage type="acceptable-use" />} />
              <Route path="/w/:businessId" element={<WebsiteRenderer />} />
              <Route path="/f/:businessId/:funnelSlug/:stepSlug?" element={<PublicFunnelPage />} />
              <Route path="/preview/template/:templateId" element={<WebsiteRenderer isTemplatePreview={true} />} />
              <Route
                path="/affiliate/join/:businessId"
                element={<AffiliateJoinPage />}
              />
              <Route path="/affiliate/join" element={<AffiliateJoinPage />} />

              {/* Business Admin Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/signup"
                element={<LoginPage initialSignUp={true} />}
              />
              <Route path="/affiliate/login" element={<AffiliateAuthPage />} />
              <Route path="/affiliate/signup" element={<AffiliateAuthPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/checkout/success" element={<CheckoutStatusPage status="success" />} />
              <Route path="/checkout/cancel" element={<CheckoutStatusPage status="cancel" />} />

              {/* Top-level Profile Redirect */}
              <Route
                path="/profile"
                element={<Navigate to="/dashboard/profile" replace />}
              />

              <Route
                path="/dashboard/*"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      "business_admin",
                      "client",
                      "affiliate",
                      "staff",
                    ]}
                  >
                    <BusinessDashboard>
                      <DashboardLayout
                        role={profile?.role as any}
                        onLogout={logout}
                      >
                        <FeatureTour />
                        <Suspense fallback={<LoadingFallback />}>
                          <Routes>
                            <Route
                              path=""
                              element={
                                profile?.role === "affiliate" ? (
                                  <AffiliateDashboard />
                                ) : (
                                  <DashboardOverview />
                                )
                              }
                            />
                            <Route
                              path="my-website"
                              element={<MyWebsitePage />}
                            />
                            <Route
                              path="leads"
                              element={
                                <FeatureGate featureId="lead_crm">
                                  <LeadCRM />
                                </FeatureGate>
                              }
                            />
                            <Route
                              path="appointments"
                              element={
                                <FeatureGate featureId="booking">
                                  <Appointments />
                                </FeatureGate>
                              }
                            />
                            <Route path="products" element={<Navigate to="/dashboard" replace />} />
                            <Route
                              path="industry-content"
                              element={
                                <FeatureGate featureId="industry_content">
                                  <IndustryContentManager />
                                </FeatureGate>
                              }
                            />
                            <Route path="chatbot" element={<Navigate to="/dashboard" replace />} />
                            <Route
                              path="ai-usage"
                              element={<Navigate to="/dashboard" replace />}
                            />
                            <Route
                              path="onboarding"
                              element={
                                <ProtectedRoute
                                  allowedRoles={["business_admin"]}
                                >
                                  <CustomerOnboardingPage />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="seo-domain"
                              element={
                                <ProtectedRoute
                                  allowedRoles={["business_admin"]}
                                >
                                  <SEOSetupGuide />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="local-seo"
                              element={
                                <ProtectedRoute
                                  allowedRoles={["business_admin"]}
                                >
                                  <FeatureGate featureId="local_seo_geo" marketingCapabilityId="localSeo">
                                    <LocalSeoDashboard />
                                  </FeatureGate>
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="seo/*"
                              element={
                                <ProtectedRoute allowedRoles={["business_admin", "staff"]}>
                                  <FeatureGate featureId="advanced_seo" marketingCapabilityId="seoAudit">
                                    <SeoGrowthWorkspace />
                                  </FeatureGate>
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="update-requests"
                              element={
                                <ProtectedRoute
                                  allowedRoles={["business_admin", "staff", "client"]}
                                >
                                  <MonthlyUpdateRequests />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="marketplace"
                              element={
                                <ProtectedRoute
                                  allowedRoles={["business_admin"]}
                                >
                                  <TemplateMarketplace />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="status"
                              element={
                                <ProtectedRoute
                                  allowedRoles={["business_admin", "staff"]}
                                >
                                  <SystemStatusPage />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="approvals"
                              element={
                                <ProtectedRoute
                                  allowedRoles={["business_admin", "staff", "client"]}
                                >
                                  <CustomerApprovals />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="reviews"
                              element={
                                <FeatureGate featureId="review_management" marketingCapabilityId="reviews">
                                  <ReviewManagement />
                                </FeatureGate>
                              }
                            />
                            <Route
                              path="team"
                              element={
                                <ProtectedRoute
                                  allowedRoles={["business_admin"]}
                                >
                                  <TeamManagement />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="affiliates"
                              element={<AffiliateDashboard />}
                            />
                            <Route
                              path="affiliate/dashboard"
                              element={<AffiliateDashboard />}
                            />
                            <Route path="automations" element={<Navigate to="/dashboard" replace />} />
                            <Route
                              path="funnels"
                              element={
                                <ProtectedRoute allowedRoles={["business_admin", "staff", "client"]}>
                                  <FeatureGate featureId="sales_funnels">
                                    <FunnelsDashboard />
                                  </FeatureGate>
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="funnels/plans"
                              element={<ProtectedRoute allowedRoles={["business_admin"]}>{import.meta.env.VITE_UNIFIED_FUNNEL_TIERS_ENABLED === "true" ? <FunnelPlansPortal /> : <Navigate to="/dashboard/funnels" replace />}</ProtectedRoute>}
                            />
                            <Route
                              path="funnels/advanced"
                              element={<Navigate to="/dashboard/funnels" replace />}
                            />
                            <Route
                              path="funnels/:funnelId"
                              element={
                                <ProtectedRoute allowedRoles={["business_admin", "staff", "client"]}>
                                  <FeatureGate featureId="sales_funnels">
                                    <FunnelWorkspace />
                                  </FeatureGate>
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="marketing-hub"
                              element={
                                <ProtectedRoute allowedRoles={["business_admin", "staff"]}>
                                  <MarketingHub />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="analytics"
                              element={
                                <FeatureGate featureId="analytics">
                                  <DashboardOverview />
                                </FeatureGate>
                              }
                            />

                            {/* Business Admin Only Routes */}
                            <Route
                              path="website"
                              element={
                                <ProtectedRoute
                                  allowedRoles={["business_admin"]}
                                >
                                  <FeatureGate featureId="ai_synthesis">
                                    <WebsiteEditor />
                                  </FeatureGate>
                                </ProtectedRoute>
                              }
                            />
                            <Route path="website-editor" element={<Navigate to="/dashboard/website" replace />} />
                            <Route
                              path="website/regenerate"
                              element={
                                <ProtectedRoute
                                  allowedRoles={["business_admin"]}
                                >
                                  <FeatureGate featureId="ai_synthesis">
                                    <WebsiteEditor forceShowGenerator={true} />
                                  </FeatureGate>
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="templates"
                              element={<Navigate to="/dashboard/marketplace" replace />}
                            />
                            <Route
                              path="blog"
                              element={
                                <ProtectedRoute allowedRoles={["business_admin", "staff", "client"]}>
                                  <FeatureGate featureId="blog" marketingCapabilityId="blog">
                                    <BlogCMS />
                                  </FeatureGate>
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="policies"
                              element={
                                <ProtectedRoute
                                  allowedRoles={["business_admin"]}
                                >
                                  <PoliciesCMS />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="billing"
                              element={
                                <ProtectedRoute
                                  allowedRoles={["business_admin"]}
                                >
                                  <Billing />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="settings"
                              element={
                                <ProtectedRoute
                                  allowedRoles={["business_admin"]}
                                >
                                  <BusinessSettings />
                                </ProtectedRoute>
                              }
                            />
                            <Route path="profile" element={<Profile />} />
                            <Route path="support" element={<Support />} />
                            <Route
                              path="*"
                              element={<Navigate to="/dashboard" replace />}
                            />
                          </Routes>
                        </Suspense>
                      </DashboardLayout>
                    </BusinessDashboard>
                  </ProtectedRoute>
                }
              />

              {/* Super Admin Routes */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={["super_admin", "platform_staff"]}>
                    <DashboardLayout role={profile?.role as any} onLogout={logout}>
                      <Routes>
                        <Route path="/*" element={<SuperAdminDashboard />} />
                      </Routes>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </PublicRouteTransition>
          </Suspense>
        </Router>
      </ErrorBoundary>
    </HelmetProvider>
  );
}
