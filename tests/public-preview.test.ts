import test from "node:test";
import assert from "node:assert/strict";
import { buildPublicPreviewProfile, extractPreviewEvidenceUrls } from "../server/publicPreview.ts";
import { buildPagesFromBlueprint, inferBlueprintNiche } from "../src/constants/pageBlueprints.ts";

test("public preview intake extracts business facts without AI", () => {
  const html = `
    <!doctype html>
    <html>
      <head>
        <title>Acme Heating | Nottingham</title>
        <meta name="description" content="Boiler repairs and servicing across Nottingham.">
        <meta property="og:image" content="/hero.jpg">
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Plumber",
            "name": "Acme Heating",
            "telephone": "0115 555 0101",
            "email": "hello@acme.example",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Nottingham",
              "addressRegion": "Nottinghamshire",
              "addressCountry": "GB"
            }
          }
        </script>
      </head>
      <body>
        <h1>Boiler Repairs in Nottingham</h1>
        <h2>Boiler Servicing</h2>
        <a href="/services/boiler-installation">Boiler Installation</a>
      </body>
    </html>
  `;

  const profile = buildPublicPreviewProfile({
    html,
    finalUrl: "https://acme.example/",
  });

  assert.equal(profile.businessName, "Acme Heating");
  assert.equal(profile.contactPhone, "0115 555 0101");
  assert.equal(profile.contactEmail, "hello@acme.example");
  assert.equal(profile.location, "Nottingham, Nottinghamshire, GB");
  assert.ok(profile.services.includes("Boiler Repairs in Nottingham"));
  assert.ok(profile.services.includes("Boiler Servicing"));
  assert.ok(profile.services.includes("Boiler Installation"));
  assert.equal(profile.heroImage, "https://acme.example/hero.jpg");
  assert.equal(profile.aiUsed, false);
  assert.equal(profile.estimatedAiCostUsd, 0);
});

test("public preview falls back to submitted business facts", () => {
  const profile = buildPublicPreviewProfile({
    html: "<html><head><title></title></head><body><p>Welcome</p></body></html>",
    finalUrl: "https://example.test/",
    fallbackBusinessName: "Bennie Example",
    fallbackLocation: "Kuala Lumpur",
    fallbackMainService: "Website Design",
  });

  assert.equal(profile.businessName, "Bennie Example");
  assert.equal(profile.location, "Kuala Lumpur");
  assert.deepEqual(profile.services, ["Website Design"]);
  assert.equal(profile.estimatedAiCostUsd, 0);
});


test("public preview ignores audience headings and keeps a concise website service", () => {
  const html = `
    <!doctype html>
    <html>
      <head>
        <title>Lead Generation Website Design Malaysia | Bennie Tay</title>
        <meta name="description" content="Bennie Studio designs and manages conversion-focused websites for service businesses, built to generate more enquiries.">
      </head>
      <body>
        <a href="/">Bennie Studio <span>BY BENNIE TAY</span></a>
        <h1>Turn your business information into more enquiries.</h1>
        <h2>Cleaning companies</h2>
        <h2>Tuition and education centres</h2>
        <h2>Accounting and bookkeeping firms</h2>
        <h3>Managed Website</h3>
        <h2>Your Managed Website Team, Without Hiring One.</h2>
        <h2>A better website for a growing business.</h2>
        <h3>Managed Lead-Generation Website</h3>
        <h3>Website Audit</h3>
        <a href="/services">See my cleaning website direction</a>
      </body>
    </html>
  `;

  const profile = buildPublicPreviewProfile({
    html,
    finalUrl: "https://bennietay.com/",
    fallbackLocation: "Kuala Lumpur",
  });

  assert.equal(profile.businessName, "Bennie Studio");
  assert.equal(profile.services[0], "Managed website services");
  assert.ok(!profile.services.some((service) => /cleaning companies/i.test(service)));
  assert.ok(!profile.services.some((service) => /education centres/i.test(service)));
  assert.ok(!profile.services.some((service) => /bookkeeping firms/i.test(service)));
  assert.ok(!profile.services.some((service) => /direction/i.test(service)));
  assert.ok(!profile.services.some((service) => /without hiring/i.test(service)));
  assert.ok(!profile.services.some((service) => /better website for a growing business/i.test(service)));
  assert.ok(profile.services.some((service) => /managed lead-generation website/i.test(service)));
  assert.ok(profile.services.some((service) => /website audit/i.test(service)));
});


