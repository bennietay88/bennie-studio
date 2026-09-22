import React from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { MARKETING_PRO_PLAN_CONTROLS } from "../../constants/marketingPro";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";

type PlanRow = {
  id: string;
  slug: string;
  name: string;
  enabled_features: string[] | null;
  is_active: boolean | null;
  sort_order: number | null;
};

export function MarketingPlanEntitlements() {
  const navigate = useNavigate();
  const [plans, setPlans] = React.useState<PlanRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadPlans = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("plans")
          .select("id,slug,name,enabled_features,is_active,sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        if (error) throw error;
        setPlans((data || []) as PlanRow[]);
      } catch (error) {
        console.error("Unable to load Marketing Pro plan entitlements:", error);
      } finally {
        setLoading(false);
      }
    };

    void loadPlans();

    const channel = supabase
      .channel("marketing-pro-plan-entitlements")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "plans" },
        () => void loadPlans(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="rounded-[2rem] p-8">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="font-black italic uppercase tracking-tight text-slate-900">
            Marketing Pro plan entitlements
          </h3>
          <p className="mt-1 max-w-3xl text-xs font-medium leading-5 text-slate-500">
            Marketing Pro has no separate enable/disable layer. A capability is enabled for a customer only when their Bennie Studio plan includes the matching feature entitlement.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/admin/plans")}
          className="w-fit rounded-xl bg-white font-bold"
        >
          Manage Plans & Pricing
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="py-10 text-sm font-semibold text-slate-500">Loading plan entitlements…</div>
      ) : (
        <div className="mt-6 grid gap-4">
          {MARKETING_PRO_PLAN_CONTROLS.map((capability) => (
            <div key={capability.id} className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">{capability.title}</p>
                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                      {String(capability.entitlementFeatureId).replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{capability.description}</p>
                </div>

                <div className="flex flex-wrap gap-2 xl:max-w-[55%] xl:justify-end">
                  {plans.map((plan) => {
                    const enabled = Array.isArray(plan.enabled_features)
                      && plan.enabled_features.includes(capability.entitlementFeatureId);
                    return (
                      <Badge
                        key={plan.id}
                        variant="outline"
                        className={enabled
                          ? "gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "gap-1.5 border-slate-200 bg-slate-50 text-slate-500"}
                      >
                        {enabled ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {plan.name}: {enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
