import { SITE_MOTION_SETTINGS, resolveSiteMotionProfile } from "./siteMotionProfiles";
/** Progressive enhancement: no hidden content, layout hijacking, or perpetual animations. */
export function attachSiteMotion(root: HTMLElement, value: string, options: { publicPage?: boolean; progress?: boolean } = {}) {
  const profile = resolveSiteMotionProfile(value);
  const settings = SITE_MOTION_SETTINGS[profile];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  let stop: (() => void) | undefined;
  const start = () => {
    stop?.(); stop = undefined;
    if (reduce.matches || profile === "none") return;
    root.dataset.btMotion = profile;
    const cleanups: (() => void)[] = [];
    const animations = new Set<Animation>();
    const observed = new WeakSet<Element>();
    let frame = 0;
    const selector = options.publicPage
      ? "main h1, main h2, main .c26-value-item, main .sfn-timeline-item, main .sfn-work-card, main .sfn-signature-window, main [data-testid='portfolio-card'], main .c27-plan-card"
      : "main h1, main h2, main h3";
    const reveal = (node: HTMLElement) => {
      if (!node.animate || node.closest("form, dialog, [role='dialog'], [aria-hidden='true'], [hidden]")) return;
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const isTitle = node.tagName === "H1";
      const distance = isTitle ? Math.min(6, settings.distance) : settings.distance;
      const index = node.matches(".sfn-timeline-item, .c26-value-item, .sfn-work-card")
        ? Array.from(node.parentElement?.children || []).indexOf(node) : 0;
      // Additive translate avoids replacing renderer-owned transforms; title remains visible.
      const animation = node.animate(
        [{ translate: "0 " + distance + "px", opacity: isTitle ? 1 : .88 }, { translate: "0 0px", opacity: 1 }],
        { duration: settings.duration, delay: Math.min(3, Math.max(0,index)) * settings.stagger, easing: "cubic-bezier(.16,1,.3,1)" },
      );
      animations.add(animation);
      animation.onfinish = animation.oncancel = () => animations.delete(animation);
    };
    const intersection = typeof IntersectionObserver === "undefined" ? undefined : new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        intersection?.unobserve(entry.target);
        reveal(entry.target as HTMLElement);
      }
    }, { threshold: 0.12 });
    const scan = () => {
      frame = 0;
      root.querySelectorAll<HTMLElement>(selector).forEach(node => {
        if (observed.has(node) || node.closest("form, dialog, [role='dialog'], [hidden]")) return;
        if (options.publicPage && node.closest(".bt-website-renderer")) return;
        const rect = node.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        observed.add(node);
        if (node.tagName === "H1" || !intersection) reveal(node);
        else intersection.observe(node);
      });
    };
    const observer = new MutationObserver(() => { if (!frame) frame = requestAnimationFrame(scan); });
    observer.observe(root, { childList: true, subtree: true });
    scan();
    cleanups.push(() => { observer.disconnect(); intersection?.disconnect(); if (frame) cancelAnimationFrame(frame); animations.forEach(animation => animation.cancel()); });
    if (options.progress) {
      const progress = document.createElement("div");
      progress.className = "bt-motion-reading-progress";
      progress.setAttribute("aria-hidden", "true");
      if (!options.publicPage) progress.style.background = "linear-gradient(90deg," + (getComputedStyle(root).getPropertyValue("--primary").trim() || "#1741ed") + ",#8b5cf6)";
      document.body.appendChild(progress);
      let scrollFrame = 0;
      const update = () => {
        scrollFrame = 0;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = "scaleX(" + (max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0) + ")";
      };
      const onScroll = () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(update); };
      update();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      cleanups.push(() => { progress.remove(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (scrollFrame) cancelAnimationFrame(scrollFrame); });
    }
    if (settings.spotlight && fine.matches) {
      let active: HTMLElement | null = null;
      let pointerFrame = 0;
      let x = 0, y = 0;
      const targetSelector = options.publicPage ? ".sfn-signature-canvas, .sfn-work-art" : "main article";
      const clear = () => {
        active?.removeAttribute("data-bt-motion-spot");
        active?.style.removeProperty("--bt-spot-x");
        active?.style.removeProperty("--bt-spot-y");
        active = null;
      };
      const move = (event: PointerEvent) => {
        const target = event.target instanceof Element ? event.target.closest<HTMLElement>(targetSelector) : null;
        if (target !== active) { clear(); if (target && root.contains(target)) active = target; }
        if (!active) return;
        x = event.clientX; y = event.clientY;
        if (!pointerFrame) pointerFrame = requestAnimationFrame(() => {
          pointerFrame = 0;
          if (!active) return;
          const rect = active.getBoundingClientRect();
          active.style.setProperty("--bt-spot-x", (x - rect.left) + "px");
          active.style.setProperty("--bt-spot-y", (y - rect.top) + "px");
          active.setAttribute("data-bt-motion-spot", "");
        });
      };
      root.addEventListener("pointermove", move, { passive: true });
      root.addEventListener("pointerleave", clear);
      cleanups.push(() => { root.removeEventListener("pointermove", move); root.removeEventListener("pointerleave", clear); if (pointerFrame) cancelAnimationFrame(pointerFrame); clear(); });
    }
    stop = () => { cleanups.reverse().forEach(cleanup => cleanup()); delete root.dataset.btMotion; };
  };
  start();
  reduce.addEventListener("change", start);
  return () => { reduce.removeEventListener("change", start); stop?.(); };
}
