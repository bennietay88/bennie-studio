export type PublicPreviewProfile = {
  sourceUrl: string;
  businessName: string;
  description: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  services: string[];
  serviceAreas: string[];
  testimonials: string[];
  credentials: string[];
  yearsInBusiness: string;
  guarantees: string[];
  primaryCta: string;
  heroImage: string;
  secondaryImage: string;
  logoUrl: string;
  brandColor: string;
  accentColor: string;
  heroHeadline: string;
  heroSubheadline: string;
  sourceTitle: string;
  aiUsed: false;
  estimatedAiCostUsd: 0;
};

const decodeEntities = (value: string) =>
  String(value || "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

const text = (value: string) =>
  decodeEntities(String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const firstMatch = (html: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = pattern.exec(html);
    const value = text(match?.[1] || "");
    if (value) return value;
  }
  return "";
};

const absoluteUrl = (value: string, baseUrl: string) => {
  try {
    const parsed = new URL(value, baseUrl);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
};


const normalizeCssColor = (value: string) => {
  const raw = String(value || "").trim().toLowerCase();
  const short = /^#([0-9a-f]{3})$/i.exec(raw);
  if (short) return "#" + short[1].split("").map((char) => char + char).join("");
  const full = /^#([0-9a-f]{6})$/i.exec(raw);
  if (full) return "#" + full[1].toLowerCase();
  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(raw);
  if (rgb) {
    const channels = rgb.slice(1, 4).map((part) => Math.max(0, Math.min(255, Number(part))));
    return "#" + channels.map((channel) => channel.toString(16).padStart(2, "0")).join("");
  }
  return "";
};

const isUsefulBrandColor = (value: string) => {
  const color = normalizeCssColor(value);
  if (!color) return false;
  return !["#ffffff", "#000000", "#f8fafc", "#f9fafb", "#f5f5f5", "#eeeeee"].includes(color);
};

const extractBrandColors = (html: string) => {
  const candidates: string[] = [];
  const metaPatterns = [
    /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']theme-color["']/i,
    /<meta[^>]+name=["']msapplication-TileColor["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const pattern of metaPatterns) {
    const match = pattern.exec(html);
    if (match?.[1]) candidates.push(match[1]);
  }

  for (const match of html.matchAll(/--(?:primary|brand|accent|theme|color-primary|color-brand)[\w-]*\s*:\s*(#[0-9a-f]{3,8}|rgba?\([^;)]+\))/gi)) {
    candidates.push(match[1]);
  }

  for (const match of html.matchAll(/(?:background-color|color)\s*:\s*(#[0-9a-f]{3,8}|rgba?\([^;)]+\))/gi)) {
    candidates.push(match[1]);
    if (candidates.length >= 16) break;
  }

  const normalized = [...new Set(candidates.map(normalizeCssColor).filter(isUsefulBrandColor))];
  return {
    brandColor: normalized[0] || "",
    accentColor: normalized.find((color) => color !== normalized[0]) || "",
  };
};

const extractSchemaAsset = (objects: any[], key: "logo" | "image") => {
  for (const object of objects) {
    const asset = object?.[key];
    if (typeof asset === "string" && asset.trim()) return asset.trim();
    if (Array.isArray(asset)) {
      const first = asset.find((item) => typeof item === "string" || (item && typeof item?.url === "string"));
      if (typeof first === "string") return first.trim();
      if (first && typeof first?.url === "string") return first.url.trim();
    }
    if (asset && typeof asset === "object" && typeof asset.url === "string") return asset.url.trim();
  }
  return "";
};

const extractLogoUrl = (objects: any[], html: string, baseUrl: string) => {
  const schemaLogo = extractSchemaAsset(objects, "logo");
  if (schemaLogo) return absoluteUrl(schemaLogo, baseUrl);

  for (const match of html.matchAll(/<img\b([^>]+)>/gi)) {
    const attrs = String(match[1] || "");
    if (!/(?:class|id|alt)=["'][^"']*logo[^"']*["']/i.test(attrs)) continue;
    const src = /\bsrc=["']([^"']+)["']/i.exec(attrs)?.[1] || "";
    const resolved = absoluteUrl(src, baseUrl);
    if (resolved) return resolved;
  }
  return "";
};

const extractImageCandidates = (html: string, baseUrl: string) => {
  const results: string[] = [];
  for (const match of html.matchAll(/<img\b([^>]+)>/gi)) {
    const attrs = String(match[1] || "");
    if (/(?:logo|icon|avatar|badge|sprite|favicon)/i.test(attrs)) continue;
    const src = /\b(?:src|data-src|data-lazy-src)=["']([^"']+)["']/i.exec(attrs)?.[1] || "";
    if (!src || /^data:/i.test(src)) continue;
    const resolved = absoluteUrl(src, baseUrl);
    if (!resolved) continue;
    results.push(resolved);
    if (results.length >= 12) break;
  }
  return [...new Set(results)];
};

const extractHeroSubheadline = (html: string, description: string) => {
  const h1Match = /<h1\b[^>]*>[\s\S]*?<\/h1>/i.exec(html);
  if (h1Match?.index !== undefined) {
    const after = html.slice(h1Match.index + h1Match[0].length, h1Match.index + h1Match[0].length + 2400);
    const paragraph = firstMatch(after, [/<p\b[^>]*>([\s\S]*?)<\/p>/i]);
    if (paragraph && paragraph.length >= 20 && paragraph.length <= 260) return paragraph;
  }
  return description;
};

const cleanBusinessName = (value: string) =>
  value
    .replace(/\s+[|–—-]\s+.*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 160);

const normalizePhone = (value: string) =>
  decodeEntities(value)
    .replace(/^tel:/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

const isGenericServiceLabel = (value: string) =>
  /^(home|about|about us|contact|contact us|blog|news|gallery|reviews?|testimonials?|faq|privacy|terms|login|sign in|book now|get started|learn more|read more)$/i.test(value.trim());

const serviceSignal = /\b(service|repair|install|installation|maintenance|servicing|cleaning|plumb|heating|boiler|gas|electrical|roof|renovation|dental|dentist|clinic|treatment|accounting|bookkeeping|tax|payroll|consult|therapy|tuition|training|marketing|design|development|website|web design|web development|seo|lead generation|hosting|legal|law|insurance|recruit|pest|landlord|commercial|residential|emergency|cylinder|flushing)\b/i;

const isAudienceOrMarketingLabel = (value: string) => {
  const label = value.trim();
  if (!label) return true;
  if (/^(see|view|learn|discover|read|book|get|request|start|explore)\b/i.test(label)) return true;
  if (/^(your|our|we|why|a better|the better|ready to|built for|designed for)\b/i.test(label)) return true;
  if (/\b(direction|click here|find out more|you can contact|in one service|all in one|without hiring|more qualified leads?|grow your business)\b/i.test(label)) return true;
  if (/[.!?]$/.test(label) && label.split(/\s+/).length > 3) return true;
  if (!/\bfor\b/i.test(label) && /\b(companies|businesses|firms|centres?|centers?|parents?|students?|homeowners?|customers?|clients?|founders?|teams?)\s*$/i.test(label)) return true;
  return label.split(/\s+/).length > 8;
};

const extractBusinessSchemaName = (objects: any[]) => {
  const preferred = [
    "organization",
    "localbusiness",
    "professionalservice",
    "corporation",
    "person",
    "medicalbusiness",
    "dentist",
    "accountingservice",
    "legalservice",
  ];
  for (const typeName of preferred) {
    for (const object of objects) {
      const types = Array.isArray(object?.["@type"]) ? object["@type"] : [object?.["@type"]];
      if (!types.some((type: unknown) => String(type || "").toLowerCase() === typeName)) continue;
      const value = typeof object?.name === "string" ? object.name.trim() : "";
      if (value) return value;
    }
  }
  for (const object of objects) {
    const types = Array.isArray(object?.["@type"]) ? object["@type"] : [object?.["@type"]];
    const normalizedTypes = types.map((type: unknown) => String(type || "").toLowerCase());
    if (normalizedTypes.some((type: string) => ["website", "webpage", "breadcrumblist", "listitem"].includes(type))) continue;
    const value = typeof object?.name === "string" ? object.name.trim() : "";
    if (value) return value;
  }
  for (const object of objects) {
    const types = Array.isArray(object?.["@type"]) ? object["@type"] : [object?.["@type"]];
    if (!types.some((type: unknown) => String(type || "").toLowerCase() === "website")) continue;
    const value = typeof object?.name === "string" ? object.name.trim() : "";
    if (value) return value;
  }
  return "";
};

const titleBrandCandidate = (value: string) => {
  const parts = value.split(/\s+[|–—]\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return value;
  const first = parts[0];
  const last = parts[parts.length - 1];
  const seoLead = /\b(website|web design|lead generation|seo|marketing|dentist|dental|clinic|accounting|bookkeeping|cleaning|plumbing|heating|renovation|contractor|tuition|education|consulting|consultant)\b/i;
  if (last.length <= 80 && seoLead.test(first)) return last;
  return first;
};

const inferPrimaryService = (title: string, description: string, h1: string) => {
  const combined = [title, description, h1].filter(Boolean).join(" ");
  if (/\bmanaged websites?\b|\bmanaged website service\b/i.test(combined)) return "Managed website services";
  if (/\bwebsite design\b|\bweb design\b|\bconversion-focused websites?\b|\blead generation website\b/i.test(combined)) {
    return "Website design and lead generation";
  }
  return "";
};

const extractJsonLdObjects = (html: string) => {
  const objects: any[] = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) objects.push(...parsed);
      else if (Array.isArray(parsed?.["@graph"])) objects.push(...parsed["@graph"]);
      else if (parsed && typeof parsed === "object") objects.push(parsed);
    } catch {
      // Invalid third-party schema must never break preview intake.
    }
  }
  return objects;
};

const pickSchemaValue = (objects: any[], keys: string[]) => {
  for (const object of objects) {
    for (const key of keys) {
      const value = object?.[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return "";
};

const extractLocation = (objects: any[]) => {
  for (const object of objects) {
    const address = object?.address;
    if (!address || typeof address !== "object") continue;
    const parts = [address.addressLocality, address.addressRegion, address.addressCountry]
      .map((part) => typeof part === "string" ? part.trim() : "")
      .filter(Boolean);
    if (parts.length) return [...new Set(parts)].join(", ").slice(0, 160);
  }
  return "";
};

const canonicalizeServiceLabel = (value: string) => {
  const label = value.replace(/\s+/g, " ").trim();
  if (/^managed websites?$/i.test(label)) return "Managed website services";
  return label;
};

const extractServices = (html: string) => {
  const candidates: string[] = [];

  for (const match of html.matchAll(/<(?:h1|h2|h3)[^>]*>([\s\S]*?)<\/(?:h1|h2|h3)>/gi)) {
    const label = text(match[1]);
    if (
      label
      && label.length <= 90
      && serviceSignal.test(label)
      && !isAudienceOrMarketingLabel(label)
    ) candidates.push(label);
  }

  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = String(match[1] || "");
    const label = text(match[2]);
    if (!label || label.length > 70 || isGenericServiceLabel(label) || isAudienceOrMarketingLabel(label)) continue;
    if (serviceSignal.test(label) || /\/(services?|treatments?|solutions?|repairs?|installations?|commercial|landlords?)(?:\/|$|-)/i.test(href)) {
      candidates.push(label);
    }
  }

  return [...new Set(candidates.map((item) => canonicalizeServiceLabel(item)))]
    .filter((item) => item.length >= 3 && !isGenericServiceLabel(item) && !isAudienceOrMarketingLabel(item))
    .slice(0, 8);
};

const extractTestimonials = (html: string) => {
  const candidates: string[] = [];
  const patterns = [
    /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi,
    /<(?:p|div)[^>]+class=["'][^"']*(?:testimonial|review|quote)[^"']*["'][^>]*>([\s\S]*?)<\/(?:p|div)>/gi,
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const value = text(match[1]);
      if (value.length >= 25 && value.length <= 180 && !/privacy|cookie|terms/i.test(value)) candidates.push(value);
    }
  }
  return [...new Set(candidates)].slice(0, 6);
};

const pageText = (html: string) => text(html).slice(0, 40_000);

const extractServiceAreas = (objects: any[], html: string) => {
  const values: string[] = [];
  for (const object of objects) {
    const area = object?.areaServed;
    const entries = Array.isArray(area) ? area : area ? [area] : [];
    for (const entry of entries) {
      const value = typeof entry === "string"
        ? entry
        : typeof entry?.name === "string"
          ? entry.name
          : "";
      if (value.trim()) values.push(value.trim().slice(0, 100));
    }
  }
  const body = pageText(html);
  for (const match of body.matchAll(/\b(?:serving|service areas?|areas? served)\s*[:\-]?\s*([^.!?]{3,120})/gi)) {
    const value = String(match[1] || "").trim().replace(/\s+/g, " ");
    if (value && !/privacy|cookie|terms/i.test(value)) values.push(value.slice(0, 100));
  }
  return [...new Set(values.map((value) => value.replace(/[;,]\s*$/, "").trim()))].filter(Boolean).slice(0, 8);
};

const extractCredentials = (html: string) => {
  const body = pageText(html);
  const values: string[] = [];
  const patterns = [
    /\b(?:fully\s+)?licensed(?:\s+and\s+insured)?\b/gi,
    /\b(?:certified|accredited|registered)\s+(?:by|with|member|professional)?\s*[^.!?]{0,80}/gi,
    /\bmember\s+of\s+[^.!?]{2,80}/gi,
    /\b(?:award[- ]winning|winner\s+of)\s+[^.!?]{0,80}/gi,
  ];
  for (const pattern of patterns) {
    for (const match of body.matchAll(pattern)) {
      const value = String(match[0] || "").trim().replace(/\s+/g, " ");
      if (value.length >= 6 && value.length <= 120) values.push(value);
    }
  }
  return [...new Set(values)].slice(0, 6);
};

const extractYearsInBusiness = (objects: any[], html: string) => {
  const body = pageText(html);
  const explicit = /\b(?:over\s+|more\s+than\s+)?(\d{1,3})\+?\s+years?(?:\s+of\s+experience|\s+in\s+business|\s+serving|\s+established)?\b/i.exec(body);
  if (explicit) return explicit[0].replace(/\s+/g, " ").trim().slice(0, 80);
  const established = /\b(?:established|founded|since)\s+(?:in\s+)?((?:19|20)\d{2})\b/i.exec(body);
  if (established) return `${established[0].replace(/\s+/g, " ").trim()}`.slice(0, 80);
  for (const object of objects) {
    const founded = String(object?.foundingDate || "").trim();
    const year = /(?:19|20)\d{2}/.exec(founded)?.[0];
    if (year) return `Founded ${year}`;
  }
  return "";
};

const extractGuarantees = (html: string) => {
  const body = pageText(html);
  const values: string[] = [];
  const pattern = /\b(?:money[- ]back|satisfaction|workmanship|lifetime)\s+(?:guarantee|warranty)\b|\b\d{1,3}[- ](?:day|month|year)(?:\s+[a-z][a-z-]*){0,2}\s+(?:guarantee|warranty)\b|\bguaranteed\s+[^.!?]{0,70}/gi;
  for (const match of body.matchAll(pattern)) {
    const value = String(match[0] || "").trim().replace(/\s+/g, " ");
    if (value.length >= 8 && value.length <= 110) values.push(value);
  }
  return [...new Set(values)].slice(0, 4);
};

const extractPrimaryCta = (html: string) => {
  const preferred = /\b(book|request|contact|call|quote|schedule|consultation|appointment|enquire|inquire|get started|whatsapp)\b/i;
  const candidates: string[] = [];
  for (const match of html.matchAll(/<(?:a|button)\b[^>]*>([\s\S]*?)<\/(?:a|button)>/gi)) {
    const value = text(match[1]);
    if (value && value.length <= 70 && preferred.test(value)) candidates.push(value);
  }
  return candidates[0] || "";
};

export function buildPublicPreviewProfile(input: {
  html: string;
  finalUrl: string;
  fallbackBusinessName?: string | null;
  fallbackLocation?: string | null;
  fallbackMainService?: string | null;
}): PublicPreviewProfile {
  const { html, finalUrl } = input;
  const schemaObjects = extractJsonLdObjects(html);

  const title = firstMatch(html, [/<title[^>]*>([\s\S]*?)<\/title>/i]);
  const schemaName = extractBusinessSchemaName(schemaObjects);
  const ogSiteName = firstMatch(html, [
    /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i,
  ]);
  const homeBrand = firstMatch(html, [
    /<a\b[^>]*href=["'](?:\/|\.\/|\/)["'][^>]*>([\s\S]*?)<\/a>/i,
  ]);
  const h1 = firstMatch(html, [/<h1[^>]*>([\s\S]*?)<\/h1>/i]);

  const businessName = cleanBusinessName(
    schemaName
    || ogSiteName
    || homeBrand
    || titleBrandCandidate(title)
    || input.fallbackBusinessName
    || h1
    || new URL(finalUrl).hostname.replace(/^www\./, ""),
  ).replace(/\s+\bby\b\s+.*$/i, "").trim();

  const description = firstMatch(html, [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  ]).slice(0, 500);

  const schemaPhone = pickSchemaValue(schemaObjects, ["telephone"]);
  const phoneHref = firstMatch(html, [/<a\b[^>]*href=["'](tel:[^"']+)["']/i]);
  const contactPhone = normalizePhone(schemaPhone || phoneHref);

  const schemaEmail = pickSchemaValue(schemaObjects, ["email"]).replace(/^mailto:/i, "");
  const emailHref = firstMatch(html, [/<a\b[^>]*href=["']mailto:([^"'?]+)[^"']*["']/i]);
  const contactEmail = (schemaEmail || emailHref).trim().slice(0, 254);

  const location = (
    extractLocation(schemaObjects)
    || String(input.fallbackLocation || "").trim()
  ).slice(0, 160);

  const inferredPrimaryService = inferPrimaryService(title, description, h1);
  const services = [
    ...extractServices(html),
    ...(inferredPrimaryService ? [canonicalizeServiceLabel(inferredPrimaryService)] : []),
  ].filter((item, index, items) => items.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index);
  if (!services.length && input.fallbackMainService?.trim()) services.push(input.fallbackMainService.trim());
  const testimonials = extractTestimonials(html);
  const serviceAreas = extractServiceAreas(schemaObjects, html);
  const credentials = extractCredentials(html);
  const yearsInBusiness = extractYearsInBusiness(schemaObjects, html);
  const guarantees = extractGuarantees(html);
  const primaryCta = extractPrimaryCta(html);

  const schemaImageRaw = extractSchemaAsset(schemaObjects, "image");

  const ogImage = firstMatch(html, [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  ]);
  const imageCandidates = extractImageCandidates(html, finalUrl);
  const firstImage = imageCandidates[0] || "";
  const heroImage = absoluteUrl(schemaImageRaw || ogImage || firstImage, finalUrl);
  const secondaryImage = imageCandidates.find((image) => image !== heroImage) || "";
  const logoUrl = extractLogoUrl(schemaObjects, html, finalUrl);
  const { brandColor, accentColor } = extractBrandColors(html);
  const heroHeadline = h1.slice(0, 120);
  const heroSubheadline = extractHeroSubheadline(html, description).slice(0, 320);

  return {
    sourceUrl: finalUrl,
    businessName,
    description,
    location,
    contactEmail,
    contactPhone,
    services,
    serviceAreas,
    testimonials,
    credentials,
    yearsInBusiness,
    guarantees,
    primaryCta,
    heroImage,
    secondaryImage,
    logoUrl,
    brandColor,
    accentColor,
    heroHeadline,
    heroSubheadline,
    sourceTitle: title.slice(0, 220),
    aiUsed: false,
    estimatedAiCostUsd: 0,
  };
}


export function extractPreviewEvidenceUrls(html: string, baseUrl: string, limit = 4) {
  const urls: string[] = [];
  const seen = new Set<string>();
  let base: URL;
  try { base = new URL(baseUrl); } catch { return urls; }
  const priority = /\b(reviews?|testimonials?|services?|about|contact|projects?|gallery|case-studies?|treatments?|solutions?)\b/i;
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = String(match[1] || "").trim();
    const label = text(match[2]);
    if (!priority.test(href) && !priority.test(label)) continue;
    try {
      const url = new URL(href, base);
      if (url.origin !== base.origin || !["http:", "https:"].includes(url.protocol)) continue;
      url.hash = "";
      const normalized = url.toString();
      if (seen.has(normalized) || normalized === base.toString()) continue;
      seen.add(normalized);
      urls.push(normalized);
      if (urls.length >= limit) break;
    } catch {}
  }
  return urls;
}
