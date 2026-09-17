import { useEffect } from "react";

const PUBLIC_PATHS = [
  "/",
  "/pay-monthly-websites",
  "/website-subscription-service",
  "/website-design",
  "/portfolio",
  "/templates",
  "/pricing",
  "/how-it-works",
  "/case-studies",
  "/website-audit",
  "/generate-preview",
  "/blog",
  "/clinic-website-design-malaysia",
  "/renovation-contractor-website-design",
  "/beauty-salon-website-design",
  "/tuition-centre-website-design",
  "/consultant-website-design",
  "/demo",
  "/book-demo",
  "/proposal",
];

const isPublicMarketingPath = (pathname: string) =>
  PUBLIC_PATHS.some(
    (path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)),
  );

const isReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const isFinePointer = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: fine)").matches;

/**
 * Shared premium motion layer for Bennie Studio public and generated websites.
 *
 * The existing component-level Motion animations keep control of layout/UI state.
 * This director only adds non-conflicting art-direction details: scroll progress,
 * hero word reveals, ambient spotlight/parallax, and subtle CTA attraction.
 */
export function AgencyMotionDirector() {
  useEffect(() => {
    if (isReducedMotion()) return;

    let cleanupCurrent: (() => void) | undefined;
    let scheduled = 0;
    let lastPath = window.location.pathname;

    const setup = () => {
      cleanupCurrent?.();

      const renderer = document.querySelector<HTMLElement>(".bt-website-renderer");
      const isPublicPage = isPublicMarketingPath(window.location.pathname);
      const root = renderer || (isPublicPage ? document.body : null);
      if (!root) {
        cleanupCurrent = undefined;
        return;
      }

      const cleanups: Array<() => void> = [];
      const motionProfile = renderer?.dataset.motionProfile || "refined";
      const cinematic = motionProfile === "cinematic" || motionProfile === "expressive" || isPublicPage;

      // Thin scroll progress indicator. It reads as crafted, costs virtually nothing,
      // and never interferes with component transforms.
      const progress = document.createElement("div");
      progress.setAttribute("aria-hidden", "true");
      Object.assign(progress.style, {
        position: "fixed",
        zIndex: "2147483000",
        top: "0",
        left: "0",
        height: "2px",
        width: "100%",
        transform: "scaleX(0)",
        transformOrigin: "0 50%",
        background: renderer
          ? "linear-gradient(90deg, var(--primary), var(--secondary))"
          : "linear-gradient(90deg, #4f46e5, #8b5cf6)",
        pointerEvents: "none",
      });
      document.body.appendChild(progress);
      cleanups.push(() => progress.remove());

      const onScroll = () => {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        progress.style.transform = `scaleX(${Math.min(1, Math.max(0, window.scrollY / max))})`;
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanups.push(() => window.removeEventListener("scroll", onScroll));

      if (renderer) {
        // Ambient cursor spotlight. It adds depth without making content move.
        renderer.style.setProperty("--agency-pointer-x", "50%");
        renderer.style.setProperty("--agency-pointer-y", "25%");
        const spotlight = document.createElement("div");
        spotlight.setAttribute("aria-hidden", "true");
        Object.assign(spotlight.style, {
          position: "fixed",
          zIndex: "0",
          inset: "0",
          pointerEvents: "none",
          opacity: cinematic ? "0.32" : "0.18",
          background:
            "radial-gradient(520px circle at var(--agency-pointer-x) var(--agency-pointer-y), color-mix(in srgb, var(--primary) 13%, transparent), transparent 70%)",
          transition: "opacity 240ms ease",
        });
        renderer.prepend(spotlight);
        cleanups.push(() => spotlight.remove());

        const onPointerMove = (event: PointerEvent) => {
          renderer.style.setProperty("--agency-pointer-x", `${event.clientX}px`);
          renderer.style.setProperty("--agency-pointer-y", `${event.clientY}px`);
        };
        if (isFinePointer()) {
          window.addEventListener("pointermove", onPointerMove, { passive: true });
          cleanups.push(() => window.removeEventListener("pointermove", onPointerMove));
        }

        // Hero word reveal. The generated hero already renders words as spans, so we
        // can art-direct them without changing stored website content.
        const heroWords = Array.from(
          renderer.querySelectorAll<HTMLElement>("main > section:first-child h1 > span"),
        );
        heroWords.forEach((word, index) => {
          word.style.display = "inline-block";
          const animation = word.animate(
            [
              { opacity: 0, transform: "translate3d(0, 0.72em, 0)", filter: "blur(10px)" },
              { opacity: 1, transform: "translate3d(0, 0, 0)", filter: "blur(0px)" },
            ],
            {
              duration: cinematic ? 820 : 560,
              delay: 90 + index * (cinematic ? 58 : 38),
              easing: "cubic-bezier(.16,1,.3,1)",
              fill: "both",
            },
          );
          cleanups.push(() => animation.cancel());
        });

        // Decorative parallax only. Content and CTAs remain stable.
        const ambientNodes = Array.from(
          renderer.querySelectorAll<HTMLElement>(".gradient-blur"),
        );
        let raf = 0;
        const updateAmbient = () => {
          const y = window.scrollY;
          ambientNodes.forEach((node, index) => {
            const direction = index % 2 === 0 ? 1 : -1;
            const distance = Math.min(42, y * 0.025) * direction;
            node.style.translate = `0 ${distance}px`;
          });
          raf = 0;
        };
        const onAmbientScroll = () => {
          if (!raf) raf = requestAnimationFrame(updateAmbient);
        };
        if (cinematic) {
          window.addEventListener("scroll", onAmbientScroll, { passive: true });
          updateAmbient();
          cleanups.push(() => {
            window.removeEventListener("scroll", onAmbientScroll);
            if (raf) cancelAnimationFrame(raf);
            ambientNodes.forEach((node) => node.style.removeProperty("translate"));
          });
        }

        // Very small magnetic pull on primary CTAs for desktop pointers only.
        // The effect is intentionally capped so conversion controls never feel slippery.
        if (cinematic && isFinePointer()) {
          const buttons = Array.from(
            renderer.querySelectorAll<HTMLElement>(".btn-primary"),
          );
          buttons.forEach((button) => {
            const onMove = (event: PointerEvent) => {
              const rect = button.getBoundingClientRect();
              const x = ((event.clientX - rect.left) / rect.width - 0.5) * 6;
              const y = ((event.clientY - rect.top) / rect.height - 0.5) * 6;
              button.style.translate = `${x}px ${y}px`;
            };
            const onLeave = () => {
              button.style.translate = "0 0";
            };
            button.addEventListener("pointermove", onMove);
            button.addEventListener("pointerleave", onLeave);
            cleanups.push(() => {
              button.removeEventListener("pointermove", onMove);
              button.removeEventListener("pointerleave", onLeave);
              button.style.removeProperty("translate");
            });
          });
        }
      }

      cleanupCurrent = () => cleanups.reverse().forEach((cleanup) => cleanup());
    };

    const scheduleSetup = () => {
      window.clearTimeout(scheduled);
      scheduled = window.setTimeout(setup, 80);
    };

    setup();

    // React Router updates history without a full page reload. Watch DOM/path changes
    // so the premium layer follows public pages and generated previews safely.
    const observer = new MutationObserver(() => {
      const pathChanged = lastPath !== window.location.pathname;
      if (pathChanged) lastPath = window.location.pathname;
      if (pathChanged || (!cleanupCurrent && document.querySelector(".bt-website-renderer"))) {
        scheduleSetup();
      }
    });
    observer.observe(document.getElementById("root") || document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      window.clearTimeout(scheduled);
      observer.disconnect();
      cleanupCurrent?.();
    };
  }, []);

  return null;
}
