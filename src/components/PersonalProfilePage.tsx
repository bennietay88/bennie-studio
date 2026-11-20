import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Clock3, Globe2, Menu, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";
import { PLAN_DELIVERY_STANDARDS } from "../constants/deliveryStandards";
import { COMMERCIAL_FALLBACK_PRODUCTS, formatCommercialMoney, getCommercialPrice, getMinimumTermMonths } from "../lib/commercialPricing";
import { usePublicCommercialPricing } from "../hooks/usePublicCommercialPricing";
import "../styles/publicBrand.css";
import "../styles/personalProfileSales.css";

const ORDER_URL = "/pricing?product=personal-profile#plan-personal-profile";

const examples = [
  {
    id: "consultant",
    label: "Consultant",
    name: "Maya Chen",
    initials: "MC",
    role: "INDEPENDENT STRATEGY CONSULTANT",
    headline: "Thoughtful strategy. Real-world momentum.",
    description: "Helping teams turn complex decisions into confident next steps.",
    services: ["About", "Approach", "Experience", "Contact"],
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=950&q=85",
    imageAlt: "Illustrative portrait of a professional woman",
    style: "consultant",
  },
  {
    id: "creative",
    label: "Creative",
    name: "Jordan Lee",
    initials: "JL",
    role: "INDEPENDENT CREATIVE PROFESSIONAL",
    headline: "Creative work with a point of view.",
    description: "A focused home for selected work, ideas and collaborations.",
    services: ["About", "Work", "Experience", "Contact"],
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=950&q=85",
    imageAlt: "Illustrative portrait of a professional man",
    style: "creative",
  },
  {
    id: "specialist",
    label: "Specialist",
    name: "Alex Rivera",
    initials: "AR",
    role: "INDEPENDENT PROFESSIONAL",
    headline: "Expertise you can understand. People you can reach.",
    description: "Clear information about specialist services and professional experience.",
    services: ["About", "Expertise", "Background", "Contact"],
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=950&q=85",
    imageAlt: "Illustrative portrait of a professional woman",
    style: "specialist",
  },
] as const;

const benefits = [
  {
    number: "01",
    title: "Look credible before the first conversation.",
    copy: "Give prospective clients a polished place to understand your work, background and professional identity.",
  },
  {
    number: "02",
    title: "Put everything important in one link.",
    copy: "Instead of sending people across different profiles, bring your introduction, experience and contact details together.",
  },
  {
    number: "03",
    title: "Stay visible without maintaining a website.",
    copy: "We take care of hosting, routine maintenance and your included small monthly content edit.",
  },
] as const;

const steps = [
  { number: "01", title: "Tell us about you", copy: "Share your approved biography, experience, photos and preferred way for clients to get in touch." },
  { number: "02", title: "We make it yours", copy: "We arrange the information into a responsive, fixed-format profile and prepare a first draft for your review." },
  { number: "03", title: "Approve, launch, stay supported", copy: "Request one consolidated pre-launch revision, approve the site, and leave the hosting and upkeep to us." },
] as const;

const faqs = [
  ["Is this a custom-designed website?", "This is a streamlined, fixed-format Personal Profile service, with 3–5 pages. It is not a fully bespoke website or an advanced web application."],
  ["What do I need to provide?", "An accurate biography, credentials, services or work examples, any approved images and your contact details. We organise this information; custom copywriting is not included."],
  ["Can I connect my existing domain?", "Yes. We can help connect a domain you own. Domain registration and renewal charges are separate, and the domain remains yours."],
  ["What happens after launch?", "Your plan includes managed hosting, maintenance and one small content-edit request each month, up to 15 minutes. Larger changes are separately scoped."],
  ["How does the commitment work?", "The standard initial term is three months. The service then continues month to month unless your accepted order says otherwise. Review cancellation and handover terms before checkout."],
] as const;

