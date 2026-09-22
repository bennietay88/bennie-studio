/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import {
  Users,
  Globe,
  BarChart3,
  Settings,
  Plus,
  Search,
  MoreVertical,
  ExternalLink,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  AlertCircle,
  Zap,
  Loader2,
  RefreshCw,
  X,
  Save,
  CreditCard,
  Shield,
  ShieldCheck,
  FileText,
  Gift,
  Award,
  CircleDollarSign,
  Briefcase,
  Layout,
  Cpu,
  BrainCircuit,
  Microchip,
  XCircle,
  Megaphone,
  Palette,
  TrendingUp,
  Home,
  Video,
  History,
  Rocket,
  Target,
  Phone,
  MessageSquare,
  Sparkles,
  Download,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/card";
import { Button, buttonVariants } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { cn, formatDate } from "../lib/utils";
import { Joyride, type Step } from "react-joyride";
import { AdminSupport } from "./AdminSupport";
import { MonthlyUpdateQueue } from "./SuperAdmin/MonthlyUpdateQueue";
import { TemplateGallery } from "./TemplateGallery";
import { PoliciesCMS } from "./PoliciesCMS";
import LandingPageEditor from "./LandingPageEditor";
import PlanEditor from "./PlanEditor";
import { RevenueDashboard } from "./RevenueDashboard";
import { TemplateManager } from "./SuperAdmin/TemplateManager";
import { WebsiteEditor } from "./WebsiteEditor";
import { ArrowLeft } from "lucide-react";
import { SuperAdminAffiliates } from "./SuperAdminAffiliates";
import { SuperAdminAffiliatePartners } from "./SuperAdminAffiliatePartners";
import { StyleThemeManager } from "./SuperAdmin/StyleThemeManager";

import { RevenueCommand } from "./SuperAdmin/RevenueCommand";
import { FinanceDashboard } from "./SuperAdmin/FinanceDashboard";
import { SalesHome } from "./SuperAdmin/SalesHome";
import { ProspectExplorer } from "./SuperAdmin/ProspectExplorer";
import { NeuralAuditor } from "./SuperAdmin/NeuralAuditor";
import { OutreachLab } from "./SuperAdmin/OutreachLab";
import { ProposalsDeals } from "./SuperAdmin/ProposalsDeals";
import { ClientOnboarding } from "./SuperAdmin/ClientOnboarding";
import { Projects } from "./SuperAdmin/Projects";
import { AdminLeadInbox } from "./SuperAdmin/AdminLeadInbox";
import { DailyOperations } from "./SuperAdmin/DailyOperations";
import CommercialCatalogue from "./SuperAdmin/CommercialCatalogue";
import { SystemStatusPage } from "./SystemStatusPage";
import { PLANS as STATIC_PLANS, normalizePlans } from "../constants/plans";
import {
  ADMIN_MODULES,
  ADMIN_MODULE_PRIORITY_LABELS,
  DEFAULT_ADMIN_MODULE_VISIBILITY,
} from "../constants/adminModules";
import { ADMIN_TAB_PERMISSIONS, DEFAULT_PLATFORM_STAFF_PERMISSIONS } from "../constants/staffPermissions";
import SeoAdmin from "../modules/seo/components/SeoAdmin";
import { BlogCMS } from "./BlogCMS";
import { AdminLocalSeo } from "./SuperAdmin/AdminLocalSeo";
import { MarketingPlanEntitlements } from "./SuperAdmin/MarketingPlanEntitlements";

const CUSTOMER_DASHBOARD_FEATURES = [
  { id: "ai_synthesis", label: "Website Generator" },
  { id: "advanced_seo", label: "Domain & SEO" },
  { id: "local_seo_geo", label: "Local SEO" },
  { id: "lead_crm", label: "Leads & CRM" },
  { id: "booking", label: "Booking Calendar" },
  { id: "review_management", label: "Reviews & Reputation" },
  { id: "industry_content", label: "Listings & Content" },
  { id: "analytics", label: "Business Insights" },
  { id: "whatsapp_enquiry_kit", label: "WhatsApp Enquiry Kit" },
  { id: "monthly_improvement_engine", label: "Monthly Improvement Engine" },
];

const CUSTOMER_DASHBOARD_PROFILES = [
  { id: "simple_website_client", label: "Simple Website Client" },
  { id: "lead_generation_client", label: "Lead Generation Client" },
  { id: "local_seo_client", label: "Local SEO Client" },
  { id: "booking_client", label: "Booking Client" },
  { id: "growth_client", label: "Growth Client" },
];

const getBusinessWebsiteUrl = (business: any) => {
  const customDomain = String(business?.custom_domain || "").trim();
  const customDomainStatus = String(business?.custom_domain_status || "").toLowerCase();

  if (customDomain && customDomainStatus === "connected") {
    return customDomain.startsWith("http://") || customDomain.startsWith("https://")
      ? customDomain
      : `https://${customDomain}`;
  }

  return `/w/${business.id}`;
};

const openBusinessWebsite = (business: any) => {
  const url = getBusinessWebsiteUrl(business);
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    window.location.assign(url);
  }
};

