/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  MessageSquare,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { cn } from "../../lib/utils";

type AuditStatus = "pass" | "warn" | "fail";

type AuditCheck = {
  id: string;
  label: string;
  detail: string;
  status: AuditStatus;
  fixPath?: string;
};

const statusStyles: Record<AuditStatus, string> = {
  pass: "bg-emerald-50 text-emerald-700 border-emerald-100",
  warn: "bg-amber-50 text-amber-700 border-amber-100",
  fail: "bg-rose-50 text-rose-700 border-rose-100",
};

const statusIcon = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
};

const getWebsiteUrl = (business: any) => {
  if (business?.custom_domain) return `https://${business.custom_domain}`;
  if (business?.domain) return `https://${business.domain}`;
  if (business?.subdomain) return `https://${business.subdomain}`;
  return "";
};

const hasContactMethod = (business: any) =>
  Boolean(
    business?.email ||
      business?.contact_email ||
      business?.phone ||
      business?.phone_number ||
      business?.whatsapp ||
      business?.whatsapp_number,
  );

const hasActiveBilling = (business: any) =>
  ["active", "trialing"].includes(String(business?.subscription_status || "").toLowerCase()) ||
  ["active", "trialing"].includes(String(business?.status || "").toLowerCase());

const hasPaymentRisk = (business: any) =>
  ["past_due", "unpaid", "canceled", "cancelled"].includes(String(business?.subscription_status || "").toLowerCase()) ||
  ["suspended", "inactive"].includes(String(business?.status || "").toLowerCase());

const isPublished = (website: any) =>
  ["published", "live", "ready", "ready_review"].includes(String(website?.status || "").toLowerCase()) ||
  website?.published_at;

const createBusinessChecks = (business: any, websites: any[], policiesReady: boolean): AuditCheck[] => {
  const website = websites.find((item) => item.business_id === business.id);
  const websiteUrl = getWebsiteUrl(business);
  const pageCount =
    Number(website?.pages_count || website?.page_count || business?.page_count || business?.pages_count || 0) ||
    (Array.isArray(website?.content?.pages) ? website.content.pages.length : 0);
  const leadCount = Number(business?.lead_count || business?.leads_count || 0);

  return [
    {
      id: "website-record",
      label: "Website record exists",
      detail: website ? "A website draft or live site is linked to this business." : "No website record was found for this tenant.",
      status: website ? "pass" : "fail",
      fixPath: "/admin/templates",
    },
    {
      id: "preview-ready",
      label: "Preview can be reviewed",
      detail: website ? "Preview route should be available from the website/editor flow." : "Preview cannot be confirmed without a website record.",
      status: website ? "pass" : "fail",
      fixPath: "/admin/businesses",
    },
    {
      id: "contact-method",
      label: "Contact method configured",
      detail: hasContactMethod(business) ? "At least one contact method is available for CTAs/forms." : "Missing email, phone, or WhatsApp contact method.",
      status: hasContactMethod(business) ? "pass" : "fail",
      fixPath: "/admin/businesses",
    },
    {
      id: "billing-protected",
      label: "Billing status protects publishing",
      detail: hasPaymentRisk(business)
        ? "This account has payment or suspension risk and should not launch until resolved."
        : hasActiveBilling(business)
          ? "Subscription/trial state is active enough for review or launch."
          : "Billing state is unclear. Confirm plan and payment before launch.",
      status: hasPaymentRisk(business) ? "fail" : hasActiveBilling(business) ? "pass" : "warn",
      fixPath: "/admin/plans",
    },
    {
      id: "domain-status",
      label: "Domain or preview URL ready",
      detail: websiteUrl ? websiteUrl : "No custom domain/subdomain was found. Preview may still work, but launch needs a domain decision.",
      status: websiteUrl ? "pass" : "warn",
      fixPath: "/admin/businesses",
    },
    {
      id: "legal-ready",
      label: "Legal/compliance pages available",
      detail: policiesReady ? "Platform compliance policies are generated and available." : "Generate/review privacy, cookie, terms, and subprocessors before serious traffic.",
      status: policiesReady ? "pass" : "warn",
      fixPath: "/admin/compliance_market",
    },
    {
      id: "page-scope",
      label: "Page scope visible",
      detail: pageCount > 0 ? `${pageCount} page(s) detected for this website.` : "Page count is not available. Confirm generated pages before launch.",
      status: pageCount > 0 ? "pass" : "warn",
      fixPath: "/admin/businesses",
    },
    {
      id: "lead-path",
      label: "Lead path should be tested",
      detail: leadCount > 0 ? `${leadCount} lead(s) recorded.` : "No leads recorded yet. Submit a test enquiry before launch.",
      status: leadCount > 0 ? "pass" : "warn",
      fixPath: "/admin/businesses",
    },
    {
      id: "publish-state",
      label: "Publish state controlled",
      detail: isPublished(website) ? "Website appears published/live." : "Website is still draft or not marked live.",
      status: isPublished(website) ? "pass" : "warn",
      fixPath: "/admin/businesses",
    },
  ];
};

