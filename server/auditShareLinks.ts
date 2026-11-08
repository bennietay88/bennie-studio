import crypto from "node:crypto";

/**
 * A 128-bit unguessable bearer code. Share links are private to anyone who
 * has the link. Never derive the code from the job ID, email, or prospect name.
 */
export const AUDIT_SHARE_CODE_PATTERN = /^[A-Za-z0-9_-]{22}$/;

export function createAuditShareCode(): string {
  return crypto.randomBytes(16).toString("base64url");
}

export function isAuditShareCode(value: unknown): value is string {
  return typeof value === "string" && AUDIT_SHARE_CODE_PATTERN.test(value);
}

/** Preserve previously issued UUID + 64-hex-key links for old audit jobs. */
export function auditReportPath(job: { id: string; payload?: Record<string, any> | null }): string {
  const code = job.payload?.shareCode;
  if (isAuditShareCode(code)) return `/review/${code}`;
  const key = String(job.payload?.reportAccessKey || "");
  return `/website-audit?report=${encodeURIComponent(job.id)}&key=${encodeURIComponent(key)}`;
}
