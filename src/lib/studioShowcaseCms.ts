import { useEffect, useState } from "react";

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
