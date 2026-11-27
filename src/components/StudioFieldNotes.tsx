import React from "react";
import { InteractiveProcessTimeline } from "./InteractiveSiteSections";
import { Monitor, Smartphone } from "lucide-react";

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

/** The complete process is visible without tabs, clicking or carousel controls. */
export function StudioProcessTimeline({ steps }: { steps: readonly StudioProcessStep[] }) {
  return <InteractiveProcessTimeline steps={steps} studio />;
}
