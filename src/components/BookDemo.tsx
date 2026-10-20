import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
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
import { getStoredMarket } from "../lib/commercialPricing";

type CallForm = {
  name: string;
  email: string;
  phone: string;
  company: string;
  websiteUrl: string;
  market: RevenueMarket;
  industry: string;
  selectedSlot: string;
  message: string;
  monthlyEnquiries: string;
  marketingSpend: string;
  businessSize: string;
  objective: string;
  timing: string;
  investment: string;
};

type SavedCallContext = Partial<CallForm> & {
  previewId?: string;
  service?: string;
  location?: string;
  goal?: string;
  recommendedProduct?: string;
  source?: string;
  campaign?: string;
  attribution?: Record<string, any>;
};

const readSavedContext = (): SavedCallContext => {
  try {
    const audit = JSON.parse(sessionStorage.getItem("bt_audit_preview_context") || "{}");
    const preview = JSON.parse(localStorage.getItem("bt_preview_intent") || "{}");
    const storedMarket = getStoredMarket();
    const revenueMarket: RevenueMarket = storedMarket === "INTL" ? "US" : storedMarket;
    return {
      company: preview.businessName || audit.businessName || "",
      email: preview.email || audit.email || "",
      phone: preview.phone || "",
      websiteUrl: preview.websiteUrl || audit.website || "",
      industry: preview.industry || "",
      market: revenueMarket,
      previewId: preview.previewId || undefined,
      service: preview.mainService || undefined,
      location: preview.location || undefined,
      goal: preview.goal || undefined,
      recommendedProduct: preview.recommendedProduct || "managed-website",
      source: preview.source || undefined,
      campaign: preview.campaign || undefined,
      attribution: preview.attribution || undefined,
    };
  } catch {
    return {};
  }
};

const normalizeWebsiteUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`).toString();
  } catch {
    return null;
  }
};

export default function BookDemo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const saved = React.useMemo(readSavedContext, []);
  const requestedProduct = searchParams.get("product") === "growth-partner" ? "growth-partner" : (saved.recommendedProduct || "managed-website");
  const isGrowthPartner = requestedProduct === "growth-partner";
  const requestedMarket = searchParams.get("market");
  const initialMarket: RevenueMarket = requestedMarket === "MY" || requestedMarket === "SG" || requestedMarket === "GB" ? requestedMarket : requestedMarket === "INTL" ? "US" : (saved.market || "US");
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [bookingConfirmed, setBookingConfirmed] = React.useState(false);
  const [slots, setSlots] = React.useState<string[]>([]);
  const [availabilityError, setAvailabilityError] = React.useState("");
  const [timezone, setTimezone] = React.useState("Asia/Kuala_Lumpur");
  const [manageUrl, setManageUrl] = React.useState("");
  const [form, setForm] = React.useState<CallForm>({
    name: "",
    email: saved.email || "",
    phone: saved.phone || "",
    company: saved.company || "",
    websiteUrl: saved.websiteUrl || "",
    market: initialMarket,
    industry: saved.industry || "",
    selectedSlot: "",
    message: "",
    monthlyEnquiries: "",
    marketingSpend: "",
    businessSize: "",
    objective: "",
    timing: "",
    investment: "",
  });

  const loadAvailability = React.useCallback(() => {
    setAvailabilityError("");
    fetch("/api/public/call-availability", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Availability is temporarily unavailable.");
      return response.json();
    }).then((payload) => {
      setSlots(Array.isArray(payload.slots) ? payload.slots : []);
      if (payload.timezone) setTimezone(payload.timezone);
    }).catch(() => {
      setSlots([]);
      setAvailabilityError("Available times could not be loaded. Please retry.");
    });
  }, []);

  React.useEffect(() => {
    trackPublicEvent({ eventType: isGrowthPartner ? "growth_partner_consultation_viewed" : "managed_website_review_viewed", label: isGrowthPartner ? "Growth Partner Consultation" : "Managed Website Review", target: "/book-demo" });
    loadAvailability();
  }, [isGrowthPartner, loadAvailability]);

  const update = <K extends keyof CallForm>(key: K, value: CallForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    // When the calendar has no availability, do not block a qualified enquiry.
    // Keep a booked call and a follow-up request as distinctly labelled states.
    const requestFollowUp = !form.selectedSlot;
    if (!requestFollowUp && (!form.selectedSlot || !slots.includes(form.selectedSlot))) {
      toast.error("Choose a confirmed time, or retry availability.");
      return;
    }
    const normalizedWebsiteUrl = normalizeWebsiteUrl(form.websiteUrl);
    if (normalizedWebsiteUrl === null) {
      toast.error("Enter a valid website address or leave it blank.");
      return;
    }
    setLoading(true);
    trackPublicEvent({
      eventType: "consultation_form_submitted",
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
          websiteUrl: normalizedWebsiteUrl,
          industry: form.industry,
          country: form.market === "US" ? "INTL" : form.market,
          leadType: isGrowthPartner ? "growth_partner_consultation" : "managed_website_review",
          formName: isGrowthPartner ? "Growth Partner Consultation" : "Managed Website Review",
          sourcePage: "/book-demo",
          previewId: saved.previewId,
          market: form.market === "US" ? "INTL" : form.market,
          currency: "USD",
          landingPage: saved.attribution?.landingPage || saved.attribution?.sourcePage,
          service: saved.service,
          selectedProduct: requestedProduct,
          campaign: saved.campaign,
          utmSource: saved.attribution?.utmSource,
          utmMedium: saved.attribution?.utmMedium,
          utmCampaign: saved.attribution?.utmCampaign,
          referrer: saved.attribution?.referrer,
          firstTouch: saved.attribution?.firstTouch,
          lastTouch: saved.attribution?.lastTouch,
          message: [
            requestFollowUp ? "No available calendar slot; personal follow-up requested, not a confirmed booking." : `Preferred slot (awaiting confirmation): ${form.selectedSlot}`,
            `Market: ${REVENUE_MARKETS[form.market].label}`,
            saved.location ? `Location: ${saved.location}` : null,
            saved.service ? `Primary service: ${saved.service}` : null,
            saved.goal ? `Preview goal: ${saved.goal}` : null,
            form.message ? `Goals: ${form.message}` : null,
            `Qualification — enquiries: ${form.monthlyEnquiries || "not specified"}; marketing spend: ${form.marketingSpend || "not specified"}; team size: ${form.businessSize || "not specified"}; objective: ${form.objective || "not specified"}; timing: ${form.timing || "not specified"}; investment: ${form.investment || "not specified"}`,
          ].filter(Boolean).join("\n"),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Your request could not be saved.");
      if (requestFollowUp) {
        setBookingConfirmed(false);
        setSubmitted(true);
        trackPublicEvent({ eventType: "consultation_followup_requested", label: form.company, target: "/book-demo", metadata: { market: form.market, hasPreview: Boolean(saved.previewId) } });
        toast.success("Your website review request has been saved. No call time has been booked.");
        return;
      }
      const bookingResponse = await fetch("/api/public/call-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: payload.leadId,
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          businessName: form.company,
          market: form.market,
          industry: form.industry,
          websiteUrl: normalizedWebsiteUrl || undefined,
          startAt: form.selectedSlot,
          timezone,
          goals: form.message || undefined,
          previewId: saved.previewId,
          selectedProduct: requestedProduct,
          sourcePage: "/book-demo",
        }),
      });
      const bookingPayload = await bookingResponse.json().catch(() => ({}));
      if (!bookingResponse.ok) {
        // The lead is persisted; do not invite an accidental duplicate submission.
        setBookingConfirmed(false);
        setSubmitted(true);
        toast.error("Your request was saved, but the calendar did not confirm a booking.");
        return;
      }
      setBookingConfirmed(true);
      trackPublicEvent({ eventType: "consultation_booking_confirmed", label: form.company, target: "/book-demo", metadata: { market: form.market, selectedProduct: requestedProduct } });
      setManageUrl(bookingPayload.manageUrl || (bookingPayload.booking?.confirmation_token ? `/manage-call/${bookingPayload.booking.confirmation_token}` : ""));
      setSubmitted(true);
      toast.success(isGrowthPartner ? "Your growth consultation is confirmed." : "Your website review is confirmed.");
    } catch (error: any) {
      toast.error(error?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="brand-public min-h-screen bg-[#f6f7fb] text-[#141821]">
      <Helmet>
        <title>{isGrowthPartner ? "Book a Website Growth Partner Consultation | Bennie Studio" : "Discuss Your Website | Bennie Studio"}</title>
        <meta name="description" content={isGrowthPartner ? "Book a Website Growth Partner consultation to scope conversion priorities, landing pages, local SEO expansion, traffic, and ongoing growth work." : "Book a focused review of your website, offer and enquiry path with Bennie Studio."} />
        <link rel="canonical" href="https://app.bennietay.com/book-demo" />
      </Helmet>
      <PublicSiteHeader />
      <main>
        <section className="relative overflow-hidden border-b border-[#dfe3e8] bg-[#f8f8f5] text-[#15191f]">
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#1741ed]/10 blur-3xl" />
          <div className="brand-shell relative grid min-w-0 gap-10 py-16 lg:grid-cols-12 lg:items-start lg:py-24">
            <div className="min-w-0 lg:col-span-5">
              
              <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.03] tracking-tight text-[#15191f] sm:text-5xl">
                {isGrowthPartner ? "Plan the next stage of your website growth." : "Let’s discuss the website your business needs."}
              </h1>
              <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-[#526071]">
                {isGrowthPartner ? "Bring your current website, traffic sources, enquiry baseline and growth priorities. We’ll scope conversion work, landing pages, local SEO expansion, experiments, implementation priorities and commercial fit." : "Tell us a little about your business and website needs. We’ll discuss the scope, what we can manage for you, and the costs before you decide. No payment and no account are required to enquire."}
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  "A practical review of the current enquiry journey",
                  "A recommended website and offer direction",
                  "A clear scope, timeline and commercial fit",
                  "No invented forecasts or pressure tactics",
                ].map((item) => (
                  <div key={item} className="flex gap-3 rounded-lg border border-[#d6dce5] bg-white p-4 text-sm font-bold text-[#263344]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1741ed]" /> {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0 rounded-sm border border-[#142239] bg-[#142239] p-6 text-white sm:p-8 lg:col-span-7">
              {submitted ? (
                <div className="py-10 text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-emerald-400/15 text-emerald-300"><CheckCircle2 className="h-8 w-8" /></div>
                  <h2 className="mt-6 text-3xl font-bold">{bookingConfirmed ? "Call confirmed" : "Review request received"}</h2>
                  <p className="mx-auto mt-3 max-w-md font-semibold leading-7 text-slate-300">
                    {bookingConfirmed
                      ? "Your time is reserved. We’ll review your website and goals before the call so the conversation starts with useful context."
                      : "Your enquiry has been saved for a personal follow-up. No appointment is reserved yet. We’ll contact you using the details you supplied to arrange next steps."}
                  </p>
                  <Button onClick={() => navigate("/case-studies")} className="mt-7 min-h-12 rounded-lg bg-white px-6 text-slate-950 hover:bg-indigo-100">
                    View case studies <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  {bookingConfirmed && manageUrl && <Button variant="ghost" onClick={() => navigate(new URL(manageUrl, window.location.origin).pathname)} className="mt-3 min-h-11 rounded-xl text-indigo-200 hover:bg-white/10 hover:text-white">Reschedule or cancel</Button>}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="min-w-0 space-y-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-300">A quick enquiry · No account required</p>
                    <h2 className="mt-2 text-2xl font-bold text-white">{isGrowthPartner ? "Tell us how to contact you." : "Tell us where to reach you."}</h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field icon={User} label="Your name" id="call-name"><Input id="call-name" required value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Your name" className="h-12 rounded-xl border-white/15 bg-white text-slate-950" /></Field>
                    <Field icon={Mail} label="Email" id="call-email"><Input id="call-email" required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@business.com" className="h-12 rounded-xl border-white/15 bg-white text-slate-950" /></Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field icon={Building2} label="Business" id="call-company"><Input id="call-company" required value={form.company} onChange={(e) => update("company", e.target.value)} placeholder="Business name" className="h-12 rounded-xl border-white/15 bg-white text-slate-950" /></Field>
                    <Field icon={Phone} label="WhatsApp / phone (optional)" id="call-phone"><Input id="call-phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Optional" className="h-12 rounded-xl border-white/15 bg-white text-slate-950" /></Field>
                  </div>
                  <Field icon={Globe2} label="Business location" id="call-market"><select id="call-market" value={form.market} onChange={(e) => update("market", e.target.value as RevenueMarket)} className="h-12 w-full rounded-xl border border-white/15 bg-white px-3 text-sm font-semibold text-slate-950">{Object.entries(REVENUE_MARKETS).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></Field>
                  <Field icon={MessageSquare} label="What would you like your website to do? (optional)" id="call-message"><Textarea id="call-message" value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="For example: explain our services clearly and help customers ask for a quote" className="min-h-24 rounded-xl border-white/15 bg-white text-slate-950" /></Field>
                  <details className="group rounded-xl border border-white/15 bg-white/[0.04] px-4 py-4">
                    <summary className="cursor-pointer list-item text-sm font-semibold text-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300">
                      Optional: add website details or choose a call time
                    </summary>
                    <div className="mt-5 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field icon={Building2} label="Industry (optional)" id="call-industry"><Input id="call-industry" value={form.industry} onChange={(e) => update("industry", e.target.value)} placeholder="For example: Cleaning or accounting" className="h-12 rounded-xl border-white/15 bg-white text-slate-950" /></Field>
                      </div>
                      <Field icon={Globe2} label="Current website (optional)" id="call-website"><Input id="call-website" value={form.websiteUrl} onChange={(e) => update("websiteUrl", e.target.value)} placeholder="https://example.com" className="h-12 rounded-xl border-white/15 bg-white text-slate-950" /></Field>
                      <Field icon={CalendarDays} label={slots.length ? `Available 30-minute times · ${timezone}` : "Call scheduling"} id="call-slot">
                        <select id="call-slot" disabled={slots.length === 0} value={form.selectedSlot} onChange={(event) => update("selectedSlot", event.target.value)} className="h-12 w-full rounded-xl border border-white/15 bg-white px-3 text-sm font-semibold text-slate-950">
                          <option value="">{slots.length ? "No booking — just contact me" : "No confirmed slots currently available"}</option>
                          {slots.map((slot) => <option key={slot} value={slot}>{new Date(slot).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</option>)}
                        </select>
                        {slots.length === 0 && <p className="mt-2 text-xs leading-5 text-indigo-100">You can still ask for a personal follow-up. No call time is reserved.</p>}
                        {availabilityError && <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-amber-200"><span>{availabilityError}</span><button type="button" onClick={loadAvailability} className="rounded-lg border border-white/20 px-3 py-1.5 font-bold text-white hover:bg-white/10">Retry</button></div>}
                      </Field>
                    </div>
                  </details>
                  <Button type="submit" disabled={loading} className="h-auto min-h-13 w-full whitespace-normal rounded-lg bg-indigo-500 px-6 py-3 text-center font-bold text-white shadow-xl shadow-indigo-950/30 hover:bg-indigo-400">
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving your request</> : <>{!form.selectedSlot ? "Request a personal follow-up" : isGrowthPartner ? "Confirm Growth Consultation" : "Confirm Website Review"} <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                  <p className="text-center text-xs font-semibold leading-5 text-slate-400">{form.selectedSlot ? "A time is reserved only after the calendar confirms it. If confirmation fails, we keep your enquiry for follow-up." : "No slot is booked. We will contact you about your request."}</p>
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
      <Label htmlFor={id} className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-300"><Icon className="h-3.5 w-3.5" /> {label}</Label>
      {children}
    </div>
  );
}
