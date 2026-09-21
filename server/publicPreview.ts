export type PublicPreviewProfile = {
  sourceUrl: string;
  businessName: string;
  description: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  services: string[];
  heroImage: string;
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

const serviceSignal = /\b(service|repair|install|installation|maintenance|servicing|cleaning|plumb|heating|boiler|gas|electrical|roof|renovation|dental|dentist|clinic|treatment|accounting|bookkeeping|tax|payroll|consult|therapy|tuition|training|marketing|design|development|legal|law|insurance|recruit|pest|landlord|commercial|residential|emergency|cylinder|flushing)\b/i;

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

const extractServices = (html: string) => {
  const candidates: string[] = [];

  for (const match of html.matchAll(/<(?:h1|h2|h3)[^>]*>([\s\S]*?)<\/(?:h1|h2|h3)>/gi)) {
    const label = text(match[1]);
    if (label && label.length <= 90 && serviceSignal.test(label)) candidates.push(label);
  }

  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = String(match[1] || "");
    const label = text(match[2]);
    if (!label || label.length > 70 || isGenericServiceLabel(label)) continue;
    if (serviceSignal.test(label) || /\/(services?|treatments?|solutions?|repairs?|installations?|commercial|landlords?)(?:\/|$|-)/i.test(href)) {
      candidates.push(label);
    }
  }

  return [...new Set(candidates.map((item) => item.replace(/\s+/g, " ").trim()))]
    .filter((item) => item.length >= 3 && !isGenericServiceLabel(item))
    .slice(0, 8);
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
  const schemaName = pickSchemaValue(schemaObjects, ["name", "legalName"]);
  const ogSiteName = firstMatch(html, [
    /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i,
  ]);
  const h1 = firstMatch(html, [/<h1[^>]*>([\s\S]*?)<\/h1>/i]);

  const businessName = cleanBusinessName(
    schemaName || ogSiteName || title || input.fallbackBusinessName || h1 || new URL(finalUrl).hostname.replace(/^www\./, ""),
  );

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

  const services = extractServices(html);
  if (!services.length && input.fallbackMainService?.trim()) services.push(input.fallbackMainService.trim());

  const schemaImageRaw = (() => {
    for (const object of schemaObjects) {
      const image = object?.image;
      if (typeof image === "string") return image;
      if (Array.isArray(image) && typeof image[0] === "string") return image[0];
      if (image && typeof image === "object" && typeof image.url === "string") return image.url;
    }
    return "";
  })();

  const ogImage = firstMatch(html, [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  ]);
  const firstImage = /<img\b[^>]+src=["']([^"']+)["']/i.exec(html)?.[1] || "";
  const heroImage = absoluteUrl(schemaImageRaw || ogImage || firstImage, finalUrl);

  return {
    sourceUrl: finalUrl,
    businessName,
    description,
    location,
    contactEmail,
    contactPhone,
    services,
    heroImage,
    sourceTitle: title.slice(0, 220),
    aiUsed: false,
    estimatedAiCostUsd: 0,
  };
}
