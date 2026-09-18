import React from "react";
import { ExternalLink, Globe, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { BENNIE_ECOSYSTEM_LINKS } from "../constants/businessEcosystem";
import { trackPublicEvent } from "../lib/publicTracking";
import { Button } from "./ui/button";
import { COMMERCIAL_MARKETS, COMMERCIAL_MARKET_CHANGED_EVENT, CommercialMarket, getStoredMarket, normalizeCommercialMarket, persistCommercialMarket } from "../lib/commercialPricing";

function MarketSwitcher({ compact = false }: { compact?: boolean }) {
  const location = useLocation();
  const [market, setMarket] = React.useState<CommercialMarket>(getStoredMarket());

  React.useEffect(() => {
    const requestedMarket = new URLSearchParams(location.search).get("market");
    if (requestedMarket) setMarket(normalizeCommercialMarket(requestedMarket));
  }, [location.search]);

  React.useEffect(() => {
    const onMarketChanged = (event: Event) => {
      const next = (event as CustomEvent<string>).detail;
      setMarket(normalizeCommercialMarket(next));
    };
    window.addEventListener(COMMERCIAL_MARKET_CHANGED_EVENT, onMarketChanged);
    return () => window.removeEventListener(COMMERCIAL_MARKET_CHANGED_EVENT, onMarketChanged);
  }, []);

  React.useEffect(() => { persistCommercialMarket(market); }, [market]);

  const changeMarket = (value: string) => {
    const next = normalizeCommercialMarket(value);
    setMarket(next);
    persistCommercialMarket(next);
    window.dispatchEvent(new CustomEvent(COMMERCIAL_MARKET_CHANGED_EVENT, { detail: next }));
  };

  return <label className={compact ? "flex items-center gap-2 text-xs font-bold text-slate-500" : "flex items-center gap-3 text-sm font-bold text-slate-600"}>
    <span className={compact ? "sr-only" : ""}>Pricing market</span>
    <select aria-label="Pricing market" value={market} onChange={(event) => changeMarket(event.target.value)} className="w-[min(100%,145px)] max-w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 font-black text-slate-900 shadow-sm transition hover:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/10">
      {Object.entries(COMMERCIAL_MARKETS).map(([value, item]) => <option key={value} value={value}>{item.currency} · {item.label}</option>)}
    </select>
  </label>;
}

const publicNavItems = [
  { label: "Work", href: "/case-studies" },
  { label: "Pricing", href: "/pricing" },
  { label: "How It Works", href: "/how-it-works" },
  {
    label: "Insights",
    href: BENNIE_ECOSYSTEM_LINKS.find((link) => link.id === "main")?.url || "https://bennietay.com",
    external: true,
  },
];

const footerGroups = [
  ["Pages", [...publicNavItems, { label: "Generate Preview", href: "/generate-preview" }]],
  ["Services", [
    { label: "Managed Lead Website Plans", href: "/pricing" },
    { label: "Website Examples", href: "/case-studies" },
  ]],
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
    <header className="sticky top-0 z-50 border-b border-[#dedbd3] bg-[#f7f6f2]/95 backdrop-blur-xl">
      <nav className="mx-auto flex h-20 max-w-[90rem] items-center justify-between gap-5 px-6 sm:px-10 lg:px-16" aria-label="Main navigation">
        <Link to="/" className="flex shrink-0 items-center gap-3 text-[#10131c]">
          <span className="grid h-9 w-9 place-items-center bg-[#5b4bff] text-sm font-black text-white">B.</span>
          <span className="text-lg font-semibold tracking-[-0.035em]">Bennie Studio</span>
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {publicNavItems.map((item) => item.external ? (
            <a key={item.href} href={item.href} target="_blank" rel="noreferrer" onClick={() => trackPublicEvent({ eventType: "ecosystem_link_clicked", label: `Header ${item.label}`, target: item.href })} className="text-sm font-semibold text-black/50 transition hover:text-[#5b4bff]">
              {item.label}
            </a>
          ) : (
            <Link key={item.href} to={item.href} className="text-sm font-semibold text-black/50 transition hover:text-[#5b4bff]">
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-4 lg:flex">
          <MarketSwitcher compact />
          <Link to={user ? "/dashboard" : "/login"} className="text-sm font-semibold text-black/50 transition hover:text-[#5b4bff]">
            {user ? "Dashboard" : "Sign in"}
          </Link>
          <Link to={user ? "/dashboard" : "/generate-preview"} onClick={() => !user && trackPublicEvent({ eventType: "click_generate_preview", label: "Header Preview", target: "/generate-preview" })} className="inline-flex min-h-11 items-center justify-center bg-[#10131c] px-5 py-3 text-sm font-black text-white transition hover:bg-[#5b4bff]">
            {user ? "Open Studio" : "Get free preview"}
          </Link>
        </div>

        <Button type="button" variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="lg:hidden" aria-label="Open navigation menu">
          <Menu className="h-5 w-5" />
        </Button>
      </nav>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[100] bg-[#0c1224]/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute right-0 top-0 flex h-dvh w-[min(90vw,360px)] flex-col bg-[#f7f6f2] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#dedbd3] pb-5">
              <span className="text-lg font-semibold tracking-[-0.03em] text-[#10131c]">Bennie Studio</span>
              <Button type="button" variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Close navigation menu"><X className="h-5 w-5" /></Button>
            </div>
            <div className="flex flex-col py-5">
              {publicNavItems.map((item) => item.external ? (
                <a key={item.href} href={item.href} target="_blank" rel="noreferrer" onClick={() => setMobileOpen(false)} className="border-b border-[#dedbd3] py-4 text-lg font-semibold text-[#10131c]">{item.label}</a>
              ) : (
                <Link key={item.href} to={item.href} onClick={() => setMobileOpen(false)} className="border-b border-[#dedbd3] py-4 text-lg font-semibold text-[#10131c]">{item.label}</Link>
              ))}
            </div>
            <div className="mt-auto grid gap-3 border-t border-[#dedbd3] pt-5">
              <MarketSwitcher />
              <Link to={user ? "/dashboard" : "/login"} onClick={() => setMobileOpen(false)} className="inline-flex min-h-11 items-center justify-center border border-[#10131c] px-5 text-sm font-bold text-[#10131c]">{user ? "Dashboard" : "Sign in"}</Link>
              <Link to={user ? "/dashboard" : "/generate-preview"} onClick={() => setMobileOpen(false)} className="inline-flex min-h-12 items-center justify-center bg-[#10131c] px-5 text-sm font-black text-white">{user ? "Open Studio" : "Get free preview"}</Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function PublicSiteFooter({ tagline, email, onManageCookies }: { tagline?: string; email?: string; onManageCookies?: () => void }) {
  return (
    <footer className="bg-[#0c1224] text-white">
      <div className="mx-auto grid max-w-[90rem] gap-10 px-6 py-16 sm:px-10 md:grid-cols-2 lg:grid-cols-6 lg:px-16 lg:py-20">
        <div className="lg:col-span-2">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center bg-[#5b4bff] text-sm font-black">B.</span>
            <span className="text-xl font-semibold tracking-[-0.035em]">Bennie Studio</span>
          </div>
          <p className="max-w-sm text-sm font-medium leading-7 text-white/55">{tagline || "Managed lead-generation websites for service businesses that need clearer enquiries, stronger trust, and better local visibility."}</p>
          {email ? <a href={`mailto:${email}`} className="mt-5 inline-flex text-sm font-black text-[#aaa0ff] hover:text-white">Contact us</a> : null}
        </div>
        {footerGroups.map(([title, links]) => (
          <div key={title}>
            <p className="mb-4 text-[9px] font-black uppercase tracking-[0.22em] text-white/35">{title}</p>
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
        <div>
          <p className="mb-4 text-[9px] font-black uppercase tracking-[0.22em] text-white/35">Pricing market</p>
          <p className="mb-4 text-sm font-medium leading-6 text-white/45">Switch market to view matching local pricing.</p>
          <MarketSwitcher />
        </div>
      </div>
      <div className="border-t border-white/10 px-6 py-6 text-center text-xs font-semibold text-white/35">© {new Date().getFullYear()} Bennie Studio. All rights reserved.</div>
    </footer>
  );
}
