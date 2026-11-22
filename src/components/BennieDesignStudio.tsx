import React, { useMemo, useState } from "react";
import { askAI } from "../lib/gemini";
import { buildDesignDirectionPrompt, DESIGN_DIRECTOR_SYSTEM_PROMPT, parseDesignDirection, type DesignDirection } from "../lib/designDirector";
import type { Website } from "../types";
import { DESIGN_PACK_LIST, applyDesignPack, applyApprovedDesignDirection, assessDesignPackRelease, recommendDesignPack, type DesignPackId } from "../lib/designPacks";
import { assessWebsiteDesign } from "../lib/designQa";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Palette, Smartphone, Monitor, Sparkles, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";

type Props = { website: Website; onChange: (next: Website) => void; industry?: string; };
export function BennieDesignStudio({ website, onChange, industry }: Props) {
  const activePack = DESIGN_PACK_LIST.find(pack => pack.id === website.theme.designPackId);
  const [selected, setSelected] = useState<DesignPackId>(activePack?.id || "conversion_local");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [showChecks, setShowChecks] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiDirection, setAiDirection] = useState<DesignDirection | null>(null);
  const recommended = useMemo(() => recommendDesignPack({ industry, personality: website.theme.brandPersonality, goal: website.seo?.coreValueProposition }), [industry, website.theme.brandPersonality, website.seo?.coreValueProposition]);
  const pack = DESIGN_PACK_LIST.find(item => item.id === selected)!;
  const releaseIssues = assessDesignPackRelease(pack);
  const candidate = useMemo(() => applyDesignPack(website, selected), [website, selected]);
  const siteAssessment = useMemo(() => assessWebsiteDesign(candidate), [candidate]);
  const aiCandidate = useMemo(() => aiDirection ? applyApprovedDesignDirection(website, aiDirection) : null, [website, aiDirection]);
  const requestAIDirection = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError("");
    setAiDirection(null);
    try {
      const prompt = buildDesignDirectionPrompt({
        industry: industry || website.seo?.businessType || "General",
        businessName: website.seo?.title || "Business",
        targetCustomer: website.seo?.targetAudience,
        goal: website.seo?.coreValueProposition || "Generate enquiries",
        brandPersonality: website.theme.brandPersonality,
        businessMaturity: website.theme.businessMaturity,
        assetReadiness: website.theme.assetReadiness,
        generationMode: website.theme.generationMode || "premium",
      });
      const response = await askAI("synthesis", prompt, {
        businessId: website.businessId,
        featureKey: "website_draft",
        systemMessage: DESIGN_DIRECTOR_SYSTEM_PROMPT,
        isJson: true,
        maxRetries: 0,
      });
      setAiDirection(parseDesignDirection(response));
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI recommendation could not be generated.");
    } finally {
      setAiLoading(false);
    }
  };
  const home = website.pages?.[0];
  const hero = home?.sections.find(section => section.type === "hero");
  const title = String(hero?.content?.headline || hero?.content?.title || website.seo?.title || "A better website for your business");
  const subheading = String(hero?.content?.subheadline || hero?.content?.description || "Thoughtfully designed to make the next step clear.");
  return <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-label="Bennie Design Studio">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="mb-2 flex items-center gap-2"><Palette className="h-5 w-5 text-indigo-600"/><h2 className="text-xl font-bold text-slate-900">Bennie Design Studio</h2></div>
      <p className="max-w-2xl text-sm text-slate-600">Choose a versioned, approved design pack. Changes are staged in the website editor until you save. Your actual content and verified business proof are preserved.</p></div>
      <Badge variant="outline">Design Packs 1.0</Badge>
    </div>
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="flex items-center gap-2 text-sm font-semibold text-indigo-900"><Sparkles className="h-4 w-4"/> Design recommendation: {recommended.pack.label}</p>
        <p className="mt-1 text-xs text-indigo-800">{recommended.rationale.join(" ")}</p></div>
        <Button type="button" variant="outline" onClick={() => setSelected(recommended.pack.id)}>Use recommendation</Button>
      </div>
      <p className="mt-2 text-xs text-indigo-700">Rules-based recommendation; no claim of a live AI generation. AI design-direction workflows remain available elsewhere in the editor.</p>
    </div>
    <div className="rounded-2xl border border-slate-200 p-4" aria-label="AI design director">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm font-bold text-slate-900">AI Design Director</p><p className="mt-1 text-xs text-slate-600">Request an approved design direction using your existing authenticated AI credits. No changes are saved or published automatically.</p></div>
        <Button type="button" variant="outline" disabled={aiLoading} onClick={requestAIDirection}>{aiLoading ? "Generating…" : "Generate AI direction (uses credits)"}</Button>
      </div>
      {aiError && <p role="alert" className="mt-3 text-sm text-red-700">{aiError}</p>}
      {aiDirection && <div className="mt-4 rounded-xl bg-slate-50 p-4">
        <p className="font-semibold text-slate-900">Recommended profile: {aiDirection.designProfile.replaceAll("_", " ")}</p>
        {aiDirection.rationale.map((reason, index) => <p key={index} className="mt-1 text-xs text-slate-700">• {reason}</p>)}
        {aiDirection.reviewNotes.length > 0 && <p className="mt-3 text-xs font-semibold text-amber-800">Review: {aiDirection.reviewNotes.join("; ")}</p>}
        <Button type="button" className="mt-4" disabled={!aiCandidate} onClick={() => { if (aiCandidate) { onChange(aiCandidate); setAiDirection(null); } }}>Apply AI direction to editor</Button>
      </div>}
    </div>
    <div className="grid gap-3 md:grid-cols-3">
      {DESIGN_PACK_LIST.map(item => <button type="button" key={item.id} aria-pressed={selected === item.id}
        onClick={() => setSelected(item.id)} className={`rounded-2xl border-2 p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${selected === item.id ? "border-indigo-600 bg-indigo-50" : "border-slate-200 hover:border-slate-400"}`}>
        <div className="mb-3 flex gap-1.5"><span className="h-6 w-8 rounded" style={{background: item.primaryColor}}/><span className="h-6 w-8 rounded border" style={{background:item.secondaryColor}}/></div>
        <p className="font-bold text-slate-900">{item.label}</p><p className="mt-1 text-xs leading-5 text-slate-600">{item.description}</p>
        <p className="mt-3 text-xs font-semibold text-slate-500">v{item.version} · {item.status}</p>
      </button>)}
    </div>
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="flex items-center justify-between gap-3 border-b bg-slate-50 px-4 py-3">
        <span className="text-sm font-bold text-slate-800">Composition preview <span className="font-normal text-slate-500">(style simulation)</span></span>
        <div className="flex gap-2">
          <button type="button" aria-label="Desktop preview" aria-pressed={viewport==="desktop"} onClick={()=>setViewport("desktop")} className={`rounded-lg p-2 ${viewport==="desktop"?"bg-indigo-100 text-indigo-900":"text-slate-500"}`}><Monitor className="h-4 w-4"/></button>
          <button type="button" aria-label="Mobile preview" aria-pressed={viewport==="mobile"} onClick={()=>setViewport("mobile")} className={`rounded-lg p-2 ${viewport==="mobile"?"bg-indigo-100 text-indigo-900":"text-slate-500"}`}><Smartphone className="h-4 w-4"/></button>
        </div>
      </div>
      <div className="bg-slate-100 p-4">
        <div className={`mx-auto overflow-hidden rounded-xl shadow-lg transition-all ${viewport==="mobile"?"max-w-[360px]":"max-w-5xl"}`}
          style={{background:pack.secondaryColor,color:pack.primaryColor,fontFamily:pack.fontFamily}}>
          <div className="flex items-center justify-between border-b border-current/10 px-5 py-4">
            <span className="text-sm font-bold">{website.seo?.title || "Your business"}</span><span className="text-xs">Menu</span>
          </div>
          {pack.id === "conversion_local" && <div className={`p-7 sm:p-10 ${viewport==="mobile"?"space-y-5":"grid grid-cols-5 items-center gap-8"}`}>
            <div className={viewport==="mobile"?"":"col-span-3"}>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest">Local service · clear next step</p>
              <h3 className="max-w-2xl break-words text-3xl font-extrabold leading-tight sm:text-5xl">{title}</h3>
              <p className="mt-4 max-w-lg text-sm leading-6 opacity-90">{subheading}</p>
              <span className="mt-5 inline-block rounded-md px-5 py-3 text-sm font-semibold" style={{background:pack.primaryColor,color:"#ffffff"}}>Request an enquiry</span>
            </div>
            <div className={`rounded-lg border-2 p-6 ${viewport==="mobile"?"":"col-span-2"}`} style={{borderColor:pack.primaryColor,background:"#ffffff"}}>
              <p className="text-sm font-bold">How can we help?</p><div className="my-4 h-px bg-slate-200"/>
              <p className="text-xs leading-6">Services · Service areas · Contact options</p>
              <p className="mt-4 text-[11px] opacity-70">Live details come from customer-approved content.</p>
            </div>
          </div>}
          {pack.id === "editorial_authority" && <div className="p-7 sm:p-12">
            <p className="mb-6 text-xs uppercase tracking-[.3em]">Practice · Experience · Clarity</p>
            <div className={viewport==="mobile"?"space-y-5":"grid grid-cols-12 items-end gap-8"}>
              <h3 className={`break-words font-serif text-3xl leading-[1.12] sm:text-6xl ${viewport==="mobile"?"":"col-span-8"}`}>{title}</h3>
              <p className={`border-l-2 pl-4 text-sm leading-6 ${viewport==="mobile"?"":"col-span-4"}`} style={{borderColor:pack.primaryColor}}>{subheading}</p>
            </div>
            <div className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t pt-5" style={{borderColor:pack.primaryColor}}>
              <span className="text-xs">People · Expertise · Contact</span><span className="border-b pb-1 text-sm font-semibold">Arrange a consultation</span>
            </div>
          </div>}
          {pack.id === "organic_human" && <div className={`gap-7 p-7 sm:p-10 ${viewport==="mobile"?"space-y-5":"grid grid-cols-5 items-center"}`}>
            <div className={`flex min-h-52 items-center justify-center rounded-[45%_45%_18%_18%] border-2 border-dashed p-7 text-center text-xs ${viewport==="mobile"?"":"col-span-2"}`} style={{background:"#E3E9DC",borderColor:pack.primaryColor}}>
              Client-approved photography or artwork
            </div>
            <div className={viewport==="mobile"?"":"col-span-3"}>
              <p className="mb-3 text-xs tracking-widest">A WELCOMING EXPERIENCE</p>
              <h3 className="break-words font-serif text-3xl leading-tight sm:text-5xl">{title}</h3>
              <p className="mt-5 max-w-lg text-sm leading-6">{subheading}</p>
              <span className="mt-6 inline-block rounded-full px-6 py-3 text-xs font-semibold" style={{background:pack.primaryColor,color:"#ffffff"}}>Start a conversation</span>
            </div>
          </div>}
        </div>
      </div>
      <div className="border-t bg-white px-4 py-3 text-xs text-slate-500">This is a safe design simulation, not a screenshot of the full website. Use the existing Open Preview action after applying and saving to inspect the actual renderer.</div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button type="button" onClick={()=>setShowChecks(!showChecks)} className="flex items-center gap-2 text-sm font-semibold text-slate-700 underline underline-offset-4"><ShieldCheck className="h-4 w-4"/>{showChecks?"Hide":"Show"} design release checks</button>
      <Button type="button" disabled={releaseIssues.length>0} onClick={()=>onChange(candidate)}><CheckCircle2 className="mr-2 h-4 w-4"/>Apply design to editor</Button>
    </div>
    {showChecks && <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
      <p className="font-bold">Pack validation: {releaseIssues.length ? "Needs work" : "Passed"}</p>
      {releaseIssues.map(issue=><p key={issue} className="mt-2 flex gap-2 text-red-700"><AlertCircle className="h-4 w-4"/>{issue}</p>)}
      <p className="mt-2 text-xs text-slate-600">Existing design QA is also evaluated for the staged website. Review its findings and the live preview before publishing.</p>
      <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words text-xs text-slate-600">{JSON.stringify(siteAssessment,null,2).slice(0,2000)}</pre>
    </div>}
  </section>;
}
