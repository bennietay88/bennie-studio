import React from "react";
import { FunnelWorkspace } from "../funnels/FunnelWorkspace";
import { FunnelsDashboard } from "../funnels/FunnelsDashboard";
import { supabase } from "../../lib/supabase";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Route } from "lucide-react";

export function AdminFunnels() {
  const [businesses, setBusinesses] = React.useState<any[]>([]);
  const [businessId, setBusinessId] = React.useState("");
  const [funnelId, setFunnelId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("businesses").select("id,name,status,plan,custom_enabled_features,sales_funnels_access_mode,admin_notes,owner_id,subscription_status").order("name");
      const rows = (data || []).filter((business: any) => {
        const features = Array.isArray(business.custom_enabled_features) ? business.custom_enabled_features : [];
        const notes = String(business.admin_notes || "");
        const preview = /(?:shareable public|private prospect) preview generated/i.test(notes);
        return features.includes("sales_funnels") && !preview;
      });
      setBusinesses(rows);
      setBusinessId((current) => current && rows.some((row:any)=>row.id===current) ? current : rows[0]?.id || "");
      setLoading(false);
    };
    void load();
  }, []);

  if (funnelId) return <FunnelWorkspace funnelIdOverride={funnelId} adminMode onBack={()=>setFunnelId(null)} />;

  return (
    <div className="space-y-8">
      <Card className="rounded-[2rem] border-slate-200 p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><div className="flex items-center gap-2 text-indigo-600"><Route className="h-5 w-5" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Custom build delivery</span></div><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Sales Funnel Customers</h1><p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">Only businesses with the Sales Funnels custom capability appear here. Super Admin keeps full delivery control regardless of customer access mode.</p></div>
          <div className="min-w-[300px]">
            <Select value={businessId} onValueChange={(value)=>{setBusinessId(value);setFunnelId(null);}} disabled={loading || !businesses.length}><SelectTrigger className="h-12 rounded-xl bg-white"><SelectValue placeholder={loading?"Loading customers…":"Select funnel customer"} /></SelectTrigger><SelectContent>{businesses.map((business)=><SelectItem key={business.id} value={business.id}>{business.name}</SelectItem>)}</SelectContent></Select>
            {businessId ? <div className="mt-2 flex gap-2">{(() => { const business=businesses.find((item)=>item.id===businessId); return business ? <><Badge variant="outline">{business.plan || "No plan"}</Badge><Badge className="border-0 bg-emerald-50 text-emerald-700">Sales Funnels enabled</Badge><Badge variant="outline">{String(business.sales_funnels_access_mode || "managed").replace("_"," ")}</Badge></> : null; })()}</div> : null}
          </div>
        </div>
      </Card>
      {businessId ? <FunnelsDashboard businessIdOverride={businessId} adminMode onOpenFunnel={setFunnelId} /> : <Card className="rounded-[2rem] border-dashed p-12 text-center text-sm font-semibold text-slate-500">Enable the Sales Funnels custom capability for a business first.</Card>}
    </div>
  );
}
