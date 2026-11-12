import React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, CalendarCheck2, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { FUNNEL_STEP_LABELS, type FunnelConnection, type FunnelPageContent, type FunnelPageField, type FunnelStep } from "../../lib/funnelEngine";

const getSessionKey = (funnelId: string) => {
  const key = `bt_funnel_session_${funnelId}`;
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const value = crypto.randomUUID();
    localStorage.setItem(key, value);
    return value;
  } catch {
    return crypto.randomUUID();
  }
};

const deviceType = () => {
  if (typeof window === "undefined") return "Unknown";
  if (window.innerWidth < 640) return "Mobile";
  if (window.innerWidth < 1024) return "Tablet";
  return "Desktop";
};

const hashNumber = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  return Math.abs(hash);
};

function chooseContent(step: FunnelStep, variants: any[], sessionKey: string) {
  const active = variants.filter((variant) => variant.step_id === step.id && variant.status === "active" && Number(variant.weight) > 0);
  if (!active.length) return { content: step.page_content || {}, variantId: null };
  const total = Math.min(100, active.reduce((sum, variant) => sum + Math.max(0, Number(variant.weight || 0)), 0));
  if (total <= 0) return { content: step.page_content || {}, variantId: null };
  const bucket = hashNumber(`${sessionKey}:${step.id}`) % 100;
  let cursor = 0;
  for (const variant of active) {
    const weight = Math.max(0, Number(variant.weight || 0));
    if (bucket >= cursor && bucket < Math.min(100, cursor + weight)) {
      return { content: { ...(step.page_content || {}), ...(variant.page_content || {}) }, variantId: variant.id };
    }
    cursor += weight;
    if (cursor >= 100) break;
  }
  return { content: step.page_content || {}, variantId: null };
}

