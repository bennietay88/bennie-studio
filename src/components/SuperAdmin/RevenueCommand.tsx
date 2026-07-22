import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Users,
  Target,
  Video,
  Phone,
  CheckCircle2,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Zap,
  Layout,
  MessageSquare,
  Globe,
  BrainCircuit,
  Settings,
  Rocket,
  Shield,
  History,
  BarChart3,
  Search,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import { supabase } from "../../lib/supabase";

import { useNavigate } from "react-router-dom";

export function RevenueCommand() {
  const navigate = useNavigate();
  const [data, setData] = useState({
    leads: 0,
    qualified: 0,
    webinars: 0,
    calls: 0,
    deals: 0,
    conversion: 0,
    customApps: 0,
    activeProjects: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRevenueStats() {
      try {
        setLoading(true);
        const [prospectsRes, proposalsRes, webinarsRes, customAppsRes, projectsRes] = await Promise.all([
          supabase.from("prospects").select("*"),
          supabase.from("proposals").select("*"),
          supabase.from("webinars").select("*"),
          supabase.from("custom_website_applications").select("*"),
          supabase.from("projects").select("*")
        ]);

        const prospects = prospectsRes.data || [];
        const proposals = proposalsRes.data || [];
        const webinars = webinarsRes.data || [];
        const customApps = customAppsRes.data || [];
        const projects = projectsRes.data || [];

        const leads = prospects.length;
        const qualified = prospects.filter(p => p.status === "qualified").length;
        const webinarCount = webinars.length;
        const wonDeals = proposals.filter(p => p.status === "accepted").length;
        const conversion = leads > 0 ? (wonDeals / leads) * 100 : 0;

        setData({
          leads,
          qualified,
          webinars: webinarCount,
          calls: prospects.filter(p => p.status === "appointment_booked").length,
          deals: wonDeals,
          conversion: Math.round(conversion),
          customApps: customApps.filter(app => app.status === "pending").length,
          activeProjects: projects.filter(proj => proj.status === "active").length,
        });
      } catch (err) {
        console.error("Failed to fetch revenue stats", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRevenueStats();
  }, []);

  const stats = [
    { label: "TOTAL LEADS", value: data.leads.toString(), icon: Users, color: "text-slate-900 dark:text-white", bgColor: "bg-slate-50 dark:bg-slate-900/50" },
    { label: "QUALIFIED", value: data.qualified.toString(), icon: Target, color: "text-blue-600", bgColor: "bg-blue-50" },
    { label: "WEBINARS", value: data.webinars.toString(), icon: Video, color: "text-purple-600", bgColor: "bg-purple-50" },
    { label: "CALLS BOOKED", value: data.calls.toString(), icon: Phone, color: "text-amber-600", bgColor: "bg-amber-50" },
    { label: "DEALS WON", value: data.deals.toString(), icon: CheckCircle2, color: "text-emerald-600", bgColor: "bg-emerald-50" },
    { label: "CUSTOM APPS", value: data.customApps.toString(), icon: MessageSquare, color: "text-rose-600", bgColor: "bg-rose-50" },
    { label: "ACTIVE PROJECTS", value: data.activeProjects.toString(), icon: Layout, color: "text-indigo-600", bgColor: "bg-indigo-50" },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-12 pt-4">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            <span>Deployment System</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="text-slate-900 dark:text-white">GrowthOS v1.0 Production</span>
            <Badge className="bg-emerald-500/10 text-emerald-600 border-none rounded-full h-5 text-[8px] tracking-widest font-black uppercase">
              <span className="h-1 w-1 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Active Link
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-10 px-4 bg-white border border-slate-100 rounded-xl flex items-center gap-3 shadow-sm">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Global Pulse</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-4 w-1 bg-slate-100 rounded-full" />
              ))}
            </div>
          </div>
          <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100 italic font-black text-xl">
            <Zap className="h-5 w-5 fill-indigo-600" />
          </div>
        </div>
      </div>

      {/* Main Command Title */}
      <div className="space-y-4">
        <h1 className="text-6xl font-black italic text-slate-900 dark:text-white tracking-tighter uppercase">
          Revenue <span className="text-indigo-600">Command</span>
        </h1>
        <p className="text-slate-400 font-bold tracking-tight text-sm uppercase">
          WAAS Growth OS • Internal Mission Control
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-500 group overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className={cn("text-5xl font-black italic tracking-tighter mb-4", stat.color)}>
                  {stat.value}
                </div>
                <div className={cn("inline-flex p-3 rounded-2xl mb-4 transition-transform group-hover:scale-110 duration-500 shadow-inner", stat.bgColor)}>
                  <stat.icon className={cn("h-8 w-8 transition-all", stat.color)} />
                </div>
                {/* Background Decoration */}
                <stat.icon className={cn("absolute -right-4 -bottom-4 h-24 w-24 opacity-[0.03] rotate-12 transition-all", stat.color)} />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Velocity and Health Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Velocity Command */}
        <Card className="lg:col-span-2 rounded-[3rem] border-slate-100 shadow-xl shadow-slate-100/50 bg-white overflow-hidden flex flex-col min-h-[500px]">
          <CardHeader className="p-10 border-b border-slate-50 dark:border-slate-800 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-black italic uppercase tracking-tight dark:text-white">
                Sales Velocity <span className="text-indigo-600">Command</span>
              </CardTitle>
            </div>
            <Badge className="bg-indigo-50 text-indigo-600 border-none rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest">
              Algorithmic Priority
            </Badge>
          </CardHeader>
          <CardContent className="p-10 flex-1 flex flex-col">
            <div className="grid grid-cols-3 gap-12 mb-12">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Avg. Decision Time</p>
                <p className="text-2xl font-black text-indigo-600 italic">4.2 Days</p>
                <p className="text-[10px] font-bold text-slate-400">Last 30 Days</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Funnel Stagnation</p>
                <p className="text-2xl font-black text-rose-500 italic">12%</p>
                <p className="text-[10px] font-bold text-slate-400">System Design Flow</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Closing Velocity</p>
                <p className="text-2xl font-black text-emerald-500 italic">+24%</p>
                <p className="text-[10px] font-bold text-slate-400">Vs Last Week</p>
              </div>
            </div>

            <div className="flex justify-between items-end">
                <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Next Best Actions</p>
              </div>
              <div className="text-center space-y-2 opacity-30">
                <p className="text-xs font-black italic uppercase tracking-widest text-slate-500">
                  No prioritized actions. Import leads to scan candidates.
                </p>
              </div>
            </CardContent>
        </Card>

        {/* Revenue Health */}
        <Card className="rounded-[3rem] border-slate-100 shadow-xl shadow-slate-100/50 bg-white overflow-hidden flex flex-col">
          <CardHeader className="p-10 border-b border-slate-50 dark:border-slate-800">
            <CardTitle className="text-2xl font-black italic uppercase tracking-tight dark:text-white">
              Revenue <span className="text-indigo-600">Health</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10 space-y-10">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Setup Fee Volume</p>
                <p className="text-xs font-black text-indigo-600">$0</p>
              </div>
              <div className="h-2 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "30%" }}
                  className="h-full bg-indigo-600 rounded-full" 
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Active Subscriptions</p>
                <p className="text-xs font-black text-emerald-600">0 Units</p>
              </div>
              <div className="h-2 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "15%" }}
                  className="h-full bg-emerald-500 rounded-full" 
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Proposal Conversion</p>
                <p className="text-xs font-black text-blue-600">0%</p>
              </div>
              <div className="h-2 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "45%" }}
                  className="h-full bg-blue-500 rounded-full" 
                />
              </div>
            </div>

            <div className="pt-10 border-t border-slate-50 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Target MRR</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">$50,000</p>
              </div>
              <div className="h-16 w-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Activity className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goal Explanation (Optional addition to match user context) */}
        <Card className="rounded-[3rem] bg-slate-900 text-white p-12 relative overflow-hidden group">
        <Rocket className="absolute -right-12 -bottom-12 h-64 w-64 text-indigo-500/10 rotate-12 group-hover:rotate-6 transition-transform duration-1000" />
        <div className="relative z-10 space-y-6">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-indigo-600 items-center justify-center shadow-lg shadow-indigo-600/50 mb-4">
                <Zap className="h-6 w-6 fill-white" />
          </div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase max-w-2xl text-white">
            WAAS Growth OS: <span className="text-indigo-300">Outbound Acceleration</span>
          </h2>
          <p className="text-slate-200 font-medium text-lg max-w-3xl leading-relaxed">
            Your objective is to find high-potential businesses with weak digital footprints, audit their performance, generate irresistible personalized outreach, and funnel them into high-conversion replay webinars that close into recurring WAAS subscriptions.
          </p>
          <div className="flex gap-4 pt-4">
               <Button 
                 onClick={() => navigate("/admin/prospect_explorer")}
                 className="bg-indigo-600 hover:bg-indigo-700 h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-xs"
               >
                   Launch Prospect Scan
               </Button>
               <Button 
                 variant="outline" 
                 onClick={() => navigate("/admin/traffic")}
                 className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] border-white/20 text-white hover:bg-white/10"
               >
                   Intelligence Logs
               </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