test("preview evidence discovery follows useful same-origin pages only", () => {
  const html = `
    <a href="/services">Services</a>
    <a href="/reviews">Customer Reviews</a>
    <a href="/about">About us</a>
    <a href="https://example.test/contact">Contact</a>
    <a href="https://other.test/reviews">External Reviews</a>
    <a href="/blog">Blog</a>
  `;
  assert.deepEqual(extractPreviewEvidenceUrls(html, "https://example.test/", 4), [
    "https://example.test/services",
    "https://example.test/reviews",
    "https://example.test/about",
    "https://example.test/contact",
  ]);
});


test("public preview extracts testimonials from evidence HTML", () => {
  const profile = buildPublicPreviewProfile({
    html: `
      <html><head><title>Example Plumbing</title></head><body>
        <h1>Emergency Plumbing</h1>
        <blockquote>They arrived quickly, explained the repair clearly, and fixed the leak the same day.</blockquote>
        <div class="customer-review">Professional service from first call through completion. We would use them again.</div>
      </body></html>
    `,
    finalUrl: "https://example.test/",
  });
  assert.equal(profile.testimonials.length, 2);
  assert.match(profile.testimonials[0], /arrived quickly/i);
  assert.match(profile.testimonials[1], /Professional service/i);
});


test("public preview extracts explicit conversion evidence without inventing claims", () => {
  const profile = buildPublicPreviewProfile({
    html: `
      <html><head><title>Northside Heating</title>
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"LocalBusiness","name":"Northside Heating","foundingDate":"2008","areaServed":[{"@type":"City","name":"Leeds"},{"@type":"City","name":"Bradford"}]}
      </script>
      </head><body>
        <h1>Boiler repair and installation</h1>
        <p>Gas Safe registered engineers. 10-year workmanship warranty.</p>
        <a href="/contact">Request a Quote</a>
      </body></html>
    `,
    finalUrl: "https://northside.example/",
  });
  assert.deepEqual(profile.serviceAreas, ["Leeds", "Bradford"]);
  assert.ok(profile.credentials.some((item) => /registered/i.test(item)));
  assert.match(profile.yearsInBusiness, /2008/);
  assert.ok(profile.guarantees.some((item) => /warranty/i.test(item)));
  assert.equal(profile.primaryCta, "Request a Quote");
});


test("public preview preserves useful source branding and hero content", () => {
  const profile = buildPublicPreviewProfile({
    html: `
      <!doctype html>
      <html>
        <head>
          <title>Harbour Dental | Family Dentist</title>
          <meta name="description" content="Gentle family dental care with clear treatment options and online appointments.">
          <meta name="theme-color" content="#167c8c">
          <meta property="og:image" content="/images/clinic-hero.jpg">
          <style>:root { --accent-color: #e2b96f; }</style>
          <script type="application/ld+json">
            {
              "@context":"https://schema.org",
              "@type":"Dentist",
              "name":"Harbour Dental",
              "logo":"/images/logo.svg"
            }
          </script>
        </head>
        <body>
          <h1>Comfortable Dentistry for the Whole Family</h1>
          <p>Modern treatment, a calm clinic experience, and straightforward advice from your first visit.</p>
          <img src="/images/logo.svg" alt="Harbour Dental logo">
          <img src="/images/clinic-hero.jpg" alt="Treatment room">
          <img src="/images/team.jpg" alt="Dental team">
        </body>
      </html>
    `,
    finalUrl: "https://harbour.example/",
  });

  assert.equal(profile.logoUrl, "https://harbour.example/images/logo.svg");
  assert.equal(profile.brandColor, "#167c8c");
  assert.equal(profile.accentColor, "#e2b96f");
  assert.equal(profile.heroHeadline, "Comfortable Dentistry for the Whole Family");
  assert.match(profile.heroSubheadline, /Modern treatment/);
  assert.equal(profile.heroImage, "https://harbour.example/images/clinic-hero.jpg");
  assert.equal(profile.secondaryImage, "https://harbour.example/images/team.jpg");
});


