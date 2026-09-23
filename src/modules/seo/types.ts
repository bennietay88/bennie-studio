export type SeoPriority = "high" | "medium" | "low";
export type SeoSeverity = "critical" | "high" | "medium" | "low";
export type SeoJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type SeoApprovalLevel = "automatic" | "ai_human" | "manual_only";
export type SeoAccessMode = "included" | "addon" | "trial" | "custom" | "unavailable";

export type SeoModuleKey =
  | "overview"
  | "audit"
  | "crawler"
  | "technical"
  | "keywords"
  | "rankings"
  | "competitors"
  | "opportunities"
  | "content"
  | "internal_links"
  | "local_seo"
  | "backlinks"
  | "outreach"
  | "ai_visibility"
  | "strategy"
  | "tasks"
  | "implementation"
  | "reports"
  | "integrations"
  | "settings";

export interface SeoModuleDefinition {
  module_key: SeoModuleKey;
  label: string;
  description: string;
  category: string;
  is_enabled: boolean;
  customer_visible: boolean;
  default_approval_level: SeoApprovalLevel;
  default_config: Record<string, unknown>;
  sort_order: number;
}

export interface SeoResolvedModule extends SeoModuleDefinition {
  enabled: boolean;
  accessMode: SeoAccessMode;
  limits: Record<string, number | string | boolean>;
  source: "global" | "plan" | "business" | "website";
}

export interface SeoAccessSummary {
  productEnabled: boolean;
  emergencyStop: boolean;
  activated: boolean;
  accessMode: SeoAccessMode;
  planKey: string;
  addonPrices: Record<string, { amount: number; currency: string }>;
  modules: SeoResolvedModule[];
  reason?: string;
}

export interface SeoProject {
  id: string;
  business_id: string;
  website_id: string;
  name: string;
  domain: string | null;
  adapter_type: "waas" | "api_cms" | "manual";
  status: "active" | "paused" | "disabled" | "archived";
  approval_level: SeoApprovalLevel;
  settings: Record<string, unknown>;
  last_audited_at: string | null;
  next_audit_at: string | null;
}

export interface SeoHealthComponent {
  key: string;
  label: string;
  passed: boolean;
  weight: number;
  evidence: string;
}

export interface SeoAuditRun {
  id: string;
  project_id: string;
  status: SeoJobStatus;
  run_type: string;
  source_url: string | null;
  pages_crawled: number;
  health_score: number | null;
  health_explanation: {
    methodology?: string;
    components?: SeoHealthComponent[];
  };
  summary: string | null;
  metrics: Record<string, unknown>;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface SeoIssue {
  id: string;
  issue_key: string;
  module_key: SeoModuleKey;
  severity: SeoSeverity;
  title: string;
  what_we_found: string;
  why_it_matters: string;
  recommended_action: string;
  evidence: Record<string, unknown>;
  affected_urls: string[];
  status: "open" | "planned" | "in_progress" | "awaiting_approval" | "implemented" | "validated" | "dismissed";
  first_detected_at: string;
  last_detected_at: string;
}

export interface SeoOpportunity {
  id: string;
  module_key: SeoModuleKey;
  title: string;
  what_we_found: string;
  why_it_matters: string;
  recommended_action: string;
  expected_impact: string | null;
  effort: "low" | "medium" | "high" | null;
  priority: SeoPriority;
  evidence: Record<string, unknown>;
  automation_available: boolean;
  status: "detected" | "recommended" | "planned" | "in_progress" | "completed" | "dismissed";
  created_at: string;
}

export interface SeoTask {
  id: string;
  module_key: SeoModuleKey;
  task_type: string;
  priority: "urgent" | SeoPriority;
  title: string;
  description: string | null;
  recommended_action: string | null;
  status: "backlog" | "planned" | "in_progress" | "awaiting_approval" | "blocked" | "completed" | "cancelled";
  approval_state: "not_required" | "pending" | "approved" | "changes_requested" | "rejected";
  due_at: string | null;
  result: Record<string, unknown>;
  created_at: string;
}

export interface SeoReport {
  id: string;
  report_month: string;
  status: "draft" | "review" | "published";
  measured_results: Record<string, number | string | null>;
  search_performance: Record<string, number | string | null>;
  work_completed: Array<Record<string, unknown>>;
  observations: Array<Record<string, unknown>>;
  next_priorities: Array<Record<string, unknown>>;
  published_at: string | null;
}

export interface SeoKeyword {
  id: string;
  keyword: string;
  cluster: string | null;
  intent: string | null;
  location: string | null;
  target_url: string | null;
  source: string;
  status: string;
}

export interface SeoWorkspaceData {
  access: SeoAccessSummary;
  project: SeoProject | null;
  latestAudit: SeoAuditRun | null;
  issues: SeoIssue[];
  opportunities: SeoOpportunity[];
  tasks: SeoTask[];
  reports: SeoReport[];
  keywords: SeoKeyword[];
  rankings: Array<Record<string, unknown>>;
  competitors: Array<Record<string, unknown>>;
  contentItems: Array<Record<string, unknown>>;
  localSeoPages: Array<Record<string, unknown>>;
  backlinks: Array<Record<string, unknown>>;
  aiVisibility: Array<Record<string, unknown>>;
  integrations: Array<Record<string, unknown>>;
  usage: Array<Record<string, unknown>>;
  measuredResults: {
    organicLeads: number | null;
    organicClicks: number | null;
    organicImpressions: number | null;
    trackedKeywords: number;
    completedTasks: number;
  };
}

export interface SeoAdminData {
  productConfig: Record<string, any>;
  modules: SeoModuleDefinition[];
  entitlements: Array<Record<string, any>>;
  customers: Array<Record<string, any>>;
  jobs: Array<Record<string, any>>;
  usage: Array<Record<string, any>>;
}
