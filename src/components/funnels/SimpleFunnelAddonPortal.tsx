import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, CreditCard, Loader2, Route, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { useFeatures } from "../../hooks/useFeatures";

type Addon = {
  id: string; status: string; mode: string; offer_name: string;
  audience: string; offer_description: string; contact_email: string;
  funnel_id: string | null; approval_notes: string | null;
  revision_count: number; cancel_at_period_end: boolean;
};
type Overview = {
  enabled: boolean; plan: string; isSubscriber: boolean;
  price: { currency: "USD"; included: boolean; setupUsd: number; monthlyUsd: number };
  addon: Addon | null;
  publicUrl?: string | null;
};
const formatUsd = (n: number) => "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 });
const statuses: Record<string, string> = {
  pending_payment: "Awaiting payment", queued: "Queued for design",
  in_production: "In production", approval_required: "Your approval needed",
  revision_requested: "Revisions underway", approved: "Approved — awaiting publication",
  active: "Live", paused: "Paused", payment_failed: "Payment issue",
  cancelled: "Cancelled",
};

export function SimpleFunnelAddonPortal() {
  const { profile } = useAuth();
  const { isFeatureEnabled } = useFeatures();
  const [searchParams, setSearchParams] = useSearchParams();
  const [overview, setOverview] = React.useState<Overview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [offerName, setOfferName] = React.useState("");
  const [audience, setAudience] = React.useState("");
  const [offerDescription, setOfferDescription] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState(profile?.email || "");
  const [notes, setNotes] = React.useState("");
  const [approvalNotes, setApprovalNotes] = React.useState("");
  const [showSamplePreview, setShowSamplePreview] = React.useState(false);
  const [draftPreview, setDraftPreview] = React.useState<{ funnel: { name: string }; steps: Array<{ step_type: string; name: string; page_content: { headline?: string; subheadline?: string; ctaLabel?: string; benefits?: string[]; fields?: Array<{ label: string }> } }> } | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);

  const request = React.useCallback(async (path: string, options?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Please sign in again.");
    const response = await fetch(path, {
      ...options,
      headers: {
        Authorization: "Bearer " + session.access_token,
        ...(options?.body ? { "Content-Type": "application/json" } : {}),
      },
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || "The request could not be completed.");
    return body;
  }, []);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const result = await request("/api/customer/simple-funnel-addon");
      setOverview(result);
    } catch (error: any) {
      toast.error(error.message || "Could not load your funnel details.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  React.useEffect(() => {
    if (profile?.role === "business_admin") void refresh();
    else setLoading(false);
  }, [profile?.role, refresh]);

  React.useEffect(() => {
    const outcome = searchParams.get("funnel_checkout");
    if (!outcome) return;
    if (outcome === "success") toast.info("Checkout returned successfully. Activation follows Stripe payment confirmation.");
    if (outcome === "cancelled") toast.info("Checkout cancelled. Your account has not been charged by this attempt.");
    searchParams.delete("funnel_checkout");
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const checkout = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await request("/api/customer/simple-funnel-addon", {
        method: "POST", body: JSON.stringify({
          offerName, audience, offerDescription, contactEmail, notes,
        }),
      });
      if (result.mode === "paid" && result.url) {
        window.location.assign(result.url);
        return;
      }
      toast.success("Your included funnel request has been queued.");
      await refresh();
    } catch (error: any) { toast.error(error.message); }
    finally { setBusy(false); }
  };

  const respond = async (decision: "approve" | "request_changes") => {
    if (decision === "request_changes" && !approvalNotes.trim()) return toast.error("Describe the change you need.");
    setBusy(true);
    try {
      await request("/api/customer/simple-funnel-addon/respond", {
        method: "POST", body: JSON.stringify({ decision, notes: approvalNotes }),
      });
      toast.success(decision === "approve" ? "Funnel approved." : "Changes requested.");
      await refresh();
    } catch (error: any) { toast.error(error.message); }
    finally { setBusy(false); }
  };

  const cancel = async () => {
    if (!window.confirm("Schedule cancellation at the end of your current paid funnel billing period?")) return;
    setBusy(true);
    try {
      await request("/api/customer/simple-funnel-addon/cancel", { method: "POST" });
      toast.success("Cancellation scheduled at the period end.");
      await refresh();
    } catch (error: any) { toast.error(error.message); }
    finally { setBusy(false); }
  };

  const addon = overview?.addon;
  const hasAdvancedFunnels = isFeatureEnabled("sales_funnels") && !addon;
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <div>
        <div className="flex items-center gap-2 text-indigo-700"><Route className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-widest">Bennie Studio Add-ons</span></div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Simple Sales Funnel</h1>
        <p className="mt-3 max-w-3xl text-slate-600">One landing page, one thank-you page, and a clear way to turn campaign visitors into enquiries. Bennie Studio handles the build.</p>
      </div>
      {loading ? <Card className="flex min-h-48 items-center justify-center rounded-2xl"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></Card>
      : profile?.role !== "business_admin" ?
        <Card className="rounded-2xl p-8 text-slate-600">A business administrator can request or manage this add-on.</Card>
      : !overview ? <Card className="rounded-2xl p-8">Could not load the add-on. <Button onClick={() => void refresh()}>Retry</Button></Card>
      : <>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl border-slate-200 p-6">
            <Badge className="border-0 bg-slate-100 text-slate-700">01 — Landing page</Badge>
            <h2 className="mt-3 text-xl font-bold">Your focused campaign offer</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Headline, offer details, benefits, contact form and a single action. The lead goes into your existing CRM.</p>
          </Card>
          <Card className="rounded-2xl border-slate-200 p-6">
            <Badge className="border-0 bg-slate-100 text-slate-700">02 — Thank-you page</Badge>
            <h2 className="mt-3 text-xl font-bold">Confirmation and next steps</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Visitors see a confirmation after submitting. Enquiries are recorded in the existing lead CRM.</p>
          </Card>
        </div>
        <div className="space-y-3">
          <Button variant="outline" className="rounded-xl" onClick={() => setShowSamplePreview((current) => !current)}>
            {showSamplePreview ? "Hide sample preview" : "Preview a simple two-page funnel"}
          </Button>
          {showSamplePreview && <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-indigo-200 bg-white p-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-indigo-700">Page 1 — Example landing page</div>
              <h3 className="mt-5 text-2xl font-bold text-slate-950">{offerName.trim() || "Turn interest into enquiries"}</h3>
              <p className="mt-2 text-sm text-slate-600">{offerDescription.trim() || "Describe one clear offer and invite visitors to contact your team."}</p>
              <div className="mt-5 space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                <div className="rounded-lg border bg-white p-3">Your name</div>
                <div className="rounded-lg border bg-white p-3">Your email</div>
                <div className="rounded-lg bg-indigo-600 p-3 text-center font-semibold text-white">Send enquiry</div>
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-white p-6">
              <div className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Page 2 — Example thank-you page</div>
              <div className="mt-6 text-3xl font-bold text-slate-950">Thank you!</div>
              <p className="mt-3 text-sm leading-6 text-slate-600">Your enquiry has been received. The team will follow up with the next steps.</p>
              <p className="mt-8 text-xs text-slate-500">Illustrative preview only. Final styling and content are completed during managed fulfilment.</p>
            </div>
          </div>}
        </div>
        {addon && !["cancelled"].includes(addon.status) ? (
          <Card className="space-y-6 rounded-2xl border-indigo-200 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><div className="text-xs font-bold uppercase tracking-wide text-slate-500">Your funnel</div><h2 className="mt-2 text-2xl font-bold">{addon.offer_name}</h2></div>
              <Badge className="border-0 bg-indigo-50 text-indigo-700">{statuses[addon.status] || addon.status}</Badge>
            </div>
            <p className="text-sm text-slate-600">{addon.offer_description}</p>
            {addon.funnel_id && <div className="space-y-3">
              <Button variant="outline" className="rounded-xl" disabled={previewLoading} onClick={async () => {
                setPreviewLoading(true);
                try {
                  const data = await request("/api/customer/simple-funnel-addon/preview");
                  setDraftPreview((current) => current ? null : data);
                } catch (error: any) { toast.error(error.message); }
                finally { setPreviewLoading(false); }
              }}>{draftPreview ? "Hide your funnel draft" : previewLoading ? "Loading draft…" : "Review your two-page draft"}</Button>
              {draftPreview && <div className="grid gap-3 md:grid-cols-2">
                {draftPreview.steps.map((step) => <div key={step.name} className="rounded-xl border bg-white p-6">
                  <Badge variant="outline">{step.step_type === "thank_you" ? "Thank-you page" : "Landing page"}</Badge>
                  <h3 className="mt-4 text-2xl font-bold text-slate-950">{step.page_content?.headline || step.name}</h3>
                  <p className="mt-3 text-sm text-slate-600">{step.page_content?.subheadline}</p>
                  {step.page_content?.benefits?.map((benefit) => <p key={benefit} className="mt-2 text-xs text-slate-600">• {benefit}</p>)}
                  {step.page_content?.fields?.map((field, i) => <div key={i} className="mt-3 rounded-lg border bg-slate-50 p-3 text-xs">{field.label}</div>)}
                  <div className="mt-5 rounded-lg bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white">{step.page_content?.ctaLabel || "Continue"}</div>
                </div>)}
              </div>}
            </div>}
            {addon.status === "active" && overview.publicUrl && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase text-emerald-700">Your funnel is live</p><p className="truncate text-sm text-slate-800">{overview.publicUrl}</p></div>
              <a href={overview.publicUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-emerald-800">View landing page</a>
              <Button size="sm" variant="outline" onClick={() => {
                void navigator.clipboard.writeText(overview.publicUrl || "").then(() => toast.success("Funnel link copied.")).catch(() => toast.error("Unable to copy the link."));
              }}>Copy link</Button>
            </div>}
            {addon.status === "pending_payment" && <p className="text-sm text-amber-800">The add-on activates only after a verified Stripe payment. Refresh to see an updated status.</p>}
            {addon.status === "approval_required" && <div className="space-y-3 rounded-xl bg-slate-50 p-4">
              <h3 className="font-semibold">Review your draft and approve</h3>
              <p className="text-sm text-slate-600">Use “Review your two-page draft” above to inspect both pages before approval. One consolidated revision round is included.</p>
              <Label htmlFor="simple-funnel-approval-notes">Approval comments or revision details</Label>
              <Textarea id="simple-funnel-approval-notes" value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} maxLength={2500} placeholder="Optional when approving; required to request a change." />
              <div className="flex flex-wrap gap-2">
                <Button disabled={busy} onClick={() => void respond("approve")}><CheckCircle2 className="mr-2 h-4 w-4" />Approve</Button>
                <Button disabled={busy || addon.revision_count >= 1} variant="outline" onClick={() => void respond("request_changes")}>Request revision</Button>
              </div>
            </div>}
            {addon.mode === "paid" && !addon.cancel_at_period_end && addon.status !== "pending_payment" &&
              <Button variant="outline" disabled={busy} onClick={() => void cancel()}>Cancel paid add-on at period end</Button>}
            {addon.cancel_at_period_end && <p className="text-sm text-amber-700">Cancellation scheduled; the funnel remains available until the paid term ends.</p>}
          </Card>
        ) : (
          <Card className="rounded-2xl border-slate-200 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
              <div><h2 className="text-2xl font-bold">{overview.price.included ? "Included in your Growth Partner plan" : "Managed two-page funnel"}</h2>
                <p className="mt-1 text-sm text-slate-600">{overview.price.included ? "No additional setup or monthly fee for your first simple funnel." : formatUsd(overview.price.setupUsd) + " setup + " + formatUsd(overview.price.monthlyUsd) + "/month, billed in USD."}</p></div>
              {overview.price.included ? <Badge className="border-0 bg-emerald-50 text-emerald-700">Included</Badge> : <CreditCard className="h-6 w-6 text-slate-500" />}
            </div>
            <div className="mt-5 flex items-center gap-2 text-sm text-slate-600"><ShieldCheck className="h-4 w-4 text-emerald-600" />You can discuss a no-obligation concept before purchase. Published hosting and ongoing care require an active entitlement.</div>
            {!overview.enabled ? <p className="mt-6 text-sm text-amber-800">This add-on is currently in preparation. Bennie Studio will announce when ordering opens.</p> :
             !overview.isSubscriber ? <p className="mt-6 text-sm text-amber-800">An active website subscription is required to activate this offer.</p> :
            <form onSubmit={checkout} className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="simple-funnel-offer">Campaign or offer name</Label><Input id="simple-funnel-offer" value={offerName} onChange={(e) => setOfferName(e.target.value)} required minLength={3} maxLength={160} placeholder="e.g. Free roofing consultation" /></div>
              <div className="space-y-2"><Label htmlFor="simple-funnel-audience">Target audience</Label><Input id="simple-funnel-audience" value={audience} onChange={(e) => setAudience(e.target.value)} required minLength={3} maxLength={400} placeholder="e.g. Local homeowners" /></div>
              <div className="space-y-2 md:col-span-2"><Label htmlFor="simple-funnel-description">What are you offering?</Label><Textarea id="simple-funnel-description" value={offerDescription} onChange={(e) => setOfferDescription(e.target.value)} required minLength={10} maxLength={2000} placeholder="Describe the offer, the value and what should happen after someone sends an enquiry." /></div>
              <div className="space-y-2"><Label htmlFor="simple-funnel-email">Business contact email</Label><Input id="simple-funnel-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required maxLength={254} /></div>
              <div className="space-y-2"><Label htmlFor="simple-funnel-notes">Additional notes (optional)</Label><Input id="simple-funnel-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={3000} placeholder="Brand, audience or specific CTA" /></div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={busy} className="h-11 rounded-xl bg-indigo-600">{busy ? "Processing…" : overview.price.included ? "Request my included funnel" : "Continue to secure checkout"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
                <p className="mt-3 text-xs leading-5 text-slate-500">One offer, two pages, one setup revision. Ads, custom automations, complex checkout, domain purchases and additional design rounds are not included. Your existing service agreement governs ongoing support.</p>
              </div>
            </form>}
          </Card>
        )}
        {hasAdvancedFunnels && <Card className="rounded-2xl p-5"><p className="mb-3 text-sm text-slate-600">Your business also has access to the existing advanced funnel workspace.</p><Link className="inline-flex items-center rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50" to="/dashboard/funnels/advanced">Open advanced funnels <ArrowRight className="ml-2 h-4 w-4" /></Link></Card>}
      </>}
    </div>
  );
}
