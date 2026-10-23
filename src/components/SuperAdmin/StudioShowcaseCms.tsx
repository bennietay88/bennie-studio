import React, { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { supabase } from "../../lib/supabase";
import { STUDIO_SHOWCASES } from "../StudioCaseStudyDetail";
import { DEMOS, NICHE_PAGE_CONTENT } from "../StudioShowcaseLivePreview";
import { mergeCmsValue, type StudioShowcaseCms } from "../../lib/studioShowcaseCms";

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
        body: JSON.stringify({ showcases }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "The showcase changes could not be saved.");
      setSavedAt(new Date().toLocaleTimeString());
      toast.success("Showcase content saved and published.");
    } catch (error: any) { toast.error(error?.message || "The showcase changes could not be saved."); }
    finally { setSaving(false); }
  };

  const current = showcases[selectedSlug];
  const updateCurrent = (next: JsonValue) => setShowcases((previous) => ({ ...previous, [selectedSlug]: next as any }));

  return <div className="mx-auto max-w-7xl space-y-6 pb-12">
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-600">Content & CMS</p><h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Studio showcase CMS</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Edit case study details, all four niche preview pages, page copy, FAQs, section content and accent colours here. Changes appear on the live preview without editing source files.</p></div>
      <div className="flex flex-wrap gap-2"><a href={`/case-studies/showcase/${selectedSlug}/preview`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Open preview <ExternalLink size={15}/></a><Button onClick={save} disabled={loading || saving} className="gap-2">{saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Save changes</Button></div>
    </header>
    <section className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">Choose a niche</p>{STUDIO_SHOWCASES.map((study) => <button type="button" key={study.slug} onClick={() => setSelectedSlug(study.slug)} className={`mb-1 block w-full rounded-lg px-3 py-3 text-left text-sm font-semibold transition ${selectedSlug === study.slug ? "bg-indigo-50 text-indigo-700" : "text-slate-700 hover:bg-slate-50"}`}>{study.title}<span className="mt-1 block text-xs font-normal text-slate-500">{study.category}</span></button>)}</aside>
      <div className="space-y-4">
        {loading || !current ? <div className="flex min-h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500"><Loader2 size={18} className="mr-2 animate-spin"/>Loading CMS content…</div> : <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"><div><p className="font-bold text-slate-900">Editing {String((current as any).study?.title || selectedSlug)}</p><p className="mt-1 text-xs text-slate-500">Slug: {selectedSlug} · edits are shared across the published preview</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => updateCurrent(original[selectedSlug] as JsonValue)} className="gap-2"><RotateCcw size={14}/>Reset this niche</Button>{savedAt && <span className="self-center text-xs text-slate-500">Saved {savedAt}</span>}</div></div>
          <JsonEditor label="Editable website content" value={current as unknown as JsonValue} onChange={updateCurrent}/>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900"><strong>What this controls:</strong> case study title, headline, brief, design approach, goal, industry mapping, all preview page text and lists, FAQ copy, and the accent colour used by the preview. Page layout and component structure remain consistent across niches.</div>
        </>}
      </div>
    </section>
  </div>;
}

export default StudioShowcaseCms;
