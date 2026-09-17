import { useEffect } from "react";

type CopyRule = {
  match: string;
  replacement?: string;
  hideContainer?: boolean;
};

const COPY_RULES: CopyRule[] = [
  { match: "Business Website Ready", hideContainer: true },
  { match: "Execution Strategy", replacement: "Services" },
  { match: "Core Advantages", replacement: "What You Get" },
  { match: "Get In Touch", replacement: "Contact" },
  { match: "Consulting", replacement: "Learn More" },
  {
    match: "Our platform is engineered for scale, security, and absolute performance.",
    replacement: "Clear, practical details that help customers understand what matters and what to do next.",
  },
  {
    match: "High-intensity performance engineering combined with intuitive design paradigms.",
    replacement: "Clear, practical information designed to make the next step easier to understand.",
  },
  {
    match: "We deliver specialized solutions tailored to your unique market challenges.",
    replacement: "Clear services built around the needs of the customers you want to reach.",
  },
];

const AI_CLICHES = [
  /unlock the power/gi,
  /elevate your (business|brand|experience)/gi,
  /take (your|the) (business|brand|experience) to the next level/gi,
  /tailored solutions for your unique needs/gi,
  /transform your business/gi,
];

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanRendererCopy(renderer: HTMLElement) {
  const walker = document.createTreeWalker(renderer, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }

  nodes.forEach((node) => {
    const original = node.nodeValue || "";
    const normalized = normalizeText(original);
    if (!normalized) return;

    const rule = COPY_RULES.find((candidate) => normalized === candidate.match);
    if (rule) {
      const parent = node.parentElement;
      if (rule.hideContainer && parent) {
        const container = parent.closest("div, span, p") as HTMLElement | null;
        if (container) {
          container.dataset.agencyTemplateLabel = "suppressed";
          container.style.display = "none";
          return;
        }
      }
      if (rule.replacement) node.nodeValue = original.replace(normalized, rule.replacement);
      return;
    }

    let cleaned = original;
    AI_CLICHES.forEach((pattern) => {
      cleaned = cleaned.replace(pattern, "clear, practical service information");
    });
    if (cleaned !== original) node.nodeValue = cleaned;
  });

  renderer.dataset.agencyCopyClean = "true";
}

export function AgencyCopyDirector() {
  useEffect(() => {
    let renderer: HTMLElement | null = null;
    let observer: MutationObserver | null = null;
    let rootObserver: MutationObserver | null = null;
    let scheduled = 0;

    const stopRendererObserver = () => {
      observer?.disconnect();
      observer = null;
      renderer = null;
    };

    const attach = () => {
      const next = document.querySelector<HTMLElement>(".bt-website-renderer");
      if (next === renderer) {
        if (next) cleanRendererCopy(next);
        return;
      }

      stopRendererObserver();
      if (!next) return;
      renderer = next;
      cleanRendererCopy(next);

      observer = new MutationObserver(() => {
        window.clearTimeout(scheduled);
        scheduled = window.setTimeout(() => {
          if (renderer) cleanRendererCopy(renderer);
        }, 80);
      });
      observer.observe(next, { childList: true, subtree: true, characterData: true });
    };

    attach();
    rootObserver = new MutationObserver(attach);
    rootObserver.observe(document.getElementById("root") || document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.clearTimeout(scheduled);
      rootObserver?.disconnect();
      stopRendererObserver();
    };
  }, []);

  return null;
}
