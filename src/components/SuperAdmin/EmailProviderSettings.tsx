import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Provider = "resend" | "hostinger";
type ProviderStatus = {
  providers: {
    resend: { configured: boolean; from: string | null };
    hostinger: {
      configured: boolean;
      from: string | null;
      smtpPort: number;
      quotaNote: string;
      updatedAt?: string | null;
    };
  };
  selection: { transactional: Provider; sales: Provider };
};

type Props = {
  transactional: Provider;
  sales: Provider;
  onChange: (key: "transactionalEmailProvider" | "salesEmailProvider", value: Provider) => void;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function adminRequest(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Your admin session has expired. Please sign in again.");
  const response = await fetch(path, {
    ...options,
    cache: "no-store",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: "Bearer " + session.access_token,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "The email provider request failed.");
  return body;
}

export function EmailProviderSettings({ transactional, sales, onChange }: Props) {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [mailbox, setMailbox] = useState("");
  const [password, setPassword] = useState("");
  const [port, setPort] = useState<465 | 587>(465);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verificationResult, setVerificationResult] = useState("");

  const refresh = useCallback(async (prefill: boolean) => {
    const data = await adminRequest("/api/admin/email-providers/status") as ProviderStatus;
    setStatus(data);
    if (prefill) {
      setMailbox(data.providers.hostinger.from || "");
      setPort(data.providers.hostinger.smtpPort === 587 ? 587 : 465);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void refresh(true).catch((err) => { if (active) setError(err instanceof Error ? err.message : "Provider status unavailable."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  const saveMailbox = async () => {
    setError("");
    setNotice("");
    setVerificationResult("");
    const value = mailbox.trim().toLowerCase();
    if (!emailPattern.test(value) || value.length > 254) {
      setError("Enter a valid Hostinger mailbox address.");
      return;
    }
    if (!status?.providers.hostinger.configured && !password) {
      setError("Enter the mailbox password to set up Hostinger for the first time.");
      return;
    }
    setSaving(true);
    try {
      await adminRequest("/api/admin/email-providers/hostinger", {
        method: "PUT",
        body: JSON.stringify({
          smtpUser: value,
          fromEmail: value,
          smtpPort: port,
          ...(password ? { password } : {}),
        }),
      });
      setPassword("");
      setNotice("Hostinger settings saved securely. Test the connection before selecting this provider.");
      await refresh(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save Hostinger settings.");
    } finally {
      setSaving(false);
    }
  };

  const verifyConnection = async () => {
    setVerifying(true);
    setError("");
    setVerificationResult("");
    try {
      await adminRequest("/api/admin/email-providers/hostinger/verify", { method: "POST" });
      setVerificationResult("SMTP authentication and TLS verified. No email was sent.");
    } catch (err) {
      setVerificationResult(err instanceof Error ? err.message : "Hostinger connection failed.");
    } finally {
      setVerifying(false);
    }
  };

  const hostingerReady = Boolean(status?.providers.hostinger.configured);
  const busy = loading || saving || verifying;

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6" aria-label="Email provider settings">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Email Providers</h3>
        <p className="mt-1 text-sm text-slate-600">
          Set up Hostinger directly in this portal, then choose the provider for each permitted message category.
          The SMTP password is encrypted using Supabase Vault, not stored in the visible settings JSON.
        </p>
      </div>
      {loading && <p className="text-sm text-slate-500">Loading email provider configuration…</p>}
      {error && <p role="alert" className="text-sm font-medium text-rose-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
      {status && (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["resend", "hostinger"] as const).map((provider) => (
            <div key={provider} className="rounded-xl border border-slate-200 p-4">
              <p className="font-semibold capitalize">{provider}</p>
              <p className="text-xs text-slate-600">
                {status.providers[provider].configured ? "Configured" : "Not configured"}
              </p>
              <p className="mt-1 break-all text-xs text-slate-500">
                {status.providers[provider].from || "No sender configured"}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <h4 className="font-semibold text-slate-900">Hostinger SMTP mailbox</h4>
          <p className="mt-1 text-xs text-slate-600">
            Host: smtp.hostinger.com. Your sender address will match your Hostinger mailbox login.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-800">
            <span>Mailbox email / SMTP username</span>
            <input type="email" value={mailbox} autoComplete="username" maxLength={254}
              placeholder="hello@example.com" disabled={busy}
              onChange={(event) => setMailbox(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-800">
            <span>SMTP port</span>
            <select value={port} disabled={busy}
              onChange={(event) => setPort(Number(event.target.value) === 587 ? 587 : 465)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value={465}>465 (SSL/TLS)</option>
              <option value={587}>587 (STARTTLS)</option>
            </select>
          </label>
        </div>
        <label className="block space-y-1 text-sm font-medium text-slate-800">
          <span>SMTP mailbox password</span>
          <input type="password" value={password} autoComplete="new-password"
            placeholder={hostingerReady ? "Leave blank to keep existing password" : "Enter mailbox password"}
            disabled={busy} maxLength={1024}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
        </label>
        <p className="text-xs text-slate-600">After saving, the password field clears and the saved secret is never returned to your browser.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void saveMailbox()} disabled={busy}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "Saving securely…" : "Save Hostinger settings"}
          </button>
          <button type="button" onClick={() => void verifyConnection()} disabled={busy || !hostingerReady}
            className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-800 disabled:cursor-not-allowed disabled:opacity-50">
            {verifying ? "Testing SMTP…" : "Test connection"}
          </button>
          {verificationResult && <p role="status" className="text-sm text-slate-700">{verificationResult}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {([
          ["Customer onboarding", "transactionalEmailProvider", transactional],
          ["Permissioned sales email", "salesEmailProvider", sales],
        ] as const).map(([label, key, value]) => (
          <label key={key} className="space-y-2 text-sm font-medium text-slate-800">
            <span>{label}</span>
            <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3" value={value}
              disabled={loading}
              onChange={(event) => onChange(key, event.target.value as Provider)}>
              <option value="resend">Resend</option>
              <option value="hostinger" disabled={!hostingerReady}>Hostinger SMTP {!hostingerReady ? "(configure first)" : ""}</option>
            </select>
          </label>
        ))}
      </div>
      <p className="text-xs leading-5 text-slate-600">
        Save provider selection using <strong>Persist Configuration</strong> in the parent settings page.
        Resend API and Hostinger SMTP count messages separately, even if they use the same sender address.
        Hostinger usage includes messages sent through Webmail and other SMTP clients.
      </p>
      <p className="text-xs leading-5 text-amber-800">
        No automatic switching to bypass usage limits. Sending must comply with each provider's acceptable-use rules.
        Reconcile uncertain previous sends before retrying.
      </p>
    </section>
  );
}
