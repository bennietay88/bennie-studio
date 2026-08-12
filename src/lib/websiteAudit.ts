export type AuditPriority = "high" | "medium" | "low";
export type AuditObservation = "confirmed" | "needs_review";

export type WebsiteAuditFinding = {
  id: string;
  category: string;
  title: string;
  whatWeFound: string;
  whyItMatters: string;
  recommendation: string;
  exampleImprovement: string;
  priority: AuditPriority;
  observation: AuditObservation;
};

export type EnquiryJourney = {
  current: string[];
  recommended: string[];
};

export type WebsiteAuditRecommendation = {
  area: string;
  current: string;
  recommended: string;
};

export type RecommendedWebsiteDirection = {
  hero: {
    headline: string;
    subheadline: string;
    cta: string;
  };
  services: string[];
  trust: string[];
  localRelevance: string[];
  faq: string[];
  cta: {
    label: string;
    supportingCopy: string;
  };
};

export type WebsiteAuditResult = {
  schemaVersion: 2;
  analyzedUrl: string;
  analyzedAt: string;
  summary: string;
  findings: WebsiteAuditFinding[];
  enquiryJourney: EnquiryJourney;
  whatWeWouldChange: WebsiteAuditRecommendation[];
  recommendedWebsiteDirection: RecommendedWebsiteDirection;
  recommendedPlan: "starter" | "business" | "growth";
  performance: {
    responseTimeMs: number;
    htmlBytes: number;
    imageCount: number;
    scriptCount: number;
  };
};

type LegacyAuditCheck = {
  id?: string;
  category?: string;
  label?: string;
  status?: "pass" | "warning" | "fail" | "not_applicable";
  evidence?: string;
  explanation?: string;
  recommendedAction?: string;
  priority?: AuditPriority;
};

type FindingInput = Omit<WebsiteAuditFinding, "observation"> & {
  found: boolean;
  observation?: AuditObservation;
};

const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

const contentOf = (html: string, expression: RegExp) => text(expression.exec(html)?.[1] || "");
const count = (html: string, expression: RegExp) => (html.match(expression) || []).length;
const has = (value: string, expression: RegExp) => expression.test(value);

const priorityOrder: Record<AuditPriority, number> = { high: 0, medium: 1, low: 2 };

function legacyFinding(check: LegacyAuditCheck, index: number): WebsiteAuditFinding {
  return {
    id: check.id || `legacy-finding-${index + 1}`,
    category: check.category || "Website experience",
    title: check.label || "Website improvement opportunity",
    whatWeFound: check.evidence || "The previous audit identified an area that needs review.",
    whyItMatters: check.explanation || "This may make the visitor journey less clear or add friction before an enquiry.",
    recommendation: check.recommendedAction || "Review this area and make the next action clearer for visitors.",
    exampleImprovement: check.recommendedAction || "Use clearer service, trust, and enquiry guidance in this section.",
    priority: check.priority || "medium",
    observation: "needs_review",
  };
}

