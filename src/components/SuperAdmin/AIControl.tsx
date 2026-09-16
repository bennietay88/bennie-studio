
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { 
  Settings, 
  Database, 
  Route, 
  DollarSign, 
  ShieldCheck, 
  AlertTriangle,
  Save,
  Plus,
  RefreshCw,
  Search
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

export const AIControl: React.FC = () => {
  const [features, setFeatures] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRoute, setSavingRoute] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("features");
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [platformSettings, setPlatformSettings] = useState<any>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [newRoute, setNewRoute] = useState({
    plan_slug: "starter",
    feature_key: "",
    provider: "deepseek",
    model: "deepseek-chat",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [featRes, routeRes, planRes, settingsRes] = await Promise.all([
        supabase.from("ai_feature_costs").select("*").order("feature_name"),
        supabase.from("ai_model_routes").select("*"),
        supabase.from("plans").select("*").order("price_usd"),
        supabase.from("platform_settings").select("content").single()
      ]);

      setFeatures(featRes.data || []);
      setRoutes(routeRes.data || []);
      setPlans(planRes.data || []);
      setPlatformSettings(settingsRes.data?.content || null);
    } catch (err) {
      toast.error("Failed to fetch AI configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateFeature = async (id: string, updates: any) => {
    try {
      const { error } = await supabase
        .from("ai_feature_costs")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
      toast.success("Feature cost updated");
      fetchData();
    } catch (err) {
      toast.error("Failed to update feature");
    }
  };

  const createRoute = async () => {
    if (!newRoute.feature_key) {
      toast.error("Please select a feature");
      return;
    }
    setSavingRoute(true);
    try {
      const existingRoute = routes.find(
        (route) =>
          route.feature_key === newRoute.feature_key &&
          route.plan_slug === newRoute.plan_slug &&
          (!editingRouteId || route.id === editingRouteId),
      );
      const targetRouteId = editingRouteId || existingRoute?.id;

      const { error } = targetRouteId
        ? await supabase
            .from("ai_model_routes")
            .update(newRoute)
            .eq("id", targetRouteId)
        : await supabase
            .from("ai_model_routes")
            .insert(newRoute);
      if (error) throw error;
      toast.success(targetRouteId ? "Model route updated" : "Model route created");
      setEditingRouteId(null);
      fetchData();
    } catch (err) {
      toast.error("Failed to save route");
    } finally {
      setSavingRoute(false);
    }
  };

  const startRouteEdit = (feature: any, route?: any) => {
    const existingRoute =
      route ||
      routes.find(
        (item) =>
          item.feature_key === feature.feature_key &&
          item.plan_slug === "starter",
      ) ||
      routes.find((item) => item.feature_key === feature.feature_key);

    setNewRoute({
      plan_slug: existingRoute?.plan_slug || "starter",
      feature_key: feature.feature_key,
      provider: existingRoute?.provider === "openai" ? "openai" : "deepseek",
      model: existingRoute?.model || (feature.default_provider === "openai" ? "gpt-4o-mini" : "deepseek-chat"),
    });
    setEditingRouteId(existingRoute?.id || null);
    setActiveTab("routes");
  };

  const deleteRoute = async (id: string) => {
    try {
      const { error } = await supabase
        .from("ai_model_routes")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Route removed");
      fetchData();
    } catch (err) {
      toast.error("Failed to remove route");
    }
  };

  const savePlatformSettings = async () => {
    if (!platformSettings) return;
    setSavingSettings(true);
    try {
      const { data: settings } = await supabase.from("platform_settings").select("id").single();
      const { error } = await supabase
        .from("platform_settings")
        .update({ content: platformSettings })
        .eq("id", settings?.id);
      
      if (error) throw error;
      toast.success("Intelligence keys updated");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredFeatures = features.filter(f => 
    f.feature_name.toLowerCase().includes(search.toLowerCase()) || 
    f.feature_key.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center p-12"><RefreshCw className="animate-spin h-8 w-8 text-indigo-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl overflow-hidden relative group">
        <div className="relative z-10">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
            <span className="bg-indigo-600 px-3 py-1 rounded-sm">Intelligence Lab</span>
          </h1>
          <p className="text-slate-300 font-bold text-xs uppercase tracking-widest mt-3 flex items-center">
            <ShieldCheck className="h-4 w-4 mr-2 text-indigo-400" /> AI Cost Control & Model Routing
          </p>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <Database className="h-40 w-40" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex justify-between items-center bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <TabsList className="bg-transparent border-none">
            <TabsTrigger value="features" className="rounded-xl data-[state=active]:bg-slate-900 data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest px-6 h-10">Feature Costs</TabsTrigger>
            <TabsTrigger value="routes" className="rounded-xl data-[state=active]:bg-slate-900 data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest px-6 h-10">Model Routes</TabsTrigger>
            <TabsTrigger value="plans" className="rounded-xl data-[state=active]:bg-slate-900 data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest px-6 h-10">AI Plan Limits</TabsTrigger>
            <TabsTrigger value="keys" className="rounded-xl data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest px-6 h-10">Intelligence Keys</TabsTrigger>
          </TabsList>
          
          <div className="relative w-64 mr-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input 
              placeholder="Search features..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl border-slate-100 text-xs font-bold uppercase tracking-tight focus:ring-slate-900" 
            />
          </div>
        </div>

        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredFeatures.map((feature) => (
              <Card key={feature.id} className="rounded-3xl border-slate-100 hover:shadow-lg transition-all duration-500 overflow-hidden">
                <CardHeader className="bg-slate-50/50 p-6 flex flex-row items-center justify-between border-b border-slate-100">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-black italic tracking-tighter uppercase text-slate-800 dark:text-white">{feature.feature_name}</CardTitle>
                    <code className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{feature.feature_key}</code>
                  </div>
                  <Badge variant={feature.is_active ? "default" : "outline"} className={feature.is_active ? "bg-emerald-500 font-black text-[9px] uppercase" : "font-black text-[9px] uppercase"}>
                    {feature.is_active ? "ACTIVE" : "DISABLED"}
                  </Badge>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center">
                        <DollarSign className="h-3 w-3 mr-1" /> Credit Cost
                      </label>
                      <Input 
                        type="number" 
                        defaultValue={feature.credit_cost}
                        onBlur={(e) => updateFeature(feature.id, { credit_cost: parseInt(e.target.value) })}
                        className="h-10 rounded-xl font-black text-slate-700 bg-slate-50/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center">
                        <Route className="h-3 w-3 mr-1" /> Minimum Plan
                      </label>
                      <select 
                        defaultValue={feature.minimum_plan}
                        onChange={(e) => updateFeature(feature.id, { minimum_plan: e.target.value })}
                        className="w-full h-10 rounded-xl font-black text-slate-900 bg-slate-50 border-slate-100 text-xs px-3 focus:ring-slate-900"
                      >
                        <option value="starter">Launch</option>
                        <option value="business">Business</option>
                        <option value="growth">Growth OS</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                    <p className="text-[9px] font-black uppercase text-indigo-400 tracking-widest mb-2">Default Engine Strategy</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600">{feature.default_provider} / {feature.default_model}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-[9px] font-black uppercase text-indigo-600 hover:bg-indigo-100"
                        onClick={() => startRouteEdit(feature)}
                      >
                        Edit Route
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <Card className="rounded-3xl border-slate-100 shadow-sm p-8 bg-white overflow-hidden">
             <div className="flex flex-col md:flex-row gap-6 items-end mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex-1 space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">
                    {editingRouteId ? "Editing Feature Route" : "Feature Scope"}
                  </label>
                   <select 
                      value={newRoute.feature_key}
                      onChange={(e) => setNewRoute({...newRoute, feature_key: e.target.value})}
                      className="w-full h-10 rounded-xl font-black text-slate-900 bg-white border-slate-200 text-xs px-3"
                   >
                      <option value="">Select Feature...</option>
                      {features.map(f => <option key={f.feature_key} value={f.feature_key}>{f.feature_name}</option>)}
                   </select>
                </div>
                <div className="w-48 space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">User Plan</label>
                   <select 
                      value={newRoute.plan_slug}
                      onChange={(e) => setNewRoute({...newRoute, plan_slug: e.target.value})}
                      className="w-full h-10 rounded-xl font-black text-slate-900 bg-white border-slate-200 text-xs px-3"
                   >
                      <option value="starter">Launch</option>
                      <option value="business">Business</option>
                      <option value="growth">Growth OS</option>
                   </select>
                </div>
                <div className="flex-1 space-y-2">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Engine Override</label>
                   <div className="flex gap-2">
                      <select 
                         value={newRoute.provider}
                         onChange={(e) => setNewRoute({...newRoute, provider: e.target.value})}
                         className="w-1/3 h-10 rounded-xl font-black text-slate-900 bg-white border-slate-200 text-xs px-3"
                      >
                         <option value="openai">OpenAI</option>
                         <option value="deepseek">DeepSeek</option>
                      </select>
                      <Input 
                        placeholder="Model ID..." 
                        value={newRoute.model}
                        onChange={(e) => setNewRoute({...newRoute, model: e.target.value})}
                        className="flex-1 h-10 rounded-xl bg-white"
                      />
                   </div>
                </div>
                <Button 
                  onClick={createRoute} 
                  disabled={savingRoute}
                  className="bg-indigo-600 hover:bg-indigo-700 h-10 rounded-xl px-6"
                >
                   {savingRoute ? <RefreshCw className="animate-spin h-4 w-4" /> : <Plus className="h-4 w-4 mr-2" />}
                   {editingRouteId ? "Save Route" : "Deploy Route"}
                </Button>
                {editingRouteId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingRouteId(null);
                      setNewRoute({
                        plan_slug: "starter",
                        feature_key: "",
                        provider: "deepseek",
                        model: "deepseek-chat",
                      });
                    }}
                    className="h-10 rounded-xl px-5"
                  >
                    Cancel
                  </Button>
                )}
             </div>

             <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest px-2 mb-4">Active Plan Overrides</h3>
                {routes.length > 0 ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {routes.map(route => {
                         const feature = features.find(f => f.feature_key === route.feature_key);
                         return (
                           <div key={route.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                              <div className="flex justify-between items-start mb-4">
                                 <div>
                                   <Badge className="bg-slate-900 text-[8px] font-black mb-1">{route.plan_slug.toUpperCase()}</Badge>
                                   <h4 className="text-sm font-black italic uppercase italic tracking-tighter text-slate-800">{feature?.feature_name || "Unknown Feature"}</h4>
                                 </div>
                                 <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6 text-slate-300 hover:text-indigo-600"
                                    onClick={() => feature && startRouteEdit(feature, route)}
                                 >
                                    <Settings className="h-3 w-3" />
                                 </Button>
                              </div>
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                 <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-400 font-bold uppercase tracking-tighter">Override Engine</span>
                                    <span className="text-indigo-600 font-black">{route.provider} / {route.model}</span>
                                 </div>
                                 <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-3 h-7 w-full text-[9px] font-black uppercase text-red-500 hover:bg-red-50"
                                  onClick={() => deleteRoute(route.id)}
                                 >
                                  Remove Route
                                 </Button>
                              </div>
                           </div>
                         );
                      })}
                   </div>
                ) : (
                   <div className="text-center py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-100">
                      <Route className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest underline decoration-indigo-200">No active model overrides</p>
                   </div>
                )}
             </div>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {plans.map(plan => (
              <Card key={plan.id} className="rounded-3xl border-slate-100 overflow-hidden hover:border-indigo-200 transition-colors">
                <CardHeader className="bg-slate-900 text-white p-6">
                   <div className="flex justify-between items-start">
                     <div>
                       <CardTitle className="text-lg font-black italic uppercase italic tracking-tighter">{plan.name}</CardTitle>
                       <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">${plan.price_usd}/m</p>
                     </div>
                     <Settings className="h-4 w-4 text-white/20" />
                   </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                   <div className="space-y-1">
                     <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Monthly Credits</p>
                     <p className="text-xl font-black text-slate-800">{plan.monthly_credit_limit.toLocaleString()}</p>
                   </div>
                   <div className="space-y-1">
                     <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Daily Limit</p>
                     <p className="text-lg font-black text-slate-600">{plan.daily_request_limit} Reqs</p>
                   </div>
                   <div className="space-y-1">
                     <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Premium AI Access</p>
                     <Badge variant={plan.chatgpt_enabled ? "default" : "outline"} className={plan.chatgpt_enabled ? "bg-indigo-600 font-bold" : "text-slate-500 font-bold"}>
                       {plan.chatgpt_enabled ? `YES (${plan.monthly_chatgpt_action_limit} actions)` : "NO"}
                     </Badge>
                   </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="keys" className="space-y-4">
           <Card className="rounded-[40px] border-slate-100 shadow-xl overflow-hidden">
              <div className="bg-indigo-600 p-8 text-white flex justify-between items-center">
                 <div>
                    <h2 className="text-xl font-black uppercase italic tracking-tighter">Global AI Intelligence Keys</h2>
                    <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mt-1">Core platform API configuration</p>
                 </div>
                 <ShieldCheck className="h-10 w-10 opacity-20" />
              </div>
              <CardContent className="p-8 space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">DeepSeek API Key</label>
                       <Input 
                          type="password"
                          placeholder="sk-..."
                          value={platformSettings?.deepseekApiKey || ""}
                          onChange={(e) => setPlatformSettings({...platformSettings, deepseekApiKey: e.target.value})}
                          className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-mono text-xs focus:ring-indigo-600"
                       />
                       <p className="text-[9px] text-slate-400 font-medium leading-relaxed italic">Cost-efficient default for routine editing, drafts and SEO work.</p>
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">OpenAI / ChatGPT API Key</label>
                       <Input 
                          type="password"
                          placeholder="sk-..."
                          value={platformSettings?.openaiApiKey || ""}
                          onChange={(e) => setPlatformSettings({...platformSettings, openaiApiKey: e.target.value})}
                          className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-mono text-xs focus:ring-indigo-600"
                       />
                    </div>
                 </div>

                 <div className="pt-8 border-t border-slate-100 flex justify-end">
                    <Button 
                       onClick={savePlatformSettings}
                       disabled={savingSettings || !platformSettings}
                       className="h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-widest text-xs px-10"
                    >
                       {savingSettings ? <RefreshCw className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                       Synchronize Intelligence
                    </Button>
                 </div>
              </CardContent>
           </Card>

           <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex gap-4">
              <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0" />
              <div>
                 <p className="text-xs font-black uppercase text-amber-900 tracking-tight">Security Protocol</p>
                 <p className="text-[10px] text-amber-700 font-medium leading-relaxed mt-1">
                    These keys are stored securely in the Platform Core and are never exposed to clients. Use of these keys follows strict attribution and credit-tracking policies.
                 </p>
              </div>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
