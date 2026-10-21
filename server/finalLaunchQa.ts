export type LaunchResourceKind = "link" | "image" | "email" | "phone" | "whatsapp";

export type LaunchResourceCheck = {
  url: string;
  path: string;
  kind: LaunchResourceKind;
  pass: boolean;
  status?: number | null;
  contentType?: string | null;
  finalUrl?: string | null;
  note?: string | null;
};

export type LaunchFetchResult = {
  status: number;
  contentType?: string | null;
  finalUrl?: string | null;
};

type LaunchCrawlerInput = {
  pages: any[];
  theme?: Record<string, any> | null;
  seo?: Record<string, any> | null;
  maxResources?: number;
  fetchResource: (url: string, method: "HEAD" | "GET") => Promise<LaunchFetchResult>;
};

type NavigationIssue = {
  path: string;
  actionType: string;
  target: string;
  note: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePageSlug(value: unknown, fallback = "home") {
  const slug = String(value || "").trim().replace(/^\/+|\/+$/g, "").toLowerCase();
  return slug || fallback;
}

function classifyResource(path: string, raw: string): LaunchResourceKind {
  const lowerPath = path.toLowerCase();
  if (raw.toLowerCase().startsWith("mailto:")) return "email";
  if (raw.toLowerCase().startsWith("tel:")) return "phone";
  if (/^https?:\/\/(?:www\.)?wa\.me\//i.test(raw) || /whatsapp/i.test(lowerPath)) return "whatsapp";
  if (/(?:image|logo|favicon|photo|thumbnail|ogimage|background)/i.test(lowerPath)) return "image";
  return "link";
}

function collectResources(
  value: unknown,
  path: string,
  output: Array<{ url: string; path: string; kind: LaunchResourceKind }>,
) {
  if (typeof value === "string") {
    const raw = value.trim();
    if (/^(https?:\/\/|mailto:|tel:)/i.test(raw)) {
      output.push({ url: raw, path, kind: classifyResource(path, raw) });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectResources(item, `${path}[${index}]`, output));
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) =>
      collectResources(item, path ? `${path}.${key}` : key, output),
    );
  }
}

function checkPages(pages: any[]) {
  const seen = new Set<string>();
  return pages.map((page, index) => {
    const slug = normalizePageSlug(page?.slug, index === 0 ? "home" : `page-${index + 1}`);
    const duplicateSlug = seen.has(slug);
    seen.add(slug);
    const visibleSections = Array.isArray(page?.sections)
      ? page.sections.filter((section: any) => section?.isVisible !== false)
      : [];
    const title = String(page?.title || "").trim();
    const issues = [
      !title ? "missing page title" : "",
      duplicateSlug ? "duplicate page slug" : "",
      visibleSections.length === 0 ? "no visible sections" : "",
    ].filter(Boolean);
    return {
      index,
      slug,
      title,
      visibleSections: visibleSections.length,
      pass: issues.length === 0,
      issues,
    };
  });
}

