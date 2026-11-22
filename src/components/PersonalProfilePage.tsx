import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronDown, ClipboardList,
  Globe2, Layers3, Monitor, MousePointer2, ShieldCheck, Smartphone, Sparkles,
} from "lucide-react";
import { PublicSiteHeader, PublicSiteFooter } from "./PublicSiteChrome";
import { PLAN_DELIVERY_STANDARDS } from "../constants/deliveryStandards";
import {
  COMMERCIAL_FALLBACK_PRODUCTS, formatCommercialMoney, getCommercialPrice, getMinimumTermMonths,
} from "../lib/commercialPricing";
import { usePublicCommercialPricing } from "../hooks/usePublicCommercialPricing";
import { trackPublicEvent } from "../lib/publicTracking";
import "../styles/publicBrand.css";
import "../styles/personalProfileSales.css";

const ORDER_URL = "/pricing?product=personal-profile#plan-personal-profile";

const examples = [
  {
    id: "consultant",
    label: "Consultant",
    name: "Alex Morgan",
    role: "Strategy consultant",
    headline: "Good ideas deserve a clear direction.",
    intro: "I help teams turn complex problems into practical next steps.",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=920&q=85",
    initials: "AM",
    accent: "navy",
    tabs: ["About", "Experience", "Contact"],
  },
  {
    id: "creative",
    label: "Creative",
    name: "Jamie Lee",
    role: "Independent creative",
    headline: "Independent by choice. Creative by nature.",
    intro: "A considered collection of work, ideas and collaborations.",
    photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=920&q=85",
    initials: "JL",
    accent: "slate",
    tabs: ["About", "Selected work", "Contact"],
  },
  {
    id: "specialist",
    label: "Specialist",
    name: "Taylor Chen",
    role: "Professional specialist",
    headline: "Expertise you can get to know.",
    intro: "Clear information about my approach, background and services.",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=920&q=85",
    initials: "TC",
    accent: "steel",
    tabs: ["Profile", "Expertise", "Contact"],
  },
] as const;

type ExampleId = (typeof examples)[number]["id"];

const benefits = [
  { icon: Monitor, title: "Build your credibility", text: "One professional place to show who you are, what you do and why someone should contact you." },
  { icon: MousePointer2, title: "Make enquiries easier", text: "Bring your story, relevant work and contact details together instead of sending people between profiles." },
  { icon: Layers3, title: "Leave the technical work to us", text: "Your site is hosted and maintained for you, with a small monthly content-update allowance." },
] as const;

const steps = [
  { icon: ClipboardList, title: "Tell us about you", text: "Share your approved bio, professional background, images and contact details." },
  { icon: Monitor, title: "We build your website", text: "We put your content into the agreed fixed-format pages and prepare a draft for review." },
  { icon: CheckCircle2, title: "Approve, launch and relax", text: "You review the website before launch. We continue managing its hosting and routine upkeep." },
] as const;

const faqs = [
  ["Do I need any technical experience?", "No. Bennie Studio handles the website build, hosting, SSL and routine maintenance. You'll provide or approve the information about yourself."],
  ["Is the design fully custom?", "Personal Profile is a streamlined, fixed-format service with 3–5 professional profile pages. Bespoke features and complex integrations are separately scoped."],
  ["Can I use a domain I own?", "Yes. We can assist with connecting your existing domain. Registration and renewal fees are not included in the standard plan."],
  ["What happens after launch?", "Your plan includes hosting, routine maintenance and one small content-edit request per month (up to 15 minutes). Larger changes are separately scoped."],
  ["What is the billing commitment?", "Billing is month-to-month. The first payment includes setup and the first month; cancellation follows the Terms of Service."],
] as const;

