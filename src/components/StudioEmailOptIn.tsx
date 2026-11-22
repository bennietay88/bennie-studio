import React from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { trackPublicEvent } from "../lib/publicTracking";

/**
 * Secondary conversion point. Never blocks an illustrative preview or payment.
 * Marketing permission is separate from transactional preview enquiries.
 */
export function StudioEmailOptIn({
  sourcePage,
  title = "Get practical website improvement tips.",
  description = "Receive the 7-point conversion checklist and a short series of useful Bennie Studio ideas. No payment or preview registration required.",
}: {
  sourcePage: string;
  title?: string;
  description?: string;
}) {
  const [email, setEmail] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [recipientType, setRecipientType] = React.useState("");
  const [marketingConsent, setMarketingConsent] = React.useState(false);
  const [honeypot, setHoneypot] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = React.useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending") return;
    if (!email.trim() || !country || !recipientType || !marketingConsent) {
      setError("Provide an email, country, contact type, and explicit consent.");
      setStatus("error");
      return;
    }
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/platform-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: email.split("@")[0],
          email: email.trim(),
          country,
          recipientType,
          marketingConsent: true,
          leadType: "newsletter_opt_in",
          formName: "Bennie Studio website tips opt-in",
          sourcePage,
          message: "Requested website improvement checklist and email tips",
          website: honeypot,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success || !data?.leadId) {
        throw new Error(data?.message || "Subscription could not be verified.");
      }
      setStatus("success");
      setEmail("");
      setCountry("");
      setRecipientType("");
      setMarketingConsent(false);
      trackPublicEvent({ eventType: "newsletter_opt_in", label: "Website tips secondary opt-in", target: sourcePage });
    } catch (cause: any) {
      setError(cause?.message || "Subscription unavailable. Please try again.");
      setStatus("error");
    }
  };

  return (
    <section aria-label="Free website improvement tips" className="rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm sm:p-7">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-blue-700">Free checklist and website advice</p>
        <h3 className="mt-2 text-xl font-semibold leading-tight text-slate-950 sm:text-2xl">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
      </div>
      {status === "success" ? (
        <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          Subscription recorded. Your checklist and follow-up emails are scheduled, subject to email delivery.
        </p>
      ) : (
        <form aria-label="Website tips email signup" onSubmit={submit} className="grid gap-3">
          <label className="grid gap-1 text-sm font-semibold text-slate-900">
            Email address
            <input type="email" required autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@business.com" className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950"/>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-semibold text-slate-900">
              Country
              <select required value={country} onChange={e => setCountry(e.target.value)} className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900">
                <option value="">Select country</option>
                <option value="MY">Malaysia</option><option value="SG">Singapore</option>
                <option value="GB">United Kingdom</option><option value="US">United States</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-900">
              Subscribing as
              <select required value={recipientType} onChange={e => setRecipientType(e.target.value)} className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900">
                <option value="">Select type</option>
                <option value="business">Business contact</option>
                <option value="individual">Individual</option>
              </select>
            </label>
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm leading-6 text-slate-700">
            <input required type="checkbox" checked={marketingConsent} onChange={e => setMarketingConsent(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-blue-700"/>
            <span>Yes, send me website improvement tips and occasional Bennie Studio offers. I can unsubscribe at any time. <Link to="/privacy-policy" className="font-semibold underline">Privacy policy</Link>.</span>
          </label>
          <div aria-hidden="true" className="hidden"><label>Website <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={e => setHoneypot(e.target.value)}/></label></div>
          {status === "error" && <p role="alert" className="text-sm font-semibold text-rose-800">{error}</p>}
          <button disabled={status === "sending"} type="submit" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#1946c3] px-5 py-3 text-sm font-bold text-white hover:bg-[#12348e] disabled:opacity-60">
            {status === "sending" ? "Saving your request…" : "Send me the checklist"} <ArrowRight size={16} className="ml-2" aria-hidden="true"/>
          </button>
          <p className="text-xs text-slate-600">Optional. Viewing previews and comparing plans does not require subscribing.</p>
        </form>
      )}
    </section>
  );
}
