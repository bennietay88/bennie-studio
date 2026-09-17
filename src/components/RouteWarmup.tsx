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

    const warm = () => runImports(importers);
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    let idleId: number | undefined;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;

    if (typeof idleWindow.requestIdleCallback === "function") {
      idleId = idleWindow.requestIdleCallback(warm, { timeout: 1200 });
    } else {
      timeoutId = globalThis.setTimeout(warm, 250);
    }

    return () => {
      if (idleId !== undefined && typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
    };
  }, []);

  return null;
}