export function normalizeWebsiteAuditResult(input: unknown): WebsiteAuditResult {
  const report = (input && typeof input === "object" ? input : {}) as Record<string, any>;
  if (report.schemaVersion === 2 && Array.isArray(report.findings)) {
    return {
      schemaVersion: 2,
      analyzedUrl: String(report.analyzedUrl || ""),
      analyzedAt: String(report.analyzedAt || new Date().toISOString()),
      summary: String(report.summary || "Website growth review prepared."),
      findings: report.findings.map((finding: Record<string, any>, index: number) => ({
        id: String(finding.id || `finding-${index + 1}`),
        category: String(finding.category || "Website experience"),
        title: String(finding.title || "Website improvement opportunity"),
        whatWeFound: String(finding.whatWeFound || "This area needs a closer review."),
        whyItMatters: String(finding.whyItMatters || "This may add friction to the visitor journey."),
        recommendation: String(finding.recommendation || "Make the next step clearer for visitors."),
        exampleImprovement: String(finding.exampleImprovement || finding.recommendation || "Clarify the service, proof, and enquiry action."),
        priority: (["high", "medium", "low"].includes(finding.priority) ? finding.priority : "medium") as AuditPriority,
        observation: (finding.observation === "needs_review" ? "needs_review" : "confirmed") as AuditObservation,
      })),
      enquiryJourney: {
        current: Array.isArray(report.enquiryJourney?.current) ? report.enquiryJourney.current.map(String) : [],
        recommended: Array.isArray(report.enquiryJourney?.recommended) ? report.enquiryJourney.recommended.map(String) : [],
      },
      whatWeWouldChange: Array.isArray(report.whatWeWouldChange) ? report.whatWeWouldChange.map((item: Record<string, any>) => ({
        area: String(item.area || "Website experience"),
        current: String(item.current || "This area needs review."),
        recommended: String(item.recommended || "Make the visitor's next step clearer."),
      })) : [],
      recommendedWebsiteDirection: {
        hero: {
          headline: String(report.recommendedWebsiteDirection?.hero?.headline || "A clear service-and-location headline"),
          subheadline: String(report.recommendedWebsiteDirection?.hero?.subheadline || "Explain who the service is for and why the visitor should enquire."),
          cta: String(report.recommendedWebsiteDirection?.hero?.cta || "Request a Quote"),
        },
        services: Array.isArray(report.recommendedWebsiteDirection?.services) ? report.recommendedWebsiteDirection.services.map(String) : [],
        trust: Array.isArray(report.recommendedWebsiteDirection?.trust) ? report.recommendedWebsiteDirection.trust.map(String) : [],
        localRelevance: Array.isArray(report.recommendedWebsiteDirection?.localRelevance) ? report.recommendedWebsiteDirection.localRelevance.map(String) : [],
        faq: Array.isArray(report.recommendedWebsiteDirection?.faq) ? report.recommendedWebsiteDirection.faq.map(String) : [],
        cta: {
          label: String(report.recommendedWebsiteDirection?.cta?.label || "Request a Quote"),
          supportingCopy: String(report.recommendedWebsiteDirection?.cta?.supportingCopy || "Explain what happens after the visitor clicks."),
        },
      },
      recommendedPlan: (["starter", "business", "growth"].includes(report.recommendedPlan) ? report.recommendedPlan : "business") as WebsiteAuditResult["recommendedPlan"],
      performance: {
        responseTimeMs: Number(report.performance?.responseTimeMs || 0),
        htmlBytes: Number(report.performance?.htmlBytes || 0),
        imageCount: Number(report.performance?.imageCount || 0),
        scriptCount: Number(report.performance?.scriptCount || 0),
      },
    };
  }

  const legacyChecks = (Array.isArray(report.topProblems)
    ? report.topProblems
    : Array.isArray(report.checks)
      ? report.checks.filter((item: LegacyAuditCheck) => item.status === "warning" || item.status === "fail")
      : []) as LegacyAuditCheck[];
  const findings = legacyChecks.slice(0, 6).map(legacyFinding);
  const cta = String(report.suggestedCTA || "Request a Quote");
  const structure = Array.isArray(report.suggestedWebsiteStructure)
    ? report.suggestedWebsiteStructure.map(String)
    : ["Clear hero", "Services", "Trust proof", "FAQ", "Enquiry action"];

  return {
    schemaVersion: 2,
    analyzedUrl: String(report.analyzedUrl || ""),
    analyzedAt: String(report.analyzedAt || new Date().toISOString()),
    summary: findings.length
      ? `We found ${findings.length} opportunities to make the website clearer and the enquiry journey easier to follow.`
      : "The legacy review is available, but its findings need a fresh evidence-based analysis.",
    findings,
    enquiryJourney: {
      current: ["Search or social", "Homepage", "General information", "Contact page", "Generic enquiry"],
      recommended: ["Relevant search or campaign", "Service-specific page", "Trust and proof", "Clear enquiry action", "WhatsApp, call, booking, or quote"],
    },
    whatWeWouldChange: findings.slice(0, 4).map((finding) => ({
      area: finding.category,
      current: finding.whatWeFound,
      recommended: finding.recommendation,
    })),
    recommendedWebsiteDirection: {
      hero: {
        headline: String(report.suggestedHeadline || "A clear service-and-location headline"),
        subheadline: "Explain who the service is for, the outcome it supports, and why the visitor should trust the business.",
        cta,
      },
      services: structure.slice(0, 3),
      trust: ["Customer reviews", "Credentials or experience", "Real project or service proof"],
      localRelevance: ["Primary location", "Genuine service areas", "Location-specific contact details"],
      faq: ["What does the service include?", "Which areas do you serve?", "How does the enquiry or booking process work?"],
      cta: { label: cta, supportingCopy: "Give visitors one specific, low-friction next step." },
    },
    recommendedPlan: ["starter", "business", "growth"].includes(report.recommendedPlan)
      ? report.recommendedPlan
      : "business",
    performance: {
      responseTimeMs: Number(report.performance?.responseTimeMs || 0),
      htmlBytes: Number(report.performance?.htmlBytes || 0),
      imageCount: Number(report.performance?.imageCount || 0),
      scriptCount: Number(report.performance?.scriptCount || 0),
    },
  };
}

