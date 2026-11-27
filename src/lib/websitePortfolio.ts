/** Pure portfolio helpers. Authorization must still be enforced by RLS/API. */
export interface PortfolioSite {
  id: string;
  business_id: string;
  slug?: string | null;
  name?: string | null;
  archived_at?: string | null;
  is_primary?: boolean;
  custom_domain?: string | null;
  ssl_status?: string | null;
  status: string;
  updated_at?: string | null;
  seo?: { title?: string } | null;
}

export function siteLabel(site: PortfolioSite): string {
  return site.name?.trim() || site.seo?.title?.trim() || site.slug?.trim() || "Untitled website";
}

export function selectPortfolioSite(sites: readonly PortfolioSite[], businessId: string, siteId: string): PortfolioSite | null {
  if (!businessId || !siteId) return null;
  return sites.find(site => site.business_id === businessId && site.id === siteId) || null;
}

export function filterPortfolioSites(sites: readonly PortfolioSite[], businessId: string, query = "", status = "all"): PortfolioSite[] {
  if (!businessId) return [];
  const search = query.trim().toLowerCase();
  return sites.filter(site => site.business_id === businessId &&
    (status === "archived" ? Boolean(site.archived_at) : !site.archived_at && (status === "all" || site.status === status)) &&
    (!search || [siteLabel(site), site.slug, site.custom_domain, site.id].some(value => value?.toLowerCase().includes(search))))
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || "") || a.id.localeCompare(b.id));
}
