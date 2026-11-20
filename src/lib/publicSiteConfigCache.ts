/**
 * Deduplicate short-lived public configuration requests across the application shell
 * and marketing pages. Never persist server configuration indefinitely in localStorage.
 * A failed request is not cached; the next navigation may retry normally.
 */
let request: Promise<Record<string, any> | null> | null = null;
let cached: Record<string, any> | null = null;
let expiresAt = 0;
const CACHE_MS = 30_000;

export async function getPublicSiteConfig(): Promise<Record<string, any> | null> {
  if (cached && Date.now() < expiresAt) return cached;
  if (request) return request;
  request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch("/api/public/site-config", { signal: controller.signal });
      if (!response.ok) throw new Error("Public site settings unavailable");
      const result = await response.json();
      if (!result || typeof result !== "object") return null;
      cached = result as Record<string, any>;
      expiresAt = Date.now() + CACHE_MS;
      return cached;
    } finally {
      clearTimeout(timeout);
      request = null;
    }
  })();
  return request;
}
