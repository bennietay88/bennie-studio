import type { Website } from "../types";

export type DesignQaCheck = { key: string; label: string; pass: boolean; severity: "high" | "medium" | "low"; note: string };

export function assessWebsiteDesign(website: Website): { score: number; productionReady: boolean; checks: DesignQaCheck[] } {
  const pages = website.pages || [];
  const sections = pages.flatMap((page) => page.sections || []).filter((section) => section.isVisible !== false);
  const text = JSON.stringify(sections).toLowerCase();
  const hasHero = sections.some((section) => section.type === "hero");
  const hasCta = sections.some((section) => section.type === "cta" || section.type === "contact" || section.type === "appointment");
  const hasProof = sections.some((section) => ["proof", "testimonials"].includes(section.type));
  const hasImagery = /image|imageurl|gallery|media/.test(text);
  const hasAltText = !sections.some((section) => Array.isArray(section.content?.images) && section.content.images.some((image: any) => image?.url && !image?.alt));
  const duplicateTypes = sections.length > 5 && new Set(sections.map((section) => section.type)).size < Math.ceil(sections.length / 2);
  const aiFingerprint = /transform your|elevate your|unlock the power|trusted partner|tailored solutions|bringing your vision|take your business to the next level/i.test(text);
  const hasHeadline = sections.some((section) => typeof section.content?.headline === "string" && section.content.headline.trim().length >= 12);
  const hasPlaceholder = /lorem ipsum|your business name|replace this|sample text|coming soon|example\.com/i.test(text);
  const hasSeo = Boolean(website.seo?.title?.trim() && website.seo?.description?.trim());
  const hasNavigation = pages.length >= 1 && pages.every((page) => Boolean(page.title?.trim() && page.slug !== undefined));
  const checks: DesignQaCheck[] = [
    { key: "hero", label: "Clear hero", pass: hasHero, severity: "high", note: hasHero ? "Hero section is present." : "Add a clear primary hero." },
    { key: "headline", label: "Readable headline", pass: hasHeadline, severity: "high", note: hasHeadline ? "A meaningful headline is present." : "Add a specific, customer-facing headline." },
    { key: "cta", label: "Conversion path", pass: hasCta, severity: "high", note: hasCta ? "A conversion section is present." : "Add contact, booking, or CTA path." },
    { key: "proof", label: "Proof", pass: hasProof, severity: "medium", note: hasProof ? "Trust/proof section is present." : "Add verified proof or remove unsupported claims." },
    { key: "imagery", label: "Intentional imagery", pass: hasImagery, severity: "medium", note: hasImagery ? "Media is used in the page content." : "Use real business imagery where available." },
    { key: "alt", label: "Image accessibility", pass: hasAltText, severity: "high", note: hasAltText ? "Known image records include alt text." : "Add alt text to every published image." },
    { key: "rhythm", label: "Section rhythm", pass: !duplicateTypes, severity: "medium", note: duplicateTypes ? "Many sections repeat the same type; vary composition intentionally." : "Section types have reasonable variation." },
    { key: "anti_ai_copy", label: "Natural copy", pass: !aiFingerprint, severity: "medium", note: aiFingerprint ? "Copy contains a common AI/agency cliché; review it before launch." : "No common AI copy fingerprint detected." },
    { key: "placeholders", label: "No placeholders", pass: !hasPlaceholder, severity: "high", note: hasPlaceholder ? "Replace placeholder or sample copy before publishing." : "No obvious placeholder copy detected." },
    { key: "seo", label: "Search metadata", pass: hasSeo, severity: "medium", note: hasSeo ? "Title and description are configured." : "Add a page title and meta description." },
    { key: "navigation", label: "Page structure", pass: hasNavigation, severity: "medium", note: hasNavigation ? "Pages have usable titles and slugs." : "Give each published page a stable title and slug." },
  ];
  const score = Math.round((checks.filter((check) => check.pass).length / checks.length) * 100);
  return { score, productionReady: score >= 80 && !checks.some((check) => check.severity === "high" && !check.pass), checks };
}
