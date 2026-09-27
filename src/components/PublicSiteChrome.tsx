import React from "react";
import { ExternalLink, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { BENNIE_ECOSYSTEM_LINKS } from "../constants/businessEcosystem";
import { trackPublicEvent } from "../lib/publicTracking";
import { Button } from "./ui/button";

const publicNavItems = [
  { label: "System", href: "/how-it-works" },
  { label: "Work", href: "/case-studies" },
  { label: "Pricing", href: "/pricing" },
  {
    label: "Insights",
    href: BENNIE_ECOSYSTEM_LINKS.find((link) => link.id === "main")?.url || "https://bennietay.com",
    external: true,
  },
];

const footerGroups = [
  ["Platform", [
    { label: "Website System", href: "/how-it-works" },
    { label: "Website Work", href: "/case-studies" },
    { label: "Pricing", href: "/pricing" },
    { label: "Generate Preview", href: "/generate-preview" },
    { label: "Insights", href: BENNIE_ECOSYSTEM_LINKS.find((link) => link.id === "main")?.url || "https://bennietay.com", external: true },
  ]],
  ["Industries", [
    { label: "Professional Services", href: "/professional-services-website-design" },
    { label: "Clinics & Healthcare", href: "/clinic-website-design" },
    { label: "Contractors", href: "/renovation-contractor-website-design" },
    { label: "Education", href: "/tuition-centre-website-design" },
  ]],
  ["Legal", [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Cookie Policy", href: "/cookie-policy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Subprocessor List", href: "/subprocessors" },
    { label: "Acceptable Use", href: "/acceptable-use-policy" },
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
    <header className="sticky top-0 z-50 border-b border-[#dfe2ea] bg-white/92 backdrop-blur-xl">
      <nav className="mx-auto flex h-[72px] max-w-[92rem] items-center justify-between gap-3 px-4 sm:gap-5 sm:px-8 lg:px-14" aria-label="Main navigation">
        <Link to="/" className="flex min-w-0 shrink items-center gap-3 text-[#10131c]">
          <span className="grid h-9 w-9 place-items-center bg-[#5b4bff] text-sm font-black text-white">B.</span>
          <span className="min-w-0"><span className="block max-w-[10rem] truncate text-base font-semibold tracking-[-0.035em] sm:max-w-none">Bennie Studio</span><span className="hidden text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 xl:block">Managed website system</span></span>
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {publicNavItems.map((item) => item.external ? (
            <a key={item.href} href={item.href} target="_blank" rel="noreferrer" onClick={() => trackPublicEvent({ eventType: "ecosystem_link_clicked", label: `Header ${item.label}`, target: item.href })} className="text-sm font-semibold text-black/50 transition hover:text-[#5b4bff]">
              {item.label}
            </a>
          ) : (
            <Link
              key={item.href}
              to={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={isActive(item.href) ? "text-sm font-semibold text-[#141821]" : "text-sm font-semibold text-black/50 transition hover:text-[#5b4bff]"}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-4 lg:flex">
          <Link to={user ? "/dashboard" : "/login"} className="text-sm font-semibold text-black/50 transition hover:text-[#5b4bff]">
            {user ? "Dashboard" : "Client login"}
          </Link>
          <Link to={user ? "/dashboard" : "/generate-preview"} onClick={() => !user && trackPublicEvent({ eventType: "click_generate_preview", label: "Header Preview", target: "/generate-preview" })} className="inline-flex min-h-11 items-center justify-center bg-[#10131c] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#5b4bff]">
            {user ? "Open Studio" : "Generate preview"}
          </Link>
        </div>

        <Button type="button" variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="shrink-0 lg:hidden" aria-label="Open navigation menu" aria-expanded={mobileOpen} aria-controls="public-mobile-navigation">
          <Menu className="h-5 w-5" />
        </Button>
      </nav>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[100] bg-[#0c1224]/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
          <div id="public-mobile-navigation" role="dialog" aria-modal="true" aria-label="Navigation menu" className="absolute right-0 top-0 flex h-dvh w-[min(90vw,360px)] flex-col bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#dfe2ea] pb-5">
              <span className="text-lg font-semibold tracking-[-0.03em] text-[#10131c]">Bennie Studio</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close navigation menu"><X className="h-5 w-5" /></Button>
            </div>
            <div className="flex flex-col py-5">
              {publicNavItems.map((item) => item.external ? (
                <a key={item.href} href={item.href} target="_blank" rel="noreferrer" onClick={() => setMobileOpen(false)} className="border-b border-[#dfe2ea] py-4 text-lg font-semibold text-[#10131c]">{item.label}</a>
              ) : (
                <Link key={item.href} to={item.href} aria-current={isActive(item.href) ? "page" : undefined} onClick={() => setMobileOpen(false)} className={isActive(item.href) ? "border-b border-[#dfe2ea] py-4 text-lg font-semibold text-[#5746e8]" : "border-b border-[#dfe2ea] py-4 text-lg font-semibold text-[#10131c]"}>{item.label}</Link>
              ))}
            </div>
            <div className="mt-auto grid gap-3 border-t border-[#dfe2ea] pt-5">
              <Link to={user ? "/dashboard" : "/login"} onClick={() => setMobileOpen(false)} className="inline-flex min-h-11 items-center justify-center border border-[#10131c] px-5 text-sm font-bold text-[#10131c]">{user ? "Dashboard" : "Client login"}</Link>
              <Link to={user ? "/dashboard" : "/generate-preview"} onClick={() => setMobileOpen(false)} className="inline-flex min-h-12 items-center justify-center bg-[#10131c] px-5 text-sm font-black text-white">{user ? "Open Studio" : "Generate preview"}</Link>
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
    <footer className="bg-[#0c1224] text-white">
      <div className="mx-auto grid max-w-[90rem] gap-10 px-6 py-16 sm:px-10 md:grid-cols-2 lg:grid-cols-5 lg:px-16 lg:py-20">
        <div className="lg:col-span-2">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center bg-[#5b4bff] text-sm font-black">B.</span>
            <span className="text-xl font-semibold tracking-[-0.035em]">Bennie Studio</span>
          </div>
          <p className="max-w-sm text-sm font-medium leading-7 text-white/70">{tagline || "A managed website system for service businesses that need stronger trust, clearer enquiries, and a site that stays useful after launch."}</p>
          <div className="mt-5 space-y-1 text-sm font-semibold text-white/65">
            {companyName ? <p className="text-white/80">{companyName}</p> : null}
            {registrationNumber ? <p>Registration: {registrationNumber}</p> : null}
            {businessAddress ? <p className="max-w-sm">{businessAddress}</p> : null}
            {supportEmail ? <a href={`mailto:${supportEmail}`} className="inline-flex font-black text-[#aaa0ff] hover:text-white">Contact: {supportEmail}</a> : null}
            {supportPhone ? <p><a href={`tel:${supportPhone.replace(/\s+/g, "")}`} className="hover:text-white">{supportPhone}</a></p> : null}
          </div>
        </div>
        {footerGroups.map(([title, links]) => (
          <div key={title}>
            <p className="mb-4 text-[9px] font-black uppercase tracking-[0.22em] text-white/70">{title}</p>
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
      <div className="border-t border-white/10 px-6 py-6 text-center text-xs font-semibold text-white/70">© {new Date().getFullYear()} Bennie Studio. All rights reserved.</div>
    </footer>
  );
}
