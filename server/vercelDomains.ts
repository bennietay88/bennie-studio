import {
  getAcceptedVercelCnames,
  getPrimaryVercelCname,
  VERCEL_APEX_A,
} from "../src/lib/tenantDomains.js";

type VercelDomainResponse = Record<string, any>;

class VercelDomainError extends Error {
  status: number;
  payload: any;

  constructor(message: string, status: number, payload?: any) {
    super(message);
    this.name = "VercelDomainError";
    this.status = status;
    this.payload = payload;
  }
}

const VERCEL_API_BASE = "https://api.vercel.com";

function getVercelConfig() {
  const token = process.env.VERCEL_TOKEN || process.env.VERCEL_API_TOKEN || "";
  const projectId = process.env.VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_NAME || process.env.VERCEL_PROJECT_SLUG || "";
  const teamId = process.env.VERCEL_TEAM_ID || "";
  const teamSlug = process.env.VERCEL_TEAM_SLUG || "";

  return {
    token: token.trim(),
    projectId: projectId.trim(),
    teamId: teamId.trim(),
    teamSlug: teamSlug.trim(),
    configured: Boolean(token.trim() && projectId.trim()),
  };
}

function buildProjectDomainUrl(domain?: string, action?: "verify") {
  const { projectId, teamId, teamSlug } = getVercelConfig();
  const encodedProject = encodeURIComponent(projectId);
  const path = domain
    ? `/v9/projects/${encodedProject}/domains/${encodeURIComponent(domain)}${action ? `/${action}` : ""}`
    : `/v9/projects/${encodedProject}/domains`;
  const url = new URL(path, VERCEL_API_BASE);
  if (teamId) url.searchParams.set("teamId", teamId);
  if (teamSlug) url.searchParams.set("slug", teamSlug);
  return url;
}

async function vercelFetch(url: URL, init: RequestInit = {}): Promise<VercelDomainResponse> {
  const { token, configured } = getVercelConfig();
  if (!configured) {
    throw new VercelDomainError("Vercel Domains API is not configured.", 500);
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `Vercel API request failed with HTTP ${response.status}`;
    throw new VercelDomainError(message, response.status, payload);
  }
  return payload;
}

export function isVercelDomainsConfigured() {
  return getVercelConfig().configured;
}

export function getVercelDnsInstructions(domain: string) {
  const isWww = domain.startsWith("www.");
  return {
    apexARecord: VERCEL_APEX_A,
    cnameRecord: getPrimaryVercelCname(),
    acceptedCnameRecords: getAcceptedVercelCnames(),
    recommended: isWww
      ? { type: "CNAME", name: "www", value: getPrimaryVercelCname() }
      : { type: "A", name: "@", value: VERCEL_APEX_A },
  };
}

export async function addVercelProjectDomain(domain: string) {
  return vercelFetch(buildProjectDomainUrl(), {
    method: "POST",
    body: JSON.stringify({ name: domain }),
  });
}

export async function getVercelProjectDomain(domain: string) {
  return vercelFetch(buildProjectDomainUrl(domain));
}

export async function verifyVercelProjectDomain(domain: string) {
  return vercelFetch(buildProjectDomainUrl(domain, "verify"), { method: "POST" });
}

export async function removeVercelProjectDomain(domain: string) {
  return vercelFetch(buildProjectDomainUrl(domain), { method: "DELETE" });
}

export async function ensureVercelProjectDomain(domain: string) {
  if (!isVercelDomainsConfigured()) {
    return {
      configured: false,
      added: false,
      verified: false,
      domain: null,
      instructions: getVercelDnsInstructions(domain),
    };
  }

  let added = false;
  try {
    await addVercelProjectDomain(domain);
    added = true;
  } catch (error: any) {
    if (![400, 409].includes(Number(error?.status))) {
      throw error;
    }
  }

  let domainRecord = await getVercelProjectDomain(domain).catch((error: any) => {
    if (Number(error?.status) === 404) return null;
    throw error;
  });

  if (domainRecord && domainRecord.verified === false) {
    domainRecord = await verifyVercelProjectDomain(domain).catch(() => domainRecord);
  }

  return {
    configured: true,
    added,
    verified: Boolean(domainRecord?.verified),
    domain: domainRecord,
    instructions: getVercelDnsInstructions(domain),
  };
}