test("public preview decodes numeric entities and extracts human business DNA", () => {
  const profile = buildPublicPreviewProfile({
    html: `
      <html>
        <head>
          <title>The Podiatry Centre &#8211; Singapore</title>
          <meta name="description" content="Established podiatry care in Singapore.">
          <script type="application/ld+json">
            {
              "@context":"https://schema.org",
              "@graph":[
                {"@type":"MedicalBusiness","name":"The Podiatry Centre"},
                {"@type":"Person","name":"Mr Ty","jobTitle":"Podiatrist","description":"Experienced podiatrist providing clinical care.","image":"/ty.jpg"}
              ]
            }
          </script>
        </head>
        <body>
          <h1>The Podiatry Centre &#8211; Singapore</h1>
          <p>Established in 1995 as one of Singapore's early specialist podiatry practices.</p>
          <h2>Featured in the press</h2>
          <a href="/articles/straits-times">Straits Times newspaper interview</a>
          <blockquote>Professional care and careful adjustments made a real difference to my running.</blockquote>
          <img src="/clinic.jpg" width="1200" height="800" alt="Podiatry clinic">
        </body>
      </html>
    `,
    finalUrl: "https://podiatry.example/",
  });

  assert.equal(profile.heroHeadline.includes("&#8211;"), false);
  assert.equal(profile.heroHeadline, "The Podiatry Centre – Singapore");
  assert.equal(profile.people.length, 1);
  assert.equal(profile.people[0].name, "Mr Ty");
  assert.equal(profile.people[0].role, "Podiatrist");
  assert.ok(profile.historyItems.some((item) => /Established in 1995/i.test(item)));
  assert.ok(profile.pressItems.some((item) => /Straits Times/i.test(item)));
  assert.equal(profile.businessDNA.humanLed, true);
  assert.equal(profile.businessDNA.heritageRich, true);
  assert.equal(profile.businessDNA.typographyStyle, "heritage");
  assert.ok(profile.businessDNA.identityScore >= 50);
});


test("public preview prefers an actual hero image over generic social imagery", () => {
  const profile = buildPublicPreviewProfile({
    html: `
      <html>
        <head>
          <title>Example Clinic</title>
          <meta property="og:image" content="/social-card.jpg">
        </head>
        <body>
          <img src="/small-office.jpg" width="480" height="320" alt="Office">
          <img class="homepage-hero-image" src="/real-hero.jpg" width="1440" height="900" loading="eager" alt="Clinic team">
          <h1>Care designed around you</h1>
        </body>
      </html>
    `,
    finalUrl: "https://clinic.example/",
  });

  assert.equal(profile.heroImage, "https://clinic.example/real-hero.jpg");
});


test("public preview rejects reviewer metadata masquerading as a testimonial", () => {
  const profile = buildPublicPreviewProfile({
    html: `
      <html><head><title>Smile Clinic</title></head><body>
        <h1>Gentle dental care</h1>
        <div class="customer-review">Crystal Wong 7 months ago</div>
        <div class="customer-review">The dentist explained every step clearly and the whole visit felt calm and professional.</div>
      </body></html>
    `,
    finalUrl: "https://smile.example/",
  });

  assert.equal(profile.testimonials.length, 1);
  assert.match(profile.testimonials[0], /explained every step/i);
});

test("public preview extracts source FAQ questions and about copy", () => {
  const profile = buildPublicPreviewProfile({
    html: `
      <html>
        <head><title>Harbour Dental</title><meta name="description" content="Family dental care."></head>
        <body>
          <h1>Family dentistry</h1>
          <h2>About our clinic</h2>
          <p>Harbour Dental provides preventive and restorative dental care with a calm, patient-first approach.</p>
          <h3>Do you accept new patients?</h3>
          <p>Yes. New patients can contact the clinic to arrange a first appointment.</p>
          <h3>How do I book an appointment?</h3>
          <p>Use the appointment request form or call the clinic during opening hours.</p>
        </body>
      </html>
    `,
    finalUrl: "https://harbour.example/",
  });

  assert.match(profile.aboutText, /preventive and restorative dental care/i);
  assert.deepEqual(profile.faqs, [
    "Do you accept new patients?",
    "How do I book an appointment?",
  ]);
  assert.equal(profile.faqItems.length, 2);
  assert.match(profile.faqItems[0].answer, /New patients can contact/i);
});


