
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { 
  Zap, 
  Sparkles, 
  History, 
  AlertCircle, 
  ArrowUpRight, 
  Calendar,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import axios from "axios";
import { supabase } from "../lib/supabase";

interface AIUsageData {
  balance: {
    monthly_credit_limit: number;
    credits_used: number;
    credits_remaining: number;
    reset_date: string;
  } | null;
  plan: {
    name: string;
    slug: string;
    daily_request_limit: number;
    chatgpt_enabled: boolean;
    monthly_chatgpt_action_limit: number;
  } | null;
  dailyUsage: {
    request_count: number;
    credits_used: number;
    chatgpt_action_count: number;
  };
  recentLogs: Array<{
    id: string;
    feature_key: string;
    provider: string;
    model: string;
    credits_charged: number;
    status: string;
    created_at: string;
  }>;
}

export const AICreditDashboard: React.FC = () => {
  const [usage, setUsage] = useState<AIUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await axios.get("/api/ai/usage", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      setUsage(response.data);
    } catch (err: any) {
      console.error("Error fetching usage:", err);
      setError("Failed to load usage statistics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  if (!usage) return null;

  const creditPercentage = usage.balance 
    ? (usage.balance.credits_used / usage.balance.monthly_credit_limit) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Credits Overview */}
        <Card className="col-span-1 md:col-span-2 rounded-3xl border-slate-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-black italic uppercase tracking-tight text-slate-900">Resource Balance</CardTitle>
                <CardDescription className="text-slate-500 font-bold text-xs uppercase">Your monthly platform bandwidth</CardDescription>
              </div>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100 font-black text-[10px] uppercase py-1 px-3">
                {usage.plan?.name || "No Plan"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-2">
                <div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-6xl font-black text-slate-900 tracking-tighter">
                      {usage.balance?.credits_remaining.toLocaleString() || 0}
                    </p>
                    <p className="text-xl font-bold text-slate-400">/ {usage.balance?.monthly_credit_limit.toLocaleString() || 0}</p>
                  </div>
                  <p className="text-xs font-black text-indigo-600 uppercase tracking-[0.3em] mt-2">AI Credits Remaining</p>
                </div>
                <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center gap-3 shadow-lg">
                  <Calendar className="h-5 w-5 text-indigo-400" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Next Reset Date</p>
                    <p className="text-sm font-black uppercase tracking-tight">
                      {usage.balance?.reset_date ? format(new Date(usage.balance.reset_date), "MMMM d, yyyy") : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Progress value={creditPercentage} className="h-4 bg-slate-100 rounded-full" />
                <div className="flex justify-between text-[11px] font-black uppercase text-slate-500 tracking-widest">
                  <span className="flex items-center">
                    <History className="h-3 w-3 mr-1.5" /> 
                    {usage.balance?.credits_used.toLocaleString() || 0} Generations Used This Month
                  </span>
                  <span className="text-indigo-600">Auto-Refill Active</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                      <Zap className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-black text-[10px]">1 CREDIT</Badge>
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">Standard AI</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">DeepSeek V3 • Ideal for routine content, chat, and bulk operations.</p>
                </div>
                <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2">
                    <Sparkles className="h-4 w-4 text-indigo-200 group-hover:text-indigo-400 transition-colors" />
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                      <Zap className="h-5 w-5" />
                    </div>
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 font-black text-[10px]">5 CREDITS</Badge>
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">Premium AI</h4>
                  <p className="text-[11px] text-indigo-700 font-medium mt-1">GPT-4o • Agency-grade rewrite, complex strategy, and neural conversion hooks.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upgrade Card */}
        <Card className="rounded-3xl border-indigo-100 bg-indigo-600 text-white shadow-xl shadow-indigo-200 p-1 flex flex-col">
          <div className="p-6 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-black italic tracking-tighter uppercase">Scale Your AI Intelligence</h3>
              <p className="text-indigo-100 text-sm font-medium leading-relaxed">
                Unlock premium GPT-4o rewrite, agency-grade funnels, and 3,000+ monthly credits.
              </p>
              <ul className="space-y-2 mt-4">
                {["Premium AI Rewrite", "Sales Funnel Copy", "Daily Higher Limits"].map((f, i) => (
                  <li key={i} className="flex items-center text-xs font-bold text-white/80">
                    <CheckCircle2 className="h-3.3 w-4 mr-2 text-indigo-300" /> {f}
                  </li>
                ))}
              </ul>
            </div>
            <Button className="w-full mt-8 bg-white text-indigo-600 hover:bg-indigo-50 font-black uppercase tracking-widest text-xs rounded-xl h-12">
              Upgrade Plan <ArrowUpRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </Card>
      </div>

      {/* History */}
      <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black italic uppercase tracking-tight">Generation History</CardTitle>
            <CardDescription className="text-slate-500 font-bold text-xs uppercase uppercase uppercase tracking-tight">Your recent AI activity logs</CardDescription>
          </div>
          <History className="h-5 w-5 text-slate-300" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Action</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Engine</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cost</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {usage.recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-slate-700 uppercase italic">{log.feature_key.replace(/_/g, " ")}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-slate-400 leading-none">{log.provider}</span>
                        <span className="text-xs font-bold text-slate-600">{log.model}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {log.status === "success" ? (
                        <div className="flex items-center text-emerald-600">
                          <CheckCircle2 className="h-4 w-4 mr-1.5" />
                          <span className="text-[10px] font-black uppercase">Success</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-rose-500">
                          <XCircle className="h-4 w-4 mr-1.5" />
                          <span className="text-[10px] font-black uppercase">Failed</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 border-none font-black text-[10px]">
                        -{log.credits_charged} CREDITS
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-400">
                      {format(new Date(log.created_at), "MMM d, HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {usage.recentLogs.length === 0 && (
            <div className="p-12 text-center">
              <div className="inline-flex h-12 w-12 rounded-full bg-slate-50 items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-slate-200" />
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No generation history found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
