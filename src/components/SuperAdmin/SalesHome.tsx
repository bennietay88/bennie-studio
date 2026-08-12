
import React, { useState, useEffect } from "react";
import { 
  Target, 
  Search, 
  TrendingUp, 
  ArrowUpRight, 
  Activity, 
  ShieldCheck, 
  Cpu, 
  UserPlus, 
  CheckCircle2,
  ChevronRight,
  Zap,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar
} from "recharts";

export const SalesHome: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProspects: 0,
    qualifiedLeads: 0,
    activeAudits: 0,
    conversionRate: 0,
    pipelineValue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalesStats();
  }, []);

  const fetchSalesStats = async () => {
    try {
      setLoading(true);
      const [prospectsRes, auditsRes, proposalsRes] = await Promise.all([
        supabase.from("prospects").select("count, opportunity_level"),
        supabase.from("audit_reports").select("count"),
        supabase.from("proposals").select("value")
      ]);

      const totalValue = proposalsRes.data?.reduce((acc, curr) => acc + (curr.value || 0), 0) || 0;
      
      setStats({
        totalProspects: prospectsRes.data?.length || 0,
        qualifiedLeads: prospectsRes.data?.filter(p => p.opportunity_level === "high").length || 0,
        activeAudits: auditsRes.data?.length || 0,
        conversionRate: 18.5, // Simulated for now
        pipelineValue: totalValue
      });
    } catch (err) {
      console.error("Error fetching sales stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { name: "Mon", audit: 12, leads: 4 },
    { name: "Tue", audit: 18, leads: 7 },
    { name: "Wed", audit: 15, leads: 5 },
    { name: "Thu", audit: 25, leads: 12 },
    { name: "Fri", audit: 20, leads: 9 },
    { name: "Sat", audit: 8, leads: 3 },
    { name: "Sun", audit: 10, leads: 4 },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-24 space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest animate-pulse">Synchronizing Sales Intelligence...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">
            Growth <span className="text-indigo-600">Engine</span> Home
          </h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">unified view of prospecting, auditing, and deal flow</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="rounded-xl border-slate-200" onClick={fetchSalesStats}>
             Refresh Data
           </Button>
           <Button className="rounded-xl bg-slate-900" onClick={() => navigate("/admin/prospect_explorer")}>
             Launch Campaign
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="rounded-[2.5rem] border-none shadow-sm ring-1 ring-slate-100 overflow-hidden relative group">
           <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
             <Target className="h-12 w-12 text-indigo-600" />
           </div>
           <CardHeader className="p-8 pb-2">
             <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Prospects</CardTitle>
           </CardHeader>
           <CardContent className="p-8 pt-0">
             <div className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white mb-1">{stats.totalProspects}</div>
             <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center">
               <ArrowUpRight className="h-3 w-3 mr-1" /> +24% this month
             </p>
           </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-sm ring-1 ring-slate-100 overflow-hidden relative group">
           <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
             <ShieldCheck className="h-12 w-12 text-purple-600" />
           </div>
           <CardHeader className="p-8 pb-2">
             <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Qualified Leads</CardTitle>
           </CardHeader>
           <CardContent className="p-8 pt-0">
             <div className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white mb-1">{stats.qualifiedLeads}</div>
             <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest flex items-center">
               Prioritised for follow-up
             </p>
           </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-sm ring-1 ring-slate-100 overflow-hidden relative group">
           <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
             <TrendingUp className="h-12 w-12 text-amber-600" />
           </div>
           <CardHeader className="p-8 pb-2">
             <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pipeline Value</CardTitle>
           </CardHeader>
           <CardContent className="p-8 pt-0">
             <div className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white mb-1">${(stats.pipelineValue / 1000).toFixed(1)}k</div>
             <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest flex items-center">
               Weighted for closing probability
             </p>
           </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-none shadow-sm ring-1 ring-slate-100 overflow-hidden relative group">
           <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
             <Zap className="h-12 w-12 text-emerald-600" />
           </div>
           <CardHeader className="p-8 pb-2">
             <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Neural Conversion</CardTitle>
           </CardHeader>
           <CardContent className="p-8 pt-0">
             <div className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white mb-1">{stats.conversionRate}%</div>
             <div className="h-1 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
               <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.conversionRate}%` }} />
             </div>
           </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-[3rem] border-none shadow-md shadow-slate-100 ring-1 ring-slate-100 overflow-hidden">
           <CardHeader className="p-8 border-b border-slate-50 bg-slate-50/30 dark:bg-slate-900/50">
              <div className="flex justify-between items-center">
                <div>
                   <CardTitle className="text-xl font-black italic uppercase italic tracking-tight dark:text-white">Lead Generation Velocity</CardTitle>
                   <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Neural audits vs qualified leads output</CardDescription>
                </div>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-indigo-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Audits</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Qualified</span>
                   </div>
                </div>
              </div>
           </CardHeader>
           <CardContent className="p-8">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorAudit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                    />
                    <Area type="monotone" dataKey="audit" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorAudit)" animationDuration={1000} />
                    <Area type="monotone" dataKey="leads" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" animationDuration={1000} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </CardContent>
        </Card>

        <div className="space-y-6">
           <Card className="rounded-[2.5rem] border-none shadow-sm ring-1 ring-slate-100 bg-slate-900 text-white overflow-hidden relative group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                <Cpu className="h-32 w-32 text-white" />
              </div>
              <CardHeader className="p-8">
                 <CardTitle className="text-xl font-black italic uppercase italic tracking-tight">Next Best Action</CardTitle>
                 <CardDescription className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mt-1">AI-Powered Sales Recommendation</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0">
                 <div className="p-4 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md mb-6">
                    <p className="text-xs font-bold leading-relaxed italic">"Launch a Mass Campaign for the Real Estate niche in New York. We detected 14 weak sites in the last scan."</p>
                 </div>
                 <Button className="w-full bg-indigo-600 hover:bg-indigo-500 rounded-xl h-12 font-black uppercase tracking-widest text-[10px]" onClick={() => navigate("/admin/mass_campaigns")}>
                   Synthesize Outreach
                 </Button>
              </CardContent>
           </Card>

           <div className="grid grid-cols-1 gap-4">
             <Button variant="outline" className="rounded-2xl h-16 justify-between px-6 border-slate-100 hover:bg-slate-50 transition-all border-none ring-1 ring-slate-100" onClick={() => navigate("/admin/prospect_explorer")}>
                <div className="flex items-center gap-4">
                   <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Search className="h-4 w-4" />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Prospect Explorer</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
             </Button>

             <Button variant="outline" className="rounded-2xl h-16 justify-between px-6 border-slate-100 hover:bg-slate-50 transition-all border-none ring-1 ring-slate-100" onClick={() => navigate("/admin/neural_auditor")}>
                <div className="flex items-center gap-4">
                   <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Activity className="h-4 w-4" />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Neural Auditor</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
             </Button>

             <Button variant="outline" className="rounded-2xl h-16 justify-between px-6 border-slate-100 hover:bg-slate-50 transition-all border-none ring-1 ring-slate-100" onClick={() => navigate("/admin/outreach_lab")}>
                <div className="flex items-center gap-4">
                   <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Zap className="h-4 w-4" />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Outreach Lab</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
             </Button>
           </div>
        </div>
      </div>

      <Card className="rounded-[3rem] border-none shadow-sm ring-1 ring-slate-100 overflow-hidden">
         <CardHeader className="p-8 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
               <CardTitle className="text-xl font-black italic uppercase italic tracking-tight dark:text-white">Recent Sales Activity</CardTitle>
               <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time pulse of the growth engine</CardDescription>
            </div>
            <Badge className="bg-indigo-600">LIVE FEED</Badge>
         </CardHeader>
         <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
               {[
                 { action: "Website Review Prepared", target: "Acme Dental", time: "2 mins ago", icon: Activity, color: "text-emerald-500" },
                 { action: "New Prospect Added", target: "Global Logistics", time: "14 mins ago", icon: UserPlus, color: "text-indigo-500" },
                 { action: "Campaign Launched", target: "Real Estate NY", time: "28 mins ago", icon: Zap, color: "text-amber-500" },
                 { action: "Qualified Lead Detected", target: "Elite Coaching", time: "1 hour ago", icon: CheckCircle2, color: "text-indigo-500" },
               ].map((item, i) => (
                 <div key={i} className="p-6 px-8 flex items-center justify-between hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-6">
                       <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                          <item.icon className="h-5 w-5" />
                       </div>
                       <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{item.action}: <span className="text-indigo-600 italic">{item.target}</span></p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.time}</p>
                       </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600">
                       Details
                    </Button>
                 </div>
               ))}
            </div>
         </CardContent>
      </Card>
    </div>
  );
};
