import React, { useEffect, useMemo, useState } from "react";
import { ExternalLink, Eye, Loader2, Plus, Save, Send, Trash2, ChevronUp, ChevronDown, Globe2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ImageUpload } from "../ImageUpload";
import { supabase } from "../../lib/supabase";
import {
  DEFAULT_PLATFORM_CMS,
  CMS_REPLACEABLE_PATHS,
  normalizePlatformCms,
  PLATFORM_CMS_PAGES,
  type PlatformCmsPage,
  type PlatformCmsSection,
  type PlatformSiteCms,
  type PlatformSiteCmsEnvelope,
} from "../../lib/platformSiteCms";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const emptyPage = (): PlatformCmsPage => ({ sections: [] });
const emptySection = (type: PlatformCmsSection["type"] = "rich_text"): PlatformCmsSection => ({ id: crypto.randomUUID(), type, title: "", body: "", items: [] });

const siteLinks = [
  { label: "Client websites", href: "/admin/businesses", description: "Edit a client site’s pages, sections, images, SEO, theme, footer and publishing settings." },
  { label: "Case studies", href: "/admin/studio_showcases", description: "Manage case study details and each niche website preview." },
  { label: "Blog", href: "/admin/blog", description: "Write, review and publish articles." },
  { label: "Policies", href: "/admin/policies", description: "Update public policy pages." },
  { label: "Website templates", href: "/admin/templates", description: "Maintain reusable client website templates." },
  { label: "Pricing & plans", href: "/admin/plans", description: "Manage customer-facing plans and pricing." },
];

