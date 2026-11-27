/** Website slots are independent of the existing project and page entitlements. */
export function resolveWebsiteLimit(value: unknown): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 1000 ? value : 1;
}
export interface WebsiteCapacity {
  websiteLimit: number;
  websitesUsed: number;
  websitesRemaining: number;
  projectLimit: number | null;
  pagesPerWebsite: number;
  locationPagesPerWebsite: number;
}
export function websiteCapacity(input: {
  websiteLimit?: unknown; websitesUsed: number; projectLimit?: number | null;
  pagesPerWebsite: number; locationPagesPerWebsite: number;
}): WebsiteCapacity {
  const websiteLimit = resolveWebsiteLimit(input.websiteLimit);
  const websitesUsed = Math.max(0, Math.floor(input.websitesUsed));
  return {
    websiteLimit, websitesUsed, websitesRemaining: Math.max(0, websiteLimit - websitesUsed),
    projectLimit: input.projectLimit ?? null, pagesPerWebsite: input.pagesPerWebsite,
    locationPagesPerWebsite: input.locationPagesPerWebsite
  };
}
