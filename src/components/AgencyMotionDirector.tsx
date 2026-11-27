import { useEffect, type RefObject } from "react";
import { useLocation } from "react-router-dom";
import { attachSiteMotion } from "../lib/siteMotion";
import "../styles/siteMotion.css";
const PUBLIC_PATHS = [
  "/", "/pay-monthly-websites", "/website-subscription-service", "/website-design",
  "/services", "/about", "/resources", "/contact", "/portfolio", "/templates",
  "/pricing", "/how-it-works", "/case-studies", "/website-audit", "/generate-preview",
  "/blog", "/clinic-website-design", "/clinic-website-design-malaysia", "/dental-clinics",
  "/renovation-contractor-website-design", "/beauty-salon-website-design",
  "/tuition-centre-website-design", "/consultant-website-design",
  "/professional-services-website-design", "/accounting-firm-website-design",
  "/local-service-website-design", "/managed-website-vs-diy", "/managed-website-vs-agency",
  "/demo", "/book-demo",
];
export const isPublicMarketingPath = (pathname: string) =>
  PUBLIC_PATHS.some(path => pathname === path || (path !== "/" && pathname.startsWith(path + "/")));
export function AgencyMotionDirector() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!isPublicMarketingPath(pathname)) return;
    let cleanup: (() => void) | undefined;
    let frame = 0;
    const sync = () => {
      frame = 0;
      const client = document.querySelector(".bt-website-renderer");
      if (client) { cleanup?.(); cleanup = undefined; return; }
      if (!cleanup && document.querySelector("main"))
        cleanup = attachSiteMotion(document.body, "expressive", { publicPage: true, progress: true });
    };
    const observer = new MutationObserver(() => { if (!frame) frame = requestAnimationFrame(sync); });
    observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
    sync();
    return () => { observer.disconnect(); if (frame) cancelAnimationFrame(frame); cleanup?.(); };
  }, [pathname]);
  return null;
}
/** Each client renderer owns its motion, including editor preview and published pages. */
export function ClientSiteMotion({ rootRef, profile, pageKey, embedded }: {
  rootRef: RefObject<HTMLDivElement | null>; profile: string; pageKey: string; embedded: boolean;
}) {
  useEffect(() => {
    // Parent refs are attached during commit; defer to the next frame for nested previews.
    let cleanup: (() => void) | undefined;
    const frame = requestAnimationFrame(() => {
      if (rootRef.current) cleanup = attachSiteMotion(rootRef.current, profile, { progress: !embedded });
    });
    return () => { cancelAnimationFrame(frame); cleanup?.(); };
  }, [rootRef, profile, pageKey, embedded]);
  return null;
}