test("public preview skips illustration-like secondary images", () => {
  const profile = buildPublicPreviewProfile({
    html: `
      <html>
        <head><title>Smile Clinic</title></head>
        <body>
          <img class="homepage-hero-image" src="/hero.jpg" width="1440" height="900" alt="Clinic team">
          <img src="/tooth-illustration.png" width="1000" height="700" alt="Tooth illustration">
          <img class="about-clinic-team" src="/team-photo.jpg" width="1200" height="800" alt="Clinic team">
          <h1>Comfortable dental care</h1>
        </body>
      </html>
    `,
    finalUrl: "https://smile.example/",
  });

  assert.equal(profile.secondaryImage, "https://smile.example/team-photo.jpg");
  assert.doesNotMatch(profile.secondaryImage, /illustration/i);
});


test("public preview preserves factual descriptions next to service headings", () => {
  const profile = buildPublicPreviewProfile({
    html: `
      <html><head><title>Harbour Dental</title></head><body>
        <h1>Family dental care</h1>
        <h2>Teeth Whitening</h2>
        <p>Professional whitening options are explained after an assessment so patients understand the available approach.</p>
        <h2>Dental Implants</h2>
        <p>Implant consultations cover suitability, treatment stages and the next steps before any procedure is planned.</p>
      </body></html>
    `,
    finalUrl: "https://harbour.example/",
  });

  assert.deepEqual(profile.serviceDetails, [
    {
      title: "Teeth Whitening",
      description: "Professional whitening options are explained after an assessment so patients understand the available approach.",
    },
    {
      title: "Dental Implants",
      description: "Implant consultations cover suitability, treatment stages and the next steps before any procedure is planned.",
    },
  ]);
});


test("public preview does not trust a stale localStorage lead id", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync("src/components/PublicMarketingPages.tsx", "utf8");

  assert.doesNotMatch(source, /canReuseExistingLead/);
  assert.match(source, /leadResult = await submitPlatformLead\(\{/);
  assert.match(source, /deduplicates by previewId \+ email/);
});


test("other local service previews use the contractor blueprint family", () => {
  assert.equal(inferBlueprintNiche("Other Local Service Business handyman repairs"), "contractor");
  assert.equal(inferBlueprintNiche("Plumbing and electrical services"), "contractor");
  assert.equal(inferBlueprintNiche("Roofing company"), "contractor");
});

test("generated previews include local stock fallbacks and browser image recovery", async () => {
  const { readFileSync } = await import("node:fs");
  const previewSource = readFileSync("src/components/PublicMarketingPages.tsx", "utf8");
  const rendererSource = readFileSync("src/components/WebsiteRenderer.tsx", "utf8");

  assert.match(previewSource, /flagship-renovation\.jpg/);
  assert.match(previewSource, /heroFallbackImageUrl: previewMode === "website" \? undefined : previewStockImage/);
  assert.match(rendererSource, /applySectionImageFallback/);
  assert.match(rendererSource, /fallbackImageUrl/);
});


test("source-driven previews prioritise real identity over generic filler sections", () => {
  const pages = buildPagesFromBlueprint({
    businessName: "Example Dental",
    nicheId: "dental-clinic-v1",
    nicheName: "Dental Clinic",
    plan: "business",
    maxPages: 5,
    mainService: "General Dentistry",
    targetCustomer: "patients",
    location: "Singapore",
    ctaPreference: "Book Appointment",
    services: ["General Dentistry", "Teeth Whitening"],
    description: "A local dental clinic.",
    aboutText: "We provide general dental care.",
    sourceDriven: true,
    contactEmail: "hello@example.com",
    contactPhone: "6512345678",
    testimonials: ["Helpful and professional care from first visit to follow-up."],
    faqItems: [{ question: "Do you take bookings?", answer: "Yes." }],
    localProof: "Registered clinic",
    teamMembers: [{ name: "Dr Jane Tan", role: "Podiatrist", imageUrl: "https://example.test/jane.jpg" }],
    historyItems: ["Established in 1998 as one of the early specialist podiatry practices in Singapore."],
    businessDNA: { humanLed: true, heritageRich: true, proofRich: true, imageRich: true, identityScore: 82, typographyStyle: "heritage" },
    generationMode: "premium",
  });
  const home = pages.find((page) => page.slug === "")!;
  const types = home.sections.filter((section) => section.isVisible !== false).map((section) => section.type);

  assert.deepEqual(types, ["hero", "services", "team", "testimonials", "proof", "about", "faq", "cta"]);
  assert.equal(types.includes("features"), false);
  assert.equal(types.includes("contact"), false);
  assert.equal(home.sections.find((section) => section.type === "team")?.content?.title, "Meet Your Podiatrist");
  assert.equal(home.sections.find((section) => section.type === "testimonials")?.content?.title, "What Patients Say");
  assert.equal(home.sections.find((section) => section.type === "proof")?.content?.title, "A Practice With a Story");
});

test("preview lets users auto-detect or override customer brand colours", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync("src/components/PublicMarketingPages.tsx", "utf8");

  assert.match(source, /brandColorMode/);
  assert.match(source, /Auto-detect/);
  assert.match(source, /Custom colours/);
  assert.match(source, /primaryColor: form\.brandPrimaryColor/);
  assert.match(source, /secondaryColor: form\.brandAccentColor/);
});


