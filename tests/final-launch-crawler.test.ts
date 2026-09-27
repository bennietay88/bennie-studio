import test from "node:test";
import assert from "node:assert/strict";
import { runFinalLaunchCrawler } from "../server/finalLaunchQa.ts";

test("final launch crawler validates pages, links, images and contact targets", async () => {
  const result = await runFinalLaunchCrawler({
    pages: [{
      title: "Home",
      slug: "home",
      sections: [{
        id: "hero",
        type: "hero",
        isVisible: true,
        content: {
          imageUrl: "https://cdn.example.test/hero.jpg",
          bookingUrl: "https://booking.example.test/start",
          email: "mailto:hello@example.test",
          phone: "tel:+60123456789",
          whatsapp: "https://wa.me/60123456789",
        },
      }],
    }],
    theme: {},
    seo: {},
    fetchResource: async (url) => ({
      status: 200,
      contentType: url.endsWith(".jpg") ? "image/jpeg" : "text/html",
      finalUrl: url,
    }),
  });

  assert.equal(result.pass, true);
  assert.equal(result.pageCount, 1);
  assert.equal(result.brokenResources.length, 0);
  assert.ok(result.resourceCount >= 5);
});

test("final launch crawler blocks duplicate pages and definite broken resources", async () => {
  const result = await runFinalLaunchCrawler({
    pages: [
      {
        title: "Home",
        slug: "home",
        sections: [{
          type: "hero",
          isVisible: true,
          content: { href: "https://example.test/missing" },
        }],
      },
      {
        title: "Duplicate",
        slug: "home",
        sections: [{ type: "contact", isVisible: true, content: {} }],
      },
    ],
    fetchResource: async (url) => ({
      status: url.includes("missing") ? 404 : 200,
      contentType: "text/html",
      finalUrl: url,
    }),
  });

  assert.equal(result.pass, false);
  assert.equal(result.pages[1].pass, false);
  assert.equal(result.brokenLinks.length, 1);
});

test("bot-gated resources are review warnings rather than false launch failures", async () => {
  const result = await runFinalLaunchCrawler({
    pages: [{
      title: "Home",
      slug: "home",
      sections: [{
        type: "hero",
        isVisible: true,
        content: { bookingUrl: "https://booking.example.test/private" },
      }],
    }],
    fetchResource: async (url) => ({
      status: 403,
      contentType: "text/html",
      finalUrl: url,
    }),
  });

  assert.equal(result.pass, true);
  assert.equal(result.uncertainResources.length, 1);
});
