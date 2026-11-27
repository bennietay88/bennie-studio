import React, { useEffect, useId, useRef, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import "../styles/interactiveSiteSections.css";

export type ProcessStep = { number: string; title: string; description?: string; detail?: string };

export function BeforeAfterComparison({ before, after, beforeLabel = "Before", afterLabel = "After", caption }: {
  before: React.ReactNode; after: React.ReactNode; beforeLabel?: string; afterLabel?: string; caption?: string;
}) {
  const [position, setPosition] = useState(50);
  const control = useId();
  const scene = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null);
  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = scene.current?.getBoundingClientRect();
    if (rect && rect.width > 0) setPosition(Math.round(Math.min(100, Math.max(0, (event.clientX - rect.left) / rect.width * 100))));
  };
  return <figure className="bt-comparison">
    <div ref={scene} className="bt-comparison-scene"
      onPointerDown={event => { if (event.button !== 0) return; dragging.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId); move(event); }}
      onPointerMove={event => { if (dragging.current === event.pointerId) move(event); }}
      onPointerUp={event => { if (dragging.current === event.pointerId) { dragging.current = null; move(event); } }}
      onPointerCancel={() => { dragging.current = null; }}
      onLostPointerCapture={() => { dragging.current = null; }}>
      <div className="bt-comparison-panel">{after}</div>
      <div className="bt-comparison-panel" style={{clipPath: "inset(0 " + (100-position) + "% 0 0)"}}>{before}</div>
      <span className="bt-comparison-tag bt-comparison-left">{beforeLabel}</span>
      <span className="bt-comparison-tag bt-comparison-right">{afterLabel}</span>
      <div aria-hidden="true" className="bt-comparison-divider" style={{left: position + "%"}}><span><ArrowLeftRight size={19}/></span></div>
    </div>
    <div className="bt-comparison-controls">
      <label htmlFor={control}>Compare {beforeLabel.toLowerCase()} and {afterLabel.toLowerCase()}</label>
      <input id={control} type="range" min={0} max={100} value={position} aria-valuetext={position + "% " + beforeLabel + ", " + (100-position) + "% " + afterLabel} onChange={event => setPosition(Number(event.target.value))}/>
      <button type="button" onClick={() => setPosition(50)}>Reset</button>
    </div>
    {caption && <figcaption>{caption}</figcaption>}
  </figure>;
}

/** Scroll-linked progress, without pinning, scrolling on behalf of visitors,
 * hiding steps, or requiring motion for the content to remain usable. */
export function InteractiveProcessTimeline({steps, studio = false, animate = true}: {steps: readonly ProcessStep[]; studio?: boolean; animate?: boolean}) {
  const list = useRef<HTMLOListElement>(null);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(-1);
  useEffect(() => {
    const element = list.current;
    if (!element || !animate) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      if (reduced.matches) { setActive(-1); setProgress(0); return; }
      const rect = element.getBoundingClientRect();
      const start = window.innerHeight * .8;
      const amount = Math.max(0, Math.min(1, (start - rect.top) / Math.max(1, rect.height)));
      setProgress(amount);
      setActive(amount > 0 ? Math.min(steps.length - 1, Math.floor(amount * steps.length)) : -1);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", schedule, {passive:true});
    window.addEventListener("resize", schedule, {passive:true});
    // Embedded editor previews can scroll inside their own container.
    document.addEventListener("scroll", schedule, {passive:true, capture:true});
    reduced.addEventListener("change", schedule);
    update();
    return () => { window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); document.removeEventListener("scroll", schedule, true); reduced.removeEventListener("change", schedule); if (frame) cancelAnimationFrame(frame); };
  }, [steps.length, animate]);
  return <div className="bt-process" data-process-animated={animate ? "true" : "false"}>
    {animate && <div className="bt-process-progress" aria-hidden="true"><span style={{transform:"scaleX(" + progress + ")"}}/></div>}
    <ol ref={list} className={studio ? "sfn-timeline-all bt-process-list" : "bt-process-list bt-client-process"} aria-label="Process steps">
      {steps.map((step,index) => <li className={studio ? "sfn-timeline-item bt-process-step" : "bt-process-step"} key={index} data-process-active={animate && index === active ? "true" : "false"}>
        <span className={studio ? "sfn-timeline-number" : "bt-process-number"} aria-hidden="true">{step.number}</span>
        <h3>{step.title}</h3>{step.description && <p>{step.description}</p>}{step.detail && <p className={studio ? "sfn-timeline-note" : "bt-process-detail"}>{step.detail}</p>}
      </li>)}
    </ol>
  </div>;
}

function IllustrativeDesign({ refined }: {refined: boolean}) {
  return <div className={"bt-design-example " + (refined ? "bt-design-refined" : "bt-design-basic")}>
    <div className="bt-design-nav"><b>FORM / SPACE</b><span>Services · About · Contact</span></div>
    <div className="bt-design-content"><div>
      <span className="bt-design-kicker">HOME RENOVATION</span>
      <strong>{refined ? "A better space starts here." : "Welcome to our website"}</strong>
      <p>Residential renovations and practical design advice.</p>
      <span className="bt-design-cta">{refined ? "Request a quote ↗" : "Learn more"}</span>
    </div><img src="/template-assets/flagship-renovation.jpg" alt="Illustrative renovation concept" loading="lazy" decoding="async"/></div>
  </div>;
}

export function StudioComparisonDemo() {
  return <section className="brand-shell bt-studio-comparison">
    <div className="bt-comparison-heading"><p className="c27-kicker">Design in practice</p><h2>See what a clearer website can change.</h2><p>Drag the divider to compare two illustrative layouts for the same fictional renovation business.</p></div>
    <BeforeAfterComparison before={<IllustrativeDesign refined={false}/>} after={<IllustrativeDesign refined={true}/>} beforeLabel="Basic concept" afterLabel="Refined concept" caption="Illustrative studio concepts only. Not a commissioned project, customer result or measured conversion improvement."/>
  </section>;
}