export function analyzeWebsiteHtml(input: {
  url: string;
  html: string;
  statusCode: number;
  responseTimeMs: number;
  businessName?: string;
  industry?: string;
  robotsFound?: boolean;
  sitemapFound?: boolean;
  brokenLinks?: string[];
  checkedLinks?: number;
}): WebsiteAuditResult {
  const { url, html, statusCode, responseTimeMs } = input;
  const pageText = text(html);
  const lower = pageText.toLowerCase();
  const title = contentOf(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = (/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html)?.[1]
    || /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i.exec(html)?.[1] || "").trim();
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((match) => text(match[1]));
  const h2Count = count(html, /<h2\b[^>]*>/gi);
  const imageMatches = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  const missingAlt = imageMatches.filter((tag) => !/\balt=["'][^"']+["']/i.test(tag)).length;
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const hasAction = /href=["'](?:https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/|tel:|mailto:|[^"']*(?:book|quote|contact|appointment))/i.test(html)
    || /<(?:button|a)\b[^>]*>[\s\S]*?(?:contact|quote|book|call|whatsapp|enquir|get started)[\s\S]*?<\/(?:button|a)>/i.test(html);
  const hasForm = /<form\b/i.test(html);
  const serviceClarity = has(lower, /\b(services?|treatments?|solutions?|packages?|what we do|how we help)\b/);
  const trust = has(lower, /\b(testimonial|reviews?|trusted|certified|licensed|accredited|years? experience|clients?|case studies)\b/);
  const faq = /<[^>]+[^>]*(?:id|class)=["'][^"']*faq/i.test(html) || has(lower, /\b(frequently asked questions|faq)\b/);
  const local = has(lower, /\b(areas? served|service areas?|location|nearby|address|opening hours|find us|based in)\b/);
  const schema = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
  const brokenLinks = input.brokenLinks || [];
  const brand = input.businessName?.trim() || title.split(/[|–—-]/)[0]?.trim() || "the business";
  const industry = input.industry?.trim() || "service";
  const preferredCta = hasAction ? "Keep one primary enquiry action" : "Request a Quote";

  const opportunities: FindingInput[] = [
    {
      id: "accessible", category: "Website access", title: "The website did not return a successful page",
      whatWeFound: `The submitted page returned HTTP ${statusCode}.`,
      whyItMatters: "Visitors and search engines may not be able to reach the page consistently.",
      recommendation: "Resolve the server response or redirect before making content changes.",
      exampleImprovement: "Return a successful public page and redirect all retired URLs to the most relevant live page.",
      priority: "high", found: !(statusCode >= 200 && statusCode < 400),
    },
    {
      id: "https", category: "Visitor trust", title: "The page is not using HTTPS",
      whatWeFound: "The submitted website uses an unsecured HTTP address.",
      whyItMatters: "Browser warnings may make visitors less comfortable submitting contact details.",
      recommendation: "Install SSL and redirect every HTTP request to HTTPS.",
      exampleImprovement: "Use one canonical HTTPS address across the website, forms, analytics, and search listings.",
      priority: "high", found: !url.startsWith("https://"),
    },
    {
      id: "offer", category: "Offer clarity", title: "The main service is not immediately clear",
      whatWeFound: serviceClarity ? "Service language exists, but the page structure still needs a concise first-screen promise." : "We could not find clear service, treatment, solution, or package language on the page.",
      whyItMatters: "Visitors comparing providers may leave before discovering whether the business matches their need.",
      recommendation: "Place the primary service, customer fit, location, and enquiry action directly in the hero.",
      exampleImprovement: `${brand}: ${industry === "service" ? "A clear primary service" : industry} in your main service area, followed by one specific enquiry action.`,
      priority: "high", found: !serviceClarity || !h1s[0] || h1s[0].length < 12,
    },
    {
      id: "cta", category: "Enquiry journey", title: "The next enquiry action is not obvious",
      whatWeFound: hasAction ? "Contact actions exist, but they should use one consistent service-specific message." : "No clear contact, quote, booking, call, or WhatsApp action was found in the page links or buttons.",
      whyItMatters: "An unclear next step creates additional friction after a visitor becomes interested.",
      recommendation: "Use one primary service-specific CTA near the hero and repeat it after proof and service information.",
      exampleImprovement: industry.toLowerCase().includes("clinic") ? "Book an Appointment" : "Request a Quote on WhatsApp",
      priority: "high", found: !hasAction,
    },
    {
      id: "trust", category: "Trust", title: "Trust signals are missing or too difficult to find",
      whatWeFound: "We could not find explicit review, testimonial, credential, certification, client, or case-study language.",
      whyItMatters: "Visitors may hesitate when they cannot quickly verify experience, quality, or customer proof.",
      recommendation: "Surface real reviews, credentials, team experience, or project proof before the main enquiry section.",
      exampleImprovement: "Add a compact proof strip under the hero, followed by selected reviews and relevant credentials.",
      priority: "high", found: !trust,
    },
    {
      id: "mobile", category: "Mobile experience", title: "Mobile rendering needs a responsive viewport",
      whatWeFound: "The page does not declare a responsive viewport.",
      whyItMatters: "Mobile visitors may see a scaled-down desktop layout that is harder to read and use.",
      recommendation: "Add a responsive viewport declaration and test the enquiry path at common mobile widths.",
      exampleImprovement: "Keep the primary CTA visible, use readable text sizes, and avoid horizontal scrolling.",
      priority: "high", found: !hasViewport,
    },
    {
      id: "metadata", category: "Search clarity", title: "Search result messaging could be clearer",
      whatWeFound: !title ? "No page title was found." : !description ? `The page title is “${title}”, but no meta description was found.` : "The title or description does not fit a clear service-and-market search message.",
      whyItMatters: "Searchers may find it harder to understand the offer before deciding whether to visit.",
      recommendation: "Write a unique title and description using the primary service, audience or location, and a useful next step.",
      exampleImprovement: `${industry === "service" ? "Primary Service" : industry} in [Location] | ${brand}`,
      priority: "medium", found: !(title.length >= 20 && title.length <= 65 && description.length >= 70 && description.length <= 170),
    },
    {
      id: "headings", category: "Content structure", title: "The page hierarchy is difficult to scan",
      whatWeFound: `The page contains ${h1s.length} main heading${h1s.length === 1 ? "" : "s"} and ${h2Count} supporting headings.`,
      whyItMatters: "Visitors may need to work harder to find the relevant service, proof, and next step.",
      recommendation: "Use one descriptive H1 followed by clear service, proof, process, FAQ, and contact headings.",
      exampleImprovement: "Hero → Services → Why choose us → Reviews → Process → FAQ → Enquiry CTA.",
      priority: "medium", found: h1s.length !== 1 || h2Count === 0,
    },
    {
      id: "local", category: "Local relevance", title: "The website does not clearly show where the business serves",
      whatWeFound: "We could not find a clear address, primary location, opening hours, or service-area section.",
      whyItMatters: "Local visitors may be unsure whether the service is available in their area.",
      recommendation: "State the genuine primary location and areas served near the service and contact content.",
      exampleImprovement: `${industry === "service" ? "Service" : industry} in [Primary Location], serving [Genuine Nearby Areas].`,
      priority: "medium", found: !local,
    },
    {
      id: "faq", category: "Buyer questions", title: "Common buyer questions are not answered on the page",
      whatWeFound: "No FAQ section was detected.",
      whyItMatters: "Unanswered questions about fit, timing, process, price, or service area can delay an enquiry.",
      recommendation: "Add genuine questions customers ask before booking, calling, or requesting a quote.",
      exampleImprovement: "Answer what is included, who the service is for, areas served, typical next steps, and how to enquire.",
      priority: "low", found: !faq,
    },
    {
      id: "form", category: "Enquiry options", title: "Visitors have limited ways to enquire",
      whatWeFound: "No enquiry form was found and the page needs a clear alternative contact path.",
      whyItMatters: "Some visitors may prefer not to call or leave the site to send a message.",
      recommendation: "Add a short service-specific form or make WhatsApp, call, and booking actions consistently visible.",
      exampleImprovement: "Ask only for name, preferred contact, service needed, and one short project or appointment detail.",
      priority: "medium", found: !hasForm && !hasAction,
    },
    {
      id: "links", category: "Journey continuity", title: "Some sampled internal links are broken",
      whatWeFound: `${brokenLinks.length} of ${input.checkedLinks || 0} sampled internal links did not return a successful response.`,
      whyItMatters: "Broken links interrupt the visitor journey and may prevent access to service or contact pages.",
      recommendation: "Repair or redirect the affected internal links.",
      exampleImprovement: "Map every retired URL to the closest relevant live service, article, or contact page.",
      priority: "high", found: brokenLinks.length > 0,
    },
    {
      id: "alt", category: "Accessibility", title: "Some images do not have useful alternative text",
      whatWeFound: `${missingAlt} of ${imageMatches.length} images do not include descriptive alternative text.`,
      whyItMatters: "Visitors using assistive technology may miss meaningful context from those images.",
      recommendation: "Add concise contextual alt text to meaningful images and leave decorative images empty.",
      exampleImprovement: "Describe the service, person, place, or result shown rather than repeating a filename.",
      priority: "medium", found: imageMatches.length > 0 && missingAlt > 0,
    },
    {
      id: "technical-discovery", category: "Search discovery", title: "Search discovery files or structured data are incomplete",
      whatWeFound: [!input.robotsFound ? "robots.txt was not found" : "", !input.sitemapFound ? "sitemap.xml was not found" : "", !schema ? "structured data was not found" : ""].filter(Boolean).join("; ") + ".",
      whyItMatters: "Search engines may have less context about the website, business, services, and important pages.",
      recommendation: "Publish valid discovery files and appropriate Organization, LocalBusiness, Service, or FAQ structured data.",
      exampleImprovement: "Reference the XML sitemap from robots.txt and validate structured data against the visible page content.",
      priority: "low", found: !input.robotsFound || !input.sitemapFound || !schema,
    },
  ];

  const findings = opportunities
    .filter((item) => item.found)
    .map(({ found: _found, observation = "confirmed", ...finding }) => ({ ...finding, observation }))
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 6);
  const highPriorityFindings = findings.filter((finding) => finding.priority === "high");
  const recommendedPlan = highPriorityFindings.length >= 3 ? "growth" : highPriorityFindings.length > 0 ? "business" : "starter";
  const suggestedHeadline = h1s[0] && h1s[0].length >= 12
    ? h1s[0]
    : `${industry === "service" ? "Trusted local service" : industry} in [Primary Location]`;

  return {
    schemaVersion: 2,
    analyzedUrl: url,
    analyzedAt: new Date().toISOString(),
    summary: findings.length
      ? `We found ${findings.length} opportunities to make it easier for visitors to understand the offer and become enquiries.`
      : "The initial review did not find a major structural gap. A manual review should now focus on message quality, proof, and the real enquiry experience.",
    findings,
    enquiryJourney: {
      current: ["Google, social, or referral", "Homepage", serviceClarity ? "General service information" : "Search for the relevant service", hasAction ? "Contact action" : "Contact page", hasAction ? "Generic enquiry" : "Unclear next step"],
      recommended: ["Relevant search or campaign", "Service-specific landing page", "Trust, reviews, and local proof", "Clear service-specific CTA", "WhatsApp, call, booking, or quotation"],
    },
    whatWeWouldChange: findings.slice(0, 4).map((finding) => ({
      area: finding.category,
      current: finding.whatWeFound,
      recommended: finding.recommendation,
    })),
    recommendedWebsiteDirection: {
      hero: {
        headline: suggestedHeadline,
        subheadline: `Explain the main ${industry === "service" ? "service" : industry.toLowerCase()}, who it helps, the primary location, and the reason to enquire with ${brand}.`,
        cta: preferredCta,
      },
      services: ["Position the primary service around the buyer's need", "Give important services their own focused sections or pages", "Connect each service to one relevant enquiry action"],
      trust: ["Surface selected real reviews near the first CTA", "Show relevant credentials, experience, team, or project proof", "Use proof that directly supports the service being considered"],
      localRelevance: ["State the genuine primary location near the main offer", "List only real service areas", "Keep address, hours, phone, and business details consistent"],
      faq: ["What does the service include?", "Who is this service best suited for?", "Which areas do you serve?", "What happens after I enquire?", "How can I book, call, or request a quote?"],
      cta: { label: preferredCta, supportingCopy: "Use one specific next action and explain what happens after the visitor clicks." },
    },
    recommendedPlan,
    performance: {
      responseTimeMs,
      htmlBytes: new TextEncoder().encode(html).length,
      imageCount: imageMatches.length,
      scriptCount: count(html, /<script\b/gi),
    },
  };
}