test("sparse source websites are expanded into useful non-fabricated sections", () => {
  const pages = buildPagesFromBlueprint({
    businessName: "Sparse Handyman Co",
    nicheId: "service-pro-v1",
    nicheName: "Other Local Service Business handyman",
    plan: "business",
    maxPages: 5,
    mainService: "Handyman Services",
    targetCustomer: "homeowners",
    location: "Singapore",
    ctaPreference: "Request a Quote",
    sourceDriven: true,
    contactEmail: "hello@example.com",
    generationMode: "premium",
    heroFallbackImageUrl: "/template-assets/flagship-renovation.jpg",
    storyFallbackImageUrl: "/template-assets/flagship-renovation.jpg",
  });

  assert.equal(pages.length, 5);
  assert.deepEqual(pages.map((page) => page.slug), ["", "services", "about", "faq", "quote"]);

  const home = pages[0];
  const homeTypes = home.sections.filter((section) => section.isVisible !== false).map((section) => section.type);
  for (const required of ["hero", "features", "services", "about", "faq", "cta"] as const) {
    assert.ok(homeTypes.includes(required), `expected home to include ${required}`);
  }
  assert.equal(homeTypes.includes("contact"), false, "contact form belongs on the dedicated conversion page");

  const about = pages.find((page) => page.slug === "about")!;
  const aboutSection = about.sections.find((section) => section.type === "about")!;
  assert.match(String(aboutSection.content?.text || ""), /Sparse Handyman Co/);
  assert.equal(aboutSection.content?.contentSource, "inferred");

  const faq = pages.find((page) => page.slug === "faq")!;
  const faqSection = faq.sections.find((section) => section.type === "faq")!;
  assert.ok(Array.isArray(faqSection.content?.items));
  assert.ok(faqSection.content.items.length >= 3);
  assert.match(String(faqSection.content.items[0]?.answer || ""), /contact|enquiry|team/i);
});

test("sparse previews do not invent evidence-only sections", () => {
  const pages = buildPagesFromBlueprint({
    businessName: "No Proof Business",
    nicheId: "service-pro-v1",
    nicheName: "Local Service",
    plan: "business",
    maxPages: 5,
    mainService: "Repairs",
    targetCustomer: "customers",
    location: "Kuala Lumpur",
    ctaPreference: "Contact Us",
    sourceDriven: true,
    generationMode: "premium",
  });

  const allVisible = pages.flatMap((page) => page.sections.filter((section) => section.isVisible !== false));
  assert.equal(allVisible.some((section) => section.type === "testimonials"), false);
  assert.equal(allVisible.some((section) => section.type === "proof"), false);
});


test("source-driven previews keep exactly one contact form on the conversion page", () => {
  const pages = buildPagesFromBlueprint({
    businessName: "Example Local Service",
    nicheId: "service-pro-v1",
    nicheName: "Other Local Service Business handyman",
    plan: "business",
    maxPages: 5,
    mainService: "Handyman Services",
    targetCustomer: "homeowners",
    location: "Singapore",
    ctaPreference: "Request a Quote",
    sourceDriven: true,
    contactEmail: "contact@localservice.test",
    generationMode: "premium",
    heroFallbackImageUrl: "/template-assets/flagship-renovation.jpg",
    storyFallbackImageUrl: "/template-assets/flagship-renovation.jpg",
  });

  const contactSections = pages.flatMap((page) =>
    page.sections.filter((section) => section.isVisible !== false && section.type === "contact")
  );
  assert.equal(contactSections.length, 1);

  const home = pages.find((page) => page.slug === "")!;
  assert.equal(home.sections.some((section) => section.type === "contact"), false);

  const conversionPage = pages.find((page) => page.slug === "quote")!;
  assert.equal(conversionPage.sections.some((section) => section.type === "contact"), true);
});
