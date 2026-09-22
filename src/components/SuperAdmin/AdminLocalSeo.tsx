import React from "react";
import { supabase } from "../../lib/supabase";
import LocalSeoDashboard from "../LocalSeoDashboard";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { MapPin } from "lucide-react";

type BusinessOption = {
  id: string;
  name: string;
  plan?: string | null;
  status?: string | null;
  location?: string | null;
  admin_notes?: string | null;
  owner_id?: string | null;
  subscription_status?: string | null;
};

export function AdminLocalSeo() {
  const [businesses, setBusinesses] = React.useState<BusinessOption[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = React.useState("");
  const [planFeatures, setPlanFeatures] = React.useState<Record<string, string[]>>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [businessRes, planRes] = await Promise.all([
          supabase
            .from("businesses")
            .select("id,name,plan,status,location,admin_notes,owner_id,subscription_status")
            .order("name", { ascending: true }),
          supabase
            .from("plans")
            .select("slug,enabled_features")
            .eq("is_active", true),
        ]);

        const nextBusinesses = ((businessRes.data || []) as BusinessOption[]).filter((business) => {
          const notes = String(business.admin_notes || "");
          const isPreviewArtifact = /(?:shareable public|private prospect) preview generated/i.test(notes);
          const isUnactivatedCheckout =
            business.subscription_status === "incomplete"
            && !business.owner_id
            && /created from public pricing checkout/i.test(notes);
          return !isPreviewArtifact && !isUnactivatedCheckout;
        });
        setBusinesses(nextBusinesses);
        setSelectedBusinessId((current) =>
          current && nextBusinesses.some((business) => business.id === current)
            ? current
            : nextBusinesses[0]?.id || "",
        );

        const nextPlanFeatures: Record<string, string[]> = {};
        for (const plan of planRes.data || []) {
          nextPlanFeatures[String(plan.slug || "")] = Array.isArray(plan.enabled_features)
            ? plan.enabled_features
            : [];
        }
        setPlanFeatures(nextPlanFeatures);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const selectedBusiness = businesses.find((business) => business.id === selectedBusinessId);
  const includesLocalSeo = Boolean(
    selectedBusiness?.plan &&
      planFeatures[selectedBusiness.plan]?.includes("local_seo_geo"),
  );

  return (
    <div className="space-y-8">
      <Card className="rounded-[2rem] border-slate-200 p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-indigo-600" />
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">
                Local SEO delivery
              </p>
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Manage location pages by customer
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
              Select a real customer business, review its plan entitlement, and manage location-page drafts without pretending a draft has been published.
            </p>
          </div>

          <div className="min-w-0 sm:min-w-[320px]">
            <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId} disabled={loading || !businesses.length}>
              <SelectTrigger className="h-12 rounded-xl bg-white">
                <SelectValue placeholder={loading ? "Loading businesses…" : "Select business"} />
              </SelectTrigger>
              <SelectContent>
                {businesses.map((business) => (
                  <SelectItem key={business.id} value={business.id}>
                    {business.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBusiness ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">{selectedBusiness.plan || "No plan"}</Badge>
                <Badge variant="outline">{selectedBusiness.status || "Unknown status"}</Badge>
                <Badge className={includesLocalSeo ? "border-0 bg-emerald-50 text-emerald-700" : "border-0 bg-amber-50 text-amber-700"}>
                  {includesLocalSeo ? "Local SEO included in plan" : "Local SEO not included in plan"}
                </Badge>
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      {selectedBusinessId ? (
        <LocalSeoDashboard businessIdOverride={selectedBusinessId} />
      ) : (
        <Card className="rounded-[2rem] border-dashed p-12 text-center text-sm font-semibold text-slate-500">
          No business is available for Local SEO delivery.
        </Card>
      )}
    </div>
  );
}