const readinessScore = (checks: AuditCheck[]) => {
  if (!checks.length) return 0;
  const points = checks.reduce((total, check) => {
    if (check.status === "pass") return total + 1;
    if (check.status === "warn") return total + 0.45;
    return total;
  }, 0);
  return Math.round((points / checks.length) * 100);
};

const productionQaChecks = [
  "Create a fresh customer account and complete quick onboarding.",
  "Generate a website and confirm draft preview loads immediately.",
  "Click every hero, pricing, WhatsApp, phone, email, booking, and contact CTA.",
  "Submit a test contact form and confirm the lead appears in the dashboard.",
  "Check desktop, tablet, and mobile preview for no text overflow.",
  "Confirm cookie banner can accept, reject non-essential, and manage preferences.",
  "Confirm privacy, cookie, terms, subprocessors, and acceptable use pages are reachable.",
  "Confirm custom website quote request works separately from subscription checkout.",
];

const salesConversionChecks = [
  "Main hero explains the offer in one sentence.",
  "Primary CTA remains Generate Free Website Preview or equivalent.",
  "Pricing makes subscription vs Custom Website clear.",
  "Portfolio/examples are visible before detailed feature sections.",
  "FAQ answers cancellation, ownership/export, monthly updates, SEO, and custom website upgrade.",
  "No fake stats, fake reviews, unsupported guarantees, or vague technical claims.",
];

const subscriptionProtectionChecks = [
  "Minimum term is shown before checkout or contract confirmation.",
  "Publishing/domain connection is tied to active subscription status.",
  "Failed payment or cancellation can suspend launch/published access.",
  "Export, source transfer, and migration are positioned as separate paid services.",
  "Custom website scope is separated from monthly subscription plans.",
];

const deploymentReadinessChecks = [
  "Supabase migrations applied in production.",
  "Stripe live keys and webhooks configured.",
  "Email notification provider configured.",
  "Sitemap submitted to Google Search Console.",
  "Custom domain flow tested with DNS instructions.",
  "Legal pages reviewed with real business details and subprocessors.",
  "Backup/export process documented for paid termination service.",
];

