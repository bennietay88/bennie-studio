import { useEffect } from "react";

const publicImports = [
  () => import("./LandingPage"),
  () => import("./OwnSalesSeoPage"),
  () => import("./PortfolioPage"),
  () => import("./PublicMarketingPages"),
  () => import("./PublicBlogPostPage"),
  () => import("./BookDemo"),
  () => import("./WebsiteRenderer"),
];

const accountImports = [
  () => import("./DashboardOverview"),
  () => import("./DashboardLayout"),
  () => import("./BusinessDashboard"),
  () => import("./MyWebsitePage"),
  () => import("./WebsiteEditor"),
  () => import("./LeadCRM"),
  () => import("./Billing"),
  () => import("./BusinessSettings"),
  () => import("./Profile"),
  () => import("./Support"),
];

const adminImports = [
  () => import("./SuperAdminDashboard"),
  () => import("./SuperAdmin/TemplateManager"),
  () => import("./WebsiteEditor"),
  () => import("./SystemStatusPage"),
];

function runImports(importers: Array<() => Promise<unknown>>) {
  // Warm chunks without allowing a failed optional prefetch to affect the app.
  importers.forEach((load) => {
    void load().catch(() => undefined);
  });
}

export function RouteWarmup() {
  useEffect(() => {
    const path = window.location.pathname;
    const importers = path.startsWith("/admin")
      ? [...adminImports, ...accountImports]
      : path.startsWith("/dashboard")
        ? accountImports
        : publicImports;

    let idleId: number | undefined;
    let timeoutId: number | undefined;

    const warm = () => runImports(importers);

    if ("requestIdleCallback" in window) {
      idleId = (window as Window & {
        requestIdleCallback: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      }).requestIdleCallback(warm, { timeout: 1200 });
    } else {
      timeoutId = window.setTimeout(warm, 250);
    }

    return () => {
      if (idleId !== undefined && "cancelIdleCallback" in window) {
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  return null;
}
