import { useEffect, useState } from "react";
import { DEFAULT_PORTFOLIO_ITEMS, resolvePortfolioCatalog, type PortfolioItem } from "./portfolioCatalog";

export type StudioShowcaseCmsEntry = {
  study?: Record<string, unknown>;
  preview?: {
    content?: Record<string, unknown>;
    pages?: Record<string, unknown>;
  };
  theme?: { accent?: string };
};

export type StudioShowcaseCms = Record<string, StudioShowcaseCmsEntry>;

export function mergeCmsValue<T>(base: T, override: unknown): T {
  if (override === null || override === undefined) return base;
  if (Array.isArray(override)) return override as T;
  if (Array.isArray(base) || typeof base !== "object" || base === null || typeof override !== "object") {
    return override as T;
  }

  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(override as Record<string, unknown>)) {
    result[key] = key in result ? mergeCmsValue(result[key], value) : value;
  }
  return result as T;
}

type PublishedShowcasePayload = { showcases?: StudioShowcaseCms; portfolio?: unknown[] };
let pendingShowcases: Promise<PublishedShowcasePayload | null> | null = null;
let cachedShowcases: PublishedShowcasePayload | null = null;
let showcaseExpiresAt = 0;

// Public published content only; never cache draft or authenticated responses.
function fetchPublishedShowcases(): Promise<PublishedShowcasePayload | null> {
  if (cachedShowcases && Date.now() < showcaseExpiresAt) return Promise.resolve(cachedShowcases);
  if (pendingShowcases) return pendingShowcases;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const request = fetch("/api/public/studio-showcases", { headers: { Accept: "application/json" }, signal: controller.signal })
    .then(async response => {
      if (!response.ok) return null;
      const payload = await response.json();
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
      cachedShowcases = payload as PublishedShowcasePayload;
      showcaseExpiresAt = Date.now() + 60_000;
      return cachedShowcases;
    }).catch(() => null).finally(() => {
      clearTimeout(timeout);
      if (pendingShowcases === request) pendingShowcases = null;
    });
  pendingShowcases = request;
  return request;
}

export async function fetchStudioShowcaseCms(): Promise<StudioShowcaseCms> {
  const payload = await fetchPublishedShowcases();
  return payload?.showcases && typeof payload.showcases === "object" ? payload.showcases : {};
}
export function useStudioShowcaseCms() {
  const [cms, setCms] = useState<StudioShowcaseCms>({});
  useEffect(() => {
    let active = true;
    fetchStudioShowcaseCms().then((value) => { if (active) setCms(value); });
    return () => { active = false; };
  }, []);
  return cms;
}

export function useStudioShowcaseCatalog<T extends { slug: string; colour?: string }>(base: readonly T[]) {
  const cms = useStudioShowcaseCms();
  return base.map((study) => {
    const config = cms[study.slug];
    const merged = mergeCmsValue(study, config?.study) as T;
    return { ...merged, colour: config?.theme?.accent || merged.colour };
  });
}

/** Portfolio catalog shares the existing read-only studio showcase endpoint. */
export function useStudioPortfolioCatalog(): PortfolioItem[] {
  const [items, setItems] = useState<PortfolioItem[]>(DEFAULT_PORTFOLIO_ITEMS);
  useEffect(() => {
    let active = true;
    fetchPublishedShowcases()
      .then((payload) => {
        if (active && payload && Array.isArray(payload.portfolio)) {
          setItems(resolvePortfolioCatalog(payload.portfolio));
        }
      }).catch(() => { /* Built-in showcase content remains available offline. */ });
    return () => { active = false; };
  }, []);
  return items;
}
