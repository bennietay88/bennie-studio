import React from "react";
import { CalendarClock, CheckCircle2, Copy, ExternalLink, Mail, MessageSquare, Search, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { getOutreachObservation } from "../../lib/salesAutomation";
import { EMAIL_TEMPLATES, EmailTemplateHub, buildEmailTemplateDraft, recommendedTemplateId, hasUnresolvedEmailPlaceholders } from "./EmailTemplateHub";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";

const OUTREACH_STATUSES = ["not_started", "queued", "contacted", "replied", "call_booked", "won", "lost"];
const buildDraft = (prospect: any, channel: "email" | "whatsapp") => {
  const name = prospect.name || "there";
  const finding = String(prospect.notes || "").trim().split("\n")[0] || "[add a verified website observation]";
  if (channel === "whatsapp") {
    return `Hi ${name} team, I noticed ${finding} on your website. A useful first change would be to put the main quote or contact action beside the relevant service and make it easy to reach on mobile. Bennie Studio can build and manage that improvement. Would a scope and price be useful? — Bennie`;
  }
  return `Subject: One useful website change for ${name}\n\nHi ${name} team,\n\nI noticed ${finding} on your website.\n\nA useful first change would be to make the main quote or contact action clearer beside the service details. Bennie Studio can implement and maintain it.\n\nWould a scope and price be useful?\n\nBennie\nBennie Studio`;
};

export function OutreachLab() {
  const [prospects, setProspects] = React.useState<any[]>([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [channel, setChannel] = React.useState<"email" | "whatsapp">("email");
  const [draft, setDraft] = React.useState("");
  const [templateId, setTemplateId] = React.useState("enquiry");
  const [templateChosenByUser, setTemplateChosenByUser] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [view, setView] = React.useState<"due" | "engaged" | "all">("all");
  const [finding, setFinding] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [suppressedEmails, setSuppressedEmails] = React.useState<Set<string>>(new Set());
  const [suppressionUnavailable, setSuppressionUnavailable] = React.useState(false);
  const [working, setWorking] = React.useState(false);
  const confirmationId = React.useRef(crypto.randomUUID());

  const fetchProspects = React.useCallback(async () => {
    setLoading(true);
    const [prospectResult, suppressedResult] = await Promise.all([
      supabase.from("prospects").select("*").order("next_follow_up_at", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }).limit(5000),
      supabase.from("sales_suppressions").select("email").not("email", "is", null),
    ]);
    if (prospectResult.error) toast.error(prospectResult.error.message || "Could not load prospects");
    if (suppressedResult.error) toast.error("Suppression status unavailable; outreach is disabled until it can be checked.");
    setSuppressedEmails(new Set((suppressedResult.data || []).map((row) => String(row.email || "").toLowerCase().trim())));
    setSuppressionUnavailable(Boolean(suppressedResult.error));
    setProspects(prospectResult.data || []);
    setLoading(false);
  }, []);

  React.useEffect(() => { void fetchProspects(); }, [fetchProspects]);

  const selected = prospects.find((prospect) => prospect.id === selectedId);
  const selectedSuppressed = suppressionUnavailable || Boolean(selected?.contact_email && suppressedEmails.has(String(selected.contact_email).toLowerCase().trim()));
  const filtered = prospects.filter((prospect) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [prospect.name, prospect.domain, prospect.industry, prospect.location].some((value) => String(value || "").toLowerCase().includes(query));
    const isDue = !suppressedEmails.has(String(prospect.contact_email || "").toLowerCase().trim()) && prospect.next_follow_up_at && new Date(prospect.next_follow_up_at) <= new Date() && !["won", "lost"].includes(prospect.outreach_status);
    const isEngaged = ["replied", "call_booked"].includes(prospect.outreach_status);
    return matchesSearch && (view === "all" || (view === "due" && isDue) || (view === "engaged" && isEngaged));
  });
  const due = prospects.filter((prospect) => !suppressedEmails.has(String(prospect.contact_email || "").toLowerCase().trim()) && prospect.next_follow_up_at && new Date(prospect.next_follow_up_at) <= new Date() && !["won", "lost"].includes(prospect.outreach_status)).length;

  React.useEffect(() => {
    if (!selected) return;
    setFinding(getOutreachObservation(selected.notes));
    confirmationId.current = crypto.randomUUID();
  }, [selectedId]);

  React.useEffect(() => {
    if (selected && !templateChosenByUser) {
      setTemplateId(recommendedTemplateId(selected.outreach_status || "not_started"));
    }
  }, [selected?.outreach_status, selectedId, templateChosenByUser]);

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
      if (channel === "email") throw new Error("Email sends are logged automatically. Confirm only manual WhatsApp outreach here.");
      await saveOutreach("contacted");
      toast.success("Sent message confirmed and follow-up recorded.");
    } catch (error: any) { toast.error(error.message); } finally { setWorking(false); }
  };

  const copyDraft = async () => {
    if (selectedSuppressed) throw new Error("This recipient is suppressed; contact is blocked.");
    await saveOutreach("prepare");
    await navigator.clipboard.writeText(draft);
    toast.success("Draft copied. Review it before sending.");
  };

  const openContact = async () => {
    if (!selected || !draft.trim()) return;
    if (selectedSuppressed) return toast.error("This recipient is suppressed. Outreach is blocked.");
    if (hasUnresolvedEmailPlaceholders(draft)) return toast.error("Complete every [bracketed detail] before contacting a prospect.");
    if (finding.trim().length < 10) return toast.error("Add one specific, verified website observation before opening outreach.");
    if (channel === "email") {
      const [subjectLine, ...bodyLines] = draft.split("\n");
      const subject = subjectLine.replace(/^Subject:\s*/i, "");
      if (!subject.trim()) return toast.error("A subject is required.");
      try {
        setWorking(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Sign in to continue.");
        const response = await fetch(`/api/admin/prospects/${selected.id}/outreach`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: "send", channel: "email", observation: finding.trim(), subject,
            bodyText: bodyLines.join("\n").trim(), templateId, requestId: confirmationId.current }),
        });
        const outcome = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(outcome.error || "Email was not sent.");
        confirmationId.current = crypto.randomUUID();
        toast.success(outcome.alreadySent ? "This email was already recorded." : "Email sent and follow-up recorded.");
        await fetchProspects();
      } catch (error: any) { toast.error(error.message); }
      finally { setWorking(false); }
      return;
    }
    const prepared = await saveOutreach("prepare");
    const phone = prepared.recipient;
    if (!phone) return toast.error("This prospect has no WhatsApp number.");
    window.location.assign(`https://wa.me/${phone}?text=${encodeURIComponent(draft)}`);
    toast.info("WhatsApp opened. Confirm below only after you send it.");
  };

  return (
    <div className="space-y-7 pt-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Human-approved outreach</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Outreach workbench</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">Prepare a specific message from an observable website finding, open it in your chosen channel, then record the follow-up. Email sends only when you click Send email. WhatsApp requires manual confirmation.</p>
        </div>
        <div className="flex gap-3">
          <Badge variant="outline" className="rounded-xl px-4 py-2 text-sm"><CalendarClock className="mr-2 h-4 w-4 text-rose-500" /> {due} due</Badge>
          <Badge variant="outline" className="rounded-xl px-4 py-2 text-sm"><CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" /> {prospects.filter((p) => ["replied", "call_booked", "won"].includes(p.outreach_status)).length} engaged</Badge>
        </div>
      </div>

      <EmailTemplateHub selectedId={templateId} onSelect={(id) => { setChannel("email"); setTemplateId(id); setTemplateChosenByUser(true); }} />

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
                {selectedSuppressed && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{suppressionUnavailable ? "Suppression status cannot be verified. Sending is blocked until data is available." : "This address is suppressed. Further sales outreach is blocked."}</p>}
                {channel === "email" && <p className="text-xs text-slate-500">Send only to recipients who have given permission. Your separate consent records are not changed by this action.</p>}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Channel</label><Select value={channel} onValueChange={(value) => setChannel(value as "email" | "whatsapp")}><SelectTrigger className="mt-2 rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent></Select></div>
                  <div><label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Pipeline status</label><Select value={selected.outreach_status || "not_started"} onValueChange={(value) => void updateProspect(selected.id, { outreach_status: value }).catch((error) => toast.error(error.message))}><SelectTrigger className="mt-2 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{OUTREACH_STATUSES.map((status) => <SelectItem key={status} value={status}>{status.replaceAll("_", " ")}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="space-y-2"><label htmlFor="verified-outreach-finding" className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Verified website observation</label><Textarea id="verified-outreach-finding" value={finding} onChange={(event) => setFinding(event.target.value)} placeholder="Example: The first screen does not state the service area or show a quotation CTA." className="min-h-24 rounded-2xl border-amber-200 bg-amber-50 p-4 font-semibold leading-6 text-amber-950" /><p className="text-xs font-semibold leading-5 text-slate-500">Use one fact you checked on the live website. Never invent rankings, traffic, revenue, or conversion loss.</p></div>
                {channel === "email" && <div><label htmlFor="outreach-template-choice" className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Email template · currently applied</label><Select value={templateId} onValueChange={(value) => { setTemplateId(value); setTemplateChosenByUser(true); }}><SelectTrigger id="outreach-template-choice" className="mt-2 rounded-xl"><SelectValue placeholder="Choose a template" /></SelectTrigger><SelectContent>{EMAIL_TEMPLATES.map((template) => <SelectItem key={template.id} value={template.id}>{template.name} · {template.stage}</SelectItem>)}</SelectContent></Select><p className="mt-1 text-xs text-slate-500">Changing this selection rewrites the draft below. You can also choose a template from the cards above.</p></div>}
                <div className="space-y-2"><label htmlFor="outreach-draft" className="text-xs font-bold uppercase tracking-wider text-slate-500">Editable {channel === "email" ? "email" : "WhatsApp"} draft</label><Textarea id="outreach-draft" value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-[300px] rounded-2xl bg-slate-50 p-5 font-medium leading-7" aria-label="Outreach draft" />{hasUnresolvedEmailPlaceholders(draft) && <p className="text-xs font-semibold text-amber-700">Replace every [bracketed detail] with verified facts before sending.</p>}</div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => void copyDraft().catch((error) => toast.error(error.message))} className="min-h-11 rounded-xl"><Copy className="mr-2 h-4 w-4" /> Copy</Button>
                  <Button type="button" disabled={working || selectedSuppressed} onClick={() => void openContact().catch((error) => toast.error(error.message))} className="min-h-11 rounded-xl bg-slate-950 px-6 text-white hover:bg-indigo-600">{channel === "email" ? <Mail className="mr-2 h-4 w-4" /> : <MessageSquare className="mr-2 h-4 w-4" />} {channel === "email" ? "Send email" : "Open WhatsApp"} <Send className="ml-2 h-4 w-4" /></Button>
                  {channel === "whatsapp" && <Button type="button" variant="outline" disabled={working || selectedSuppressed || finding.trim().length < 10 || hasUnresolvedEmailPlaceholders(draft)} onClick={() => void markContacted()} className="min-h-11 rounded-xl">I sent it — log follow-up</Button>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
