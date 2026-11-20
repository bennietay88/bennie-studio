import { useEffect } from "react";

const PUBLIC_PATH_PREFIXES = [
  "/",
  "/pricing",
  "/generate-preview",
  "/how-it-works",
  "/case-studies",
  "/portfolio",
  "/templates",
  "/website-audit",
  "/book-demo",
  "/pay-monthly-websites",
  "/website-subscription-service",
  "/website-design/",
  "/clinic-website-design-malaysia",
  "/renovation-contractor-website-design",
  "/beauty-salon-website-design",
  "/tuition-centre-website-design",
  "/consultant-website-design",
];

const isPublicMarketingPath = (path: string) =>
  PUBLIC_PATH_PREFIXES.some((prefix) =>
    prefix === "/" ? path === "/" : path === prefix || path.startsWith(prefix),
  );

const PLACEHOLDER_PROOF = [
  "verified client",
  "happy customer",
  "repeat customer",
  "local customer",
];

const GENERIC_PRICING_MARKERS = ["essential", "recommended", "complete"];

const VISUAL_SYSTEM_CSS = String.raw`
  .bt-website-renderer {
    --bt-agency-content: min(calc(100% - 2rem), var(--bt-content-width, 82rem));
    --bt-agency-reading: 68ch;
    --bt-agency-line: color-mix(in srgb, currentColor 11%, transparent);
    --bt-agency-soft: color-mix(in srgb, var(--primary) 6%, transparent);
    --bt-agency-soft-2: color-mix(in srgb, var(--secondary) 8%, transparent);
    font-family: var(--bt-body-font, Inter, sans-serif) !important;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  .bt-website-renderer main {
    overflow: clip;
  }

  .bt-website-renderer main > section.bt-agency-section {
    position: relative;
    isolation: isolate;
    overflow: clip;
    padding-block: clamp(5rem, 10vw, 9.5rem) !important;
    border-top: 1px solid var(--bt-agency-line);
  }

  .bt-website-renderer main > section.bt-agency-section:first-child {
    border-top: 0;
  }

  .bt-website-renderer main > section.bt-agency-section > .section-container,
  .bt-website-renderer main > section.bt-agency-section > div:not([aria-hidden="true"]) {
    width: var(--bt-agency-content);
    max-width: var(--bt-content-width, 82rem);
    margin-inline: auto;
    position: relative;
    z-index: 2;
  }

  .bt-website-renderer main > section.bt-agency-section h1,
  .bt-website-renderer main > section.bt-agency-section h2,
  .bt-website-renderer main > section.bt-agency-section h3 {
    letter-spacing: -0.045em !important;
    text-wrap: balance;
  }

  .bt-website-renderer main > section.bt-agency-section h1 {
    max-width: 14ch;
  }

  .bt-website-renderer main > section.bt-agency-section h2 {
    max-width: 17ch;
  }

  .bt-website-renderer main > section.bt-agency-section p {
    max-width: var(--bt-agency-reading);
    line-height: 1.72;
  }

  .bt-website-renderer main > section.bt-agency-section img.bt-agency-image {
    display: block;
    width: 100%;
    object-fit: cover;
    border-radius: calc(var(--bt-radius, 1rem) * 1.25);
    box-shadow: 0 28px 80px -44px rgba(15, 23, 42, 0.48);
  }

  .bt-website-renderer main > section.bt-agency-section :is(.btn-primary, button, a[class*="btn"]) {
    min-height: 48px;
    transition-property: transform, box-shadow, background-color, border-color, opacity !important;
    transition-duration: 260ms !important;
    transition-timing-function: cubic-bezier(.2,.8,.2,1) !important;
  }

  .bt-website-renderer main > section.bt-agency-section :is(.btn-primary, button, a[class*="btn"]):hover {
    transform: translateY(-2px);
  }

  .bt-website-renderer main > section.bt-agency-section :is(input, textarea, select) {
    min-height: 50px;
    border-radius: calc(var(--bt-radius, 1rem) * .85);
  }

  .bt-website-renderer main > section.bt-agency-section [class*="rounded-2xl"],
  .bt-website-renderer main > section.bt-agency-section [class*="rounded-3xl"] {
    box-shadow: 0 22px 70px -52px rgba(15, 23, 42, .55);
  }

  .bt-website-renderer main > section.bt-agency-section[data-section-order="odd"] {
    background:
      radial-gradient(900px 340px at 85% -5%, var(--bt-agency-soft), transparent 70%),
      linear-gradient(180deg, color-mix(in srgb, currentColor 1.6%, transparent), transparent 58%);
  }

  .bt-website-renderer main > section#hero.bt-agency-section {
    min-height: min(900px, 90svh);
    display: grid;
    align-items: center;
    padding-top: clamp(7.5rem, 13vw, 11rem) !important;
    padding-bottom: clamp(6rem, 11vw, 10rem) !important;
    border-top: 0;
  }

  .bt-website-renderer main > section#hero.bt-agency-section::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background:
      radial-gradient(800px 520px at 84% 12%, color-mix(in srgb, var(--primary) 13%, transparent), transparent 72%),
      radial-gradient(700px 460px at 8% 78%, color-mix(in srgb, var(--secondary) 9%, transparent), transparent 75%);
  }

  .bt-website-renderer main > section#hero.bt-agency-section h1 {
    font-size: clamp(3.1rem, 9.5cqw, 7.5rem) !important;
    line-height: .93 !important;
    letter-spacing: -.065em !important;
  }

  .bt-website-renderer main > section#proof.bt-agency-section,
  .bt-website-renderer main > section#testimonials.bt-agency-section {
    background-color: color-mix(in srgb, var(--primary) 3.5%, white);
  }

  .bt-website-renderer[data-design-profile="editorial_luxury"] {
    --bt-agency-reading: 62ch;
  }

  .bt-website-renderer[data-design-profile="editorial_luxury"] main > section#hero h1,
  .bt-website-renderer[data-design-profile="craft_organic"] main > section#hero h1 {
    max-width: 11ch;
    font-weight: 480 !important;
  }

  .bt-website-renderer[data-design-profile="editorial_luxury"] main > section.bt-agency-section:nth-child(even) {
    background-color: #f5f2ec;
  }

  .bt-website-renderer[data-design-profile="editorial_luxury"] main > section.bt-agency-section img.bt-agency-image {
    border-radius: .35rem;
    filter: saturate(.92) contrast(1.03);
  }

  .bt-website-renderer[data-design-profile="modern_minimal"] main > section.bt-agency-section {
    border-top-color: color-mix(in srgb, currentColor 8%, transparent);
  }

  .bt-website-renderer[data-design-profile="modern_minimal"] main > section#hero::before {
    background:
      linear-gradient(90deg, color-mix(in srgb, currentColor 5%, transparent) 1px, transparent 1px),
      linear-gradient(180deg, color-mix(in srgb, currentColor 5%, transparent) 1px, transparent 1px),
      radial-gradient(700px 420px at 75% 20%, color-mix(in srgb, var(--primary) 9%, transparent), transparent 72%);
    background-size: 72px 72px, 72px 72px, auto;
  }

  .bt-website-renderer[data-design-profile="trust_authority"] main > section#hero::after {
    content: "";
    position: absolute;
    width: clamp(13rem, 28vw, 28rem);
    aspect-ratio: 1;
    right: -8%;
    bottom: -18%;
    border-radius: 50%;
    border: 1px solid color-mix(in srgb, var(--primary) 20%, transparent);
    box-shadow: 0 0 0 4rem color-mix(in srgb, var(--primary) 3%, transparent), 0 0 0 8rem color-mix(in srgb, var(--primary) 2%, transparent);
    pointer-events: none;
    z-index: -1;
  }

  .bt-website-renderer[data-design-profile="trust_authority"] main > section#proof,
  .bt-website-renderer[data-design-profile="trust_authority"] main > section#benefits {
    background: #101827;
    color: #f8fafc;
  }

  .bt-website-renderer[data-design-profile="trust_authority"] main > section#proof p,
  .bt-website-renderer[data-design-profile="trust_authority"] main > section#benefits p {
    color: #cbd5e1;
  }

  .bt-website-renderer[data-design-profile="bold_contemporary"] main > section#hero::before {
    background:
      radial-gradient(680px 520px at 92% 10%, color-mix(in srgb, var(--primary) 20%, transparent), transparent 72%),
      linear-gradient(135deg, color-mix(in srgb, var(--secondary) 6%, transparent), transparent 55%);
  }

  .bt-website-renderer[data-design-profile="bold_contemporary"] main > section#hero h1 {
    max-width: 12ch;
    text-transform: uppercase;
    letter-spacing: -.075em !important;
  }

  .bt-website-renderer[data-design-profile="craft_organic"] main > section.bt-agency-section:nth-child(even) {
    background-color: #f7f3eb;
  }

  .bt-website-renderer[data-design-profile="craft_organic"] main > section.bt-agency-section img.bt-agency-image {
    border-radius: 2.4rem 1rem 2.8rem 1.2rem;
  }

  .bt-website-renderer[data-image-profile="documentary"] main > section img.bt-agency-image {
    filter: saturate(.88) contrast(1.02);
  }

  .bt-website-renderer[data-image-profile="editorial"] main > section img.bt-agency-image {
    filter: saturate(.9) contrast(1.05);
  }

  .bt-website-renderer[data-image-profile="organic"] main > section img.bt-agency-image {
    filter: saturate(.9) sepia(.04);
  }

  body[data-agency-public="true"] {
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  body[data-agency-public="true"] main h1,
  body[data-agency-public="true"] main h2 {
    text-wrap: balance;
    letter-spacing: -.045em;
  }

  body[data-agency-public="true"] main p {
    text-wrap: pretty;
  }

  @media (max-width: 767px) {
    .bt-website-renderer main > section.bt-agency-section {
      padding-block: clamp(4rem, 18vw, 6.5rem) !important;
    }

    .bt-website-renderer main > section#hero.bt-agency-section {
      min-height: auto;
      padding-top: 7.25rem !important;
    }

    .bt-website-renderer main > section#hero.bt-agency-section h1 {
      font-size: clamp(2.65rem, 14.2cqw, 4.6rem) !important;
      max-width: 12ch;
    }

    .bt-website-renderer main > section.bt-agency-section > .section-container,
    .bt-website-renderer main > section.bt-agency-section > div:not([aria-hidden="true"]) {
      width: min(calc(100% - 1.5rem), var(--bt-content-width, 82rem));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .bt-website-renderer main > section.bt-agency-section :is(.btn-primary, button, a[class*="btn"]):hover {
      transform: none !important;
    }
  }
`;

