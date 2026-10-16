import React from "react";
import { BookOpen, Search, ShieldCheck } from "lucide-react";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export type EmailTemplate = { id: string; name: string; problem: string; stage: string; subject: string; body: string; note: string };

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "enquiry", name: "Quotation enquiry — easier next step", problem: "Quotation journey", stage: "First contact",
    note: "Verified friction in the quote or contact path. Ask whether fixing that path is a current priority.",
    subject: "Quick question about {{company}}'s quote page",
    body: "Hi {{first_name}},\n\nI noticed something specific on {{company}}'s website: {{finding}}.\n\nThat could leave a potential customer unsure how to request a quote. I help service businesses simplify that path and keep the site updated.\n\nIs making it easier to get enquiries a priority for you right now?\n\nBest,\nBennie\nBennie Studio\n\nIf this isn't relevant, reply stop and I won't contact you again.",
  },
  {
    id: "portfolio", name: "Project pages — turn interest into contact", problem: "Portfolio / trust", stage: "First contact",
    note: "Use only with a verified project-page issue. Don't assume lost leads.",
    subject: "A question about {{company}}'s project pages",
    body: "Hi {{first_name}},\n\nWhile looking at {{company}}'s project pages, I noticed {{finding}}.\n\nSomeone interested in your work may need a clearer next step to enquire. There's a straightforward page change I'd suggest.\n\nWould you like me to send the specific change I'd make?\n\nBest,\nBennie\nBennie Studio\n\nIf this isn't relevant, reply stop and I won't contact you again.",
  },
  {
    id: "services", name: "Service pages — help buyers choose", problem: "Service clarity", stage: "First contact",
    note: "For a verified service-navigation or offer-clarity gap.",
    subject: "Choosing a service at {{company}}",
    body: "Hi {{first_name}},\n\nI noticed {{finding}} on {{company}}'s website.\n\nIt may not be obvious which service fits a visitor's situation or how to ask about it. I have one simple layout suggestion.\n\nIs this something you're looking to improve, or is the current page working well for you?\n\nBest,\nBennie\nBennie Studio\n\nIf this isn't relevant, reply stop and I won't contact you again.",
  },
  {
    id: "mobile", name: "Mobile enquiries — remove friction", problem: "Mobile UX", stage: "First contact",
    note: "Only after reviewing a real mobile screen; don't imply a screenshot is already prepared.",
    subject: "Mobile enquiry question for {{company}}",
    body: "Hi {{first_name}},\n\nOn the mobile version of {{company}}'s site, I noticed {{finding}}.\n\nThat adds a step between a visitor and contacting your team. I'd change one part of the mobile enquiry path first.\n\nWould you like a quick annotated example of what I mean?\n\nBest,\nBennie\nBennie Studio\n\nIf this isn't relevant, reply stop and I won't contact you again.",
  },
  {
    id: "no-site", name: "No website linked — qualify demand", problem: "No website", stage: "First contact",
    note: "Source must be a verified public listing. Do not assume the company has no website elsewhere.",
    subject: "Website plans for {{company}}?",
    body: "Hi {{first_name}},\n\nI came across {{company}} and noticed {{finding}}. I may simply have missed the official website.\n\nI run Bennie Studio, a done-for-you website service covering the build and ongoing updates.\n\nAre you considering an official website in the next few months, or is it not a priority?\n\nBest,\nBennie\nBennie Studio\n\nIf this isn't relevant, reply stop and I won't contact you again.",
  },
  {
    id: "managed", name: "Ongoing updates — remove the workload", problem: "Ongoing care", stage: "First contact",
    note: "Specific observable stale information only. Avoid assuming the business has no developer.",
    subject: "Who manages {{company}}'s website updates?",
    body: "Hi {{first_name}},\n\nI noticed {{finding}} on {{company}}'s website.\n\nIf keeping pages current takes time away from serving customers, Bennie Studio can handle the build, maintenance and content updates.\n\nIs website upkeep something your team would rather hand off?\n\nBest,\nBennie\nBennie Studio\n\nIf this isn't relevant, reply stop and I won't contact you again.",
  },
  {
    id: "booking", name: "Booking path — help customers act", problem: "Booking journey", stage: "First contact",
    note: "For genuine appointment-based businesses; validate the booking path first.",
    subject: "Booking question for {{company}}",
    body: "Hi {{first_name}},\n\nI checked the booking path on {{company}}'s site and noticed {{finding}}.\n\nThere's a small change I'd recommend so someone ready to book can find the right action with less searching.\n\nWould seeing that one change be useful to your team?\n\nBest,\nBennie\nBennie Studio\n\nIf this isn't relevant, reply stop and I won't contact you again.",
  },
  {
    id: "local", name: "Service area — qualify local enquiries", problem: "Local service area", stage: "First contact",
    note: "Use after confirming the service-area gap on the live site.",
    subject: "Service-area question for {{company}}",
    body: "Hi {{first_name}},\n\nOn {{company}}'s site, I noticed {{finding}}.\n\nPeople checking whether you cover their location may have to contact you just to find out. A clearer service-area section can answer that earlier.\n\nWould showing your service areas more clearly be worth improving?\n\nBest,\nBennie\nBennie Studio\n\nIf this isn't relevant, reply stop and I won't contact you again.",
  },
  {
    id: "trust", name: "Proof and reviews — reduce uncertainty", problem: "Trust signals", stage: "First contact",
    note: "Only mention publicly verifiable trust signals. Do not invent reviews or outcomes.",
    subject: "One trust-page idea for {{company}}",
    body: "Hi {{first_name}},\n\nI noticed {{finding}} while reviewing {{company}}'s website.\n\nRelevant proof is often most helpful right beside a service decision. I can show how I'd position existing reviews or credentials without adding clutter.\n\nShould I send you a quick example?\n\nBest,\nBennie\nBennie Studio\n\nIf this isn't relevant, reply stop and I won't contact you again.",
  },
  {
    id: "pricing-clarity", name: "Pricing / scope — reduce hesitation", problem: "Pricing clarity", stage: "First contact",
    note: "Use only where the live site has a verifiable scope or pricing gap.",
    subject: "Question about {{company}}'s service pricing",
    body: "Hi {{first_name}},\n\nI noticed {{finding}} on {{company}}'s website.\n\nA visitor may need to understand what's included before asking for a quote. I'd make the service scope and enquiry step clearer together.\n\nIs pricing or package clarity on your improvement list?\n\nBest,\nBennie\nBennie Studio\n\nIf this isn't relevant, reply stop and I won't contact you again.",
  },
  {
    id: "location", name: "Contact choice — fewer dead ends", problem: "Contact details", stage: "First contact",
    note: "Relevant when the site has a verified contact, opening-hour or location gap.",
    subject: "Getting in touch with {{company}}",
    body: "Hi {{first_name}},\n\nWhile checking {{company}}'s contact information, I noticed {{finding}}.\n\nI would make the best way to enquire easier to find, particularly on mobile.\n\nWould you like me to share the exact page change I'd suggest?\n\nBest,\nBennie\nBennie Studio\n\nIf this isn't relevant, reply stop and I won't contact you again.",
  },
  {
    id: "follow-up", name: "Day 3 — specific follow-up", problem: "No response", stage: "Contacted",
    note: "Send only when allowed, with no reply/opt-out and a genuine earlier message. Do not automatically send from a reminder.",
    subject: "Following up on {{company}}'s website",
    body: "Hi {{first_name}},\n\nI sent a note about {{finding}} at {{company}}.\n\nRather than a full redesign pitch, I have one practical change in mind for that page.\n\nWould you like me to send it, or is website improvement not a priority right now?\n\nBest,\nBennie\nBennie Studio\n\nIf this isn't relevant, reply stop and I won't contact you again.",
  },
  {
    id: "follow-up-last", name: "Day 7 — close the loop", problem: "No response", stage: "Contacted",
    note: "Last polite check, only where further contact is lawful and permitted. Then stop if no reply.",
    subject: "Should I close the loop on {{company}}?",
    body: "Hi {{first_name}},\n\nOne last note on {{finding}} at {{company}}.\n\nI don't want to keep filling your inbox. If improving the enquiry journey is useful later, I'm happy to point you to the single change I'd start with.\n\nShould I close this out for now?\n\nBest,\nBennie\nBennie Studio\n\nIf this isn't relevant, reply stop and I won't contact you again.",
  },
  {
    id: "interested", name: "Positive reply — book the next step", problem: "Interested prospect", stage: "Replied",
    note: "Reply personally, refer to what the prospect actually said, and ask for one realistic next step.",
    subject: "Re: website priorities for {{company}}",
    body: "Hi {{first_name}},\n\nThanks for getting back to me. You mentioned [their exact website priority].\n\nBennie Studio can handle the website build and ongoing updates, but I'd first confirm the scope and the enquiry action that matters most to your business.\n\nWould a 15-minute call this week work to scope this properly?\n\nBest,\nBennie\nBennie Studio",
  },
  {
    id: "call", name: "Booked call — arrive prepared", problem: "Meeting preparation", stage: "Call booked",
    note: "Use only if the call really is confirmed. No invented dates, agendas or promises.",
    subject: "Our website discussion for {{company}}",
    body: "Hi {{first_name}},\n\nLooking forward to our scheduled discussion. I'll focus on the service you most want to promote, how customers should contact you, and what you want us to manage after launch.\n\nBefore we meet, what's the one website result that matters most to you right now?\n\nBest,\nBennie\nBennie Studio",
  },
  {
    id: "proposal", name: "Proposal — remove the decision blocker", problem: "Open proposal", stage: "Proposal sent",
    note: "Only when an actual proposal exists; respect the agreed decision timeline.",
    subject: "Next step on {{company}}'s website proposal",
    body: "Hi {{first_name}},\n\nFollowing up on the website proposal we discussed. It covers the build, the agreed scope and ongoing management.\n\nDoes the scope look right to move ahead, or is there one part you'd like me to adjust? I can clarify the setup cost, monthly service or launch timing in plain terms.\n\nBest,\nBennie\nBennie Studio",
  },
];

export function buildEmailTemplateDraft(id: string, prospect: any, finding: string) {
  const template = EMAIL_TEMPLATES.find((item) => item.id === id) || EMAIL_TEMPLATES[0];
  const company = String(prospect?.name || "[business name]").trim();
  const contactName = String(prospect?.contact_first_name || prospect?.contact_name || "").trim().split(/\s+/)[0];
  const observation = finding.trim().length >= 10 ? finding.trim().replace(/\.$/, "") : "[add a specific, verified page or listing observation]";
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
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Optimised for genuine replies: one verified observation, one reason it matters, and one easy question. Personalise every draft and respect opt-outs.</p></div>
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
