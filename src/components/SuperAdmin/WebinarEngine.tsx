import React, { useState, useEffect } from "react";
import { Video, Users, PlayCircle, Calendar, BarChart3, Clock, Loader2, Plus, MoreVertical, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export function WebinarEngine() {
  const [webinars, setWebinars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newWebinar, setNewWebinar] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    status: "Draft",
  });

  useEffect(() => {
    fetchWebinars();
  }, []);

  const fetchWebinars = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("webinars")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWebinars(data || []);
    } catch (error: any) {
      console.error("Error fetching webinars:", error);
      toast.error("Failed to load webinars");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWebinar = async () => {
    if (!newWebinar.title) {
      toast.error("Title is required");
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from("webinars")
        .insert([newWebinar])
        .select()
        .single();

      if (error) throw error;
      
      setWebinars([data, ...webinars]);
      setIsAddModalOpen(false);
      setNewWebinar({ title: "", description: "", scheduled_at: "", status: "Draft" });
      toast.success("Webinar created successfully");
    } catch (error: any) {
      console.error("Error creating webinar:", error);
      toast.error(error.message || "Failed to create webinar");
    } finally {
      setSaving(false);
    }
  };

  const deleteWebinar = async (id: string) => {
    if (!confirm("Are you sure you want to delete this webinar?")) return;

    try {
      const { error } = await supabase.from("webinars").delete().eq("id", id);
      if (error) throw error;
      
      setWebinars(webinars.filter(w => w.id !== id));
      toast.success("Webinar deleted");
    } catch (error: any) {
      console.error("Error deleting webinar:", error);
      toast.error("Failed to delete webinar");
    }
  };

  const [selectedWebinar, setSelectedWebinar] = useState<any>(null);
  const [showManageModal, setShowManageModal] = useState(false);

  const handleManage = (webinar: any) => {
    setSelectedWebinar(webinar);
    setShowManageModal(true);
  };

  return (
    <div className="space-y-8 pt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">
          Webinar <span className="text-indigo-600">Engine</span>
        </h1>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 h-11 px-8 font-black uppercase tracking-widest text-[10px]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Webinar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3 rounded-[2.5rem] border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900/50">
          <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black italic uppercase tracking-tight dark:text-white">Active Funnels</CardTitle>
              <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Converting intent into qualified WAAS consultations</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y divide-slate-50">
               {loading ? (
                 <div className="p-20 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
                    <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading Funnels...</p>
                 </div>
               ) : webinars.length === 0 ? (
                 <div className="p-20 text-center">
                    <p className="text-slate-400 font-bold text-sm">No webinars found. Create your first webinar funnel!</p>
                 </div>
               ) : (
                 webinars.map((webinar) => (
                   <div key={webinar.id} className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:bg-slate-50 transition-colors">
                     <div className="flex items-center gap-6">
                       <div className="h-16 w-16 rounded-[2rem] bg-indigo-50 flex items-center justify-center border border-indigo-100 italic font-black text-indigo-600 text-2xl">
                         <Video className="h-8 w-8" />
                       </div>
                       <div>
                         <h3 className="text-xl font-black italic uppercase italic tracking-tight text-slate-900 dark:text-white leading-tight mb-1">{webinar.title}</h3>
                         <div className="flex items-center gap-4">
                           <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                             <Calendar className="h-3 w-3" /> 
                             {webinar.scheduled_at ? format(new Date(webinar.scheduled_at), "MMM dd, h:mm a") : "TBD"}
                           </span>
                           <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                             <Users className="h-3 w-3" /> {webinar.attendees_count || 0} Registered
                           </span>
                         </div>
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-4">
                        <div className="text-right mr-4">
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Replay Volume</p>
                           <p className="text-lg font-black italic text-slate-900 dark:text-white">{webinar.replay_count || 0}</p>
                        </div>
                        <Badge variant="outline" className={cn(
                          "rounded-full px-3 py-0.5 text-[8px] font-black uppercase border-none",
                          webinar.status === "Live" ? "bg-emerald-500 text-white" : 
                          webinar.status === "Draft" ? "bg-slate-100 text-slate-400" :
                          "bg-blue-50 text-blue-600"
                        )}>
                          {webinar.status}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteWebinar(webinar.id)}
                          className="rounded-xl hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          className="rounded-xl h-10 border-slate-200"
                          onClick={() => handleManage(webinar)}
                        >
                          Manage
                        </Button>
                     </div>
                   </div>
                 ))
               )}
             </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[2.5rem] bg-slate-900 text-white p-8 relative overflow-hidden border-none h-full">
            <PlayCircle className="absolute -right-8 -bottom-8 h-48 w-48 text-indigo-500/10 rotate-12" />
            <div className="relative z-10 flex flex-col h-full">
               <CardTitle className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-6">Retention Pulse</CardTitle>
               <div className="flex-1 space-y-8">
                 <div>
                    <div className="flex justify-between items-end mb-2">
                       <p className="text-[10px] font-black text-slate-400 uppercase">Avg. Watch Time</p>
                       <p className="text-xl font-black italic text-white leading-none">24m 12s</p>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full w-2/3 bg-indigo-500 rounded-full" />
                    </div>
                 </div>
                 
                 <div>
                    <div className="flex justify-between items-end mb-2">
                       <p className="text-[10px] font-black text-slate-300 uppercase">Click Through</p>
                       <p className="text-xl font-black italic text-white leading-none">18.4%</p>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full w-1/4 bg-emerald-400 rounded-full" />
                    </div>
                 </div>
               </div>
               
               <div className="pt-8 border-t border-white/10 mt-8">
                  <p className="text-[10px] font-bold text-slate-300 uppercase leading-relaxed mb-4 italic">
                    The webinar replay is our most efficient tool for pre-qualifying leads at scale.
                  </p>
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 rounded-xl font-black uppercase tracking-widest text-[10px]">
                    Auto-Optimization
                  </Button>
               </div>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase italic tracking-tight">Create Webinar Funnel</DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Set up a new automated webinar to drive platform growth.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Webinar Title</Label>
              <Input 
                value={newWebinar.title}
                onChange={(e) => setNewWebinar({...newWebinar, title: e.target.value})}
                placeholder="e.g. Scaling without Technology Overhead"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Scheduled At (Optional)</Label>
              <Input 
                type="datetime-local"
                value={newWebinar.scheduled_at}
                onChange={(e) => setNewWebinar({...newWebinar, scheduled_at: e.target.value})}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Initial Status</Label>
              <Select 
                value={newWebinar.status}
                onValueChange={(val) => setNewWebinar({...newWebinar, status: val})}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Live">Live</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreateWebinar} disabled={saving} className="rounded-xl bg-indigo-600 text-[10px] font-black uppercase tracking-widest">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Launch Funnel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showManageModal} onOpenChange={setShowManageModal}>
        <DialogContent className="rounded-3xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase italic tracking-tight">Manage Funnel: {selectedWebinar?.title}</DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Configure automation assets and conversion triggers.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
             <div className="space-y-4">
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Replay Video URL</Label>
                   <div className="flex gap-2">
                      <Input defaultValue="https://vimeo.com/812374/replay" className="rounded-xl flex-1" />
                      <Button variant="outline" size="icon" className="rounded-xl text-indigo-600"><PlayCircle className="h-4 w-4" /></Button>
                   </div>
                </div>
                <div className="space-y-2">
                   <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Master Slide Deck</Label>
                   <Input defaultValue="https://docs.google.com/slides/d/1xABc..." className="rounded-xl" />
                </div>
             </div>
             <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                   <BarChart3 className="h-4 w-4 text-emerald-600" />
                   <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Closing Logic</h4>
                </div>
                <div className="space-y-3">
                   <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 text-[10px]">
                      <span className="font-bold text-slate-500 uppercase tracking-tighter">CTA Timestamp</span>
                      <span className="font-black text-indigo-600">18:42</span>
                   </div>
                   <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 text-[10px]">
                      <span className="font-bold text-slate-500 uppercase tracking-tighter">Trigger Action</span>
                      <span className="font-black text-indigo-600">Consultation Link</span>
                   </div>
                </div>
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManageModal(false)} className="rounded-xl">Close</Button>
            <Button className="rounded-xl bg-indigo-600 h-10 px-6 font-black uppercase tracking-widest text-[10px]">Update Assets</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
