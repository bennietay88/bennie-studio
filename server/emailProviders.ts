import nodemailer from "nodemailer";

export type EmailProvider = "resend" | "hostinger";
export type EmailPurpose = "transactional" | "sales";

export function selectEmailProvider(value: unknown): EmailProvider {
  return value === "hostinger" ? "hostinger" : "resend";
}

/** Only metadata is returned to the browser. Passwords and API keys never leave the server. */
export function emailProviderStatus(env: NodeJS.ProcessEnv = process.env) {
  const hostinger = hostingerConfiguration(env);
  return {
    resend: {
      configured: Boolean(env.RESEND_API_KEY?.trim() && env.RESEND_FROM_EMAIL?.trim()),
      from: env.RESEND_FROM_EMAIL || null,
    },
    hostinger: {
      configured: hostinger.configured,
      from: hostinger.user || null,
      smtpHost: "smtp.hostinger.com",
      smtpPort: hostinger.port,
      quotaNote: "Review mailbox limits and rolling 24-hour usage in Hostinger hPanel. No automatic quota bypass or fallback.",
    },
  };
}

export function hostingerConfiguration(env: NodeJS.ProcessEnv = process.env) {
  const user = String(env.HOSTINGER_SMTP_USER || "").trim();
  const password = String(env.HOSTINGER_SMTP_PASSWORD || "");
  const from = String(env.HOSTINGER_FROM_EMAIL || user).trim();
  const port = Number(env.HOSTINGER_SMTP_PORT || 465);
  const configured = Boolean(
    user && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user)
    && password && !password.includes("TODO")
    && from.toLowerCase() === user.toLowerCase()
    && (port === 465 || port === 587),
  );
  return { configured, user, password, from, port };
}

export type HostingerMailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  bcc?: string;
  headers?: Record<string, string>;
};

/**
 * SMTP only confirms the remote server accepted a message, not inbox delivery.
 * Delivery may be uncertain after a connection drop; callers must never auto-retry.
 */
export async function sendHostingerMail(
  input: HostingerMailInput,
  env: NodeJS.ProcessEnv = process.env,
  reserveQuota?: (mailbox: string) => Promise<boolean>,
): Promise<{ id: string }> {
  const config = hostingerConfiguration(env);
  if (!config.configured) throw new Error("HOSTINGER_CONFIG_ERROR");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.to)) throw new Error("INVALID_EMAIL_RECIPIENT");
  if (!reserveQuota) throw new Error("EMAIL_QUOTA_TRACKER_UNAVAILABLE");
  // Reserve conservatively: an attempted SMTP transaction may have succeeded despite a timeout.
  if (!(await reserveQuota(config.user))) throw new Error("EMAIL_RATE_LIMITED");

  const smtp = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port === 587,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { servername: "smtp.hostinger.com", minVersion: "TLSv1.2", rejectUnauthorized: true },
  });
  try {
    const result = await smtp.sendMail({
      from: { name: "Bennie Studio", address: config.from },
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      bcc: input.bcc,
      headers: input.headers,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    // A successful SMTP response still does not establish recipient inbox delivery.
    if (!result.messageId || !result.accepted.some((address) => address.toLowerCase() === input.to.toLowerCase())) {
      throw new Error("HOSTINGER_ACCEPTANCE_UNCERTAIN");
    }
    return { id: result.messageId };
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "HOSTINGER_ACCEPTANCE_UNCERTAIN") throw error;
    // Do not expose the SMTP server response; it can contain a recipient or mailbox identifier.
    const code = typeof error === "object" && error !== null && "responseCode" in error
      ? Number((error as { responseCode?: number }).responseCode)
      : 0;
    if (code === 421 || code === 450 || code === 451 || code === 452) throw new Error("EMAIL_RATE_LIMITED");
    if (code === 535 || code === 534) throw new Error("HOSTINGER_AUTH_ERROR");
    throw new Error("HOSTINGER_DELIVERY_UNCERTAIN");
  } finally {
    smtp.close();
  }
}

export function classifyResendSendError(error: unknown): {
  category: "quota" | "throttled" | "sender" | "authentication" | "provider";
  status: number;
  code: string;
} {
  const e = (error && typeof error === "object") ? error as Record<string, unknown> : {};
  const status = Number(e.statusCode || e.status || 0);
  const code = String(e.name || e.code || "unknown").slice(0, 64).toLowerCase();
  const category = status === 429 || /rate_limit|throttl/.test(code) ? "throttled"
    : /quota|limit_exceeded|daily_limit/.test(code) ? "quota"
    : status === 401 || /auth|invalid_api_key/.test(code) ? "authentication"
    : status === 403 || /domain|sender|not_verified/.test(code) ? "sender"
    : "provider";
  return { category, status, code };
}