function checkNavigationTargets(pages: any[]): NavigationIssue[] {
  const pageSlugs = new Set(
    pages.map((page, index) => normalizePageSlug(page?.slug, index === 0 ? "home" : `page-${index + 1}`)),
  );
  const visibleSectionIds = new Set<string>();
  pages.forEach((page) => {
    (Array.isArray(page?.sections) ? page.sections : [])
      .filter((section: any) => section?.isVisible !== false)
      .forEach((section: any) => {
        const id = String(section?.id || "").trim().replace(/^#/, "").toLowerCase();
        if (id) visibleSectionIds.add(id);
        const type = String(section?.type || "").trim().toLowerCase();
        if (type) visibleSectionIds.add(type);
      });
  });

  const issues: NavigationIssue[] = [];
  const walk = (value: unknown, path: string) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`));
      return;
    }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    const actionType = String(record.actionType || "").trim().toLowerCase();
    const target = String(record.target || "").trim();

    if (actionType === "internal_page") {
      const slug = normalizePageSlug(target, "home");
      if (!pageSlugs.has(slug)) {
        issues.push({
          path,
          actionType,
          target,
          note: `Internal page target "${target || "home"}" does not exist.`,
        });
      }
    }

    if (actionType === "section_anchor") {
      const anchor = target.replace(/^#/, "").trim().toLowerCase();
      if (!anchor || !visibleSectionIds.has(anchor)) {
        issues.push({
          path,
          actionType,
          target,
          note: `Section target "${target || "(empty)"}" does not exist.`,
        });
      }
    }

    Object.entries(record).forEach(([key, item]) => walk(item, path ? `${path}.${key}` : key));
  };

  walk(pages, "pages");
  return issues;
}

async function validateResource(
  resource: { url: string; path: string; kind: LaunchResourceKind },
  fetchResource: LaunchCrawlerInput["fetchResource"],
): Promise<LaunchResourceCheck> {
  const { url, path, kind } = resource;

  if (kind === "email") {
    const email = url.replace(/^mailto:/i, "").split("?")[0];
    const pass = EMAIL_RE.test(email);
    return { url, path, kind, pass, note: pass ? null : "Invalid email target" };
  }

  if (kind === "phone") {
    const digits = url.replace(/^tel:/i, "").replace(/\D/g, "");
    const pass = digits.length >= 7 && digits.length <= 15;
    return { url, path, kind, pass, note: pass ? null : "Invalid phone target" };
  }

  if (kind === "whatsapp") {
    try {
      const parsed = new URL(url);
      if (/wa\.me$/i.test(parsed.hostname.replace(/^www\./, ""))) {
        const digits = parsed.pathname.replace(/\D/g, "");
        const pass = digits.length >= 7 && digits.length <= 15;
        return { url, path, kind, pass, note: pass ? null : "Invalid WhatsApp number" };
      }
    } catch {
      return { url, path, kind, pass: false, note: "Invalid WhatsApp URL" };
    }
  }

  try {
    let result = await fetchResource(url, "HEAD");
    if ([403, 405].includes(result.status)) {
      result = await fetchResource(url, "GET");
    }
    const status = Number(result.status || 0);
    const uncertain = [401, 403, 429].includes(status);
    const definiteFailure = status === 404 || status === 410 || status >= 500 || status < 200;
    const wrongImageType =
      kind === "image" &&
      status >= 200 &&
      status < 400 &&
      Boolean(result.contentType) &&
      !String(result.contentType).toLowerCase().startsWith("image/");

    return {
      url,
      path,
      kind,
      pass: !definiteFailure && !wrongImageType,
      status,
      contentType: result.contentType || null,
      finalUrl: result.finalUrl || null,
      note: uncertain
        ? "Remote service blocked automated verification; review manually."
        : definiteFailure
          ? `HTTP ${status || "failure"}`
          : wrongImageType
            ? "Image URL did not return an image content type"
            : null,
    };
  } catch (error: any) {
    return {
      url,
      path,
      kind,
      pass: false,
      status: null,
      note: error?.message || "Resource could not be reached",
    };
  }
}

export async function runFinalLaunchCrawler(input: LaunchCrawlerInput) {
  const pages = Array.isArray(input.pages) ? input.pages : [];
  const pagesChecked = checkPages(pages);
  const navigationIssues = checkNavigationTargets(pages);
  const discovered: Array<{ url: string; path: string; kind: LaunchResourceKind }> = [];

  collectResources(pages, "pages", discovered);
  collectResources(input.theme || {}, "theme", discovered);
  collectResources(input.seo || {}, "seo", discovered);

  const unique = new Map<string, { url: string; path: string; kind: LaunchResourceKind }>();
  for (const resource of discovered) {
    const key = `${resource.kind}:${resource.url}`;
    if (!unique.has(key)) unique.set(key, resource);
  }

  const maxResources = Math.max(1, Math.min(120, Number(input.maxResources || 60)));
  const allResources = [...unique.values()];
  const selected = allResources.slice(0, maxResources);
  const truncated = allResources.length > selected.length;
  const resources = await Promise.all(
    selected.map((resource) => validateResource(resource, input.fetchResource)),
  );

  const brokenResources = resources.filter((resource) => !resource.pass);
  const uncertainResources = resources.filter(
    (resource) => resource.pass && [401, 403, 429].includes(Number(resource.status || 0)),
  );
  const brokenImages = brokenResources.filter((resource) => resource.kind === "image");
  const brokenLinks = brokenResources.filter((resource) => resource.kind !== "image");
  const pass =
    pages.length > 0 &&
    pagesChecked.every((page) => page.pass) &&
    navigationIssues.length === 0 &&
    brokenResources.length === 0 &&
    uncertainResources.length === 0 &&
    !truncated;

  return {
    pass,
    checkedAt: new Date().toISOString(),
    pageCount: pages.length,
    pages: pagesChecked,
    navigationIssues,
    resourceCount: resources.length,
    discoveredResourceCount: allResources.length,
    truncated,
    resourceLimit: maxResources,
    resources,
    brokenResources,
    brokenLinks,
    brokenImages,
    uncertainResources,
  };
}
