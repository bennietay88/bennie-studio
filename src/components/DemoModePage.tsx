import React from "react";
import { ArrowRight, MonitorPlay, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";

export function DemoModePage() {
  const navigate = useNavigate();

  const startDemo = () => {
    localStorage.setItem("bts_demo_mode_requested", "true");
    navigate("/login");
  };

  return (
    <div className="brand-public min-h-screen bg-[#f8f8f5] text-[#15191f]">
      <PublicSiteHeader />
      <main id="main-content">
        <section className="border-b border-[#dbe1ea] bg-white">
          <div className="brand-shell grid gap-12 py-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)] lg:items-center lg:py-24">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1741ed]">Platform walkthrough · Bennie Studio</p>
              <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">See the managed website workspace in action.</h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#526071]">Explore the website editor, leads and ongoing management journey through a separate demonstration account. Live customer records are not part of the tour.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button onClick={startDemo} className="min-h-12 rounded-lg bg-[#1741ed] px-6 py-3 font-bold text-white hover:bg-[#1035c2]">Open demo sign-in <ArrowRight className="ml-2 h-4 w-4" /></Button>
                <Link to="/case-studies" className="inline-flex min-h-12 items-center rounded-lg border border-[#dbe1ea] bg-white px-6 py-3 text-sm font-bold text-[#1741c9] hover:bg-[#eef3ff]">Browse website concepts</Link>
              </div>
              <p className="mt-5 text-xs leading-6 text-[#526071]">Demo access requires a configured demo account. Use only the credentials provided for the demonstration.</p>
            </div>
            <div className="flex min-h-[300px] flex-col justify-between rounded-2xl border border-[#dbe1ea] bg-[#eef3ff] p-7 sm:p-9">
              <MonitorPlay className="h-10 w-10 text-[#1741ed]" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1741ed]">A guided look inside</p>
                <h2 className="mt-4 text-3xl font-bold leading-tight text-[#15191f]">From enquiry to launch and ongoing updates.</h2>
              </div>
            </div>
          </div>
        </section>
        <section className="brand-shell py-14 sm:py-20">
          <h2 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight">What the demonstration covers</h2>
          <div className="mt-8 grid gap-0 border-t border-[#dbe1ea] md:grid-cols-3 md:gap-8">
            {[
              ["Separated access", "A dedicated demonstration workspace rather than a live customer's private information."],
              ["Managed workflow", "Explore website generation, enquiry handling, supported updates and account settings."],
              ["Realistic next steps", "Compare the demonstration with the illustrative website concepts and current service plans."],
            ].map(([title, copy], index) => (
              <article key={title} className="border-b border-[#dbe1ea] py-6 md:border-b-0">
                {index === 0 ? <ShieldCheck className="h-6 w-6 text-[#1741ed]" /> : <Sparkles className="h-6 w-6 text-[#1741ed]" />}
                <h3 className="mt-4 text-lg font-bold text-[#15191f]">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#526071]">{copy}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
