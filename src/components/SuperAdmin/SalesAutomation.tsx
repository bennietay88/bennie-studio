import React from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowRight, CalendarCheck, Check, Clock3, MailCheck, MessageSquareReply, Pause, Play, RefreshCw, Send, ShieldCheck, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import type { OutreachSequence, SalesCallBooking, SalesMessage } from "../../lib/salesAutomation";
import { getOutreachObservation } from "../../lib/salesAutomation";
import { EMAIL_TEMPLATES } from "./EmailTemplateHub";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";

type ContactOption = { id: string; kind: "lead" | "prospect"; name: string; email: string; detail: string; observation?: string };

const suggestedReply = (message: SalesMessage) => {
  const intent = message.classification || "unknown";
  if (["unsubscribe", "not_interested"].includes(intent)) {
    return "Do not send a sales follow-up. Honour the recipient's preference and confirm their suppression status.";
  }
  if (intent === "interested") {
    return "Acknowledge their exact interest, explain one relevant way Bennie Studio could help, and ask if a 15-minute scoping call would be useful. Do not send a generic pitch.";
  }
  if (intent === "objection") {
    return "Answer the specific objection first. If it concerns price or scope, distinguish setup from ongoing management and ask which part needs to change for the project to be viable.";
  }
  if (intent === "question") {
    return "Answer the actual question clearly, then suggest one proportionate next step. Do not replace the answer with another sales question.";
  }
  if (intent === "not_now") {
    return "Respect the timing. Ask whether there is a particular month to revisit; if they do not invite a later contact, close the active follow-up.";
  }
  return "Read the message and respond personally to its content. If intent is unclear, ask one clarifying question rather than sending another template.";
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
    const firstError = [sequenceResult, messageResult, bookingResult, taskResult, leadResult, prospectResult, eventResult].find((result) => result.error)?.error;
    if (firstError) toast.error("Some sales records could not be loaded. Refresh before taking action.");
    setSequences((sequenceResult.data || []) as OutreachSequence[]);
    setMessages((messageResult.data || []) as SalesMessage[]);
    setBookings((bookingResult.data || []) as SalesCallBooking[]);
    setTasks(taskResult.data || []);
    setEvents(eventResult.data || []);
    setLostDeals((leadResult.data || []).filter((item) => item.status === "lost"));
    setContacts([
      ...(leadResult.data || []).filter((item) => item.email && !["won", "lost", "closed", "meeting"].includes(item.status)).map((item) => ({ id: item.id, kind: "lead" as const, name: item.raw_fields?.businessName || item.name, email: item.email, detail: `Inbound · ${item.status || "new"}`, observation: "" })),
      ...(prospectResult.data || []).filter((item) => item.contact_email && !["won", "lost", "replied", "call_booked"].includes(item.outreach_status)).map((item) => ({ id: item.id, kind: "prospect" as const, name: item.name, email: item.contact_email, detail: [item.industry, item.location].filter(Boolean).join(" · ") || "Prospect", observation: getOutreachObservation(item.notes) })),
    ]);
    setLoading(false);
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  const now = new Date();
  const activeSequences = sequences.filter((item) => item.status === "active");
  const selectedSequenceDetails = sequences.find((item) => item.id === selectedSequence);
  const permissionedReviewSequence = selectedSequenceDetails?.audience_type === "cold";
  const drafts = messages.filter((item) => item.status === "draft" &&
    (!item.provider_payload?.directAuditFollowUp || !item.scheduled_at || new Date(item.scheduled_at) <= now));
  const replies = messages.filter((item) => item.direction === "inbound" || item.status === "replied");
  const sentEmailMessages = messages.filter((item) => item.direction === "outbound" && item.channel === "email" && Boolean(item.sent_at));
  const repliedMessageIds = new Set(replies.map((item) => item.reply_to_message_id).filter(Boolean));
  const repliedEmailMessages = sentEmailMessages.filter((item) => repliedMessageIds.has(item.id));
  const replyRate = sentEmailMessages.length ? Math.round((repliedEmailMessages.length / sentEmailMessages.length) * 100) : null;
  const templatePerformance = Object.entries(sentEmailMessages.reduce<Record<string, { sent: number; replies: number }>>((acc, item) => {
    const templateId = item.provider_payload?.templateId;
    if (!templateId) return acc;
    const row = acc[templateId] || { sent: 0, replies: 0 };
    row.sent++;
    if (repliedMessageIds.has(item.id)) row.replies++;
    acc[templateId] = row;
    return acc;
  }, {})).sort((a, b) => b[1].sent - a[1].sent);
  const deliveryMessages = messages.filter((item) => item.direction === "outbound" && item.channel === "email");
  const deliveryOutcomes = { delivered: 0, bounced: 0, failed: 0, pending: 0 };
  for (const message of deliveryMessages) {
    if (["delivered", "opened", "clicked", "replied"].includes(message.status)) deliveryOutcomes.delivered++;
    else if (["bounced", "complained", "suppressed"].includes(message.status)) deliveryOutcomes.bounced++;
    else if (message.status === "failed") deliveryOutcomes.failed++;
    else deliveryOutcomes.pending++;
  }
  const bounceCount = deliveryOutcomes.bounced;
  const acceptedCount = deliveryMessages.filter((item) => Boolean(item.sent_at)).length;
  const bounceRate = acceptedCount ? Math.round((bounceCount / acceptedCount) * 100) : null;
  const upcomingCalls = bookings.filter((item) => item.status === "booked" && new Date(item.start_at) >= new Date());
  const openTasks = tasks.filter((item) => item.status === "open");
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const overdueTasks = openTasks.filter((item) => item.due_at && new Date(item.due_at) <= now);
  const callsToday = upcomingCalls.filter((item) => new Date(item.start_at) <= endOfToday);
  const recentReplyCutoff = now.getTime() - 48 * 60 * 60 * 1000;
  const recentReplies = replies.filter((item) => new Date(item.sent_at || item.created_at || 0).getTime() >= recentReplyCutoff).slice(0, 5);
  const todayActionCount = drafts.length + overdueTasks.length + callsToday.length + recentReplies.length;

  const toggleSequence = async (sequence: OutreachSequence) => {
    const status = sequence.status === "active" ? "paused" : "active";
    if (status === "active" && sequence.audience_type === "cold") {
      const confirmation = window.confirm("This enables only permissioned website-review emails. No scraped or unsolicited cold outreach is allowed through Resend. Continue?");
      if (!confirmation) return;
    }
    const { error } = await supabase.from("outreach_sequences").update({ status, updated_at: new Date().toISOString() }).eq("id", sequence.id);
    if (error) return toast.error(error.message);
    toast.success(status === "active" ? "Sequence activated. New enrolments still require first-message approval." : "Sequence paused.");
    await load();
  };

  const enroll = async () => {
    const contact = contacts.find((item) => `${item.kind}:${item.id}` === selectedContact);
    if (!contact || !selectedSequence) return toast.error("Choose an active sequence and contact.");
    if (observation.trim().length < 10) return toast.error("Add one specific, verified website finding (at least 10 characters) before enrolling.");
    setWorking(true);
    try {
      await api("/api/admin/sales-automation/enroll", { method: "POST", body: JSON.stringify({ sequenceId: selectedSequence, [contact.kind === "lead" ? "leadId" : "prospectId"]: contact.id, observation: observation.trim() || undefined }) });
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
      if (result.deliveryBlocked) toast.error(`${result.deliveryBlocked} message${result.deliveryBlocked === 1 ? " needs" : "s need"} delivery review. Check configuration, safety checks and provider delivery before retrying.`);
      else toast.success(`${result.sent || 0} sent, ${result.suppressed || 0} suppressed, ${result.failed || 0} failed.`);
      await load();
    } catch (error: any) { toast.error(error.message); } finally { setWorking(false); }
  };

  const updateBooking = async (booking: SalesCallBooking, status: string) => {
    try {
      await api(`/api/admin/sales-automation/bookings/${booking.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
    } catch (error: any) { toast.error(error.message); }
  };

  const saveCallOutcome = async (booking: SalesCallBooking) => {
    try {
      await api(`/api/admin/sales-automation/bookings/${booking.id}`, { method: "PATCH", body: JSON.stringify({ outcome: booking.outcome || "", nextAction: booking.next_action || "" }) });
      toast.success("Call outcome and next action saved.");
      await load();
    } catch (error: any) { toast.error(error.message); }
  };

  const completeTask = async (id: string) => {
    try {
      await api(`/api/admin/sales-tasks/${encodeURIComponent(id)}`, {
        method: "PATCH", body: JSON.stringify({ status: "completed" }),
      });
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Task could not be completed.");
    }
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

      <Tabs defaultValue="today">
        <TabsList className="h-auto flex-wrap rounded-2xl bg-slate-100 p-1"><TabsTrigger value="today" className="rounded-xl">Today {todayActionCount > 0 && <Badge className="ml-2 border-none bg-indigo-600 text-white">{todayActionCount}</Badge>}</TabsTrigger><TabsTrigger value="control" className="rounded-xl">Sequences</TabsTrigger><TabsTrigger value="queue" className="rounded-xl">Approval queue</TabsTrigger><TabsTrigger value="calls" className="rounded-xl">Calls & follow-ups</TabsTrigger><TabsTrigger value="insights" className="rounded-xl">Sales learning</TabsTrigger></TabsList>

        <TabsContent value="today" className="mt-6 space-y-6">
          <div className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Next best action</p><h2 className="mt-2 text-2xl font-black">{todayActionCount ? `${todayActionCount} sales action${todayActionCount === 1 ? "" : "s"} need attention` : "Your sales queue is clear"}</h2><p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">Work replies and booked calls first, then approvals and overdue follow-ups. Start new outreach only after today’s commitments are handled.</p></div>
              <Button type="button" onClick={() => navigate("/admin/outreach_lab")} className="min-h-11 rounded-xl bg-white text-slate-950 hover:bg-indigo-50">Open outreach workbench <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </div>

          {todayActionCount === 0 ? <Empty icon={Check} title="Nothing is waiting" description="Use the outreach workbench to prepare one verified, relevant message for a qualified prospect. New replies, calls and follow-ups will return here." /> : (
            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="rounded-3xl border-slate-200"><CardHeader><CardTitle>Replies and approvals</CardTitle></CardHeader><CardContent className="space-y-3">
                {recentReplies.map((message) => <div key={`reply-${message.id}`} className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4"><div className="flex items-center justify-between gap-3"><Badge className="bg-indigo-100 text-indigo-800">Recent reply</Badge><span className="truncate text-xs font-semibold text-slate-500">{message.recipient}</span></div><p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-slate-700">{message.body_text}</p><p className="mt-3 text-xs font-bold text-indigo-700">Respond personally before starting new cold outreach.</p></div>)}
                {drafts.slice(0, 5).map((message) => <div key={`draft-${message.id}`} className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><Badge className="bg-amber-100 text-amber-800">Approval</Badge><p className="mt-3 font-black text-slate-950">{message.subject || "First outreach draft"}</p><p className="mt-1 text-xs font-semibold text-slate-500">To {message.recipient}</p></div><Button size="sm" onClick={() => void approve(message)} disabled={working} className="rounded-xl bg-slate-950 text-white"><Check className="mr-1 h-4 w-4" /> Review & queue</Button></div></div>)}
                {!recentReplies.length && !drafts.length && <p className="py-8 text-center text-sm font-semibold text-slate-500">No recent replies or approvals are waiting.</p>}
              </CardContent></Card>

              <Card className="rounded-3xl border-slate-200"><CardHeader><CardTitle>Calls and commitments</CardTitle></CardHeader><CardContent className="space-y-3">
                {callsToday.map((booking) => <div key={`call-${booking.id}`} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><Badge className="bg-emerald-100 text-emerald-800">Call today</Badge><p className="mt-3 font-black text-slate-950">{booking.business_name}</p><p className="mt-1 text-xs font-semibold text-slate-600">{new Date(booking.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {booking.name}</p><p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-slate-700">{booking.goals || "Review the lead brief and confirm the desired enquiry path before the call."}</p></div>)}
                {overdueTasks.map((task) => <div key={`task-${task.id}`} className="rounded-2xl border border-rose-200 bg-rose-50 p-4"><div className="flex items-start justify-between gap-3"><div><Badge className="bg-rose-100 text-rose-800">Overdue</Badge><p className="mt-3 font-black text-slate-950">{task.title}</p>{task.due_at && <p className="mt-1 text-xs font-semibold text-rose-700">Due {new Date(task.due_at).toLocaleString()}</p>}</div><Button size="sm" variant="outline" onClick={() => void completeTask(task.id)} className="rounded-xl bg-white"><Check className="mr-1 h-4 w-4" /> Done</Button></div></div>)}
                {!callsToday.length && !overdueTasks.length && <p className="py-8 text-center text-sm font-semibold text-slate-500">No calls or overdue commitments today.</p>}
              </CardContent></Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="control" className="mt-6 space-y-6">
          <Card className="rounded-3xl border-slate-200"><CardHeader><CardTitle>Sequences</CardTitle></CardHeader><CardContent className="space-y-3">{sequences.map((sequence) => <div key={sequence.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4"><div><p className="font-black text-slate-950">{sequence.name}</p><p className="mt-1 text-xs font-semibold text-slate-500">{sequence.settings?.purpose as string || sequence.audience_type} · first message approval</p></div><Button variant="outline" onClick={() => void toggleSequence(sequence)} className="rounded-xl">{sequence.status === "active" ? <><Pause className="mr-2 h-4 w-4" /> Pause</> : <><Play className="mr-2 h-4 w-4" /> Activate</>}</Button></div>)}</CardContent></Card>
          <Card className="rounded-3xl border-slate-200"><CardHeader><CardTitle>Enrol a qualified contact</CardTitle></CardHeader><CardContent className="space-y-4"><div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-semibold leading-6 text-indigo-950">{permissionedReviewSequence ? "This sequence is for verified opt-in recipients only. Start with one checked website observation, not a mass introduction. First messages require approval." : "Enroll a qualified, permissioned contact in an active sequence. First messages require approval."}</div><Select value={selectedSequence} onValueChange={setSelectedSequence}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose an active sequence" /></SelectTrigger><SelectContent>{activeSequences.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><Select value={selectedContact} onValueChange={(value) => { setSelectedContact(value); const match = contacts.find((item) => `${item.kind}:${item.id}` === value); setObservation(match?.observation?.split("\n")[0] || ""); }}><SelectTrigger className="rounded-xl"><SelectValue placeholder="Choose a lead or prospect" /></SelectTrigger><SelectContent>{contacts.map((item) => <SelectItem key={`${item.kind}:${item.id}`} value={`${item.kind}:${item.id}`}>{item.name} · {item.detail}</SelectItem>)}</SelectContent></Select><Textarea value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="One specific, verified observation from the live website." className="min-h-24 rounded-xl" /><p className="text-xs text-slate-500">Only record confirmed observations. Do not infer lost sales. Resend marketing requires documented opt-in, and approval does not override that rule.</p><Button onClick={() => void enroll()} disabled={working || !activeSequences.length} className="w-full rounded-xl bg-indigo-600 text-white"><Users className="mr-2 h-4 w-4" /> Enrol and prepare first draft</Button></CardContent></Card>
        </TabsContent>

        <TabsContent value="queue" className="mt-6 space-y-4">
          {drafts.length === 0 ? <Empty icon={MailCheck} title="No messages need approval" description="First-message drafts and due audit follow-ups appear here for review." /> : drafts.map((message) => <Card key={message.id} className="rounded-3xl border-slate-200"><CardContent className="p-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><Badge variant="outline">{message.channel}</Badge><Badge className="bg-amber-100 text-amber-800">Approval required</Badge></div><p className="mt-4 text-xs font-black uppercase tracking-wider text-slate-500">To {message.recipient}</p><p className="mt-2 font-black text-slate-950">{message.subject}</p><Textarea value={message.body_text} onChange={(event) => setMessages((current) => current.map((item) => item.id === message.id ? { ...item, body_text: event.target.value } : item))} className="mt-3 min-h-48 rounded-2xl bg-slate-50 leading-7" /></div><Button onClick={() => void approve(message)} disabled={working} className="rounded-xl bg-slate-950 text-white hover:bg-indigo-600"><Check className="mr-2 h-4 w-4" /> Approve & queue</Button></div></CardContent></Card>)}
        </TabsContent>

        <TabsContent value="calls" className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-3xl border-slate-200"><CardHeader><CardTitle>Confirmed calls</CardTitle></CardHeader><CardContent className="space-y-3">{bookings.length === 0 ? <p className="py-12 text-center text-sm font-semibold text-slate-500">No confirmed calls yet.</p> : bookings.map((booking) => <div key={booking.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-black text-slate-950">{booking.business_name}</p><p className="mt-1 text-sm font-semibold text-slate-500">{booking.name} · {booking.email}</p><p className="mt-2 text-xs font-black text-indigo-600">{new Date(booking.start_at).toLocaleString()} · {booking.timezone}</p></div><Select value={booking.status} onValueChange={(value) => void updateBooking(booking, value)}><SelectTrigger className="w-36 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{["booked","completed","no_show","cancelled"].map((status) => <SelectItem key={status} value={status}>{status.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div><div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"><strong>Pre-call brief:</strong> {booking.industry || "Industry not provided"} in {booking.market || "market not provided"}. {booking.goals || "No goal notes yet."} {booking.website_url && <a className="ml-1 font-bold text-indigo-600" href={booking.website_url} target="_blank" rel="noreferrer">Open website</a>}</div><div className="mt-4 grid gap-3"><Textarea value={booking.outcome || ""} onChange={(event) => setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, outcome: event.target.value } : item))} placeholder="Call outcome: what the prospect said, decided, or objected to" className="min-h-20 rounded-xl" /><div className="flex flex-col gap-2 sm:flex-row"><Input value={booking.next_action || ""} onChange={(event) => setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, next_action: event.target.value } : item))} placeholder="One concrete next action" className="rounded-xl" /><Button variant="outline" onClick={() => void saveCallOutcome(booking)} className="rounded-xl">Save</Button>{booking.lead_id && <Button onClick={() => { sessionStorage.setItem("bts_proposal_lead_id", booking.lead_id || ""); navigate("/admin/proposals_deals"); }} className="rounded-xl bg-slate-950 text-white">Create proposal</Button>}</div></div></div>)}</CardContent></Card>
          <Card className="rounded-3xl border-slate-200"><CardHeader><CardTitle>Actions due</CardTitle></CardHeader><CardContent className="space-y-3">{openTasks.length === 0 ? <p className="py-12 text-center text-sm font-semibold text-slate-500">No sales actions are due.</p> : openTasks.map((task) => <div key={task.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><Badge className={task.priority === "high" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"}>{task.priority}</Badge><p className="mt-3 font-black text-slate-950">{task.title}</p>{task.due_at && <p className="mt-1 text-xs font-semibold text-slate-500">Due {new Date(task.due_at).toLocaleString()}</p>}</div><Button size="sm" variant="outline" onClick={() => void completeTask(task.id)} className="rounded-xl"><Check className="mr-1 h-4 w-4" /> Done</Button></div></div>)}</CardContent></Card>
        </TabsContent>

        <TabsContent value="insights" className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card className="rounded-3xl border-slate-200"><CardHeader><CardTitle>Observable engagement</CardTitle></CardHeader><CardContent className="space-y-4"><Insight label="Sent emails · latest 150 records" value={sentEmailMessages.length} /><Insight label="Recorded reply rate" value={replyRate === null ? "—" : `${replyRate}% (${repliedEmailMessages.length}/${sentEmailMessages.length})`} /><Insight label="Replies received" value={replies.length} /><Insight label="Delivered" value={deliveryOutcomes.delivered} /><Insight label="Bounced / complained / suppressed" value={bounceCount} /><Insight label="Failed before delivery" value={deliveryOutcomes.failed} /><Insight label="Pending / unsent" value={deliveryOutcomes.pending} /><Insight label="Bounce rate among sent" value={bounceRate === null ? "—" : `${bounceRate}%`} /><Insight label="Proposal views" value={events.filter((item) => item.event_type === "viewed").length} /><Insight label="Calls booked" value={bookings.filter((item) => item.status === "booked").length} /><p className="rounded-xl bg-slate-50 p-4 text-xs font-semibold leading-5 text-slate-600">Reply rate compares sent outbound email records with inbound messages linked to them. Delivery counts use the latest 150 sales-message records loaded here. Failed messages are included even when no send timestamp exists; rate calculations use accepted sends.</p></CardContent></Card>
          <Card className="rounded-3xl border-slate-200"><CardHeader><CardTitle>What to improve next</CardTitle></CardHeader><CardContent>{sentEmailMessages.length >= 20 && repliedEmailMessages.length === 0 ? <div className="space-y-3"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-black text-amber-950">No replies recorded across {sentEmailMessages.length} recent sends.</p><p className="mt-2 text-sm font-semibold leading-6 text-amber-900">Pause the broad wording. Check delivery and reply sync first, then test one problem-specific template with a small, well-matched group. The engine now records template-level outcomes for new sends.</p></div>{replies.length > 0 && <p className="text-xs text-slate-500">Replies exist in the inbox but are not linked to a sent email, so the response-rate figure may be low.</p>}</div> : replies.length < 5 ? <Empty icon={Sparkles} title="Not enough response data yet" description="Use template-specific drafts and record honest observations. Review delivery, reply sync, and call notes before changing send timing or making claims from opens." /> : <div className="space-y-3">{Object.entries(replies.reduce<Record<string, number>>((acc, item) => { const key = item.classification || "unknown"; acc[key] = (acc[key] || 0) + 1; return acc; }, {})).sort((a,b) => b[1]-a[1]).map(([label,value]) => <Insight key={label} label={label.replaceAll("_", " ")} value={value} />)}</div>}</CardContent></Card>
          <Card className="rounded-3xl border-slate-200"><CardHeader><CardTitle>Template performance</CardTitle></CardHeader><CardContent className="space-y-3">{templatePerformance.length === 0 ? <Empty icon={Sparkles} title="Template tracking starts with new sends" description="Choose a template in Prospect Explorer. The engine will record sends and linked replies so you can compare messages by problem." /> : templatePerformance.map(([templateId, stats]) => { const template = EMAIL_TEMPLATES.find((item) => item.id === templateId); const rate = stats.sent ? Math.round((stats.replies / stats.sent) * 100) : 0; return <div key={templateId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"><div><p className="font-bold text-slate-800">{template?.name || templateId}</p><p className="mt-1 text-xs font-semibold text-slate-500">{stats.sent} sent · {stats.replies} replies</p></div><span className="text-lg font-black text-indigo-700">{rate}%</span></div>; })}</CardContent></Card>
          <Card className="rounded-3xl border-slate-200"><CardHeader><CardTitle>Reply assistant</CardTitle></CardHeader><CardContent className="space-y-3">{replies.length === 0 ? <Empty icon={MessageSquareReply} title="No replies to draft from" description="When an inbound reply arrives, the system classifies its intent and prepares a human-editable response direction." /> : replies.slice(0, 5).map((message) => <div key={message.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><Badge variant="outline" className="capitalize">{String(message.classification || "unknown").replaceAll("_", " ")}</Badge><span className="text-xs font-semibold text-slate-500">{message.recipient}</span></div><p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-slate-600">{message.body_text}</p><div className="mt-3 rounded-xl bg-indigo-50 p-3 text-sm font-semibold leading-6 text-indigo-950"><strong>Draft direction:</strong> {suggestedReply(message)}</div></div>)}</CardContent></Card>
          <Card className="rounded-3xl border-slate-200"><CardHeader><CardTitle>Lost-deal learning</CardTitle></CardHeader><CardContent>{lostDeals.length === 0 ? <Empty icon={Activity} title="No recorded lost deals" description="Mark genuine lost opportunities and record the reason after the conversation. Do not infer a reason from silence." /> : <div className="space-y-3">{lostDeals.slice(0, 8).map((lead) => <div key={lead.id} className="rounded-xl border border-slate-200 p-4"><p className="font-black text-slate-900">{lead.raw_fields?.businessName || lead.name}</p><p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-500">{lead.message || "No loss reason recorded—add one before changing the offer."}</p></div>)}</div>}</CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Metric({ icon: Icon, label, value, note }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; note: string }) { return <Card className="rounded-3xl border-slate-200"><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p><Icon className="h-4 w-4 text-indigo-600" /></div><p className="mt-3 text-3xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{note}</p></CardContent></Card>; }
function Insight({ label, value }: { label: string; value: number | string }) { return <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4"><span className="text-sm font-bold capitalize text-slate-700">{label}</span><span className="text-xl font-black text-slate-950">{value}</span></div>; }
function Empty({ icon: Icon, title, description }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }) { return <div className="grid min-h-52 place-items-center text-center"><div><Icon className="mx-auto h-9 w-9 text-slate-300" /><p className="mt-4 font-black text-slate-800">{title}</p><p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">{description}</p></div></div>; }
