import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const app = readFileSync("src/App.tsx", "utf8");
const api = readFileSync("api/index.ts", "utf8");
const indexHtml = readFileSync("index.html", "utf8");
const homepage = readFileSync("src/components/BrandLedLandingPage.tsx", "utf8");
const warmup = readFileSync("src/components/RouteWarmup.tsx", "utf8");
const sitemap = readFileSync("public/sitemap.xml", "utf8");
const renderer = readFileSync("src/components/WebsiteRenderer.tsx", "utf8");
const envExample = readFileSync(".env.example", "utf8");

test("production public pages are indexable while Vercel previews stay noindex", () => {
  assert.match(indexHtml, /name="robots" content="index,follow"/);
  assert.match(app, /const isVercelPreview = host\.endsWith\("\.vercel\.app"\)/);
  assert.match(app, /privateRoute[\s\S]*"noindex,nofollow"[\s\S]*isVercelPreview[\s\S]*"noindex,follow"[\s\S]*"index,follow"/);
  assert.doesNotMatch(app, /WordPress/i);
});

test("public website reviews have an inline worker fallback", () => {
  assert.match(api, /QStash is an acceleration path, not a hard dependency/);
  assert.match(api, /if \(!dispatch\.published\)[\s\S]*processQueuedJob\(job\.id\)/);
  assert.doesNotMatch(api, /marketingSsr/);
  assert.doesNotMatch(api, /\/api\/marketing/);
});

test("route warmup points at current public implementations", () => {
  assert.match(warmup, /import\("\.\/BrandLedLandingPage"\)/);
  assert.doesNotMatch(warmup, /import\("\.\/LandingPage"\)/);
  assert.doesNotMatch(warmup, /PortfolioPage/);
});

test("homepage uses the current composed concept hero and labels illustrative proof honestly", () => {
  assert.match(homepage, /import \{ WebsiteConceptVisual \} from "\.\/WebsiteConceptVisual"/);
  assert.match(homepage, /<WebsiteConceptVisual[\s\S]*?hero[\s\S]*?className=/);
  assert.match(homepage, /Selected website concept demos/);
  assert.match(homepage, /original studio concepts/i);
  assert.match(homepage, /not commissioned client projects/i);
});

test("sitemap contains current canonical marketing routes only", () => {
  for (const route of [
    "/professional-services-website-design",
    "/accounting-firm-website-design",
    "/local-service-website-design",
    "/resources/website-launch-checklist",
  ]) {
    assert.equal(sitemap.includes(`<loc>https://app.bennietay.com${route}</loc>`), true, `Missing ${route}`);
  }
  assert.equal(sitemap.includes("<loc>https://app.bennietay.com/portfolio</loc>"), false);
  assert.equal(sitemap.includes("<loc>https://app.bennietay.com/apply-custom</loc>"), false);
  assert.equal(sitemap.includes("<loc>https://app.bennietay.com/preview-order</loc>"), false);
});

test("stale public implementation files are retired", () => {
  for (const file of [
    "src/components/LandingPage.tsx",
    "src/components/PortfolioPage.tsx",
    "src/components/CustomWebsiteQuotePage.tsx",
    "src/components/LandingPageEditor.tsx",
    "src/components/TemplateGallery.tsx",
    "server/marketingSsr.ts",
  ]) {
    assert.equal(existsSync(file), false, `Expected retired file to be removed: ${file}`);
  }
});

test("obsolete Vercel project hostname is not a runtime default", () => {
  assert.doesNotMatch(envExample, /bennietay-studio\.vercel\.app/);
  const tenantDomains = readFileSync("src/lib/tenantDomains.ts", "utf8");
  assert.doesNotMatch(tenantDomains, /bennietay-studio\.vercel\.app/);
  assert.match(tenantDomains, /normalized\.endsWith\("\.vercel\.app"\)/);
});

test("website review admin uses the canonical non-legacy route and component", () => {
  const sidebar = readFileSync("src/components/Sidebar.tsx", "utf8");
  const dashboard = readFileSync("src/components/SuperAdminDashboard.tsx", "utf8");
  const permissions = readFileSync("src/constants/staffPermissions.ts", "utf8");
  assert.match(sidebar, /\/admin\/website_reviews/);
  assert.doesNotMatch(sidebar, /\/admin\/neural_auditor/);
  assert.match(dashboard, /WebsiteReviewAuditor/);
  assert.match(dashboard, /last === "website_reviews"/);
  assert.match(dashboard, /last === "neural_auditor"\) return "website_reviews"/);
  assert.match(permissions, /website_reviews: "prospects"/);
  assert.equal(existsSync("src/components/SuperAdmin/NeuralAuditor.tsx"), false);
  assert.equal(existsSync("src/components/SuperAdmin/WebsiteReviewAuditor.tsx"), true);
});

test("full-section background replacement keeps color fallback and image controls", () => {
  assert.match(renderer, /data-section-background="full"/);
  assert.match(renderer, /backgroundColor:[\s\S]*section\.settings\?\.backgroundColor[\s\S]*section\.settings\?\.bgColor/);
  assert.match(renderer, /backgroundImage: `url\(\$\{section\.settings\?\.backgroundImage\}\)`/);
  assert.match(renderer, /backgroundPosition: section\.settings\?\.backgroundPosition \|\| "center"/);
});
