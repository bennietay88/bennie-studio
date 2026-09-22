export type AdminModulePriority = "sell_now" | "operate_now" | "later";

export type AdminModuleDefinition = {
  id: string;
  label: string;
  description: string;
  group: string;
  priority: AdminModulePriority;
};

export const ADMIN_MODULES: AdminModuleDefinition[] = [
  { id: "growth_operations", label: "Growth Operations", description: "Run the active sales command workflow across prospects, outreach, pipeline, and accepted work.", group: "Sales & Leads", priority: "sell_now" },
  { id: "prospects", label: "Prospects", description: "Build and qualify target customer lists.", group: "Sales & Leads", priority: "sell_now" },
  { id: "website_reviews", label: "Website Reviews", description: "Prepare evidence-based reviews for prospects.", group: "Sales & Leads", priority: "sell_now" },
  { id: "outreach", label: "Outreach", description: "Create personalised outreach from prospect research.", group: "Sales & Leads", priority: "sell_now" },
  { id: "sales_pipeline", label: "Sales Pipeline", description: "Track proposals, deal stages, and won work.", group: "Sales & Leads", priority: "sell_now" },
  { id: "service_projects", label: "Service Projects", description: "Track delivery stages, owners, and blockers.", group: "Customers & Delivery", priority: "operate_now" },
  { id: "client_handover", label: "Client Handover", description: "Manage onboarding and launch handover.", group: "Customers & Delivery", priority: "operate_now" },
  { id: "operations_control", label: "Operations Control", description: "Run daily customer delivery, service projects, handover, SEO work, updates, and support from the live operations surface.", group: "Customers & Delivery", priority: "operate_now" },
  { id: "seo_management", label: "SEO Operations", description: "Control SEO delivery, customer activation, jobs, and usage.", group: "Customers & Delivery", priority: "operate_now" },
  { id: "update_queue", label: "Update Queue", description: "Manage customer website improvement requests.", group: "Customers & Delivery", priority: "operate_now" },
  { id: "support", label: "Support", description: "Respond to customer support requests.", group: "Customers & Delivery", priority: "operate_now" },
  { id: "website_templates", label: "Website Templates", description: "Create and maintain reusable website templates.", group: "Content & CMS", priority: "operate_now" },
  { id: "blog_cms", label: "Blog CMS", description: "Create, edit, review, and publish Bennie Studio platform articles.", group: "Content & CMS", priority: "operate_now" },
  { id: "policies_cms", label: "Policies CMS", description: "Maintain public policy documents.", group: "Content & CMS", priority: "operate_now" },
  { id: "local_seo", label: "Local SEO", description: "Manage customer location-page drafts, quality checks, and plan-aware local SEO delivery.", group: "Content & CMS", priority: "operate_now" },
  { id: "plans_pricing", label: "Plans & Pricing", description: "Control the commercial plans shown to customers.", group: "Plans & Revenue", priority: "sell_now" },
  { id: "revenue", label: "Revenue", description: "Review real subscription and payment performance.", group: "Plans & Revenue", priority: "operate_now" },
  { id: "partners_affiliates", label: "Partners & Affiliates", description: "Manage referral partners, commission tiers, referrals, and payout operations.", group: "Plans & Revenue", priority: "sell_now" },
  { id: "traffic_analytics", label: "Traffic Analytics", description: "Review measured acquisition and website events.", group: "Platform & System", priority: "sell_now" },
  { id: "ecosystem_architect", label: "Ecosystem Architect", description: "Review live platform structure, active customers, users, projects, and system-health navigation.", group: "Platform & System", priority: "operate_now" },
];

export const DEFAULT_ADMIN_MODULE_VISIBILITY = Object.fromEntries(
  ADMIN_MODULES.map((module) => [module.id, module.priority !== "later"]),
) as Record<string, boolean>;

export const ADMIN_MODULE_PRIORITY_LABELS: Record<AdminModulePriority, string> = {
  sell_now: "Helps sales now",
  operate_now: "Needed for delivery",
  later: "Build later",
};