function Reveal({ children, className = "", delay = 0 }: {
  children: React.ReactNode; className?: string; delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.14 }}
      transition={{ duration: 0.58, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function OrderLink({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Link
      to={ORDER_URL}
      className={"pp2-button pp2-button-primary " + className}
      onClick={() => trackPublicEvent({
        eventType: "sales_cta_clicked", label: "Personal Profile — Get my website", target: ORDER_URL,
      })}
    >{children}<ArrowRight size={17} aria-hidden="true" /></Link>
  );
}

function ExampleShowcase() {
  const [active, setActive] = React.useState<ExampleId>("consultant");
  const [failedImages, setFailedImages] = React.useState<ExampleId[]>([]);
  const reduce = useReducedMotion();
  const current = examples.find((example) => example.id === active) || examples[0];
  const portraitReady = !failedImages.includes(current.id);

  return (
    <div className="pp2-showcase" id="profile-examples">
      <div className="pp2-sample-header">
        <span className="pp2-sample-eyebrow">WHAT YOUR WEBSITE COULD LOOK LIKE</span>
        <span className="pp2-sample-count">01 / 03</span>
      </div>
      <div className="pp2-device-stage" aria-label="Responsive sample personal website, shown on desktop and phone">
        <div className="pp2-laptop">
          <div className="pp2-laptop-screen">
            <div className="pp2-laptop-glass">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={current.id}
                  className={"pp2-example-site pp2-example-site-" + current.accent}
                  initial={reduce ? false : { opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? undefined : { opacity: 0, x: -10 }}
                  transition={{ duration: reduce ? 0 : 0.27, ease: "easeOut" }}
                >
                  <div className="pp2-example-nav">
                    <strong>{current.name}<i>.</i></strong>
                    <span>About</span><span>Work</span><span>Contact</span>
                  </div>
                  <div className="pp2-example-content">
                    <div className="pp2-example-copy">
                      <span className="pp2-example-kicker">HELLO, I'M {current.name.toUpperCase()}</span>
                      <h3>{current.headline}</h3>
                      <p className="pp2-example-role">{current.role}</p>
                      <p className="pp2-example-intro">{current.intro}</p>
                      <div className="pp2-example-actions">
                        <span>About me</span><span>Get in touch <ArrowUpRight size={10} /></span>
                      </div>
                    </div>
                    <div className="pp2-example-photo">
                      {portraitReady ? <img
                        src={current.photo}
                        alt={"Illustrative professional portrait for " + current.role + " website example"}
                        loading="eager"
                        referrerPolicy="no-referrer"
                        onError={() => setFailedImages((prev) => prev.includes(current.id) ? prev : [...prev, current.id])}
                      /> : <span>{current.initials}</span>}
                    </div>
                  </div>
                  <div className="pp2-example-bottom">
                    {current.tabs.map((tab, index) => <span key={tab}><small>0{index + 1}</small> {tab}</span>)}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <div className="pp2-laptop-base" aria-hidden="true"><span /></div>
        </div>
        <div className="pp2-phone" aria-hidden="true">
          <div className="pp2-phone-notch" />
          <div className="pp2-phone-content">
            <div className="pp2-phone-top"><strong>{current.name}</strong><span>☰</span></div>
            <div className="pp2-phone-photo">
              {portraitReady ? <img src={current.photo} alt="" referrerPolicy="no-referrer" /> : <span>{current.initials}</span>}
            </div>
            <h4>{current.name}</h4>
            <p>{current.role}</p>
            <span className="pp2-phone-action">Get in touch</span>
          </div>
        </div>
        <div className="pp2-device-shadow" aria-hidden="true" />
      </div>
      <div className="pp2-example-switcher" role="group" aria-label="Switch illustrative personal website example">
        {examples.map((example) => (
          <button
            key={example.id}
            type="button"
            aria-pressed={active === example.id}
            onClick={() => setActive(example.id)}
          >{example.label}</button>
        ))}
      </div>
      <p className="pp2-example-disclaimer">Illustrative concepts with sample names and stock photography — not real client projects or testimonials.</p>
    </div>
  );
}

export default function PersonalProfilePage() {
  const { products, loading, error } = usePublicCommercialPricing("INTL");
  const product = products.find((item) => item.slug === "personal-profile")
    || COMMERCIAL_FALLBACK_PRODUCTS.find((item) => item.slug === "personal-profile");
  const price = product ? getCommercialPrice(product, "INTL") : undefined;
  const priceReady = !loading && !error && price?.monthlyPrice != null && price?.setupFee != null;
  const term = getMinimumTermMonths(price);
  const delivery = PLAN_DELIVERY_STANDARDS["personal-profile"];
  const monthlyLabel = priceReady ? formatCommercialMoney(price!.monthlyPrice!, price!.currency) : null;
  const setupLabel = priceReady ? formatCommercialMoney(price!.setupFee, price!.currency) : null;
  const firstPayment = priceReady ? formatCommercialMoney(price!.monthlyPrice! + price!.setupFee, price!.currency) : null;
  const termTotal = priceReady ? formatCommercialMoney(price!.setupFee + price!.monthlyPrice! * term, price!.currency) : null;
  const reduceMotion = useReducedMotion();

  return (
    <div className="brand-public pp2-root">
      <Helmet>
        <title>Personal Profile Website — Built & Managed for You | Bennie Studio</title>
        <meta name="description" content="A professional personal website for consultants, creatives and independent professionals. Bennie Studio builds it, hosts it and handles ongoing maintenance. See the verified Personal Profile plan." />
        <link rel="canonical" href="https://app.bennietay.com/personal-profile" />
      </Helmet>
      <PublicSiteHeader />
      <main className="pp2-page">
        <div className="pp2-local-nav">
          <div className="pp2-container pp2-local-nav-inner">
            <span>Personal Profile <span className="pp2-local-divider">/</span> By Bennie Studio</span>
            <nav aria-label="Personal Profile sections"><a href="#why-personal">Benefits</a><a href="#how-profile-works">Process</a><a href="#personal-pricing">Pricing</a><a href="#personal-faq">FAQ</a></nav>
            <Link className="pp2-local-cta" to={ORDER_URL}>Get my website <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
        </div>

        <section className="pp2-hero" aria-labelledby="pp2-hero-title">
          <div className="pp2-hero-glow" aria-hidden="true" />
          <div className="pp2-container pp2-hero-grid">
            <div className="pp2-hero-copy">
              <motion.p
                className="pp2-eyebrow"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
              >PERSONAL PROFILE BY BENNIE STUDIO</motion.p>
              <motion.h1
                id="pp2-hero-title"
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.58, delay: 0.08 }}
              >A professional website for you. <span>Managed by us.</span></motion.h1>
              <motion.p
                className="pp2-hero-subtitle"
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.58, delay: 0.17 }}
              >Show people who you are, what you do and why they should reach out — without the hassle of building and maintaining a website yourself.</motion.p>
              <motion.div className="pp2-hero-buttons"
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.54, delay: 0.26 }}>
                <OrderLink>Get my personal website</OrderLink>
                <a href="#profile-examples" className="pp2-button pp2-button-outline">See website examples <ArrowUpRight size={16} aria-hidden="true" /></a>
              </motion.div>
              <div className="pp2-hero-qualities">
                <span><CheckCircle2 size={16} /> Professionally built</span>
                <span><ShieldCheck size={16} /> Fully managed</span>
                <span><Globe2 size={16} /> Your own domain</span>
              </div>
              <div className="pp2-hero-price" aria-live="polite">
                <div><strong>{monthlyLabel || (loading ? "Checking current price…" : "Pricing unavailable")}</strong>{monthlyLabel && <span>/ month</span>}</div>
                <p>{setupLabel ? setupLabel + " one-time setup · Standard " + term + "-month initial term" : "Verified price will be shown in the order review."}</p>
              </div>
            </div>
            <motion.div className="pp2-hero-display" initial={reduceMotion ? false : { opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}>
              <ExampleShowcase />
            </motion.div>
          </div>
        </section>

        <section className="pp2-benefits pp2-container" id="why-personal" aria-label="Personal website benefits">
          <div className="pp2-benefit-grid">
            {benefits.map((item, i) => {
              const Icon = item.icon;
              return <Reveal key={item.title} delay={i * 0.08} className="pp2-benefit">
                <span className="pp2-benefit-icon"><Icon size={23} strokeWidth={1.8} aria-hidden="true" /></span>
                <div><h2>{item.title}</h2><p>{item.text}</p></div>
              </Reveal>;
            })}
          </div>
        </section>

        <section className="pp2-section pp2-process-band" id="how-profile-works" aria-labelledby="pp2-process-title">
          <div className="pp2-container">
            <Reveal className="pp2-section-heading pp2-process-heading">
              <p className="pp2-eyebrow">SIMPLE PROCESS</p>
              <h2 id="pp2-process-title">Your website in three straightforward steps.</h2>
              <p>From your professional story to a website you can share.</p>
            </Reveal>
            <div className="pp2-step-grid">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return <Reveal key={step.title} delay={i * 0.1} className="pp2-step">
                  <span className="pp2-step-num">0{i + 1}</span>
                  <span className="pp2-step-icon"><Icon size={24} strokeWidth={1.8} aria-hidden="true" /></span>
                  <h3>{step.title}</h3><p>{step.text}</p>
                </Reveal>;
              })}
            </div>
            <p className="pp2-process-footnote">{delivery.targetFirstDraft}, subject to receiving your complete brief and assets.</p>
          </div>
        </section>

        <section className="pp2-section pp2-pricing" id="personal-pricing" aria-labelledby="pp2-pricing-title">
          <div className="pp2-container pp2-pricing-layout">
            <Reveal className="pp2-pricing-intro">
              <p className="pp2-eyebrow">ONE CLEAR PLAN</p>
              <h2 id="pp2-pricing-title">Your professional presence, taken care of.</h2>
              <p>Not a do-it-yourself website builder. A fixed-format professional website that Bennie Studio creates, hosts and supports.</p>
              <div className="pp2-included">
                {[delivery.pages, delivery.revisions, delivery.updates, delivery.seo, "Managed hosting, SSL and routine maintenance", "Support connecting a customer-owned domain"].map((item) =>
                  <div key={item}><Check size={17} aria-hidden="true" /><span>{item}</span></div>
                )}
              </div>
              <p className="pp2-scope-note">You provide or approve your biography, imagery and credentials. Bespoke copywriting, domain registration and advanced integrations are separately scoped.</p>
            </Reveal>
            <Reveal className="pp2-price-card" delay={0.12}>
              <div className="pp2-card-top">
                <span className="pp2-card-label">PERSONAL PROFILE PLAN</span>
                <span className="pp2-card-flag"><Sparkles size={13} aria-hidden="true" /> Built & managed</span>
                <div className="pp2-card-price" aria-live="polite">
                  <strong>{monthlyLabel || (loading ? "Checking…" : "Unavailable")}</strong>
                  {monthlyLabel && <span>/month</span>}
                </div>
                <p>{setupLabel ? "+ " + setupLabel + " one-time setup" : "Live pricing is required before checkout."}</p>
              </div>
              <div className="pp2-card-bottom">
                <div className="pp2-card-row"><span>First payment</span><strong>{firstPayment || "—"}</strong></div>
                <div className="pp2-card-row"><span>Initial term</span><strong>{term} months</strong></div>
                <div className="pp2-card-row"><span>Total for initial term, before tax</span><strong>{termTotal || "—"}</strong></div>
                <OrderLink className="pp2-card-cta">Get my personal website</OrderLink>
                <p className="pp2-card-disclaimer">Review exact scope and terms before payment. The plan continues month to month after the standard initial term unless your accepted order says otherwise.</p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="pp2-section pp2-faq" id="personal-faq" aria-labelledby="pp2-faq-title">
          <div className="pp2-container pp2-faq-layout">
            <Reveal className="pp2-faq-heading">
              <p className="pp2-eyebrow">FREQUENTLY ASKED QUESTIONS</p>
              <h2 id="pp2-faq-title">A few things worth knowing.</h2>
              <p>Clear answers before you choose.</p>
            </Reveal>
            <Reveal className="pp2-faq-list" delay={0.08}>
              {faqs.map(([question, answer]) => <details key={question}>
                <summary>{question}<ChevronDown size={18} aria-hidden="true" /></summary>
                <p>{answer}</p>
              </details>)}
            </Reveal>
          </div>
        </section>

        <section className="pp2-final" aria-labelledby="pp2-final-title">
          <div className="pp2-container pp2-final-layout">
            <Reveal>
              <p className="pp2-eyebrow">YOUR NEXT STEP</p>
              <h2 id="pp2-final-title">Ready for a personal website that works for you?</h2>
              <p>A clearer introduction. A professional place to be found. Managed by Bennie Studio.</p>
            </Reveal>
            <Reveal className="pp2-final-action" delay={0.12}>
              <OrderLink>Get my personal website</OrderLink>
              <span><ShieldCheck size={16} aria-hidden="true" /> Review everything before payment</span>
            </Reveal>
          </div>
        </section>
      </main>
      <PublicSiteFooter tagline="Managed professional websites that make it easy to understand your work and get in touch." />
    </div>
  );
}
