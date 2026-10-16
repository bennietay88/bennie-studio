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
    body: "Hi {{first_name}}\n\nOn {{company}}'s website, I noticed {{finding}}.\nA practical improvement: {{recommendation}}.\nThis gives someone considering your services a clearer route to request a quote.\n\nWould a scope and price to put this in place be useful?\n\nBennie\nBennie Studio",
  },
  {
    id: "portfolio", name: "Turn project views into enquiries", problem: "Portfolio / trust", stage: "First contact",
    note: "Use on actual project-page friction; show an enquiry action next to real work.",
    subject: "Turning {{company}}'s projects into enquiries",
    body: "Hi {{first_name}}\n\nLooking at {{company}}'s project pages, I noticed {{finding}}.\nI'd change this: {{recommendation}}.\nIt would make your completed work easier to judge and connect to a quote request.\n\nWould you like a rough scope for making that change?\n\nBennie\nBennie Studio",
  },
  {
    id: "services", name: "Help visitors choose a service", problem: "Service clarity", stage: "First contact",
    note: "Use only with a verified service/navigation gap.",
    subject: "A clearer service page for {{company}}",
    body: "Hi {{first_name}}\n\nOn {{company}}'s service pages, I noticed {{finding}}.\nI'd improve that by: {{recommendation}}.\nPeople comparing services should be able to choose their next step without guessing.\n\nWould you like a price to have Bennie Studio handle it?\n\nBennie\nBennie Studio",
  },
  {
    id: "mobile", name: "Win more mobile enquiries", problem: "Mobile UX", stage: "First contact",
    note: "Use only after checking the actual mobile contact path.",
    subject: "{{company}}'s mobile enquiry path",
    body: "Hi {{first_name}}\n\nOn the mobile version of {{company}}'s site, I noticed {{finding}}.\nI'd fix it by: {{recommendation}}.\nA clear tap-to-contact journey helps visitors enquire without hunting through the page.\n\nWould a quick scope and price to improve this be useful?\n\nBennie\nBennie Studio",
  },
  {
    id: "no-site", name: "Give customers an official home", problem: "No website", stage: "First contact",
    note: "Use only for a verified directory listing without an official website link.",
    subject: "An official website for {{company}}",
    body: "Hi {{first_name}}\n\nI came across {{company}} and noticed {{finding}}.\nMy recommendation: {{recommendation}}.\nBennie Studio can build the site around your real services and enquiries, then handle hosting, maintenance and agreed updates.\n\nWould you like to see what a managed website would include and cost?\n\nBennie\nBennie Studio",
  },
  {
    id: "managed", name: "Hand off website upkeep", problem: "Ongoing care", stage: "First contact",
    note: "Use when a verified outdated detail suggests maintenance matters.",
    subject: "Website updates for {{company}}",
    body: "Hi {{first_name}}\n\nOn {{company}}'s website, I noticed {{finding}}.\nA useful first change: {{recommendation}}.\nBennie Studio could take care of that work and ongoing site maintenance instead of leaving updates on your team's to-do list.\n\nWould you consider a managed website service for this?\n\nBennie\nBennie Studio",
  },
  {
    id: "booking", name: "Make appointments easier to book", problem: "Booking journey", stage: "First contact",
    note: "Verify the appointment flow before use.",
    subject: "Booking enquiries for {{company}}",
    body: "Hi {{first_name}}\n\nI checked {{company}}'s booking path and noticed {{finding}}.\nI'd improve the booking path by: {{recommendation}}.\nThat would make the booking action clearer for someone ready to arrange an appointment.\n\nWant a rough scope and price for implementing it?\n\nBennie\nBennie Studio",
  },
  {
    id: "local", name: "Clarify the areas you serve", problem: "Local service area", stage: "First contact",
    note: "Use only where location coverage is genuinely unclear.",
    subject: "Service areas on {{company}}'s website",
    body: "Hi {{first_name}}\n\nOn {{company}}'s website, I noticed {{finding}}.\nI'd make this change: {{recommendation}}.\nCustomers should be able to tell whether you serve their area before taking the next step.\n\nWould you be open to having Bennie Studio update and manage this?\n\nBennie\nBennie Studio",
  },
  {
    id: "trust", name: "Put proof near the enquiry", problem: "Trust signals", stage: "First contact",
    note: "Use only with verified public reviews, credentials or proof that can be shown.",
    subject: "A stronger enquiry page for {{company}}",
    body: "Hi {{first_name}}\n\nOn {{company}}'s website, I noticed {{finding}}.\nMy recommendation: {{recommendation}}.\nPutting real evidence alongside your services can give visitors more confidence before enquiring.\n\nWould a scope and price for this improvement be useful?\n\nBennie\nBennie Studio",
  },
  {
    id: "pricing-clarity", name: "Make quoting easier", problem: "Pricing clarity", stage: "First contact",
    note: "Use only after confirming confusion in published pricing/scope.",
    subject: "A clearer quote path for {{company}}",
    body: "Hi {{first_name}}\n\nOn {{company}}'s site, I noticed {{finding}}.\nI'd change this: {{recommendation}}.\nShowing the scope and next step more clearly helps potential customers decide whether to request a quote.\n\nWould you consider having us implement and maintain this?\n\nBennie\nBennie Studio",
  },
  {
    id: "location", name: "Put contact options up front", problem: "Contact details", stage: "First contact",
    note: "Use with a verified issue in contact choices, location or working hours.",
    subject: "Making {{company}} easier to contact",
    body: "Hi {{first_name}}\n\nOn {{company}}'s contact pages, I noticed {{finding}}.\nI'd fix it by: {{recommendation}}.\nA straightforward call, WhatsApp or enquiry action is especially useful to customers on mobile.\n\nWould you like a quote for improving that contact journey?\n\nBennie\nBennie Studio",
  },
  {
    id: "follow-up", name: "Day 3 — offer the concept", problem: "No response", stage: "Contacted",
    note: "Only when a real first email was sent and follow-up is permitted.",
    subject: "Homepage concept for {{company}}",
    body: "Hi {{first_name}}\n\nI wrote about {{finding}} on {{company}}'s website.\nOne practical fix I'd make is: {{recommendation}}.\nBennie Studio can implement the change and manage the website afterwards.\n\nWorth discussing a scope and price?\n\nBennie\nBennie Studio",
  },
  {
    id: "follow-up-last", name: "Day 7 — final specific offer", problem: "No response", stage: "Contacted",
    note: "Last permitted follow-up, then stop if there is no response.",
    subject: "Last note on {{company}}'s website",
    body: "Hi {{first_name}}\n\nOne last website idea for {{company}}: {{finding}}.\nMy suggested fix is: {{recommendation}}.\nIf you decide to improve that part of the site, Bennie Studio can handle the build and ongoing updates.\n\nIs this a priority for your business this quarter?\n\nBennie\nBennie Studio",
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


const DEFAULT_EMAIL_RECOMMENDATIONS: Record<string, string> = {
  "enquiry": "Make the main Request a Quote action visible at the top of the page and repeat it after the service details",
  "portfolio": "Place a clear enquiry button beside each relevant project, with the service delivered and a genuine outcome",
  "services": "Group services by customer need and place a clear quotation action beside each option",
  "mobile": "Make the main contact or booking action easy to tap near the top of the mobile page",
  "no-site": "Create a clear services page with real business details, customer proof and a prominent quote or contact button",
  "managed": "Update the affected information and make one person responsible for keeping service and contact details current",
  "booking": "Put the booking action beside each service and make it easily reachable on mobile",
  "local": "List the actual towns or areas served beside the relevant service and enquiry information",
  "trust": "Place genuine customer reviews or verified credentials beside the main service and enquiry section",
  "pricing-clarity": "Clarify what each option includes and put a Request a Quote action beside the service",
  "location": "Show the correct phone or WhatsApp action near the top and on every relevant service page",
  "follow-up": "Make the next enquiry action clearer beside the services and contact information",
  "follow-up-last": "Make the contact or quotation action easier to find on the page"
};

export function buildEmailTemplateDraft(id: string, prospect: any, finding: string, confirmedRecommendation = "") {
  const template = EMAIL_TEMPLATES.find((item) => item.id === id) || EMAIL_TEMPLATES[0];
  const company = String(prospect?.name || "[business name]").trim();
  const contactName = String(prospect?.contact_first_name || prospect?.contact_name || "").trim().split(/\s+/)[0];
  const observation = finding.trim().length >= 10 ? finding.trim().replace(/\.$/, "") : "[add a specific, verified page or listing observation]";
  const recommendation = confirmedRecommendation.trim().length >= 10 ? confirmedRecommendation.trim().replace(/[.!?]$/, "") : DEFAULT_EMAIL_RECOMMENDATIONS[template.id] || DEFAULT_EMAIL_RECOMMENDATIONS.enquiry;
  const fill = (value: string) => value
    .replace(/\{\{company\}\}/g, company)
    .replace(/\{\{first_name\}\}/g, contactName || `${company} team`)
    .replace(/\{\{finding\}\}/g, observation)
    .replace(/\{\{recommendation\}\}/g, recommendation);
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
        <p className="mt-2 max-w-2xl text-sm text-slate-600">Evidence and useful fixes appear directly in the message, followed by a concrete managed-service offer. No audit or preview link is needed.</p></div>
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
