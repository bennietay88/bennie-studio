import React from "react";
import { ArrowRight, CheckCircle2, MessageCircle, Star } from "lucide-react";
import { cn } from "../lib/utils";

const palettes = [
  { dark: "bg-slate-950", accent: "bg-indigo-500", soft: "bg-indigo-100", text: "text-indigo-600" },
  { dark: "bg-[#173f3b]", accent: "bg-emerald-500", soft: "bg-emerald-100", text: "text-emerald-700" },
  { dark: "bg-[#30243c]", accent: "bg-fuchsia-500", soft: "bg-fuchsia-100", text: "text-fuchsia-700" },
  { dark: "bg-[#312b24]", accent: "bg-amber-500", soft: "bg-amber-100", text: "text-amber-700" },
];

export function WebsiteConceptVisual({ title, eyebrow = "Managed website concept", index = 0, className }: { title: string; eyebrow?: string; index?: number; className?: string }) {
  const palette = palettes[index % palettes.length];
  return (
    <div className={cn("relative overflow-hidden bg-white text-slate-950", className)} aria-label={`${title} website wireframe`} role="img">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2"><span className={cn("h-5 w-5 rounded-md", palette.accent)} /><span className="text-[9px] font-black uppercase tracking-[0.14em]">{title}</span></div>
        <div className="flex gap-2"><span className="h-1.5 w-8 rounded-full bg-slate-200" /><span className="h-1.5 w-6 rounded-full bg-slate-200" /><span className={cn("h-5 w-14 rounded-full", palette.accent)} /></div>
      </div>
      <div className={cn("grid min-h-52 grid-cols-[1.1fr_0.9fr] gap-4 p-5 sm:p-7", palette.dark)}>
        <div className="flex flex-col justify-center"><p className="text-[8px] font-black uppercase tracking-[0.22em] text-white/55">{eyebrow}</p><div className="mt-3 h-3 w-4/5 rounded-full bg-white" /><div className="mt-2 h-3 w-3/5 rounded-full bg-white" /><div className="mt-4 h-1.5 w-full rounded-full bg-white/20" /><div className="mt-1.5 h-1.5 w-4/5 rounded-full bg-white/20" /><div className="mt-5 flex gap-2"><span className={cn("h-8 w-24 rounded-lg", palette.accent)} /><span className="h-8 w-20 rounded-lg border border-white/30" /></div></div>
        <div className="rounded-2xl bg-white/10 p-3"><div className="h-full min-h-36 rounded-xl bg-white p-3"><div className={cn("h-16 rounded-lg", palette.soft)}><div className="flex h-full items-center justify-center"><div className={cn("grid h-9 w-9 place-items-center rounded-xl text-white", palette.accent)}><MessageCircle className="h-4 w-4" /></div></div></div><div className="mt-3 grid grid-cols-2 gap-2"><span className="h-8 rounded-lg bg-slate-100" /><span className="h-8 rounded-lg bg-slate-100" /></div><div className="mt-2 flex items-center gap-1 text-amber-400"><Star className="h-2.5 w-2.5 fill-current" /><Star className="h-2.5 w-2.5 fill-current" /><Star className="h-2.5 w-2.5 fill-current" /><span className="ml-1 h-1.5 w-12 rounded bg-slate-200" /></div></div></div>
      </div>
      <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4">{["Clear offer", "Proof early", "Direct enquiry"].map((label) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-3"><CheckCircle2 className={cn("h-3.5 w-3.5", palette.text)} /><p className="mt-2 text-[8px] font-black uppercase tracking-wider text-slate-600">{label}</p></div>)}</div>
      <div className={cn("absolute bottom-4 right-4 grid h-8 w-8 place-items-center rounded-full text-white shadow-lg", palette.accent)}><ArrowRight className="h-4 w-4" /></div>
    </div>
  );
}
