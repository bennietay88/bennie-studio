import type { SeoHealthComponent, SeoSeverity } from "../../src/modules/seo/types.js";

export interface TechnicalAuditInput {
  url: string;
  html: string;
  statusCode: number;
  responseTimeMs: number;
  robotsFound: boolean;
  sitemapFound: boolean;
  checkedLinks: number;
  brokenLinks: string[];
  weights?: Record<string, number>;
}

export interface TechnicalAuditFinding {
  issueKey: string;
  moduleKey: "technical";
  severity: SeoSeverity;
  title: string;
  whatWeFound: string;
  whyItMatters: string;
  recommendedAction: string;
  evidence: Record<string, unknown>;
  affectedUrls: string[];
  effort: "low" | "medium" | "high";
}

export interface TechnicalAuditResult {
  score: number;
  scoreExplanation: {
    methodology: string;
    components: SeoHealthComponent[];
  };
  summary: string;
  findings: TechnicalAuditFinding[];
  metrics: Record<string, unknown>;
}

const DEFAULT_WEIGHTS: Record<string, number> = {
  httpStatus: 20,
  https: 10,
  title: 15,
  description: 10,
  h1: 10,
  canonical: 10,
  robots: 10,
  sitemap: 10,
  structuredData: 5,
};

const readTagContent = (html: string, pattern: RegExp) => {
  const match = html.match(pattern);
  return String(match?.[1] || "").replace(/\s+/g, " ").trim();
};

