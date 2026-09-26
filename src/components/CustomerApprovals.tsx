import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, MessageSquare, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export function CustomerApprovals() {
  const { profile } = useAuth();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!profile?.businessId) return setLoading(false);
    setLoading(true);
    const { data, error } = await supabase
      .from("customer_approvals")
      .select("*")
      .eq("business_id", profile.businessId)
      .order("requested_at", { ascending: false });
    if (error) toast.error("Could not load approval requests. Apply the latest operations migration.");
    setApprovals(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile?.businessId]);

  const respond = async (status: "approved" | "changes_requested") => {
    if (!selected) return;
    if (status === "changes_requested" && !notes.trim()) return toast.error("Describe the changes you need");
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your session has expired. Sign in again.");
      const response = await fetch(`/api/customer/approvals/${encodeURIComponent(selected.id)}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status, notes: notes.trim() || null }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Approval response could not be saved.");
      toast.success(status === "approved" ? "Website version approved" : "Change request submitted");
      setSelected(null);
      setNotes("");
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Approval response could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex min-h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600"/></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-black tracking-tight text-slate-950">Website Approvals</h1><p className="mt-1 text-sm font-semibold text-slate-500">Review website versions, approve work, or request specific changes.</p></div>
      <div className="space-y-4">
        {approvals.map((approval) => <Card key={approval.id} className="rounded-2xl border-slate-200"><CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50"><ShieldCheck className="h-6 w-6 text-indigo-600"/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-black text-slate-950">{approval.title}</p><Badge variant="outline">{approval.status.replace(/_/g, " ")}</Badge></div><p className="mt-1 text-sm text-slate-600">{approval.description}</p><p className="mt-2 text-xs font-semibold text-slate-400">{approval.version_label || "Current version"} · Requested {new Date(approval.requested_at).toLocaleDateString()}</p>{approval.customer_notes && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Your response: {approval.customer_notes}</p>}</div><div className="flex gap-2">{approval.preview_url && <a href={approval.preview_url} target="_blank" rel="noreferrer"><Button variant="outline" className="rounded-xl"><ExternalLink className="mr-2 h-4 w-4"/>Preview</Button></a>}{approval.status === "pending" && <Button onClick={() => { setSelected(approval); setNotes(""); }} className="rounded-xl bg-indigo-600">Review & Respond</Button>}</div></CardContent></Card>)}
        {!approvals.length && <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500"/><p className="mt-3 font-black text-slate-900">No approvals waiting</p><p className="text-sm text-slate-500">New website review requests will appear here.</p></div>}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="max-w-lg rounded-3xl"><DialogHeader><DialogTitle>{selected?.title}</DialogTitle><DialogDescription>Approval records the current version as accepted. Use request changes for clear, consolidated feedback.</DialogDescription></DialogHeader><div className="space-y-2 py-3"><Label>Feedback or approval note</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="List the exact changes needed, or leave an optional approval note." className="min-h-32"/></div><DialogFooter><Button variant="outline" onClick={() => respond("changes_requested")} disabled={saving}><MessageSquare className="mr-2 h-4 w-4"/>Request Changes</Button><Button onClick={() => respond("approved")} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}<CheckCircle2 className="mr-2 h-4 w-4"/>Approve Version</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
