import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Provider = "resend" | "hostinger";
type ResendAccount = { id: string; name: string; from: string; updatedAt?: string | null };
type ProviderStatus = {
  providers: {
    resend: {
      configured: boolean;
      from: string | null;
      source?: "portal" | "environment";
      fallbackConfigured?: boolean;
      updatedAt?: string | null;
      accounts: ResendAccount[];
      assignments: { transactional: string | null; sales: string | null };
    };
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

export function EmailProviderSettings({ onChange }: Props) {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [resendAccountId, setResendAccountId] = useState("");
  const [resendAccountName, setResendAccountName] = useState("");
  const [resendFrom, setResendFrom] = useState("");
  const [resendApiKey, setResendApiKey] = useState("");
  const [resendSaving, setResendSaving] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [deliveryChoice, setDeliveryChoice] = useState("mixed");
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
      const { transactional, sales } = data.selection;
      const assigned = data.providers.resend.assignments;
      if (transactional === "hostinger" && sales === "hostinger") setDeliveryChoice("hostinger");
      else if (transactional === "resend" && sales === "resend" && assigned.transactional === assigned.sales && assigned.transactional) {
        setDeliveryChoice("resend:" + assigned.transactional);
      } else if (transactional === "resend" && sales === "resend" && !assigned.transactional && !assigned.sales) setDeliveryChoice("resend:fallback");
      else setDeliveryChoice("mixed");
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

  const resetResendForm = () => {
    setResendAccountId("");
    setResendAccountName("");
    setResendFrom("");
    setResendApiKey("");
  };

  const editResendAccount = (account: ResendAccount) => {
    setResendAccountId(account.id);
    setResendAccountName(account.name);
    setResendFrom(account.from);
    setResendApiKey("");
    setError("");
    setNotice("");
  };

  const saveResend = async () => {
    setError("");
    setNotice("");
    const name = resendAccountName.trim();
    const from = resendFrom.trim();
    const email = from.includes("<") ? from.match(/<([^<>]+)>$/)?.[1]?.trim() : from;
    if (!name || name.length > 80) {
      setError("Enter a name for this Resend account.");
      return;
    }
    if (!email || !emailPattern.test(email) || from.length > 320 || /[\r\n]/.test(from)) {
      setError("Enter a valid verified Resend sender address, optionally with a display name.");
      return;
    }
    if (!resendAccountId && !resendApiKey) {
      setError("Enter the Resend API key for this account.");
      return;
    }
    if (resendApiKey && !/^re_[A-Za-z0-9_-]{12,256}$/.test(resendApiKey)) {
      setError("Enter a valid Resend API key.");
      return;
    }
    setResendSaving(true);
    try {
      await adminRequest("/api/admin/email-providers/resend/accounts", {
        method: "PUT",
        body: JSON.stringify({
          ...(resendAccountId ? { accountId: resendAccountId } : {}),
          name, fromAddress: from, ...(resendApiKey ? { apiKey: resendApiKey } : {}),
        }),
      });
      resetResendForm();
      setNotice("Resend account saved securely. Its API key is encrypted in Vault and never shown again.");
      await refresh(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save Resend account.");
    } finally {
      setResendSaving(false);
    }
  };

  const selectDeliveryProvider = async (choice: string) => {
    if (!status) return;
    setError("");
    setNotice("");
    setAssignmentSaving(true);
    const oldAssignments = status.providers.resend.assignments;
    const accountId = choice.startsWith("resend:") && choice !== "resend:fallback" ? choice.slice("resend:".length) : null;
    const provider: Provider = choice === "hostinger" ? "hostinger" : "resend";
    const updated: Array<"transactional" | "sales"> = [];
    try {
      for (const purpose of ["transactional", "sales"] as const) {
        await adminRequest("/api/admin/email-providers/resend/assignments/" + purpose, {
          method: "PUT",
          body: JSON.stringify({ accountId }),
        });
        updated.push(purpose);
      }
      setDeliveryChoice(choice);
      onChange("transactionalEmailProvider", provider);
      onChange("salesEmailProvider", provider);
      setNotice("One provider selected for all outbound email. Use Persist Configuration to save the provider choice.");
      await refresh(false);
    } catch (err) {
      for (const purpose of updated.reverse()) {
        try {
          await adminRequest("/api/admin/email-providers/resend/assignments/" + purpose, {
            method: "PUT",
            body: JSON.stringify({ accountId: oldAssignments[purpose] }),
          });
        } catch { /* keep the original error visible */ }
      }
      setError(err instanceof Error ? err.message : "Could not update outbound email provider.");
      await refresh(false);
    } finally {
      setAssignmentSaving(false);
    }
  };

  const deleteResendAccount = async (account: ResendAccount) => {
    if (!window.confirm("Remove " + account.name + "? You must re-enter its API key to add it again.")) return;
    setError("");
    setNotice("");
    try {
      await adminRequest("/api/admin/email-providers/resend/accounts/" + account.id, { method: "DELETE" });
      if (resendAccountId === account.id) resetResendForm();
      setNotice(account.name + " removed.");
      await refresh(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove Resend account.");
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
  const busy = loading || saving || verifying || resendSaving || assignmentSaving;

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6" aria-label="Email provider settings">
      <div>
        <h3 className="text-lg font-bold text-slate-900">Email Providers</h3>
        <p className="mt-1 text-sm text-slate-600">
          Set up Resend accounts and Hostinger here, then choose one provider for all outbound email.
          API keys and SMTP passwords are encrypted using Supabase Vault and never returned to the browser.
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

      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <h4 className="font-semibold text-slate-900">Resend accounts</h4>
          <p className="mt-1 text-xs text-slate-600">
            Add and manage your Resend accounts here. API keys stay encrypted in Supabase Vault.
            Saving or selecting an account does not send email.
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Environment fallback: {status?.providers.resend.fallbackConfigured ? "configured" : "not configured"}.
          </p>
        </div>

        <label className="block space-y-1 text-sm font-medium text-slate-800">
          <span>All outbound email</span>
          <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3"
            value={deliveryChoice} disabled={busy || assignmentSaving}
            onChange={(event) => void selectDeliveryProvider(event.target.value)}>
            <option value="mixed" disabled>Current setup is mixed — choose one option to unify</option>
            <option value="hostinger" disabled={!hostingerReady}>Hostinger SMTP · {status?.providers.hostinger.from || "configure first"}</option>
            <option value="resend:fallback">Resend · environment fallback</option>
            {(status?.providers.resend.accounts || []).map((account) => (
              <option key={account.id} value={"resend:" + account.id}>Resend · {account.name} · {account.from}</option>
            ))}
          </select>
        </label>

        <div className="space-y-2">
          {(status?.providers.resend.accounts || []).map((account) => (
            <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{account.name}</p>
                <p className="break-all text-xs text-slate-600">{account.from}</p>
                <p className="text-xs text-slate-500">
                  Used for {(["transactional", "sales"] as const).filter((purpose) => status?.providers.resend.assignments[purpose] === account.id).map((purpose) => purpose === "sales" ? "sales follow-ups" : "transactional email").join(" and ") || "no category"}.
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => editResendAccount(account)} disabled={busy}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700">Edit</button>
                <button type="button" onClick={() => void deleteResendAccount(account)} disabled={busy}
                  className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700">Remove</button>
              </div>
            </div>
          ))}
          {!status?.providers.resend.accounts.length && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-600">
              No portal-managed accounts yet. You can keep using the environment fallback or add an account below.
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium text-slate-800">
            <span>Account name</span>
            <input type="text" value={resendAccountName} maxLength={80} disabled={busy}
              placeholder="Sales account" onChange={(event) => setResendAccountName(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-800">
            <span>Verified sender address</span>
            <input type="text" value={resendFrom} maxLength={320} disabled={busy}
              placeholder="Bennie Studio <hello@example.com>" onChange={(event) => setResendFrom(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
          </label>
        </div>
        <label className="block space-y-1 text-sm font-medium text-slate-800">
          <span>Resend API key</span>
          <input type="password" value={resendApiKey} maxLength={260} autoComplete="new-password"
            placeholder={resendAccountId ? "Leave blank to keep saved key" : "Enter a Resend API key (re_…)"}
            disabled={busy} onChange={(event) => setResendApiKey(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
        </label>
        <p className="text-xs text-slate-600">A sender address must be verified in its Resend account. The key clears after saving and is never returned to the browser.</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void saveResend()} disabled={busy}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {resendSaving ? "Saving securely…" : resendAccountId ? "Update account" : "Add Resend account"}
          </button>
          {resendAccountId && <button type="button" onClick={resetResendForm} disabled={busy}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel edit</button>}
        </div>
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
