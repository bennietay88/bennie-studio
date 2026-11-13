import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Provider = "resend" | "hostinger";
type Status = {
  providers: {
    resend: { configured: boolean; from: string | null };
    hostinger: { configured: boolean; from: string | null; quotaNote: string };
  };
  selection: { transactional: Provider; sales: Provider };
};

type Props = {
  transactional: Provider;
  sales: Provider;
  onChange: (key: "transactionalEmailProvider" | "salesEmailProvider", value: Provider) => void;
};

export function EmailProviderSettings({ transactional, sales, onChange }: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Sign in again to inspect email providers.");
        const response = await fetch("/api/admin/email-providers/status", {
          headers: { Authorization: "Bearer " + session.access_token }, cache: "no-store",
        });
        if (!response.ok) throw new Error("Provider health is unavailable.");
        const data = await response.json();
        if (active) setStatus(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Provider status unavailable");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 space-y-5" aria-label="Email provider settings">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Email Providers</h3>
        <p className="mt-1 text-sm text-slate-600">Choose the sending provider by message type. Save with Persist Configuration above. Passwords remain in server environment secrets.</p>
      </div>
      {loading && <p className="text-sm text-slate-500">Checking provider configuration…</p>}
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {status && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["resend", "hostinger"] as const).map((provider) => (
            <div key={provider} className="rounded-xl border border-slate-200 p-4">
              <p className="font-semibold capitalize">{provider}</p>
              <p className="text-xs text-slate-600">{status.providers[provider].configured ? "Credentials configured" : "Credentials missing — sending disabled"}</p>
              <p className="mt-1 break-all text-xs text-slate-500">{status.providers[provider].from || "No sending address configured"}</p>
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {([
          ["Transactional / onboarding", "transactionalEmailProvider", transactional],
          ["Permissioned sales email", "salesEmailProvider", sales],
        ] as const).map(([label, key, value]) => (
          <label key={key} className="space-y-2 text-sm font-medium text-slate-800">
            <span>{label}</span>
            <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3" value={value} onChange={(e) => onChange(key, e.target.value as Provider)}>
              <option value="resend">Resend</option>
              <option value="hostinger">Hostinger SMTP</option>
            </select>
          </label>
        ))}
      </div>
      {status?.providers.hostinger.quotaNote && <p className="text-xs leading-5 text-slate-600">{status.providers.hostinger.quotaNote}</p>}
      <p className="text-xs leading-5 text-amber-800">Changing the provider does not increase or bypass daily sending allowances. Hostinger sales messages require documented recipient permission. Never retry a previously failed message without checking its provider receipt.</p>
    </section>
  );
}
