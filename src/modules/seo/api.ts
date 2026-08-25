import { supabase } from "../../lib/supabase";
import type { SeoAdminData, SeoWorkspaceData } from "./types";

async function authenticatedRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Your session has expired. Please sign in again.");

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `SEO request failed (${response.status})`);
  return payload as T;
}

export const getSeoWorkspace = (businessId: string) =>
  authenticatedRequest<SeoWorkspaceData>(`/api/seo/workspace/${businessId}`);

export const requestSeoAudit = (projectId: string) =>
  authenticatedRequest<{ auditRun: Record<string, any>; job: Record<string, any> }>(
    `/api/seo/projects/${projectId}/audit`,
    { method: "POST", body: JSON.stringify({}) },
  );

export const createSeoTask = (opportunityId: string) =>
  authenticatedRequest<{ task: Record<string, any> }>(
    `/api/seo/opportunities/${opportunityId}/tasks`,
    { method: "POST", body: JSON.stringify({}) },
  );

export const getSeoAdmin = () => authenticatedRequest<SeoAdminData>("/api/seo/admin");

export const updateSeoProductConfig = (changes: Record<string, unknown>) =>
  authenticatedRequest<{ productConfig: Record<string, any> }>("/api/seo/admin/config", {
    method: "PATCH",
    body: JSON.stringify(changes),
  });

export const updateSeoModule = (moduleKey: string, changes: Record<string, unknown>) =>
  authenticatedRequest<{ module: Record<string, any> }>(`/api/seo/admin/modules/${moduleKey}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });

export const updateSeoPlanEntitlement = (
  planKey: string,
  moduleKey: string,
  changes: Record<string, unknown>,
) => authenticatedRequest<{ entitlement: Record<string, any> }>(
  `/api/seo/admin/entitlements/${planKey}/${moduleKey}`,
  { method: "PUT", body: JSON.stringify(changes) },
);

export const activateSeoCustomer = (input: {
  businessId: string;
  websiteId: string;
  accessMode: "included" | "addon" | "trial" | "custom";
}) => authenticatedRequest<{ project: Record<string, any> }>("/api/seo/admin/projects/activate", {
  method: "POST",
  body: JSON.stringify(input),
});

export const updateSeoCustomerAccess = (
  businessId: string,
  changes: Record<string, unknown>,
) => authenticatedRequest<{ entitlement: Record<string, any> }>(
  `/api/seo/admin/customers/${businessId}`,
  { method: "PATCH", body: JSON.stringify(changes) },
);

export const retrySeoJob = (jobId: string) =>
  authenticatedRequest<{ job: Record<string, any> }>(`/api/seo/admin/jobs/${jobId}/retry`, {
    method: "POST",
    body: JSON.stringify({}),
  });
