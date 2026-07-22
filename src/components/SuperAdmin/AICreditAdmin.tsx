import React from "react";
import { Coins, RefreshCw, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

export function AICreditAdmin() {
  const [businesses, setBusinesses] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  const fetchBusinesses = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("businesses")
      .select("id, name, plan, ai_credits, ai_credits_used")
      .order("name", { ascending: true });
    if (error) {
      toast.error(error.message || "Failed to load businesses");
    } else {
      setBusinesses(data || []);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const updateCredits = async (business: any) => {
    setSavingId(business.id);
    const { error } = await supabase
      .from("businesses")
      .update({
        ai_credits: Number(business.ai_credits || 0),
        ai_credits_used: Number(business.ai_credits_used || 0),
      })
      .eq("id", business.id);

    if (error) toast.error(error.message || "Failed to update credits");
    else toast.success("AI credits updated.");
    setSavingId(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">AI Credit Controls</h1>
          <p className="mt-2 text-sm font-bold uppercase tracking-widest text-slate-400">
            Top up, reset, and audit business AI balances.
          </p>
        </div>
        <Button variant="outline" onClick={fetchBusinesses} className="gap-2 rounded-xl">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card className="rounded-3xl border-slate-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5 text-indigo-600" /> Business Balances</CardTitle>
          <CardDescription>Monthly reloads are controlled by plan/subscription logic; manual edits are for support and failed-generation refunds.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Business</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Plan</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Credits</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Used</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="p-10 text-center text-sm font-bold text-slate-400">Loading credit balances...</td></tr>
                ) : businesses.map((business, index) => (
                  <tr key={business.id}>
                    <td className="px-6 py-4 font-black text-slate-900">{business.name}</td>
                    <td className="px-6 py-4"><Badge className="bg-indigo-50 text-indigo-700 border-none">{business.plan || "starter"}</Badge></td>
                    <td className="px-6 py-4">
                      <Input
                        type="number"
                        value={business.ai_credits || 0}
                        onChange={(event) => {
                          const copy = [...businesses];
                          copy[index] = { ...business, ai_credits: event.target.value };
                          setBusinesses(copy);
                        }}
                        className="h-10 w-32 rounded-xl"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Input
                        type="number"
                        value={business.ai_credits_used || 0}
                        onChange={(event) => {
                          const copy = [...businesses];
                          copy[index] = { ...business, ai_credits_used: event.target.value };
                          setBusinesses(copy);
                        }}
                        className="h-10 w-32 rounded-xl"
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button size="sm" onClick={() => updateCredits(business)} disabled={savingId === business.id} className="gap-2 rounded-xl bg-slate-950 text-white">
                        <Save className="h-4 w-4" />
                        Save
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
