export const STAFF_PERMISSIONS = [
  { id: "prospects", label: "Prospecting", description: "Manage prospects, audits, previews, and outreach." },
  { id: "sales", label: "Sales Pipeline", description: "Manage proposals, deals, and prospect conversion." },
  { id: "delivery", label: "Website Delivery", description: "Manage projects, launch checks, and client handover." },
  { id: "approvals", label: "Customer Approvals", description: "Request and manage customer approvals." },
  { id: "support", label: "Customer Support", description: "Manage support tickets and update requests." },
  { id: "customer_health", label: "Customer Health", description: "Review retention risks and customer activity." },
  { id: "billing", label: "Billing Operations", description: "Review payment and subscription lifecycle events." },
  { id: "finance", label: "Finance Records", description: "Review operational finance records and accountant exceptions." },
  { id: "activity_logs", label: "Activity History", description: "Review operational audit history." },
] as const;

export type StaffPermissionId = (typeof STAFF_PERMISSIONS)[number]["id"];

export const DEFAULT_PLATFORM_STAFF_PERMISSIONS: StaffPermissionId[] = [
  "prospects",
  "sales",
  "delivery",
  "approvals",
  "support",
  "customer_health",
  "finance",
];

export const ADMIN_TAB_PERMISSIONS: Record<string, StaffPermissionId> = {
  inbound_leads: "sales",
  sales_home: "sales",
  prospect_explorer: "prospects",
  neural_auditor: "prospects",
  outreach_lab: "prospects",
  sales_automation: "sales",
  proposals_deals: "sales",
  projects: "delivery",
  launch_audit: "delivery",
  client_onboarding: "delivery",
  support: "support",
  update_requests: "support",
  operations: "customer_health",
  finance: "finance",
};
