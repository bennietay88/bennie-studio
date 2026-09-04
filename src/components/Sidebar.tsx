/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/src/lib/utils";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useFeatures, FeatureId } from "../hooks/useFeatures";
import { UserRole } from "../types";
import {
  LayoutDashboard,
  Layout,
  Globe,
  Users,
  User,
  FileText,
  Settings,
  BarChart3,
  PlusCircle,
  LogOut,
  CreditCard,
  Rocket,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  Lock,
  ShoppingBag,
  MessageSquare,
  Star,
  Zap,
  Headphones,
  Sparkles,
  Gift,
  Plug,
  Briefcase,
  Shield,
  ShieldCheck,
  MapPin,
  ExternalLink,
  BriefcaseBusiness,
  Inbox,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getEcosystemLink } from "../constants/businessEcosystem";
import { DEFAULT_ADMIN_MODULE_VISIBILITY } from "../constants/adminModules";

interface SidebarProps {
  role: UserRole;
  onLogout: () => void;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  role,
  onLogout,
  onClose,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const { profile } = useAuth();
  const { isFeatureEnabled, isFeatureVisible } = useFeatures();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAffiliate, setIsAffiliate] = React.useState(false);
  const [adminModuleVisibility, setAdminModuleVisibility] = React.useState<Record<string, boolean>>(
    DEFAULT_ADMIN_MODULE_VISIBILITY,
  );
  const dashboardModeKey = React.useMemo(
    () => `bts_customer_dashboard_mode_${profile?.uid || profile?.email || "default"}`,
    [profile?.uid, profile?.email],
  );
  const [customerDashboardMode, setCustomerDashboardMode] = React.useState<
    "simple" | "development"
  >("simple");
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    "Sales & Leads": true,
    "Customers & Delivery": true,
    "Content & CMS": true,
    "Plans & Revenue": true,
    "Platform & System": true,
    "Website Builder": true,
    "Sales & Marketing": true,
    "Business Ops": true,
    "Platform Hub": true,
    "Management": true,
    "AI Systems": true,
    "Core Settings": true,
    "Finance": true,
    "Support": true,
  });

  const toggleSection = (label: string) => {
    setExpandedSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  React.useEffect(() => {
    const checkAffiliate = async () => {
      const { data } = await supabase
        .from("affiliates")
        .select("id")
        .eq("uid", profile?.uid)
        .maybeSingle();
      if (data) setIsAffiliate(true);
    };
    if (profile?.uid) checkAffiliate();
  }, [profile?.uid]);

  React.useEffect(() => {
    if (role !== "super_admin") return;

    const applyModuleSettings = (content?: Record<string, any> | null) => {
      setAdminModuleVisibility({
        ...DEFAULT_ADMIN_MODULE_VISIBILITY,
        ...(content?.adminModules || {}),
      });
    };

    const fetchModuleSettings = async () => {
      const { data } = await supabase
        .from("settings")
        .select("content")
        .eq("id", "platform")
        .maybeSingle();
      applyModuleSettings(data?.content);
    };

    void fetchModuleSettings();
    const channel = supabase
      .channel("superadmin-module-visibility")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "settings", filter: "id=eq.platform" },
        (payload) => applyModuleSettings((payload.new as any)?.content),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [role]);

  React.useEffect(() => {
    try {
      const savedMode = localStorage.getItem(dashboardModeKey);
      setCustomerDashboardMode(savedMode === "development" ? "development" : "simple");
    } catch {
      setCustomerDashboardMode("simple");
    }
  }, [dashboardModeKey]);

  const updateCustomerDashboardMode = (mode: "simple" | "development") => {
    setCustomerDashboardMode(mode);
    try {
      localStorage.setItem(dashboardModeKey, mode);
      window.dispatchEvent(
        new CustomEvent("bts:dashboard-mode-change", {
          detail: { mode, key: dashboardModeKey },
        }),
      );
    } catch {
      // Local persistence is a convenience only.
    }
  };

  const navGroups = React.useMemo(() => {
    if (role === "super_admin") {
      return [
        {
          label: "Sales & Leads",
          items: [
            { to: "/admin", icon: LayoutDashboard, label: "Sales Command Center", className: "tour-dashboard" },
            { to: "/admin/daily_operations", icon: CalendarIcon, label: "Daily Operations" },
            { to: "/admin/inbound_leads", icon: Inbox, label: "Lead Inbox" },
            { to: "/admin/prospect_explorer", icon: Users, label: "Prospects", moduleId: "prospects" },
            { to: "/admin/neural_auditor", icon: Globe, label: "Website Reviews", moduleId: "website_reviews" },
            { to: "/admin/outreach_lab", icon: MessageSquare, label: "Outreach", moduleId: "outreach" },
            { to: "/admin/proposals_deals", icon: FileText, label: "Sales Pipeline", moduleId: "sales_pipeline" },
          ]
        },
        {
          label: "Customers & Delivery",
          items: [
            { to: "/admin/businesses", icon: Globe, label: "Active Sites", className: "tour-businesses" },
            { to: "/admin/users", icon: Users, label: "Users & Access" },
            { to: "/admin/projects", icon: Briefcase, label: "Service Projects", moduleId: "service_projects" },
            { to: "/admin/client_onboarding", icon: Sparkles, label: "Client Handover", moduleId: "client_handover" },
            { to: "/admin/seo_management", icon: Search, label: "SEO Operations", moduleId: "seo_management" },
            { to: "/admin/update_requests", icon: FileText, label: "Update Queue", moduleId: "update_queue" },
            { to: "/admin/support", icon: Headphones, label: "Support", moduleId: "support" },
          ]
        },
        {
          label: "Content & CMS",
          items: [
            { to: "/admin/templates", icon: Layout, label: "Website Templates", moduleId: "website_templates" },
            { to: "/admin/policies", icon: FileText, label: "Policies CMS", moduleId: "policies_cms" },
          ]
        },
        {
          label: "Plans & Revenue",
          items: [
            { to: "/admin/plans", icon: CreditCard, label: "Plans & Pricing", moduleId: "plans_pricing" },
            { to: "/admin/revenue", icon: CreditCard, label: "Revenue", moduleId: "revenue" },
          ]
        },
        {
          label: "Platform & System",
          items: [
            { to: "/admin/growth_os_config", icon: Settings, label: "Feature Controls" },
            { to: "/admin/traffic", icon: BarChart3, label: "Traffic Analytics", moduleId: "traffic_analytics" },
            { to: "/admin/status", icon: Shield, label: "System Status" },
            { to: "/admin/settings", icon: Settings, label: "Platform Settings" },
          ]
        }
      ];
    }

    if (role === "platform_staff") {
      return [
        {
          label: "Daily Operations",
          items: [
            { to: "/admin/daily_operations", icon: CalendarIcon, label: "Customer Operations" },
            { to: "/admin/inbound_leads", icon: Inbox, label: "Lead Inbox", permission: "sales" },
            { to: "/admin", icon: LayoutDashboard, label: "Ops Overview" },
          ],
        },
        {
          label: "Sales Ops",
          items: [
            { to: "/admin/sales_home", icon: Rocket, label: "Sales Home", permission: "sales" },
            { to: "/admin/prospect_explorer", icon: Users, label: "Prospecting", permission: "prospects" },
            { to: "/admin/neural_auditor", icon: Globe, label: "Website Audits", permission: "prospects" },
            { to: "/admin/outreach_lab", icon: MessageSquare, label: "Outreach Hub", permission: "prospects" },
            { to: "/admin/proposals_deals", icon: FileText, label: "Sales Pipeline", permission: "sales" },
          ],
        },
        {
          label: "Delivery Ops",
          items: [
            { to: "/admin/projects", icon: Briefcase, label: "Service Projects", permission: "delivery" },
            { to: "/admin/client_onboarding", icon: Sparkles, label: "Client Handover", permission: "delivery" },
            { to: "/admin/seo_management", icon: Search, label: "SEO Operations", permission: "delivery" },
            { to: "/admin/support", icon: Headphones, label: "Support Desk", permission: "support" },
            { to: "/admin/update_requests", icon: FileText, label: "Update Queue", permission: "support" },
            { to: "/admin/status", icon: Shield, label: "System Status", permission: "customer_health" },
          ],
        },
      ];
    }

    if ((role === "staff" || role === "client") && customerDashboardMode === "simple") {
      return [
        { label: "Daily", items: [
          { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
          { to: "/dashboard/leads", icon: Users, label: "Leads", featureId: "lead_crm" },
          { to: "/dashboard/appointments", icon: CalendarIcon, label: "Appointments", featureId: "booking" },
          { to: "/dashboard/update-requests", icon: FileText, label: "Update Requests" },
          { to: "/dashboard/support", icon: Headphones, label: "Support" },
        ]},
      ];
    }

    if (role === "business_admin" && customerDashboardMode === "simple") {
      return [
        { label: "Website", items: [
          { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
          { to: "/dashboard/my-website", icon: Globe, label: "My Website" },
          { to: "/dashboard/approvals", icon: ShieldCheck, label: "Review & Approvals" },
          { to: "/dashboard/analytics", icon: BarChart3, label: "Performance", featureId: "analytics" },
        ]},
        { label: "Enquiries", items: [
          { to: "/dashboard/leads", icon: Users, label: "Leads", featureId: "lead_crm" },
          { to: "/dashboard/appointments", icon: CalendarIcon, label: "Appointments", featureId: "booking" },
        ]},
        { label: "Service", items: [
          { to: "/dashboard/update-requests", icon: FileText, label: "Update Requests" },
          { to: "/dashboard/support", icon: Headphones, label: "Support" },
        ]},
        { label: "Account", items: [
          { to: "/dashboard/billing", icon: CreditCard, label: "Billing" },
          { to: "/dashboard/profile", icon: User, label: "Account & Export" },
        ]},
      ];
    }

    if (role === "business_admin" || role === "staff" || role === "client") {
      return [
        {
          label: "Website",
          items: [
            { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
            { to: "/dashboard/website/regenerate", icon: Sparkles, label: "Web Generator", featureId: "ai_synthesis", devOnly: true, roles: ["business_admin"] },
            { to: "/dashboard/website", icon: Globe, label: "Website Editor", featureId: "ai_synthesis", devOnly: true, roles: ["business_admin"] },
            { to: "/dashboard/marketplace", icon: Layout, label: "Template Library", devOnly: true, roles: ["business_admin"] },
          ]
        },
        {
          label: "Enquiries",
          items: [
            { to: "/dashboard/leads", icon: Users, label: "Leads & CRM", featureId: "lead_crm" },
            { to: "/dashboard/chatbot", icon: MessageSquare, label: "AI Sales Chat", featureId: "ai_chatbot", devOnly: true },
          ]
        },
        {
          label: "Business",
          items: [
            { to: "/dashboard/appointments", icon: CalendarIcon, label: "Booking Calendar", featureId: "booking" },
            { to: "/dashboard/update-requests", icon: FileText, label: "Update Requests", devOnly: true, roles: ["business_admin"] },
            { to: "/dashboard/seo-domain", icon: Globe, label: "Domain & SEO", devOnly: true, roles: ["business_admin"] },
            { to: "/dashboard/local-seo", icon: MapPin, label: "Local SEO", devOnly: true, roles: ["business_admin"] },
            { to: "/dashboard/seo/overview", icon: Search, label: "SEO Growth" },
            { to: "/dashboard/industry-content", icon: Briefcase, label: "Listings & Content", featureId: "industry_content" },
            { to: "/dashboard/reviews", icon: Star, label: "Reviews & Reputation", featureId: "review_management" },
            { to: "/dashboard/team", icon: Users, label: "Staff Accounts", roles: ["business_admin"] },
            { to: "/dashboard/approvals", icon: ShieldCheck, label: "Website Approvals" },
          ]
        },
        {
          label: "Account",
          items: [
            { to: "/dashboard/status", icon: Shield, label: "System Status" },
            { to: "/dashboard/billing", icon: CreditCard, label: "Billing & Plans", roles: ["business_admin"] },
            { to: "/dashboard/support", icon: Headphones, label: "Support" },
            isAffiliate && { to: "/dashboard/affiliate/dashboard", icon: Gift, label: "Affiliate Center" },
            { to: "/dashboard/settings", icon: Settings, label: "System Settings", devOnly: true, roles: ["business_admin"] },
          ]
        }
      ];
    }

    return [{
       label: "Navigation",
       items: [
         { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
         { to: "/dashboard/leads", icon: Users, label: "My Leads" },
       ]
    }];
  }, [role, isFeatureEnabled, isFeatureVisible, isAffiliate, customerDashboardMode]);

  const isCustomerRole = role === "business_admin" || role === "staff" || role === "client";
  const visibleNavGroups = React.useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((link: any) => {
            if (!link) return false;
            if (Array.isArray(link.roles) && !link.roles.includes(role)) return false;
            if (
              role === "super_admin" &&
              link.moduleId &&
              adminModuleVisibility[link.moduleId] === false
            ) {
              return false;
            }
            if (
              role === "platform_staff" &&
              link.permission &&
              !(profile?.staffPermissions || []).includes(link.permission)
            ) {
              return false;
            }
            if (
              role === "platform_staff" &&
              Array.isArray(link.permissions) &&
              !link.permissions.some((permission: string) =>
                (profile?.staffPermissions || []).includes(permission),
              )
            ) {
              return false;
            }
            if (link.devOnly && isCustomerRole) {
              if (role !== "business_admin") return false;
              if (customerDashboardMode !== "development") return false;
            }
            if (isCustomerRole && link.featureId && (!isFeatureEnabled(link.featureId) || !isFeatureVisible(link.featureId))) {
              return false;
            }
            return true;
          }),
        }))
        .filter((group) => group.items.length > 0),
    [adminModuleVisibility, customerDashboardMode, isCustomerRole, isFeatureEnabled, isFeatureVisible, navGroups, profile?.staffPermissions, role],
  );
  const mainWebsiteLink = getEcosystemLink("main");
  const portfolioLink = getEcosystemLink("portfolio");

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-500 ease-in-out relative",
        isCollapsed ? "w-20" : "w-72",
      )}
    >
      <button
        onClick={onToggleCollapse}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden xl:flex absolute -right-3 top-24 h-6 w-6 items-center justify-center rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400 hover:text-indigo-600 shadow-sm z-50 transition-colors"
      >
        {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      <div className="flex h-20 items-center justify-between px-6">
        <div className="flex items-center gap-3 font-bold text-slate-900 dark:text-white overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20">
            <Globe className="h-6 w-6" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col whitespace-nowrap">
              <span className="text-lg leading-none tracking-tight">Studio Pro</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Control Center</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
        {role === "business_admin" && !isCollapsed && (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-800/50">
            <div className="grid grid-cols-2 gap-1">
              {[
                { id: "simple", label: "Daily" },
                { id: "development", label: "Development" },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() =>
                    updateCustomerDashboardMode(mode.id as "simple" | "development")
                  }
                  className={cn(
                    "rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-wide transition-all",
                    customerDashboardMode === mode.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white",
                  )}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <p className="mt-2 px-2 text-[10px] font-semibold leading-relaxed text-slate-500">
              {customerDashboardMode === "development"
                ? "Website editing and build tools are visible."
                : "Showing the normal customer dashboard only."}
            </p>
          </div>
        )}
        <nav className="space-y-6">
          {visibleNavGroups.map((group) => {
            const isExpanded = expandedSections[group.label];
            
            return (
              <div key={group.label} className="space-y-1">
                {!isCollapsed && (
                  <button 
                    onClick={() => toggleSection(group.label)}
                    className="flex items-center justify-between w-full px-3 mb-2 group/header"
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover/header:text-indigo-600 transition-colors">
                      {group.label}
                    </span>
                    <ChevronDown className={cn(
                      "h-3 w-3 text-slate-300 transition-transform duration-300",
                      isExpanded ? "rotate-0" : "-rotate-90"
                    )} />
                  </button>
                )}

                <AnimatePresence initial={false}>
                  {(isExpanded || isCollapsed) && (
                    <motion.div
                      initial={isCollapsed ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-1 overflow-hidden"
                    >
                      {group.items.map((link: any) => {
                        if (!link) return null;
                        if (link.featureId && !isFeatureVisible(link.featureId)) return null;
                        const isEnabled = !link.featureId || isFeatureEnabled(link.featureId);
                        if (link.roles && !link.roles.includes(role)) return null;

                        const isActive = location.pathname === link.to;

                        return (
                          <NavLink
                            key={link.to}
                            to={isEnabled ? link.to : "/dashboard/billing"}
                            onClick={isEnabled ? onClose : (e) => {
                              e.preventDefault();
                              toast("Upgrade Required", {
                                description: `The ${link.label} feature is available on higher plans.`,
                                action: {
                                  label: "Upgrade",
                                  onClick: () => navigate("/dashboard/billing")
                                }
                              });
                            }}
                            className={cn(
                              "group relative flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200",
                              isActive
                                ? "text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100",
                              !isEnabled && "opacity-60 grayscale-[0.5]",
                              link.className
                            )}
                          >
                            <link.icon className={cn(
                              "h-5 w-5 flex-shrink-0 transition-all duration-200",
                              isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-500",
                              isCollapsed ? "mx-auto" : "mr-3"
                            )} />
                            {!isCollapsed && (
                              <span className="whitespace-nowrap flex-1">{link.label}</span>
                            )}
                            {!isEnabled && !isCollapsed && (
                              <Lock className="h-3 w-3 text-slate-300" />
                            )}
                          </NavLink>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-slate-200 dark:border-slate-800 p-4">
        <div
          className={cn(
            "mb-4 flex items-center gap-3 px-2 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 transition-all duration-300",
            isCollapsed ? "justify-center" : "",
          )}
        >
          <div className="h-10 w-10 shrink-0 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shadow-inner">
            {profile?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              className="flex flex-col min-w-0"
            >
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {profile?.email?.split("@")[0]}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate uppercase tracking-tighter">
                {(profile?.role || "").replace("_", " ")}
              </span>
            </motion.div>
          )}
        </div>
        {!isCollapsed && (mainWebsiteLink || portfolioLink) && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            {mainWebsiteLink && (
              <a
                href={mainWebsiteLink.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2 text-[10px] font-black uppercase tracking-wide text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-indigo-900/20"
              >
                <Globe className="h-3.5 w-3.5" />
                Main
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {portfolioLink && (
              <a
                href={portfolioLink.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2 text-[10px] font-black uppercase tracking-wide text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-indigo-900/20"
              >
                <BriefcaseBusiness className="h-3.5 w-3.5" />
                Work
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
        <button
          onClick={onLogout}
          className={cn(
            "flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-400 transition-all duration-200",
            isCollapsed ? "justify-center" : "",
          )}
        >
          <LogOut
            className={cn("h-5 w-5 transition-all", isCollapsed ? "" : "mr-3")}
          />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );
}
