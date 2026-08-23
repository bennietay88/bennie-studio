import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useFeatures } from "../hooks/useFeatures";
import { supabase } from "../lib/supabase";
import { motion } from "motion/react";
import {
  Users,
  Globe,
  BarChart3,
  Zap,
  Calendar,
  MessageSquare,
  ShoppingBag,
  Star,
  Layout,
  FileText,
  ArrowRight,
  ExternalLink,
  Plus,
  AlertCircle,
  Lock,
  Check,
  Sparkles,
  BrainCircuit,
  Target,
  Phone,
  Megaphone,
  MapPin,
  Wrench,
  Shield,
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
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/card";
import { cn } from "../lib/utils";
import { LegalDisclaimer } from "./LegalDisclaimer";
import { findPlan } from "../constants/plans";
import { getLocalSeoLimits } from "../constants/localSeoEngine";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { AIPerformanceAnalytics } from "./AIPerformanceAnalytics";
import { AIDataAnalyst } from "./AIDataAnalyst";
import { OnboardingChecklist } from "./OnboardingChecklist";
import { toast } from "sonner";
import type { MonthlyWebsiteResult, WebsiteImprovement } from "../types";
import {
  BUSINESS_OFFER_BUILDER,
  CAMPAIGN_LANDING_PAGE_TEMPLATES,
  CAMPAIGN_CALENDAR,
  COMPETITOR_GAP_SCANNER,
  BEFORE_AFTER_RESCUE_TOOL,
  DONE_FOR_YOU_REQUEST_PORTAL,
  ENQUIRY_PATH_TRACKER,
  ENQUIRY_LOSS_DETECTOR,
  AI_RECEPTIONIST_TRIAGE,
  INDUSTRY_PAGE_PACKS,
  LOCAL_SEARCH_CHECKLIST,
  LOCAL_SEO_OPPORTUNITY_MAP,
  LOCAL_GROWTH_PAGE_BLUEPRINT,
  MONTHLY_WEBSITE_REPORT,
  MONTHLY_IMPROVEMENT_OPPORTUNITIES,
  OFFER_STRENGTH_CRITERIA,
  REVIEW_TO_WEBSITE_IMPORT,
  SALES_PAGE_DOCTOR,
  TRUST_PROOF_BUILDER,
  TRUST_PROOF_VAULT,
  WEBSITE_GROWTH_OPPORTUNITIES,
  WEBSITE_GROWTH_AUTOPILOT,
  WHATSAPP_ENQUIRY_KIT,
  WHATSAPP_FOLLOW_UP_CRM,
} from "../constants/managedGrowthModules";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function DashboardOverview() {
  const { profile } = useAuth();
  const { isFeatureEnabled } = useFeatures();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    leads: 0,
    websites: 0,
    appointments: 0,
  });
  const [recentLeads, setRecentLeads] = React.useState<any[]>([]);
  const [recentAppointments, setRecentAppointments] = React.useState<any[]>([]);
  const [reviewCount, setReviewCount] = React.useState(0);
  const [business, setBusiness] = React.useState<any>(null);
  const [website, setWebsite] = React.useState<any>(null);
  const [projects, setProjects] = React.useState<any[]>([]);
  const [approvals, setApprovals] = React.useState<any[]>([]);
  const [updateRequests, setUpdateRequests] = React.useState<WebsiteImprovement[]>([]);
  const [supportTickets, setSupportTickets] = React.useState<any[]>([]);
  const [conversionInsights, setConversionInsights] = React.useState<any>(null);
  const [measuredResults, setMeasuredResults] = React.useState<MonthlyWebsiteResult | null>(null);
  const [isMobile, setIsMobile] = React.useState(false);
  const [activeMainTab, setActiveMainTab] = React.useState("overview");
  const [rescueAuditUrl, setRescueAuditUrl] = React.useState("");
  const [rescueAuditReport, setRescueAuditReport] = React.useState<string[]>([]);
  const [offerDraft, setOfferDraft] = React.useState({
    mainService: "",
    targetCustomer: "",
    priceRange: "",
    consultationType: "free consultation",
    reassurance: "",
    preferredCta: "WhatsApp us",
  });
  const [competitorUrls, setCompetitorUrls] = React.useState(["", "", ""]);
  const [trustInputs, setTrustInputs] = React.useState<string[]>([]);
  const [requestDraft, setRequestDraft] = React.useState({
    type: "Change website text",
    details: "",
  });
  const [reviewImportText, setReviewImportText] = React.useState("");
  const [receptionistDraft, setReceptionistDraft] = React.useState({
    service: "",
    location: "",
    urgency: "This week",
    budget: "",
    contact: "",
  });
  const [savedGrowthActions, setSavedGrowthActions] = React.useState<any[]>([]);
  const [savingGrowthAction, setSavingGrowthAction] = React.useState<string | null>(null);

  const [analyticsData, setAnalyticsData] = React.useState<any[]>([]);
  const dashboardModeKey = React.useMemo(
    () => `bts_customer_dashboard_mode_${profile?.uid || profile?.email || "default"}`,
    [profile?.uid, profile?.email],
  );
  const [dashboardMode, setDashboardMode] = React.useState<"simple" | "development">(() => {
    try {
      return localStorage.getItem("bts_customer_dashboard_mode_default") === "development"
        ? "development"
        : "simple";
    } catch {
      return "simple";
    }
  });
  const isDevelopmentMode = dashboardMode === "development";

  React.useEffect(() => {
    const readMode = () => {
      try {
        setDashboardMode(
          localStorage.getItem(dashboardModeKey) === "development" ? "development" : "simple",
        );
      } catch {
        setDashboardMode("simple");
      }
    };
    readMode();
    const onModeChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ mode?: "simple" | "development"; key?: string }>;
      if (!customEvent.detail?.key || customEvent.detail.key === dashboardModeKey) {
        setDashboardMode(customEvent.detail?.mode === "development" ? "development" : "simple");
      }
    };
    window.addEventListener("bts:dashboard-mode-change", onModeChange as EventListener);
    window.addEventListener("storage", readMode);
    return () => {
      window.removeEventListener("bts:dashboard-mode-change", onModeChange as EventListener);
      window.removeEventListener("storage", readMode);
    };
  }, [dashboardModeKey]);

  const handleViewLive = () => {
    if (!profile?.businessId) {
      toast.error("No business is attached to this account yet.");
      return;
    }

    const livePath = `/w/${profile.businessId}`;

    if (stats.websites < 1) {
      toast.info("No published website was counted yet. Opening the live preview anyway.");
    }

    const opened = window.open(livePath, "_blank", "noopener,noreferrer");
    if (!opened) {
      toast.info("Popup blocked. Opening the live site in this tab.");
      window.location.assign(livePath);
      return;
    }
    toast.success("Live site opened in a new tab.");
  };

  const switchToDevelopmentMode = () => {
    try {
      localStorage.setItem(dashboardModeKey, "development");
      window.dispatchEvent(
        new CustomEvent("bts:dashboard-mode-change", {
          detail: { mode: "development", key: dashboardModeKey },
        }),
      );
    } catch {
      setDashboardMode("development");
    }
    setDashboardMode("development");
    toast.success("Development Mode enabled. Website editing tools are now visible.");
  };

  React.useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const response = await fetch("/api/health-check");
        const data = await response.json();
        console.log("API Health Check:", data);
      } catch (err) {
        console.error("API Health Check failed:", err);
      }
    };
    checkApiHealth();

    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  React.useEffect(() => {
    if (!profile?.businessId) {
      setLoading(false);
      return;
    }

    const fetchData = async (isInitial = false) => {
      try {
        if (!profile?.businessId) {
          console.warn("No businessId available for dashboard fetch");
          setLoading(false);
          return;
        }

        // Validate businessId format to prevent malformed requests
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(profile.businessId)) {
          console.error("Invalid businessId format in profile:", profile.businessId);
          setLoading(false);
          return;
        }

        if (isInitial) setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(
          `/api/dashboard/summary/${profile.businessId}`,
          {
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
              "Accept": "application/json",
            },
          }
        );

        if (!response.ok) {
          const contentType = response.headers.get("content-type");
          let errorMessage = `Dashboard fetch failed (${response.status})`;
          
          if (contentType && contentType.includes("application/json")) {
            const errorJson = await response.json();
            errorMessage += `: ${errorJson.error || JSON.stringify(errorJson)}`;
          } else {
            const errorText = await response.text();
            errorMessage += `: Non-JSON response received: ${errorText.slice(0, 100)}...`;
          }
          
          throw new Error(errorMessage);
        }

        const data = await response.json();

        setStats(data.stats);
        setRecentLeads(data.recentLeads);
        setRecentAppointments(data.recentAppointments);
        setBusiness(data.business);
        setAnalyticsData(data.analytics || []);
        setConversionInsights(data.conversionInsights || null);
        setMeasuredResults(data.measuredResults || null);
	        const { data: websiteData } = await supabase
	          .from("websites")
	          .select("id,status,pages,seo,updated_at")
	          .eq("business_id", profile.businessId)
            .order("updated_at", { ascending: false })
            .limit(1)
	          .maybeSingle();
	        setWebsite(websiteData || null);
          const [{ data: projectData }, { data: approvalData }, { data: updateData }, { data: ticketData }] = await Promise.all([
            supabase.from("projects").select("*").eq("business_id", profile.businessId).order("updated_at", { ascending: false }).limit(5),
            supabase.from("customer_approvals").select("*").eq("business_id", profile.businessId).order("requested_at", { ascending: false }).limit(5),
            supabase.from("monthly_update_requests").select("*").eq("business_id", profile.businessId).order("created_at", { ascending: false }).limit(10),
            supabase.from("support_tickets").select("*").eq("user_id", profile.uid).order("created_at", { ascending: false }).limit(5),
          ]);
          setProjects(projectData || []);
          setApprovals(approvalData || []);
          setUpdateRequests(updateData || []);
          setSupportTickets(ticketData || []);
        const { count: reviewsTotal } = await supabase
          .from("reviews")
          .select("id", { count: "exact", head: true })
          .eq("business_id", profile.businessId);
        setReviewCount(reviewsTotal || 0);
        const { data: growthActions, error: growthActionsError } = await supabase
          .from("managed_growth_actions")
          .select("*")
          .eq("business_id", profile.businessId)
          .order("created_at", { ascending: false })
          .limit(12);
        if (growthActionsError) {
          const isMissingGrowthTable =
            growthActionsError.message.includes("managed_growth_actions") ||
            growthActionsError.message.includes("schema cache") ||
            growthActionsError.code === "42P01" ||
            growthActionsError.code === "PGRST204";

          if (isMissingGrowthTable) {
            const localActions = JSON.parse(
              localStorage.getItem(`bt_growth_actions_${profile.businessId}`) || "[]",
            );
            setSavedGrowthActions(localActions);
          } else {
            console.warn("Error fetching managed growth actions:", growthActionsError);
            setSavedGrowthActions([]);
          }
        } else {
          setSavedGrowthActions(growthActions || []);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        if (isInitial) setLoading(false);
      }
    };

    fetchData(true);

    const leadsChannel = supabase
      .channel(`dashboard-leads-${Math.random()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
          filter: `business_id=eq.${profile.businessId}`,
        },
        () => fetchData(false),
      )
      .subscribe();
    const websitesChannel = supabase
      .channel(`dashboard-websites-${Math.random()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "websites",
          filter: `business_id=eq.${profile.businessId}`,
        },
        () => fetchData(false),
      )
      .subscribe();
    const apptsChannel = supabase
      .channel(`dashboard-appointments-${Math.random()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `business_id=eq.${profile.businessId}`,
        },
        () => fetchData(false),
      )
      .subscribe();
    const trackingChannel = supabase
      .channel(`dashboard-tracking-${Math.random()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tracking_events",
          filter: `business_id=eq.${profile.businessId}`,
        },
        () => fetchData(false),
      )
      .subscribe();
    const growthActionsChannel = supabase
      .channel(`dashboard-growth-actions-${Math.random()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "managed_growth_actions",
          filter: `business_id=eq.${profile.businessId}`,
        },
        () => fetchData(false),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(websitesChannel);
      supabase.removeChannel(apptsChannel);
      supabase.removeChannel(trackingChannel);
      supabase.removeChannel(growthActionsChannel);
    };
  }, [profile?.businessId]);

  const statCards = [
    {
      label: "Total Leads",
      value: stats.leads.toString(),
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      data: [
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: stats.leads },
      ],
      featureId: "lead_crm",
    },
    {
      label: "Active Sites",
      value: stats.websites.toString(),
      icon: Globe,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      data: [
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: stats.websites },
      ],
      featureId: "ai_synthesis",
    },
    {
      label: "Page Views This Month",
      value: String(measuredResults?.pageViews ?? 0),
      icon: BarChart3,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      data: [
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
      ],
      featureId: "analytics",
    },
    {
      label: "Appointments",
      value: stats.appointments.toString(),
      icon: Calendar,
      color: "text-amber-600",
      bg: "bg-amber-50",
      data: [
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: stats.appointments },
      ],
      featureId: "booking",
    },
    {
      label: "Chat Activity",
      value: "0",
      icon: MessageSquare,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      data: [
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
      ],
      featureId: "ai_chatbot",
    },
    {
      label: "Store Sales",
      value: "$0",
      icon: ShoppingBag,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      data: [
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
      ],
      featureId: "ecommerce",
    },
    {
      label: "Reviews",
      value: String(reviewCount),
      icon: Star,
      color: "text-amber-600",
      bg: "bg-amber-50",
      data: [
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
        { v: 0 },
      ],
      featureId: "review_management",
    },
  ];
  const onboarding = business?.onboarding_steps || {};
  const launchChecks = [
    { label: "Business details submitted", done: Boolean(business?.name && business?.industry) },
    { label: "Website draft created", done: Boolean(website?.id) },
    { label: "Pages selected", done: Boolean(website?.pages?.length || onboarding.pagesNeeded?.length) },
    { label: "Primary location added", done: Boolean(business?.location || onboarding.primaryLocation || onboarding.serviceArea) },
    { label: "SEO title and meta ready", done: Boolean(website?.seo?.title && website?.seo?.description) },
    { label: "Contact method added", done: Boolean(business?.email || business?.phone || business?.whatsapp_number) },
    { label: "WhatsApp or contact CTA checked", done: Boolean(business?.whatsapp_number || business?.phone || business?.email) },
    { label: "Ready to launch", done: website?.status === "published" || website?.status === "live" },
  ];
  const completedLaunchChecks = launchChecks.filter((item) => item.done).length;
	  const launchStatus =
	    website?.status === "published" || website?.status === "live"
	      ? "Website Live"
      : completedLaunchChecks >= launchChecks.length - 1
        ? "Ready to Launch"
        : website?.id
          ? "Draft"
	          : "Setup Needed";
  const activeProject = projects[0];
  const latestApproval = approvals[0];
  const openUpdateRequests = updateRequests.filter((request) => !["completed", "declined", "cancelled"].includes(String(request.status || "")));
  const currentPlan = findPlan(undefined, business?.plan || "starter");
  const limits = getLocalSeoLimits(business?.plan || "starter", currentPlan.maxPages, currentPlan);
  const completedWebsiteImprovements = updateRequests.filter((request) => {
    const samePeriod = request.allowance_period === new Date().toISOString().slice(0, 7);
    return samePeriod && String(request.status || "") === "completed";
  });
  const completedUpdateRequestsThisMonth = updateRequests.filter((request) => {
    const samePeriod = request.allowance_period === new Date().toISOString().slice(0, 7);
    return samePeriod && !["declined", "cancelled"].includes(String(request.status || ""));
  }).length;
  const numericMonthlyAllowance = Math.max(0, Number(currentPlan.monthlyUpdateLimit ?? 1));
  const remainingUpdateAllowance = Math.max(0, numericMonthlyAllowance - completedUpdateRequestsThisMonth);
  const paymentComplete =
    business?.subscription_status === "active" ||
    (business?.subscription_status === "trialing" && business?.stripe_subscription_id);
  const websitePublished = website?.status === "published" || website?.status === "live";
  const websiteApproved = latestApproval?.status === "approved" || website?.seo?.workflowStatus === "ready_to_launch" || websitePublished;
  const domainConnected = Boolean((business as any)?.custom_domain && (business as any)?.custom_domain_status === "connected");
  const portalTimeline = [
    ["Payment confirmed", paymentComplete],
    ["Onboarding started", Boolean(business?.onboarding_steps && Object.keys(business.onboarding_steps || {}).length)],
    ["Onboarding completed", Boolean(business?.onboarding_completed || business?.onboarding_steps?.step4?.completed)],
    ["Content received", Boolean(website?.pages?.length || business?.onboarding_steps?.contentReceived)],
    ["Draft in preparation", Boolean(activeProject && ["ready_for_build", "in_production", "development", "design"].includes(activeProject.status))],
    ["Draft ready", Boolean(website?.id)],
    ["Customer review", Boolean(latestApproval && latestApproval.status === "pending")],
    ["Revisions", Boolean(activeProject && ["changes_requested", "final_revisions", "revisions"].includes(activeProject.status))],
    ["Approval", websiteApproved],
    ["Domain connection", domainConnected],
    ["Published", websitePublished],
    ["Ongoing support", websitePublished && remainingUpdateAllowance >= 0],
  ];
  const nextAction = (() => {
    if (!paymentComplete) return { title: "Pay the outstanding invoice", owner: "Customer", due: "Before production starts", href: "/dashboard/billing" };
    if (!business?.onboarding_completed && !business?.onboarding_steps?.step4?.completed) return { title: "Complete your onboarding", owner: "Customer", due: "Next step", href: "/dashboard/onboarding" };
    if (!business?.logo_url && !business?.onboarding_steps?.logoUploaded) return { title: "Upload your logo", owner: "Customer", due: "Before draft polish", href: "/dashboard/settings" };
    if (latestApproval?.status === "pending") return { title: "Review your website draft", owner: "Customer", due: latestApproval.requested_at ? new Date(latestApproval.requested_at).toLocaleDateString() : "Awaiting review", href: "/dashboard/approvals" };
    if (latestApproval?.status === "changes_requested") return { title: "Administrator is handling revisions", owner: "Bennie Studio", due: "After feedback review", href: "/dashboard/approvals" };
    if (!websiteApproved && website?.id) return { title: "Submit consolidated feedback", owner: "Customer", due: "Before approval", href: "/dashboard/approvals" };
    if (!domainConnected) return { title: "Connect your domain", owner: "Customer", due: "Before publication", href: "/dashboard/settings" };
    if (!websitePublished) return { title: "Approve your website for publication", owner: "Customer", due: "Before launch", href: "/dashboard/approvals" };
    return { title: "Use your support and update allowance", owner: "Shared", due: `${remainingUpdateAllowance} request(s) remaining`, href: "/dashboard/update-requests" };
  })();
  const growthOpportunities = WEBSITE_GROWTH_OPPORTUNITIES.map((item) => {
    if (item.id === "seo") {
      return {
        ...item,
        issues: website?.seo?.title
          ? item.issues
          : ["SEO title is missing or incomplete", "Meta description needs a clearer service promise"],
      };
    }
    if (item.id === "enquiry") {
      return {
        ...item,
        issues: business?.whatsapp_number
          ? item.issues
          : ["WhatsApp or phone CTA is not configured", "Primary enquiry path needs a fallback form"],
      };
    }
    return item;
  });
  const enquiryActions = conversionInsights?.actions?.length
    ? conversionInsights.actions
    : ENQUIRY_PATH_TRACKER.sampleActions.map((action) => ({
        ...action,
        value:
          action.label === "Form submissions"
            ? stats.leads
            : action.label === "Booking clicks"
              ? stats.appointments
              : action.value,
      }));
  const topCta = conversionInsights?.topCta || (business?.whatsapp_number ? "WhatsApp CTA" : stats.leads > 0 ? "Contact Form" : "Pending tracking");
  const recommendedConversionImprovement =
    conversionInsights?.recommendedImprovement ||
    "Add a clearer quote CTA and WhatsApp fallback near the first enquiry section.";

  const saveGrowthAction = async ({
    actionType,
    title,
    payload = {},
    priority = "normal",
    status = "queued",
  }: {
    actionType: string;
    title: string;
    payload?: Record<string, any>;
    priority?: "low" | "normal" | "high" | "launch_blocker";
    status?: "queued" | "in_progress" | "applied" | "ignored" | "completed" | "cancelled";
  }) => {
    if (!profile?.businessId) {
      toast.error("No business is attached to this account yet.");
      return null;
    }

    const createLocalGrowthAction = () => {
      const localAction = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `local-${Date.now()}`,
        business_id: profile.businessId,
        website_id: website?.id || null,
        profile_id: profile.uid,
        action_type: actionType,
        title,
        priority,
        status,
        payload,
        created_at: new Date().toISOString(),
        local_only: true,
      };

      const storageKey = `bt_growth_actions_${profile.businessId}`;
      const existing = JSON.parse(localStorage.getItem(storageKey) || "[]");
      localStorage.setItem(
        storageKey,
        JSON.stringify([localAction, ...existing].slice(0, 12)),
      );
      setSavedGrowthActions((current) => [localAction, ...current].slice(0, 12));
      return localAction;
    };

    setSavingGrowthAction(actionType);
    const { data, error } = await supabase
      .from("managed_growth_actions")
      .insert({
        business_id: profile.businessId,
        website_id: website?.id || null,
        profile_id: profile.uid,
        action_type: actionType,
        title,
        priority,
        status,
        payload,
      })
      .select("*")
      .single();
    setSavingGrowthAction(null);

    if (error) {
      const isMissingGrowthTable =
        error.message.includes("managed_growth_actions") ||
        error.message.includes("schema cache") ||
        error.code === "42P01" ||
        error.code === "PGRST204";

      if (isMissingGrowthTable) {
        const localAction = createLocalGrowthAction();
        toast.success("Saved locally. Apply the managed growth migration to sync this into Supabase.");
        return localAction;
      }

      toast.error(error.message);
      return null;
    }

    setSavedGrowthActions((current) => [data, ...current].slice(0, 12));
    return data;
  };

  const handleApplySuggestion = async (label: string, payload: Record<string, any> = {}) => {
    const saved = await saveGrowthAction({
      actionType: "website_improvement",
      title: label,
      priority: "normal",
      payload: {
        source: "dashboard_growth_tool",
        suggestedChange: label,
        businessName: business?.name,
        ...payload,
      },
    });
    if (saved) toast.success(`${label} queued for your next website update.`);
  };

  const runRescueAudit = async () => {
    const trimmedUrl = rescueAuditUrl.trim();
    if (!trimmedUrl) {
      toast.error("Enter a website URL to audit.");
      return;
    }
    const normalizedUrl = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
    try {
      const parsed = new URL(normalizedUrl);
      setRescueAuditUrl(parsed.href);
      const report = [
        "Design: Check whether the hero section explains the offer within 5 seconds.",
        "Mobile: Test tap targets, sticky CTA visibility, and first-screen readability.",
        "SEO: Confirm every page has one H1, a unique SEO title, and a useful meta description.",
        "CTA: Add a stronger WhatsApp or quote CTA above the fold.",
        "Trust: Add proof such as reviews, case studies, credentials, project photos, or guarantees.",
        "Recommended plan: Growth for most small business rebuilds, Scale if campaign pages or local growth pages are needed.",
      ];
      setRescueAuditReport(report);
      const saved = await saveGrowthAction({
        actionType: "website_rescue_audit",
        title: `Website rescue audit: ${parsed.hostname}`,
        priority: "high",
        payload: {
          auditedUrl: parsed.href,
          report,
          cta: "Upgrade to a managed website plan to fix these issues.",
        },
      });
      if (saved) toast.success("Website rescue audit saved.");
    } catch {
      toast.error("Enter a valid website URL.");
    }
  };

  const generatedOffer = React.useMemo(() => {
    const service = offerDraft.mainService || "your service";
    const audience = offerDraft.targetCustomer || "your ideal customers";
    const price = offerDraft.priceRange ? ` from ${offerDraft.priceRange}` : "";
    const reassurance = offerDraft.reassurance || "clear guidance before you decide";
    const cta = offerDraft.preferredCta || "Get started";
    return {
      headline: `${service} for ${audience}${price}`,
      cta,
      packageCopy: `A focused ${service} package for ${audience}, with ${offerDraft.consultationType} and ${reassurance}.`,
      faq: `Is this right for me? This is best if you need ${service} and want ${reassurance}.`,
      whatsappScript: `Hi, I found your website and I’m interested in ${service}. Can I get more details?`,
    };
  }, [offerDraft]);
  const activeCompetitors = competitorUrls.filter((url) => url.trim().length > 0);
  const activeTrustProof = trustInputs.length;
  const reviewLines = reviewImportText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const reviewSignals = reviewLines.slice(0, 4).map((line) => {
    const words = line.split(/\s+/).slice(0, 9).join(" ");
    return words ? `"${words}${line.split(/\s+/).length > 9 ? "..." : ""}"` : "";
  }).filter(Boolean);
  const localSearchChecks = [
      business?.location,
      business?.email || business?.phone || business?.whatsapp_number,
      website?.seo?.title,
      website?.seo?.description,
      website?.pages?.length,
      activeTrustProof,
      reviewSignals.length,
      measuredResults?.enquiries || measuredResults?.whatsAppClicks || measuredResults?.callClicks || measuredResults?.bookings,
    ].map(Boolean);
  const receptionistSummary = `${receptionistDraft.service || "Service"} enquiry in ${receptionistDraft.location || "target location"} (${receptionistDraft.urgency}). Budget: ${receptionistDraft.budget || "not provided"}. Follow up via ${receptionistDraft.contact || "preferred contact"}.`;
  const enquiryLossSignals = [
    conversionInsights?.totalEnquiries
      ? `Total tracked enquiry actions this month: ${conversionInsights.totalEnquiries}`
      : "No tracked enquiry actions yet.",
    ...ENQUIRY_LOSS_DETECTOR.signals.slice(0, 3),
  ];

  const submitDoneForYouRequest = async () => {
    if (!profile?.businessId) {
      toast.error("No business is attached to this account yet.");
      return;
    }
    if (!requestDraft.details.trim()) {
      toast.error("Add request details first.");
      return;
    }

    setSavingGrowthAction("done_for_you_request");
    const draft = { title: requestDraft.type, details: requestDraft.details.trim(), savedAt: new Date().toISOString() };
    const clientRequestId = crypto.randomUUID();
    const { error: requestError } = await supabase.from("monthly_update_requests").insert({
      business_id: profile.businessId,
      profile_id: profile.uid,
      request_type: "managed_growth_request",
      update_category: requestDraft.type.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      priority: "normal",
      status: "submitted",
      title: requestDraft.type,
      details: requestDraft.details.trim(),
      allowance_period: new Date().toISOString().slice(0, 7),
      client_request_id: clientRequestId,
      submitted_at: new Date().toISOString(),
      estimated_response_at: new Date(Date.now() + 2 * 86400000).toISOString(),
      customer_draft: draft,
    });
    setSavingGrowthAction(null);

    if (requestError) {
      localStorage.setItem(`bts_update_request_draft_${profile.businessId}`, JSON.stringify(draft));
      console.error("Managed dashboard update request submission failed:", requestError);
      toast.error(
        requestError.message.includes("monthly_update_requests")
          ? "Apply the update request Supabase migration before submitting requests."
          : `Request not submitted. Your draft was saved in this browser. ${requestError.message}`,
      );
      return;
    }

    await saveGrowthAction({
      actionType: "done_for_you_request",
      title: requestDraft.type,
      payload: { details: requestDraft.details.trim() },
    });
    toast.success(`${requestDraft.type} request queued.`);
    setRequestDraft((current) => ({ ...current, details: "" }));
  };

  const saveBusinessOffer = async () => {
    const saved = await saveGrowthAction({
      actionType: "business_offer",
      title: generatedOffer.headline,
      payload: {
        inputs: offerDraft,
        output: generatedOffer,
      },
    });
    if (saved) toast.success("Business offer draft saved.");
  };

  const saveReviewImport = async () => {
    if (!reviewLines.length) {
      toast.error("Paste at least one real review first.");
      return;
    }
    const saved = await saveGrowthAction({
      actionType: "manual_review_import",
      title: `${reviewLines.length} review${reviewLines.length === 1 ? "" : "s"} imported`,
      payload: {
        reviewCount: reviewLines.length,
        reviewSignals,
        rawReviews: reviewLines,
        outputs: REVIEW_TO_WEBSITE_IMPORT.outputs,
      },
    });
    if (saved) toast.success("Review signals saved for website copy.");
  };

  const saveTrustProofSelection = async () => {
    if (!trustInputs.length) {
      toast.error("Select at least one trust asset first.");
      return;
    }
    const saved = await saveGrowthAction({
      actionType: "trust_proof_selection",
      title: `${trustInputs.length} trust proof asset${trustInputs.length === 1 ? "" : "s"} selected`,
      payload: {
        selectedProof: trustInputs,
        recommendedPlacements: TRUST_PROOF_VAULT.placements,
      },
    });
    if (saved) toast.success("Trust proof selection saved.");
  };

  const saveCompetitorGapScan = async () => {
    if (!activeCompetitors.length) {
      toast.error("Enter at least one competitor URL first.");
      return;
    }
    const saved = await saveGrowthAction({
      actionType: "competitor_gap_scan",
      title: `${activeCompetitors.length} competitor gap scan`,
      priority: "high",
      payload: {
        competitorUrls: activeCompetitors,
        gaps: COMPETITOR_GAP_SCANNER,
        note: "Manual URL-based planning scan. Full competitor crawling requires an external fetch/scraping service.",
      },
    });
    if (saved) toast.success(`${activeCompetitors.length} competitor gap signals saved.`);
  };

  const saveReceptionistTriage = async () => {
    const saved = await saveGrowthAction({
      actionType: "ai_receptionist_triage",
      title: receptionistSummary,
      payload: {
        triage: receptionistDraft,
        summary: receptionistSummary,
      },
    });
    if (saved) toast.success("Receptionist triage saved.");
  };

  const downloadMonthlyReport = async () => {
    const resultLine = (label: string, value: unknown) => `${label}: ${value ?? "Not enough data yet"}`;
    const completedChanges = completedWebsiteImprovements.length
      ? completedWebsiteImprovements.map((request) => `- ${request.title || request.details || "Website improvement completed"}`)
      : ["- No completed website updates recorded this month yet."];
    const report = [
      MONTHLY_WEBSITE_REPORT.title,
      `Business: ${business?.name || "Your Business"}`,
      "",
      "YOUR WEBSITE THIS MONTH",
      resultLine("Enquiries received", measuredResults?.enquiries),
      resultLine("WhatsApp clicks", measuredResults?.whatsAppClicks),
      resultLine("Call clicks", measuredResults?.callClicks),
      resultLine("Bookings", measuredResults?.bookings),
      resultLine("Page views", measuredResults?.pageViews),
      resultLine("Top enquiry page", measuredResults?.topEnquiryPage),
      resultLine("Most-used enquiry path", measuredResults?.mostUsedEnquiryPath),
      "",
      "WHAT CHANGED",
      ...completedChanges,
      "",
      "WHAT WE NOTICED",
      measuredResults?.opportunity || "Not enough data yet for an evidence-based observation.",
      "",
      "RECOMMENDED NEXT IMPROVEMENT",
      recommendedConversionImprovement,
      "",
      "CUSTOMER ACTION",
      "Request this improvement from the Bennie Studio update portal.",
    ].join("\n");
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "monthly-website-growth-report.txt";
    link.click();
    URL.revokeObjectURL(url);
    if (profile?.businessId) {
      const { error: reportError } = await supabase.from("monthly_growth_reports").upsert({
        business_id: profile.businessId,
        website_id: website?.id || null,
        profile_id: profile.uid,
        report_month: new Date().toISOString().slice(0, 7),
        status: "draft",
        lead_count: measuredResults?.enquiries || 0,
        hot_lead_count: 0,
        review_count: reviewCount,
        local_seo_page_count: 0,
        summary: measuredResults?.opportunity || "Not enough data yet for an evidence-based observation.",
        recommendations: [
          recommendedConversionImprovement,
        ],
        payload: {
          report,
          measuredResults,
          completedWebsiteImprovements,
          recommendation: recommendedConversionImprovement,
        },
      }, { onConflict: "business_id,report_month" });
      if (reportError && !reportError.message.includes("monthly_growth_reports")) {
        console.warn("Monthly growth report persistence failed:", reportError.message);
      }
    }
    await saveGrowthAction({
      actionType: "monthly_website_report",
      title: `Monthly website report - ${new Date().toLocaleDateString()}`,
      status: "completed",
      payload: {
        report,
        measuredResults,
        completedWebsiteImprovements,
        recommendation: recommendedConversionImprovement,
      },
    });
  };

  if (loading && !stats.websites && !recentLeads.length) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full"
        />
        <p className="text-slate-500 font-medium animate-pulse text-sm">
          Synchronizing your business data...
        </p>
      </div>
    );
  }

  if (!isDevelopmentMode) {
    const statusLabel = launchStatus;
    const simpleActions = [
      {
        label: "Preview Website",
        description: "Open the current website in a new tab.",
        icon: Globe,
        action: handleViewLive,
        primary: true,
      },
      {
        label: "View Enquiries",
        description: "Review form submissions and leads.",
        icon: Users,
        action: () => navigate("/dashboard/leads"),
        hidden: !isFeatureEnabled("lead_crm" as any),
      },
      {
        label: "Appointments",
        description: "Check booking requests and scheduled calls.",
        icon: Calendar,
        action: () => navigate("/dashboard/appointments"),
        hidden: !isFeatureEnabled("booking" as any),
      },
      {
        label: "Billing & Plan",
        description: "See your current website plan and billing details.",
        icon: FileText,
        action: () => navigate(profile?.role === "staff" ? "/dashboard/support" : "/dashboard/billing"),
      },
      {
        label: "Support",
        description: "Ask for website changes or account help.",
        icon: MessageSquare,
        action: () => navigate("/dashboard/support"),
      },
    ].filter((item) => !item.hidden);

    return (
      <div className="mx-auto w-full max-w-6xl space-y-6 pb-16">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <Badge className="mb-4 border-none bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
                Customer Portal
              </Badge>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                Manage your website without the clutter.
              </h1>
              <p className="mt-4 text-base font-semibold leading-7 text-slate-600 md:text-lg">
                View enquiries, check your website status, manage billing, and ask
                for support. Website editing tools stay hidden until you switch to
                Development Mode.
              </p>
            </div>
            <div className="w-full rounded-3xl bg-slate-950 p-5 text-white lg:max-w-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-200">
                    Website Status
                  </p>
                  <p className="mt-2 text-2xl font-black">{statusLabel}</p>
                </div>
                <Badge className="border-white/10 bg-white/10 text-white hover:bg-white/10">
                  {business?.plan || "Plan"}
                </Badge>
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-300">
                {completedLaunchChecks}/{launchChecks.length} launch checks ready
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {simpleActions.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              className={cn(
                "group rounded-3xl border p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg",
                item.primary
                  ? "border-indigo-200 bg-indigo-600 text-white hover:bg-indigo-700"
                  : "border-slate-200 bg-white text-slate-950 hover:border-indigo-200",
              )}
            >
              <item.icon
                className={cn(
                  "h-6 w-6",
                  item.primary ? "text-white" : "text-indigo-600",
                )}
              />
              <p className="mt-5 text-base font-black">{item.label}</p>
              <p
                className={cn(
                  "mt-2 text-sm font-semibold leading-6",
                  item.primary ? "text-indigo-50" : "text-slate-500",
                )}
              >
                {item.description}
              </p>
              <ArrowRight
                className={cn(
                  "mt-4 h-4 w-4 transition-transform group-hover:translate-x-1",
                  item.primary ? "text-white" : "text-slate-400",
                )}
              />
            </button>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black text-slate-950">
                Your Website This Month
              </CardTitle>
              <CardDescription>
                Measured events from your website. Missing tracking is shown honestly.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Enquiries received", value: measuredResults?.enquiries ?? "Not enough data yet", icon: Users },
                { label: "WhatsApp clicks", value: measuredResults?.whatsAppClicks ?? "Not enough data yet", icon: MessageSquare },
                { label: "Call clicks", value: measuredResults?.callClicks ?? "Not enough data yet", icon: Phone },
                { label: "Bookings", value: measuredResults?.bookings ?? "Not enough data yet", icon: Calendar },
                { label: "Top enquiry page", value: measuredResults?.topEnquiryPage || "Not enough data yet", icon: Globe },
                { label: "Most-used enquiry path", value: measuredResults?.mostUsedEnquiryPath || "Not enough data yet", icon: Target },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <item.icon className="h-5 w-5 text-indigo-600" />
                  <p className="mt-4 break-words text-xl font-black text-slate-950">{item.value}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {item.label}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-black text-slate-950">
                Recommended Next Improvement
              </CardTitle>
              <CardDescription>
                A consultant recommendation, clearly separated from the measured results.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl bg-indigo-50 p-4 text-sm font-bold leading-6 text-slate-700">{recommendedConversionImprovement}</div>
              <Button
                onClick={() => navigate("/dashboard/update-requests")}
                className="h-12 w-full rounded-xl bg-slate-950 font-black uppercase tracking-widest text-white hover:bg-slate-800"
              >
                <Wrench className="mr-2 h-4 w-4" />
                Request This Improvement
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard/support")}
                className="h-12 w-full rounded-xl font-black uppercase tracking-widest"
              >
                Contact Support
              </Button>
              <Button variant="ghost" onClick={switchToDevelopmentMode} className="h-10 w-full text-xs font-black uppercase tracking-widest text-slate-500">Open Development Mode</Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
            <CardHeader><CardTitle className="text-xl font-black text-slate-950">What We Improved</CardTitle><CardDescription>Completed website update records from this month.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {completedWebsiteImprovements.length ? completedWebsiteImprovements.map((request) => (
                <div key={request.id || request.client_request_id} className="flex gap-3 rounded-2xl bg-emerald-50 p-4"><Check className="h-5 w-5 shrink-0 text-emerald-600" /><div><p className="font-black text-slate-900">{request.title || "Website improvement completed"}</p><p className="mt-1 text-xs font-semibold text-slate-500">{request.updated_at ? new Date(request.updated_at).toLocaleDateString() : "Completed this month"}</p></div></div>
              )) : <p className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">No completed website updates recorded this month yet.</p>}
            </CardContent>
          </Card>
          <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
            <CardHeader><CardTitle className="text-xl font-black text-slate-950">Opportunity Found</CardTitle><CardDescription>Shown only when measured activity supports the observation.</CardDescription></CardHeader>
            <CardContent><div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold leading-6 text-slate-700">{measuredResults?.opportunity || "Not enough data yet"}</div></CardContent>
          </Card>
        </section>

        {(recentLeads.length > 0 || recentAppointments.length > 0) && (
          <section className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-black text-slate-950">
                  Recent Enquiries
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentLeads.slice(0, 4).map((lead) => (
                  <div key={lead.id || lead.email || lead.created_at} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="font-black text-slate-950">{lead.name || "New enquiry"}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {lead.email || lead.phone || lead.message || "Contact details captured"}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-black text-slate-950">
                  Recent Appointments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentAppointments.slice(0, 4).map((appointment) => (
                  <div key={appointment.id || appointment.created_at} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="font-black text-slate-950">{appointment.name || appointment.title || "Appointment"}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {appointment.scheduled_at
                        ? new Date(appointment.scheduled_at).toLocaleString()
                        : appointment.status || "Booking request captured"}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    );
  }

  return (
    <Tabs defaultValue="overview" className="space-y-12 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
        <motion.div variants={fadeInUp} className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
            Growth OS Interface v4.0
          </span>
          <h1 className="text-5xl sm:text-7xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">
            Operational.
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium">
            Monitoring the digital infrastructure for{" "}
            <span className="text-slate-900 dark:text-white font-black">
              {business?.name || "Your Business"}
            </span>
            .
          </p>
        </motion.div>

        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl h-14 w-full lg:w-auto">
          <TabsTrigger
            value="overview"
            className="rounded-xl h-12 px-6 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="insights"
            className="rounded-xl h-12 px-6 font-bold text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm flex gap-2"
          >
            <Zap className="h-4 w-4" /> Performance
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="space-y-12 mt-0">
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainer}
          className="space-y-12"
        >
          <motion.div
            variants={fadeInUp}
            className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8"
          >
            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
              <Button
                variant="outline"
                className="flex-1 lg:flex-none h-16 px-8 gap-3 rounded-2xl border-slate-100 dark:border-slate-800 hover:bg-slate-50 transition-all font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-100"
                onClick={handleViewLive}
              >
                <ExternalLink className="h-5 w-5" /> View Live
              </Button>

              <Button
                variant="outline"
                className="flex-1 lg:flex-none h-16 px-8 gap-3 rounded-2xl border-slate-100 dark:border-slate-800 hover:bg-slate-50 transition-all font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-100"
                onClick={() => navigate("/dashboard/website")}
              >
                <Layout className="h-5 w-5 text-indigo-600" /> Architect
              </Button>

              {profile?.role === "super_admin" && (
                <Button
                  variant="outline"
                  className="flex-1 lg:flex-none h-16 px-8 gap-3 rounded-2xl border-slate-100 dark:border-slate-800 hover:bg-slate-50 transition-all font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-100"
                  onClick={() => navigate("/dashboard/settings")}
                >
                  <BrainCircuit className="h-5 w-5 text-indigo-600" /> Model
                  Config
                </Button>
              )}

              <Button
                className="w-full lg:w-auto h-16 px-10 gap-3 rounded-2xl bg-slate-950 hover:bg-slate-800 shadow-2xl shadow-slate-200 dark:shadow-none text-white font-black transition-all text-xs uppercase tracking-[0.2em]"
                onClick={() => navigate("/dashboard/website")}
              >
                <Sparkles className="h-5 w-5 text-primary" /> Edit My Website
              </Button>
            </div>
          </motion.div>

          {/* Setup Progress Widget */}
          {profile?.businessId && isDevelopmentMode && (
            <OnboardingChecklist businessId={profile.businessId} />
          )}

          {savedGrowthActions.length > 0 && (
            <motion.div variants={fadeInUp}>
              <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                    <Check className="h-5 w-5 text-emerald-600" />
                    Saved Growth Actions
                  </CardTitle>
                  <CardDescription>
                    Recent audits, copy plans, proof selections, and improvement tasks saved for this business.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {savedGrowthActions.slice(0, 6).map((action) => (
                    <div key={action.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline" className="text-[9px] font-black uppercase">
                          {String(action.action_type || "").replace(/_/g, " ")}
                        </Badge>
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                          {action.status}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm font-black leading-5 text-slate-950">{action.title}</p>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {new Date(action.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          <motion.div variants={fadeInUp} className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
            <Card className="rounded-[2rem] border-indigo-100 bg-white shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                      <Target className="h-5 w-5 text-indigo-600" />
                      Website Growth Opportunities
                    </CardTitle>
                    <CardDescription>
                      Consultant observations are shown as findings and actions, never as invented website scores.
                    </CardDescription>
                  </div>
                  <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">Action focused</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2">
                  {growthOpportunities.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-black text-slate-950">{item.label}</p>
                        <Badge className={cn(
                          "text-[9px] font-black uppercase",
                          item.priority === "High" ? "bg-red-50 text-red-700" : item.priority === "Medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700",
                        )}>
                          {item.priority}
                        </Badge>
                      </div>
                      <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{item.issues[0]}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApplySuggestion(item.label)}
                        className="mt-4 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest"
                      >
                        {item.oneClickSuggestion}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  This Month’s Website Improvement Opportunities
                </CardTitle>
                <CardDescription>
                  Monthly suggestions make the subscription feel like a managed growth service, not just hosting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {MONTHLY_IMPROVEMENT_OPPORTUNITIES.filter((item) => !item.featureId || isFeatureEnabled(item.featureId as any)).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-slate-950">{item.issue}</p>
                          <Badge variant="outline" className="text-[9px] font-black uppercase">{item.priority}</Badge>
                        </div>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{item.whyItMatters}</p>
                        <p className="mt-2 text-sm font-bold leading-6 text-indigo-700">{item.suggestedImprovement}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApplySuggestion(item.issue)} className="rounded-xl bg-indigo-600 font-bold">Apply</Button>
                        <Button size="sm" variant="outline" onClick={() => toast.info("Suggestion ignored for this month.")} className="rounded-xl font-bold">Ignore</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm xl:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                  <Phone className="h-5 w-5 text-emerald-600" />
                  WhatsApp Enquiry Kit
                </CardTitle>
                <CardDescription>
                  WhatsApp-first lead tools for businesses that close enquiries in chat.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Default pre-filled message</p>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-800">{WHATSAPP_ENQUIRY_KIT.defaultMessage}</p>
                </div>
                <div className="grid gap-2">
                  {["Floating WhatsApp button", "Service-specific WhatsApp buttons", "Click tracking", "Suggested follow-up messages", "Contact form fallback"].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-black uppercase tracking-widest text-slate-600">{item}</span>
                    </div>
                  ))}
                </div>
                {!isFeatureEnabled("whatsapp_enquiry_kit" as any) && (
                  <Button onClick={() => navigate("/dashboard/billing")} className="w-full rounded-xl bg-slate-950 font-black uppercase tracking-widest">
                    Unlock in Growth
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm xl:col-span-2">
              <CardHeader>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                      <BarChart3 className="h-5 w-5 text-indigo-600" />
                      Enquiry Path Tracker
                    </CardTitle>
                    <CardDescription>
                      Track WhatsApp clicks, calls, emails, forms, booking clicks, and quote CTAs by page.
                    </CardDescription>
                  </div>
                  <Badge className="w-fit bg-indigo-50 text-indigo-700 hover:bg-indigo-50">Top CTA: {topCta}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {enquiryActions.map((action) => (
                    <div key={action.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{action.label}</p>
                      <p className="mt-1 text-2xl font-black text-slate-950">{action.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-amber-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Evidence-based opportunity</p>
                    <p className="mt-2 text-sm font-black text-slate-900">{measuredResults?.opportunity || "Not enough data yet"}</p>
                  </div>
                  <div className="rounded-2xl bg-indigo-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Recommended improvement</p>
                    <p className="mt-2 text-sm font-black text-slate-900">{recommendedConversionImprovement}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <Megaphone className="h-5 w-5 text-indigo-600" />
                  One-Click Campaign Pages
                </CardTitle>
                <CardDescription>Scale plan tool for promotions, consultations, launches, and event signups.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {CAMPAIGN_LANDING_PAGE_TEMPLATES.map((template) => (
                  <div key={template.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="font-black text-slate-950">{template.label}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{template.description}</p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-indigo-600">{template.sections.length} sections + thank-you copy</p>
                  </div>
                ))}
                <Button
                  onClick={() => isFeatureEnabled("campaign_landing_pages" as any) ? handleApplySuggestion("Campaign landing page") : navigate("/dashboard/billing")}
                  className="w-full rounded-xl bg-indigo-600 font-black uppercase tracking-widest"
                >
                  {isFeatureEnabled("campaign_landing_pages" as any) ? "Create Campaign Page" : "Unlock in Scale"}
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <MapPin className="h-5 w-5 text-indigo-600" />
                  Local Growth Pages
                </CardTitle>
                <CardDescription>Controlled service/location page generator with duplicate-content warnings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Required inputs</p>
                  <p className="mt-2 text-sm font-bold text-slate-800">{LOCAL_GROWTH_PAGE_BLUEPRINT.requiredInputs.join(", ")}</p>
                </div>
                <div className="space-y-2">
                  {LOCAL_GROWTH_PAGE_BLUEPRINT.duplicateWarnings.map((warning) => (
                    <div key={warning} className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3">
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                      <p className="text-xs font-bold leading-5 text-amber-900">{warning}</p>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => isFeatureEnabled("local_growth_pages" as any) ? handleApplySuggestion("Local Growth Page") : navigate("/dashboard/billing")}
                  className="w-full rounded-xl bg-indigo-600 font-black uppercase tracking-widest"
                >
                  {isFeatureEnabled("local_growth_pages" as any) ? "Draft Local Page" : "Unlock in Scale"}
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <Wrench className="h-5 w-5 text-indigo-600" />
                  Website Rescue Audit
                </CardTitle>
                <CardDescription>Lead-generation audit for prospects with weak or outdated websites.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <input
                    value={rescueAuditUrl}
                    onChange={(event) => setRescueAuditUrl(event.target.value)}
                    placeholder="example.com"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
                  />
                  <Button onClick={runRescueAudit} className="rounded-xl bg-indigo-600 font-black uppercase tracking-widest">
                    Audit
                  </Button>
                </div>
                {(rescueAuditReport.length ? rescueAuditReport : ["Design issues", "Speed issues", "SEO issues", "Mobile issues", "CTA issues", "Trust issues", "Content issues"]).map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                    <span className="text-xs font-bold leading-5 text-slate-600">{item}</span>
                  </div>
                ))}
                <div className="rounded-2xl bg-indigo-50 p-4">
                  <p className="text-sm font-black text-indigo-900">CTA: Upgrade to a managed website plan to fix these issues.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                  <Layout className="h-5 w-5 text-indigo-600" />
                  Industry Page Packs
                </CardTitle>
                <CardDescription>
                  Niche-specific structures, CTAs, FAQs, trust sections, image guidance, SEO keywords, and forms.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {INDUSTRY_PAGE_PACKS.map((pack) => (
                    <div key={pack.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="font-black text-slate-950">{pack.label}</p>
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{pack.homepageStructure.join(" → ")}</p>
                      <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-indigo-600">{pack.seoKeywords.slice(0, 2).join(" / ")}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  Business Offer Builder
                </CardTitle>
                <CardDescription>
                  Turn a basic service into a stronger website offer with copy, CTA, FAQs, and scripts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  {[
                    ["mainService", "Main service"],
                    ["targetCustomer", "Target customer"],
                    ["priceRange", "Starting price / range"],
                    ["reassurance", "Guarantee or reassurance"],
                    ["preferredCta", "Preferred CTA"],
                  ].map(([field, label]) => (
                    <input
                      key={field}
                      value={(offerDraft as any)[field]}
                      onChange={(event) => setOfferDraft((current) => ({ ...current, [field]: event.target.value }))}
                      placeholder={label}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
                    />
                  ))}
                </div>
                <div className="rounded-2xl bg-indigo-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Generated offer</p>
                  <p className="mt-2 text-sm font-black text-slate-950">{generatedOffer.headline}</p>
                  <p className="mt-2 text-xs font-bold leading-5 text-slate-700">{generatedOffer.packageCopy}</p>
                  <p className="mt-2 text-xs font-bold leading-5 text-slate-700">{generatedOffer.faq}</p>
                  <p className="mt-2 text-xs font-bold leading-5 text-emerald-700">{generatedOffer.whatsappScript}</p>
                </div>
                <Button onClick={saveBusinessOffer} disabled={savingGrowthAction === "business_offer"} className="w-full rounded-xl bg-indigo-600 font-black uppercase tracking-widest">
                  {savingGrowthAction === "business_offer" ? "Saving..." : "Save Offer Draft"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp} className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                  <Zap className="h-5 w-5 text-indigo-600" />
                  Monthly Website Improvement Plan
                </CardTitle>
                <CardDescription>
                  A monthly operating list of the next actions that improve the website.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {WEBSITE_GROWTH_AUTOPILOT.monthlyActions.map((action, index) => (
                  <div key={action} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Action {index + 1}</p>
                      <p className="mt-1 text-sm font-black text-slate-900">{action}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => isFeatureEnabled("website_growth_autopilot" as any) ? handleApplySuggestion(action) : navigate("/dashboard/billing")}
                      className="rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      {isFeatureEnabled("website_growth_autopilot" as any) ? "Queue" : "Scale"}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  Missed Enquiry Path Checks
                </CardTitle>
                <CardDescription>
                  Shows where interest is leaking before it becomes a lead.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {enquiryLossSignals.map((signal) => (
                  <div key={signal} className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-sm font-bold leading-6 text-amber-950">{signal}</p>
                  </div>
                ))}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 md:col-span-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Recommended fix</p>
                  <p className="mt-2 text-sm font-black text-slate-900">{ENQUIRY_LOSS_DETECTOR.defaultRecommendation}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp} className="grid grid-cols-1 xl:grid-cols-[1fr_0.85fr] gap-6">
            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                  <Target className="h-5 w-5 text-indigo-600" />
                  Competitor Gap Scanner
                </CardTitle>
                <CardDescription>
                  Enter up to 3 competitor URLs and turn their likely advantages into improvement tasks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 md:grid-cols-3">
                  {competitorUrls.map((url, index) => (
                    <input
                      key={index}
                      value={url}
                      onChange={(event) => setCompetitorUrls((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                      placeholder={`Competitor ${index + 1} URL`}
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
                    />
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {COMPETITOR_GAP_SCANNER.map((signal) => (
                    <div key={signal.area} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-black text-slate-950">{signal.area}</p>
                        <Badge variant="outline" className="text-[9px] font-black uppercase">{signal.priority}</Badge>
                      </div>
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{signal.gap}</p>
                      <p className="mt-2 text-xs font-black leading-5 text-indigo-700">{signal.suggestedAction}</p>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => isFeatureEnabled("competitor_gap_scanner" as any) ? saveCompetitorGapScan() : navigate("/dashboard/billing")}
                  disabled={savingGrowthAction === "competitor_gap_scan"}
                  className="w-full rounded-xl bg-indigo-600 font-black uppercase tracking-widest"
                >
                  {isFeatureEnabled("competitor_gap_scanner" as any) ? savingGrowthAction === "competitor_gap_scan" ? "Saving..." : "Run Gap Scan" : "Unlock in Scale"}
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                  <Star className="h-5 w-5 text-amber-500" />
                  Service Offer Clarity
                </CardTitle>
                <CardDescription>
                  Shows which offer details are clear and which still need input.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  {OFFER_STRENGTH_CRITERIA.map((criterion, index) => {
                    const filled = [
                      offerDraft.mainService,
                      offerDraft.targetCustomer,
                      offerDraft.priceRange,
                      offerDraft.reassurance,
                      offerDraft.preferredCta,
                      offerDraft.consultationType,
                    ][index];
                    return (
                      <div key={criterion} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                        <Check className={cn("h-4 w-4", filled ? "text-emerald-600" : "text-slate-300")} />
                        <span className="text-xs font-black uppercase tracking-widest text-slate-600">{criterion}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <MessageSquare className="h-5 w-5 text-emerald-600" />
                  WhatsApp Follow-Up CRM
                </CardTitle>
                <CardDescription>Follow-up scripts and lead stages for chat-first businesses.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {WHATSAPP_FOLLOW_UP_CRM.statuses.map((status) => (
                    <Badge key={status} className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">{status}</Badge>
                  ))}
                </div>
                {WHATSAPP_FOLLOW_UP_CRM.templates.map((template) => (
                  <button
                    key={template}
                    onClick={() => navigator.clipboard?.writeText(template).then(() => toast.success("Follow-up message copied."))}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left text-xs font-bold leading-5 text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    {template}
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <MapPin className="h-5 w-5 text-indigo-600" />
                  Local SEO Opportunity Map
                </CardTitle>
                <CardDescription>Prioritized city, service, FAQ, proof, and internal-link opportunities.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {LOCAL_SEO_OPPORTUNITY_MAP.opportunities.map((opportunity) => (
                  <div key={opportunity} className="flex gap-3 rounded-xl border border-slate-100 p-3">
                    <MapPin className="h-4 w-4 shrink-0 text-indigo-600" />
                    <p className="text-xs font-bold leading-5 text-slate-600">{opportunity}</p>
                  </div>
                ))}
                <div className="rounded-2xl bg-indigo-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Suggested cities</p>
                  <p className="mt-2 text-sm font-black text-slate-900">{LOCAL_SEO_OPPORTUNITY_MAP.suggestedCities.join(", ")}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <Shield className="h-5 w-5 text-indigo-600" />
                  Trust Proof Builder
                </CardTitle>
                <CardDescription>Collect credibility assets and turn them into website sections.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {TRUST_PROOF_BUILDER.proofTypes.map((proof) => {
                    const selected = trustInputs.includes(proof);
                    return (
                      <button
                        key={proof}
                        onClick={() => setTrustInputs((current) => selected ? current.filter((item) => item !== proof) : [...current, proof])}
                        className={cn(
                          "rounded-xl border p-3 text-left text-[10px] font-black uppercase tracking-widest transition",
                          selected ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-100 bg-slate-50 text-slate-500",
                        )}
                      >
                        {proof}
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-2xl bg-slate-950 p-4 text-white">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Trust assets selected</p>
                  <p className="mt-2 text-3xl font-black">{activeTrustProof}</p>
                </div>
                <Button
                  onClick={saveTrustProofSelection}
                  disabled={savingGrowthAction === "trust_proof_selection"}
                  className="w-full rounded-xl bg-indigo-600 font-black uppercase tracking-widest"
                >
                  {savingGrowthAction === "trust_proof_selection" ? "Saving..." : "Save Trust Proof Plan"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp} className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                  <Calendar className="h-5 w-5 text-indigo-600" />
                  Landing Page Campaign Calendar
                </CardTitle>
                <CardDescription>Monthly campaign ideas that can become one-click landing pages.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {CAMPAIGN_CALENDAR.map((idea) => (
                  <div key={idea.month} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">{idea.month}</p>
                    <p className="mt-1 font-black text-slate-950">{idea.campaign}</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{idea.pageIdea}</p>
                    <Button size="sm" variant="outline" onClick={() => handleApplySuggestion(idea.campaign)} className="mt-3 rounded-xl text-[10px] font-black uppercase tracking-widest">
                      {idea.cta}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                  <BrainCircuit className="h-5 w-5 text-indigo-600" />
                  AI Sales Page Doctor
                </CardTitle>
                <CardDescription>Diagnosis checklist for conversion, trust, and clarity issues.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {SALES_PAGE_DOCTOR.checks.map((check, index) => (
                  <div key={check} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <Badge className={cn("mt-0.5 text-[9px] font-black", index < 2 ? "bg-red-50 text-red-700" : "bg-indigo-50 text-indigo-700")}>
                      {index < 2 ? "Fix" : "Check"}
                    </Badge>
                    <p className="text-xs font-bold leading-5 text-slate-700">{check}</p>
                  </div>
                ))}
                <Button onClick={() => isFeatureEnabled("sales_page_doctor" as any) ? handleApplySuggestion("AI Sales Page Doctor") : navigate("/dashboard/billing")} className="w-full rounded-xl bg-indigo-600 font-black uppercase tracking-widest">
                  {isFeatureEnabled("sales_page_doctor" as any) ? "Run Diagnosis" : "Unlock in Scale"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  Done-For-You Request Portal
                </CardTitle>
                <CardDescription>
                  Keep the product managed: users request changes instead of fighting with a blank builder.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr_auto]">
                <select
                  value={requestDraft.type}
                  onChange={(event) => setRequestDraft((current) => ({ ...current, type: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
                >
                  {DONE_FOR_YOU_REQUEST_PORTAL.requestTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <input
                  value={requestDraft.details}
                  onChange={(event) => setRequestDraft((current) => ({ ...current, details: event.target.value }))}
                  placeholder="Describe what should be changed or added..."
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
                />
                <Button
                  onClick={submitDoneForYouRequest}
                  disabled={savingGrowthAction === "done_for_you_request"}
                  className="rounded-xl bg-indigo-600 font-black uppercase tracking-widest"
                >
                  {savingGrowthAction === "done_for_you_request" ? "Submitting..." : "Submit Request"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp} className="grid grid-cols-1 xl:grid-cols-[1fr_0.9fr] gap-6">
            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                  <Star className="h-5 w-5 text-amber-500" />
                  Review-to-Website Import
                </CardTitle>
                <CardDescription>
                  Optional manual review paste that turns real customer language into safer copy ideas.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                <textarea
                  value={reviewImportText}
                  onChange={(event) => setReviewImportText(event.target.value)}
                  placeholder="Paste real reviews here. Keep each review on a new line."
                  className="min-h-[220px] rounded-2xl border border-slate-200 p-4 text-sm font-semibold leading-6 outline-none focus:border-indigo-400"
                />
                <div className="space-y-3">
                  <div className="rounded-2xl bg-amber-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Detected signals</p>
                    <p className="mt-2 text-3xl font-black text-slate-950">{reviewSignals.length}</p>
                  </div>
                  {(reviewSignals.length ? reviewSignals : REVIEW_TO_WEBSITE_IMPORT.outputs.slice(0, 4)).map((item) => (
                    <div key={item} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-bold leading-5 text-slate-700">
                      {item}
                    </div>
                  ))}
                  <Button onClick={() => isFeatureEnabled("review_to_website_import" as any) ? saveReviewImport() : navigate("/dashboard/billing")} disabled={savingGrowthAction === "manual_review_import"} className="w-full rounded-xl bg-indigo-600 font-black uppercase tracking-widest">
                    {isFeatureEnabled("review_to_website_import" as any) ? savingGrowthAction === "manual_review_import" ? "Saving..." : "Save Copy Ideas" : "Unlock"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                  <MapPin className="h-5 w-5 text-indigo-600" />
                  Local Search Checklist
                </CardTitle>
                <CardDescription>
                  Clear setup items that are either present or still need attention.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  {LOCAL_SEARCH_CHECKLIST.map((item, index) => {
                    const complete = localSearchChecks[index];
                    return (
                      <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                        <Check className={cn("h-4 w-4", complete ? "text-emerald-600" : "text-slate-300")} />
                        <span className="text-xs font-black uppercase tracking-widest text-slate-600">{item}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <Download className="h-5 w-5 text-indigo-600" />
                  Monthly Website Report
                </CardTitle>
                <CardDescription>Export a simple report customers can understand every month.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {MONTHLY_WEBSITE_REPORT.sections.map((section) => (
                  <div key={section} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs font-black uppercase tracking-widest text-slate-600">
                    {section}
                  </div>
                ))}
                <Button onClick={downloadMonthlyReport} className="w-full rounded-xl bg-indigo-600 font-black uppercase tracking-widest">
                  Download Report
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <Shield className="h-5 w-5 text-indigo-600" />
                  Trust Proof Vault
                </CardTitle>
                <CardDescription>Store proof assets and decide where they should appear on the website.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {TRUST_PROOF_VAULT.assetTypes.map((asset) => (
                    <div key={asset} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[10px] font-black uppercase tracking-widest text-slate-600">
                      {asset}
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-indigo-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Best placements</p>
                  <p className="mt-2 text-sm font-black text-slate-900">{TRUST_PROOF_VAULT.placements.join(", ")}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black text-slate-950">
                  <MessageSquare className="h-5 w-5 text-emerald-600" />
                  Enquiry Qualification Prompts
                </CardTitle>
                <CardDescription>Qualify enquiries before they reach the business owner.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  ["service", "Service needed"],
                  ["location", "Location"],
                  ["urgency", "Urgency"],
                  ["budget", "Budget range"],
                  ["contact", "Best contact"],
                ].map(([field, label]) => (
                  <input
                    key={field}
                    value={(receptionistDraft as any)[field]}
                    onChange={(event) => setReceptionistDraft((current) => ({ ...current, [field]: event.target.value }))}
                    placeholder={label}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-indigo-400"
                  />
                ))}
                <div className="rounded-2xl bg-emerald-50 p-4 text-xs font-bold leading-5 text-emerald-900">
                  {receptionistSummary}
                </div>
                <Button
                  onClick={saveReceptionistTriage}
                  disabled={savingGrowthAction === "ai_receptionist_triage"}
                  className="w-full rounded-xl bg-emerald-600 font-black uppercase tracking-widest"
                >
                  {savingGrowthAction === "ai_receptionist_triage" ? "Saving..." : "Save Triage"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fadeInUp}>
            <Card className="rounded-[2rem] border-slate-100 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-950">
                  <Wrench className="h-5 w-5 text-indigo-600" />
                  Before / After Website Rescue
                </CardTitle>
                <CardDescription>
                  Converts an outdated website audit into a clearer rebuilt website structure.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-red-100 bg-red-50 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-700">Before issues</p>
                  <div className="mt-4 space-y-2">
                    {BEFORE_AFTER_RESCUE_TOOL.beforeIssues.map((issue) => (
                      <div key={issue} className="rounded-xl bg-white/80 p-3 text-xs font-bold text-red-950">{issue}</div>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">After structure</p>
                  <div className="mt-4 space-y-2">
                    {BEFORE_AFTER_RESCUE_TOOL.afterStructure.map((item) => (
                      <div key={item} className="rounded-xl bg-white/80 p-3 text-xs font-bold text-emerald-950">{item}</div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Core Infrastructure Status */}
          {business && (
            <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Globe className="h-3 w-3" /> Core Infrastructure
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                       <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Platform Engine</span>
                       <Badge className="bg-indigo-600 font-black italic uppercase text-[8px] animate-pulse">
                          {business.platform_type === 'wordpress' ? 'EXTERNAL / WORDPRESS' : 'INTERNAL / WAAS'}
                       </Badge>
                    </div>
                  </CardContent>
               </Card>

               <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Zap className="h-3 w-3" /> Integration Layer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                       <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">API Connectivity</span>
                       <div className="flex items-center gap-2">
                          <div className={cn("h-2 w-2 rounded-full", (stats as any).apiKeys > 0 ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
                          <span className="text-[10px] font-black text-slate-500">{(stats as any).apiKeys > 0 ? 'ACTIVE' : 'INACTIVE'}</span>
                       </div>
                    </div>
                  </CardContent>
               </Card>

               {isDevelopmentMode && (
               <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Lock className="h-3 w-3" /> White-Label Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                       <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Custom Domain</span>
                       <Badge
                         variant="outline"
                         className={cn(
                           "text-[8px] font-black uppercase",
                           (business as any).custom_domain || (business as any).customDomain
                             ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                             : "text-slate-400 border-slate-200",
                         )}
                       >
                         {(business as any).custom_domain || (business as any).customDomain
                           ? ((business as any).custom_domain_status || (business as any).customDomainStatus || "configured").replace(/_/g, " ")
                           : "not connected"}
                       </Badge>
                    </div>
                  </CardContent>
               </Card>
               )}
            </motion.div>
          )}

          {stats.websites === 0 && (
            <motion.div
              variants={fadeInUp}
              className="bg-slate-950 rounded-[3rem] p-10 sm:p-16 text-white relative overflow-hidden group shadow-2xl shadow-indigo-900/20"
            >
              <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-primary/20 to-transparent pointer-events-none" />
              <div className="relative z-10 grid lg:grid-cols-2 gap-20 items-center">
                <div className="space-y-8">
                  <div className="inline-flex items-center gap-3 px-4 py-2 bg-primary/20 rounded-full border border-primary/30">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-primary">
                      Mission Critical
                    </span>
                  </div>
                  <h2 className="text-5xl sm:text-7xl font-black leading-[0.9] tracking-tighter uppercase">
                    Initialize Your <br />
                    <span className="text-gradient">Growth OS.</span>
                  </h2>
                  <p className="text-indigo-100/60 text-xl leading-relaxed max-w-lg font-medium">
                    Your business infrastructure is currently offline.
                    Activating your digital presence will immediately unlock
                    global visibility and lead acquisition protocols.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex items-center gap-5 p-5 rounded-[2rem] bg-white/5 border border-white/10">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                        <Check className="h-5 w-5 text-emerald-500" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-slate-300">
                        Infrastructure Ready
                      </span>
                    </div>
                    <div className="flex items-center gap-5 p-5 rounded-[2rem] bg-white/5 border border-white/20">
                      <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                        <div className="h-3 w-3 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(79,70,229,1)]" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-primary">
                        Pending Deployment
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => navigate("/dashboard/website/regenerate")}
                    className="h-20 px-12 rounded-[1.5rem] bg-white text-slate-950 hover:bg-primary hover:text-white font-black text-xl uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(255,255,255,0.1)] transition-all active:scale-95 flex gap-4"
                  >
                    Deploy Website <ArrowRight className="h-6 w-6" />
                  </Button>
                </div>
                <div className="relative hidden lg:block">
                  <div className="absolute -inset-20 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
                  <div className="relative border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl bg-slate-900 p-3 transform hover:rotate-2 transition-transform duration-700">
                    <img
                      src="/brand-template-preview.svg"
                      alt="Setup"
                      className="w-full h-auto rounded-[2rem] opacity-40 grayscale hover:grayscale-0 transition-all duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                    <div className="absolute bottom-10 left-10 right-10">
                      <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "35%" }}
                          className="h-full bg-primary"
                        />
                      </div>
                      <p className="mt-4 text-[10px] uppercase font-black tracking-[0.4em] text-slate-400">
                        Architectural Progress: 35%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {business?.trial_ends_at && stats.websites > 0 && (
            <motion.div variants={fadeInUp}>
              {(() => {
                const trialDaysLeft = Math.ceil(
                  (new Date(business.trial_ends_at).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24),
                );
                const hasStripeSubscription = !!business.stripe_subscription_id;

                if (hasStripeSubscription && trialDaysLeft > 0) {
                  return (
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-3xl p-6 flex flex-col sm:flex-row items-center sm:items-center gap-6 text-center sm:text-left">
                      <div className="h-14 w-14 rounded-2xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-200 dark:shadow-none">
                        <Check className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-emerald-900 dark:text-emerald-100 text-lg">
                          Subscription Confirmed
                        </h3>
                        <p className="text-emerald-700 dark:text-emerald-300">
                          You've successfully committed to the{" "}
                          <span className="font-bold">{business.plan}</span>{" "}
                          plan. Your billing cycle will begin on{" "}
                          <span className="font-bold">
                            {new Date(
                              business.trial_ends_at,
                            ).toLocaleDateString()}
                          </span>
                          .
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto bg-white dark:bg-emerald-900 text-emerald-600 dark:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-800 border border-emerald-200 dark:border-emerald-800 px-6 py-6 rounded-2xl font-bold"
                        onClick={() => navigate("/dashboard/billing")}
                      >
                        View Billing
                      </Button>
                    </div>
                  );
                }

                if (trialDaysLeft > 0) {
                  return (
                    <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-3xl p-6 flex flex-col sm:flex-row items-center sm:items-center gap-6 text-center sm:text-left">
                      <div className="h-14 w-14 rounded-2xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-200 dark:shadow-none">
                        <Calendar className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-indigo-900 dark:text-indigo-100 text-lg">
                          Free Trial Active
                        </h3>
                        <p className="text-indigo-700 dark:text-indigo-300">
                          Your 14-day free trial ends in{" "}
                          <span className="font-bold">
                            {trialDaysLeft} days
                          </span>
                          . Upgrade now to keep your site live after the trial.
                        </p>
                      </div>
                      <Button
                        className="w-full sm:w-auto bg-white dark:bg-indigo-900 text-indigo-600 dark:text-indigo-100 hover:bg-indigo-100 dark:hover:bg-indigo-800 border border-indigo-200 dark:border-indigo-800 px-6 py-6 rounded-2xl font-bold"
                        onClick={() => navigate("/dashboard/billing")}
                      >
                        Upgrade Plan
                      </Button>
                    </div>
                  );
                } else if (!business.subscription_status) {
                  return (
                    <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-3xl p-6 flex flex-col sm:flex-row items-center sm:items-center gap-6 text-center sm:text-left">
                      <div className="h-14 w-14 rounded-2xl bg-red-600 flex items-center justify-center shrink-0 shadow-lg shadow-red-200 dark:shadow-none">
                        <AlertCircle className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-red-900 dark:text-red-100 text-lg">
                          Trial Expired
                        </h3>
                        <p className="text-red-700 dark:text-red-300">
                          Your free trial has ended. Please upgrade your plan to
                          continue using Bennie Studio.
                        </p>
                      </div>
                      <Button
                        className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-6 py-6 rounded-2xl font-bold shadow-lg shadow-red-200 dark:shadow-none"
                        onClick={() => navigate("/dashboard/billing")}
                      >
                        Upgrade Now
                      </Button>
                    </div>
                  );
                }
                return null;
              })()}
            </motion.div>
          )}

          {isDevelopmentMode && (
          <motion.div variants={fadeInUp}>
            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm">
              <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <Badge className="mb-3 bg-indigo-50 text-indigo-700 border-indigo-100">
                    {launchStatus}
                  </Badge>
                  <CardTitle className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                    Website Launch Checklist
                  </CardTitle>
                  <CardDescription>
                    {completedLaunchChecks}/{launchChecks.length} launch items complete. Keep this list green before sending traffic to your site.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="rounded-2xl font-bold" onClick={() => navigate("/dashboard/website")}>
                    Edit Website
                  </Button>
                  <Button className="rounded-2xl bg-indigo-600 font-bold" onClick={handleViewLive}>
                    Preview Site
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {launchChecks.map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border p-4",
                        item.done ? "border-emerald-100 bg-emerald-50" : "border-slate-100 bg-slate-50",
                      )}
                    >
                      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", item.done ? "bg-emerald-600 text-white" : "bg-white text-slate-300")}>
                        <Check className="h-4 w-4" />
                      </div>
                      <span className={cn("text-xs font-black uppercase tracking-widest", item.done ? "text-emerald-800" : "text-slate-500")}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
          )}

          <motion.div
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {statCards
              .filter(
                (stat) =>
                  !stat.featureId || isFeatureEnabled(stat.featureId as any),
              )
              .slice(0, isMobile ? 4 : undefined)
              .map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  variants={fadeInUp}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className={cn(
                    "bg-white dark:bg-slate-900 px-8 py-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 group relative overflow-hidden",
                    idx > 3 && "hidden sm:block",
                  )}
                >
                  <div className="flex justify-between items-start mb-10">
                    <div
                      className={cn(
                        "p-4 rounded-2xl transition-all group-hover:rotate-12",
                        stat.bg,
                        "dark:bg-slate-800 shadow-lg shadow-black/5",
                        stat.color,
                      )}
                    >
                      <stat.icon className="h-7 w-7" />
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] truncate mb-2">
                      {stat.label}
                    </p>
                    <h3 className="text-4xl font-black text-slate-950 dark:text-white tracking-tighter">
                      {stat.value}
                    </h3>
                  </div>
                  <div className="absolute -bottom-6 -right-6 h-32 w-32 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity group-hover:scale-125 duration-700">
                    <stat.icon className="h-full w-full" />
                  </div>
                </motion.div>
              ))}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <motion.div
              variants={fadeInUp}
              className="lg:col-span-3 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300 relative overflow-hidden"
            >
              {!isFeatureEnabled("analytics") && (
                <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[4px] z-10 flex flex-col items-center justify-center p-8 text-center">
                  <div className="h-16 w-16 rounded-3xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
                    <Lock className="h-8 w-8 text-indigo-600" />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    Advanced Analytics Locked
                  </h4>
                  <p className="text-sm text-slate-500 max-w-xs mb-6">
                    Upgrade to Business or Growth OS to unlock detailed visitor insights
                    and conversion tracking.
                  </p>
                  <Button
                    onClick={() => navigate("/dashboard/billing")}
                    className="rounded-xl bg-indigo-600 px-8"
                  >
                    Upgrade Now
                  </Button>
                </div>
              )}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Growth Analytics
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Your website performance over the last week.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-indigo-600" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Visits
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Leads
                    </span>
                  </div>
                </div>
              </div>
              <div className="h-[350px] w-full">
                {analyticsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <AreaChart data={analyticsData}>
                      <defs>
                        <linearGradient
                          id="colorVisits"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#4f46e5"
                            stopOpacity={0.15}
                          />
                          <stop
                            offset="95%"
                            stopColor="#4f46e5"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#f1f5f9"
                        className="stroke-slate-200 dark:stroke-slate-800"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#94a3b8",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                        dy={15}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#94a3b8",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      />
                      <Tooltip
                        cursor={{ stroke: "#e2e8f0", strokeWidth: 2 }}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          backdropFilter: "blur(8px)",
                          borderRadius: "16px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                          padding: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="visits"
                        stroke="#4f46e5"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#colorVisits)"
                        animationDuration={2000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center grayscale opacity-50 px-4 group/analytics">
                    <BarChart3 className="h-12 w-12 text-slate-300 mb-4 group-hover/analytics:text-indigo-600 transition-colors" />
                    <p className="text-slate-500 font-medium max-w-[250px] mx-auto leading-relaxed">
                      No analytics data available yet.
                    </p>
                    <p className="text-xs text-slate-400 mt-1 mb-6 max-w-[200px] mx-auto">
                      Statistics will appear here once your site starts
                      receiving traffic.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate("/dashboard/website")}
                      className="rounded-xl border-slate-200 hover:border-indigo-600 hover:text-indigo-600"
                    >
                      {stats.websites === 0 ? "Edit Your Website" : "Promote Your Site"}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Recent Leads
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Your latest business opportunities.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-indigo-600 hover:text-indigo-700 font-bold rounded-xl"
                  onClick={() => navigate("/dashboard/leads")}
                >
                  View All
                </Button>
              </div>
              <div className="space-y-5 flex-1">
                {recentLeads.length > 0 ? (
                  recentLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center gap-4 group cursor-pointer p-2 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300"
                    >
                      <div className="h-12 w-12 shrink-0 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-all duration-300 shadow-inner">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
                          {lead.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {lead.email}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge
                          variant={
                            lead.status === "new" ? "warning" : "default"
                          }
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest",
                            lead.status === "new"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
                          )}
                        >
                          {lead.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="h-16 w-16 rounded-3xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-slate-300 dark:text-slate-700 mb-4">
                      <Users className="h-8 w-8" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mb-1">
                      No leads yet.
                    </p>
                    <p className="text-[10px] text-slate-400 mb-6 font-bold uppercase tracking-widest">
                      Your revenue engine is idling.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate("/dashboard/website")}
                      className="rounded-xl"
                    >
                      Check Lead Form
                    </Button>
                  </div>
                )}
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Upcoming Appointments
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-indigo-600 h-7 text-[10px] font-bold"
                    onClick={() => navigate("/dashboard/appointments")}
                  >
                    View All
                  </Button>
                </div>
                <div className="space-y-3">
                  {recentAppointments.length > 0 ? (
                    recentAppointments.map((app) => (
                      <div
                        key={app.id}
                        className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                      >
                        <div className="h-8 w-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-indigo-600 shadow-sm">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate">
                            {app.customer_name}
                          </p>
                          <p className="text-[8px] text-slate-500">
                            {app.date} at {app.time.substring(0, 5)}
                          </p>
                        </div>
                        <Badge className="text-[8px] px-1.5 h-4">
                          {app.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-2">
                       <p className="text-[10px] text-slate-500 text-center">
                        No appointments scheduled.
                      </p>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 text-[10px] font-bold text-indigo-600 rounded-lg hover:bg-indigo-50"
                        onClick={() => navigate("/dashboard/appointments")}
                      >
                        Set Availability
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 hidden sm:block">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                      Quick Tip
                    </span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-indigo-700 dark:text-indigo-400 font-medium">
                    Keep your services, reviews, contact details, and core calls to action clear before adding new marketing channels.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            variants={fadeInUp}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Marketing Hub
                    </h3>
                    <p className="text-sm text-slate-500">
                      Accelerate your business growth with these tools.
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      title: "Blog Automation",
                      desc: "Schedule weekly SEO articles.",
                      icon: FileText,
                      color: "text-emerald-600",
                      bg: "bg-emerald-50",
                      link: "/dashboard/blog",
                    },
                    {
                      title: "Email Seeding",
                      desc: "Connect with your lead list.",
                      icon: MessageSquare,
                      color: "text-blue-600",
                      bg: "bg-blue-50",
                      link: "/dashboard/leads",
                    },
                    {
                      title: "Review Booster",
                      desc: "Automate customer feedback.",
                      icon: Star,
                      color: "text-amber-600",
                      bg: "bg-amber-50",
                      link: "/dashboard/reviews",
                    },
                  ].map((tool) => (
                    <div
                      key={tool.title}
                      onClick={() => navigate(tool.link)}
                      className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-600 transition-all cursor-pointer group flex items-center gap-4"
                    >
                      <div
                        className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center transition-all group-hover:scale-110",
                          tool.bg,
                          "dark:bg-slate-800",
                          tool.color,
                        )}
                      >
                        <tool.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {tool.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">
                          {tool.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <AIDataAnalyst
                stats={stats}
                businessName={business?.name || "Your Business"}
                industry={business?.industry || "Unknown Industry"}
                businessId={profile?.businessId}
              />
            </div>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              {
                title: "Edit Website",
                desc: "Customize your layout and content.",
                icon: Layout,
                color: "text-indigo-600",
                link: "/dashboard/website",
              },
              {
                title: "Manage Leads",
                desc: "View and export your customer data.",
                icon: Users,
                color: "text-blue-600",
                link: "/dashboard/leads",
              },
              {
                title: "Write Blog",
                desc: "Share updates and boost your SEO.",
                icon: FileText,
                color: "text-emerald-600",
                link: "/dashboard/blog",
              },
            ].map((action) => (
              <button
                key={action.title}
                onClick={() => navigate(action.link)}
                className="flex items-center gap-4 p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-indigo-600 dark:hover:border-indigo-500 transition-all duration-300 text-left group"
              >
                <div
                  className={`h-12 w-12 rounded-2xl bg-slate-50 dark:bg-slate-800 ${action.color} flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all`}
                >
                  <action.icon className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {action.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {action.desc}
                  </p>
                </div>
              </button>
            ))}
          </motion.div>

          <motion.div variants={fadeInUp}>
            <LegalDisclaimer />
          </motion.div>
        </motion.div>
      </TabsContent>

      <TabsContent value="ai_insights" className="mt-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">
              AI Neural Performance
            </h2>
            <p className="text-slate-500 font-medium">
              Real-time telemetry from your business's AI orchestrator.
            </p>
          </div>

          <AIPerformanceAnalytics businessId={profile?.businessId || ""} />
        </motion.div>
      </TabsContent>
    </Tabs>
  );
}
