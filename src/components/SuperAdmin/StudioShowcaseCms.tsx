import React, { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Save, RotateCcw, Plus, Copy, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { supabase } from "../../lib/supabase";
import { STUDIO_SHOWCASES } from "../StudioCaseStudyDetail";
import { DEMOS, NICHE_PAGE_CONTENT } from "../StudioShowcaseLivePreview";
import { mergeCmsValue, type StudioShowcaseCms } from "../../lib/studioShowcaseCms";
import { DEFAULT_PORTFOLIO_ITEMS, resolvePortfolioCatalog, type PortfolioItem } from "../../lib/portfolioCatalog";
import { PortfolioImageUpload } from "./PortfolioImageUpload";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function defaults(): StudioShowcaseCms {
  return Object.fromEntries(STUDIO_SHOWCASES.map((study) => {
    const { colour, ...editableStudy } = study;
    return [study.slug, {
      study: editableStudy,
      preview: { content: DEMOS[study.slug], pages: NICHE_PAGE_CONTENT[study.slug] },
      theme: { accent: colour, headingOnDark: "#ffffff", bodyOnDark: "#cbd5e1" },
    }];
  })) as StudioShowcaseCms;
}

function labelFor(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function JsonEditor({ value, label, onChange, depth = 0 }: { value: JsonValue; label: string; onChange: (next: JsonValue) => void; depth?: number }) {
  if (Array.isArray(value)) {
    return <fieldset className={`space-y-3 rounded-xl border border-slate-200 p-4 ${depth ? "bg-white" : "bg-slate-50"}`}>
      <legend className="px-1 text-sm font-bold text-slate-800">{label} <span className="font-normal text-slate-400">({value.length})</span></legend>
      {value.map((entry, index) => <div key={index} className="rounded-lg border border-slate-100 bg-white p-3">
        <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wide text-slate-500">Item {index + 1}</span><button type="button" className="text-xs font-semibold text-rose-600 hover:underline" onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))}>Remove</button></div>
        <JsonEditor label={typeof entry === "object" && entry !== null && !Array.isArray(entry) ? "Content" : "Value"} value={entry as JsonValue} depth={depth + 1} onChange={(next) => onChange(value.map((item, itemIndex) => itemIndex === index ? next : item))} />
      </div>)}
      <button type="button" className="text-sm font-semibold text-indigo-700 hover:underline" onClick={() => onChange([...value, value.length ? (typeof value[0] === "object" && value[0] !== null ? JSON.parse(JSON.stringify(value[0])) : typeof value[0] === "number" ? 0 : "") : ""]) }>+ Add item</button>
    </fieldset>;
  }
  if (value !== null && typeof value === "object") {
    return <fieldset className={`space-y-3 rounded-xl border border-slate-200 p-4 ${depth ? "bg-white" : "bg-slate-50"}`}>
      <legend className="px-1 text-sm font-bold text-slate-800">{label}</legend>
      {Object.entries(value).map(([key, entry]) => <JsonEditor key={key} label={labelFor(key)} value={entry} depth={depth + 1} onChange={(next) => onChange({ ...value, [key]: next })} />)}
    </fieldset>;
  }
  const stringValue = value === null ? "" : String(value);
  const isColor = /^#[0-9a-f]{6}$/i.test(stringValue) && /accent|colour|color/i.test(label);
  return <div className="grid gap-1.5">
    <Label className="text-xs font-semibold text-slate-600">{label}</Label>
    {isColor ? <div className="flex items-center gap-3"><input type="color" value={stringValue} onChange={(event) => onChange(event.target.value)} className="h-10 w-14 cursor-pointer rounded border border-slate-200 bg-white p-1"/><Input value={stringValue} onChange={(event) => onChange(event.target.value)} className="max-w-44 font-mono" /></div>
      : stringValue.length > 110 || stringValue.includes("\n") ? <Textarea value={stringValue} onChange={(event) => onChange(event.target.value)} rows={Math.min(6, Math.max(3, Math.ceil(stringValue.length / 100)))} className="min-h-20 resize-y bg-white" />
        : typeof value === "number" ? <Input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} className="bg-white" />
          : <Input value={stringValue} onChange={(event) => onChange(event.target.value)} className="bg-white" />}
  </div>;
}

export function StudioShowcaseCms() {
  const [showcases, setShowcases] = useState<StudioShowcaseCms>(defaults);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(DEFAULT_PORTFOLIO_ITEMS);
  const [portfolioSlug, setPortfolioSlug] = useState(DEFAULT_PORTFOLIO_ITEMS[0].slug);
  const [view, setView] = useState<"portfolio" | "previews">("portfolio");
  const [newTitle, setNewTitle] = useState("");
  const [selectedSlug, setSelectedSlug] = useState(STUDIO_SHOWCASES[0]?.slug || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const original = useMemo(() => defaults(), []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Sign in again to edit studio showcases.");
        const response = await fetch("/api/admin/studio-showcases", { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (!response.ok) throw new Error("The showcase CMS could not be loaded.");
        const payload = await response.json();
        if (active && payload?.showcases) setShowcases(mergeCmsValue(defaults(), payload.showcases));
        if (active && Array.isArray(payload?.portfolio)) setPortfolio(resolvePortfolioCatalog(payload.portfolio));
      } catch (error: any) {
        if (active) toast.error(error?.message || "The showcase CMS could not be loaded.");
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sign in again to save changes.");
      const response = await fetch("/api/admin/studio-showcases", {
        method: "PUT",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ showcases, portfolio: portfolio.map((item) => ({ ...item, sections: item.sections.map((section) => section.trim()).filter(Boolean) })) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "The showcase changes could not be saved.");
      setSavedAt(new Date().toLocaleTimeString());
      toast.success("Studio content saved. Only published portfolio entries appear publicly.");
    } catch (error: any) { toast.error(error?.message || "The showcase changes could not be saved."); }
    finally { setSaving(false); }
  };

  const selectedPortfolio = portfolio.find((item) => item.slug === portfolioSlug);
  const updatePortfolio = (field: keyof PortfolioItem, value: string | number | boolean | string[]) =>
    setPortfolio((previous) => previous.map((item) => item.slug === portfolioSlug ? { ...item, [field]: value } as PortfolioItem : item));
  const addPortfolio = () => {
    const title = newTitle.trim().slice(0, 100);
    if (!title) return toast.error("Enter a title for the new concept.");
    const baseSlug = title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 65);
    if (!baseSlug) return toast.error("Enter an alphanumeric title.");
    let slug = baseSlug;
    let suffix = 2;
    while (portfolio.some((item) => item.slug === slug)) slug = baseSlug + "-" + suffix++;
    const item: PortfolioItem = {
      slug, title, category: "Other services", style: "Modern minimal", headline: "", goal: "Customer enquiry",
      challenge: "", approach: "", industry: "local-service", sections: [], livePreviewSlug: "",
      published: false, featured: false, order: portfolio.length + 1,
      coverImage: "", desktopImage: "", mobileImage: "", imageAlt: "",
    };
    setPortfolio((previous) => [...previous, item]);
    setPortfolioSlug(slug);
    setNewTitle("");
  };
  const duplicatePortfolio = () => {
    if (!selectedPortfolio) return;
    const suffix = Date.now().toString(36);
    const duplicate = { ...selectedPortfolio, slug: selectedPortfolio.slug.slice(0, 55) + "-variation-" + suffix, title: selectedPortfolio.title + " variation", published: false, featured: false, livePreviewSlug: "", order: portfolio.length + 1 };
    setPortfolio((previous) => [...previous, duplicate]);
    setPortfolioSlug(duplicate.slug);
  };
  const removePortfolio = () => {
    if (!selectedPortfolio || !window.confirm("Remove this concept from the portfolio CMS? Save changes to apply.")) return;
    setPortfolio((previous) => previous.filter((item) => item.slug !== selectedPortfolio.slug));
    setPortfolioSlug(portfolio.find((item) => item.slug !== selectedPortfolio.slug)?.slug || "");
  };
  const current = showcases[selectedSlug];
  const updateCurrent = (next: JsonValue) => setShowcases((previous) => ({ ...previous, [selectedSlug]: next as any }));

  return <div className="mx-auto max-w-7xl space-y-6 pb-12">
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600">Content & CMS</p><h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Studio showcase CMS</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Upload and manage portfolio screenshots, draft new concepts, publish individual designs, or edit the existing six interactive demos.</p></div>
      <div className="flex flex-wrap gap-2"><a href={view === "portfolio" ? "/case-studies" : `/case-studies/showcase/${selectedSlug}/preview`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Open preview <ExternalLink size={15}/></a><Button onClick={save} disabled={loading || saving} className="gap-2">{saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Save changes</Button></div>
    </header>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant={view === "portfolio" ? "default" : "outline"} onClick={() => setView("portfolio")}>Portfolio manager ({portfolio.length})</Button>
      <Button type="button" variant={view === "previews" ? "default" : "outline"} onClick={() => setView("previews")}>Six interactive demos</Button>
    </div>
    {view === "portfolio" ? <section className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <aside className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Portfolio entries</p>
        <div className="flex gap-2"><Input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addPortfolio(); }} placeholder="New concept title" aria-label="New concept title"/><Button type="button" size="icon" onClick={addPortfolio} aria-label="Add portfolio concept"><Plus size={16}/></Button></div>
        <div className="max-h-[70vh] space-y-1 overflow-auto">
          {portfolio.map((item) => <button key={item.slug} type="button" onClick={() => setPortfolioSlug(item.slug)}
            className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${portfolioSlug === item.slug ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50"}`}>
            <span className="block font-semibold">{item.title}</span>
            <span className="mt-1 block text-[11px] text-slate-500">{item.published ? "Published" : "Draft"} · {item.coverImage || item.desktopImage ? "Screenshot ready" : "Image pending"}</span>
          </button>)}
        </div>
      </aside>
      {!selectedPortfolio ? <div className="rounded-xl border bg-white p-6">Select a portfolio entry.</div> :
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-4">
          <div><h2 className="text-lg font-bold">{selectedPortfolio.title}</h2><p className="text-xs text-slate-500">/case-studies/showcase/{selectedPortfolio.slug} · illustrative concept</p></div>
          <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={duplicatePortfolio} disabled={portfolio.length >= 60}><Copy size={14}/> Duplicate</Button><Button type="button" variant="outline" size="sm" onClick={removePortfolio}><Trash2 size={14}/> Remove</Button></div>
        </div>
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          {([["title","Title"],["category","Industry category"],["style","Visual direction"],["goal","Primary customer action"],["headline","Design headline"],["industry","Industry code"],["imageAlt","Image alternative text"]] as const).map(([field,label]) =>
            <div key={field} className="space-y-2"><Label>{label}</Label><Input value={String(selectedPortfolio[field] || "")} onChange={(event) => updatePortfolio(field,event.target.value)} maxLength={field === "headline" ? 180 : 100}/></div>)}
          <div className="space-y-2"><Label>Display order</Label><Input type="number" min="0" max="10000" value={selectedPortfolio.order} onChange={(event) => updatePortfolio("order", Number(event.target.value))}/></div>
          <div className="space-y-3 rounded-lg bg-slate-50 p-3">
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={selectedPortfolio.published} disabled={!selectedPortfolio.coverImage && !selectedPortfolio.desktopImage && selectedPortfolio.livePreviewSlug !== selectedPortfolio.slug} onChange={(event) => updatePortfolio("published",event.target.checked)}/> Published</label>
            <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={selectedPortfolio.featured} onChange={(event) => updatePortfolio("featured",event.target.checked)}/> Featured</label>
          </div>
          <div className="space-y-2 sm:col-span-2"><Label>Business challenge</Label><Textarea value={selectedPortfolio.challenge} onChange={(event) => updatePortfolio("challenge",event.target.value)} rows={3}/></div>
          <div className="space-y-2 sm:col-span-2"><Label>Design approach</Label><Textarea value={selectedPortfolio.approach} onChange={(event) => updatePortfolio("approach",event.target.value)} rows={3}/></div>
          <div className="space-y-2 sm:col-span-2"><Label>Website sections (separate with |)</Label><Input value={(selectedPortfolio.sections || []).join(" | ")} onChange={(event) => updatePortfolio("sections",event.target.value.split("|").map((v) => v.trim()))}/></div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center gap-2"><ImageIcon size={17}/><h3 className="font-bold">Screenshots</h3></div>
          <p className="mb-5 text-xs leading-5 text-slate-500">Upload separately, then save. WebP/AVIF recommended. Each image up to 5 MB. Drafts are hidden until published.</p>
          <div className="grid gap-5 md:grid-cols-3">
            {(["coverImage","desktopImage","mobileImage"] as const).map((slot) =>
              <PortfolioImageUpload key={selectedPortfolio.slug + slot} item={selectedPortfolio} slot={slot} onChange={(url) => updatePortfolio(slot,url)}/>)}
          </div>
          {!selectedPortfolio.coverImage && !selectedPortfolio.desktopImage && !selectedPortfolio.livePreviewSlug &&
            <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">Upload at least one image before publishing this concept.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-4">{selectedPortfolio.published ? <a href={`/case-studies/showcase/${selectedPortfolio.slug}`} target="_blank" rel="noreferrer" className="text-sm font-semibold text-indigo-700 underline">Open design study ↗</a> : <span className="text-sm text-slate-500">Publish this draft to make its case study public.</span>}<Button onClick={save} disabled={saving || loading}>{saving ? "Saving…" : "Save portfolio changes"}</Button></div>
      </div>}
    </section> : <section className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">Choose a niche</p>{STUDIO_SHOWCASES.map((study) => <button type="button" key={study.slug} onClick={() => setSelectedSlug(study.slug)} className={`mb-1 block w-full rounded-lg px-3 py-3 text-left text-sm font-semibold transition ${selectedSlug === study.slug ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"}`}>{study.title}<span className="mt-1 block text-xs font-normal text-slate-500">{study.category}</span></button>)}</aside>
      <div className="space-y-4">
        {loading || !current ? <div className="flex min-h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500"><Loader2 size={18} className="mr-2 animate-spin"/>Loading CMS content…</div> : <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"><div><p className="font-bold text-slate-900">Editing {String((current as any).study?.title || selectedSlug)}</p><p className="mt-1 text-xs text-slate-500">Slug: {selectedSlug} · edits are shared across the published preview</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => updateCurrent(original[selectedSlug] as JsonValue)} className="gap-2"><RotateCcw size={14}/>Reset this niche</Button>{savedAt && <span className="self-center text-xs text-slate-500">Saved {savedAt}</span>}</div></div>
          <JsonEditor label="Editable website content" value={current as unknown as JsonValue} onChange={updateCurrent}/>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900"><strong>What this controls:</strong> case study title, headline, brief, design approach, goal, industry mapping, all preview page text and lists, FAQ copy, and the accent colour used by the preview. Page layout and component structure remain consistent across niches.</div>
        </>}
      </div>
    </section>}
  </div>;
}

export default StudioShowcaseCms;