function SampleProfile() {
  const [active, setActive] = React.useState<(typeof examples)[number]["id"]>("consultant");
  const [imageFailed, setImageFailed] = React.useState(false);
  const current = examples.find((example) => example.id === active) || examples[0];

  const choose = (id: (typeof examples)[number]["id"]) => {
    setActive(id);
    setImageFailed(false);
  };

  return (
    <div className="pp-sales-showcase">
      <div className="pp-sales-showcase-title">
        <span className="pp-sales-demo-dot" />
        YOUR WEBSITE, YOUR FIRST IMPRESSION
        <span className="pp-sales-demo-label">Illustrative concepts</span>
      </div>
      <div className="pp-sales-browser" aria-label="Interactive illustrative professional website example">
        <div className="pp-sales-browser-bar">
          <span className="pp-sales-browser-dots"><i /><i /><i /></span>
          <span className="pp-sales-browser-url"><Globe2 size={12} aria-hidden="true" /> yourname.com</span>
          <Menu size={14} aria-hidden="true" />
        </div>
        <div key={current.id} className={"pp-sales-demo pp-sales-demo-" + current.style}>
          <div className="pp-sales-demo-nav">
            <strong>{current.name}<span className="pp-sales-name-dot">.</span></strong>
            <span>About <b>·</b> Work <b>·</b> Contact</span>
          </div>
          <div className="pp-sales-demo-main">
            <div className="pp-sales-demo-copy">
              <p className="pp-sales-demo-kicker">{current.role}</p>
              <h3>{current.headline}</h3>
              <p className="pp-sales-demo-description">{current.description}</p>
              <span className="pp-sales-demo-contact">Let's connect <ArrowUpRight size={14} aria-hidden="true" /></span>
            </div>
            <div className="pp-sales-demo-photo-wrap">
              {!imageFailed ? <img
                key={current.image}
                src={current.image}
                alt={current.imageAlt}
                loading="eager"
                referrerPolicy="no-referrer"
                onError={() => setImageFailed(true)}
              /> : <span className="pp-sales-photo-fallback">{current.initials}</span>}
            </div>
          </div>
          <div className="pp-sales-demo-footer">
            {current.services.map((service, index) => <span key={service}><small>0{index + 1}</small> {service}</span>)}
          </div>
        </div>
      </div>
      <div className="pp-sales-samples">
        <p>Picture your profile as a</p>
        <div role="group" aria-label="View example profile types">
          {examples.map((example) => (
            <button key={example.id} type="button" aria-pressed={active === example.id}
              onClick={() => choose(example.id)}>{example.label}</button>
          ))}
        </div>
      </div>
      <p className="pp-sales-image-note">Sample names, content and stock imagery are illustrative, not actual customer sites.</p>
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

  return (
    <div className="brand-public pp-sales-root">
      <Helmet>
        <title>Personal Websites for Professionals | Bennie Studio</title>
        <meta name="description" content="Make a stronger first impression with your own professionally managed personal website. See real plan inclusions, clear prices and how to get started." />
        <link rel="canonical" href="https://app.bennietay.com/personal-profile" />
      </Helmet>
      <PublicSiteHeader />
      <main className="pp-sales">
        <div className="pp-sales-offer-nav">
          <div className="pp-sales-wrap">
            <span>Personal Profile <span className="pp-sales-offer-sep">/</span> A website of your own</span>
            <Link to={ORDER_URL}>Get my website <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </div>

        <section className="pp-sales-hero">
          <div className="pp-sales-wrap pp-sales-hero-layout">
            <div className="pp-sales-hero-copy">
              <p className="pp-sales-eyebrow"><span /> MADE FOR INDEPENDENT PROFESSIONALS</p>
              <h1>Make your first impression <em>count.</em></h1>
              <p className="pp-sales-lead">
                You're more than a job title or a social profile. Give people one beautiful place to discover your expertise, see what you do and get in touch.
              </p>
              <p className="pp-sales-lead-secondary">We build your personal website. We host it. We look after it.</p>
              <div className="pp-sales-hero-actions">
                <Link to={ORDER_URL} className="pp-sales-button pp-sales-button-primary">
                  Get my personal website <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a href="#personal-examples" className="pp-sales-button pp-sales-button-outline">See how it could look <ChevronDown size={17} aria-hidden="true" /></a>
              </div>
              <div className="pp-sales-hero-price" aria-live="polite">
                <span className="pp-sales-hero-price-label">Simple, managed pricing</span>
                <strong>{monthlyLabel || (loading ? "Checking live price…" : "See current price")}</strong>
                {monthlyLabel && <span>per month <b>+</b> {setupLabel} one-time setup</span>}
              </div>
              <div className="pp-sales-hero-assurances">
                <span><Check size={15} aria-hidden="true" /> Your domain stays yours</span>
                <span><Check size={15} aria-hidden="true" /> No technical upkeep</span>
              </div>
            </div>
            <div className="pp-sales-hero-visual" id="personal-examples">
              <SampleProfile />
            </div>
          </div>
        </section>

        <div className="pp-sales-proof-strip">
          <div className="pp-sales-wrap">
            <span>3–5 professional pages</span><span>Mobile-friendly design</span><span>Hosting & maintenance managed</span><span>Monthly content care</span>
          </div>
        </div>

        <section className="pp-sales-value pp-sales-wrap" aria-labelledby="pp-value-title">
          <div className="pp-sales-section-intro">
            <p className="pp-sales-kicker">WHY HAVE YOUR OWN WEBSITE?</p>
            <h2 id="pp-value-title">A better place to send people who want to know <em>more about you.</em></h2>
            <p>Social profiles help people find you. Your own website helps them understand you—without distractions, competing posts or scattered links.</p>
          </div>
          <div className="pp-sales-benefit-grid">
            {benefits.map((benefit) => (
              <article className="pp-sales-benefit" key={benefit.number}>
                <span>{benefit.number}</span>
                <h3>{benefit.title}</h3>
                <p>{benefit.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pp-sales-includes" aria-labelledby="pp-includes-title">
          <div className="pp-sales-wrap pp-sales-includes-grid">
            <div className="pp-sales-includes-intro">
              <p className="pp-sales-kicker">THE WEBSITE · WHAT'S INCLUDED</p>
              <h2 id="pp-includes-title">Not just a page with your name on it.</h2>
              <p>Your personal website is thoughtfully structured to tell your story and make the next step obvious.</p>
              <Link to={ORDER_URL} className="pp-sales-text-link">Start with Personal Profile <ArrowUpRight size={17} aria-hidden="true" /></Link>
            </div>
            <div className="pp-sales-page-list">
              {[
                ["01", "An introduction that sounds like you", "Who you are, what you do and the people you help."],
                ["02", "Your experience and expertise", "An easy-to-follow story built from the credentials and information you approve."],
                ["03", "Work worth showing", "Selected projects, experience or professional highlights, where available."],
                ["04", "One clear way to reach you", "Contact details and links that help the right people start a conversation."],
              ].map(([number, title, copy]) => (
                <div className="pp-sales-page-row" key={number}>
                  <span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div><ArrowUpRight size={17} aria-hidden="true" />
                </div>
              ))}
              <p className="pp-sales-pages-footnote">Pages and sections are arranged within the agreed {delivery.pages.toLowerCase()}.</p>
            </div>
          </div>
        </section>

        <section className="pp-sales-process pp-sales-wrap" aria-labelledby="pp-process-title">
          <div className="pp-sales-section-intro pp-sales-intro-compact">
            <p className="pp-sales-kicker">BUILT & MAINTAINED · YOU DON'T HAVE TO DIY</p>
            <h2 id="pp-process-title">Your story. <em>Our work.</em></h2>
            <p>You'll always approve how you're presented. We handle the build and the ongoing essentials.</p>
          </div>
          <ol className="pp-sales-steps">
            {steps.map((step) => (
              <li key={step.number}><span>{step.number}</span><div><h3>{step.title}</h3><p>{step.copy}</p></div></li>
            ))}
          </ol>
          <p className="pp-sales-process-note"><Clock3 size={17} aria-hidden="true" /> {delivery.targetFirstDraft}. Timing begins after the complete brief and assets are received.</p>
        </section>

        <section className="pp-sales-buy" id="personal-profile-price" aria-labelledby="pp-price-title">
          <div className="pp-sales-wrap pp-sales-buy-grid">
            <div className="pp-sales-buy-copy">
              <p className="pp-sales-kicker">CLEAR SCOPE & PRICING</p>
              <h2 id="pp-price-title">Your professional presence, <em>taken care of.</em></h2>
              <p>The essentials of a credible personal website, without the responsibility of building or maintaining it yourself.</p>
              <div className="pp-sales-included-list">
                {[delivery.pages, delivery.revisions, delivery.updates, delivery.seo, "Managed hosting and routine maintenance", "Support connecting a customer-owned domain"].map((item) => (
                  <div key={item}><Check size={18} aria-hidden="true" /><span>{item}</span></div>
                ))}
              </div>
              <p className="pp-sales-scope-note">You supply or approve your biography, images and experience. Bespoke copywriting, advanced integrations and domain registration are not included.</p>
            </div>
            <div className="pp-sales-price-card">
              <div className="pp-sales-price-head">
                <span>YOUR PERSONAL PROFILE PLAN</span><span className="pp-sales-managed-label"><ShieldCheck size={14} aria-hidden="true" /> Fully managed</span>
                <div className="pp-sales-price-amount" aria-live="polite">
                  <strong>{monthlyLabel || (loading ? "Checking…" : "Unavailable")}</strong>
                  {monthlyLabel && <span>/month</span>}
                </div>
                <p>{setupLabel ? setupLabel + " one-time website setup" : "Live pricing must be verified before ordering."}</p>
              </div>
              <div className="pp-sales-price-detail">
                {priceReady && <dl>
                  <div><dt>First payment</dt><dd>{firstPayment}</dd></div>
                  <div><dt>Standard initial commitment</dt><dd>{term} months</dd></div>
                  <div><dt>Total for initial term, before tax</dt><dd>{termTotal}</dd></div>
                </dl>}
                <Link to={ORDER_URL} className="pp-sales-button pp-sales-button-checkout">Get my personal website <ArrowRight size={19} aria-hidden="true" /></Link>
                <p className="pp-sales-price-reassurance">Review the full order, scope and terms before payment. Afterwards, monthly billing continues unless the accepted order states otherwise.</p>
                <div className="pp-sales-price-bottom"><MonitorSmartphone size={17} aria-hidden="true" /> Mobile-ready website <span>·</span> <Globe2 size={17} aria-hidden="true" /> Managed hosting</div>
              </div>
            </div>
          </div>
        </section>

        <section className="pp-sales-faq pp-sales-wrap" aria-labelledby="pp-faq-title">
          <div className="pp-sales-faq-header">
            <div><p className="pp-sales-kicker">GOOD TO KNOW</p><h2 id="pp-faq-title">Questions before you get started?</h2></div>
            <Link to="/contact" className="pp-sales-text-link">Ask Bennie Studio <ArrowUpRight size={17} aria-hidden="true" /></Link>
          </div>
          <div className="pp-sales-faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>{question} <span aria-hidden="true">+</span></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="pp-sales-closing">
          <div className="pp-sales-wrap">
            <p className="pp-sales-kicker">YOUR NEXT STEP</p>
            <h2>It's time your name had a <em>home of its own.</em></h2>
            <p>One professional website. One place to tell your story. A team to keep it running.</p>
            <Link to={ORDER_URL} className="pp-sales-button pp-sales-button-primary">Get my personal website <ArrowRight size={18} aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
      <PublicSiteFooter tagline="Bennie Studio builds and manages professional websites that help people understand your work and get in touch." />
    </div>
  );
}