export default function SuperAdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getTabFromPath = () => {
    const parts = location.pathname.split("/");
    const last = parts.pop();
    const secondLast = parts.pop();

    if (location.pathname.includes("/admin/templates")) return "templates";
    if (last === "admin" || last === "overview") return "overview";
    if (last === "sales_home") return "sales_home";
    if (last === "inbound_leads") return "inbound_leads";
    if (last === "daily_operations") return "daily_operations";
    if (last === "growth_os_config") return "growth_os_config";
    if (last === "settings") return "settings";
    if (last === "revenue") return "revenue";
    if (last === "finance") return "finance";
    if (last === "geo_pricing") return "plans";
    if (last === "prospect_explorer") return "prospect_explorer";
    if (last === "neural_auditor") return "neural_auditor";
    if (last === "outreach_lab") return "outreach_lab";
    if (last === "mass_campaigns") return "sales_home";
    if (last === "webinar_engine") return "sales_home";
    if (last === "proposals_deals") return "proposals_deals";
    if (last === "sales_automation") return "sales_home";
    if (last === "projects") return "projects";
    if (last === "launch_audit") return "daily_operations";
    if (last === "client_onboarding") return "client_onboarding";
    if (last === "operations") return "operations_control";
    if (last === "operations_control") return "operations_control";
    if (last === "growth_operations") return "growth_operations";
    if (last === "custom-applications") return "projects";
    if (last === "seo_management") return "seo_management";
    if (last === "local_seo") return "local_seo";
    if (last === "templates") return "templates";
    if (last === "plans") return "plans";
    if (last === "compliance_market") return "plans";
    if (last === "ai_credits") return "growth_os_config";
    if (last === "status") return "status";
    if (last === "intelligence_lab") return "growth_os_config";
    if (last === "traffic") return "traffic";
    if (last === "support") return "support";
    if (last === "update_requests") return "update_requests";
    if (last === "blog") return "blog";
    if (last === "policies") return "policies";
    if (last === "revenue_command") return "revenue_command";
    if (last === "ecosystem_architect") return "ecosystem_architect";
    
    return last || "overview";
  };

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [affiliatePrograms, setAffiliatePrograms] = useState<any[]>([]);
  const [allPayouts, setAllPayouts] = useState<any[]>([]);
  const [allPartners, setAllPartners] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [trafficMetrics, setTrafficMetrics] = useState<{
    aggregate: {
      totalViews: number;
      uniqueVisitors: number;
      avgViewsPerVisitor: number;
      totalClicks: number;
      registrations: number;
      totalLeads: number;
      totalEvents: number;
      conversionRate: number;
    };
    topPages: { path: string; count: number }[];
    trend: { date: string; views: number; uniques: number; clicks?: number; registrations?: number }[];
    sources: { source: string; count: number }[];
    recentEvents: { eventType: string; sourcePage: string; label: string; createdAt: string }[];
    loading: boolean;
  }>({
    aggregate: {
      totalViews: 0,
      uniqueVisitors: 0,
      avgViewsPerVisitor: 0,
      totalClicks: 0,
      registrations: 0,
      totalLeads: 0,
      totalEvents: 0,
      conversionRate: 0,
    },
    topPages: [],
    trend: [],
    sources: [],
    recentEvents: [],
    loading: true,
  });
  const [globalAffiliateStats, setGlobalAffiliateStats] = useState({
    totalPrograms: 0,
    totalAffiliates: 0,
    totalReferrals: 0,
    totalEarnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(getTabFromPath());
  const isSuperAdmin = profile?.role === "super_admin";
  const isPlatformStaff = profile?.role === "platform_staff";
  const canAccessActiveTab = React.useMemo(() => {
    if (isSuperAdmin || !isPlatformStaff || activeTab === "overview") return true;
    if (activeTab === "daily_operations") {
      return ["sales", "customer_health"].some((permission) => profile?.staffPermissions?.includes(permission));
    }
    const requiredPermission = ADMIN_TAB_PERMISSIONS[activeTab];
    return Boolean(requiredPermission && profile?.staffPermissions?.includes(requiredPermission));
  }, [activeTab, isPlatformStaff, isSuperAdmin, profile?.staffPermissions]);
  const [businessSearchQuery, setBusinessSearchQuery] = useState("");
  const [availablePlans, setAvailablePlans] = useState<any[]>(STATIC_PLANS);
  const [platformSettings, setPlatformSettings] = useState({
    name: "Bennie Studio",
    salesPageTitle: "Bennie Studio",
    salesWhatsappEnabled: true,
    salesWhatsappLink: "",
    salesWhatsappMessage:
      "Hi, I found Bennie Studio and I’m interested in a managed website plan. Can you share more details?",
    salesWhatsappAriaLabel: "Chat with Bennie Studio on WhatsApp",
    supportEmail: "support@bennietay.com",
    maintenanceMode: false,
    maintenanceTitle: "Coming Soon",
    maintenanceMessage:
      "We're currently performing some scheduled maintenance to bring you an even better experience. We'll be back shortly!",
    estimatedDowntime: "Approximately 2 hours",
    gaMeasurementId: "",
    metaPixelId: "",
    trackingScriptsHeader: "",
    trackingScriptsFooter: "",
    adminModules: DEFAULT_ADMIN_MODULE_VISIBILITY,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [isViewUserDialogOpen, setIsViewUserDialogOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(
    null,
  );
  const [editingWebsiteBusinessId, setEditingWebsiteBusinessId] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [terminatingUser, setTerminatingUser] = useState<any>(null);
  const [isTerminateDialogOpen, setIsTerminateDialogOpen] = useState(false);
  const [terminatingBusiness, setTerminatingBusiness] = useState<any>(null);
  const [businessTerminateText, setBusinessTerminateText] = useState("");
  const [isBusinessTerminateDialogOpen, setIsBusinessTerminateDialogOpen] =
    useState(false);
  const [deletingBusiness, setDeletingBusiness] = useState<any>(null);
  const [businessDeleteText, setBusinessDeleteText] = useState("");
  const [isBusinessDeleteDialogOpen, setIsBusinessDeleteDialogOpen] = useState(false);
  const [deletingBusinessId, setDeletingBusinessId] = useState<string | null>(null);
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");
  const [purgeConfirmEmail, setPurgeConfirmEmail] = useState("");
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [exportingBusinessId, setExportingBusinessId] = useState<string | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [architectingAction, setArchitectingAction] = useState<string | null>(null);

  const tourSteps: Step[] = [
    {
      target: ".tour-dashboard",
      content: "Welcome to the Neural Command Center. This is where you monitor the entire platform's health and growth metrics.",
      placement: "bottom",
    },
    {
      target: ".tour-sync",
      content: "Refresh platform records and traffic metrics without leaving the overview.",
      placement: "bottom",
    },
    {
      target: ".tour-scale",
      content: "Open the Growth OS configuration area for infrastructure, billing, AI, and platform settings.",
      placement: "bottom",
    },
    {
      target: ".tour-revenue-command",
      content: "Review revenue, tenant, and operations signals from the command surface.",
      placement: "top",
    },
  ];

  // Sync editingTemplateId from URL if possible, or just keep it purely state-based for now
  // For better UX with back/forward, we should use URL params, but let's stick to state for simplicity
  // and handle the "new" case properly.

  const handleEditTemplate = (id: string) => {
    setEditingTemplateId(id);
    setActiveTab("templates");
    navigate(`/admin/templates/edit/${id}`);
  };

  useEffect(() => {
    const tab = getTabFromPath();
    if (tab !== activeTab) {
      setActiveTab(tab);
    }

    const templateEditMatch = location.pathname.match(/\/admin\/templates\/edit\/([^/]+)/);
    if (templateEditMatch?.[1]) {
      setEditingTemplateId(templateEditMatch[1]);
    } else if (location.pathname === "/admin/templates") {
      setEditingTemplateId(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (activeTab === "traffic") {
      fetchTrafficMetrics();
    }
  }, [activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "overview") {
      navigate("/admin");
    } else if (value === "businesses") {
      navigate("/admin/businesses");
    } else {
      navigate(`/admin/${value}`);
    }
  };

  const recordAdminAction = React.useCallback(
    async (
      actionType: string,
      target: { type?: string; id?: string; label?: string } = {},
      metadata: Record<string, any> = {},
    ) => {
      try {
        const { error } = await supabase.from("admin_action_audit_logs").insert({
          actor_user_id: profile?.uid || null,
          actor_email: (profile as any)?.email || null,
          action_type: actionType,
          target_type: target.type || null,
          target_id: target.id || null,
          target_label: target.label || null,
          metadata,
        });
        if (error) throw error;
      } catch (err) {
        console.warn("Admin audit log skipped:", err);
      }
    },
    [profile],
  );

  const deactivateBusinessInstance = async () => {
    if (profile?.role !== "super_admin") {
      toast.error("Only Super Admins can deactivate business instances");
      return;
    }
    if (!terminatingBusiness) return;
    const requiredText = terminatingBusiness?.name?.trim() || "DEACTIVATE";
    if (businessTerminateText !== requiredText) {
      toast.error("Business name confirmation does not match.");
      return;
    }
    try {
      const { error } = await supabase
        .from("businesses")
        .update({ status: "inactive" })
        .eq("id", terminatingBusiness.id);
      if (error) throw error;
      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === terminatingBusiness.id ? { ...b, status: "inactive" } : b,
        ),
      );
      await recordAdminAction(
        "business.deactivated",
        {
          type: "business",
          id: terminatingBusiness.id,
          label: terminatingBusiness.name,
        },
        { requiredText },
      );
      toast.success("Business instance deactivated");
      setIsBusinessTerminateDialogOpen(false);
      setTerminatingBusiness(null);
      setBusinessTerminateText("");
    } catch (err) {
      console.error("Deactivate failed:", err);
      toast.error("Failed to deactivate business");
    }
  };

  const permanentlyDeleteBusiness = async () => {
    if (profile?.role !== "super_admin") {
      toast.error("Only Super Admins can permanently delete businesses");
      return;
    }
    if (!deletingBusiness) return;

    const requiredText = deletingBusiness?.name?.trim() || "";
    if (!requiredText || businessDeleteText !== requiredText) {
      toast.error("Business name confirmation does not match.");
      return;
    }

    setDeletingBusinessId(deletingBusiness.id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Missing admin session");

      const response = await fetch(`/api/admin/businesses/${encodeURIComponent(deletingBusiness.id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ confirmation: requiredText }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to permanently delete business");
      }

      setBusinesses((prev) => prev.filter((business) => business.id !== deletingBusiness.id));
      toast.success("Business permanently deleted");
      setIsBusinessDeleteDialogOpen(false);
      setDeletingBusiness(null);
      setBusinessDeleteText("");
    } catch (err: any) {
      console.error("Permanent business deletion failed:", err);
      toast.error(err.message || "Failed to permanently delete business");
    } finally {
      setDeletingBusinessId(null);
    }
  };

  const exportTerminationPackage = async (biz: any) => {
    if (profile?.role !== "super_admin") {
      toast.error("Only Super Admins can export termination packages");
      return;
    }

    setExportingBusinessId(biz.id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Missing admin session");

      const response = await fetch(
        `/api/admin/businesses/${biz.id}/termination-export`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            serviceType: "paid_termination_export",
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to generate export package");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const safeName =
        filenameMatch?.[1] ||
        `${String(biz.name || "customer")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")}-termination-export.json`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = safeName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      await recordAdminAction(
        "business.termination_exported",
        { type: "business", id: biz.id, label: biz.name },
        { filename: safeName },
      );
      toast.success("Termination export package generated");
    } catch (err: any) {
      console.error("Termination export failed:", err);
      toast.error(err.message || "Failed to export customer data");
    } finally {
      setExportingBusinessId(null);
    }
  };

  const suspendUser = async (userId: string) => {
    if (profile?.role !== "super_admin") {
      toast.error("Only Super Admins can suspend users");
      return;
    }
    const user = users.find((u) => u.id === userId);
    if (
      !window.confirm(
        `Suspend ${user?.email || user?.name || "this user"}? They will lose dashboard access until restored.`,
      )
    ) {
      return;
    }
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "suspended" })
        .eq("id", userId);
      if (error) throw error;
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: "suspended" } : u)),
      );
      await recordAdminAction(
        "user.suspended",
        { type: "user", id: userId, label: user?.email || user?.name },
      );
      toast.success("User suspended successfully");
    } catch (err) {
      console.error("Suspend failed:", err);
      toast.error("Failed to suspend user");
    }
  };

  const terminateUser = async (userId: string) => {
    if (profile?.role !== "super_admin") {
      toast.error("Only Super Admins can terminate users");
      return;
    }
    try {
      // First, find the business associated with this user before we null it
      const { data: profileData } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", userId)
        .single();
      const associatedBusinessId = profileData?.business_id;

      // Termination sets status to terminated and clears business ID to free it up
      // and prevent further associated actions
      const { error } = await supabase
        .from("profiles")
        .update({
          status: "terminated",
          business_id: null,
        })
        .eq("id", userId);

      if (error) throw error;

      // Also potentially de-activate their business if any
      if (associatedBusinessId) {
        await supabase
          .from("businesses")
          .update({ status: "inactive" })
          .eq("id", associatedBusinessId);
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, status: "terminated", business_id: null }
            : u,
        ),
      );
      await recordAdminAction(
        "user.terminated",
        { type: "user", id: userId, label: terminatingUser?.email || terminatingUser?.name },
        { associatedBusinessId },
      );
      toast.success("User terminated and business disassociated");
      setIsTerminateDialogOpen(false);
      setTerminatingUser(null);
    } catch (err: any) {
      console.error("Termination failed:", err);
      toast.error(`Termination failed: ${err.message || "Unknown error"}`);
    }
  };

  const deleteUserRecord = async (userId: string) => {
    if (profile?.role !== "super_admin") {
      toast.error("Only Super Admins can delete users");
      return;
    }
    const user = users.find((u) => u.id === userId);
    const requiredText = user?.email || userId;
    const confirmation = window.prompt(
      `This permanently deletes the user profile record. Type ${requiredText} to continue.`,
    );
    if (confirmation !== requiredText) {
      toast.info("User deletion cancelled");
      return;
    }
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);
      if (error) throw error;
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      await recordAdminAction(
        "user.deleted",
        { type: "user", id: userId, label: users.find((u) => u.id === userId)?.email },
      );
      toast.success("User record deleted from platform");
    } catch (err) {
      console.error("Delete failed:", err);
      toast.error("Failed to delete user record");
    }
  };

  const handleBulkSuspend = async () => {
    if (selectedUsers.length === 0) return;
    if (
      !window.confirm(
        `Suspend ${selectedUsers.length} selected user account(s)? They will lose dashboard access until restored.`,
      )
    ) {
      return;
    }
    setIsBulkLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "suspended" })
        .in("id", selectedUsers);

      if (error) throw error;
      setUsers((prev) =>
        prev.map((u) =>
          selectedUsers.includes(u.id) ? { ...u, status: "suspended" } : u,
        ),
      );
      await recordAdminAction(
        "users.bulk_suspended",
        { type: "user_batch", id: selectedUsers.join(","), label: `${selectedUsers.length} users` },
        { selectedUsers },
      );
      toast.success(`Suspended ${selectedUsers.length} users`);
      setSelectedUsers([]);
    } catch (err) {
      console.error("Bulk suspend failed:", err);
      toast.error("Bulk operation failed");
    } finally {
      setIsBulkLoading(false);
    }
  };

  useEffect(() => {
    const handleStartTour = () => {
      setShowTour(true);
    };
    window.addEventListener("startFeatureTour", handleStartTour);
    return () => window.removeEventListener("startFeatureTour", handleStartTour);
  }, []);

  const handleTourCallback = (data: any) => {
    const { status } = data;
    if (["finished", "skipped"].includes(status)) {
      setShowTour(false);
      localStorage.setItem("hasSeenTour", "true");
      toast.success("Tour completed! You can restart it from the onboarding checklist.");
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    if (!isSuperAdmin) {
      toast.error("Only Super Admins can change user roles");
      return;
    }
    const user = users.find((u) => u.id === userId);
    if (
      !window.confirm(
        `Change ${user?.email || "this user"} role to ${newRole}? This may change platform permissions.`,
      )
    ) {
      return;
    }
    try {
      const rolePatch = {
        role: newRole,
        ...(newRole === "platform_staff"
          ? { staff_permissions: DEFAULT_PLATFORM_STAFF_PERMISSIONS }
          : {}),
      };
      const { error } = await supabase
        .from("profiles")
        .update(rolePatch)
        .eq("id", userId);
      if (error) throw error;
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ...rolePatch } : u)),
      );
      await recordAdminAction(
        "user.role_updated",
        { type: "user", id: userId, label: users.find((u) => u.id === userId)?.email },
        { newRole },
      );
      toast.success(`User role updated to ${newRole}`);
    } catch (err) {
      console.error("Update role failed:", err);
      toast.error("Failed to update user role");
    }
  };

  const fetchTrafficMetrics = async (days = 30) => {
    try {
      setTrafficMetrics((prev) => ({ ...prev, loading: true }));
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch(
        `/api/platform/traffic-metrics?days=${days}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const result = await response.json();
      if (result.success) {
        setTrafficMetrics({
          aggregate: {
            totalViews: Number(result.aggregate?.totalViews || 0),
            uniqueVisitors: Number(result.aggregate?.uniqueVisitors || 0),
            avgViewsPerVisitor: Number(result.aggregate?.avgViewsPerVisitor || 0),
            totalClicks: Number(result.aggregate?.totalClicks || 0),
            registrations: Number(result.aggregate?.registrations || 0),
            totalLeads: Number(result.aggregate?.totalLeads || 0),
            totalEvents: Number(result.aggregate?.totalEvents || 0),
            conversionRate: Number(result.aggregate?.conversionRate || 0),
          },
          topPages: result.topPages || [],
          trend: result.trend || [],
          sources: result.sources || [],
          recentEvents: result.recentEvents || [],
          loading: false,
        });
      }
    } catch (err) {
      console.error("Error fetching traffic metrics:", err);
      setTrafficMetrics((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const settled = await Promise.allSettled([
          supabase.from("businesses").select("*").order("created_at", { ascending: false }),
          supabase.from("profiles").select("*").order("created_at", { ascending: false }),
          supabase
            .from("appointments")
            .select("*")
            .gte("date", new Date().toISOString().split("T")[0])
            .order("date", { ascending: true }),
          supabase.from("settings").select("*").eq("id", "platform").maybeSingle(),
          supabase.from("settings").select("content").eq("id", "plans").maybeSingle(),
          supabase.from("affiliate_programs").select("*, businesses(name)"),
          supabase.from("affiliates").select("*"),
          supabase.from("affiliate_referrals").select("commission_amount, status"),
          supabase
            .from("affiliate_payouts")
            .select("*, affiliates(uid, referral_code), businesses(name)")
            .order("created_at", { ascending: false }),
          supabase.from("profiles").select("*").eq("role", "affiliate").order("created_at", { ascending: false }),
          supabase.from("projects").select("*"),
          supabase
            .from("plans")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
        ]);

        const readSettled = <T,>(index: number, label: string, fallback: T): T => {
          const result = settled[index];
          if (result.status === "fulfilled") return result.value as T;
          console.warn(`Admin ${label} load failed:`, result.reason);
          return fallback;
        };

        const bizRes = readSettled<any>(0, "businesses", { data: [] });
        const userRes = readSettled<any>(1, "users", { data: [] });
        const apptRes = readSettled<any>(2, "appointments", { data: [] });
        const settingsRes = readSettled<any>(3, "settings", { data: null });
        const plansRes = readSettled<any>(4, "plans", { data: null });
        const affiliateProgsRes = readSettled<any>(5, "affiliate programs", { data: [] });
        const allAffiliatesRes = readSettled<any>(6, "affiliates", { data: [] });
        const allReferralsRes = readSettled<any>(7, "affiliate referrals", { data: [] });
        const allPayoutsRes = readSettled<any>(8, "affiliate payouts", { data: [] });
        const partnersRes = readSettled<any>(9, "affiliate partners", { data: [] });
        const projectsRes = readSettled<any>(10, "projects", { data: [] });
        const planTableRes = readSettled<any>(11, "plan table", { data: [] });

        if (bizRes.data) setBusinesses(bizRes.data);
        if (userRes.data) setUsers(userRes.data);
        if (projectsRes.data) setProjects(projectsRes.data);
        if (apptRes.data) setAppointments(apptRes.data);
        if (settingsRes.data) {
          const {
            marketingFeatures: _legacyMarketingFeatures,
            ...platformContent
          } = settingsRes.data.content || {};
          setPlatformSettings((prev) => ({
            ...prev,
            ...platformContent,
            adminModules: {
              ...DEFAULT_ADMIN_MODULE_VISIBILITY,
              ...(platformContent?.adminModules || {}),
            },
          }));
        }
        if (Array.isArray(planTableRes.data) && planTableRes.data.length > 0) {
          setAvailablePlans(
            normalizePlans(
              planTableRes.data.map((plan: any) => ({
                id: String(plan.slug || plan.id || "").trim().toLowerCase(),
                name: plan.name,
                description: plan.description || "",
                price: `${Number(plan.price_usd || 0).toFixed(0)}`,
                priceId: plan.stripe_price_id || "",
                productId: plan.stripe_product_id || "",
                features: Array.isArray(plan.features) ? plan.features : [],
                enabled_features: Array.isArray(plan.enabled_features) ? plan.enabled_features : [],
                aiCredits: Number(plan.monthly_credit_limit || 0),
                maxPages: Number(plan.project_limit || 1),
                maxLocationPages: Number(plan.location_page_limit || 0),
                monthlyUpdates: plan.monthly_update_allowance || "Monthly update support",
                monthlyUpdateLimit: Number(plan.monthly_update_limit || 0),
                commitmentMonths: Number(plan.commitment_months || 0),
                setupFee: Number(plan.setup_fee || 0),
                marketPrices: plan.market_prices || {},
                marketPriceIds: plan.market_price_ids || {},
                upgradePrompt: plan.upgrade_prompt || "Upgrade to unlock more managed growth tools.",
                isPopular: Boolean(plan.is_popular),
                isActive: plan.is_active !== false,
              })),
            ),
          );
        } else if (Array.isArray(plansRes.data?.content?.pricing) && plansRes.data.content.pricing.length > 0) {
          setAvailablePlans(normalizePlans(plansRes.data.content.pricing));
        }
        if (affiliateProgsRes.data)
          setAffiliatePrograms(affiliateProgsRes.data);
        if (allPayoutsRes.data) setAllPayouts(allPayoutsRes.data);
        if (partnersRes.data) setAllPartners(partnersRes.data);

        // Calculate global stats
        if (
          affiliateProgsRes.data &&
          allAffiliatesRes.data &&
          allReferralsRes.data
        ) {
          const totalEarnings = allReferralsRes.data
            .filter((r) => r.status === "converted")
            .reduce((sum, r) => sum + (r.commission_amount || 0), 0);

          setGlobalAffiliateStats({
            totalPrograms: affiliateProgsRes.data.length,
            totalAffiliates: allAffiliatesRes.data.length,
            totalReferrals: allReferralsRes.data.length,
            totalEarnings,
          });
        }
      } catch (err) {
        console.error("Error fetching admin data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-plan-settings-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "settings",
          filter: "id=eq.plans",
        },
        (payload) => {
          const pricing = (payload.new as any)?.content?.pricing;
          if (Array.isArray(pricing) && pricing.length > 0) {
            setAvailablePlans(normalizePlans(pricing));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      // Save operational settings without printing configuration values to the browser console.
      const platformPromise = supabase.from("settings").upsert({
        id: "platform",
        content: platformSettings,
        updated_at: new Date().toISOString(),
      });

      const platformRes = await platformPromise;
      if (platformRes.error) throw platformRes.error;

      await recordAdminAction("settings.platform_updated", {
        type: "settings",
        id: "platform",
        label: "Platform Settings",
      });
      toast.success("Platform settings updated");
    } catch (error) {
      console.error("Update failed:", error);
      toast.error("Failed to update settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleClearAllData = async () => {
    if (profile?.role !== "super_admin") {
      toast.error("Only Super Admins can purge platform data");
      return;
    }
    if (import.meta.env.VITE_ENABLE_PLATFORM_PURGE !== "true") {
      toast.error("Platform purge is disabled. Set VITE_ENABLE_PLATFORM_PURGE=true only for an approved maintenance window.");
      return;
    }
    if (purgeConfirmText !== "PURGE PLATFORM DATA") {
      toast.error("Typed confirmation must exactly match PURGE PLATFORM DATA");
      return;
    }
    if (purgeConfirmEmail !== (profile as any)?.email) {
      toast.error("Admin email confirmation does not match your signed-in account.");
      return;
    }
    setLoading(true);
    try {
      // In a real environment with cascades, this is simple.
      // Here we might need to delete from multiple tables if cascades aren't fully set up.

      const tables = [
        "affiliate_referrals",
        "affiliate_payouts",
        "affiliates",
        "affiliate_programs",
        "analytic_events",
        "appointments",
        "blog_posts",
        "leads",
        "websites",
        "profiles",
        "businesses",
      ];

      const failures: string[] = [];
      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete everything
        if (error) {
          failures.push(`${table}: ${error.message}`);
          console.warn(`Error clearing ${table}:`, error);
        }
      }

      if (failures.length > 0) {
        toast.error(`Purge failed for ${failures.length} table(s): ${failures.slice(0, 3).join("; ")}`);
        await recordAdminAction(
          "platform.data_purge_failed",
          { type: "platform", id: "all", label: "All platform data" },
          { failures },
        );
        return;
      }

      toast.success("Platform data cleared successfully. Please refresh.");
      await recordAdminAction("platform.data_purged", {
        type: "platform",
        id: "all",
        label: "All platform data",
      });
      window.location.reload();
    } catch (error: any) {
      toast.error("Failed to clear data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getVisibilityArray = (
    key: "dashboard_hidden_features" | "dashboard_admin_only_features",
  ) => (Array.isArray(editingBusiness?.[key]) ? editingBusiness[key] : []);

  const setDashboardFeatureVisible = (featureId: string, visible: boolean) => {
    const hidden = getVisibilityArray("dashboard_hidden_features");
    const adminOnly = getVisibilityArray("dashboard_admin_only_features");

    setEditingBusiness({
      ...editingBusiness,
      dashboard_hidden_features: visible
        ? hidden.filter((item: string) => item !== featureId)
        : Array.from(new Set([...hidden, featureId])),
      dashboard_admin_only_features: visible
        ? adminOnly.filter((item: string) => item !== featureId)
        : adminOnly,
    });
  };

  const setDashboardFeatureAdminOnly = (
    featureId: string,
    adminOnlyEnabled: boolean,
  ) => {
    const hidden = getVisibilityArray("dashboard_hidden_features").filter(
      (item: string) => item !== featureId,
    );
    const adminOnly = getVisibilityArray("dashboard_admin_only_features");

    setEditingBusiness({
      ...editingBusiness,
      dashboard_hidden_features: hidden,
      dashboard_admin_only_features: adminOnlyEnabled
        ? Array.from(new Set([...adminOnly, featureId]))
        : adminOnly.filter((item: string) => item !== featureId),
    });
  };

  const handleUpdateBusiness = async () => {
    if (!editingBusiness) return;
    setSavingBusiness(true);
    const updateWarnings: string[] = [];
    try {
      // Map UI status selection to database-compatible fields
      // businesses.status check constraint: ('active', 'inactive', 'suspended')
      let dbStatus = "active";
      let dbSubscriptionStatus = editingBusiness.subscription_status || "active";

      const uiStatus = editingBusiness.status;
      if (uiStatus === "suspended") {
        dbStatus = "suspended";
      } else if (uiStatus === "inactive" || uiStatus === "cancelled") {
        dbStatus = "inactive";
      } else {
        dbStatus = "active";
      }

      // Map specific payment/trial states to subscription_status
      if (uiStatus === "trial") {
        dbSubscriptionStatus = "trialing";
      } else if (uiStatus === "unpaid") {
        dbSubscriptionStatus = "past_due";
      } else if (uiStatus === "cancelled") {
        dbSubscriptionStatus = "canceled";
      } else if (uiStatus === "active") {
        dbSubscriptionStatus = "active";
      }

      const getMissingColumns = (error: any, payload: Record<string, any>) => {
        const message = String(error?.message || "");
        return Object.keys(payload).filter((column) => message.includes(column));
      };

      const isSchemaMismatch = (error: any) => {
        const message = String(error?.message || "");
        return (
          error?.code === "42703" ||
          error?.code === "PGRST204" ||
          message.includes("schema cache") ||
          message.includes("column") ||
          message.includes("Could not find")
        );
      };

      const updateBusinessStep = async (
        label: string,
        payload: Record<string, any>,
        options: { required?: boolean } = {},
      ) => {
        let pendingPayload = { ...payload };
        const removedColumns: string[] = [];

        for (let attempt = 0; attempt < 6; attempt += 1) {
          if (Object.keys(pendingPayload).length === 0) {
            return { ok: false, removedColumns };
          }

          const { error } = await supabase
            .from("businesses")
            .update(pendingPayload)
            .eq("id", editingBusiness.id);

          if (!error) {
            return { ok: true, removedColumns };
          }

          if (!isSchemaMismatch(error)) {
            throw error;
          }

          const missingColumns = getMissingColumns(error, pendingPayload);
          if (options.required || missingColumns.length === 0) {
            throw error;
          }

          removedColumns.push(...missingColumns);
          pendingPayload = Object.fromEntries(
            Object.entries(pendingPayload).filter(
              ([column]) => !missingColumns.includes(column),
            ),
          );
        }

        throw new Error(`${label} update could not be completed.`);
      };

      // 1. Always save core fields first. These must match the base businesses schema.
      await updateBusinessStep(
        "Core business",
        {
          name: editingBusiness.name,
          industry: editingBusiness.industry,
          plan: editingBusiness.plan,
          status: dbStatus,
        },
        { required: true },
      );

      // 2. Preserve existing subscription state without offering new or extended trials.
      const subscriptionResult = await updateBusinessStep("Subscription status", {
        subscription_status: dbSubscriptionStatus,
      });
      if (subscriptionResult.removedColumns.includes("subscription_status")) {
        updateWarnings.push(
          "Subscription status was skipped because businesses.subscription_status is missing.",
        );
      }

      // 3. Save internal notes independently. Historical AI-credit data is left untouched.
      const adminResult = await updateBusinessStep("Admin fields", {
        admin_notes: editingBusiness.admin_notes,
      });
      if (adminResult.removedColumns.length > 0) {
        updateWarnings.push(
          `Skipped missing admin fields: ${adminResult.removedColumns.join(", ")}.`,
        );
      }

      // 4. Save dashboard visibility independently.
      const visibilityResult = await updateBusinessStep("Dashboard visibility", {
        dashboard_visible_features: null,
        dashboard_hidden_features: Array.isArray(editingBusiness.dashboard_hidden_features)
          ? editingBusiness.dashboard_hidden_features
          : [],
        dashboard_admin_only_features: Array.isArray(editingBusiness.dashboard_admin_only_features)
          ? editingBusiness.dashboard_admin_only_features
          : [],
        dashboard_visibility_profile:
          editingBusiness.dashboard_visibility_profile || "simple_website_client",
        dashboard_visibility_notes:
          editingBusiness.dashboard_visibility_notes || null,
      });
      if (visibilityResult.removedColumns.length > 0) {
        updateWarnings.push(
          "Dashboard visibility settings were skipped because the dashboard visibility migration has not been applied.",
        );
      }

      // Fetch fresh data to ensure we have the correct subscription_status and trial dates
      const { data: freshBiz } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", editingBusiness.id)
        .single();

      if (freshBiz) {
        setBusinesses((prev) =>
          prev.map((b) => (b.id === editingBusiness.id ? freshBiz : b)),
        );
      }

      setIsEditDialogOpen(false);
      await recordAdminAction(
        "business.updated",
        { type: "business", id: editingBusiness.id, label: editingBusiness.name },
        {
          plan: editingBusiness.plan,
          status: dbStatus,
          subscriptionStatus: dbSubscriptionStatus,
          skippedWarnings: updateWarnings,
        },
      );
      if (updateWarnings.length > 0) {
        toast.warning(updateWarnings[0]);
      } else {
        toast.success("Business updated successfully");
      }
    } catch (err: any) {
      console.error("Update failed:", err);
      toast.error(err.message || "Failed to update business");
    } finally {
      setSavingBusiness(false);
    }
  };

  const getNextAppointment = (businessId: string) => {
    const businessAppts = appointments.filter(
      (a) => a.business_id === businessId && a.status !== "cancelled",
    );
    if (businessAppts.length === 0) return "No upcoming appointments";
    const next = businessAppts[0];
    return `${next.date} at ${next.time}`;
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
           <div className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white italic font-black text-3xl animate-bounce shadow-xl shadow-indigo-200">
             G
           </div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Initializing GrowthOS</p>
        </div>
      </div>
    );

  if (!canAccessActiveTab) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center p-8">
        <Card className="rounded-[2rem] border-slate-100 p-10 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Owner Access Required</h1>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">
            This module controls billing, platform settings, users, or sensitive customer data. Internal staff can use the sales, support, audit, and delivery operation tools.
          </p>
          <Button className="mt-6 rounded-xl bg-indigo-600" onClick={() => navigate("/admin/prospect_explorer")}>
            Go to Prospecting
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      {/* Active Component Mapping */}
      
      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="tour-dashboard animate-in fade-in duration-500">
          <SalesHome />
        </div>
      )}

      {activeTab === "revenue_command" && <RevenueCommand />}

      {activeTab === "finance" && <FinanceDashboard />}

      {activeTab === "sales_home" && <SalesHome />}
      {activeTab === "growth_operations" && <SalesHome />}

      {activeTab === "daily_operations" && <DailyOperations />}
      {activeTab === "operations_control" && <DailyOperations />}

      {activeTab === "inbound_leads" && <AdminLeadInbox />}
      {activeTab === "prospect_explorer" && <ProspectExplorer />}
      {activeTab === "neural_auditor" && <NeuralAuditor />}
      {activeTab === "outreach_lab" && <OutreachLab />}
      {activeTab === "proposals_deals" && <ProposalsDeals />}
      {activeTab === "projects" && <Projects />}
      {activeTab === "client_onboarding" && <ClientOnboarding />}
      {activeTab === "seo_management" && <SeoAdmin />}
      {activeTab === "local_seo" && <AdminLocalSeo />}
      {activeTab === "blog" && <BlogCMS isPlatform />}
      
      {(activeTab === "businesses" || activeTab === "admin") && editingWebsiteBusinessId && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Internal customer website review</p>
              <h1 className="mt-1 text-2xl font-black text-slate-950">Creative direction, QA and launch approval</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Review the real customer build, resolve launch blockers and record the internal quality gates before publication.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setEditingWebsiteBusinessId(null)}
              className="shrink-0 rounded-xl bg-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Businesses
            </Button>
          </div>
          <WebsiteEditor businessIdOverride={editingWebsiteBusinessId} />
        </div>
      )}

      {(activeTab === "businesses" || activeTab === "admin") && !editingWebsiteBusinessId && (
            <div className="space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900">
                    Business <span className="text-indigo-600">Ecosystem</span>
                  </h1>
                  <p className="text-slate-400 font-bold tracking-tight text-sm uppercase mt-1">Manage active managed-website customers and delivery state</p>
                </div>
              </div>
              
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsContent value="businesses" className="mt-0 pt-4">
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Search businesses, domains, or industries..."
                          value={businessSearchQuery}
                          onChange={(e) => setBusinessSearchQuery(e.target.value)}
                          className="pl-10 rounded-xl"
                        />
                      </div>
                    </div>

                    <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400">Business</TableHead>
                            <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400">Industry</TableHead>
                            <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400">Billing Plan</TableHead>
                            <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400">Status</TableHead>
                            <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400">Launch Readiness</TableHead>
                            <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {businesses
                            .filter((business) => {
                              const notes = String(business.admin_notes || "");
                              const isPreviewArtifact = /(?:shareable public|private prospect) preview generated/i.test(notes);
                              const isUnactivatedCheckout =
                                business.subscription_status === "incomplete"
                                && !business.owner_id
                                && /created from public pricing checkout/i.test(notes);
                              return !isPreviewArtifact && !isUnactivatedCheckout;
                            })
                            .filter(
                              (b) =>
                                b.name
                                  ?.toLowerCase()
                                  .includes(businessSearchQuery.toLowerCase()) ||
                                b.industry
                                  ?.toLowerCase()
                                  .includes(businessSearchQuery.toLowerCase()) ||
                                b.custom_domain
                                  ?.toLowerCase()
                                  .includes(businessSearchQuery.toLowerCase()),
                            )
                            .map((biz) => (
                              <TableRow key={biz.id} className="hover:bg-slate-50/50">
                                <TableCell className="font-bold py-6">
                                  <div className="flex flex-col">
                                    <span className="text-slate-900 font-black italic uppercase tracking-tight">{biz.name}</span>
                                    <span className="text-[10px] text-slate-400">{biz.custom_domain || `${biz.subdomain}.growthos.app`}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-slate-200">
                                    {biz.industry || "General"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-900">{biz.plan?.toUpperCase() || "FREE"}</span>
                                    <span className="text-[10px] text-slate-400">Next billing: {biz.next_billing_at ? formatDate(biz.next_billing_at) : "N/A"}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={cn(
                                      "text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border-none",
                                      (biz.status === "active" || biz.subscription_status === "active") ? "bg-emerald-50 text-emerald-600" :
                                      (biz.status === "trial" || biz.subscription_status === "trialing") ? "bg-blue-50 text-blue-600" :
                                      (biz.status === "suspended" || biz.subscription_status === "past_due") ? "bg-amber-50 text-amber-600" :
                                      "bg-slate-50 text-slate-400"
                                    )}
                                  >
                                    {biz.subscription_status === "trialing" ? "Trialing" : 
                                     biz.subscription_status === "past_due" ? "Unpaid" :
                                     biz.subscription_status === "canceled" ? "Canceled" :
                                     biz.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    const steps = biz.onboarding_steps || {};
                                    const readiness = [
                                      biz.name,
                                      biz.industry,
                                      steps.pagesNeeded?.length,
                                      steps.websiteGoal,
                                      steps.ctaPreference,
                                      biz.location || steps.primaryLocation || steps.serviceArea,
                                    ].filter(Boolean).length;
                                    const label = readiness >= 5 ? "Ready Review" : readiness >= 3 ? "In Progress" : "Needs Input";
                                    return (
                                      <div className="flex flex-col gap-1">
                                        <Badge className={cn(
                                          "w-fit border-none text-[8px] font-black uppercase tracking-widest",
                                          readiness >= 5 ? "bg-emerald-50 text-emerald-600" : readiness >= 3 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600",
                                        )}>
                                          {label}
                                        </Badge>
                                        <span className="text-[10px] font-semibold text-slate-400">
                                          {steps.pagesNeeded?.length || 0} pages, {(steps.localSeoCities || []).length || 0} locations
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger
                                      aria-label={`Open admin actions for ${biz.name || "business"}`}
                                      title={`Open admin actions for ${biz.name || "business"}`}
                                      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "rounded-xl")}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-2xl p-2 w-56">
                                      <DropdownMenuLabel className="text-[10px] font-black text-slate-400 uppercase p-3">Admin Actions</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => { setEditingBusiness(biz); setIsEditDialogOpen(true); }} className="rounded-xl p-3">
                                        <Edit className="h-4 w-4 mr-3 text-indigo-600" /> Edit Configuration
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => setEditingWebsiteBusinessId(biz.id)}
                                        className="rounded-xl p-3"
                                      >
                                        <Layout className="h-4 w-4 mr-3 text-violet-600" /> Review / Edit Website
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => openBusinessWebsite(biz)} className="rounded-xl p-3">
                                        <ExternalLink className="h-4 w-4 mr-3 text-blue-600" /> View Live Site
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => exportTerminationPackage(biz)}
                                        disabled={exportingBusinessId === biz.id}
                                        className="rounded-xl p-3"
                                      >
                                        {exportingBusinessId === biz.id ? (
                                          <Loader2 className="h-4 w-4 mr-3 text-indigo-600 animate-spin" />
                                        ) : (
                                          <Download className="h-4 w-4 mr-3 text-indigo-600" />
                                        )}
                                        Export Termination Package
                                      </DropdownMenuItem>
                                      <DropdownMenuItem disabled className="rounded-xl p-3 text-[11px] text-slate-400">
                                        Paid handover service only
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="my-2" />
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setTerminatingBusiness(biz);
                                          setBusinessTerminateText("");
                                          setIsBusinessTerminateDialogOpen(true);
                                        }}
                                        className="text-amber-700 rounded-xl p-3 focus:bg-amber-50"
                                      >
                                        <AlertCircle className="h-4 w-4 mr-3" /> Deactivate Instance
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setDeletingBusiness(biz);
                                          setBusinessDeleteText("");
                                          setIsBusinessDeleteDialogOpen(true);
                                        }}
                                        className="text-rose-700 rounded-xl p-3 focus:bg-rose-50"
                                      >
                                        <Trash2 className="h-4 w-4 mr-3" /> Delete Permanently
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}


          {activeTab === "users" && (
             <div className="space-y-8">
                <div>
                   <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900">
                     System <span className="text-indigo-600">Users</span>
                   </h1>
                   <p className="text-slate-400 font-bold tracking-tight text-sm uppercase mt-1">Manage user access and platform permissions</p>
                </div>
                {/* Users Table Content - Simplified for brevity but keeping core logic */}
                <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
                   <div className="p-6 bg-slate-50 border-b border-slate-100 flex gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Filter Role:</Label>
                        <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                           <SelectTrigger className="w-40 h-10 rounded-xl bg-white">
                              <SelectValue />
                           </SelectTrigger>
                           <SelectContent>
                              <SelectItem value="all">All Roles</SelectItem>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                              <SelectItem value="platform_staff">Platform Staff</SelectItem>
                              <SelectItem value="business_admin">Business Admin</SelectItem>
                              <SelectItem value="staff">Business Staff</SelectItem>
                              <SelectItem value="affiliate">Affiliate</SelectItem>
                           </SelectContent>
                        </Select>
                      </div>
                   </div>
                   <Table>
                      <TableHeader>
                         <TableRow>
                            <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400">User</TableHead>
                            <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400">Role</TableHead>
                            <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400">Status</TableHead>
                            <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400">Joined</TableHead>
                            <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400 text-right">Actions</TableHead>
                         </TableRow>
                      </TableHeader>
                      <TableBody>
                         {users.filter(u => userRoleFilter === "all" || u.role === userRoleFilter).map(user => (
                            <TableRow key={user.id} className="hover:bg-slate-50/50">
                               <TableCell className="font-bold py-6">
                                  <div className="flex items-center gap-3">
                                     <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black">
                                        {user.full_name?.charAt(0) || user.email?.charAt(0)}
                                     </div>
                                     <div className="flex flex-col">
                                        <span className="text-slate-900 font-bold">{user.full_name || "New User"}</span>
                                        <span className="text-[10px] text-slate-400">{user.email}</span>
                                     </div>
                                  </div>
                               </TableCell>
                               <TableCell>
                                  <Badge className="bg-indigo-50 text-indigo-600 border-none rounded-full px-3 text-[8px] font-black uppercase">
                                     {user.role}
                                  </Badge>
                               </TableCell>
                               <TableCell>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                       "text-[8px] font-black uppercase rounded-full border-none",
                                       user.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                    )}
                                  >
                                     {user.status || "active"}
                                  </Badge>
                               </TableCell>
                               <TableCell className="text-xs text-slate-500 font-medium">
                                  {formatDate(user.created_at)}
                               </TableCell>
                               <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger
                                      aria-label={`Open user actions for ${user.full_name || user.email || "user"}`}
                                      title={`Open user actions for ${user.full_name || user.email || "user"}`}
                                      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "rounded-xl")}
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-2xl p-2 w-56">
                                      <DropdownMenuLabel className="text-[10px] font-black text-slate-400 uppercase p-3">User Management</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => { setViewingUser(user); setIsViewUserDialogOpen(true); }} className="rounded-xl p-3">
                                        <Eye className="h-4 w-4 mr-3 text-indigo-600" /> View Profile
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="my-2" />
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger className="rounded-xl p-3">
                                          <Shield className="h-4 w-4 mr-3 text-amber-600" /> Change Role
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                          <DropdownMenuSubContent className="rounded-xl p-2">
                                            <DropdownMenuItem onClick={() => updateUserRole(user.id, "super_admin")} className="rounded-lg">Super Admin</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => updateUserRole(user.id, "platform_staff")} className="rounded-lg">Platform Staff</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => updateUserRole(user.id, "business_admin")} className="rounded-lg">Business Admin</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => updateUserRole(user.id, "staff")} className="rounded-lg">Business Staff</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => updateUserRole(user.id, "affiliate")} className="rounded-lg">Affiliate</DropdownMenuItem>
                                          </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                      </DropdownMenuSub>
                                      {user.status !== "suspended" && (
                                        <DropdownMenuItem onClick={() => suspendUser(user.id)} className="rounded-xl p-3">
                                          <AlertCircle className="h-4 w-4 mr-3 text-amber-500" /> Suspend Access
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator className="my-2" />
                                      <DropdownMenuItem 
                                        onClick={() => { setTerminatingUser(user); setIsTerminateDialogOpen(true); }} 
                                        className="text-rose-600 rounded-xl p-3 focus:bg-rose-50"
                                      >
                                        <Trash2 className="h-4 w-4 mr-3" /> Terminate User
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                               </TableCell>
                            </TableRow>
                         ))}
                      </TableBody>
                   </Table>
                </Card>
             </div>
          )}

          {(activeTab === "growth_os_config" || activeTab === "settings") && (
             <div className="space-y-8">
                <div className="flex justify-between items-start">
                   <div>
                      <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900">
                        {activeTab === "settings" ? "Platform" : "Engine"}{" "}
                        <span className="text-purple-600">
                          {activeTab === "settings" ? "Branding" : "Features"}
                        </span>
                      </h1>
                      <p className="text-slate-400 font-bold tracking-tight text-sm uppercase mt-1">
                        {activeTab === "settings"
                          ? "Configure global branding, sales page title, and public contact settings"
                          : "Configure advanced outbound, marketing intelligence, and AI routing features"}
                      </p>
                   </div>
                   <Button 
                      onClick={handleSaveSettings} 
                      disabled={savingSettings}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-widest text-[10px]"
                   >
                     {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                     Persist Configuration
                   </Button>
                </div>

                {activeTab === "growth_os_config" && (
                <div className="space-y-8">
                   <Card className="rounded-[2rem] p-8">
                      <div className="flex flex-col gap-3 border-b border-slate-100 pb-6 md:flex-row md:items-start md:justify-between">
                         <div>
                            <h3 className="font-black italic uppercase tracking-tight text-slate-900">Superadmin Modules</h3>
                            <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-slate-500">
                              All current Super Admin modules are built and available by default. Use these switches only to hide an operational surface from the admin navigation.
                            </p>
                         </div>
                         <Badge className="w-fit border-0 bg-indigo-50 text-indigo-700">
                           {Object.values(platformSettings.adminModules || {}).filter(Boolean).length} enabled
                         </Badge>
                      </div>

                      <div className="mt-6 grid gap-6 lg:grid-cols-2">
                        {Array.from(new Set(ADMIN_MODULES.map((module) => module.group))).map((group) => (
                          <div key={group} className="rounded-2xl border border-slate-200 p-5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{group}</p>
                            <div className="mt-3 divide-y divide-slate-100">
                              {ADMIN_MODULES.filter((module) => module.group === group).map((module) => (
                                <div key={module.id} className="flex items-start gap-4 py-4">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-sm font-bold text-slate-900">{module.label}</p>
                                      <Badge variant="outline" className="text-[9px] font-bold text-slate-500">
                                        {ADMIN_MODULE_PRIORITY_LABELS[module.priority]}
                                      </Badge>
                                    </div>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">{module.description}</p>
                                  </div>
                                  <Switch
                                    aria-label={`${platformSettings.adminModules?.[module.id] !== false ? "Disable" : "Enable"} ${module.label}`}
                                    checked={platformSettings.adminModules?.[module.id] !== false}
                                    onCheckedChange={(checked) => setPlatformSettings({
                                      ...platformSettings,
                                      adminModules: {
                                        ...DEFAULT_ADMIN_MODULE_VISIBILITY,
                                        ...(platformSettings.adminModules || {}),
                                        [module.id]: checked,
                                      },
                                    })}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                   </Card>

                   <MarketingPlanEntitlements />

                </div>
                )}

                {activeTab === "settings" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                   <Card className="rounded-[2rem] p-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                           <h3 className="font-black italic uppercase tracking-tight text-slate-900">Platform Core</h3>
                           <p className="text-xs text-slate-400 font-medium">Global branding and support identifiers</p>
                        </div>
                        <Settings className="h-5 w-5 text-indigo-600" />
                      </div>
                      <Separator className="bg-slate-100" />
                      <div className="space-y-4">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Platform Name</Label>
                         <Input 
                           value={platformSettings.name} 
                           onChange={(e) => setPlatformSettings({...platformSettings, name: e.target.value})} 
                           className="rounded-xl h-12"
                         />
                      </div>
                      <div className="space-y-4">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sales Page Site Title</Label>
                         <Input
                           value={platformSettings.salesPageTitle}
                           onChange={(e) => setPlatformSettings({...platformSettings, salesPageTitle: e.target.value})}
                           placeholder="Bennie Studio"
                           className="rounded-xl h-12"
                         />
                      </div>
                      <div className="space-y-4">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Support Email</Label>
                         <Input 
                           value={platformSettings.supportEmail} 
                           onChange={(e) => setPlatformSettings({...platformSettings, supportEmail: e.target.value})} 
                           className="rounded-xl h-12"
                         />
                      </div>
                      <Separator className="bg-slate-100" />
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                              Sales Page WhatsApp Button
                            </Label>
                            <p className="text-xs font-medium text-emerald-800/70 mt-1">
                              Shows a floating WhatsApp button on the public sales page.
                            </p>
                          </div>
                          <Switch
                            checked={platformSettings.salesWhatsappEnabled !== false}
                            onCheckedChange={(checked) =>
                              setPlatformSettings({
                                ...platformSettings,
                                salesWhatsappEnabled: checked,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            WhatsApp Link or Number
                          </Label>
                          <Input
                            value={platformSettings.salesWhatsappLink || ""}
                            onChange={(e) =>
                              setPlatformSettings({
                                ...platformSettings,
                                salesWhatsappLink: e.target.value,
                              })
                            }
                            placeholder="https://wa.me/60123456789 or +60123456789"
                            className="rounded-xl h-12 bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Pre-filled Message
                          </Label>
                          <Textarea
                            value={platformSettings.salesWhatsappMessage || ""}
                            onChange={(e) =>
                              setPlatformSettings({
                                ...platformSettings,
                                salesWhatsappMessage: e.target.value,
                              })
                            }
                            rows={3}
                            className="rounded-xl bg-white"
                            placeholder="Hi, I found Bennie Studio and I’m interested in a managed website plan."
                          />
                        </div>
                      </div>
                   </Card>
                   
                   <Card className="rounded-[2rem] p-8 border-none ring-1 ring-rose-100 bg-rose-50/30 flex flex-col justify-between">
                      <div>
                         <h3 className="text-lg font-black italic uppercase italic tracking-tight text-rose-900 mb-2">Danger Zone</h3>
                         <p className="text-sm font-medium text-rose-700/70 mb-8 leading-relaxed">
                           Resetting the platform will purge all business data, user accounts, and billing records. This action is irreversible and should only be performed during system re-genesis.
                         </p>
                      </div>
                      <Button 
                         variant="ghost" 
                         onClick={() => {
                           setPurgeConfirmText("");
                           setPurgeConfirmEmail("");
                           setIsPurgeDialogOpen(true);
                         }}
                         className="w-full h-12 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-black uppercase tracking-widest text-[10px]"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Purge Entire Ecosystem
                      </Button>
                   </Card>
                </div>
                )}

                {activeTab === "settings" && (
                <>
                <Separator className="bg-slate-100 my-8" />
                <StyleThemeManager />
                </>
                )}
             </div>
          )}

          {activeTab === "revenue" && <RevenueDashboard />}
          {activeTab === "templates" && (
            editingTemplateId ? (
              <div className="space-y-6">
                <Button
                  variant="ghost"
                  onClick={() => setEditingTemplateId(null)}
                  className="rounded-xl gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Templates
                </Button>
                <WebsiteEditor
                  templateIdOverride={editingTemplateId}
                  onTemplateCreated={handleEditTemplate}
                />
              </div>
            ) : (
              <TemplateManager onEdit={handleEditTemplate} />
            )
          )}
          {activeTab === "status" && <SystemStatusPage />}
          {activeTab === "affiliates" && (
             <div className="space-y-8">
                <SuperAdminAffiliates />
                <SuperAdminAffiliatePartners onViewProfile={(user) => { setViewingUser(user); setIsViewUserDialogOpen(true); }} />
             </div>
          )}
          {activeTab === "plans" && <><CommercialCatalogue /><PlanEditor /></>}

          {activeTab === "ecosystem_architect" && (
            <div className="space-y-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Platform structure</p>
                  <h1 className="mt-2 text-4xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
                    Ecosystem <span className="text-indigo-600">Architect</span>
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                    A live structural view of customers, users, delivery work, and the admin modules that operate Bennie Studio. No simulated latency or uptime numbers.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => navigate("/admin/status")} className="rounded-xl bg-white">
                    <Shield className="mr-2 h-4 w-4" />
                    System Status
                  </Button>
                  <Button onClick={() => navigate("/admin/growth_os_config")} className="rounded-xl bg-indigo-600">
                    <Settings className="mr-2 h-4 w-4" />
                    Feature Controls
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Active Businesses",
                    value: businesses.filter((business) => String(business.status || "").toLowerCase() === "active").length,
                    helper: `${businesses.length} total business records`,
                  },
                  {
                    label: "Platform Users",
                    value: users.length,
                    helper: "Authenticated profiles",
                  },
                  {
                    label: "Open Projects",
                    value: projects.filter((project) => !["completed", "cancelled", "canceled", "archived"].includes(String(project.status || "").toLowerCase())).length,
                    helper: `${projects.length} total delivery projects`,
                  },
                  {
                    label: "Upcoming Appointments",
                    value: appointments.length,
                    helper: "Current future appointment queue",
                  },
                ].map((stat) => (
                  <Card key={stat.label} className="rounded-3xl border-slate-200 p-6 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                    <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{stat.value}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-500">{stat.helper}</p>
                  </Card>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
                <Card className="rounded-[2rem] border-slate-200 p-7">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-slate-950">Operational module topology</h2>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                        Visibility reflects the saved Super Admin module configuration. All formerly deferred modules are now wired to working surfaces.
                      </p>
                    </div>
                    <Layout className="h-5 w-5 text-indigo-600" />
                  </div>

                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    {Array.from(new Set(ADMIN_MODULES.map((module) => module.group))).map((group) => (
                      <div key={group} className="rounded-2xl border border-slate-200 p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{group}</p>
                        <div className="mt-4 space-y-3">
                          {ADMIN_MODULES.filter((module) => module.group === group).map((module) => {
                            const enabled = platformSettings.adminModules?.[module.id] !== false;
                            return (
                              <div key={module.id} className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-bold text-slate-900">{module.label}</p>
                                  <p className="mt-1 text-xs leading-5 text-slate-500">{module.description}</p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={enabled
                                    ? "shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "shrink-0 border-slate-200 bg-slate-50 text-slate-500"}
                                >
                                  {enabled ? "Visible" : "Hidden"}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="rounded-[2rem] border-slate-200 p-7">
                  <h2 className="text-lg font-black tracking-tight text-slate-950">Architecture actions</h2>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    Jump to the real control surface for each platform layer.
                  </p>
                  <div className="mt-6 space-y-3">
                    {[
                      { label: "Active Sites", path: "/admin/businesses", icon: Globe },
                      { label: "Service Projects", path: "/admin/projects", icon: Briefcase },
                      { label: "Plans & Pricing", path: "/admin/plans", icon: CreditCard },
                      { label: "Finance", path: "/admin/finance", icon: CircleDollarSign },
                      { label: "System Status", path: "/admin/status", icon: ShieldCheck },
                    ].map((action) => (
                      <Button
                        key={action.path}
                        variant="outline"
                        onClick={() => navigate(action.path)}
                        className="h-12 w-full justify-start rounded-xl bg-white font-bold"
                      >
                        <action.icon className="mr-3 h-4 w-4 text-indigo-600" />
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "traffic" && (
            <div className="space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">
                    Traffic <span className="text-indigo-600">Analytics</span>
                  </h1>
                  <p className="text-slate-400 font-bold tracking-tight text-sm uppercase mt-1">Page views, clicks, registrations, leads, and source analysis</p>
                </div>
                <div className="flex gap-2">
                   <Button variant="outline" onClick={() => fetchTrafficMetrics(7)} className="rounded-xl h-8 text-[8px] font-black uppercase tracking-widest">7 Days</Button>
                   <Button variant="outline" onClick={() => fetchTrafficMetrics(30)} className="rounded-xl h-8 text-[8px] font-black uppercase tracking-widest">30 Days</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {[
                  { label: "Page Views", value: trafficMetrics.aggregate.totalViews.toLocaleString(), icon: Eye, color: "text-indigo-600", bg: "bg-indigo-50" },
                  { label: "CTA / Link Clicks", value: trafficMetrics.aggregate.totalClicks.toLocaleString(), icon: Target, color: "text-violet-600", bg: "bg-violet-50" },
                  { label: "Registrations", value: trafficMetrics.aggregate.registrations.toLocaleString(), icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Leads Captured", value: trafficMetrics.aggregate.totalLeads.toLocaleString(), icon: MessageSquare, color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Unique Visitors", value: trafficMetrics.aggregate.uniqueVisitors.toLocaleString(), icon: Globe, color: "text-cyan-600", bg: "bg-cyan-50" },
                  { label: "Views / Visitor", value: trafficMetrics.aggregate.avgViewsPerVisitor.toFixed(1), icon: BarChart3, color: "text-amber-600", bg: "bg-amber-50" },
                  { label: "Tracked Events", value: trafficMetrics.aggregate.totalEvents.toLocaleString(), icon: Zap, color: "text-rose-600", bg: "bg-rose-50" },
                  { label: "Lead / Signup Rate", value: `${trafficMetrics.aggregate.conversionRate.toFixed(1)}%`, icon: TrendingUp, color: "text-slate-700", bg: "bg-slate-100" },
                ].map((stat, i) => (
                  <Card key={i} className="p-6 rounded-3xl border-slate-100 shadow-sm flex items-center gap-4">
                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", stat.bg)}>
                      <stat.icon className={cn("h-6 w-6", stat.color)} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{stat.label}</p>
                      <p className="text-2xl font-black italic tracking-tight text-slate-900">{stat.value}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <Card className="rounded-[2rem] border-slate-100 p-8 min-h-[400px]">
                <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white mb-8">Ecosystem Traffic Flow</h2>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <AreaChart data={trafficMetrics.trend}>
                       <defs>
                         <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                           <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} stroke="#94a3b8" />
                       <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} stroke="#94a3b8" />
                       <Tooltip />
                       <Area type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                       <Area type="monotone" dataKey="clicks" stroke="#8b5cf6" strokeWidth={2} fillOpacity={0} />
                       <Area type="monotone" dataKey="registrations" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <Card className="rounded-[2rem] border-slate-100 overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-8 border-none">
                       <h2 className="p-8 text-lg font-black uppercase italic tracking-tight dark:text-white">Top Active Sites</h2>
                    </div>
                    <Table>
                       <TableBody>
                         {trafficMetrics.topPages.slice(0, 10).map((page, i) => (
                           <TableRow key={i} className="hover:bg-slate-50 border-slate-50">
                             <TableCell className="font-mono text-xs text-slate-500 py-4 pl-8">{page.path}</TableCell>
                             <TableCell className="text-right pr-8">
                               <Badge className="bg-indigo-50 text-indigo-600 border-none font-black text-[10px]">{page.count} VIEWS</Badge>
                             </TableCell>
                           </TableRow>
                         ))}
                       </TableBody>
                    </Table>
                 </Card>

                 <Card className="rounded-[2rem] border-slate-100 p-8 space-y-6">
                    <h2 className="text-lg font-black uppercase italic tracking-tight dark:text-white">Traffic Sources</h2>
                    <div className="space-y-4">
                       {(trafficMetrics.sources.length ? trafficMetrics.sources : [{ source: "No source data yet", count: 0 }]).map((source, i) => (
                         <div key={source.source} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="min-w-0">
                              <p className="truncate text-[10px] font-black text-slate-700 uppercase tracking-widest">{source.source}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Referral source</p>
                            </div>
                            <Badge className={cn("border-none font-black text-[10px]", i === 0 ? "bg-indigo-50 text-indigo-600" : "bg-white text-slate-500")}>
                              {source.count} VIEWS
                            </Badge>
                         </div>
                       ))}
                    </div>
                 </Card>
              </div>

              <Card className="rounded-[2rem] border-slate-100 overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-8 border-none">
                  <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Recent Click, Register, And Lead Events</h2>
                  <p className="mt-1 text-xs font-bold text-slate-500">Latest tracked conversion events from website buttons, forms, signups, and enquiry actions.</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Event</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Page</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Label</TableHead>
                      <TableHead className="pr-8 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(trafficMetrics.recentEvents.length ? trafficMetrics.recentEvents : [{ eventType: "No events yet", sourcePage: "-", label: "Traffic events will appear after visitors click or register.", createdAt: "" }]).map((event, i) => (
                      <TableRow key={`${event.eventType}-${event.createdAt || i}`} className="hover:bg-slate-50 border-slate-50">
                        <TableCell className="py-4 pl-8">
                          <Badge className="border-none bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest">
                            {event.eventType.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[320px] truncate font-mono text-xs text-slate-500">{event.sourcePage}</TableCell>
                        <TableCell className="max-w-[360px] truncate text-xs font-bold text-slate-700">{event.label}</TableCell>
                        <TableCell className="pr-8 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {event.createdAt ? new Date(event.createdAt).toLocaleDateString() : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {activeTab === "policies" && <PoliciesCMS />}
          {activeTab === "support" && <AdminSupport />}
          {activeTab === "update_requests" && <MonthlyUpdateQueue />}

          {/* Catch-all for tabs that might not have specialized rendering yet or are in development */}
          {!['overview', 'revenue_command', 'sales_home', 'growth_operations', 'daily_operations', 'operations_control', 'inbound_leads', 'prospect_explorer', 'neural_auditor', 'outreach_lab', 'proposals_deals', 'projects', 'client_onboarding', 'seo_management', 'local_seo', 'blog', 'businesses', 'users', 'affiliates', 'growth_os_config', 'revenue', 'templates', 'plans', 'status', 'ecosystem_architect', 'traffic', 'settings', 'support', 'update_requests', 'policies', 'admin'].includes(activeTab) && (
            <div className="h-full flex items-center justify-center p-12">
               <Card className="p-24 flex flex-col items-center justify-center text-center rounded-[3rem] border-slate-100 bg-slate-50/50 max-w-2xl">
                  <div className="h-20 w-20 rounded-[2rem] bg-white shadow-xl shadow-slate-200 flex items-center justify-center text-indigo-600 mb-6">
                     <Cpu className="h-10 w-10 animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 mb-2">Architecting Module</h2>
                  <p className="text-slate-400 font-bold text-sm max-w-sm uppercase tracking-tight">The <span className="text-indigo-600 font-black">{activeTab.replace("_", " ")}</span> core is currently being synthesized by the growth engine.</p>
               </Card>
            </div>
          )}

      {/* Legacy Dialogs (Preserving functionality) */}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-3xl max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Business</DialogTitle>
            <DialogDescription>
              Update business details and subscription plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input
                value={editingBusiness?.name || ""}
                onChange={(e) =>
                  setEditingBusiness({
                    ...editingBusiness,
                    name: e.target.value,
                  })
                }
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input
                value={editingBusiness?.industry || ""}
                onChange={(e) =>
                  setEditingBusiness({
                    ...editingBusiness,
                    industry: e.target.value,
                  })
                }
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select
                  value={editingBusiness?.plan || "managed-website"}
                  onValueChange={(value) =>
                    setEditingBusiness({ ...editingBusiness, plan: value })
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {availablePlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name || plan.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
              <Label>Status</Label>
                <Select
                  value={editingBusiness?.status || "active"}
                  onValueChange={(value) =>
                    setEditingBusiness({ ...editingBusiness, status: value })
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="active">Active</SelectItem>
                    {(editingBusiness?.status === "trial" || editingBusiness?.subscription_status === "trialing") && (
                      <SelectItem value="trial">Legacy trial (existing account)</SelectItem>
                    )}
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="flex flex-col gap-1">
                <Label className="text-sm font-black text-slate-950">
                  Customer Dashboard Setup
                </Label>
                <p className="text-xs font-semibold text-slate-500">
                  Control what this customer sees in daily use. Core dashboard,
                  website, leads, billing, and settings stay visible.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Dashboard Profile</Label>
                  <Select
                    value={editingBusiness?.dashboard_visibility_profile || "simple_website_client"}
                    onValueChange={(value) =>
                      setEditingBusiness({
                        ...editingBusiness,
                        dashboard_visibility_profile: value,
                      })
                    }
                  >
                    <SelectTrigger className="rounded-xl bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {CUSTOMER_DASHBOARD_PROFILES.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Visibility Notes</Label>
                  <Input
                    value={editingBusiness?.dashboard_visibility_notes || ""}
                    onChange={(e) =>
                      setEditingBusiness({
                        ...editingBusiness,
                        dashboard_visibility_notes: e.target.value,
                      })
                    }
                    placeholder="e.g. Booking is handled by admin"
                    className="rounded-xl bg-white"
                  />
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {CUSTOMER_DASHBOARD_FEATURES.map((feature) => {
                  const hidden = getVisibilityArray("dashboard_hidden_features").includes(feature.id);
                  const adminOnly = getVisibilityArray("dashboard_admin_only_features").includes(feature.id);
                  const visible = !hidden && !adminOnly;

                  return (
                    <div
                      key={feature.id}
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-900">
                            {feature.label}
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {adminOnly ? "Admin-managed only" : hidden ? "Hidden from customer" : "Visible to customer"}
                          </p>
                        </div>
                        <Switch
                          checked={visible}
                          onCheckedChange={(checked) =>
                            setDashboardFeatureVisible(feature.id, checked)
                          }
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <span className="text-xs font-bold text-slate-500">
                          Admin-managed only
                        </span>
                        <Switch
                          checked={adminOnly}
                          onCheckedChange={(checked) =>
                            setDashboardFeatureAdminOnly(feature.id, checked)
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Admin Notes</Label>
              <Textarea
                value={editingBusiness?.admin_notes || ""}
                onChange={(e) =>
                  setEditingBusiness({
                    ...editingBusiness,
                    admin_notes: e.target.value,
                  })
                }
                placeholder="Sales notes, customer status, etc."
                className="rounded-xl min-h-[100px]"
              />
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                Website Public URL
              </p>
              <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                {window.location.origin}/w/{editingBusiness?.id}
                <button 
                  onClick={() => window.open(`/w/${editingBusiness?.id}`, "_blank")}
                  className="p-1 hover:bg-white rounded border border-slate-200"
                >
                  <ExternalLink className="h-3 w-3" />
                </button>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateBusiness}
              disabled={savingBusiness}
              className="rounded-xl bg-indigo-600"
            >
              {savingBusiness && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isViewUserDialogOpen}
        onOpenChange={setIsViewUserDialogOpen}
      >
        <DialogContent className="rounded-[2.5rem] max-w-lg p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-indigo-600 p-8 text-white relative">
            <div className="absolute top-4 right-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsViewUserDialogOpen(false)}
                className="text-white hover:bg-white/20 rounded-full h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xl">
                <Users className="h-10 w-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">User Profile</h2>
                <p className="text-indigo-100 opacity-80">
                  Platform User Details
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6 bg-white dark:bg-slate-950">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Email Address
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {viewingUser?.email}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  User Role
                </p>
                <Badge
                  variant="outline"
                  className="capitalize bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 border-indigo-100 dark:border-indigo-800"
                >
                  {viewingUser?.role?.replace("_", " ")}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Business ID
                </p>
                <p
                  className="text-xs font-mono text-slate-500 truncate"
                  title={viewingUser?.business_id}
                >
                  {viewingUser?.business_id || "Not Affiliated"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Onboarding
                </p>
                <Badge
                  className={
                    viewingUser?.onboarding_completed
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                  }
                >
                  {viewingUser?.onboarding_completed ? "Completed" : "Pending"}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Account Status
                </p>
                <Badge variant="secondary" className="capitalize">
                  {viewingUser?.status || "Active"}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Joined Date
                </p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {viewingUser?.created_at
                    ? new Date(viewingUser.created_at).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Security & Access
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  This user has{" "}
                  {viewingUser?.role === "super_admin"
                    ? "full administrative"
                    : "standard"}{" "}
                  access to the platform.
                  {viewingUser?.business_id
                    ? ` They are currently managing business ${viewingUser.business_id.substring(0, 8)}...`
                    : " They are not currently assigned to any business."}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <Button
              onClick={() => setIsViewUserDialogOpen(false)}
              className="rounded-xl bg-indigo-600 px-8"
            >
              Close Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isBusinessTerminateDialogOpen}
        onOpenChange={(open) => {
          setIsBusinessTerminateDialogOpen(open);
          if (!open) {
            setTerminatingBusiness(null);
            setBusinessTerminateText("");
          }
        }}
      >
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Deactivate Business Instance
            </DialogTitle>
            <DialogDescription>
              This suspends the customer business from normal operation without
              permanently deleting records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
              <p className="font-bold">This may affect the customer website, dashboard access, and launch workflow.</p>
              <p className="mt-2 text-xs leading-relaxed">
                Hard deletion is intentionally not the default. Use inactive/suspended
                status first so customer data can be reviewed or restored if needed.
              </p>
            </div>
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Type business name to confirm
            </Label>
            <Input
              value={businessTerminateText}
              onChange={(event) => setBusinessTerminateText(event.target.value)}
              placeholder={terminatingBusiness?.name || "Business name"}
              className="rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBusinessTerminateDialogOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deactivateBusinessInstance}
              disabled={businessTerminateText !== (terminatingBusiness?.name?.trim() || "")}
              className="rounded-xl"
            >
              Deactivate Instance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isBusinessDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsBusinessDeleteDialogOpen(open);
          if (!open) {
            setDeletingBusiness(null);
            setBusinessDeleteText("");
            setDeletingBusinessId(null);
          }
        }}
      >
        <DialogContent className="rounded-3xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <Trash2 className="h-5 w-5" /> Permanently Delete Business
            </DialogTitle>
            <DialogDescription>
              Use this for duplicate, abandoned, test, inactive, or fully cancelled business records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              <p className="font-bold">This cannot be undone.</p>
              <p className="mt-2 text-xs leading-relaxed">
                Related website and operational records that are configured to cascade will be removed.
                Historical finance and audit records configured to retain history will keep their record with
                the business reference cleared. Active or protected subscriptions are blocked from deletion.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Deleting: <span className="font-bold text-slate-900">{deletingBusiness?.name || "Business"}</span>
              <span className="ml-2 text-slate-400">{deletingBusiness?.id}</span>
            </div>
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Type the exact business name to confirm
            </Label>
            <Input
              value={businessDeleteText}
              onChange={(event) => setBusinessDeleteText(event.target.value)}
              placeholder={deletingBusiness?.name || "Business name"}
              className="rounded-xl"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBusinessDeleteDialogOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={permanentlyDeleteBusiness}
              disabled={
                deletingBusinessId === deletingBusiness?.id ||
                businessDeleteText !== (deletingBusiness?.name?.trim() || "")
              }
              className="rounded-xl"
            >
              {deletingBusinessId === deletingBusiness?.id ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
        <DialogContent className="rounded-3xl max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Purge Platform Data
            </DialogTitle>
            <DialogDescription>
              This is an irreversible emergency action. It deletes data from
              customer, website, lead, appointment, affiliate, and analytics tables.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-xs font-bold leading-relaxed text-rose-800">
              Tables affected: affiliate_referrals, affiliate_payouts, affiliates,
              affiliate_programs, analytic_events, appointments, blog_posts,
              leads, websites, profiles, businesses.
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Type PURGE PLATFORM DATA
              </Label>
              <Input
                value={purgeConfirmText}
                onChange={(event) => setPurgeConfirmText(event.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Re-enter your superadmin email
              </Label>
              <Input
                type="email"
                value={purgeConfirmEmail}
                onChange={(event) => setPurgeConfirmEmail(event.target.value)}
                placeholder={(profile as any)?.email || "admin@example.com"}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPurgeDialogOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAllData}
              disabled={
                import.meta.env.VITE_ENABLE_PLATFORM_PURGE !== "true" ||
                purgeConfirmText !== "PURGE PLATFORM DATA" ||
                purgeConfirmEmail !== (profile as any)?.email
              }
              className="rounded-xl"
            >
              {import.meta.env.VITE_ENABLE_PLATFORM_PURGE === "true"
                ? "Permanently Purge Data"
                : "Purge Disabled"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isTerminateDialogOpen}
        onOpenChange={setIsTerminateDialogOpen}
      >
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Terminate User Account
            </DialogTitle>
            <DialogDescription>
              This is a standard workflow for offboarding or removing harmful
              users.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3 text-red-700 text-xs leading-relaxed">
              <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Warning: Irreversible Action</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    User will immediately lose all access to the platform.
                  </li>
                  <li>Account status will be marked as "Terminated".</li>
                  <li>Associated business ownership remains but is locked.</li>
                  <li>You can manually delete the record after termination.</li>
                </ul>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              Are you sure you want to terminate{" "}
              <strong>{terminatingUser?.email}</strong>?
            </p>
          </div>
          <DialogFooter className="bg-slate-50 p-6 -mx-6 -mb-6 rounded-b-3xl">
            <Button
              variant="ghost"
              onClick={() => setIsTerminateDialogOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => terminateUser(terminatingUser?.id)}
              className="rounded-xl px-8"
            >
              Confirm Termination
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Joyride
        steps={tourSteps}
        run={showTour}
        continuous={true}
        styles={{
          options: {
            primaryColor: "#4f46e5",
            zIndex: 10000,
          },
        } as any}
      />
    </div>
  );
}
