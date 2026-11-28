import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import routing from "../vercel.json";

test("sitemap entries serve their own canonical URL before hydration", () => {
  const sitemap = readFileSync("public/sitemap.xml", "utf8");
  const locations = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), match => new URL(match[1]));
  assert.ok(locations.length > 0);
  const rewrites = routing.routes.slice(0, routing.routes.findIndex(route => route.handle === "filesystem"));
  for (const location of locations) {
    const rule = rewrites.find(route => route.src && route.dest && new RegExp(route.src).test(location.pathname));
    const file = rule?.src && rule.dest ? location.pathname.replace(new RegExp(rule.src), rule.dest) : location.pathname;
    const entry = file === "/" ? "/index.html" : file.endsWith(".html") ? file : file + "/index.html";
    const html = readFileSync("dist" + entry, "utf8");
    assert.ok(html.includes(`rel="canonical" href="${location.href}"`), location.pathname);
  }
});
