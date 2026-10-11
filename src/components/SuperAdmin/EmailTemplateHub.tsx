import React from "react";
import { BookOpen, Search, ShieldCheck } from "lucide-react";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type Template = { id: string; name: string; problem: string; stage: string; subject: string; body: string; note: string };

export const EMAIL_TEMPLATES: Template[] = [
  {
    id: "enquiry", name: "Enquiry / quotation friction", problem: "Quotation journey", stage: "First contact",
    note: "Use when you verified a real issue with quotation or contact steps.",
    subject: "A quotation improvement idea for {{company}}",
    body: "Hi {{company}} team,\n\nI reviewed your website and noticed {{finding}}.\n\nOne practical improvement I'd recommend is [a specific improvement verified against the website].\n\nI run Bennie Studio and build and manage websites for service businesses. Would a short visual explanation be useful?\n\nBest,\nBennie\nBennie Studio\n\nIf you'd prefer no more emails, reply stop.",
  },
  {
    id: "portfolio", name: "Portfolio not supporting enquiries", problem: "Portfolio / trust", stage: "First contact",
    note: "For renovation, design and proof-led companies with a verified portfolio gap.",
    subject: "A portfolio-to-enquiry idea for {{company}}",
    body: "Hi {{company}} team,\n\nLooking through your work, I noticed {{finding}}.\n\nA possible improvement would be [specific, verified suggestion connecting projects to the next enquiry step].\n\nBennie Studio designs and manages websites for service businesses. Would you like a quick visual example?\n\nBest,\nBennie\nBennie Studio\n\nReply stop if you'd rather not receive more emails.",
  },
  {
    id: "services", name: "Services hard to compare", problem: "Service clarity", stage: "First contact",
    note: "For confusing or incomplete service paths confirmed on the live site.",
    subject: "One service-page idea for {{company}}",
    body: "Hi {{company}} team,\n\nI looked at your services and noticed {{finding}}.\n\nI'd suggest [one change you checked that makes the customer's next step clearer].\n\nI run Bennie Studio, where we develop and manage service-business websites. Would a short before-and-after direction be useful?\n\nBest,\nBennie\nBennie Studio\n\nTo opt out, reply stop.",
  },
  {
    id: "mobile", name: "Mobile contact problem", problem: "Mobile UX", stage: "First contact",
    note: "Only choose after checking the actual mobile experience.",
    subject: "A mobile enquiry suggestion for {{company}}",
    body: "Hi {{company}} team,\n\nI checked your site on mobile and noticed {{finding}}.\n\nOne simple thing I would change is [a specific, tested mobile change].\n\nI build and look after service-business websites at Bennie Studio. Can I share a short recording with the suggestion?\n\nBest,\nBennie\nBennie Studio\n\nReply stop if you'd prefer no follow-up.",
  },
  {
    id: "no-site", name: "No official site linked", problem: "No website", stage: "First contact",
    note: "Verify that the business listing really lacks a website link; do not assume they have no site.",
    subject: "Managed website question for {{company}}",
    body: "Hi {{company}} team,\n\nI found your business through [verified source] but couldn't see an official website linked there — I may have missed it.\n\nBennie Studio builds and manages websites, including hosting and agreed updates. Is a website something you're considering at the moment?\n\nBest,\nBennie\nBennie Studio\n\nIf you don't want further emails, reply stop.",
  },
  {
    id: "managed", name: "Website maintenance responsibility", problem: "Ongoing care", stage: "First contact",
    note: "For businesses that may need a person responsible for regular upkeep.",
    subject: "Website management at {{company}}",
    body: "Hi {{company}} team,\n\nWhile looking at your website I noticed {{finding}}.\n\nI run Bennie Studio. We design and manage business websites, covering hosting, maintenance and agreed updates. Do you already have someone responsible for keeping the site up to date?\n\nBest,\nBennie\nBennie Studio\n\nReply stop to opt out.",
  },
  {
    id: "follow-up", name: "Respectful first follow-up", problem: "No response", stage: "Contacted",
    note: "Only follow up where permitted and where the recipient has not opted out.",
    subject: "Following up on the website suggestion for {{company}}",
    body: "Hi {{company}} team,\n\nFollowing up once on my note about {{finding}}.\n\nIf it's not a priority, no problem — I won't keep following up. If useful, I can share the short visual suggestion.\n\nBest,\nBennie\nBennie Studio\n\nReply stop to opt out.",
  },
  {
    id: "interested", name: "Reply to genuine interest", problem: "Interested prospect", stage: "Replied",
    note: "For a human reply, not an automated acknowledgement.",
    subject: "Next step for {{company}}",
    body: "Hi {{company}} team,\n\nThanks for your reply. Based on your interest in [the prospect's exact requirement], we could start by clarifying the site scope, customer enquiry path and whether ongoing management would be useful.\n\nWould you prefer a brief 15-minute discussion or a written outline?\n\nBest,\nBennie\nBennie Studio",
  },
  {
    id: "call", name: "Before a booked conversation", problem: "Meeting preparation", stage: "Call booked",
    note: "Only use after a real booking is confirmed.",
    subject: "Preparing for our website discussion",
    body: "Hi {{company}} team,\n\nThanks for arranging our discussion. I'll focus on your website goals, the essential scope and the managed service options.\n\nIf convenient, please share [any specific item you agreed to bring] before our call.\n\nBest,\nBennie\nBennie Studio",
  },
  {
    id: "proposal", name: "Proposal decision follow-up", problem: "Open proposal", stage: "Proposal sent",
    note: "Only use when a genuine proposal was sent.",
    subject: "Any questions about {{company}}'s website proposal?",
    body: "Hi {{company}} team,\n\nChecking whether you had any questions about the website proposal I sent on [actual proposal date].\n\nI'm happy to clarify scope, setup and monthly costs, timeline or maintenance responsibilities.\n\nBest,\nBennie\nBennie Studio",
  },
];

