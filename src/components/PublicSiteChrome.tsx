import React from "react";
import { ExternalLink, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { BENNIE_ECOSYSTEM_LINKS } from "../constants/businessEcosystem";
import { trackPublicEvent } from "../lib/publicTracking";
import { Button } from "./ui/button";
import { usePublishedPlatformCms } from "../lib/platformSiteCms";

const publicNavItems = [
  { label: "Services", href: "/services" },
  { label: "Case Studies", href: "/case-studies" },
  { label: "Pricing", href: "/pricing" },
  { label: "How it works", href: "/how-it-works" },
  { label: "About", href: "/about" },
] as const;

const footerGroups = [
  ["Explore", [
    { label: "Website Services", href: "/services" },
    { label: "Case Studies", href: "/case-studies" },
    { label: "Pricing", href: "/pricing" },
    { label: "How it works", href: "/how-it-works" },
  ]],
  ["Resources", [
    { label: "Insights", href: "/resources" },
    { label: "Managed website vs DIY", href: "/managed-website-vs-diy" },
    { label: "Managed website vs agency", href: "/managed-website-vs-agency" },
    { label: "Website Review", href: "/website-audit" },
    { label: "Design Directions", href: "/templates" },
    { label: "Try a Website Direction", href: "/generate-preview" },
  ]],
  ["Company", [
    { label: "About Bennie Studio", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Discuss your website", href: "/book-demo" },
    { label: "One-time WordPress builds · SiteFoundry", href: "https://web.bennietay.com/#packages", external: true },
    { label: "Bennie Tay Insights", href: BENNIE_ECOSYSTEM_LINKS.find((link) => link.id === "main")?.url || "https://bennietay.com", external: true },
  ]],
  ["Legal", [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Cookie Policy", href: "/cookie-policy" },
    { label: "Terms of Service", href: "/terms" },
  ]],
] as const;

export function PublicSiteHeader() {
  const { user } = useAuth();
  const location = useLocation();
  const cms = usePublishedPlatformCms();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const primaryHref = user ? "/dashboard" : safePublicHref(cms.header.primaryCtaHref, location.pathname === "/generate-preview" ? "/pricing" : "/generate-preview");
  const primaryLabel = user ? "Open Studio" : cms.header.primaryCtaLabel || (location.pathname === "/generate-preview" ? "Compare website plans" : "Get a free website preview");
  const navigation = cms.header.navigation.length ? cms.header.navigation.filter((item) => item.label.trim() && safePublicHref(item.href, "").length).map((item) => ({ ...item, href: safePublicHref(item.href, "") })) : publicNavItems;
  const primaryExternal = /^https?:\/\//i.test(primaryHref);
  const mobileTriggerRef = React.useRef<HTMLButtonElement>(null);
  const mobileDialogRef = React.useRef<HTMLDivElement>(null);
  const mobileCloseRef = React.useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);
  const isActive = React.useCallback((href: string) =>
    href === "/" ? location.pathname === "/" : location.pathname === href || location.pathname.startsWith(`${href}/`),
  [location.pathname]);

  React.useEffect(() => {
    if (!mobileOpen) return;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : mobileTriggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobileCloseRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = mobileDialogRef.current;
      if (!dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter((element) => element.getClientRects().length > 0);
      if (!controls.length) { event.preventDefault(); dialog.focus(); return; }
      const first = controls[0];
      const last = controls[controls.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      const previous = previouslyFocusedRef.current;
      if (previous?.isConnected) previous.focus();
      else mobileTriggerRef.current?.focus();
    };
  }, [mobileOpen]);

  React.useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-[#e8eaf0] bg-white/94 shadow-[0_10px_30px_-28px_rgba(15,23,42,.45)] backdrop-blur-xl">
      <nav className="mx-auto flex h-[74px] w-[calc(100%-3rem)] max-w-[80rem] items-center justify-between gap-3 px-0 lg:w-[calc(100%-6rem)] lg:gap-4" aria-label="Main navigation">
        <Link to="/" className="group flex min-w-0 shrink items-center gap-3 text-[#0d1426]">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#1D4ED8] text-sm font-black text-white shadow-[0_10px_24px_-14px_rgba(87,70,232,.85)]">B</span>
          <span className="min-w-0">
            <span className="block max-w-[10rem] truncate text-[15px] font-semibold tracking-[-0.035em] sm:max-w-none">Bennie Studio</span>
            <span className="hidden text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500 xl:block">Websites that convert</span>
          </span>
        </Link>

        <div className="hidden items-center gap-4 xl:flex xl:gap-7">
          {navigation.map((item) => {
            const className = isActive(item.href) ? "relative py-2 text-sm font-semibold text-[#0d1426] after:absolute after:inset-x-0 after:-bottom-[19px] after:h-0.5 after:bg-[#1D4ED8]" : "py-2 text-sm font-semibold text-[#475569] transition hover:text-[#0d1426]";
            return /^https?:\/\//i.test(item.href)
              ? <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className={className}>{item.label}</a>
              : <Link key={item.href} to={item.href} aria-current={isActive(item.href) ? "page" : undefined} className={className}>{item.label}</Link>;
          })}
        </div>

        <div className="hidden items-center gap-3 xl:flex">
          {!user ? <Link to="/login" className="px-2 py-2 text-sm font-semibold text-[#475569] transition hover:text-[#1D4ED8]">Client login</Link> : null}
          {primaryExternal ? <a href={primaryHref} target="_blank" rel="noreferrer" onClick={() => trackPublicEvent({ eventType: "sales_cta_clicked", label: `Header ${primaryLabel}`, target: primaryHref })} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#1D4ED8] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(13,20,38,.8)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8]">{primaryLabel} <span className="ml-2">→</span></a> : <Link to={primaryHref} onClick={() => !user && trackPublicEvent({ eventType: "sales_cta_clicked", label: `Header ${primaryLabel}`, target: primaryHref })} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[#1D4ED8] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(13,20,38,.8)] transition hover:-translate-y-0.5 hover:bg-[#1D4ED8]">{primaryLabel} <span className="ml-2">→</span></Link>}
        </div>

        {!user && location.pathname !== "/generate-preview" ? (primaryExternal ? <a href={primaryHref} target="_blank" rel="noreferrer" className="ml-auto hidden min-h-10 sm:inline-flex items-center justify-center bg-[#1D4ED8] px-3 py-2 text-xs font-semibold text-white xl:hidden" onClick={() => trackPublicEvent({eventType:"sales_cta_clicked",label:`Mobile header ${primaryLabel}`,target:primaryHref})}>{primaryLabel} ↗</a> : <Link to={primaryHref} className="ml-auto hidden min-h-10 sm:inline-flex items-center justify-center bg-[#1D4ED8] px-3 py-2 text-xs font-semibold text-white xl:hidden" onClick={() => trackPublicEvent({eventType:"sales_cta_clicked",label:`Mobile header ${primaryLabel}`,target:primaryHref})}>{primaryLabel} ↗</Link>) : null}
        <Button ref={mobileTriggerRef} type="button" variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="shrink-0 xl:hidden" aria-label="Open navigation menu" aria-expanded={mobileOpen} aria-controls="public-mobile-navigation">
          <Menu className="h-5 w-5" />
        </Button>
      </nav>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[100] bg-[#07101f]/60 backdrop-blur-sm xl:hidden" onClick={() => setMobileOpen(false)}>
          <div ref={mobileDialogRef} tabIndex={-1} id="public-mobile-navigation" role="dialog" aria-modal="true" aria-label="Navigation menu" className="absolute right-0 top-0 flex h-dvh w-[min(92vw,390px)] flex-col bg-white p-6 shadow-2xl focus:outline-none" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#e5e7ef] pb-5">
              <span className="text-lg font-semibold tracking-[-0.03em] text-[#0d1426]">Bennie Studio</span>
              <Button ref={mobileCloseRef} type="button" variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close navigation menu"><X className="h-5 w-5" /></Button>
            </div>
            <div className="flex flex-col py-4">
              {navigation.map((item) => {
                const className = isActive(item.href) ? "border-b border-[#eceef3] py-4 text-lg font-semibold text-[#1D4ED8]" : "border-b border-[#eceef3] py-4 text-lg font-semibold text-[#0d1426]";
                return /^https?:\/\//i.test(item.href)
                  ? <a key={item.href} href={item.href} target="_blank" rel="noreferrer" onClick={() => setMobileOpen(false)} className={className}>{item.label}</a>
                  : <Link key={item.href} to={item.href} aria-current={isActive(item.href) ? "page" : undefined} onClick={() => setMobileOpen(false)} className={className}>{item.label}</Link>;
              })}
            </div>
            <div className="mt-auto grid gap-3 border-t border-[#e5e7ef] pt-5">
              {!user ? <Link to="/login" onClick={() => setMobileOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#cfd4df] px-5 text-sm font-semibold text-[#0d1426]">Client login</Link> : null}
              {primaryExternal ? <a href={primaryHref} target="_blank" rel="noreferrer" onClick={() => { trackPublicEvent({ eventType: "sales_cta_clicked", label: `Header ${primaryLabel}`, target: primaryHref }); setMobileOpen(false); }} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#1D4ED8] px-5 text-sm font-semibold text-white">{primaryLabel} →</a> : <Link to={primaryHref} onClick={() => { if (!user) trackPublicEvent({ eventType: "sales_cta_clicked", label: `Header ${primaryLabel}`, target: primaryHref }); setMobileOpen(false); }} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#1D4ED8] px-5 text-sm font-semibold text-white">{primaryLabel} →</Link>}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function safePublicHref(value: string | undefined, fallback: string) {
  const href = String(value || "").trim();
  return (href.startsWith("/") && !href.startsWith("//")) || /^https?:\/\//i.test(href) ? href : fallback;
}

export function PublicSiteFooter({ tagline, email, onManageCookies }: { tagline?: string; email?: string; onManageCookies?: () => void }) {
  const cms = usePublishedPlatformCms();
  const [publicIdentity, setPublicIdentity] = React.useState<any>(null);
  React.useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/site-config", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => setPublicIdentity(payload?.platform || null))
      .catch(() => null);
    return () => controller.abort();
  }, []);
  const supportEmail = email || publicIdentity?.supportEmail || "";
  const companyName = publicIdentity?.companyName || publicIdentity?.name || "Bennie Studio";
  const registrationNumber = publicIdentity?.companyRegistrationNumber || "";
  const businessAddress = publicIdentity?.businessAddress || "";
  const supportPhone = publicIdentity?.supportPhone || "";
  const footerTagline = cms.footer.tagline || tagline || "A strategic web studio helping service businesses look more credible, communicate more clearly and convert more visitors into enquiries.";
  const footerGroupsToRender = cms.footer.groups?.length ? cms.footer.groups : footerGroups.map(([title, links]) => ({ title, links }));

  return (
    <footer className="bg-[#0F172A] text-white">
      <div className="mx-auto grid max-w-[80rem] gap-10 px-6 py-16 sm:px-10 md:grid-cols-2 lg:grid-cols-4 lg:px-12 lg:py-20">
        <div className="lg:col-span-4">
          <Link to="/" className="mb-5 inline-flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#1D4ED8] text-sm font-black">B</span>
            <span>
              <span className="block text-lg font-semibold tracking-[-0.035em]">Bennie Studio</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-slate-300">Websites that convert</span>
            </span>
          </Link>
          <p className="max-w-md text-sm font-medium leading-7 text-slate-300">{footerTagline}</p>
          <div className="mt-5 space-y-1 text-sm font-semibold text-slate-300">
            {companyName ? <p className="text-slate-300">{companyName}</p> : null}
            {registrationNumber ? <p>Registration: {registrationNumber}</p> : null}
            {businessAddress ? <p className="max-w-sm">{businessAddress}</p> : null}
            {supportEmail ? <a href={`mailto:${supportEmail}`} className="inline-flex font-semibold text-blue-200 hover:text-white">Contact: {supportEmail}</a> : null}
            {supportPhone ? <p><a href={`tel:${supportPhone.replace(/\s+/g, "")}`} className="hover:text-white">{supportPhone}</a></p> : null}
          </div>
        </div>
        {footerGroupsToRender.map((group: any, groupIndex: number) => (
          <div key={`${groupIndex}-${group.title}`}>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">{group.title}</p>
            <div className="space-y-3">
              {group.links.filter((link: any) => link.label?.trim() && safePublicHref(link.href, "")).map((link: any, linkIndex: number) => /^https?:\/\//i.test(safePublicHref(link.href, "")) ? (
                <a key={`${linkIndex}-${link.href}`} href={safePublicHref(link.href, "#")} target="_blank" rel="noreferrer" onClick={() => trackPublicEvent({ eventType: "ecosystem_link_clicked", label: `Footer ${link.label}`, target: link.href })} className="flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white">{link.label}<ExternalLink className="h-3 w-3" /></a>
              ) : (
                <Link key={`${linkIndex}-${link.href}`} to={safePublicHref(link.href, "#")} className="block text-sm font-semibold text-white/60 hover:text-white">{link.label}</Link>
              ))}
              {group.title === "Legal" && onManageCookies ? <button type="button" onClick={onManageCookies} className="block text-left text-sm font-semibold text-white/60 hover:text-white">Manage Cookies</button> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[88rem] flex-col gap-2 px-6 py-6 text-xs font-semibold text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-12">
          <span>{cms.footer.copyrightText || `© ${new Date().getFullYear()} Bennie Studio. All rights reserved.`}</span>
          <span>Designed around real businesses, not generic templates.</span>
        </div>
      </div>
    </footer>
  );
}
