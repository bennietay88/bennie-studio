#!/usr/bin/env node
/**
 * Monthly design research intake. Collects editorial reference titles only.
 * This script never writes site themes, publishes designs or changes customer data.
 */
import { writeFile } from "node:fs/promises";

export const SOURCES = [
  { name: "web.dev", url: "https://web.dev/feed.xml" },
  { name: "Smashing Magazine", url: "https://www.smashingmagazine.com/feed/" },
  { name: "CSS-Tricks", url: "https://css-tricks.com/feed/" },
];
const strip = (value) => value
  .replace(/<!\[CDATA\[|\]\]>/g, "")
  .replace(/<[^>]*>/g, " ")
  .replace(/&(amp|lt|gt|quot|apos);/g, (_, entity) =>
    ({ amp:"&", lt:"<", gt:">", quot:'"', apos:"'" })[entity])
  .replace(/\s+/g, " ").trim().slice(0, 180);
export function parseFeed(xml, maximum = 5) {
  if (typeof xml !== "string" || xml.length > 5_000_000) throw new Error("Invalid or oversized feed.");
  const entries = [...xml.matchAll(/<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi)];
  return entries.slice(0, maximum).map(([, entry]) => {
    const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(entry)?.[1] || "";
    const link = /<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i.exec(entry)?.[1]
      || /<link\b[^>]*>([\s\S]*?)<\/link>/i.exec(entry)?.[1] || "";
    const published = /<(?:pubDate|published|updated)\b[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated)>/i.exec(entry)?.[1] || "";
    let safeLink = "";
    try { const parsed = new URL(link.trim()); if (parsed.protocol === "https:") safeLink = parsed.href; } catch {}
    return { title: strip(title), url: safeLink, published: strip(published) };
  }).filter(item => item.title && item.url);
}
export async function collectReferences(fetchImpl = fetch) {
  return Promise.all(SOURCES.map(async source => {
    try {
      const response = await fetchImpl(source.url, {
        headers: { "User-Agent": "BennieStudio-DesignResearch/1.0" },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xml = await response.text();
      return { source: source.name, url: source.url, items: parseFeed(xml) };
    } catch (error) {
      return { source: source.name, url: source.url, items: [], error: String(error instanceof Error ? error.message : error).slice(0,120) };
    }
  }));
}
export function markdownReport(results, now = new Date()) {
  const period = now.toISOString().slice(0,7);
  const header = [
    `# Bennie Studio design research — ${period}`,
    "",
    "Candidate references only. Editorial sources are not design approval or permission to copy artwork.",
    "Staff must confirm accuracy, rights, industry fit, accessibility, mobile behavior, performance and conversions.",
    "Do not modify existing client websites or publish new packs automatically.",
    "",
    "## Review checklist",
    "- [ ] Identify 1–3 relevant composition patterns, not entire site clones",
    "- [ ] Record target industries and expected user benefit",
    "- [ ] Verify typography scale, contrast, responsive behavior and reduced motion",
    "- [ ] Verify genuine client assets and permissions",
    "- [ ] Implement only approved variants in the shared renderer",
    "- [ ] Version a candidate pack, pass CI and visual regression",
    "- [ ] Obtain human approval before release",
    "",
    "## Reference intake",
  ];
  for (const result of results) {
    header.push("", `### ${result.source}`, `Source: ${result.url}`);
    if (result.error) header.push(`Fetch unavailable: ${result.error}`);
    if (!result.items.length && !result.error) header.push("No relevant articles returned.");
    for (const item of result.items) {
      header.push(`- [${item.title.replace(/[\[\]]/g,"")}](${item.url})${item.published ? ` — ${item.published}` : ""}`);
    }
  }
  return header.join("\n")+"\n";
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const results = await collectReferences();
  const content = markdownReport(results);
  const destination = process.env.DESIGN_RESEARCH_REPORT || "/tmp/bennie-design-trends.md";
  await writeFile(destination, content, "utf8");
  console.log(`Design intake recorded from ${results.length} sources to ${destination}`);
}
