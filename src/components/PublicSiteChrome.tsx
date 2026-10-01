import React from "react";
import { ExternalLink, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { BENNIE_ECOSYSTEM_LINKS } from "../constants/businessEcosystem";
import { trackPublicEvent } from "../lib/publicTracking";
import { Button } from "./ui/button";

const publicNavItems = [
  { label: "Explore", href: "/services" },
  { label: "Work", href: "/case-studies" },
  { label: "Pricing", href: "/pricing" },
  { label: "Insights", href: "/resources" },
] as const;

const footerGroups = [
  ["Explore", [
    { label: "Website Services", href: "/services" },
    { label: "Work", href: "/case-studies" },
    { label: "Pricing", href: "/pricing" },
    { label: "How it works", href: "/how-it-works" },
  ]],
  ["Resources", [
    { label: "Insights", href: "/resources" },
    { label: "Website Audit", href: "/website-audit" },
    { label: "Website Directions", href: "/templates" },
    { label: "Free Website Preview", href: "/generate-preview" },
  ]],
  ["Company", [
    { label: "About Bennie Studio", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Book a review", href: "/book-demo" },
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
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isActive = React.useCallback((href: string) =>
    href === "/" ? location.pathname === "/" : location.pathname === href || location.pathname.startsWith(`${href}/`),
  [location.pathname]);

  React.useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-[#e8eaf0] bg-white/94 shadow-[0_10px_30px_-28px_rgba(15,23,42,.45)] backdrop-blur-xl">
      <nav className="mx-auto flex h-[74px] max-w-[88rem] items-center justify-between gap-4 px-4 sm:px-8 lg:px-12" aria-label="Main navigation">
        <Link to="/" className="group flex min-w-0 shrink items-center gap-3 text-[#0d1426]">
          <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-gradient-to-br from-[#6e5bff] to-[#4d3ef0] text-sm font-black text-white shadow-[0_10px_24px_-14px_rgba(87,70,232,.85)]">B</span>
          <span className="min-w-0">
            <span className="block max-w-[10rem] truncate text-[15px] font-semibold tracking-[-0.035em] sm:max-w-none">Bennie Studio</span>
            <span className="hidden text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500 xl:block">Websites that convert</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 xl:flex">
          {publicNavItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={isActive(item.href)
                ? "relative py-2 text-sm font-semibold text-[#0d1426] after:absolute after:inset-x-0 after:-bottom-[19px] after:h-0.5 after:bg-[#6554f5]"
                : "py-2 text-sm font-semibold text-[#697386] transition hover:text-[#0d1426]"}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 xl:flex">
          <Link to={user ? "/dashboard" : "/login"} className="px-2 py-2 text-sm font-semibold text-[#697386] transition hover:text-[#5b4bff]">
            {user ? "Dashboard" : "Client login"}
          </Link>
          <Link
            to={user ? "/dashboard" : "/generate-preview"}
            onClick={() => !user && trackPublicEvent({ eventType: "click_generate_preview", label: "Header Free Preview", target: "/generate-preview" })}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0d1426] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(13,20,38,.8)] transition hover:-translate-y-0.5 hover:bg-[#5746e8]"
          >
            {user ? "Open Studio" : "Get my free preview"} <span className="ml-2">→</span>
          </Link>
        </div>

        <Button type="button" variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="shrink-0 xl:hidden" aria-label="Open navigation menu" aria-expanded={mobileOpen} aria-controls="public-mobile-navigation">
          <Menu className="h-5 w-5" />
        </Button>
      </nav>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[100] bg-[#07101f]/60 backdrop-blur-sm xl:hidden" onClick={() => setMobileOpen(false)}>
          <div id="public-mobile-navigation" role="dialog" aria-modal="true" aria-label="Navigation menu" className="absolute right-0 top-0 flex h-dvh w-[min(92vw,390px)] flex-col bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#e5e7ef] pb-5">
              <span className="text-lg font-semibold tracking-[-0.03em] text-[#0d1426]">Bennie Studio</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close navigation menu"><X className="h-5 w-5" /></Button>
            </div>
            <div className="flex flex-col py-4">
              {publicNavItems.map((item) => (
                <Link key={item.href} to={item.href} aria-current={isActive(item.href) ? "page" : undefined} onClick={() => setMobileOpen(false)} className={isActive(item.href) ? "border-b border-[#eceef3] py-4 text-lg font-semibold text-[#5746e8]" : "border-b border-[#eceef3] py-4 text-lg font-semibold text-[#0d1426]"}>{item.label}</Link>
              ))}
            </div>
            <div className="mt-auto grid gap-3 border-t border-[#e5e7ef] pt-5">
              <Link to={user ? "/dashboard" : "/login"} onClick={() => setMobileOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#cfd4df] px-5 text-sm font-semibold text-[#0d1426]">{user ? "Dashboard" : "Client login"}</Link>
              <Link to={user ? "/dashboard" : "/generate-preview"} onClick={() => setMobileOpen(false)} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0d1426] px-5 text-sm font-semibold text-white">{user ? "Open Studio" : "Get my free preview"} →</Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function PublicSiteFooter({ tagline, email, onManageCookies }: { tagline?: string; email?: string; onManageCookies?: () => void }) {
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

  return (
    <footer className="bg-[#08101f] text-white">
      <div className="mx-auto grid max-w-[88rem] gap-10 px-6 py-16 sm:px-10 md:grid-cols-2 lg:grid-cols-5 lg:px-12 lg:py-20">
        <div className="lg:col-span-2">
          <Link to="/" className="mb-5 inline-flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-[#6554f5] text-sm font-black">B</span>
            <span>
              <span className="block text-lg font-semibold tracking-[-0.035em]">Bennie Studio</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.16em] text-white/45">Websites that convert</span>
            </span>
          </Link>
          <p className="max-w-md text-sm font-medium leading-7 text-white/65">{tagline || "A strategic web studio helping service businesses look more credible, communicate more clearly and convert more visitors into enquiries."}</p>
          <div className="mt-5 space-y-1 text-sm font-semibold text-white/55">
            {companyName ? <p className="text-white/75">{companyName}</p> : null}
            {registrationNumber ? <p>Registration: {registrationNumber}</p> : null}
            {businessAddress ? <p className="max-w-sm">{businessAddress}</p> : null}
            {supportEmail ? <a href={`mailto:${supportEmail}`} className="inline-flex font-semibold text-[#b9b1ff] hover:text-white">Contact: {supportEmail}</a> : null}
            {supportPhone ? <p><a href={`tel:${supportPhone.replace(/\s+/g, "")}`} className="hover:text-white">{supportPhone}</a></p> : null}
          </div>
        </div>
        {footerGroups.map(([title, links]) => (
          <div key={title}>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">{title}</p>
            <div className="space-y-3">
              {links.map((link) => "external" in link && link.external ? (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer" onClick={() => trackPublicEvent({ eventType: "ecosystem_link_clicked", label: `Footer ${link.label}`, target: link.href })} className="flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white">{link.label}<ExternalLink className="h-3 w-3" /></a>
              ) : (
                <Link key={link.href} to={link.href} className="block text-sm font-semibold text-white/60 hover:text-white">{link.label}</Link>
              ))}
              {title === "Legal" && onManageCookies ? <button type="button" onClick={onManageCookies} className="block text-left text-sm font-semibold text-white/60 hover:text-white">Manage Cookies</button> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[88rem] flex-col gap-2 px-6 py-6 text-xs font-semibold text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-12">
          <span>© {new Date().getFullYear()} Bennie Studio. All rights reserved.</span>
          <span>Designed around real businesses, not generic templates.</span>
        </div>
      </div>
    </footer>
  );
}
