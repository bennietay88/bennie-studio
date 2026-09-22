import assert from "node:assert/strict";
import test from "node:test";
import { buildPortableWebsiteFiles } from "../src/lib/websiteHandover.ts";

test("portable handover exports navigable static pages and structured data", () => {
  const files = buildPortableWebsiteFiles({
    business: { id: "biz_1", name: "Acme Dental" },
    websites: [{
      id: "site_1",
      status: "published",
      theme: { primaryColor: "#123456", secondaryColor: "#111827" },
      seo: { title: "Acme Dental" },
      pages: [
        {
          title: "Home",
          slug: "home",
          sections: [
            { type: "hero", content: { headline: "Confident smiles", subheadline: "Modern dental care", imageUrl: "https://example.com/hero.jpg", buttonText: "Book now", buttonUrl: "#contact" } },
            { type: "services", content: { headline: "Services", items: [{ title: "Whitening", description: "Professional whitening" }] } },
            { type: "contact", content: { headline: "Contact us", email: "hello@example.com" } },
          ],
        },
        { title: "About", slug: "about", sections: [{ type: "about", content: { headline: "About Acme" } }] },
      ],
    }],
    posts: [{ id: "post_1", slug: "first-post", title: "First Post", content: "Hello world" }],
    products: [{ id: "product_1", slug: "whitening", name: "Whitening", description: "A brighter smile" }],
    exportedAt: "2026-09-22T10:00:00.000Z",
  });

  const names = files.map((file) => file.name);
  assert.ok(names.includes("index.html"));
  assert.ok(names.includes("about.html"));
  assert.ok(names.includes("assets/site.css"));
  assert.ok(names.includes("assets/site.js"));
  assert.ok(names.includes("blog-first-post.html"));
  assert.ok(names.includes("product-whitening.html"));
  assert.ok(names.includes("DEPLOYMENT.md"));
  assert.ok(names.includes("DOMAIN-TRANSFER.md"));

  const home = files.find((file) => file.name === "index.html")?.content || "";
  assert.match(home, /Confident smiles/);
  assert.match(home, /Professional whitening/);
  assert.match(home, /https:\/\/example\.com\/hero\.jpg/);
  assert.match(home, /data-portable-form/);
  assert.match(home, /about\.html/);

  const websiteJson = files.find((file) => file.name === "data/website.json")?.content || "";
  assert.match(websiteJson, /"exportVersion": "2\.0"/);
  assert.match(websiteJson, /Acme Dental/);
});

test("portable forms fail safely instead of submitting to Bennie Studio", () => {
  const files = buildPortableWebsiteFiles({
    business: { name: "Acme" },
    websites: [{ pages: [{ title: "Home", slug: "home", sections: [{ type: "appointment", content: { headline: "Book" } }] }] }],
  });
  const script = files.find((file) => file.name === "assets/site.js")?.content || "";
  assert.match(script, /preventDefault/);
  assert.match(script, /preferred form, CRM, or booking provider/);
});
