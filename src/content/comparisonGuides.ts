type ComparisonGuide = {
  path: string;
  title: string;
  description: string;
  eyebrow: string;
  heading: string;
  intro: string;
  options: [string, string];
  rows: Array<{ topic: string; first: string; second: string }>;
  goodFit: [string[], string[]];
  questions: string[];
};

export const COMPARISON_GUIDES: Record<string, ComparisonGuide> = {
  diy: {
    path: "/managed-website-vs-diy",
    title: "Managed Website vs DIY Website Builder | Bennie Studio",
    description: "Compare a self-managed website builder with Bennie Studio’s managed website plans, including ownership, updates, hosting and pricing questions.",
    eyebrow: "Buyer guide · website ownership",
    heading: "Managed website vs a DIY website builder",
    intro: "Both approaches can work. The right choice depends on whether you want to manage the setup and ongoing work yourself, or prefer a managed service with a defined scope and support allowance.",
    options: ["DIY website builder", "Bennie Studio managed website"],
    rows: [
      { topic: "Setup", first: "You choose the builder, structure the pages, add content and connect the tools you need.", second: "Bennie Studio prepares a website from an approved template and your onboarding details; you review it before launch." },
      { topic: "Hosting and SSL", first: "Check which hosting, SSL and platform costs are included in your chosen builder and plan.", second: "Managed Website plans include hosting and SSL while the subscription is active." },
      { topic: "Enquiry path", first: "You select and configure forms, calls, booking links or messaging tools.", second: "The agreed site can include contact forms and suitable enquiry paths such as WhatsApp, calls or booking links." },
      { topic: "Ongoing updates", first: "You make changes yourself or arrange separate help.", second: "You can request supported changes within the monthly allowance for your selected plan." },
      { topic: "Price comparison", first: "Include the platform, paid add-ons, domain, outside help and your own time in your estimate.", second: "Compare the current setup fee, monthly price, initial term and included scope in the published catalogue." },
    ],
    goodFit: [
      ["You want direct control over page editing and platform choices.", "You are comfortable maintaining the site and configuring its enquiry tools.", "You prefer to compare builder subscriptions and add-ons yourself."],
      ["You want help preparing and maintaining the website.", "You want an agreed service scope, hosting and SSL in one plan.", "You prefer to request supported updates instead of managing every change."],
    ],
    questions: [
      "Who will prepare the website copy, images and service information?",
      "What are the full setup and recurring costs, including optional tools?",
      "Who handles hosting, security updates, backups and technical issues?",
      "How many changes are included, and what happens when you need more?",
    ],
  },
  agency: {
    path: "/managed-website-vs-agency",
    title: "Managed Website vs Web Design Agency | Bennie Studio",
    description: "Compare a managed website subscription with a custom agency project. Review scope, ownership, ongoing support and questions to ask before choosing.",
    eyebrow: "Buyer guide · service model",
    heading: "Managed website vs a web design agency",
    intro: "Agency projects differ in process, scope and ongoing support. Compare the actual proposal and contract with a managed plan’s published scope instead of assuming one model is always cheaper or more suitable.",
    options: ["Custom agency project", "Bennie Studio managed website"],
    rows: [
      { topic: "Project scope", first: "The agency defines deliverables, process and price in its proposal. Confirm page count, integrations, revisions and exclusions.", second: "Bennie Studio offers published plan scopes with setup, recurring service and stated page and update limits." },
      { topic: "Design and build", first: "Ask whether the proposal includes custom design, research, content, development and testing, and how each is approved.", second: "Websites use approved templates and managed structures, with business details collected during onboarding and a customer review before launch." },
      { topic: "After launch", first: "Confirm whether hosting, SSL, maintenance, support and future changes are included or billed separately.", second: "Hosting, SSL and plan-based support are included while the managed subscription is active." },
      { topic: "Ownership and handover", first: "Confirm who owns the domain, code, content, accounts and deliverables, and what handover costs apply.", second: "Review the service terms for account access, website use, domain responsibilities and end-of-service handover before checkout." },
      { topic: "Price comparison", first: "Compare the written project quote, payment milestones, recurring support and future change fees.", second: "Compare the current catalogue’s setup fee, monthly price, initial term and included scope." },
    ],
    goodFit: [
      ["You need custom functionality or a bespoke design process.", "You have a defined project brief and want providers to quote that scope.", "You can evaluate the proposal, ownership terms and post-launch support separately."],
      ["A structured, template-based website fits your needs.", "You want hosting, SSL and ongoing supported updates in the same service.", "You prefer a published plan scope and monthly service model."],
    ],
    questions: [
      "Which deliverables, revisions and integrations are explicitly included?",
      "What will hosting, maintenance, support and changes cost after launch?",
      "Who owns the domain, website files, content and service accounts?",
      "What happens to the website and its data when the agreement ends?",
    ],
  },
};