export function LaunchAudit() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(true);
  const [businesses, setBusinesses] = React.useState<any[]>([]);
  const [websites, setWebsites] = React.useState<any[]>([]);
  const [complianceSettings, setComplianceSettings] = React.useState<any>(null);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const [businessesRes, websitesRes, settingsRes] = await Promise.allSettled([
        supabase.from("businesses").select("*").order("created_at", { ascending: false }),
        supabase.from("websites").select("*").order("updated_at", { ascending: false }),
        supabase.from("settings").select("content").eq("id", "compliance_market").maybeSingle(),
      ]);

      if (businessesRes.status === "fulfilled" && !businessesRes.value.error) {
        setBusinesses(businessesRes.value.data || []);
      } else {
        console.warn("Launch audit businesses load failed", businessesRes);
      }

      if (websitesRes.status === "fulfilled" && !websitesRes.value.error) {
        setWebsites(websitesRes.value.data || []);
      } else {
        console.warn("Launch audit websites load failed", websitesRes);
      }

      if (settingsRes.status === "fulfilled" && !settingsRes.value.error) {
        setComplianceSettings(settingsRes.value.data?.content || null);
      }
    } catch (error) {
      console.error("Launch audit load failed:", error);
      toast.error("Failed to load launch audit data");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAuditData();
  }, []);

  const policiesReady = Boolean(
    complianceSettings?.generatedPages?.privacy &&
      complianceSettings?.generatedPages?.cookies &&
      complianceSettings?.generatedPages?.terms,
  );

  const auditedBusinesses = businesses.map((business) => {
    const checks = createBusinessChecks(business, websites, policiesReady);
    return {
      business,
      checks,
      score: readinessScore(checks),
      blockers: checks.filter((check) => check.status === "fail"),
      warnings: checks.filter((check) => check.status === "warn"),
    };
  });

  const launchReady = auditedBusinesses.filter((item) => item.score >= 85 && item.blockers.length === 0).length;
  const blocked = auditedBusinesses.filter((item) => item.blockers.length > 0).length;
  const averageScore = auditedBusinesses.length
    ? Math.round(auditedBusinesses.reduce((total, item) => total + item.score, 0) / auditedBusinesses.length)
    : 0;

  if (loading) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Auditing launch readiness...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Badge className="mb-3 bg-indigo-50 text-indigo-700">Operational readiness</Badge>
          <h1 className="text-4xl font-black tracking-tight text-slate-950">
            Launch Audit
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
            One control room for production QA, customer website launch status, sales conversion checks, subscription protection, and deployment readiness.
          </p>
        </div>
        <Button onClick={fetchAuditData} variant="outline" className="rounded-xl gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Audit
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-4">
        {[
          { label: "Average Readiness", value: `${averageScore}%`, icon: ShieldCheck, tone: "text-indigo-600 bg-indigo-50" },
          { label: "Ready To Launch", value: launchReady, icon: Rocket, tone: "text-emerald-600 bg-emerald-50" },
          { label: "Blocked Sites", value: blocked, icon: AlertTriangle, tone: "text-rose-600 bg-rose-50" },
          { label: "Compliance Pages", value: policiesReady ? "Ready" : "Review", icon: FileText, tone: "text-amber-600 bg-amber-50" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="rounded-[2rem] border-slate-100 shadow-sm">
              <CardContent className="p-6">
                <div className={cn("mb-5 flex h-11 w-11 items-center justify-center rounded-2xl", item.tone)}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                <p className="mt-2 text-3xl font-black text-slate-950">{item.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[2rem] border-slate-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-black">
              <Globe className="h-5 w-5 text-indigo-600" />
              Customer Website Launch Status
            </CardTitle>
            <CardDescription>
              Publishing should wait until critical contact, preview, billing, domain, and compliance checks are clear.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {auditedBusinesses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <p className="text-sm font-bold text-slate-500">No businesses found yet.</p>
              </div>
            ) : (
              auditedBusinesses.map(({ business, checks, score, blockers, warnings }) => (
                <div key={business.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black text-slate-950">{business.name || "Unnamed Business"}</h3>
                        <Badge className={cn("border", score >= 85 && blockers.length === 0 ? statusStyles.pass : blockers.length ? statusStyles.fail : statusStyles.warn)}>
                          {score >= 85 && blockers.length === 0 ? "Ready" : blockers.length ? "Blocked" : "Needs Review"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                        {business.plan || business.business_plan || "No plan"} / {business.subscription_status || business.status || "unknown status"}
                      </p>
                    </div>
                    <div className="min-w-[180px]">
                      <div className="mb-2 flex justify-between text-xs font-black text-slate-500">
                        <span>Readiness</span>
                        <span>{score}%</span>
                      </div>
                      <Progress value={score} className="h-2" />
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {checks.map((check) => {
                      const Icon = statusIcon[check.status];
                      return (
                        <button
                          key={check.id}
                          type="button"
                          onClick={() => check.fixPath && navigate(check.fixPath)}
                          className={cn(
                            "rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm",
                            statusStyles[check.status],
                          )}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <Icon className="h-4 w-4 shrink-0" />
                            <p className="text-xs font-black uppercase tracking-widest">{check.label}</p>
                          </div>
                          <p className="text-xs font-semibold leading-5 opacity-90">{check.detail}</p>
                        </button>
                      );
                    })}
                  </div>
                  {(blockers.length > 0 || warnings.length > 0) && (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Next fixes</p>
                      <p className="mt-2 text-sm font-semibold text-slate-700">
                        {blockers[0]?.detail || warnings[0]?.detail}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <ChecklistCard
            title="Production QA Checklist"
            description="Run this before taking paid traffic or publishing client sites."
            icon={Smartphone}
            items={productionQaChecks}
          />
          <ChecklistCard
            title="Deployment Readiness"
            description="Manual environment items that need to be confirmed in production."
            icon={ExternalLink}
            items={deploymentReadinessChecks}
            actionLabel="Open System Status"
            onAction={() => navigate("/admin/status")}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChecklistCard
          title="Sales Conversion Cleanup"
          description="Keep the public page focused enough for ads and organic search."
          icon={MessageSquare}
          items={salesConversionChecks}
          actionLabel="Review Sales Page"
          onAction={() => navigate("/")}
        />
        <ChecklistCard
          title="Subscription Protection"
          description="Controls that reduce unpaid launch, cancellation, and ownership risk."
          icon={CreditCard}
          items={subscriptionProtectionChecks}
          actionLabel="Review Plans"
          onAction={() => navigate("/admin/plans")}
        />
        <Card className="rounded-[2rem] border-indigo-100 bg-indigo-50/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-black">
              <Rocket className="h-5 w-5 text-indigo-600" />
              Recommended Launch Rule
            </CardTitle>
            <CardDescription>
              Use this as your operational policy before publishing a customer website.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              "No live launch with failed critical checks.",
              "No custom domain connection without active subscription or approved manual exception.",
              "No paid ads until sitemap, legal pages, pricing, examples, and audit lead magnet are reviewed.",
              "No customer handover until a test enquiry and mobile check are completed.",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl bg-white p-4 text-sm font-semibold leading-6 text-slate-700">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
            <Button className="w-full rounded-xl gap-2" onClick={() => navigate("/admin/businesses")}>
              Review Active Tenants
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChecklistCard({
  title,
  description,
  icon: Icon,
  items,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  items: string[];
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card className="rounded-[2rem] border-slate-100 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-black">
          <Icon className="h-5 w-5 text-indigo-600" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-700">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{item}</span>
          </div>
        ))}
        {actionLabel && onAction && (
          <Button variant="outline" className="mt-2 w-full rounded-xl gap-2" onClick={onAction}>
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