function ensureVisualSystemStyle() {
  let style = document.getElementById("bt-agency-visual-system") as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = "bt-agency-visual-system";
    style.textContent = VISUAL_SYSTEM_CSS;
    document.head.appendChild(style);
  }
  return style;
}

function isPlaceholderProof(section: HTMLElement) {
  const text = section.innerText.toLowerCase();
  const hits = PLACEHOLDER_PROOF.filter((marker) => text.includes(marker)).length;
  return hits >= 1 && /clear|professional|easy to trust|without pressure/.test(text);
}

function isGenericPricing(section: HTMLElement) {
  const text = section.innerText.toLowerCase();
  return (
    GENERIC_PRICING_MARKERS.every((marker) => text.includes(marker)) &&
    text.includes("custom") &&
    text.includes("enquire")
  );
}

export function AgencyVisualDirector() {
  useEffect(() => {
    ensureVisualSystemStyle();

    let lastPath = window.location.pathname;
    let trackedRenderer: HTMLElement | null = null;
    let cleanupCurrent: (() => void) | undefined;
    let timer = 0;

    const setup = () => {
      cleanupCurrent?.();
      document.body.dataset.agencyPublic = isPublicMarketingPath(window.location.pathname)
        ? "true"
        : "false";

      const renderer = document.querySelector<HTMLElement>(".bt-website-renderer");
      trackedRenderer = renderer;
      if (!renderer) {
        cleanupCurrent = undefined;
        return;
      }

      renderer.dataset.agencyEnhanced = "true";
      const cleanups: Array<() => void> = [];
      const sections = Array.from(renderer.querySelectorAll<HTMLElement>("main > section"));

      sections.forEach((section, index) => {
        const originalHidden = section.hidden;
        section.classList.add("bt-agency-section");
        section.dataset.sectionIndex = String(index + 1);
        section.dataset.sectionOrder = index % 2 === 0 ? "even" : "odd";
        section.dataset.sectionType = section.id || "section";

        if (section.id === "testimonials" && isPlaceholderProof(section)) {
          section.hidden = true;
          section.dataset.proofState = "placeholder-suppressed";
        }

        if (section.id === "pricing" && isGenericPricing(section)) {
          section.hidden = true;
          section.dataset.pricingState = "generic-suppressed";
        }

        cleanups.push(() => {
          section.classList.remove("bt-agency-section");
          delete section.dataset.sectionIndex;
          delete section.dataset.sectionOrder;
          delete section.dataset.sectionType;
          delete section.dataset.proofState;
          delete section.dataset.pricingState;
          section.hidden = originalHidden;
        });
      });

      const images = Array.from(renderer.querySelectorAll<HTMLImageElement>("main img"));
      images.forEach((image) => {
        const oldLoading = image.loading;
        const oldDecoding = image.decoding;
        image.classList.add("bt-agency-image");
        image.decoding = "async";
        if (!image.closest("#hero")) image.loading = "lazy";
        cleanups.push(() => {
          image.classList.remove("bt-agency-image");
          image.loading = oldLoading;
          image.decoding = oldDecoding;
        });
      });

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              (entry.target as HTMLElement).dataset.inView = "true";
              observer.unobserve(entry.target);
            }
          });
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.08 },
      );
      sections.filter((section) => !section.hidden).forEach((section) => observer.observe(section));
      cleanups.push(() => observer.disconnect());

      cleanupCurrent = () => cleanups.reverse().forEach((cleanup) => cleanup());
    };

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(setup, 100);
    };

    setup();

    const rootObserver = new MutationObserver(() => {
      const pathChanged = lastPath !== window.location.pathname;
      if (pathChanged) lastPath = window.location.pathname;
      const currentRenderer = document.querySelector<HTMLElement>(".bt-website-renderer");
      if (pathChanged || currentRenderer !== trackedRenderer) schedule();
    });

    rootObserver.observe(document.getElementById("root") || document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.clearTimeout(timer);
      rootObserver.disconnect();
      cleanupCurrent?.();
      delete document.body.dataset.agencyPublic;
    };
  }, []);

  return null;
}