export function PublicFunnelPage() {
  const { businessId = "", funnelSlug = "", stepSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [payload, setPayload] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState<Record<string, any>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [paymentVerified, setPaymentVerified] = React.useState<boolean | null>(null);
  const trackedFunnel = React.useRef(false);
  const trackedStep = React.useRef("");

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/public/funnels/${encodeURIComponent(businessId)}/${encodeURIComponent(funnelSlug)}`);
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.funnel) throw new Error(body?.error || "This funnel is not available.");
        if (!cancelled) setPayload(body);
      } catch (loadError: any) {
        if (!cancelled) setError(loadError?.message || "This funnel is not available.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [businessId, funnelSlug]);

  const funnel = payload?.funnel;
  const steps: FunnelStep[] = payload?.steps || [];
  const connections: FunnelConnection[] = payload?.connections || [];
  const variants = payload?.variants || [];
  const offers = payload?.offers || [];
  const entry = steps.find((step) => step.is_entry) || steps[0];
  const currentStep = (stepSlug ? steps.find((step) => step.slug === stepSlug) : entry) || entry;
  const sessionKey = React.useMemo(() => funnel?.id ? getSessionKey(funnel.id) : "", [funnel?.id]);
  const selected = currentStep ? chooseContent(currentStep, variants, sessionKey) : { content: {} as FunnelPageContent, variantId: null };
  const content = selected.content as FunnelPageContent;
  const currentOffer = currentStep ? offers.find((offer: any) => offer.step_id === currentStep.id && offer.active) : null;

  React.useEffect(() => {
    const checkoutSession = searchParams.get("session_id");
    if (!funnel?.id || searchParams.get("checkout") !== "returned" || !checkoutSession) return;
    let live = true;
    setPaymentVerified(null);
    void fetch("/api/public/funnels/" + encodeURIComponent(funnel.id) + "/checkout-status/" + encodeURIComponent(checkoutSession))
      .then((res) => res.ok ? res.json() : Promise.reject(new Error("Payment status unavailable")))
      .then((body) => { if (live) setPaymentVerified(body.paid === true); })
      .catch(() => { if (live) setPaymentVerified(false); });
    return () => { live = false; };
  }, [funnel?.id, searchParams]);

  const track = React.useCallback(async (eventType: string, metadata: Record<string, any> = {}, revenue?: number) => {
    if (!funnel?.id || !currentStep?.id || !sessionKey) return;
    const utm = {
      source: searchParams.get("utm_source") || undefined,
      medium: searchParams.get("utm_medium") || undefined,
      campaign: searchParams.get("utm_campaign") || undefined,
      content: searchParams.get("utm_content") || undefined,
      term: searchParams.get("utm_term") || undefined,
    };
    try {
      await fetch(`/api/public/funnels/${funnel.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKey,
          stepId: currentStep.id,
          variantId: selected.variantId,
          eventType,
          device: deviceType(),
          referrer: document.referrer || undefined,
          revenue,
          currency: currentOffer?.currency || funnel.settings?.currency || "USD",
          ...utm,
          metadata,
        }),
      });
    } catch {
      // Analytics must never block the funnel conversion path.
    }
  }, [currentOffer?.currency, currentStep?.id, funnel?.id, funnel?.settings?.currency, searchParams, selected.variantId, sessionKey]);

  React.useEffect(() => {
    if (!funnel?.id || !currentStep?.id || !sessionKey) return;
    if (!trackedFunnel.current) {
      trackedFunnel.current = true;
      void track("funnel_view");
    }
    if (trackedStep.current !== currentStep.id) {
      trackedStep.current = currentStep.id;
      void track("step_view");
      setSubmitted(false);
      setFormData({});
    }
  }, [currentStep?.id, funnel?.id, sessionKey, track]);

  const navigateToStep = (stepId?: string | null) => {
    if (!stepId) return;
    const step = steps.find((item) => item.id === stepId);
    if (!step) return;
    navigate(`/f/${businessId}/${funnelSlug}/${step.slug}${window.location.search}`);
  };

  const routeByCondition = (conditionType: string) =>
    connections
      .filter((edge) => edge.source_step_id === currentStep?.id)
      .sort((a,b) => a.priority - b.priority)
      .find((edge) => edge.condition_type === conditionType)?.target_step_id || null;

  const defaultNext = () => routeByCondition("always")
    || connections.filter((edge) => edge.source_step_id === currentStep?.id).sort((a,b) => a.priority - b.priority)[0]?.target_step_id
    || null;

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!funnel?.id || !currentStep?.id) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/public/funnels/${funnel.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKey,
          stepId: currentStep.id,
          variantId: selected.variantId,
          data: formData,
          source: searchParams.get("utm_source") || undefined,
          medium: searchParams.get("utm_medium") || undefined,
          campaign: searchParams.get("utm_campaign") || undefined,
          referrer: document.referrer || undefined,
          device: deviceType(),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "Your information could not be submitted.");
      setSubmitted(true);
      if (body?.nextStepId) window.setTimeout(() => navigateToStep(body.nextStepId), 500);
    } catch (submitError: any) {
      setError(submitError?.message || "Your information could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  const startCheckout = async () => {
    if (!funnel?.id || !currentStep?.id || !currentOffer) {
      setError("This offer is not configured for checkout yet.");
      return;
    }
    setSubmitting(true);
    setError("");
    void track("checkout_started");
    try {
      const response = await fetch(`/api/public/funnels/${funnel.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKey, stepId: currentStep.id, offerId: currentOffer.id }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.url) throw new Error(body?.error || "Secure checkout could not be started.");
      window.location.href = body.url;
    } catch (checkoutError: any) {
      setError(checkoutError?.message || "Secure checkout could not be started.");
      setSubmitting(false);
    }
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-[#f6f7fb]"><Loader2 className="h-9 w-9 animate-spin text-indigo-600" /></main>;
  if (error && !payload) return <main className="flex min-h-screen items-center justify-center bg-[#f6f7fb] p-6"><div className="max-w-xl text-center"><h1 className="text-3xl font-black text-slate-950">Funnel unavailable</h1><p className="mt-3 text-slate-600">{error}</p></div></main>;
  if (!funnel || !currentStep) return null;

  const primary = content.theme?.primary || "#4f46e5";
  const fields: FunnelPageField[] = content.fields || [];
  const mediaUrl = typeof content.mediaUrl === "string" && /^https:\/\//i.test(content.mediaUrl) ? content.mediaUrl : null;
  const isForm = ["lead_form","survey","application","appointment"].includes(currentStep.step_type);
  const isCheckout = ["checkout","order_bump","upsell","downsell"].includes(currentStep.step_type);
  const isTerminal = ["thank_you","confirmation"].includes(currentStep.step_type);
  const checkoutReturned = searchParams.get("checkout") === "returned";
  const paid = checkoutReturned && paymentVerified === true;

  const renderField = (field: FunnelPageField) => {
    const common = {
      id: field.id,
      name: field.name,
      required: field.required,
      value: formData[field.name] ?? "",
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setFormData((current) => ({ ...current, [field.name]: event.target.value })),
      className: "h-12 rounded-none border-slate-300 bg-white text-slate-950",
      placeholder: field.placeholder,
    };
    if (field.type === "checkbox") return <input type="checkbox" id={field.id} name={field.name} required={field.required} checked={formData[field.name] === true} onChange={(event)=>setFormData((current)=>({...current,[field.name]:event.target.checked}))} className="h-5 w-5 accent-indigo-600" />;
    if (field.type === "textarea") return <Textarea {...(common as any)} className="min-h-28 rounded-none border-slate-300 bg-white text-slate-950" />;
    if (field.type === "select" || field.type === "radio") return <select {...(common as any)}>{<option value="">Select…</option>}{(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select>;
    return <Input {...(common as any)} type={field.type === "tel" ? "tel" : field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "time" ? "time" : field.type === "email" ? "email" : "text"} />;
  };

  return (
    <main className="min-h-screen" style={{ background: content.theme?.background || "#ffffff", color: content.theme?.text || "#141821" }}>
      <Helmet><title>{content.headline || currentStep.name} | {payload.business?.name || funnel.name}</title><meta name="robots" content={funnel.settings?.indexable === true ? "index,follow" : "noindex,nofollow"} /></Helmet>
      <section className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div><p className="text-sm font-black text-slate-950">{payload.business?.name || funnel.name}</p><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{FUNNEL_STEP_LABELS[currentStep.step_type]}</p></div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><ShieldCheck className="h-4 w-4" />Secure Bennie Studio funnel</div>
        </div>
      </section>

      <section className="mx-auto grid min-h-[calc(100vh-70px)] max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-12 lg:py-24">
        <div className={isForm || isCheckout ? "lg:col-span-7" : "lg:col-span-9"}>
          {content.eyebrow ? <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: primary }}>{content.eyebrow}</p> : null}
          <h1 className="mt-4 max-w-4xl text-[clamp(2.8rem,6vw,5.8rem)] font-black leading-[0.96] tracking-[-0.055em] text-slate-950">{content.headline || currentStep.name}</h1>
          {content.subheadline ? <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-slate-600">{content.subheadline}</p> : null}
          {content.body ? <p className="mt-6 max-w-2xl whitespace-pre-line text-base leading-7 text-slate-600">{content.body}</p> : null}
          {mediaUrl ? <div className="mt-7 max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <img src={mediaUrl} alt={content.headline || "Service illustration"} className="max-h-[380px] w-full object-cover" loading="lazy" decoding="async" />
          </div> : null}
          {content.benefits?.length ? <div className="mt-8 grid gap-3 sm:grid-cols-2">{content.benefits.map((benefit) => <div key={benefit} className="flex items-start gap-3 border-t border-slate-200 pt-4 text-sm font-bold text-slate-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: primary }} />{benefit}</div>)}</div> : null}
          {content.proof?.length ? <div className="mt-8 grid gap-3 sm:grid-cols-2">{content.proof.map((item) => <div key={item} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"><ShieldCheck className="mr-2 inline h-4 w-4 text-indigo-600" />{item}</div>)}</div> : null}
          {paid ? <div className="mt-8 max-w-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">Payment verified with Stripe. Thank you.</div> : checkoutReturned ? <div className="mt-8 max-w-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">Your payment is being verified. Please check your receipt before assuming it was completed.</div> : null}
          {!isForm && !isCheckout && !isTerminal ? <Button onClick={() => { void track("cta_click"); navigateToStep(defaultNext()); }} className="mt-9 min-h-13 rounded-none px-7 font-black text-white" style={{ backgroundColor: primary }}>{content.ctaLabel || "Continue"}<ArrowRight className="ml-2 h-4 w-4" /></Button> : null}
          {isTerminal ? <div className="mt-9 flex items-center gap-3 text-sm font-bold text-slate-600"><CheckCircle2 className="h-5 w-5 text-emerald-600" />{content.successMessage || "Your information has been recorded."}</div> : null}
        </div>

        {isForm ? (
          <div className="lg:col-span-5">
            <form onSubmit={submitForm} className="border border-slate-200 bg-[#f8f9fc] p-6 shadow-xl shadow-slate-200/40 sm:p-8">
              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden"><label htmlFor="bt-hidden-site">Leave this blank</label><input id="bt-hidden-site" type="text" name="__website" tabIndex={-1} autoComplete="off" value={formData.__website || ""} onChange={(e)=>setFormData((current)=>({...current,__website:e.target.value}))}/></div>
              {currentStep.step_type === "appointment" ? <div className="mb-5 flex items-start gap-3 border-b border-slate-200 pb-5"><CalendarCheck2 className="mt-0.5 h-5 w-5 text-indigo-600" /><p className="text-xs font-semibold leading-5 text-slate-600">Request your preferred date and time. This does not claim real-time availability; the business will confirm the appointment.</p></div> : null}
              <div className="space-y-4">{fields.map((field) => <div key={field.id} className="space-y-1.5"><Label htmlFor={field.id}>{field.label}{field.required ? " *" : ""}</Label>{renderField(field)}</div>)}</div>
              {error ? <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p> : null}
              {submitted ? <div className="mt-5 border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{content.successMessage || "Thanks. Your information has been received."}</div> : null}
              <Button type="submit" disabled={submitting} className="mt-6 min-h-13 w-full rounded-none font-black text-white" style={{ backgroundColor: primary }}>{submitting ? "Submitting…" : content.ctaLabel || "Continue"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
            </form>
          </div>
        ) : null}

        {isCheckout ? (
          <div className="lg:col-span-5">
            <div className="border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40 sm:p-8">
              {currentOffer ? <><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{currentOffer.offer_type.replace("_"," ")}</p><h2 className="mt-2 text-2xl font-black text-slate-950">{currentOffer.name}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{currentOffer.description}</p><p className="mt-6 text-4xl font-black tracking-tight text-slate-950">{new Intl.NumberFormat(undefined,{style:"currency",currency:currentOffer.currency||"USD"}).format(Number(currentOffer.amount||0))}</p></> : <p className="text-sm font-semibold text-slate-500">This checkout step needs an active offer before it can accept payment.</p>}
              {error ? <p className="mt-4 text-sm font-semibold text-rose-600">{error}</p> : null}
              <Button disabled={!currentOffer || submitting} onClick={() => void startCheckout()} className="mt-6 min-h-13 w-full rounded-none font-black text-white" style={{ backgroundColor: primary }}>{submitting ? "Opening secure checkout…" : content.ctaLabel || "Continue to Checkout"}<ArrowRight className="ml-2 h-4 w-4" /></Button>
              {["order_bump","upsell","downsell"].includes(currentStep.step_type) ? (
                <button
                  type="button"
                  onClick={() => {
                    void track(currentStep.step_type === "upsell" ? "upsell_declined" : `${currentStep.step_type}_declined`);
                    navigateToStep(routeByCondition("not_purchased") || defaultNext());
                  }}
                  className="mt-4 w-full py-2 text-sm font-bold text-slate-500 underline underline-offset-4 hover:text-slate-800"
                >
                  No thanks, continue
                </button>
              ) : null}
              <p className="mt-4 text-center text-[11px] font-semibold leading-5 text-slate-400">Payment is processed by Stripe. Bennie Studio records funnel conversion events but does not replace Stripe as payment truth.</p>
            </div>
          </div>
        ) : null}
      </section>
      {content.faq?.length ? <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Frequently asked questions</h2>
        <div className="grid gap-3">{content.faq.map((item) => <details key={item.question} className="rounded-xl border border-slate-200 bg-white p-5">
          <summary className="cursor-pointer font-semibold text-slate-950">{item.question}</summary>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{item.answer}</p>
        </details>)}</div>
      </section> : null}
    </main>
  );
}
