import React from "react";
import { ArrowRight, MonitorPlay, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

export function DemoModePage() {
  const navigate = useNavigate();

  const startDemo = () => {
    localStorage.setItem("bts_demo_mode_requested", "true");
    navigate("/login");
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-white">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 md:p-12">
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-200">
            <MonitorPlay className="h-8 w-8" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-indigo-300">Prospect demo access</p>
          <h1 className="mt-4 max-w-3xl text-5xl font-black italic uppercase tracking-tighter">Let prospects test the WAAS platform without touching real data.</h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-relaxed text-slate-300">
            Use this page as the public demo entry. Connect it to a dedicated demo account in Supabase, then share one clean link with prospects.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button onClick={startDemo} className="h-12 rounded-xl bg-white px-6 font-black uppercase tracking-widest text-slate-950 hover:bg-indigo-50">
              Open Demo Login <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/portfolio")} className="h-12 rounded-xl border-white/20 bg-transparent px-6 text-white hover:bg-white/10">
              View Portfolio
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Safe data", "Use a separate demo business and demo admin user."],
            ["Guided tour", "Show website generation, leads, managed updates, and settings."],
            ["Sales-ready", "Pair this with your portfolio page during calls."],
          ].map(([title, desc], index) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              {index === 0 ? <ShieldCheck className="h-5 w-5 text-emerald-300" /> : <Sparkles className="h-5 w-5 text-indigo-300" />}
              <h2 className="mt-4 font-black uppercase">{title}</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
