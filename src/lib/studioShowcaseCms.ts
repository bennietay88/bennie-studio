import { useEffect, useSyncExternalStore } from "react";
import { createPublicContentResource } from "./publicContentResource";
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

type ShowcaseSnapshot={showcases:StudioShowcaseCms;items:PortfolioItem[]};
const showcaseResource=createPublicContentResource<ShowcaseSnapshot>({showcases:{},items:DEFAULT_PORTFOLIO_ITEMS},async signal=>{
 const response=await fetch("/api/public/studio-showcases",{headers:{Accept:"application/json"},signal});
 if(!response.ok)throw new Error("Published showcases unavailable");
 const payload=await response.json();
 return {showcases:payload?.showcases&&typeof payload.showcases==="object"?payload.showcases:{},items:Array.isArray(payload?.portfolio)?resolvePortfolioCatalog(payload.portfolio):DEFAULT_PORTFOLIO_ITEMS};
});
export const preloadStudioShowcaseCms=()=>showcaseResource.ensure();
export async function fetchStudioShowcaseCms():Promise<StudioShowcaseCms>{return (await preloadStudioShowcaseCms()).showcases;}
function useShowcaseSnapshot(){
 const snapshot=useSyncExternalStore(showcaseResource.subscribe,showcaseResource.getSnapshot,showcaseResource.getSnapshot);
 useEffect(()=>{void preloadStudioShowcaseCms();},[]);
 return snapshot;
}
export function useStudioShowcaseCms(){return useShowcaseSnapshot().showcases;}

export function useStudioShowcaseCatalog<T extends { slug: string; colour?: string }>(base: readonly T[]) {
  const cms = useStudioShowcaseCms();
  return base.map((study) => {
    const config = cms[study.slug];
    const merged = mergeCmsValue(study, config?.study) as T;
    return { ...merged, colour: config?.theme?.accent || merged.colour };
  });
}

/** Portfolio catalog shares the existing read-only studio showcase endpoint. */
export function useStudioPortfolioCatalog(): PortfolioItem[] {return useShowcaseSnapshot().items;}