export function PlatformSiteCms() {
  const [content, setContent] = useState<PlatformSiteCms>(clone(DEFAULT_PLATFORM_CMS));
  const [envelope, setEnvelope] = useState<PlatformSiteCmsEnvelope | null>(null);
  const [selectedPath, setSelectedPath] = useState<string>("/");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [restoreRevision, setRestoreRevision] = useState("");
  const page = content.pages[selectedPath] || emptyPage();
  const selectedLabel = PLATFORM_CMS_PAGES.find((entry) => entry.path === selectedPath)?.label || selectedPath;
  const canReplacePage = CMS_REPLACEABLE_PATHS.has(selectedPath);
  const previewUrl = selectedPath === "/" ? "/" : selectedPath;
  const publishedVersion = envelope?.published ? normalizePlatformCms(envelope.published) : null;
  const isDirty = useMemo(() => JSON.stringify(content) !== JSON.stringify(envelope?.draft ? normalizePlatformCms(envelope.draft) : normalizePlatformCms(null)), [content, envelope]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Sign in again to manage site content.");
        const response = await fetch("/api/admin/platform-site-cms", { headers: { Authorization: `Bearer ${session.access_token}` } });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "The site CMS could not be loaded.");
        const nextEnvelope: PlatformSiteCmsEnvelope = payload.content || {};
        if (active) {
          setEnvelope(nextEnvelope);
          setContent(normalizePlatformCms(nextEnvelope.draft || nextEnvelope.published || DEFAULT_PLATFORM_CMS));
        }
      } catch (error: any) { if (active) toast.error(error?.message || "The site CMS could not be loaded."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const updatePage = (patch: Partial<PlatformCmsPage>) => setContent((current) => ({
    ...current,
    pages: { ...current.pages, [selectedPath]: { ...(current.pages[selectedPath] || emptyPage()), ...patch } },
  }));
  const updateHeader = (patch: Partial<PlatformSiteCms["header"]>) => setContent((current) => ({ ...current, header: { ...current.header, ...patch } }));

  const persist = async (publish: boolean) => {
    if (publish && Object.entries(content.pages).some(([path, cmsPage]) => cmsPage.replacePageContent && (!CMS_REPLACEABLE_PATHS.has(path) || !cmsPage.sections.length))) {
      toast.error("Add at least one section to every CMS-built page before publishing.");
      return;
    }
    publish ? setPublishing(true) : setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sign in again to save changes.");
      const response = await fetch(`/api/admin/platform-site-cms${publish ? "/publish" : ""}`, {
        method: publish ? "POST" : "PUT",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Site content could not be saved.");
      setEnvelope(payload.content || { ...envelope, draft: content, published: publish ? content : envelope?.published, updatedAt: new Date().toISOString(), publishedAt: publish ? new Date().toISOString() : envelope?.publishedAt });
      setContent(normalizePlatformCms(publish ? content : payload.content?.draft || content));
      setSavedAt(new Date().toLocaleTimeString());
      toast.success(publish ? "Site content published." : "Draft saved. It is not live until published.");
    } catch (error: any) { toast.error(error?.message || "Site content could not be saved."); }
    finally { setSaving(false); setPublishing(false); }
  };

  const updateSection = (index: number, patch: Partial<PlatformCmsSection>) => updatePage({ sections: page.sections.map((section, i) => i === index ? { ...section, ...patch } : section) });
  const moveSection = (index: number, delta: number) => {
    const next = [...page.sections];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updatePage({ sections: next });
  };

  return <main className="mx-auto max-w-[1500px] space-y-6 pb-14">
    <header className="flex flex-wrap items-start justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600">Website CMS</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Manage Bennie Studio</h1><p className="mt-2 text-sm leading-6 text-slate-600">Edit page SEO and messaging, create structured content sections, update the site navigation and publish when ready. Client websites, blog, policies, pricing and case studies are available from the CMS workspace below.</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500"><span className="rounded-full bg-slate-100 px-3 py-1.5">{publishedVersion ? "Live version available" : "Current site content stays live"}</span>{envelope?.publishedAt && <span className="rounded-full bg-slate-100 px-3 py-1.5">Last published {new Date(envelope.publishedAt).toLocaleString()}</span>}{savedAt && <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">Saved {savedAt}</span>}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2"><a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Eye size={15}/>View published page</a>{envelope?.revisions?.length ? <><Select value={restoreRevision} onValueChange={setRestoreRevision}><SelectTrigger className="w-[195px] bg-white"><SelectValue placeholder="Published history"/></SelectTrigger><SelectContent>{envelope.revisions.map((revision, index) => <SelectItem value={String(index)} key={`${revision.publishedAt}-${index}`}>{new Date(revision.publishedAt).toLocaleString()}</SelectItem>)}</SelectContent></Select><Button variant="outline" disabled={!restoreRevision || saving || publishing} onClick={() => { const revision = envelope.revisions?.[Number(restoreRevision)]; if (!revision) return; setContent(normalizePlatformCms(revision.content)); setRestoreRevision(""); toast.success("Previous content loaded as a draft. Publish it to make it live."); }} className="gap-2"><Save size={15}/>Restore to draft</Button></> : null}<Button variant="outline" disabled={loading || saving || publishing || !isDirty} onClick={() => persist(false)} className="gap-2"><Save size={15}/>{saving ? "Saving…" : "Save draft"}</Button><Button disabled={loading || saving || publishing} onClick={() => persist(true)} className="gap-2"><Send size={15}/>{publishing ? "Publishing…" : "Publish changes"}</Button></div>
    </header>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {siteLinks.map((link) => <a href={link.href} key={link.href} className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="font-bold text-slate-900">{link.label}</h2><ExternalLink size={15} className="text-slate-400 transition group-hover:text-indigo-600"/></div><p className="mt-2 text-sm leading-5 text-slate-600">{link.description}</p></a>)}
    </section>

    <section className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center justify-between px-3 py-2"><h2 className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Your pages</h2><Globe2 size={15} className="text-indigo-500"/></div>{PLATFORM_CMS_PAGES.map((entry) => <button key={entry.path} type="button" onClick={() => setSelectedPath(entry.path)} className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${selectedPath === entry.path ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"}`}><span>{entry.label}</span><span className="text-[10px] font-medium text-slate-400">{entry.path}</span></button>)}</aside>

      <div className="space-y-5">
        {loading ? <div className="flex min-h-40 items-center justify-center rounded-2xl border bg-white text-sm text-slate-500"><Loader2 size={18} className="mr-2 animate-spin"/>Loading content…</div> : <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black text-slate-950">{selectedLabel}</h2><p className="mt-1 text-sm text-slate-500">{selectedPath} · edit search previews, page messages and calls to action.</p></div><a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:underline">Open preview <ExternalLink size={14}/></a></div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="SEO title" value={page.seoTitle || ""} onChange={(seoTitle) => updatePage({ seoTitle })} placeholder="Leave blank to keep the current title" />
              <Field label="Canonical URL" value={page.canonicalUrl || ""} onChange={(canonicalUrl) => updatePage({ canonicalUrl })} placeholder={`https://app.bennietay.com${selectedPath}`} />
              <TextField className="md:col-span-2" label="Meta description" value={page.seoDescription || ""} onChange={(seoDescription) => updatePage({ seoDescription })} rows={2} placeholder="A clear search description for this page" />
              <div className="md:col-span-2"><ImageUpload label="Social sharing image" description="Optional. Used when this page is shared in search and social previews." value={page.ogImage || ""} onUpload={(ogImage) => updatePage({ ogImage })}/></div>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-700 md:col-span-2"><Switch checked={Boolean(page.noIndex)} aria-label="Prevent search engines from indexing this page" onCheckedChange={(noIndex) => updatePage({ noIndex })}/><span>Prevent search engines from indexing this page</span></label>
              <TextField className="md:col-span-2" label="Main heading" value={page.heroTitle || ""} onChange={(heroTitle) => updatePage({ heroTitle })} rows={2} placeholder="Leave blank to keep the current heading." />
              <TextField className="md:col-span-2" label="Introductory copy" value={page.heroDescription || ""} onChange={(heroDescription) => updatePage({ heroDescription })} rows={3} placeholder="Leave blank to keep the current introduction." />
              <Field label="Primary button label" value={page.primaryCtaLabel || ""} onChange={(primaryCtaLabel) => updatePage({ primaryCtaLabel })} placeholder="Leave blank to keep the current label" />
              <Field label="Primary button destination" value={page.primaryCtaHref || ""} onChange={(primaryCtaHref) => updatePage({ primaryCtaHref })} placeholder="/generate-preview" />
              <Field label="Closing section heading" value={page.finalCtaTitle || ""} onChange={(finalCtaTitle) => updatePage({ finalCtaTitle })} placeholder="Optional closing message" />
              <TextField label="Closing section copy" value={page.finalCtaDescription || ""} onChange={(finalCtaDescription) => updatePage({ finalCtaDescription })} rows={2} placeholder="Optional supporting copy" />
            </div>
          </section>

          {canReplacePage ? <section className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="max-w-3xl"><h2 className="font-black text-slate-950">Build this page from CMS sections</h2><p className="mt-1 text-sm leading-6 text-slate-700">When enabled and published, the current page body is replaced by the CMS heading, intro and sections below. Build the new page content first; the shared site header, footer and SEO settings stay in place.</p></div><div className="flex items-center gap-3"><span className="text-sm font-bold text-slate-700">{page.replacePageContent ? "CMS page active" : "Current page active"}</span><Switch checked={Boolean(page.replacePageContent)} aria-label="Use CMS sections as the full page content" onCheckedChange={(replacePageContent) => updatePage({ replacePageContent })}/></div></section> : null}

          {selectedPath === "/" && <><HeaderEditor content={content} onChange={updateHeader}/><FooterEditor content={content} onChange={(footer) => setContent((current) => ({ ...current, footer: { ...current.footer, ...footer } }))}/></>}

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950">Page sections</h2><p className="mt-1 text-sm text-slate-600">{page.replacePageContent ? "These sections form the entire page body, after the title and introduction above." : "Add useful content below the current page content. Choose a section type, then add copy, cards, FAQs or an image."}</p></div><Select onValueChange={(value) => updatePage({ sections: [...page.sections, emptySection(value as PlatformCmsSection["type"])] })}><SelectTrigger className="w-[205px] bg-white"><Plus size={15} className="mr-2"/><SelectValue placeholder="Add a section"/></SelectTrigger><SelectContent><SelectItem value="rich_text">Text section</SelectItem><SelectItem value="feature_grid">Feature cards</SelectItem><SelectItem value="faq">FAQs</SelectItem><SelectItem value="image_text">Image and text</SelectItem><SelectItem value="cta">Call to action</SelectItem></SelectContent></Select></div>
            {!page.sections.length && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No extra sections yet. Add a text section, feature cards, FAQs, an image section or a call to action.</div>}
            {page.sections.map((section, index) => <article key={section.id} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
              <header className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-xs font-black text-indigo-700">{String(index + 1).padStart(2, "0")}</span><div><h3 className="font-bold capitalize text-slate-900">{section.type.replace("_", " ")}</h3><p className="text-xs text-slate-500">{page.replacePageContent ? "Part of the CMS-built page body." : "This section appears after existing page content."}</p></div></div><div className="flex gap-1"><Button size="icon" variant="ghost" aria-label="Move section up" disabled={index === 0} onClick={() => moveSection(index, -1)}><ChevronUp size={16}/></Button><Button size="icon" variant="ghost" aria-label="Move section down" disabled={index === page.sections.length - 1} onClick={() => moveSection(index, 1)}><ChevronDown size={16}/></Button><Button size="icon" variant="ghost" aria-label="Delete section" onClick={() => updatePage({ sections: page.sections.filter((_, i) => i !== index) })}><Trash2 size={16} className="text-rose-600"/></Button></div></header>
              <div className="grid gap-4 md:grid-cols-2"><Field label="Section heading" value={section.title} onChange={(title) => updateSection(index, { title })} placeholder="A useful, specific heading"/><TextField className="md:col-span-2" label="Section copy" value={section.body} onChange={(body) => updateSection(index, { body })} rows={3} placeholder="Explain the section in plain language"/>{["image_text", "feature_grid"].includes(section.type) && <div className="grid gap-3 md:col-span-2 md:grid-cols-2"><ImageUpload label="Upload section image" description="Upload JPG, PNG or WebP artwork, or paste an image URL below." value={section.imageUrl || ""} onUpload={(imageUrl) => updateSection(index, { imageUrl })}/><Field label="Or paste an image URL" value={section.imageUrl || ""} onChange={(imageUrl) => updateSection(index, { imageUrl })} placeholder="https://…"/></div>}{section.type === "cta" && <><Field label="Button label" value={section.ctaLabel || ""} onChange={(ctaLabel) => updateSection(index, { ctaLabel })}/><Field label="Button destination" value={section.ctaHref || ""} onChange={(ctaHref) => updateSection(index, { ctaHref })}/></>}</div>
              {["feature_grid", "faq"].includes(section.type) && <div className="space-y-3 rounded-lg bg-slate-50 p-3"><div className="flex items-center justify-between"><h4 className="text-sm font-bold text-slate-800">{section.type === "faq" ? "Questions and answers" : "Cards"}</h4><Button variant="outline" size="sm" onClick={() => updateSection(index, { items: [...section.items, { title: "", body: "" }] })}><Plus size={14} className="mr-1"/>Add item</Button></div>{section.items.map((item, itemIndex) => <div key={`${section.id}-${itemIndex}`} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[1fr_2fr_auto]"><Field label={section.type === "faq" ? "Question" : "Card title"} value={item.title} onChange={(title) => updateSection(index, { items: section.items.map((current, i) => i === itemIndex ? { ...current, title } : current) })}/><TextField label={section.type === "faq" ? "Answer" : "Card copy"} value={item.body} onChange={(body) => updateSection(index, { items: section.items.map((current, i) => i === itemIndex ? { ...current, body } : current) })} rows={2}/>{section.type === "feature_grid" && <Field label="Card image URL" value={item.imageUrl || ""} onChange={(imageUrl) => updateSection(index, { items: section.items.map((current, i) => i === itemIndex ? { ...current, imageUrl } : current) })} placeholder="https://…"/>}<Button className="self-end" size="icon" variant="ghost" aria-label="Remove item" onClick={() => updateSection(index, { items: section.items.filter((_, i) => i !== itemIndex) })}><Trash2 size={15} className="text-rose-600"/></Button></div>)}</div>}
            </article>)}
          </section>
        </>}
      </div>
    </section>
    <section className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950"><strong>Client sites:</strong> open a client website from the card above or the Businesses workspace. The existing client editor includes page/section management, images, SEO, responsive preview, themes, tracking, footer details and publication controls; this CMS now puts it in the same content workspace as the Bennie Studio site.</section>
  </main>;
}

function HeaderEditor({ content, onChange }: { content: PlatformSiteCms; onChange: (value: Partial<PlatformSiteCms["header"]>) => void }) {
  const updateItem = (index: number, key: "label" | "href", value: string) => onChange({ navigation: content.header.navigation.map((item, i) => i === index ? { ...item, [key]: value } : item) });
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><h2 className="text-lg font-black text-slate-950">Site navigation and primary CTA</h2><p className="mt-1 text-sm text-slate-600">Edit the global navigation shown across public pages.</p></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Header button label" value={content.header.primaryCtaLabel} onChange={(primaryCtaLabel) => onChange({ primaryCtaLabel })}/><Field label="Header button destination" value={content.header.primaryCtaHref} onChange={(primaryCtaHref) => onChange({ primaryCtaHref })}/></div><div className="space-y-3">{content.header.navigation.map((item, index) => <div key={`${index}-${item.href}`} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><Field label={`Link ${index + 1} label`} value={item.label} onChange={(value) => updateItem(index, "label", value)}/><Field label="Destination" value={item.href} onChange={(value) => updateItem(index, "href", value)}/><Button className="self-end" size="icon" variant="ghost" aria-label="Remove navigation link" onClick={() => onChange({ navigation: content.header.navigation.filter((_, i) => i !== index) })}><Trash2 size={15} className="text-rose-600"/></Button></div>)}</div><Button variant="outline" size="sm" onClick={() => onChange({ navigation: [...content.header.navigation, { label: "New page", href: "/" }] })}><Plus size={14} className="mr-1"/>Add navigation link</Button></section>;
}

function FooterEditor({ content, onChange }: { content: PlatformSiteCms; onChange: (value: Partial<PlatformSiteCms["footer"]>) => void }) {
  const groups = content.footer.groups;
  const updateGroup = (groupIndex: number, patch: Partial<PlatformSiteCms["footer"]["groups"][number]>) => onChange({ groups: groups.map((group, index) => index === groupIndex ? { ...group, ...patch } : group) });
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><h2 className="text-lg font-black text-slate-950">Site footer</h2><p className="mt-1 text-sm text-slate-600">Edit the shared footer copy, link groups and copyright line.</p></div><div className="grid gap-4 sm:grid-cols-2"><TextField label="Footer description" value={content.footer.tagline} onChange={(tagline) => onChange({ tagline })} rows={2} placeholder="Leave blank to keep the page-specific footer description"/><Field label="Copyright line" value={content.footer.copyrightText} onChange={(copyrightText) => onChange({ copyrightText })} placeholder="Leave blank for the current default"/></div><div className="space-y-4">{groups.map((group, groupIndex) => <div key={`${groupIndex}-${group.title}`} className="space-y-3 rounded-xl border border-slate-200 p-4"><div className="grid gap-3 sm:grid-cols-[1fr_auto]"><Field label="Link group name" value={group.title} onChange={(title) => updateGroup(groupIndex, { title })}/><Button className="self-end" variant="ghost" size="icon" aria-label="Remove footer group" onClick={() => onChange({ groups: groups.filter((_, index) => index !== groupIndex) })}><Trash2 size={15} className="text-rose-600"/></Button></div>{group.links.map((link, linkIndex) => <div key={`${linkIndex}-${link.href}`} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><Field label="Link label" value={link.label} onChange={(label) => updateGroup(groupIndex, { links: group.links.map((current, index) => index === linkIndex ? { ...current, label } : current) })}/><Field label="Destination" value={link.href} onChange={(href) => updateGroup(groupIndex, { links: group.links.map((current, index) => index === linkIndex ? { ...current, href, external: /^https?:\/\//i.test(href) } : current) })} placeholder="/contact or https://…"/><Button className="self-end" variant="ghost" size="icon" aria-label="Remove footer link" onClick={() => updateGroup(groupIndex, { links: group.links.filter((_, index) => index !== linkIndex) })}><Trash2 size={15} className="text-rose-600"/></Button></div>)}<Button size="sm" variant="outline" onClick={() => updateGroup(groupIndex, { links: [...group.links, { label: "New link", href: "/" }] })}><Plus size={14} className="mr-1"/>Add footer link</Button></div>)}</div><Button size="sm" variant="outline" onClick={() => onChange({ groups: [...groups, { title: "New group", links: [] }] })}><Plus size={14} className="mr-1"/>Add footer group</Button></section>;
}

function Field({ label, value, onChange, placeholder, className = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; className?: string }) {
  return <div className={`grid gap-1.5 ${className}`}><Label className="text-xs font-bold text-slate-600">{label}</Label><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="bg-white"/></div>;
}
function TextField({ label, value, onChange, placeholder, rows = 3, className = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number; className?: string }) {
  return <div className={`grid gap-1.5 ${className}`}><Label className="text-xs font-bold text-slate-600">{label}</Label><Textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} className="resize-y bg-white"/></div>;
}