export function buildEmailTemplateDraft(id: string, prospect: any, finding: string) {
  const template = EMAIL_TEMPLATES.find((item) => item.id === id) || EMAIL_TEMPLATES[0];
  const company = String(prospect?.name || "[business name]").trim();
  const observation = finding.trim().length >= 10 ? finding.trim().replace(/\.$/, "") : "[a verified website observation]";
  const fill = (value: string) => value.replace(/\{\{company\}\}/g, company).replace(/\{\{finding\}\}/g, observation);
  const market = String(prospect?.location || "");
  const isSG = /(^|[,\s])(?:SG|Singapore)(?=$|[,\s])/i.test(market);
  const subject = fill(template.subject);
  return "Subject: " + (isSG && template.stage === "First contact" ? "<ADV> " : "") + subject + "\n\n" + fill(template.body);
}
export function recommendedTemplateId(status: string) {
  if (status === "replied") return "interested";
  if (status === "call_booked") return "call";
  if (status === "contacted") return "follow-up";
  return "enquiry";
}
export function hasUnresolvedEmailPlaceholders(body: string) {
  return /\[[^\]\n]{3,}\]|\{\{[^}]+\}\}/.test(body);
}
export function EmailTemplateHub({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const [search, setSearch] = React.useState("");
  const [problem, setProblem] = React.useState("all");
  const [stage, setStage] = React.useState("all");
  const stages = [...new Set(EMAIL_TEMPLATES.map((t) => t.stage))];
  const problems = [...new Set(EMAIL_TEMPLATES.map((t) => t.problem))];
  const visible = EMAIL_TEMPLATES.filter((t) =>
    (stage === "all" || t.stage === stage) && (problem === "all" || t.problem === problem) &&
    [t.name,t.note,t.problem].join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  return <section aria-label="Email template hub" className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 sm:p-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-700"><BookOpen className="h-4 w-4" /> Email Template Hub</p>
        <h2 className="mt-2 text-2xl font-bold text-slate-950">Messages by problem and buyer stage</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Choose from ten different starting points. Templates populate the editable outreach draft below; nothing sends automatically.</p></div>
      <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700"><ShieldCheck className="h-4 w-4" /> Human reviewed</span>
    </div>
    <div className="mt-5 grid gap-3 md:grid-cols-[1.2fr_1fr_1fr]">
      <label className="relative"><span className="sr-only">Search email templates</span><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search buyer problem" className="rounded-xl bg-white pl-9" /></label>
      <Select value={stage} onValueChange={setStage}><SelectTrigger aria-label="Filter by buyer stage" className="rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All stages</SelectItem>{stages.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
      <Select value={problem} onValueChange={setProblem}><SelectTrigger aria-label="Filter by customer problem" className="rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All problems</SelectItem>{problems.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
    </div>
    <div className="mt-4 grid max-h-[370px] gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((t) => <button key={t.id} type="button" onClick={() => onSelect(t.id)} aria-pressed={selectedId === t.id} className={`rounded-2xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${selectedId === t.id ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-indigo-300"}`}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">{t.stage} · {t.problem}</p>
        <h3 className="mt-2 text-sm font-bold text-slate-950">{t.name}</h3>
        <p className="mt-2 text-xs leading-5 text-slate-600">{t.note}</p>
        <p className="mt-3 text-xs font-bold text-indigo-700">{selectedId === t.id ? "Selected for draft" : "Apply to draft →"}</p>
      </button>)}
      {!visible.length && <p className="text-sm text-slate-500">No matching templates.</p>}
    </div>
    <p className="mt-4 text-xs leading-5 text-slate-600">All [bracketed details] must be replaced with verified specifics. Check the recipient's market, eligibility and opt-out state. This tool does not trigger mass sends.</p>
  </section>;
}
