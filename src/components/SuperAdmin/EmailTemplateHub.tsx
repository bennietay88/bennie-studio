import React from "react";
import { BookOpen, Search, ShieldCheck } from "lucide-react";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export type EmailTemplate = { id: string; name: string; problem: string; stage: string; subject: string; body: string; note: string };

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "enquiry", name: "Enquiry / quotation friction", problem: "Quotation journey", stage: "First contact",
    note: "A concise first note when you found friction in a real quote or contact path.",
    subject: "One enquiry-path idea for {{company}}",
    body: "Hi {{first_name}},\n\nI noticed this on {{company}}’s website: {{finding}}.\n\nFor a service business, making the next step clear can help visitors understand how to request a quotation.\n\nI run Bennie Studio, where we build and manage enquiry-focused websites. Would a short example of how I would improve that section be useful?\n\nBest,\nBennie\nBennie Studio\n\nIf this is not relevant, reply stop and I will not follow up.",
  },
  {
    id: "portfolio", name: "Portfolio not supporting enquiries", problem: "Portfolio / trust", stage: "First contact",
    note: "For project-led firms where the work gallery is hard to connect to a next step.",
    subject: "A project-page suggestion for {{company}}",
    body: "Hi {{first_name}},\n\nI looked through {{company}}’s project pages and noticed {{finding}}.\n\nI have one idea for making the work easier to evaluate and enquire about. Would you like me to send it over?\n\nBest,\nBennie\nBennie Studio\n\nReply stop if you’d rather not receive more emails.",
  },
  {
    id: "services", name: "Services hard to compare", problem: "Service clarity", stage: "First contact",
    note: "When customers have to work to understand or compare the listed services.",
    subject: "A service-page idea for {{company}}",
    body: "Hi {{first_name}},\n\nI was comparing the services on {{company}}’s website and noticed {{finding}}.\n\nWould a clearer way to present that choice be useful? I can send a short outline tailored to the page I saw.\n\nBest,\nBennie\nBennie Studio\n\nReply stop to opt out.",
  },
  {
    id: "mobile", name: "Mobile contact problem", problem: "Mobile UX", stage: "First contact",
    note: "Only use after checking the actual mobile page and recording a specific issue.",
    subject: "A mobile-page observation for {{company}}",
    body: "Hi {{first_name}},\n\nI checked {{company}}’s website on my phone and noticed {{finding}}.\n\nWould a marked-up screenshot of that spot be useful? It would show the issue and one possible fix.\n\nBest,\nBennie\nBennie Studio\n\nReply stop if you’d prefer no follow-up.",
  },
  {
    id: "no-site", name: "No official site linked", problem: "No website", stage: "First contact",
    note: "Only after checking the source listing and confirming an official site is not linked.",
    subject: "A website question for {{company}}",
    body: "Hi {{first_name}},\n\nI found {{company}} through {{finding}} and couldn’t see an official website linked there — I may have missed it.\n\nIs a website something you’re considering this year? If so, I can share a simple example of what a managed site could cover.\n\nBest,\nBennie\nBennie Studio\n\nReply stop to opt out.",
  },
  {
    id: "managed", name: "Website maintenance responsibility", problem: "Ongoing care", stage: "First contact",
    note: "When a visible site detail suggests updates may be getting missed.",
    subject: "Who looks after {{company}}’s website?",
    body: "Hi {{first_name}},\n\nI noticed {{finding}} while looking at {{company}}’s website.\n\nDo you already have someone looking after updates and maintenance? If not, I can send a short outline of how our managed service works.\n\nBest,\nBennie\nBennie Studio\n\nReply stop to opt out.",
  },
  {
    id: "booking", name: "Appointment booking friction", problem: "Booking journey", stage: "First contact",
    note: "For clinics, salons and appointment-based businesses after testing the booking path.",
    subject: "A booking-path idea for {{company}}",
    body: "Hi {{first_name}},\n\nI tried the appointment journey on {{company}}’s site and noticed {{finding}}.\n\nWould one practical suggestion for making booking easier to reach be useful?\n\nBest,\nBennie\nBennie Studio\n\nReply stop to opt out.",
  },
  {
    id: "local", name: "Service area clarity", problem: "Local service area", stage: "First contact",
    note: "For local businesses when the service area is missing or hard to find on the live site.",
    subject: "A service-area suggestion for {{company}}",
    body: "Hi {{first_name}},\n\nI checked {{company}}’s website and noticed {{finding}}.\n\nWould it be useful if I sent a quick outline for making the areas you serve easier for customers to confirm?\n\nBest,\nBennie\nBennie Studio\n\nReply stop to opt out.",
  },
  {
    id: "trust", name: "Trust and proof placement", problem: "Trust signals", stage: "First contact",
    note: "When genuine credentials, process details or customer proof are difficult to find.",
    subject: "A trust-building idea for {{company}}",
    body: "Hi {{first_name}},\n\nI was looking at {{company}}’s website and noticed {{finding}}.\n\nI have one idea for bringing that reassurance closer to the service decision. Would you like me to send it?\n\nBest,\nBennie\nBennie Studio\n\nReply stop to opt out.",
  },
  {
    id: "pricing-clarity", name: "Pricing and scope clarity", problem: "Pricing clarity", stage: "First contact",
    note: "When customers cannot tell what is included or how to request a suitable quote.",
    subject: "A pricing-page idea for {{company}}",
    body: "Hi {{first_name}},\n\nI looked at {{company}}’s pricing information and noticed {{finding}}.\n\nWould a short suggestion for making the scope or next step clearer be useful?\n\nBest,\nBennie\nBennie Studio\n\nReply stop to opt out.",
  },
  {
    id: "location", name: "Location and contact details", problem: "Contact details", stage: "First contact",
    note: "For a verified gap in location, hours or contact options on a key page.",
    subject: "A contact-details suggestion for {{company}}",
    body: "Hi {{first_name}},\n\nI checked {{company}}’s contact information and noticed {{finding}}.\n\nWould it help if I sent one suggestion for making the right contact option easier to find?\n\nBest,\nBennie\nBennie Studio\n\nReply stop to opt out.",
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
  const contactName = String(prospect?.contact_first_name || prospect?.contact_name || "").trim().split(/\s+/)[0];
  const observation = finding.trim().length >= 10 ? finding.trim().replace(/\.$/, "") : "a point in the enquiry journey that deserves a closer look";
  const fill = (value: string) => value
    .replace(/\{\{company\}\}/g, company)
    .replace(/\{\{first_name\}\}/g, contactName || `${company} team`)
    .replace(/\{\{finding\}\}/g, observation);
  const market = String(prospect?.location || "");
  const isSG = /(^|[,\s])(?:SG|Singapore)(?=$|[,\s])/i.test(market);
  const subject = fill(template.subject);
  const body = fill(template.body);
  // Do not silently append an audit link to a first-touch email that asks permission to share it.
  // Operators can add a recipient-safe audit link manually when it matches the chosen CTA.
  return "Subject: " + (isSG && template.stage === "First contact" ? "<ADV> " : "") + subject + "\n\n" + body;
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
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Choose a message for the specific issue you verified. Templates fill the draft; you review and send each one yourself.</p></div>
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
