import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SeoAccessMode,
  SeoAccessSummary,
  SeoModuleDefinition,
  SeoResolvedModule,
  SeoWorkspaceData,
} from "../../src/modules/seo/types.js";

const EMPTY_PRICES = {
  US: { amount: 299, currency: "USD" },
  GB: { amount: 235, currency: "GBP" },
  SG: { amount: 399, currency: "SGD" },
  MY: { amount: 1299, currency: "MYR" },
};

const mergeLimits = (...values: Array<Record<string, any> | null | undefined>) =>
  Object.assign({}, ...values.filter(Boolean));

export async function resolveSeoAccess(
  admin: SupabaseClient,
  input: { businessId: string; websiteId?: string | null; planKey: string },
): Promise<SeoAccessSummary> {
  const [configResult, modulesResult, planResult, businessResult, projectResult] = await Promise.all([
    admin.from("seo_product_config").select("*").eq("id", "default").maybeSingle(),
    admin.from("seo_module_definitions").select("*").order("sort_order"),
    admin.from("seo_plan_entitlements").select("*").eq("plan_key", input.planKey),
    admin.from("seo_business_entitlements").select("*").eq("business_id", input.businessId).maybeSingle(),
    input.websiteId
      ? admin.from("seo_projects").select("*").eq("website_id", input.websiteId).maybeSingle()
      : admin.from("seo_projects").select("*").eq("business_id", input.businessId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const firstError = [configResult.error, modulesResult.error, planResult.error, businessResult.error, projectResult.error].find(Boolean);
  if (firstError) throw firstError;

  const config = configResult.data || {};
  const moduleDefinitions = (modulesResult.data || []) as SeoModuleDefinition[];
  const planEntitlements = new Map((planResult.data || []).map((item: any) => [item.module_key, item]));
  const businessEntitlement = businessResult.data;
  const project = projectResult.data;
  const overrideResult = project?.id
    ? await admin.from("seo_project_overrides").select("*").eq("project_id", project.id)
    : { data: [], error: null } as any;
  if (overrideResult.error) throw overrideResult.error;
  const overrides = new Map((overrideResult.data || []).map((item: any) => [item.module_key, item]));

  const includedPlans = Array.isArray(config.included_plan_keys) ? config.included_plan_keys : ["website_growth_partner"];
  const planIncluded = includedPlans.includes(input.planKey);
  const entitlementActive = Boolean(
    businessEntitlement &&
    ["active", "trial"].includes(businessEntitlement.status) &&
    (!businessEntitlement.expires_at || new Date(businessEntitlement.expires_at).getTime() > Date.now()),
  );
  const activated = Boolean(project && project.status === "active" && (planIncluded || entitlementActive));
  const accessMode: SeoAccessMode = planIncluded
    ? "included"
    : entitlementActive
      ? businessEntitlement.access_mode
      : "unavailable";
  const allowedBusinessModules = Array.isArray(businessEntitlement?.enabled_modules)
    ? new Set(businessEntitlement.enabled_modules)
    : null;

  const modules: SeoResolvedModule[] = moduleDefinitions.map((definition) => {
    const plan = planEntitlements.get(definition.module_key) as any;
    const override = overrides.get(definition.module_key) as any;
    const planAccess = (plan?.access_mode || (planIncluded ? "included" : "unavailable")) as SeoAccessMode;
    let enabled = Boolean(
      config.is_enabled !== false &&
      config.emergency_stop !== true &&
      activated &&
      definition.is_enabled &&
      planAccess !== "unavailable" &&
      (!allowedBusinessModules || allowedBusinessModules.has(definition.module_key)),
    );
    let source: SeoResolvedModule["source"] = plan ? "plan" : "global";
    if (allowedBusinessModules) source = "business";
    if (override && (!override.expires_at || new Date(override.expires_at).getTime() > Date.now())) {
      if (typeof override.is_enabled === "boolean") enabled = override.is_enabled && enabled;
      source = "website";
    }
    return {
      ...definition,
      enabled,
      accessMode: planAccess,
      limits: mergeLimits(config.default_limits, plan?.limits, businessEntitlement?.limit_overrides, override?.limits),
      source,
    };
  });

  return {
    productEnabled: config.is_enabled !== false,
    emergencyStop: config.emergency_stop === true,
    activated,
    accessMode,
    planKey: input.planKey,
    addonPrices: config.addon_prices || EMPTY_PRICES,
    modules,
    reason: config.emergency_stop
      ? "SEO processing is temporarily paused by the platform administrator."
      : activated
        ? undefined
        : planIncluded
          ? "SEO Growth is included but has not been activated for this website yet."
          : "SEO Growth is available as an optional managed add-on for this plan.",
  };
}

const safeRows = <T>(result: { data: T[] | null; error: any }) => {
  if (result.error) throw result.error;
  return result.data || [];
};

export async function loadSeoWorkspace(
  admin: SupabaseClient,
  input: { businessId: string },
): Promise<SeoWorkspaceData> {
  const [businessResult, websiteResult] = await Promise.all([
    admin.from("businesses").select("id,name,plan").eq("id", input.businessId).single(),
    admin.from("websites").select("id,status,updated_at").eq("business_id", input.businessId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (businessResult.error) throw businessResult.error;
  if (websiteResult.error) throw websiteResult.error;

  const access = await resolveSeoAccess(admin, {
    businessId: input.businessId,
    websiteId: websiteResult.data?.id,
    planKey: String(businessResult.data.plan || "starter"),
  });
  const projectResult = await admin.from("seo_projects").select("*").eq("business_id", input.businessId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (projectResult.error) throw projectResult.error;
  const project = projectResult.data;

  if (!project) {
    return {
      access, project: null, latestAudit: null, issues: [], opportunities: [], tasks: [], reports: [],
      keywords: [], rankings: [], competitors: [], contentItems: [], localSeoPages: [], backlinks: [], aiVisibility: [], integrations: [], usage: [],
      measuredResults: { organicLeads: null, organicClicks: null, organicImpressions: null, trackedKeywords: 0, completedTasks: 0 },
    };
  }

  const [audit, issues, opportunities, tasks, reports, keywords, rankings, competitors, content, localSeo, backlinks, visibility, integrations, usage] = await Promise.all([
    admin.from("seo_audit_runs").select("*").eq("project_id", project.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("seo_issues").select("*").eq("project_id", project.id).neq("status", "dismissed").order("last_detected_at", { ascending: false }).limit(100),
    admin.from("seo_opportunities").select("*").eq("project_id", project.id).neq("status", "dismissed").order("created_at", { ascending: false }).limit(100),
    admin.from("seo_tasks").select("*").eq("project_id", project.id).order("created_at", { ascending: false }).limit(100),
    admin.from("seo_reports").select("*").eq("project_id", project.id).order("report_month", { ascending: false }).limit(24),
    admin.from("seo_keywords").select("*").eq("project_id", project.id).order("created_at", { ascending: false }).limit(500),
    admin.from("seo_rankings").select("*").eq("project_id", project.id).order("observed_at", { ascending: false }).limit(500),
    admin.from("seo_competitors").select("*").eq("project_id", project.id).order("updated_at", { ascending: false }).limit(50),
    admin.from("seo_content_items").select("*").eq("project_id", project.id).order("updated_at", { ascending: false }).limit(100),
    admin.from("local_seo_pages").select("id,website_id,page_type,status,slug,country,state_region,city,main_service,seo_title,h1,focus_keyword,published_at,updated_at").eq("business_id", input.businessId).order("updated_at", { ascending: false }).limit(200),
    admin.from("seo_backlinks").select("*").eq("project_id", project.id).order("last_seen_at", { ascending: false }).limit(500),
    admin.from("seo_ai_visibility").select("*").eq("project_id", project.id).order("observed_at", { ascending: false }).limit(200),
    admin.from("seo_integrations").select("id,project_id,provider,status,configuration,last_synced_at,last_error,created_at,updated_at").eq("project_id", project.id),
    admin.from("seo_usage").select("*").eq("project_id", project.id).order("usage_date", { ascending: false }).limit(200),
  ]);
  if (audit.error) throw audit.error;
  const taskRows = safeRows(tasks as any) as any[];
  const keywordRows = safeRows(keywords as any) as any[];
  const integrationRows = safeRows(integrations as any) as any[];
  const gsc = integrationRows.find((item: any) => item.provider === "google_search_console" && item.status === "connected");

  return {
    access,
    project,
    latestAudit: audit.data,
    issues: safeRows(issues as any) as any,
    opportunities: safeRows(opportunities as any) as any,
    tasks: taskRows,
    reports: safeRows(reports as any) as any,
    keywords: keywordRows,
    rankings: safeRows(rankings as any) as any,
    competitors: safeRows(competitors as any) as any,
    contentItems: safeRows(content as any) as any,
    localSeoPages: safeRows(localSeo as any) as any,
    backlinks: safeRows(backlinks as any) as any,
    aiVisibility: safeRows(visibility as any) as any,
    integrations: integrationRows,
    usage: safeRows(usage as any) as any,
    measuredResults: {
      organicLeads: null,
      organicClicks: gsc ? Number(gsc.configuration?.latestClicks ?? 0) : null,
      organicImpressions: gsc ? Number(gsc.configuration?.latestImpressions ?? 0) : null,
      trackedKeywords: keywordRows.filter((item: any) => item.status === "tracked").length,
      completedTasks: taskRows.filter((item: any) => item.status === "completed").length,
    },
  };
}
