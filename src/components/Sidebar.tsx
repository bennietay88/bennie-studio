import InternalRoleTester from "./InternalRoleTester";
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
  CircleDollarSign,
  Megaphone,
  Waypoints,
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
  const [adminModuleVisibility, setAdminModuleVisibility] = React.useState<Record<string, boolean>>(
    DEFAULT_ADMIN_MODULE_VISIBILITY,
  );
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    "Sales & Leads": true,
    "Daily Operations": true,
    "Daily": true,
    "Website": true,
    "Enquiries": true,
    "Customers & Delivery": false,
    "Content & CMS": false,
    "Plans & Revenue": false,
    "Platform & System": false,
    "Growth": false,
    "Service": false,
    "Account": false,
    "Website Builder": false,
    "Sales & Marketing": false,
    "Business Ops": false,
    "Platform Hub": false,
    "Management": false,
    "AI Systems": false,
    "Core Settings": false,
    "Finance": false,
    "Support": false,
  });

  const toggleSection = (label: string) => {
    setExpandedSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

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

  const navGroups = React.useMemo(() => {
    if (role === "super_admin") {
      return [
        {
          label: "Sales & Leads",
          items: [
            { to: "/admin", icon: LayoutDashboard, label: "Sales Overview", className: "tour-dashboard" },
            { to: "/admin/growth_operations", icon: Rocket, label: "Growth Operations", moduleId: "growth_operations" },
            { to: "/admin/daily_operations", icon: CalendarIcon, label: "Daily Operations" },
            { to: "/admin/inbound_leads", icon: Inbox, label: "Lead Inbox" },
            { to: "/admin/prospect_explorer", icon: Users, label: "Prospects", moduleId: "prospects" },
            { to: "/admin/website_reviews", icon: Globe, label: "Website Reviews", moduleId: "website_reviews" },
            { to: "/admin/outreach_lab", icon: MessageSquare, label: "Outreach", moduleId: "outreach" },
            { to: "/admin/sales_automation", icon: Zap, label: "Sales Automation", moduleId: "outreach" },
            { to: "/admin/proposals_deals", icon: FileText, label: "Sales Pipeline", moduleId: "sales_pipeline" },
          ]
        },
        {
          label: "Customers & Delivery",
          items: [
            { to: "/admin/businesses", icon: Globe, label: "Active Sites", className: "tour-businesses" },
             { to: "/admin/website_operations", icon: Globe, label: "Website Management" },
            { to: "/admin/users", icon: Users, label: "Users & Access" },
            { to: "/admin/operations_control", icon: BriefcaseBusiness, label: "Operations Control", moduleId: "operations_control" },
            { to: "/admin/projects", icon: Briefcase, label: "Service Projects", moduleId: "service_projects" },
            { to: "/admin/funnels", icon: Waypoints, label: "Sales Funnels", moduleId: "sales_funnels" },
            { to: "/admin/client_onboarding", icon: Sparkles, label: "Client Handover", moduleId: "client_handover" },
            { to: "/admin/seo_management", icon: Search, label: "SEO Operations", moduleId: "seo_management" },
            { to: "/admin/update_requests", icon: FileText, label: "Update Queue", moduleId: "update_queue" },
            { to: "/admin/support", icon: Headphones, label: "Support", moduleId: "support" },
          ]
        },
        {
          label: "Content & CMS",
          items: [
            { to: "/admin/platform_site_cms", icon: Globe, label: "Website CMS", moduleId: "platform_site_cms" },
            { to: "/admin/templates", icon: Layout, label: "Website Templates", moduleId: "website_templates" },
            { to: "/admin/studio_showcases", icon: FileText, label: "Studio Showcase CMS" },
            { to: "/admin/blog", icon: FileText, label: "Blog CMS", moduleId: "blog_cms" },
            { to: "/admin/local_seo", icon: MapPin, label: "Local SEO", moduleId: "local_seo" },
            { to: "/admin/policies", icon: FileText, label: "Policies CMS", moduleId: "policies_cms" },
          ]
        },
        {
          label: "Plans & Revenue",
          items: [
            { to: "/admin/plans", icon: CreditCard, label: "Plans & Pricing", moduleId: "plans_pricing" },
            { to: "/admin/revenue", icon: CreditCard, label: "Revenue", moduleId: "revenue" },
            { to: "/admin/affiliates", icon: Gift, label: "Partners & Affiliates", moduleId: "partners_affiliates" },
            { to: "/admin/finance", icon: CircleDollarSign, label: "Finance", permission: "finance" },
          ]
        },
        {
          label: "Platform & System",
          items: [
            { to: "/admin/growth_os_config", icon: Settings, label: "Feature Controls" },
            { to: "/admin/traffic", icon: BarChart3, label: "Traffic Analytics", moduleId: "traffic_analytics" },
            { to: "/admin/status", icon: Shield, label: "System Status" },
            { to: "/admin/ecosystem_architect", icon: ShieldCheck, label: "Ecosystem Architect", moduleId: "ecosystem_architect" },
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
            { to: "/admin/website_reviews", icon: Globe, label: "Website Audits", permission: "prospects" },
            { to: "/admin/outreach_lab", icon: MessageSquare, label: "Outreach Hub", permission: "prospects" },
            { to: "/admin/proposals_deals", icon: FileText, label: "Sales Pipeline", permission: "sales" },
          ],
        },
        {
          label: "Delivery Ops",
          items: [
            { to: "/admin/projects", icon: Briefcase, label: "Service Projects", permission: "delivery" },
            { to: "/admin/website_operations", icon: Globe, label: "Website Operations", permission: "delivery" },
            { to: "/admin/client_onboarding", icon: Sparkles, label: "Client Handover", permission: "delivery" },
            { to: "/admin/seo_management", icon: Search, label: "SEO Operations", permission: "delivery" },
            { to: "/admin/support", icon: Headphones, label: "Support Desk", permission: "support" },
            { to: "/admin/update_requests", icon: FileText, label: "Update Queue", permission: "support" },
            { to: "/admin/status", icon: Shield, label: "System Status", permission: "customer_health" },
          ],
        },
      ];
    }

    if (role === "staff" || role === "client") {
      return [
        { label: "Daily", items: [
          { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
          { to: "/dashboard/leads", icon: Users, label: "Leads", featureId: "lead_crm" },
          { to: "/dashboard/appointments", icon: CalendarIcon, label: "Appointments", featureId: "booking" },
          { to: "/dashboard/funnels", icon: Waypoints, label: "Sales Funnels", featureId: "sales_funnels" },
          { to: "/dashboard/blog", icon: FileText, label: "Blog CMS", featureId: "blog" },
          { to: "/dashboard/update-requests", icon: FileText, label: "Update Requests" },
          { to: "/dashboard/support", icon: Headphones, label: "Support" },
        ]},
      ];
    }

    if (role === "business_admin") {
      return [
        { label: "Website", items: [
          { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
          { to: "/dashboard/websites", icon: Globe, label: "My Websites" },
          { to: "/dashboard/my-website", icon: Globe, label: "Managed Website" },
          { to: "/dashboard/approvals", icon: ShieldCheck, label: "Review & Approvals" },
          { to: "/dashboard/analytics", icon: BarChart3, label: "Performance", featureId: "analytics" },
        ]},
        { label: "Enquiries", items: [
          { to: "/dashboard/leads", icon: Users, label: "Leads", featureId: "lead_crm" },
          { to: "/dashboard/appointments", icon: CalendarIcon, label: "Appointments", featureId: "booking" },
        ]},
        { label: "Growth", items: [
          { to: "/dashboard/funnels", icon: Waypoints, label: "Sales Funnels", featureId: "sales_funnels" },
          { to: "/dashboard/funnels/plans", icon: PlusCircle, label: "Funnel Plans", featureId: "sales_funnels" },
          ...(import.meta.env.VITE_UNIFIED_FUNNEL_TIERS_ENABLED === "true"
            ? [{ to: "/dashboard/funnels/plans", icon: CreditCard, label: "Funnel Plans" }]
            : []),
          { to: "/dashboard/blog", icon: FileText, label: "Blog CMS", featureId: "blog" },
          { to: "/dashboard/marketing-hub", icon: Megaphone, label: "Marketing Pro" },
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

    if (role === "affiliate") {
      return [{ label: "Affiliate", items: [
        { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
        { to: "/dashboard/profile", icon: User, label: "Profile" },
        { to: "/dashboard/support", icon: Headphones, label: "Support" },
      ] }];
    }

    return [{
       label: "Navigation",
       items: [
         { to: "/dashboard", icon: LayoutDashboard, label: "Overview" },
         { to: "/dashboard/leads", icon: Users, label: "My Leads" },
       ]
    }];
  }, [role, isFeatureEnabled, isFeatureVisible]);

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
              return false;
            }
            if (isCustomerRole && link.featureId && (!isFeatureEnabled(link.featureId) || !isFeatureVisible(link.featureId))) {
              return false;
            }
            return true;
          }),
        }))
        .filter((group) => group.items.length > 0),
    [adminModuleVisibility, isCustomerRole, isFeatureEnabled, isFeatureVisible, navGroups, profile?.staffPermissions, role],
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
              <span className="text-lg leading-none tracking-tight">Bennie Studio</span>
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">Operations</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
        <nav className="space-y-6">
          {visibleNavGroups.map((group) => {
            const groupHasActiveRoute = group.items.some((link: any) =>
              location.pathname === link.to ||
              ((link.to !== "/admin" && link.to !== "/dashboard") && location.pathname.startsWith(`${link.to}/`)),
            );
            const isExpanded = Boolean(expandedSections[group.label] || groupHasActiveRoute);
            
            return (
              <div key={group.label} className="space-y-1">
                {!isCollapsed && (
                  <button 
                    onClick={() => toggleSection(group.label)}
                    className="flex items-center justify-between w-full px-3 mb-2 group/header"
                  >
                    <span className="text-xs font-semibold tracking-wide text-slate-500 transition-colors group-hover/header:text-indigo-600">
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

                        const isActive =
                          location.pathname === link.to ||
                          ((link.to !== "/admin" && link.to !== "/dashboard") && location.pathname.startsWith(`${link.to}/`));

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
              <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                {(profile?.role || "").replace("_", " ")}
              </span>
            </motion.div>
          )}
        </div>
        {!isCollapsed&&<InternalRoleTester/>}
        {!isCollapsed && (mainWebsiteLink || portfolioLink) && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            {mainWebsiteLink && (
              <a
                href={mainWebsiteLink.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-indigo-900/20"
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
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-indigo-900/20"
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