const readMetaContent = (html: string, name: string) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const first = new RegExp(`<meta\\b[^>]*(?:name|property)=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i");
  const reversed = new RegExp(`<meta\\b[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${escaped}["'][^>]*>`, "i");
  return readTagContent(html, first) || readTagContent(html, reversed);
};

const component = (
  key: string,
  label: string,
  passed: boolean,
  weights: Record<string, number>,
  evidence: string,
): SeoHealthComponent => ({ key, label, passed, weight: Math.max(0, Number(weights[key] ?? 0)), evidence });

export function analyzeTechnicalSeo(input: TechnicalAuditInput): TechnicalAuditResult {
  const weights = { ...DEFAULT_WEIGHTS, ...(input.weights || {}) };
  const title = readTagContent(input.html, /<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const description = readMetaContent(input.html, "description");
  const robots = readMetaContent(input.html, "robots").toLowerCase();
  const h1Count = (input.html.match(/<h1\b[^>]*>/gi) || []).length;
  const canonical = readTagContent(
    input.html,
    /<link\b[^>]*rel=["'][^"']*canonical[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i,
  ) || readTagContent(
    input.html,
    /<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["'][^"']*canonical[^"']*["'][^>]*>/i,
  );
  const hasStructuredData = /<script\b[^>]*type=["']application\/ld\+json["']/i.test(input.html);
  const indexable = !/(?:^|,)\s*(?:noindex|none)\b/i.test(robots);
  const responseOk = input.statusCode >= 200 && input.statusCode < 400;
  const isHttps = input.url.startsWith("https://");

  const components = [
    component("httpStatus", "Successful page response", responseOk, weights, `HTTP ${input.statusCode}`),
    component("https", "HTTPS delivery", isHttps, weights, new URL(input.url).protocol.replace(":", "").toUpperCase()),
    component("title", "Page title present", Boolean(title), weights, title ? `${title.length} characters` : "No title element detected"),
    component("description", "Meta description present", Boolean(description), weights, description ? `${description.length} characters` : "No meta description detected"),
    component("h1", "One primary heading", h1Count === 1, weights, `${h1Count} H1 element${h1Count === 1 ? "" : "s"} detected`),
    component("canonical", "Canonical URL declared", Boolean(canonical), weights, canonical || "No canonical link detected"),
    component("robots", "Page is indexable", indexable, weights, robots || "No page-level noindex directive detected"),
    component("sitemap", "XML sitemap available", input.sitemapFound, weights, input.sitemapFound ? "sitemap.xml responded successfully" : "sitemap.xml was not found"),
    component("structuredData", "Structured data present", hasStructuredData, weights, hasStructuredData ? "JSON-LD detected" : "No JSON-LD detected"),
  ];

  const totalWeight = components.reduce((sum, item) => sum + item.weight, 0);
  const passedWeight = components.reduce((sum, item) => sum + (item.passed ? item.weight : 0), 0);
  const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;
  const findings: TechnicalAuditFinding[] = [];

  const addFinding = (finding: TechnicalAuditFinding) => findings.push(finding);
  if (!responseOk) addFinding({
    issueKey: "page_response_error", moduleKey: "technical", severity: "critical",
    title: "The audited page did not return a successful response",
    whatWeFound: `The page returned HTTP ${input.statusCode}.`,
    whyItMatters: "Search engines and visitors may be unable to access the page reliably.",
    recommendedAction: "Restore a successful page response and confirm the page can be fetched without redirects to an error.",
    evidence: { statusCode: input.statusCode }, affectedUrls: [input.url], effort: "high",
  });
  if (!isHttps) addFinding({
    issueKey: "https_missing", moduleKey: "technical", severity: "high",
    title: "The page is not delivered over HTTPS",
    whatWeFound: `The audited URL uses ${new URL(input.url).protocol}.`,
    whyItMatters: "An unsecured connection can reduce visitor trust and creates an avoidable technical search issue.",
    recommendedAction: "Enable a valid TLS certificate and redirect the HTTP version to HTTPS.",
    evidence: { protocol: new URL(input.url).protocol }, affectedUrls: [input.url], effort: "medium",
  });
  if (!title) addFinding({
    issueKey: "title_missing", moduleKey: "technical", severity: "high",
    title: "The page title is missing",
    whatWeFound: "No non-empty title element was detected in the page HTML.",
    whyItMatters: "The title helps search engines and searchers understand the page topic.",
    recommendedAction: "Add a concise, page-specific title that accurately names the service or topic and relevant location where appropriate.",
    evidence: { titlePresent: false }, affectedUrls: [input.url], effort: "low",
  });
  if (!description) addFinding({
    issueKey: "meta_description_missing", moduleKey: "technical", severity: "medium",
    title: "The meta description is missing",
    whatWeFound: "No non-empty meta description was detected in the page HTML.",
    whyItMatters: "A relevant description can make the page purpose clearer when search engines choose to use it in a result snippet.",
    recommendedAction: "Write a useful page-specific description that summarizes the offer and next action without keyword stuffing.",
    evidence: { descriptionPresent: false }, affectedUrls: [input.url], effort: "low",
  });
  if (h1Count !== 1) addFinding({
    issueKey: "primary_heading_structure", moduleKey: "technical", severity: h1Count === 0 ? "high" : "medium",
    title: h1Count === 0 ? "The page has no primary heading" : "The page has multiple primary headings",
    whatWeFound: `${h1Count} H1 elements were detected.`,
    whyItMatters: "A clear primary heading helps visitors and search systems understand the main subject of the page.",
    recommendedAction: "Use one descriptive H1 for the page topic and structure supporting sections with lower-level headings.",
    evidence: { h1Count }, affectedUrls: [input.url], effort: "low",
  });
  if (!canonical) addFinding({
    issueKey: "canonical_missing", moduleKey: "technical", severity: "medium",
    title: "No canonical URL was declared",
    whatWeFound: "The page HTML did not include a canonical link element.",
    whyItMatters: "A canonical URL makes the preferred version less ambiguous when similar URLs exist.",
    recommendedAction: "Add a self-referencing canonical URL and keep it consistent with redirects and sitemap entries.",
    evidence: { canonicalPresent: false }, affectedUrls: [input.url], effort: "low",
  });
  if (!indexable) addFinding({
    issueKey: "page_noindex", moduleKey: "technical", severity: "critical",
    title: "The page asks search engines not to index it",
    whatWeFound: `The robots directive is “${robots}”.`,
    whyItMatters: "The page may be excluded from search results while this directive remains in place.",
    recommendedAction: "Confirm whether exclusion is intentional. Remove the noindex directive only when the page is ready to appear in search.",
    evidence: { robots }, affectedUrls: [input.url], effort: "low",
  });
  if (!input.sitemapFound) addFinding({
    issueKey: "sitemap_missing", moduleKey: "technical", severity: "medium",
    title: "An XML sitemap was not found at the standard location",
    whatWeFound: "The audit could not confirm a successful response from /sitemap.xml.",
    whyItMatters: "A sitemap can make page discovery and change monitoring easier for search engines.",
    recommendedAction: "Publish a current XML sitemap and reference it from robots.txt or the connected search console.",
    evidence: { sitemapFound: false }, affectedUrls: [new URL("/sitemap.xml", input.url).toString()], effort: "medium",
  });
  if (!input.robotsFound) addFinding({
    issueKey: "robots_file_missing", moduleKey: "technical", severity: "low",
    title: "A robots.txt file was not found at the standard location",
    whatWeFound: "The audit could not confirm a successful response from /robots.txt.",
    whyItMatters: "A robots file provides a central place for crawl instructions and sitemap discovery.",
    recommendedAction: "Add a deliberate robots.txt file that does not accidentally block important public pages.",
    evidence: { robotsFound: false }, affectedUrls: [new URL("/robots.txt", input.url).toString()], effort: "low",
  });
  if (!hasStructuredData) addFinding({
    issueKey: "structured_data_missing", moduleKey: "technical", severity: "low",
    title: "No JSON-LD structured data was detected",
    whatWeFound: "The audited HTML did not contain an application/ld+json script.",
    whyItMatters: "Relevant structured data can make business and page entities easier for search systems to interpret.",
    recommendedAction: "Add only schema types that accurately describe visible page content, such as Organization, LocalBusiness, Service, or FAQ where eligible.",
    evidence: { jsonLdPresent: false }, affectedUrls: [input.url], effort: "medium",
  });
  if (input.brokenLinks.length > 0) addFinding({
    issueKey: "sampled_internal_links_broken", moduleKey: "technical", severity: "high",
    title: "The audit found internal links that did not respond successfully",
    whatWeFound: `${input.brokenLinks.length} of ${input.checkedLinks} sampled internal links failed the availability check.`,
    whyItMatters: "Broken paths create friction for visitors and can prevent search crawlers from reaching useful pages.",
    recommendedAction: "Correct, redirect, or remove each confirmed broken internal link and validate it again after the change.",
    evidence: { checkedLinks: input.checkedLinks, brokenLinks: input.brokenLinks }, affectedUrls: input.brokenLinks, effort: "medium",
  });

  return {
    score,
    scoreExplanation: {
      methodology: "Calculated only from the displayed technical checks and their configured weights. No AI opinion, traffic estimate, ranking estimate, or revenue estimate is included.",
      components,
    },
    summary: findings.length === 0
      ? "The audited page passed the configured technical checks. Continue monitoring and connect search data before drawing performance conclusions."
      : `We found ${findings.length} observable technical ${findings.length === 1 ? "issue" : "issues"} to review.`,
    findings,
    metrics: {
      statusCode: input.statusCode,
      responseTimeMs: input.responseTimeMs,
      titleLength: title.length,
      descriptionLength: description.length,
      h1Count,
      canonical: canonical || null,
      indexable,
      robotsFound: input.robotsFound,
      sitemapFound: input.sitemapFound,
      structuredDataFound: hasStructuredData,
      checkedLinks: input.checkedLinks,
      brokenLinkCount: input.brokenLinks.length,
    },
  };
}
