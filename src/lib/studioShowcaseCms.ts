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

export async function fetchStudioShowcaseCms(): Promise<StudioShowcaseCms> {
  try {
    const response = await fetch("/api/public/studio-showcases", { headers: { Accept: "application/json" } });
    if (!response.ok) return {};
    const payload = await response.json();
    return payload?.showcases && typeof payload.showcases === "object" ? payload.showcases : {};
  } catch {
    return {};
  }
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
    fetch("/api/public/studio-showcases", { headers: { Accept: "application/json" } })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (active && payload && Array.isArray(payload.portfolio)) {
          setItems(resolvePortfolioCatalog(payload.portfolio));
        }
      }).catch(() => { /* Built-in showcase content remains available offline. */ });
    return () => { active = false; };
  }, []);
  return items;
}
