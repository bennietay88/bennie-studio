import React from "react";
import { ArrowLeft, ArrowRight, Monitor, Smartphone } from "lucide-react";

const examples = [
  { id: "dental-clinic", label: "Dental clinic", caption: "A calmer, clearer path to booking care." },
  { id: "renovation-contractor", label: "Renovation", caption: "A service-led layout built around quote requests." },
  { id: "professional-advisory", label: "Professional services", caption: "A confident first impression for advisory work." },
] as const;

export function WebsitePreviewExplorer({ compact = false }: { compact?: boolean }) {
  const [selected, setSelected] = React.useState(0);
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const item = examples[selected];
  function onTabsKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? examples.length - 1 : (selected + (event.key === "ArrowRight" ? 1 : -1) + examples.length) % examples.length;
    setSelected(next);
    tabRefs.current[next]?.focus();
  }
  return <section className={`sfn-preview ${compact ? "sfn-preview-compact" : ""}`} aria-label="Interactive website design studies">
    <div className="sfn-preview-head">
      <div><p className="sfn-eyebrow">A closer look</p><h2>Explore a website direction.</h2><p className="sfn-caption">{item.caption}</p></div>
      <div className="sfn-device-toggle" role="group" aria-label="Preview size">
        <button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}><Monitor size={16}/> <span>Desktop</span></button>
        <button type="button" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}><Smartphone size={16}/> <span>Mobile</span></button>
      </div>
    </div>
    <div className="sfn-tabs" role="tablist" aria-label="Business example" onKeyDown={onTabsKeyDown}>
      {examples.map((example, index) => <button key={example.id} ref={(el) => {tabRefs.current[index] = el}} type="button" role="tab" id={`sfn-tab-${example.id}`} aria-selected={selected === index} aria-controls="sfn-preview-panel" tabIndex={selected === index ? 0 : -1} onClick={() => setSelected(index)}>{example.label}</button>)}
    </div>
    <div id="sfn-preview-panel" role="tabpanel" aria-labelledby={`sfn-tab-${item.id}`} className={`sfn-frame-wrap sfn-frame-${device}`}>
      <iframe title={`${item.label} illustrative website design`} src={`/case-studies/showcase/${item.id}/preview`} loading="lazy" />
    </div>
    <p className="sfn-disclaimer">Illustrative studio design studies. They show possible directions, not client work or promised results.</p>
  </section>;
}

export type StudioProcessStep = { number: string; title: string; description: string; detail: string };
export function StudioProcessTimeline({ steps }: { steps: readonly StudioProcessStep[] }) {
  const [active, setActive] = React.useState(0);
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const focusStep = (index: number) => {
    const next = (index + steps.length) % steps.length;
    setActive(next);
    refs.current[next]?.focus();
  };
  return <div className="sfn-timeline">
    <div className="sfn-timeline-track" role="tablist" aria-label="Project steps" onKeyDown={(event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); focusStep(active + 1); }
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); focusStep(active - 1); }
      else if (event.key === "Home") { event.preventDefault(); focusStep(0); }
      else if (event.key === "End") { event.preventDefault(); focusStep(steps.length - 1); }
    }}>
      {steps.map((step, index) => <button key={step.number} ref={(el) => {refs.current[index] = el}} type="button" role="tab" id={`sfn-step-tab-${index}`} aria-controls="sfn-step-panel" aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)}>
        <span>{step.number}</span><b>{step.title}</b>
      </button>)}
    </div>
    <div className="sfn-step-panel" id="sfn-step-panel" role="tabpanel" aria-labelledby={`sfn-step-tab-${active}`}>
      <p className="sfn-eyebrow">Step {steps[active].number}</p><h3>{steps[active].title}</h3><p>{steps[active].description}</p><small>{steps[active].detail}</small>
      <div className="sfn-step-controls">
        <button type="button" onClick={() => setActive((active + steps.length - 1) % steps.length)} aria-label="Previous step"><ArrowLeft size={17}/> Previous</button>
        <span>{active + 1} / {steps.length}</span>
        <button type="button" onClick={() => setActive((active + 1) % steps.length)} aria-label="Next step">Next <ArrowRight size={17}/></button>
      </div>
    </div>
  </div>;
}
