export type AuditStatus = "pass" | "warning" | "fail" | "not_applicable";
export type AuditPriority = "high" | "medium" | "low";

export type AuditCheck = {
  id: string;
  category: string;
  label: string;
  status: AuditStatus;
  evidence: string;
  explanation: string;
  recommendedAction: string;
  priority: AuditPriority;
  scoreContribution: number;
  maxScore: number;
};

export type WebsiteAuditReport = {
  analyzedUrl: string;
  analyzedAt: string;
  overallScore: number;
  categoryScores: Record<string, number>;
  checks: AuditCheck[];
  topProblems: AuditCheck[];
  recommendedActions: string[];
  suggestedHeadline: string;
  suggestedCTA: string;
  suggestedWebsiteStructure: string[];
  recommendedPlan: "starter" | "business" | "growth";
  performance: { responseTimeMs: number; htmlBytes: number; imageCount: number; scriptCount: number };
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

function check(
  id: string,
  category: string,
  label: string,
  status: AuditStatus,
  evidence: string,
  explanation: string,
  recommendedAction: string,
  priority: AuditPriority,
  maxScore: number,
): AuditCheck {
  const multiplier = status === "pass" ? 1 : status === "warning" ? 0.5 : 0;
  return { id, category, label, status, evidence, explanation, recommendedAction, priority, maxScore, scoreContribution: Math.round(maxScore * multiplier * 10) / 10 };
}

export function analyzeWebsiteHtml(input: {
  url: string;
  html: string;
  statusCode: number;
  responseTimeMs: number;
  robotsFound?: boolean;
  sitemapFound?: boolean;
  brokenLinks?: string[];
  checkedLinks?: number;
}): WebsiteAuditReport {
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
  const hasAction = /href=["'](?:https?:\/\/wa\.me\/|https?:\/\/api\.whatsapp\.com\/|tel:|mailto:|[^"']*(?:book|quote|contact|appointment))/i.test(html)
    || /<(?:button|a)\b[^>]*>[\s\S]*?(?:contact|quote|book|call|whatsapp|enquir|get started)[\s\S]*?<\/(?:button|a)>/i.test(html);
  const hasForm = /<form\b/i.test(html);
  const serviceClarity = has(lower, /\b(services?|treatments?|solutions?|packages?|what we do|how we help)\b/);
  const trust = has(lower, /\b(testimonial|reviews?|trusted|certified|licensed|accredited|years? experience|clients?|case studies)\b/);
  const faq = /<[^>]+[^>]*(?:id|class)=["'][^"']*faq/i.test(html) || has(lower, /\b(frequently asked questions|faq)\b/);
  const local = has(lower, /\b(areas? served|service areas?|location|nearby|address|opening hours|find us|based in)\b/);
  const schema = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
  const headingSequenceOkay = h1s.length === 1 && h2Count > 0;
  const brokenLinks = input.brokenLinks || [];
  const checks: AuditCheck[] = [
    check("accessible", "Technical", "Website accessibility", statusCode >= 200 && statusCode < 400 ? "pass" : "fail", `HTTP ${statusCode}`, "The website must return a successful response before visitors and search engines can use it.", "Resolve the server response or redirect error.", "high", 8),
    check("https", "Technical", "HTTPS", url.startsWith("https://") ? "pass" : "fail", url.startsWith("https://") ? "Secure HTTPS URL" : "Page uses HTTP", "HTTPS protects visitor data and avoids browser trust warnings.", "Install SSL and redirect all HTTP requests to HTTPS.", "high", 6),
    check("viewport", "Mobile", "Mobile viewport", hasViewport ? "pass" : "fail", hasViewport ? "Viewport meta tag found" : "Viewport meta tag missing", "A viewport declaration is required for predictable mobile rendering.", "Add a responsive viewport meta tag and verify at mobile widths.", "high", 5),
    check("title", "SEO", "Page title", title.length >= 20 && title.length <= 65 ? "pass" : title ? "warning" : "fail", title || "No title found", "A clear, unique title helps search engines and visitors understand the page.", "Write a 20-65 character title containing the main service and market.", "high", 6),
    check("description", "SEO", "Meta description", description.length >= 70 && description.length <= 170 ? "pass" : description ? "warning" : "fail", description || "No meta description found", "The description should explain the offer and encourage a relevant click.", "Write a unique 70-170 character description with service, audience and action.", "medium", 5),
    check("headings", "Content", "H1 and heading structure", headingSequenceOkay ? "pass" : h1s.length ? "warning" : "fail", `${h1s.length} H1 and ${h2Count} H2 headings`, "One descriptive H1 and logical supporting headings make the page easier to scan.", "Use one specific H1, followed by descriptive H2 sections.", "high", 6),
    check("cta", "Conversion", "Visible contact action", hasAction ? "pass" : "fail", hasAction ? "Contact, booking, quote, call or WhatsApp action found" : "No clear action found in links or buttons", "Visitors need an obvious next step.", "Add a specific primary CTA above the fold and repeat it near the final section.", "high", 8),
    check("form", "Conversion", "Contact form", hasForm ? "pass" : hasAction ? "not_applicable" : "fail", hasForm ? "Form element found" : "No form found", "A form gives visitors a fallback when direct contact is inconvenient.", "Add a short enquiry form or ensure another contact action is prominent.", "medium", 4),
    check("services", "Content", "Service clarity", serviceClarity ? "pass" : "warning", serviceClarity ? "Service or solution language found" : "No clear service section language found", "Visitors should quickly understand what the business sells.", "Add a concise services section with outcomes and customer fit.", "high", 6),
    check("trust", "Trust", "Trust signals", trust ? "pass" : "warning", trust ? "Trust, review, credential or client language found" : "No explicit trust proof found", "Specific proof reduces uncertainty before an enquiry.", "Add real credentials, reviews, project examples or named proof.", "high", 6),
    check("faq", "Content", "FAQ content", faq ? "pass" : "warning", faq ? "FAQ content found" : "No FAQ content found", "FAQs answer objections and can support search relevance.", "Add 4-8 genuine questions customers ask before contacting you.", "low", 3),
    check("local", "Local SEO", "Location and service areas", local ? "pass" : "warning", local ? "Location or service-area information found" : "No location or service-area language found", "Local businesses need clear geographic relevance.", "State the primary location and genuine areas served.", "medium", 5),
    check("alt", "Accessibility", "Image alternative text", imageMatches.length === 0 ? "not_applicable" : missingAlt === 0 ? "pass" : missingAlt < imageMatches.length ? "warning" : "fail", `${imageMatches.length - missingAlt}/${imageMatches.length} images have descriptive alt text`, "Alternative text supports accessibility and image understanding.", "Add concise contextual alt text to meaningful images.", "medium", 4),
    check("schema", "SEO", "Schema markup", schema ? "pass" : "warning", schema ? "JSON-LD markup found" : "No JSON-LD markup found", "Valid structured data can clarify business and page information.", "Add appropriate Organization or LocalBusiness, Service and FAQ structured data.", "low", 3),
    check("robots", "SEO", "Robots configuration", input.robotsFound ? "pass" : "warning", input.robotsFound ? "robots.txt found" : "robots.txt was not found", "Robots directives help crawlers understand access rules.", "Publish a valid robots.txt that references the sitemap.", "low", 3),
    check("sitemap", "SEO", "Sitemap", input.sitemapFound ? "pass" : "warning", input.sitemapFound ? "Sitemap found" : "Sitemap was not found", "A sitemap helps search engines discover important pages.", "Publish and submit an XML sitemap.", "low", 3),
    check("links", "Technical", "Broken links", brokenLinks.length === 0 ? "pass" : "fail", input.checkedLinks ? `${brokenLinks.length} broken of ${input.checkedLinks} sampled internal links` : "No internal links required sampling", "Broken links interrupt journeys and reduce trust.", "Repair or remove the listed broken internal links.", "high", 6),
    check("performance", "Performance", "Basic response performance", responseTimeMs <= 1200 ? "pass" : responseTimeMs <= 2500 ? "warning" : "fail", `Initial HTML responded in ${responseTimeMs}ms; ${Math.round(new TextEncoder().encode(html).length / 1024)}KB HTML`, "Slow server response delays every visible part of the page.", "Reduce server latency, HTML weight and render-blocking resources.", "medium", 8),
  ];
  const applicable = checks.filter((item) => item.status !== "not_applicable");
  const overallScore = Math.round(applicable.reduce((sum, item) => sum + item.scoreContribution, 0) / applicable.reduce((sum, item) => sum + item.maxScore, 0) * 100);
  const categoryScores = Object.fromEntries([...new Set(applicable.map((item) => item.category))].map((category) => {
    const items = applicable.filter((item) => item.category === category);
    return [category, Math.round(items.reduce((sum, item) => sum + item.scoreContribution, 0) / items.reduce((sum, item) => sum + item.maxScore, 0) * 100)];
  }));
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const topProblems = checks.filter((item) => item.status === "fail" || item.status === "warning").sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority] || a.scoreContribution - b.scoreContribution).slice(0, 5);
  const recommendedPlan = overallScore < 45 || topProblems.filter((item) => item.priority === "high").length >= 4 ? "growth" : overallScore < 75 ? "business" : "starter";
  return {
    analyzedUrl: url,
    analyzedAt: new Date().toISOString(),
    overallScore,
    categoryScores,
    checks,
    topProblems,
    recommendedActions: topProblems.map((item) => item.recommendedAction),
    suggestedHeadline: h1s[0] && h1s[0].length >= 12 ? h1s[0] : "A clear outcome-led headline for your main service and location",
    suggestedCTA: hasAction ? "Keep one primary action consistent across the page" : "Request a Quote",
    suggestedWebsiteStructure: ["Outcome-led hero", "Services and customer fit", "Real trust proof", "Process", "FAQ", "Contact and primary CTA"],
    recommendedPlan,
    performance: { responseTimeMs, htmlBytes: new TextEncoder().encode(html).length, imageCount: imageMatches.length, scriptCount: count(html, /<script\b/gi) },
  };
}
