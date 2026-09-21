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
import { classifyTenantHost } from "./lib/tenantDomains";

const CHUNK_RETRY_KEY = "bt_chunk_retry_once";

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
      if (!sessionStorage.getItem(CHUNK_RETRY_KEY)) {
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
const LoginPage = lazy(() => import("./components/LoginPage"));
const OwnSalesSeoPage = lazy(() => import("./components/OwnSalesSeoPage"));
const PortfolioPage = lazy(() => import("./components/PortfolioPage"));
const PublicMarketingPages = lazy(() => import("./components/PublicMarketingPages"));
const PublicBlogPostPage = lazy(() => import("./components/PublicBlogPostPage"));
const WaasSamplePage = lazy(() => import("./components/WaasSamplePage"));
const BookDemo = lazy(() => import("./components/BookDemo"));
const ManageCallBooking = lazy(() => import("./components/ManageCallBooking"));
const PublicProposalPage = lazy(() => import("./components/PublicProposalPage"));
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
const MonthlyUpdateRequests = lazy(() => import("./components/MonthlyUpdateRequests"));
const TeamManagement = lazy(() => import("./components/TeamManagement"));
const PlanEditor = lazy(() => import("./components/PlanEditor"));
const LandingPageEditor = lazy(() => import("./components/LandingPageEditor"));
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
  "/w/",
  "/affiliate",
];

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
    /^\/(admin|dashboard|checkout|login|signup|forgot-password|reset-password|profile)(\/|$)/.test(pathname) ||
    /^\/(manage-call|proposal|preview\/template|w)(\/|$)/.test(pathname) ||
    /^\/affiliate\/(login|signup)(\/|$)/.test(pathname);
  // Canonicals belong to each public page so route-specific metadata can own
  // the URL. A global canonical creates duplicate tags and can incorrectly
  // consolidate every page into the homepage.
  return <Helmet><meta name="robots" content={privateRoute ? "noindex,nofollow" : "index,follow"} /></Helmet>;
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
              <Route path="/pay-monthly-websites" element={<OwnSalesSeoPage />} />
              <Route path="/pay-monthly-websites/:market" element={<OwnSalesSeoPage />} />
              <Route path="/website-design/*" element={<OwnSalesSeoPage />} />
              <Route path="/website-subscription-service" element={<OwnSalesSeoPage />} />
              <Route path="/website-subscription-service/:market" element={<OwnSalesSeoPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/templates" element={<PublicMarketingPages />} />
              <Route path="/pricing" element={<PublicMarketingPages />} />
              <Route path="/how-it-works" element={<PublicMarketingPages />} />
              <Route path="/case-studies" element={<PublicMarketingPages />} />
              <Route path="/dental-clinics" element={<PublicMarketingPages />} />
              <Route path="/examples" element={<Navigate to="/case-studies" replace />} />
              <Route path="/examples." element={<Navigate to="/case-studies" replace />} />
              <Route path="/website-audit" element={<PublicMarketingPages />} />
              <Route path="/generate-preview" element={<PublicMarketingPages />} />
              <Route path="/preview-order" element={<PublicMarketingPages />} />
              <Route path="/blog/:slug" element={<PublicBlogPostPage />} />
              <Route path="/clinic-website-design-malaysia" element={<PublicMarketingPages />} />
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
              <Route path="/privacy" element={<PolicyPage type="privacy" />} />
              <Route path="/privacy-policy" element={<PolicyPage type="privacy" />} />
              <Route path="/terms" element={<PolicyPage type="terms" />} />
              <Route path="/terms-of-service" element={<PolicyPage type="terms" />} />
              <Route path="/cookie-policy" element={<PolicyPage type="cookie" />} />
              <Route path="/data-processing-agreement" element={<PolicyPage type="dpa" />} />
              <Route path="/subprocessors" element={<PolicyPage type="subprocessors" />} />
              <Route path="/acceptable-use-policy" element={<PolicyPage type="acceptable-use" />} />
              <Route path="/w/:businessId" element={<WebsiteRenderer />} />
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
                                  <FeatureGate featureId="local_seo_geo">
                                    <LocalSeoDashboard />
                                  </FeatureGate>
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="seo/*"
                              element={
                                <ProtectedRoute allowedRoles={["business_admin", "staff"]}>
                                  <SeoGrowthWorkspace />
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
                                  allowedRoles={["business_admin", "staff"]}
                                >
                                  <CustomerApprovals />
                                </ProtectedRoute>
                              }
                            />
                            <Route
                              path="reviews"
                              element={
                                <FeatureGate featureId="review_management">
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
                            <Route path="marketing-hub" element={<Navigate to="/dashboard" replace />} />
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
                            <Route path="blog" element={<Navigate to="/dashboard" replace />} />
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
