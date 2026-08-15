import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Globe2,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { trackPublicEvent } from "../lib/publicTracking";
import { REVENUE_MARKETS, type RevenueMarket } from "../constants/revenueOffer";

type CallForm = {
  name: string;
  email: string;
  phone: string;
  company: string;
  websiteUrl: string;
  market: RevenueMarket;
  industry: string;
  preferredDate: string;
  preferredTime: string;
  message: string;
};

const readSavedContext = (): Partial<CallForm> => {
  try {
    const audit = JSON.parse(sessionStorage.getItem("bt_audit_preview_context") || "{}");
    const preview = JSON.parse(localStorage.getItem("bt_preview_intent") || "{}");
    return {
      company: preview.businessName || audit.businessName || "",
      email: preview.email || audit.email || "",
      phone: preview.phone || "",
      websiteUrl: preview.websiteUrl || audit.website || "",
      industry: preview.industry || "",
    };
  } catch {
    return {};
  }
};

export default function BookDemo() {
  const navigate = useNavigate();
  const saved = React.useMemo(readSavedContext, []);
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [form, setForm] = React.useState<CallForm>({
    name: "",
    email: saved.email || "",
    phone: saved.phone || "",
    company: saved.company || "",
    websiteUrl: saved.websiteUrl || "",
    market: "SG",
    industry: saved.industry || "",
    preferredDate: "",
    preferredTime: "",
    message: "",
  });

  React.useEffect(() => {
    trackPublicEvent({ eventType: "growth_call_viewed", label: "Website Growth Call", target: "/book-demo" });
  }, []);

  const update = <K extends keyof CallForm>(key: K, value: CallForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    trackPublicEvent({
      eventType: "growth_call_requested",
      label: form.company,
      target: "/book-demo",
      metadata: { market: form.market, industry: form.industry, hasWebsite: Boolean(form.websiteUrl) },
    });

    try {
      const response = await fetch("/api/platform-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          businessName: form.company,
          websiteUrl: form.websiteUrl,
          industry: form.industry,
          country: form.market,
          leadType: "website_growth_call",
          formName: "Website Growth Call",
          sourcePage: "/book-demo",
          message: [
            `Preferred call: ${form.preferredDate || "Flexible"} ${form.preferredTime || ""}`.trim(),
            `Market: ${REVENUE_MARKETS[form.market].label}`,
            form.message ? `Goals: ${form.message}` : null,
          ].filter(Boolean).join("\n"),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Your request could not be saved.");
      setSubmitted(true);
      toast.success("Your website growth call request is in the inbox.");
    } catch (error: any) {
      toast.error(error?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <PublicSiteHeader />
      <main>
        <section className="border-b border-slate-200 bg-slate-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-indigo-300">Website growth consultation</p>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.03] tracking-tight sm:text-6xl">
                Let’s find the clearest path from website visitor to real enquiry.
              </h1>
              <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-slate-300">
                Bring your current website, business goals, or prepared review. We’ll discuss what is getting in the way, what should change first, and whether Bennie Studio is the right partner to build it.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  "A practical review of the current enquiry journey",
                  "A recommended website and offer direction",
                  "A clear scope, timeline and commercial fit",
                  "No invented forecasts or pressure tactics",
                ].map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-slate-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur sm:p-8">
              {submitted ? (
                <div className="py-10 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-300"><CheckCircle2 className="h-8 w-8" /></div>
                  <h2 className="mt-6 text-3xl font-black">Request received</h2>
                  <p className="mx-auto mt-3 max-w-md font-semibold leading-7 text-slate-300">
                    Your details are now in the sales inbox. We’ll review the context and reply with the next available call options.
                  </p>
                  <Button onClick={() => navigate("/case-studies")} className="mt-7 min-h-12 rounded-2xl bg-white px-6 text-slate-950 hover:bg-indigo-100">
                    View case studies <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Request a call</p>
                    <h2 className="mt-2 text-2xl font-black">Tell us enough to prepare properly.</h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field icon={User} label="Your name" id="call-name"><Input id="call-name" required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Your name" className="h-12 rounded-xl border-white/15 bg-white text-slate-950" /></Field>
                    <Field icon={Mail} label="Work email" id="call-email"><Input id="call-email" required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@business.com" className="h-12 rounded-xl border-white/15 bg-white text-slate-950" /></Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field icon={Building2} label="Business" id="call-company"><Input id="call-company" required value={form.company} onChange={(e) => update("company", e.target.value)} placeholder="Business name" className="h-12 rounded-xl border-white/15 bg-white text-slate-950" /></Field>
                    <Field icon={Phone} label="WhatsApp / phone" id="call-phone"><Input id="call-phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Optional" className="h-12 rounded-xl border-white/15 bg-white text-slate-950" /></Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field icon={Globe2} label="Market" id="call-market">
                      <select id="call-market" value={form.market} onChange={(e) => update("market", e.target.value as RevenueMarket)} className="h-12 w-full rounded-xl border border-white/15 bg-white px-3 text-sm font-semibold text-slate-950">
                        {Object.entries(REVENUE_MARKETS).filter(([key]) => key !== "US").map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
                      </select>
                    </Field>
                    <Field icon={Building2} label="Industry" id="call-industry"><Input id="call-industry" required value={form.industry} onChange={(e) => update("industry", e.target.value)} placeholder="e.g. renovation" className="h-12 rounded-xl border-white/15 bg-white text-slate-950" /></Field>
                  </div>
                  <Field icon={Globe2} label="Current website" id="call-website"><Input id="call-website" value={form.websiteUrl} onChange={(e) => update("websiteUrl", e.target.value)} placeholder="https://... (optional)" className="h-12 rounded-xl border-white/15 bg-white text-slate-950" /></Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field icon={CalendarDays} label="Preferred date" id="call-date"><Input id="call-date" type="date" value={form.preferredDate} onChange={(e) => update("preferredDate", e.target.value)} className="h-12 rounded-xl border-white/15 bg-white text-slate-950" /></Field>
                    <Field icon={Clock3} label="Preferred time" id="call-time"><Input id="call-time" type="time" value={form.preferredTime} onChange={(e) => update("preferredTime", e.target.value)} className="h-12 rounded-xl border-white/15 bg-white text-slate-950" /></Field>
                  </div>
                  <Field icon={MessageSquare} label="What needs to improve?" id="call-message"><Textarea id="call-message" value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="Tell us what is happening now and what a good result would look like." className="min-h-28 rounded-xl border-white/15 bg-white text-slate-950" /></Field>
                  <Button type="submit" disabled={loading} className="min-h-13 w-full rounded-2xl bg-indigo-500 px-6 py-3 font-black text-white shadow-xl shadow-indigo-950/30 hover:bg-indigo-400">
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving request</> : <>Request Website Growth Call <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                  <p className="text-center text-xs font-semibold leading-5 text-slate-400">This is a call request, not a confirmed calendar booking. We will reply with available times.</p>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <PublicSiteFooter />
    </div>
  );
}

function Field({ icon: Icon, label, id, children }: { icon: React.ComponentType<{ className?: string }>; label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-300"><Icon className="h-3.5 w-3.5" /> {label}</Label>
      {children}
    </div>
  );
}
