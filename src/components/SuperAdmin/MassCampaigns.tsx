import React, { useState, useEffect } from "react";
import { Megaphone, Send, Target, BarChart3, Clock, AlertCircle, Loader2, Plus, Trash2, MoreVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";

export function MassCampaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: "",
    segment: "",
    description: "",
    status: "Scheduled",
  });

  const stats = {
    totalSent: campaigns.reduce((acc, c) => acc + (c.total_recipients || 0), 0),
    activeThreads: campaigns.filter(c => c.status === "Sending").length,
    avgOpenRate: campaigns.length > 0 ? (campaigns.reduce((acc, c) => acc + (c.open_rate || 0), 0) / campaigns.length).toFixed(1) : "0",
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error: any) {
      console.error("Error fetching campaigns:", error);
      toast.error("Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!newCampaign.name) {
      toast.error("Name is required");
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from("campaigns")
        .insert([newCampaign])
        .select()
        .single();

      if (error) throw error;
      
      setCampaigns([data, ...campaigns]);
      setIsAddModalOpen(false);
      setNewCampaign({ name: "", segment: "", description: "", status: "Scheduled" });
      toast.success("Campaign created successfully");
    } catch (error: any) {
      console.error("Error creating campaign:", error);
      toast.error(error.message || "Failed to create campaign");
    } finally {
      setSaving(false);
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;

    try {
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) throw error;
      
      setCampaigns(campaigns.filter(c => c.id !== id));
      toast.success("Campaign deleted");
    } catch (error: any) {
      console.error("Error deleting campaign:", error);
      toast.error("Failed to delete campaign");
    }
  };

  return (
    <div className="space-y-8 pt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">
          Mass <span className="text-indigo-600">Campaigns</span>
        </h1>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 h-11 px-8 font-black uppercase tracking-widest text-[10px]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Launch New Blast
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="rounded-[2rem] border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
           <CardHeader className="p-6 pb-2">
             <CardTitle className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest">Global Reach</CardTitle>
           </CardHeader>
           <CardContent className="p-6 pt-0">
             <div className="text-3xl font-black italic text-slate-900 dark:text-white tracking-tighter leading-none mb-1">{stats.totalSent}</div>
             <p className="text-[10px] font-bold text-slate-500 uppercase">Emails Sent (Total)</p>
           </CardContent>
        </Card>
        
        <Card className="rounded-[2rem] border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
           <CardHeader className="p-6 pb-2">
             <CardTitle className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest">Active Threads</CardTitle>
           </CardHeader>
           <CardContent className="p-6 pt-0">
             <div className="text-3xl font-black italic text-indigo-600 tracking-tighter leading-none mb-1">{stats.activeThreads}</div>
             <p className="text-[10px] font-bold text-slate-500 uppercase">Concurrent Sequences</p>
           </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
           <CardHeader className="p-6 pb-2">
             <CardTitle className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest">Avg. Open Rate</CardTitle>
           </CardHeader>
           <CardContent className="p-6 pt-0">
             <div className="text-3xl font-black italic text-emerald-600 tracking-tighter leading-none mb-1">{stats.avgOpenRate}%</div>
             <p className="text-[10px] font-bold text-slate-500 uppercase">Engagement Metric</p>
           </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-slate-50/50 dark:bg-slate-900/50">
           <CardHeader className="p-6 pb-2">
             <CardTitle className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest">Lead Yield</CardTitle>
           </CardHeader>
           <CardContent className="p-6 pt-0">
             <div className="text-3xl font-black italic text-amber-600 tracking-tighter leading-none mb-1">8.5%</div>
             <p className="text-[10px] font-bold text-slate-500 uppercase">Conversion Target</p>
           </CardContent>
        </Card>
      </div>

      <Card className="rounded-[2.5rem] border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900/50">
        <CardHeader className="p-8 border-b border-slate-50">
          <CardTitle className="text-xl font-black italic uppercase tracking-tight dark:text-white">Deployment Queue</CardTitle>
          <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time outbound transmission control</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Campaign Name</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Target Segment</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Progress</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
                        <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Syncing Campaigns...</p>
                      </td>
                    </tr>
                  ) : campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <p className="text-slate-400 font-bold text-sm">No campaigns found. Launch your first blast!</p>
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((campaign) => (
                      <tr key={campaign.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                               <Megaphone className="h-4 w-4" />
                            </div>
                            <p className="text-sm font-black text-slate-900 dark:text-white italic uppercase tracking-tight">{campaign.name}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-xs font-bold text-slate-500 uppercase">{campaign.segment || "Broad List"}</td>
                        <td className="px-8 py-6 w-48">
                           <div className="space-y-1">
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                 <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${campaign.progress || 0}%` }} />
                              </div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{campaign.progress || 0}% Processed</p>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <Badge 
                              className={cn(
                                "border-none rounded-full px-3 py-0.5 text-[8px] font-black uppercase",
                                campaign.status === "Sending" ? "bg-indigo-600 text-white" : 
                                campaign.status === "Completed" ? "bg-emerald-50 text-emerald-600" : 
                                "bg-slate-50 text-slate-400"
                              )}
                              variant="outline"
                           >
                             {campaign.status}
                           </Badge>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <div className="flex justify-end gap-2">
                             <Button 
                               variant="ghost" 
                               size="icon" 
                               onClick={() => deleteCampaign(campaign.id)}
                               className="rounded-xl hover:bg-rose-50 hover:text-rose-600"
                             >
                                <Trash2 className="h-4 w-4" />
                             </Button>
                             <Button variant="ghost" size="sm" className="text-indigo-600 font-black uppercase tracking-widest text-[10px]">Adjust</Button>
                           </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
        </CardContent>
      </Card>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase italic tracking-tight">Launch Campaign blast</DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Deploy an automated outreach sequence across the ecosystem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Campaign Name</Label>
              <Input 
                value={newCampaign.name}
                onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                placeholder="e.g. Q4 Real Estate Blitz"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Segment</Label>
              <Input 
                value={newCampaign.segment}
                onChange={(e) => setNewCampaign({...newCampaign, segment: e.target.value})}
                placeholder="e.g. Realtors (US)"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description</Label>
              <Textarea 
                value={newCampaign.description}
                onChange={(e) => setNewCampaign({...newCampaign, description: e.target.value})}
                placeholder="Campaign goals and messaging summary..."
                className="rounded-xl h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreateCampaign} disabled={saving} className="rounded-xl bg-indigo-600 text-[10px] font-black uppercase tracking-widest">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Initialize Blast
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
