import React from "react";
import { ExternalLink, Globe, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { BENNIE_ECOSYSTEM_LINKS } from "../constants/businessEcosystem";
import { trackPublicEvent } from "../lib/publicTracking";
import { Button } from "./ui/button";

const publicNavItems = [
  {
    label: "Main Site",
    href: BENNIE_ECOSYSTEM_LINKS.find((link) => link.id === "main")?.url || "https://bennietay.com",
    external: true,
  },
  { label: "Case Studies", href: "/case-studies" },
  { label: "Pricing", href: "/pricing" },
  { label: "Website Review", href: "/website-audit" },
];

const footerGroups = [
  ["Pages", [...publicNavItems, { label: "Generate Preview", href: "/generate-preview" }]],
  ["Services", [
    { label: "Managed Lead Website Plans", href: "/pricing" },
    { label: "Custom Website", href: "/apply-custom" },
    { label: "Website Case Studies", href: "/case-studies" },
  ]],
  ["Ecosystem", BENNIE_ECOSYSTEM_LINKS.map((link) => ({ label: link.shortLabel, href: link.url, external: true }))],
  ["Local SEO", [
    { label: "UK Website Subscription", href: "/website-subscription-service/uk" },
    { label: "Malaysia Website Subscription", href: "/website-subscription-service/malaysia" },
    { label: "Singapore Website Subscription", href: "/website-subscription-service/singapore" },
    { label: "Website Design London", href: "/website-design/london" },
    { label: "Website Design Petaling Jaya", href: "/website-design/petaling-jaya" },
    { label: "Website Design Orchard", href: "/website-design/singapore/orchard" },
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
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4" aria-label="Main navigation">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-slate-950">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <Globe className="h-5 w-5" />
          </span>
          <span className="text-lg font-black tracking-tight">Bennie Studio</span>
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          {publicNavItems.map((item) => item.external ? (
            <a key={item.href} href={item.href} target="_blank" rel="noreferrer" onClick={() => trackPublicEvent({ eventType: "ecosystem_link_clicked", label: `Header ${item.label}`, target: item.href })} className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 transition hover:text-indigo-600">
              {item.label}
            </a>
          ) : (
            <Link key={item.href} to={item.href} className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 transition hover:text-indigo-600">
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link to={user ? "/dashboard" : "/login"} className="px-2 text-sm font-bold text-slate-600 transition hover:text-indigo-600">
            {user ? "Dashboard" : "Sign In"}
          </Link>
          <Link to={user ? "/dashboard" : "/website-audit"} onClick={() => !user && trackPublicEvent({ eventType: "click_website_review", label: "Header Website Review", target: "/website-audit" })} className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-[0_10px_24px_-14px_rgba(15,23,42,0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-600 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20">
            {user ? "Open Studio" : "Get Website Review"}
          </Link>
        </div>

        <Button type="button" variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="lg:hidden" aria-label="Open navigation menu">
          <Menu className="h-5 w-5" />
        </Button>
      </nav>

      {mobileOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute right-0 top-0 flex h-dvh w-[min(88vw,340px)] flex-col bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <span className="font-black text-slate-950">Bennie Studio</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close navigation menu"><X className="h-5 w-5" /></Button>
            </div>
            <div className="flex flex-col gap-1 py-5">
              {publicNavItems.map((item) => item.external ? (
                <a key={item.href} href={item.href} target="_blank" rel="noreferrer" onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 text-base font-bold text-slate-800 hover:bg-slate-50 hover:text-indigo-600">{item.label}</a>
              ) : (
                <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 text-base font-bold text-slate-800 hover:bg-slate-50 hover:text-indigo-600">{item.label}</Link>
              ))}
            </div>
            <div className="mt-auto grid gap-3 border-t border-slate-100 pt-5">
              <Link to={user ? "/dashboard" : "/login"} onClick={() => setMobileOpen(false)} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 shadow-sm hover:bg-slate-50">{user ? "Dashboard" : "Sign In"}</Link>
              <Link to={user ? "/dashboard" : "/website-audit"} onClick={() => setMobileOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-600">{user ? "Open Studio" : "Get Website Review"}</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function PublicSiteFooter({ tagline, email, onManageCookies }: { tagline?: string; email?: string; onManageCookies?: () => void }) {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-2 lg:grid-cols-6">
        <div>
          <div className="mb-3 flex items-center gap-2 font-black text-slate-950"><Globe className="h-5 w-5 text-indigo-600" />Bennie Studio</div>
          <p className="text-sm font-semibold leading-6 text-slate-600">{tagline || "Managed lead-generation websites and custom website builds for small businesses that need more enquiries, trust, and local visibility."}</p>
          {email && <a href={`mailto:${email}`} className="mt-4 inline-flex text-sm font-black text-indigo-600 hover:text-indigo-700">Contact us</a>}
        </div>
        {footerGroups.map(([title, links]) => (
          <div key={title}>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">{title}</p>
            <div className="space-y-2">
              {links.map((link) => "external" in link && link.external ? (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer" onClick={() => trackPublicEvent({ eventType: "ecosystem_link_clicked", label: `Footer ${link.label}`, target: link.href })} className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600">{link.label}<ExternalLink className="h-3 w-3" /></a>
              ) : (
                <Link key={link.href} to={link.href} className="block text-sm font-bold text-slate-600 hover:text-indigo-600">{link.label}</Link>
              ))}
              {title === "Legal" && onManageCookies && <button type="button" onClick={onManageCookies} className="block text-left text-sm font-bold text-slate-600 hover:text-indigo-600">Manage Cookies</button>}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 px-5 py-5 text-center text-xs font-bold text-slate-500">© {new Date().getFullYear()} Bennie Studio. All rights reserved.</div>
    </footer>
  );
}
