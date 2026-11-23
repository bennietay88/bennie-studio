/**
 * Vercel preview deployments intentionally do not receive production DB or
 * payment credentials. Only published, unauthenticated marketing GETs may
 * reuse the canonical site's public output. Never forward incoming headers,
 * cookies, authorization, arbitrary query strings or non-GET requests.
 */
export const PREVIEW_MARKETING_READ_PATHS = new Set([
  "/api/public/pricing",
  "/api/public/site-config",
  "/api/public/platform-site-cms",
  "/api/public/studio-showcases",
]);

const CANONICAL_PUBLISHED_ORIGIN = "https://app.bennietay.com";

export function isPreviewPublicRead(
  environment: { VERCEL_ENV?: string; E2E_TEST?: string },
  method: string,
  pathname: string,
  hasDatabaseConfiguration: boolean,
): boolean {
  return environment.VERCEL_ENV === "preview"
    && environment.E2E_TEST !== "true"
    && !hasDatabaseConfiguration
    && method === "GET"
    && PREVIEW_MARKETING_READ_PATHS.has(pathname);
}

export async function fetchPublishedPreviewContent(
  pathname: string,
  requester: typeof fetch = fetch,
): Promise<unknown> {
  if (!PREVIEW_MARKETING_READ_PATHS.has(pathname)) {
    throw new Error("This endpoint is not an allowlisted public read");
  }

  const uri = new URL(pathname, CANONICAL_PUBLISHED_ORIGIN);
  if (pathname === "/api/public/pricing") uri.searchParams.set("market", "INTL");

  const response = await requester(uri.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Published marketing content is unavailable");
  const body = await response.text();
  if (body.length > 1_000_000) throw new Error("Published marketing response exceeded size limit");
  const content: unknown = JSON.parse(body);
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    throw new Error("Invalid public marketing response");
  }

  const envelope = content as Record<string, unknown>;
  if (pathname === "/api/public/pricing" && !Array.isArray(envelope.products)) {
    throw new Error("Published pricing was not verified");
  }
  if (pathname === "/api/public/studio-showcases" && (typeof envelope.showcases !== "object" || envelope.showcases === null)) {
    throw new Error("Published examples were not verified");
  }
  if (pathname === "/api/public/platform-site-cms" && !Object.hasOwn(envelope, "content")) {
    throw new Error("Published CMS content was not verified");
  }
  if (pathname === "/api/public/site-config" && !Object.hasOwn(envelope, "platform")) {
    throw new Error("Published business configuration was not verified");
  }
  return content;
}
