import React from "react";
import { useNavigate } from "react-router-dom";
import { Activity, CalendarCheck, Check, Clock3, MailCheck, MessageSquareReply, Pause, Play, RefreshCw, Send, ShieldCheck, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import type { OutreachSequence, SalesCallBooking, SalesMessage } from "../../lib/salesAutomation";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";

type ContactOption = { id: string; kind: "lead" | "prospect"; name: string; email: string; detail: string; observation?: string };

const suggestedReply = (message: SalesMessage) => {
  const opener = "Thanks for the honest reply.";
  if (message.classification === "objection") return `${opener} I do not want to push past a concern. Which part feels least workable right now: the scope, setup fee, monthly commitment, or timing? I can answer that directly and tell you if a smaller starting point is the better fit.`;
  if (message.classification === "question") return `${opener} I will answer this specifically. Before I do, is your main priority getting the website live, improving the enquiry journey, or having someone manage ongoing changes?`;
  if (message.classification === "interested") return `${opener} The useful next step is a short call where I can confirm the website scope and enquiry path. I can then send one clear proposal with the timing and commercial terms.`;
  if (message.classification === "not_now") return `${opener} I will close the active follow-up for now. When would it be genuinely useful for me to check back?`;
  return `${opener} I have read your note and will respond personally with the most relevant next step.`;
};

const api = async (path: string, options: RequestInit = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}`, ...(options.headers || {}) } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || payload.message || "Request failed");
  return payload;
};

export function SalesAutomation() {
  const navigate = useNavigate();
  const [sequences, setSequences] = React.useState<OutreachSequence[]>([]);
  const [messages, setMessages] = React.useState<SalesMessage[]>([]);
  const [bookings, setBookings] = React.useState<SalesCallBooking[]>([]);
  const [tasks, setTasks] = React.useState<any[]>([]);
  const [contacts, setContacts] = React.useState<ContactOption[]>([]);
  const [events, setEvents] = React.useState<any[]>([]);
  const [lostDeals, setLostDeals] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [working, setWorking] = React.useState(false);
  const [selectedSequence, setSelectedSequence] = React.useState("");
  const [selectedContact, setSelectedContact] = React.useState("");
  const [observation, setObservation] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    const [sequenceResult, messageResult, bookingResult, taskResult, leadResult, prospectResult, eventResult] = await Promise.all([
      supabase.from("outreach_sequences").select("*").neq("status", "archived").order("created_at"),
      supabase.from("sales_messages").select("*").order("created_at", { ascending: false }).limit(150),
      supabase.from("sales_call_bookings").select("*").order("start_at", { ascending: true }).limit(100),
      supabase.from("sales_tasks").select("*").order("due_at", { ascending: true, nullsFirst: false }).limit(100),
      supabase.from("leads").select("id,name,email,raw_fields,message,status").order("created_at", { ascending: false }).limit(150),
      supabase.from("prospects").select("id,name,contact_email,industry,location,notes,outreach_status").order("created_at", { ascending: false }).limit(150),
      supabase.from("proposal_events").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    const firstError = [sequenceResult, messageResult, bookingResult, taskResult].find((result) => result.error)?.error;
    if (firstError) toast.error(firstError.message || "Apply the sales automation migration before using this page.");
    setSequences((sequenceResult.data || []) as OutreachSequence[]);
    setMessages((messageResult.data || []) as SalesMessage[]);
    setBookings((bookingResult.data || []) as SalesCallBooking[]);
    setTasks(taskResult.data || []);
    setEvents(eventResult.data || []);
    setLostDeals((leadResult.data || []).filter((item) => item.status === "lost"));
    setContacts([
      ...(leadResult.data || []).filter((item) => item.email).map((item) => ({ id: item.id, kind: "lead" as const, name: item.raw_fields?.businessName || item.name, email: item.email, detail: `Inbound · ${item.status || "new"}`, observation: item.message || "" })),
      ...(prospectResult.data || []).filter((item) => item.contact_email).map((item) => ({ id: item.id, kind: "prospect" as const, name: item.name, email: item.contact_email, detail: [item.industry, item.location].filter(Boolean).join(" · ") || "Prospect", observation: item.notes || "" })),
    ]);
    setLoading(false);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const activeSequences = sequences.filter((item) => item.status === "active");
  const drafts = messages.filter((item) => item.status === "draft");
  const replies = messages.filter((item) => item.direction === "inbound" || item.status === "replied");
  const upcomingCalls = bookings.filter((item) => item.status === "booked" && new Date(item.start_at) >= new Date());
  const openTasks = tasks.filter((item) => item.status === "open");

  const toggleSequence = async (sequence: OutreachSequence) => {
    const status = sequence.status === "active" ? "paused" : "active";
    const { error } = await supabase.from("outreach_sequences").update({ status, updated_at: new Date().toISOString() }).eq("id", sequence.id);
    if (error) return toast.error(error.message);
    toast.success(status === "active" ? "Sequence activated. New enrolments still require first-message approval." : "Sequence paused.");
    await load();
  };

  const enroll = async () => {
    const contact = contacts.find((item) => `${item.kind}:${item.id}` === selectedContact);
    if (!contact || !selectedSequence) return toast.error("Choose an active sequence and contact.");
    if (!observation.trim()) return toast.error("Add one observable, verified website finding before enrolling.");
    setWorking(true);
    try {
      await api("/api/admin/sales-automation/enroll", { method: "POST", body: JSON.stringify({ sequenceId: selectedSequence, [contact.kind === "lead" ? "leadId" : "prospectId"]: contact.id, observation: observation.trim() }) });
      toast.success("Contact enrolled. Review the first email in the approval queue.");
      setObservation("");
      await load();
    } catch (error: any) { toast.error(error.message); } finally { setWorking(false); }
  };

  const approve = async (message: SalesMessage) => {
    setWorking(true);
    try {
      await api(`/api/admin/sales-automation/messages/${message.id}/approve`, { method: "POST", body: JSON.stringify({ subject: message.subject || "", bodyText: message.body_text, sendNow: true }) });
      toast.success("Message approved and queued.");
      await load();
    } catch (error: any) { toast.error(error.message); } finally { setWorking(false); }
  };

  const runWorker = async () => {
    setWorking(true);
    try {
      const result = await api("/api/admin/sales-automation/run", { method: "POST", body: "{}" });
      if (result.deliveryBlocked) toast.error(`${result.deliveryBlocked} message${result.deliveryBlocked === 1 ? " is" : "s are"} ready, but Resend delivery is not configured yet.`);
      else toast.success(`${result.sent || 0} sent, ${result.suppressed || 0} suppressed, ${result.failed || 0} failed.`);
      await load();
    } catch (error: any) { toast.error(error.message); } finally { setWorking(false); }
  };

  const updateBooking = async (booking: SalesCallBooking, status: string) => {
    const { error } = await supabase.from("sales_call_bookings").update({ status, updated_at: new Date().toISOString() }).eq("id", booking.id);
    if (error) return toast.error(error.message);
    await load();
  };

  const saveCallOutcome = async (booking: SalesCallBooking) => {
    const { error } = await supabase.from("sales_call_bookings").update({ outcome: booking.outcome || null, next_action: booking.next_action || null, updated_at: new Date().toISOString() }).eq("id", booking.id);
    if (error) return toast.error(error.message);
    if (booking.next_action) await supabase.from("sales_tasks").insert({ lead_id: (booking as any).lead_id || null, title: booking.next_action, task_type: "call_follow_up", priority: "high", due_at: new Date(Date.now() + 24 * 3600000).toISOString(), metadata: { bookingId: booking.id } });
    toast.success("Call outcome and next action saved.");
    await load();
  };

  const completeTask = async (id: string) => {
    const { error } = await supabase.from("sales_tasks").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    await load();
  };

  return (
    <div className="space-y-7 pt-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Approval-first revenue operations</p><h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 dark:text-white">Sales automation</h1><p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">Automate timing, logging, reminders and stopping rules. You still approve the first message and handle meaningful replies personally.</p></div>
        <div className="flex gap-3"><Button variant="outline" onClick={() => void load()} disabled={loading} className="rounded-xl"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button><Button onClick={() => void runWorker()} disabled={working} className="rounded-xl bg-slate-950 text-white hover:bg-indigo-600"><Send className="mr-2 h-4 w-4" /> Process due messages</Button></div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric icon={Play} label="Active sequences" value={activeSequences.length} note="Enabled by you" />
        <Metric icon={ShieldCheck} label="Awaiting approval" value={drafts.length} note="Nothing sends before review" />
        <Metric icon={MessageSquareReply} label="Replies" value={replies.length} note={replies.length ? "Recorded engagement" : "Not enough data yet"} />
        <Metric icon={CalendarCheck} label="Upcoming calls" value={upcomingCalls.length} note="Confirmed bookings" />
        <Metric icon={Clock3} label="Open actions" value={openTasks.length} note="Real follow-ups and preparation" />
      </div>

      <Tabs defaultValue="control">
        <TabsList className="h-auto flex-wrap rounded-2xl bg-slate-100 p-1"><TabsTrigger value="control" className="rounded-xl">Control centre</TabsTrigger><TabsTrigger value="queue" className="rounded-xl">Approval queue</TabsTrigger><TabsTrigger value="calls" className="rounded-xl">Calls</TabsTrigger><TabsTrigger value="insights" className="rounded-xl">Sales learning</TabsTrigger></TabsList>

        <TabsContent value="control" className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-3xl border-slate-200"><CardHeader><CardTitle>Sequences</CardTitle></CardHeader><CardContent className="space-y-3">{sequences.map((sequence) => <div key={sequence.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"><div><p className="font-black text-slate-950">{sequence.name}</p><p className="mt-1 text-xs font-semibold text-slate-500">{sequence.settings?.purpose as string || sequence.audience_type} · first message approval</p></div><Button variant="outline" onClick={() => void toggleSequence(sequence)} className="rounded-xl">{sequence.status === "active" ? <><Pause className="mr-2 h-4 w-4" /> Pause</> : <><Play className="mr-2 h-4 w-4" /> Activate</>}</Button></div>)}</CardContent></Card>
          <Card className="rounded-3xl border-slate-200"><CardHeader><CardTitle>Enrol a qualified contact</CardTitle></CardHeader><CardContent className="space-y-4"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-950"><strong>Evidence gate:</strong> add one observation you verified on the real website. Do not use traffic, ranking, revenue, or conversion claims unless measured.</div><Select value={selectedSequence} onValueChange={setSelectedSequence}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose an active sequence" /></SelectTrigger><SelectContent>{activeSequences.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><Select value={selectedContact} onValueChange={(value) => { setSelectedContact(value); const match = contacts.find((item) => `${item.kind}:${item.id}` === value); setObservation(match?.observation?.split("\n")[0] || ""); }}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose a lead or prospect" /></SelectTrigger><SelectContent>{contacts.map((item) => <SelectItem key={`${item.kind}:${item.id}`} value={`${item.kind}:${item.id}`}>{item.name} · {item.detail}</SelectItem>)}</SelectContent></Select><Textarea value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="Example: The service and location are not stated in the first screen." className="min-h-28 rounded-xl" /><Button onClick={() => void enroll()} disabled={working || !activeSequences.length} className="w-full rounded-xl bg-indigo-600 text-white"><Users className="mr-2 h-4 w-4" /> Enrol and prepare first draft</Button></CardContent></Card>
        </TabsContent>

        <TabsContent value="queue" className="mt-6 space-y-4">
          {drafts.length === 0 ? <Empty icon={MailCheck} title="No messages need approval" description="New first-step drafts will appear here before anything can send." /> : drafts.map((message) => <Card key={message.id} className="rounded-3xl border-slate-200"><CardContent className="p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><Badge variant="outline">{message.channel}</Badge><Badge className="bg-amber-100 text-amber-800">Approval required</Badge></div><p className="mt-4 text-xs font-black uppercase tracking-wider text-slate-500">To {message.recipient}</p><p className="mt-2 font-black text-slate-950">{message.subject}</p><Textarea value={message.body_text} onChange={(event) => setMessages((current) => current.map((item) => item.id === message.id ? { ...item, body_text: event.target.value } : item))} className="mt-3 min-h-48 rounded-2xl bg-slate-50 leading-7" /></div><Button onClick={() => void approve(message)} disabled={working} className="rounded-xl bg-slate-950 text-white hover:bg-indigo-600"><Check className="mr-2 h-4 w-4" /> Approve & queue</Button></div></CardContent></Card>)}
        </TabsContent>

        <TabsContent value="calls" className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-3xl border-slate-200"><CardHeader><CardTitle>Confirmed calls</CardTitle></CardHeader><CardContent className="space-y-3">{bookings.length === 0 ? <p className="py-12 text-center text-sm font-semibold text-slate-500">No confirmed calls yet.</p> : bookings.map((booking) => <div key={booking.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-black text-slate-950">{booking.business_name}</p><p className="mt-1 text-sm font-semibold text-slate-500">{booking.name} · {booking.email}</p><p className="mt-2 text-xs font-black text-indigo-600">{new Date(booking.start_at).toLocaleString()} · {booking.timezone}</p></div><Select value={booking.status} onValueChange={(value) => void updateBooking(booking, value)}><SelectTrigger className="w-36 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{["booked","completed","no_show","cancelled","rescheduled"].map((status) => <SelectItem key={status} value={status}>{status.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div><div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"><strong>Pre-call brief:</strong> {booking.industry || "Industry not provided"} in {booking.market || "market not provided"}. {booking.goals || "No goal notes yet."} {booking.website_url && <a className="ml-1 font-bold text-indigo-600" href={booking.website_url} target="_blank" rel="noreferrer">Open website</a>}</div><div className="mt-4 grid gap-3"><Textarea value={booking.outcome || ""} onChange={(event) => setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, outcome: event.target.value } : item))} placeholder="Call outcome: what the prospect said, decided, or objected to" className="min-h-20 rounded-xl" /><div className="flex flex-col gap-2 sm:flex-row"><Input value={booking.next_action || ""} onChange={(event) => setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, next_action: event.target.value } : item))} placeholder="One concrete next action" className="rounded-xl" /><Button variant="outline" onClick={() => void saveCallOutcome(booking)} className="rounded-xl">Save</Button>{booking.lead_id && <Button onClick={() => { sessionStorage.setItem("bts_proposal_lead_id", booking.lead_id || ""); navigate("/admin/proposals_deals"); }} className="rounded-xl bg-slate-950 text-white">Create proposal</Button>}</div></div></div>)}</CardContent></Card>
          <Card className="rounded-3xl border-slate-200"><CardHeader><CardTitle>Actions due</CardTitle></CardHeader><CardContent className="space-y-3">{openTasks.length === 0 ? <p className="py-12 text-center text-sm font-semibold text-slate-500">No sales actions are due.</p> : openTasks.map((task) => <div key={task.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><Badge className={task.priority === "high" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}>{task.priority}</Badge><p className="mt-3 font-black text-slate-950">{task.title}</p>{task.due_at && <p className="mt-1 text-xs font-semibold text-slate-500">Due {new Date(task.due_at).toLocaleString()}</p>}</div><Button size="sm" variant="outline" onClick={() => void completeTask(task.id)} className="rounded-xl"><Check className="mr-1 h-4 w-4" /> Done</Button></div></div>)}</CardContent></Card>
        </TabsContent>

        <TabsContent value="insights" className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="rounded-3xl border-slate-200"><CardHeader><CardTitle>Observable engagement</CardTitle></CardHeader><CardContent className="space-y-4"><Insight label="Emails delivered" value={messages.filter((item) => ["delivered","opened","clicked","replied"].includes(item.status)).length} /><Insight label="Replies received" value={replies.length} /><Insight label="Proposal views" value={events.filter((item) => item.event_type === "viewed").length} /><Insight label="Calls booked" value={bookings.filter((item) => item.status === "booked").length} /><p className="rounded-xl bg-slate-50 p-4 text-xs font-semibold leading-5 text-slate-600">These are recorded events, not a lead score. Prioritise replies, confirmed calls, proposal views and overdue commitments.</p></CardContent></Card>
          <Card className="rounded-3xl border-slate-200"><CardHeader><CardTitle>What to improve next</CardTitle></CardHeader><CardContent>{replies.length < 5 ? <Empty icon={Sparkles} title="Not enough data yet" description="Collect at least a few real replies before changing a niche message or timing. Until then, optimise based on direct objections and call notes—not open-rate guesswork." /> : <div className="space-y-3">{Object.entries(replies.reduce<Record<string, number>>((acc, item) => { const key = item.classification || "unknown"; acc[key] = (acc[key] || 0) + 1; return acc; }, {})).sort((a,b) => b[1]-a[1]).map(([label,value]) => <Insight key={label} label={label.replaceAll("_", " ")} value={value} />)}</div>}</CardContent></Card>
          <Card className="rounded-3xl border-slate-200"><CardHeader><CardTitle>Reply assistant</CardTitle></CardHeader><CardContent className="space-y-3">{replies.length === 0 ? <Empty icon={MessageSquareReply} title="No replies to draft from" description="When an inbound reply arrives, the system classifies its intent and prepares a human-editable response direction." /> : replies.slice(0, 5).map((message) => <div key={message.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><Badge variant="outline" className="capitalize">{String(message.classification || "unknown").replaceAll("_", " ")}</Badge><span className="text-xs font-semibold text-slate-500">{message.recipient}</span></div><p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-slate-600">{message.body_text}</p><div className="mt-3 rounded-xl bg-indigo-50 p-3 text-sm font-semibold leading-6 text-indigo-950"><strong>Draft direction:</strong> {suggestedReply(message)}</div></div>)}</CardContent></Card>
          <Card className="rounded-3xl border-slate-200"><CardHeader><CardTitle>Lost-deal learning</CardTitle></CardHeader><CardContent>{lostDeals.length === 0 ? <Empty icon={Activity} title="No recorded lost deals" description="Mark genuine lost opportunities and record the reason after the conversation. Do not infer a reason from silence." /> : <div className="space-y-3">{lostDeals.slice(0, 8).map((lead) => <div key={lead.id} className="rounded-xl border border-slate-200 p-4"><p className="font-black text-slate-900">{lead.raw_fields?.businessName || lead.name}</p><p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-500">{lead.message || "No loss reason recorded—add one before changing the offer."}</p></div>)}</div>}</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ icon: Icon, label, value, note }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; note: string }) { return <Card className="rounded-3xl border-slate-200"><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p><Icon className="h-4 w-4 text-indigo-600" /></div><p className="mt-3 text-3xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{note}</p></CardContent></Card>; }
function Insight({ label, value }: { label: string; value: number }) { return <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4"><span className="text-sm font-bold capitalize text-slate-700">{label}</span><span className="text-xl font-black text-slate-950">{value}</span></div>; }
function Empty({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) { return <div className="grid min-h-52 place-items-center text-center"><div><Icon className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-4 font-black text-slate-800">{title}</p><p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">{description}</p></div></div>; }
