/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Sidebar } from "./Sidebar";
import { Breadcrumbs } from "./Breadcrumbs";
import { UserRole } from "../types";
import {
  Menu,
  X,
  Sun,
  Moon,
  Settings,
  AlertTriangle,
  Loader2,
  LogOut,
  HelpCircle,
  ExternalLink,
  Globe,
  BriefcaseBusiness,
  LayoutDashboard,
  CalendarDays,
  Inbox,
  Users,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { TrialReminder } from "./TrialReminder";
import { Business } from "../types";
import { NotificationCenter } from "./NotificationCenter";
import { Helmet } from "react-helmet-async";
import { getEcosystemLink } from "../constants/businessEcosystem";

interface DashboardLayoutProps {
  role: UserRole;
  children: React.ReactNode;
  onLogout: () => void;
}

export function DashboardLayout({
  role,
  children,
  onLogout,
}: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    let timeoutId: number;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        if (window.innerWidth < 1280) {
          setIsSidebarOpen(false);
          setIsCollapsed(false);
        }
      }, 150);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as "light" | "dark") || "light";
    }
    return "light";
  });
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("settings")
        .select("content")
        .eq("id", "platform")
        .maybeSingle();
      if (data?.content) {
        setPlatformSettings(data.content);
        setMaintenanceMode(data.content.maintenanceMode);
      }
    };
    fetchSettings();

    const fetchBusiness = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

      if (profileData?.business_id) {
        const { data: bizData } = await supabase
          .from("businesses")
          .select("*")
          .eq("id", profileData.business_id)
          .single();

        if (bizData) {
          setBusiness({
            id: bizData.id,
            name: bizData.name,
            ownerId: bizData.owner_id,
            plan: bizData.plan,
            status: bizData.status,
            aiCredits: bizData.ai_credits || 0,
            aiCreditsUsed: bizData.ai_credits_used || 0,
            trialEndsAt: new Date(bizData.trial_ends_at).getTime(),
            subscriptionStatus: bizData.subscription_status,
            createdAt: new Date(bizData.created_at).getTime(),
          } as Business);
        }
      }
    };
    fetchBusiness();

    const channel = supabase
      .channel("platform_settings_layout")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "settings",
          filter: "id=eq.platform",
        },
        (payload: any) => {
          if (payload.new?.content)
            setMaintenanceMode(payload.new.content.maintenanceMode);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleStartTour = () => {
    window.dispatchEvent(new CustomEvent("startFeatureTour"));
  };

  const handleSettingsClick = () => {
    if (role === "super_admin") {
      navigate("/admin/settings");
    } else if (role === "platform_staff") {
      navigate("/admin/prospect_explorer");
    } else {
      navigate("/dashboard/settings");
    }
  };

  const mainWebsiteLink = getEcosystemLink("main");
  const portfolioLink = getEcosystemLink("portfolio");
  const isAdminRole = role === "super_admin" || role === "platform_staff";
  const mobileAdminLinks = role === "super_admin"
    ? [
        { label: "Overview", path: "/admin", icon: LayoutDashboard },
        { label: "Today", path: "/admin/daily_operations", icon: CalendarDays },
        { label: "Leads", path: "/admin/inbound_leads", icon: Inbox },
        { label: "Customers", path: "/admin/businesses", icon: Users },
      ]
    : [
        { label: "Overview", path: "/admin", icon: LayoutDashboard },
        { label: "Today", path: "/admin/daily_operations", icon: CalendarDays },
        { label: "Leads", path: "/admin/inbound_leads", icon: Inbox },
        { label: "Projects", path: "/admin/projects", icon: BriefcaseBusiness },
      ];

  if (!role) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-slate-950 overflow-hidden transition-colors duration-300 flex-col">
      <Helmet>
        {/* Platform GA4 */}
        {platformSettings?.gaMeasurementId && (
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${platformSettings.gaMeasurementId}`}
          />
        )}
        {platformSettings?.gaMeasurementId && (
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
        {platformSettings?.metaPixelId && (
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
        {platformSettings?.trackingScriptsHeader && (
          <script
            dangerouslySetInnerHTML={{
              __html: platformSettings.trackingScriptsHeader,
            }}
          />
        )}
      </Helmet>
      {business && <TrialReminder business={business} />}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 xl:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Container */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 transform transition-all duration-500 ease-in-out xl:relative xl:translate-x-0 flex-shrink-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full",
            isCollapsed ? "w-20" : "w-72",
          )}
        >
          <Sidebar
            role={role as any}
            onLogout={onLogout}
            onClose={() => setIsSidebarOpen(false)}
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-3 backdrop-blur-md transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/95 sm:h-20 sm:px-10">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open sidebar navigation"
                className="xl:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                <Menu className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              </Button>
              <div className="flex min-w-0 flex-col">
                <h2 className="truncate text-sm font-bold capitalize text-slate-900 dark:text-white">
                  {isAdminRole ? "Admin Operations" : `${(role || "").replace("_", " ")} Panel`}
                </h2>
                <p className="hidden text-xs font-medium text-slate-500 dark:text-slate-400 sm:block">
                  {isAdminRole ? "Run the business from anywhere" : "Customer Workspace"}
                </p>
              </div>
              {maintenanceMode && role === "super_admin" && (
                <Badge
                  variant="outline"
                  className="ml-4 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 animate-pulse"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" /> Maintenance Mode
                  Active
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden lg:flex items-center gap-2">
                {mainWebsiteLink && (
                  <a
                    href={mainWebsiteLink.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-300"
                  >
                    <Globe className="h-4 w-4" />
                    Main Site
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {portfolioLink && (
                  <a
                    href={portfolioLink.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-300"
                  >
                    <BriefcaseBusiness className="h-4 w-4" />
                    Portfolio
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl">
                <button
                  onClick={() => setTheme("light")}
                  aria-label="Use light theme"
                  title="Use light theme"
                  className={cn(
                    "p-1 sm:p-1.5 rounded-lg transition-all",
                    theme === "light"
                      ? "bg-white text-amber-500 shadow-sm"
                      : "text-slate-400 hover:text-slate-600",
                  )}
                >
                  <Sun className="h-3.5 w-3.5 sm:h-4 w-4" />
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  aria-label="Use dark theme"
                  title="Use dark theme"
                  className={cn(
                    "p-1 sm:p-1.5 rounded-lg transition-all",
                    theme === "dark"
                      ? "bg-slate-700 text-indigo-400 shadow-sm"
                      : "text-slate-400 hover:text-slate-300",
                  )}
                >
                  <Moon className="h-3.5 w-3.5 sm:h-4 w-4" />
                </button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartTour}
                aria-label="Start feature tour"
                className="hidden md:flex h-9 w-9 p-0 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20"
                title="Start Feature Tour"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>

              <NotificationCenter />

              <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                aria-label="Sign out"
                className="flex gap-2 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 group px-2 sm:px-3"
              >
                <LogOut className="h-4 w-4 text-slate-500 group-hover:text-red-500" />
                <span className="hidden leading-none md:inline text-xs sm:text-xs font-bold">
                  Sign Out
                </span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSettingsClick}
                aria-label="Open settings"
                className="hidden sm:flex gap-2 rounded-xl border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 px-3"
              >
                <Settings className="h-4 w-4 text-slate-500" />
                <span className="hidden md:inline text-xs sm:text-xs font-bold">Settings</span>
              </Button>
            </div>
          </header>

          <main className={cn("flex-1 overflow-x-hidden overflow-y-auto p-3 pb-24 transition-colors duration-300 sm:p-10 sm:pb-10", isAdminRole && "bg-slate-50/70 dark:bg-slate-950/40")}>
            <div className="mx-auto min-w-0 max-w-7xl">
              <Breadcrumbs />
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={location.pathname}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="min-w-0"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
        {isAdminRole && (
          <nav aria-label="Mobile admin navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 xl:hidden">
            <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
              {mobileAdminLinks.map(({ label, path, icon: Icon }) => {
                const active = path === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(path);
                return (
                  <button key={path} type="button" onClick={() => { setIsSidebarOpen(false); navigate(path); }} className={cn("flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-bold transition-colors", active ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800")}>
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                );
              })}
              <button type="button" onClick={() => setIsSidebarOpen(true)} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800">
                <MoreHorizontal className="h-4 w-4" />
                <span>More</span>
              </button>
            </div>
          </nav>
        )}
        {platformSettings?.trackingScriptsFooter && (
          <div
            dangerouslySetInnerHTML={{
              __html: platformSettings.trackingScriptsFooter,
            }}
          />
        )}
      </div>
    </div>
  );
}
