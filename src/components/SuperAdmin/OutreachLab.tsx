import React from "react";
import { CalendarClock, CheckCircle2, Copy, ExternalLink, Mail, MessageSquare, Search, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { getOutreachObservation } from "../../lib/salesAutomation";
import { EmailTemplateHub, buildEmailTemplateDraft, recommendedTemplateId, hasUnresolvedEmailPlaceholders } from "./EmailTemplateHub";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";

const OUTREACH_STATUSES = ["not_started", "queued", "contacted", "replied", "call_booked", "won", "lost"];

const buildDraft = (prospect: any, channel: "email" | "whatsapp") => {
  const name = prospect.name || "there";
  const domain = prospect.domain ? ` (${prospect.domain})` : "";
  const finding = prospect.notes?.trim()
    ? prospect.notes.trim().split("\n")[0]
    : "[add a specific observation you verified on this website]";
  if (channel === "whatsapp") {
    return `Hi ${name} team — I reviewed your website${domain}. I noticed that ${finding.replace(/^[A-Z]/, (letter: string) => letter.toLowerCase())}. I can send you a short, practical website review showing what I would change and why. Would that be useful? — Bennie`;
  }
  return `Subject: A practical website improvement for ${name}\n\nHi ${name} team,\n\nI reviewed your website${domain} and noticed that ${finding.replace(/^[A-Z]/, (letter: string) => letter.toLowerCase())}.\n\nI can prepare a short website review showing the change I would recommend and why.\n\nWould that be useful?\n\nBest,\nBennie`;
};

export function OutreachLab() {
  const [prospects, setProspects] = React.useState<any[]>([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [channel, setChannel] = React.useState<"email" | "whatsapp">("email");
  const [draft, setDraft] = React.useState("");
  const [templateId, setTemplateId] = React.useState("enquiry");
  const [search, setSearch] = React.useState("");
  const [view, setView] = React.useState<"due" | "engaged" | "all">("due");
  const [finding, setFinding] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [working, setWorking] = React.useState(false);
  const confirmationId = React.useRef(crypto.randomUUID());

  const fetchProspects = React.useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("prospects").select("*").order("next_follow_up_at", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
    if (error) toast.error(error.message || "Could not load prospects");
    setProspects(data || []);
    setLoading(false);
  }, []);

  React.useEffect(() => { void fetchProspects(); }, [fetchProspects]);

  const selected = prospects.find((prospect) => prospect.id === selectedId);
  const filtered = prospects.filter((prospect) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [prospect.name, prospect.domain, prospect.industry, prospect.location].some((value) => String(value || "").toLowerCase().includes(query));
    const isDue = prospect.next_follow_up_at && new Date(prospect.next_follow_up_at) <= new Date() && !["won", "lost"].includes(prospect.outreach_status);
    const isEngaged = ["replied", "call_booked"].includes(prospect.outreach_status);
    return matchesSearch && (view === "all" || (view === "due" && isDue) || (view === "engaged" && isEngaged));
  });
  const due = prospects.filter((prospect) => prospect.next_follow_up_at && new Date(prospect.next_follow_up_at) <= new Date() && !["won", "lost"].includes(prospect.outreach_status)).length;

  React.useEffect(() => {
    if (!selected) return;
    setFinding(getOutreachObservation(selected.notes));
    setTemplateId(recommendedTemplateId(selected.outreach_status || "not_started"));
    confirmationId.current = crypto.randomUUID();
  }, [selectedId]);

  React.useEffect(() => {
    if (selected) setDraft(channel === "email" ? buildEmailTemplateDraft(templateId, selected, finding) : buildDraft({ ...selected, notes: finding }, channel));
  }, [selectedId, channel, finding, templateId]);

  React.useEffect(() => {
    if (selectedId || !prospects.length) return;
    const next = prospects.find((prospect) => prospect.next_follow_up_at && new Date(prospect.next_follow_up_at) <= new Date() && !["won", "lost"].includes(prospect.outreach_status)) || prospects[0];
    setSelectedId(next.id);
  }, [prospects, selectedId]);

  const updateProspect = async (prospectId: string, updates: Record<string, any>) => {
    const { data, error } = await supabase.from("prospects").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", prospectId).select("*").single();
    if (error) throw error;
    setProspects((current) => current.map((item) => item.id === prospectId ? data : item));
    return data;
  };

  const saveOutreach = async (action: "prepare" | "contacted") => {
    if (!selected) throw new Error("Choose a prospect first.");
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`/api/admin/prospects/${selected.id}/outreach`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
      body: JSON.stringify({ action, channel, observation: finding.trim(), bodyText: draft, requestId: confirmationId.current }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not save outreach.");
    setProspects((current) => current.map((item) => item.id === data.prospect.id ? data.prospect : item));
    return data;
  };

  const markContacted = async () => {
    setWorking(true);
    try {
      await saveOutreach("contacted");
      toast.success("Sent message confirmed and follow-up recorded.");
    } catch (error: any) { toast.error(error.message); } finally { setWorking(false); }
  };

  const copyDraft = async () => {
    await saveOutreach("prepare");
    await navigator.clipboard.writeText(draft);
    toast.success("Draft copied. Review it before sending.");
  };

  const openContact = async () => {
    if (!selected || !draft.trim()) return;
    if (hasUnresolvedEmailPlaceholders(draft)) return toast.error("Complete every [bracketed detail] before contacting a prospect.");
    if (finding.trim().length < 10) return toast.error("Add one specific, verified website observation before opening outreach.");
    const prepared = await saveOutreach("prepare");
    if (channel === "email") {
      if (!selected.contact_email) return toast.error("This prospect has no email address.");
      const [subjectLine, ...bodyLines] = draft.split("\n");
      const subject = subjectLine.replace(/^Subject:\s*/i, "");
      window.location.href = `mailto:${prepared.recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n").trim())}`;
    } else {
      const phone = prepared.recipient;
      if (!phone) return toast.error("This prospect has no WhatsApp number.");
      // The awaited safety check can outlive the browser's popup permission.
      window.location.assign(`https://wa.me/${phone}?text=${encodeURIComponent(draft)}`);
    }
    toast.info("Draft opened. Confirm below only after you send it.");
  };

  return (
    <div className="space-y-7 pt-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Human-approved outreach</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Outreach workbench</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">Prepare a specific message from an observable website finding, open it in your chosen channel, then record the follow-up. Nothing sends automatically.</p>
        </div>
        <div className="flex gap-3">
          <Badge variant="outline" className="rounded-xl px-4 py-2 text-sm"><CalendarClock className="mr-2 h-4 w-4 text-rose-500" /> {due} due</Badge>
          <Badge variant="outline" className="rounded-xl px-4 py-2 text-sm"><CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" /> {prospects.filter((p) => ["replied", "call_booked", "won"].includes(p.outreach_status)).length} engaged</Badge>
        </div>
      </div>

      <EmailTemplateHub selectedId={templateId} onSelect={(id) => { setChannel("email"); setTemplateId(id); }} />

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 p-5"><CardTitle className="text-base">Choose a prospect</CardTitle><div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Prospect view">{([['due','Due now'],['engaged','Engaged'],['all','All']] as const).map(([value,label]) => <button key={value} type="button" onClick={() => setView(value)} className={`min-h-9 rounded-xl px-3 text-xs font-black ${view === value ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600"}`}>{label}</button>)}</div></CardHeader>
          <CardContent className="p-5">
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search business, niche or market" className="rounded-xl pl-9" /></div>
            <div className="mt-4 max-h-[560px] space-y-2 overflow-auto pr-1">
              {loading ? <p className="py-12 text-center text-sm font-semibold text-slate-500">Loading prospects…</p> : filtered.length === 0 ? <p className="py-12 text-center text-sm font-semibold text-slate-500">No prospects match this view.</p> : filtered.map((prospect) => (
                <button key={prospect.id} type="button" onClick={() => setSelectedId(prospect.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === prospect.id ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white hover:border-indigo-200"}`}>
                  <div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-950">{prospect.name}</p><p className="mt-1 text-xs font-semibold text-slate-500">{prospect.industry || "Niche not set"} · {prospect.location || "Market not set"}</p></div><Badge variant="outline" className="capitalize">{String(prospect.outreach_status || "not_started").replaceAll("_", " ")}</Badge></div>
                  {prospect.next_follow_up_at && <p className={`mt-3 text-xs font-bold ${new Date(prospect.next_follow_up_at) <= new Date() ? "text-rose-600" : "text-slate-500"}`}>Follow up {new Date(prospect.next_follow_up_at).toLocaleString()}</p>}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 p-5"><CardTitle className="flex items-center justify-between gap-3 text-base"><span>Prepare and log outreach</span>{selected?.domain && <a href={selected.domain.startsWith("http") ? selected.domain : `https://${selected.domain}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-black text-indigo-600">Open website <ExternalLink className="h-3.5 w-3.5" /></a>}</CardTitle></CardHeader>
          <CardContent className="p-5">
            {!selected ? (
              <div className="grid min-h-[420px] place-items-center rounded-3xl border-2 border-dashed border-slate-200 text-center"><div><ShieldCheck className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-4 font-black text-slate-700">Select a prospect to prepare outreach.</p></div></div>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Channel</label><Select value={channel} onValueChange={(value) => setChannel(value as "email" | "whatsapp")}><SelectTrigger className="mt-2 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent></Select></div>
                  <div><label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Pipeline status</label><Select value={selected.outreach_status || "not_started"} onValueChange={(value) => void updateProspect(selected.id, { outreach_status: value }).catch((error) => toast.error(error.message))}><SelectTrigger className="mt-2 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{OUTREACH_STATUSES.map((status) => <SelectItem key={status} value={status}>{status.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="space-y-2"><label htmlFor="verified-outreach-finding" className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Verified website observation</label><Textarea id="verified-outreach-finding" value={finding} onChange={(event) => setFinding(event.target.value)} placeholder="Example: The first screen does not state the service area or show a quotation CTA." className="min-h-24 rounded-2xl border-amber-200 bg-amber-50 p-4 font-semibold leading-6 text-amber-950" /><p className="text-xs font-semibold leading-5 text-slate-500">Use one fact you checked on the live website. Never invent rankings, traffic, revenue, or conversion loss.</p></div>
                <div className="space-y-2"><label htmlFor="outreach-draft" className="text-xs font-bold uppercase tracking-wider text-slate-500">Editable email draft</label><Textarea id="outreach-draft" value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-[300px] rounded-2xl bg-slate-50 p-5 font-medium leading-7" aria-label="Outreach draft" />{hasUnresolvedEmailPlaceholders(draft) && <p className="text-xs font-semibold text-amber-700">Replace every [bracketed detail] with verified facts before sending.</p>}</div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => void copyDraft().catch((error) => toast.error(error.message))} className="min-h-11 rounded-xl"><Copy className="mr-2 h-4 w-4" /> Copy</Button>
                  <Button type="button" onClick={() => void openContact().catch((error) => toast.error(error.message))} className="min-h-11 rounded-xl bg-slate-950 px-6 text-white hover:bg-indigo-600">{channel === "email" ? <Mail className="mr-2 h-4 w-4" /> : <MessageSquare className="mr-2 h-4 w-4" />} Open {channel === "email" ? "email" : "WhatsApp"} <Send className="ml-2 h-4 w-4" /></Button>
                  <Button type="button" variant="outline" disabled={working || finding.trim().length < 10 || hasUnresolvedEmailPlaceholders(draft)} onClick={() => void markContacted()} className="min-h-11 rounded-xl">I sent it — log follow-up</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
