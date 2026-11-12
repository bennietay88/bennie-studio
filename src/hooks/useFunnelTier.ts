import React from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import type { FunnelLimits, FunnelTier } from "../lib/funnelTiers";
import { LEGACY_FUNNEL_LIMITS } from "../lib/funnelTiers";

export type FunnelAccessState = {
  tier: FunnelTier | "none";
  status: string;
  active: boolean;
  enabled: boolean;
  monthlyUsd: number;
  limits: FunnelLimits;
  cancelAtPeriodEnd?: boolean;
};
// Client and server rollout switches must be enabled together only after schema activation.
const UNIFIED_FUNNEL_TIERS_UI_ENABLED = import.meta.env.VITE_UNIFIED_FUNNEL_TIERS_ENABLED === "true";
const LEGACY_ACCESS: FunnelAccessState = {
  tier: "legacy", status: "active", active: true, enabled: false, monthlyUsd: 19,
  limits: LEGACY_FUNNEL_LIMITS,
};
export function useFunnelTier() {
  const { profile } = useAuth();
  const [access, setAccess] = React.useState<FunnelAccessState | null>(UNIFIED_FUNNEL_TIERS_UI_ENABLED ? null : LEGACY_ACCESS);
  const [loading, setLoading] = React.useState(UNIFIED_FUNNEL_TIERS_UI_ENABLED);
  const refresh = React.useCallback(async () => {
    if (!UNIFIED_FUNNEL_TIERS_UI_ENABLED) { setAccess(LEGACY_ACCESS); setLoading(false); return; }
    if (profile?.role !== "business_admin") { setAccess(null); setLoading(false); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setAccess(null); return; }
      const response = await fetch("/api/customer/funnel-tier", {
        headers: { Authorization: "Bearer " + session.access_token }, cache: "no-store",
      });
      if (!response.ok) throw new Error("Unable to load your funnel plan.");
      setAccess(await response.json());
    } catch (error) {
      console.warn("Funnel plan unavailable:", error);
      // Fail closed: a failed tier lookup must not grant premium controls.
      setAccess(null);
    } finally { setLoading(false); }
  }, [profile?.role, profile?.businessId]);
  React.useEffect(() => { void refresh(); }, [refresh]);
  return { access, loading, refresh, legacyLimits: LEGACY_FUNNEL_LIMITS };
}