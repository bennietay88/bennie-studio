export const VERCEL_APEX_A = "76.76.21.21";
export const DEFAULT_VERCEL_CNAME = "cname.vercel-dns.com";
export const VERCEL_CNAME_TARGETS = [
  DEFAULT_VERCEL_CNAME,
  "cname.vercel-dns-0.com",
];

const DEFAULT_PLATFORM_HOSTS = [
  "app.bennietay.com",
  "bennietay-studio.vercel.app",
  "localhost",
  "127.0.0.1",
  "::1",
];

const DEFAULT_WAAS_ROOT_DOMAINS = ["growthos.app"];

const runtimeEnv = () =>
  typeof process !== "undefined" && process?.env
    ? (process.env as Record<string, string | undefined>)
    : {};

function splitEnvList(value?: string) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function getPlatformHosts(env: Record<string, string | undefined> = runtimeEnv()) {
  return new Set([
    ...DEFAULT_PLATFORM_HOSTS,
    ...splitEnvList(env.PLATFORM_HOSTS),
    ...splitEnvList(env.VITE_PLATFORM_HOSTS),
    ...splitEnvList(env.VERCEL_URL),
  ]);
}

export function getWaasRootDomains(env: Record<string, string | undefined> = runtimeEnv()) {
  const configured = [
    ...splitEnvList(env.WAAS_ROOT_DOMAIN),
    ...splitEnvList(env.WAAS_ROOT_DOMAINS),
    ...splitEnvList(env.VITE_WAAS_ROOT_DOMAIN),
  ];
  return configured.length ? configured : DEFAULT_WAAS_ROOT_DOMAINS;
}

export function getPrimaryVercelCname(env: Record<string, string | undefined> = runtimeEnv()) {
  return String(env.VERCEL_CNAME_TARGET || env.VITE_VERCEL_CNAME_TARGET || DEFAULT_VERCEL_CNAME)
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
}

export function getAcceptedVercelCnames(env: Record<string, string | undefined> = runtimeEnv()) {
  return Array.from(new Set([getPrimaryVercelCname(env), ...VERCEL_CNAME_TARGETS]));
}

export function normalizeDomainInput(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^\/+/, "")
    .split("/")[0]
    .split("?")[0]
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

export function isValidCustomDomain(domain: string, env?: Record<string, string | undefined>) {
  const normalized = normalizeDomainInput(domain);
  if (!normalized || normalized.length > 253) return false;
  if (normalized.includes("..") || normalized.startsWith("-") || normalized.endsWith("-")) return false;
  if (getPlatformHosts(env).has(normalized) || normalized.endsWith(".localhost")) return false;
  return /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(normalized);
}

export function getDomainLookupCandidates(host: string) {
  const normalized = normalizeDomainInput(host);
  const withoutWww = normalized.replace(/^www\./, "");
  return Array.from(new Set([normalized, withoutWww, `www.${withoutWww}`]));
}

export function classifyTenantHost(host: string, env?: Record<string, string | undefined>) {
  const normalized = normalizeDomainInput(host);
  if (!normalized || getPlatformHosts(env).has(normalized) || normalized.endsWith(".vercel.app")) {
    return { kind: "platform" as const, host: normalized };
  }

  for (const rootDomain of getWaasRootDomains(env)) {
    const suffix = `.${rootDomain}`;
    if (normalized.endsWith(suffix)) {
      const subdomain = normalized.slice(0, -suffix.length);
      if (subdomain && !["www", "app", "api", "admin"].includes(subdomain)) {
        return { kind: "subdomain" as const, host: normalized, subdomain, rootDomain };
      }
    }
  }

  return { kind: "custom_domain" as const, host: normalized, candidates: getDomainLookupCandidates(normalized) };
}
