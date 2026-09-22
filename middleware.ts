import { next, rewrite } from "@vercel/functions";
import { classifyTenantHost, getPlatformHosts, normalizeDomainInput } from "./src/lib/tenantDomains.js";
import { isHandoverGraceActive } from "./src/lib/billingLifecycle.js";

type TenantResolveResult =
  | { ok: true; businessId: string; websiteId: string; kind: string }
  | { ok: false; status: number; code: string; message: string };

const TENANT_SELECT =
  "id,name,custom_domain,subdomain,custom_domain_status,custom_domain_verified_at,custom_domain_suspended,custom_domain_permission_confirmed,ssl_status,status,subscription_status,subscription_grace_until,handover_grace_until";

function jsonError(status: number, code: string, message: string) {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function supabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

function hasRequiredSupabaseEnv() {
  return Boolean(process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function fetchSupabase(path: string) {
  const url = new URL(path, `${process.env.VITE_SUPABASE_URL}/rest/v1/`);
  const response = await fetch(url, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`SUPABASE_HTTP_${response.status}`);
  return response.json();
}

function subscriptionIsAllowed(business: any) {
  const status = String(business.subscription_status || "").toLowerCase();
  const graceUntil = business.subscription_grace_until ? new Date(business.subscription_grace_until).getTime() : 0;
  return status === "active" || (graceUntil > Date.now() && ["past_due", "trialing", "grace"].includes(status)) || isHandoverGraceActive(business.handover_grace_until);
}

function validateBusinessForHost(business: any, kind: string): TenantResolveResult | null {
  if (!business) return { ok: false, status: 404, code: "DOMAIN_NOT_FOUND", message: "Domain not found." };
  const handoverGraceActive = isHandoverGraceActive(business.handover_grace_until);
  if (business.status !== "active" && !handoverGraceActive) {
    return { ok: false, status: 403, code: business.status === "suspended" ? "BUSINESS_SUSPENDED" : "BUSINESS_INACTIVE", message: "This website is not available." };
  }
  if (!subscriptionIsAllowed(business)) {
    return { ok: false, status: 402, code: "SUBSCRIPTION_INACTIVE", message: "This website is not available." };
  }
  if (kind === "custom_domain") {
    if (business.custom_domain_suspended) return { ok: false, status: 403, code: "DOMAIN_SUSPENDED", message: "This domain is not available." };
    if (!business.custom_domain_permission_confirmed) return { ok: false, status: 403, code: "DOMAIN_PERMISSION_REQUIRED", message: "This domain is not available." };
    if (business.custom_domain_status !== "connected" || !business.custom_domain_verified_at) {
      return { ok: false, status: 409, code: "DOMAIN_NOT_VERIFIED", message: "This domain is not verified yet." };
    }
    if (business.ssl_status !== "issued") return { ok: false, status: 409, code: "SSL_PENDING", message: "SSL is still being prepared for this domain." };
  }
  return null;
}

async function resolveTenantHost(host: string): Promise<TenantResolveResult> {
  if (!hasRequiredSupabaseEnv()) {
    return { ok: false, status: 503, code: "TENANT_RESOLVER_NOT_CONFIGURED", message: "Tenant routing is not configured." };
  }

  const tenant = classifyTenantHost(host, process.env as Record<string, string | undefined>);
  if (tenant.kind === "platform") return { ok: false, status: 404, code: "DOMAIN_NOT_FOUND", message: "Domain not found." };

  const businesses =
    tenant.kind === "subdomain"
      ? await fetchSupabase(`businesses?select=${TENANT_SELECT}&subdomain=eq.${encodeURIComponent(tenant.subdomain)}&limit=1`)
      : await fetchSupabase(`businesses?select=${TENANT_SELECT}&custom_domain=in.(${tenant.candidates.join(",")})&limit=3`);

  const business =
    tenant.kind === "custom_domain"
      ? (businesses || []).find((item: any) => tenant.candidates.includes(normalizeDomainInput(item.custom_domain || "")))
      : businesses?.[0];

  const businessFailure = validateBusinessForHost(business, tenant.kind);
  if (businessFailure) return businessFailure;

  const websites = await fetchSupabase(
    `websites?select=id,business_id,status&business_id=eq.${encodeURIComponent(business.id)}&status=eq.published&order=updated_at.desc&limit=1`,
  );
  const website = websites?.[0];
  if (!website) return { ok: false, status: 404, code: "WEBSITE_NOT_PUBLISHED", message: "This domain is not connected to a published website yet." };
  if (website.business_id !== business.id) return { ok: false, status: 409, code: "WEBSITE_BUSINESS_MISMATCH", message: "This domain is not available." };

  return { ok: true, businessId: business.id, websiteId: website.id, kind: tenant.kind };
}

export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const host = normalizeDomainInput(request.headers.get("host") || url.hostname);

  if (!host || getPlatformHosts(process.env as Record<string, string | undefined>).has(host)) {
    return next();
  }

  const result: TenantResolveResult = await resolveTenantHost(host).catch((error) => {
    console.error("Tenant middleware resolve failed:", { host, error: error?.message || error });
    return { ok: false as const, status: 500, code: "TENANT_RESOLVE_FAILED", message: "This website is not available." };
  });
  if (result.ok === false) return jsonError(result.status, result.code, result.message);

  const headers = new Headers(request.headers);
  headers.set("x-bts-tenant-host", host);
  headers.set("x-bts-business-id", result.businessId);
  headers.set("x-bts-website-id", result.websiteId);
  headers.set("x-bts-tenant-kind", result.kind);
  url.searchParams.set("__tenantBusinessId", result.businessId);
  url.searchParams.set("__tenantWebsiteId", result.websiteId);

  return rewrite(url, { request: { headers } });
}

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!api/|assets/|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
