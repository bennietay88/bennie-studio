import React from "react";
import { BookOpen, Search, ShieldCheck } from "lucide-react";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export type EmailTemplate = { id: string; name: string; problem: string; stage: string; subject: string; body: string; note: string };

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "enquiry", name: "More quotation enquiries", problem: "Quotation journey", stage: "First contact",
    note: "Best when the quote action or form is visibly hard to use.",
    subject: "A simpler way to request a quote",
    body: "Hi {{first_name}},\n\nI noticed {{finding}} on {{company}}'s website.\n\nI'd put a clear Request a Quote action where visitors see it quickly, with a shorter path to enquire. Bennie Studio builds and manages sites around that customer journey.\n\nCan I put together a free homepage concept for {{company}} to show you?\n\nBennie\nBennie Studio",
  },
  {
    id: "portfolio", name: "Turn project views into enquiries", problem: "Portfolio / trust", stage: "First contact",
    note: "Use on actual project-page friction; show an enquiry action next to real work.",
    subject: "Turning {{company}}'s projects into enquiries",
    body: "Hi {{first_name}},\n\nI noticed {{finding}} on {{company}}'s project pages.\n\nI'd make each project easier to evaluate and add a clear enquiry action beside the work. We can build that experience and keep the website updated for you.\n\nWant me to show you the layout in a free homepage concept?\n\nBennie\nBennie Studio",
  },
  {
    id: "services", name: "Help visitors choose a service", problem: "Service clarity", stage: "First contact",
    note: "Use only with a verified service/navigation gap.",
    subject: "A clearer service page for {{company}}",
    body: "Hi {{first_name}},\n\nI noticed {{finding}} on {{company}}'s website.\n\nI'd simplify the service choices and give visitors one clear way to ask for the right quote. Bennie Studio handles the website build and ongoing updates.\n\nCan I show you how that would look in a free homepage concept?\n\nBennie\nBennie Studio",
  },
  {
    id: "mobile", name: "Win more mobile enquiries", problem: "Mobile UX", stage: "First contact",
    note: "Use only after checking the actual mobile contact path.",
    subject: "{{company}}'s mobile enquiry path",
    body: "Hi {{first_name}},\n\nOn mobile, I noticed {{finding}} on {{company}}'s website.\n\nI'd make the main contact or booking action easier to find and tap. That's the kind of practical improvement Bennie Studio builds into managed websites.\n\nCan I create a free mobile homepage concept to show the difference?\n\nBennie\nBennie Studio",
  },
  {
    id: "no-site", name: "Give customers an official home", problem: "No website", stage: "First contact",
    note: "Use only for a verified directory listing without an official website link.",
    subject: "An official website for {{company}}",
    body: "Hi {{first_name}},\n\nI found {{company}} through this listing: {{finding}}. I didn't see an official website linked there.\n\nBennie Studio can build and manage a professional site showing your services, customer reviews and a direct enquiry button—without adding website maintenance to your team's workload.\n\nWould a free homepage concept for {{company}} be useful?\n\nBennie\nBennie Studio",
  },
  {
    id: "managed", name: "Hand off website upkeep", problem: "Ongoing care", stage: "First contact",
    note: "Use when a verified outdated detail suggests maintenance matters.",
    subject: "Website updates for {{company}}",
    body: "Hi {{first_name}},\n\nI noticed {{finding}} on {{company}}'s website.\n\nBennie Studio can take care of the site build, hosting, maintenance and agreed updates, so the key service and enquiry pages stay current.\n\nAre you open to handing website management to one provider?\n\nBennie\nBennie Studio",
  },
  {
    id: "booking", name: "Make appointments easier to book", problem: "Booking journey", stage: "First contact",
    note: "Verify the appointment flow before use.",
    subject: "Booking enquiries for {{company}}",
    body: "Hi {{first_name}},\n\nI noticed {{finding}} in {{company}}'s online booking journey.\n\nI'd put the booking action in the most obvious spot and make the path shorter on mobile. We build and manage websites around that outcome.\n\nCan I show you that in a free homepage concept for {{company}}?\n\nBennie\nBennie Studio",
  },
  {
    id: "local", name: "Clarify the areas you serve", problem: "Local service area", stage: "First contact",
    note: "Use only where location coverage is genuinely unclear.",
    subject: "Service areas on {{company}}'s website",
    body: "Hi {{first_name}},\n\nI noticed {{finding}} on {{company}}'s website.\n\nI'd make the places you serve clear on the service page, with a direct enquiry option for customers in those areas. Bennie Studio can build and maintain that for you.\n\nWould you like a free homepage concept showing the approach?\n\nBennie\nBennie Studio",
  },
  {
    id: "trust", name: "Put proof near the enquiry", problem: "Trust signals", stage: "First contact",
    note: "Use only with verified public reviews, credentials or proof that can be shown.",
    subject: "A stronger enquiry page for {{company}}",
    body: "Hi {{first_name}},\n\nI noticed {{finding}} on {{company}}'s website.\n\nI'd put your most relevant genuine reviews or credentials beside the service and contact action, where prospective customers make their decision.\n\nCan I show you a free homepage concept built around that?\n\nBennie\nBennie Studio",
  },
  {
    id: "pricing-clarity", name: "Make quoting easier", problem: "Pricing clarity", stage: "First contact",
    note: "Use only after confirming confusion in published pricing/scope.",
    subject: "A clearer quote path for {{company}}",
    body: "Hi {{first_name}},\n\nI noticed {{finding}} on {{company}}'s website.\n\nI'd show who each service is for, what's included, and how to request the right quote—without making visitors guess. Bennie Studio can build and manage the result.\n\nShould I mock up the first section as a free homepage concept?\n\nBennie\nBennie Studio",
  },
  {
    id: "location", name: "Put contact options up front", problem: "Contact details", stage: "First contact",
    note: "Use with a verified issue in contact choices, location or working hours.",
    subject: "Making {{company}} easier to contact",
    body: "Hi {{first_name}},\n\nI noticed {{finding}} on {{company}}'s website.\n\nI'd bring the main phone, WhatsApp or enquiry action to the top of the page, particularly for mobile visitors. Bennie Studio can build and maintain a clearer contact journey.\n\nWould you like a free homepage concept showing the change?\n\nBennie\nBennie Studio",
  },
  {
    id: "follow-up", name: "Day 3 — offer the concept", problem: "No response", stage: "Contacted",
    note: "Only when a real first email was sent and follow-up is permitted.",
    subject: "Homepage concept for {{company}}",
    body: "Hi {{first_name}},\n\nI wrote about {{finding}} on {{company}}'s website.\n\nRather than another long audit, I can show the improvement directly in a free homepage concept built around your services and enquiry action.\n\nShould I prepare one for {{company}}?\n\nBennie\nBennie Studio",
  },
  {
    id: "follow-up-last", name: "Day 7 — final specific offer", problem: "No response", stage: "Contacted",
    note: "Last permitted follow-up, then stop if there is no response.",
    subject: "Last note on {{company}}'s website",
    body: "Hi {{first_name}},\n\nI wanted to make one final offer: a free homepage concept for {{company}} showing a clearer way for customers to enquire.\n\nIf you'd like to see it, I can create it around your actual services rather than send a generic website report.\n\nWorth putting one together?\n\nBennie\nBennie Studio",
  },
  {
    id: "interested", name: "Interested — move to a scoping call", problem: "Interested prospect", stage: "Replied",
    note: "Use only after a genuine reply and manually replace the exact need.",
    subject: "Next steps for {{company}}",
    body: "Hi {{first_name}},\n\nThanks for your reply about [the customer's actual goal].\n\nBennie Studio can build and manage the site, including the customer enquiry path and ongoing updates. I can walk you through the proposed scope, timing and pricing in 15 minutes.\n\nWould a short call be convenient?\n\nBennie\nBennie Studio",
  },
  {
    id: "call", name: "Confirmed call — align on outcomes", problem: "Meeting preparation", stage: "Call booked",
    note: "Only after an actual meeting is booked.",
    subject: "Our website discussion — {{company}}",
    body: "Hi {{first_name}},\n\nLooking forward to our booked discussion about {{company}}.\n\nI'll focus on the services you want to promote, how enquiries should reach you, and what Bennie Studio would handle after launch.\n\nWhat's the one service you most want more enquiries for?\n\nBennie\nBennie Studio",
  },
  {
    id: "proposal", name: "Proposal — ask for the decision", problem: "Open proposal", stage: "Proposal sent",
    note: "Only after a genuine proposal has been sent.",
    subject: "Ready to move forward with {{company}}?",
    body: "Hi {{first_name}},\n\nFollowing up on the website proposal for {{company}}.\n\nThe plan covers the agreed build and managed service, so your team can focus on the business while we handle the website.\n\nDoes the scope work for you to proceed, or is there one item we should adjust?\n\nBennie\nBennie Studio",
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
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Short, buyer-focused emails: a verified issue, a practical improvement, and one clear next step. The sending system handles unsubscribes.</p></div>
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
