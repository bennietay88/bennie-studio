import test from "node:test";
import assert from "node:assert/strict";
import { buildPublicPreviewProfile } from "../server/publicPreview.ts";

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
