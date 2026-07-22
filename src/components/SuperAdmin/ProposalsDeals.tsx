import React, { useState, useEffect } from "react";
import { FileText, CircleDollarSign, CheckCircle2, Clock, MoreVertical, CreditCard, Plus, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { cn } from "../../lib/utils";

const packagePresets = {
  Launch: {
    value: 49,
    setup_fee: 497,
    scope: [
      "One-page managed business website",
      "Mobile-responsive layout and enquiry CTA",
      "Basic SEO title and meta description",
      "Contact form and WhatsApp-ready lead path",
    ],
    outcome: "Fast professional launch for a business that needs a clean online presence without a large upfront website project.",
  },
  Growth: {
    value: 99,
    setup_fee: 997,
    scope: [
      "Up to three managed website pages",
      "Home, services, and contact/enquiry structure",
      "Local SEO-ready copy sections",
      "Monthly content update support",
    ],
    outcome: "A stronger small business website with clearer service proof, more conversion paths, and room to improve monthly.",
  },
  Scale: {
    value: 199,
    setup_fee: 1497,
    scope: [
      "Up to five managed website pages",
      "Campaign or landing page support",
      "Advanced CTA sections and enquiry tracking",
      "Priority updates and growth recommendations",
    ],
    outcome: "A managed growth website for businesses that need more pages, campaign support, and stronger enquiry performance.",
  },
  "Custom Website": {
    value: 0,
    setup_fee: 3500,
    scope: [
      "Custom website project scope",
      "CMS access for blog and content publishing",
      "Advanced SEO page structure",
      "Custom integrations quoted separately",
    ],
    outcome: "A premium custom build for companies that need full CMS control, content publishing, ownership, and deeper customization.",
  },
};

export function ProposalsDeals() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [newProposal, setNewProposal] = useState({
    business_id: "",
    title: "",
    package_name: "Launch",
    value: packagePresets.Launch.value,
    setup_fee: packagePresets.Launch.setup_fee,
    status: "Sent",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const stats = {
    pipelineVolume: proposals.reduce((acc, p) => acc + (p.value || 0), 0),
    avgDaysToClose: 14.2, // Still static for now or can be derived if we have closed_at
    pendingFees: proposals.filter(p => p.status !== 'Accepted').reduce((acc, p) => acc + (p.setup_fee || 0), 0),
  };

  useEffect(() => {
    fetchProposals();
    fetchBusinesses();
  }, []);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("proposals")
        .select("*, businesses(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProposals(data || []);
    } catch (error: any) {
      console.error("Error fetching proposals:", error);
      toast.error("Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name")
        .order("name");
      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error("Error fetching businesses:", error);
    }
  };

  const handleCreateProposal = async () => {
    if (!newProposal.business_id || !newProposal.title) {
      toast.error("Business and Title are required");
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase
        .from("proposals")
        .insert([newProposal])
        .select("*, businesses(name)")
        .single();

      if (error) throw error;
      
      setProposals([data, ...proposals]);
      setIsAddModalOpen(false);
      setNewProposal({
        business_id: "",
        title: "",
        package_name: "Launch",
        value: packagePresets.Launch.value,
        setup_fee: packagePresets.Launch.setup_fee,
        status: "Sent",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      toast.success("Proposal sent to prospect");
    } catch (error: any) {
      console.error("Error sending proposal:", error);
      toast.error(error.message || "Failed to send proposal");
    } finally {
      setSaving(false);
    }
  };

  const deleteProposal = async (id: string) => {
    if (!confirm("Are you sure you want to retract this proposal?")) return;

    try {
      const { error } = await supabase.from("proposals").delete().eq("id", id);
      if (error) throw error;
      
      setProposals(proposals.filter(p => p.id !== id));
      toast.success("Proposal retracted");
    } catch (error: any) {
      console.error("Error deleting proposal:", error);
      toast.error("Failed to retract proposal");
    }
  };

  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const handlePreview = (proposal: any) => {
    setSelectedProposal(proposal);
    setShowPreviewModal(true);
  };

  const selectedPackage = selectedProposal
    ? packagePresets[selectedProposal.package_name as keyof typeof packagePresets] || packagePresets.Growth
    : packagePresets.Growth;

  return (
    <div className="space-y-8 pt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">
          Proposals <span className="text-indigo-600">& Deals</span>
        </h1>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 h-11 px-8 font-black uppercase tracking-widest text-[10px]"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Proposal
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white dark:bg-slate-900/50 dark:border-slate-800">
           <CardHeader className="p-8 pb-4">
             <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pipeline Volume</CardTitle>
           </CardHeader>
           <CardContent className="px-8 pb-8 flex items-end justify-between">
              <div>
                 <div className="text-5xl font-black italic text-slate-900 dark:text-white tracking-tighter leading-none mb-1">
                   ${stats.pipelineVolume.toLocaleString()}
                 </div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Potential Monthly Revenue</p>
              </div>
              <div className="flex flex-col items-end">
                 <Badge className="bg-emerald-50 text-emerald-600 border-none rounded-full px-3 py-1 mb-2">
                    <span className="h-1 w-1 rounded-full bg-emerald-500 mr-1.5" />
                    Healthy
                 </Badge>
                 <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">+18% MoM</p>
              </div>
           </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-indigo-600 text-white border-none">
           <CardHeader className="p-8 pb-4">
             <CardTitle className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Closing Velocity</CardTitle>
           </CardHeader>
           <CardContent className="px-8 pb-8 flex items-end justify-between">
              <div>
                 <div className="text-5xl font-black italic text-white tracking-tighter leading-none mb-1">{stats.avgDaysToClose}</div>
                 <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Avg. Days to Close</p>
              </div>
              <div className="h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center">
                 <Clock className="h-8 w-8 text-white" />
              </div>
           </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-slate-900 text-white border-none">
           <CardHeader className="p-8 pb-4">
             <CardTitle className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Uncollected Fees</CardTitle>
           </CardHeader>
           <CardContent className="px-8 pb-8 flex items-end justify-between">
              <div>
                 <div className="text-5xl font-black italic text-rose-400 tracking-tighter leading-none mb-1">
                   ${stats.pendingFees.toLocaleString()}
                 </div>
                 <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Setup Fees Pending</p>
              </div>
              <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center">
                 <CreditCard className="h-8 w-8 text-rose-400" />
              </div>
           </CardContent>
        </Card>
      </div>

      <Card className="rounded-[3rem] border-slate-100 shadow-xl shadow-slate-100/50 bg-white dark:bg-slate-900/50 dark:border-slate-800 overflow-hidden">
        <CardHeader className="p-8 border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/50 flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-black italic uppercase tracking-tight dark:text-white">Active Proposals</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Prospect</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">WAAS Package</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Value</th>
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Expiration</th>
                    <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
                        <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accessing Pipeline...</p>
                      </td>
                    </tr>
                  ) : proposals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <p className="text-slate-400 font-bold text-sm">No active proposals in scope.</p>
                      </td>
                    </tr>
                  ) : (
                    proposals.map((deal) => (
                      <tr key={deal.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-8">
                           <p className="text-sm font-black text-slate-900 dark:text-white italic uppercase italic tracking-tight">{deal.businesses?.name || "Global Entity"}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{deal.title}</p>
                        </td>
                        <td className="px-8 py-8 items-center">
                           <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-indigo-100 text-indigo-600 px-3 py-1 rounded-full">
                             {deal.package_name}
                           </Badge>
                        </td>
                        <td className="px-8 py-8">
                           <div className="space-y-0.5">
                              <p className="text-sm font-black text-slate-900 dark:text-white italic">${deal.value}/mo</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">${deal.setup_fee} Setup</p>
                           </div>
                        </td>
                        <td className="px-8 py-8">
                           <p className="text-xs font-black text-rose-500 italic uppercase">
                             {deal.expires_at ? new Date(deal.expires_at).toLocaleDateString() : "No Expiry"}
                           </p>
                        </td>
                        <td className="px-8 py-8 text-right">
                           <div className="flex gap-2 justify-end">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handlePreview(deal)}
                                className="rounded-xl h-8 text-[8px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50"
                              >
                                View
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => deleteProposal(deal.id)}
                                className="rounded-xl h-8 w-8 hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
            <DialogTitle className="text-xl font-black italic uppercase italic tracking-tight">Draft Neural Proposal</DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Synthesize a professional WAAS agreement for an active target.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Business</Label>
              <Select 
                value={newProposal.business_id}
                onValueChange={(val) => setNewProposal({...newProposal, business_id: val})}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select business..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {businesses.map((biz) => (
                    <SelectItem key={biz.id} value={biz.id}>{biz.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Proposal Title</Label>
              <Input 
                value={newProposal.title}
                onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                placeholder="e.g. Website Growth Strategy 2024"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recommended Package</Label>
              <Select
                value={newProposal.package_name}
                onValueChange={(val) => {
                  const preset = packagePresets[val as keyof typeof packagePresets] || packagePresets.Launch;
                  setNewProposal({
                    ...newProposal,
                    package_name: val,
                    value: preset.value,
                    setup_fee: preset.setup_fee,
                  });
                }}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {Object.keys(packagePresets).map((plan) => (
                    <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Monthly Recurring</Label>
                <Input 
                  type="number"
                  value={newProposal.value}
                  onChange={(e) => setNewProposal({...newProposal, value: parseInt(e.target.value) || 0})}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">One-time Setup</Label>
                <Input 
                  type="number"
                  value={newProposal.setup_fee}
                  onChange={(e) => setNewProposal({...newProposal, setup_fee: parseInt(e.target.value) || 0})}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreateProposal} disabled={saving} className="rounded-xl bg-indigo-600 text-[10px] font-black uppercase tracking-widest">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              Dispatch Proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
         <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] p-0 border-none bg-white">
            {selectedProposal && (
               <div className="flex flex-col">
                  <div className="bg-slate-900 p-12 text-white relative overflow-hidden">
                     <FileText className="absolute -right-10 -bottom-10 h-64 w-64 text-white/5" />
                     <div className="relative z-10 flex justify-between items-start">
                        <div className="space-y-4">
                          <Badge className="bg-indigo-600 font-black px-4 py-1.5 rounded-full text-[10px] tracking-[0.2em] uppercase">GROWTH OS AGREEMENT</Badge>
                           <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-tight">
                              Managed Website Proposal / <span className="text-indigo-400">{selectedProposal.businesses?.name}</span>
                           </h2>
                           <p className="max-w-xl text-sm font-semibold leading-6 text-slate-300">
                              {selectedPackage.outcome}
                           </p>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valid Until</p>
                           <p className="text-xl font-black italic text-white">{new Date(selectedProposal.expires_at).toLocaleDateString()}</p>
                        </div>
                     </div>
                  </div>

                  <div className="p-12 space-y-12">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-6">
                           <h3 className="text-sm font-black uppercase text-indigo-600 tracking-widest">Recommended Scope</h3>
                           <div className="space-y-4">
                              {selectedPackage.scope.map((item, i) => (
                                 <div key={i} className="flex items-center gap-3">
                                    <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">{item}</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                        <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 flex flex-col justify-between">
                           <div>
                              <h3 className="text-sm font-black uppercase text-slate-900 tracking-widest mb-6">Investment Structure</h3>
                              <div className="space-y-4">
                                 <div className="flex justify-between items-center pb-4 border-b border-slate-200">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Managed Website Plan</span>
                                    <span className="text-lg font-black italic">
                                      {selectedProposal.value > 0 ? `$${selectedProposal.value}/mo` : "Custom quote"}
                                    </span>
                                 </div>
                                 <div className="flex justify-between items-center pb-4">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Setup / Project Fee</span>
                                    <span className="text-lg font-black italic">${selectedProposal.setup_fee}</span>
                                 </div>
                              </div>
                           </div>
                           <div className="mt-8 pt-8 border-t border-slate-200">
                              <div className="flex justify-between items-center mb-6">
                                 <span className="text-sm font-black uppercase text-slate-900 tracking-widest">Initial Due</span>
                                 <span className="text-2xl font-black italic text-indigo-600">
                                   ${selectedProposal.setup_fee}
                                 </span>
                              </div>
                              <Button className="w-full bg-slate-900 text-white h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]">
                                 Accept Proposal
                              </Button>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            )}
         </DialogContent>
      </Dialog>
    </div>
  );
}
