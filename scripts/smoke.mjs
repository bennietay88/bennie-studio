import { access, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const baseUrl = process.env.SMOKE_BASE_URL;
const requiredArtifacts = baseUrl
  ? []
  : [
      "dist/index.html",
      "dist/server.cjs",
    ];

for (const artifact of requiredArtifacts) {
  const fullPath = path.join(root, artifact);
  await access(fullPath);
  const info = await stat(fullPath);
  if (!info.isFile() || info.size === 0) {
    throw new Error(`Invalid build artifact: ${artifact}`);
  }
}

if (baseUrl) {
  const publicRoutes = [
    "/",
    "/portfolio",
    "/portfolio/sample/dental",
    "/portfolio/sample/consultant",
    "/demo",
    "/book-demo",
    "/privacy",
    "/terms",
  ];
  const marketingMetadata = {
    "/": "Professional Websites for Service Businesses | Bennie Studio",
    "/pricing": "Website Plans &amp; Pricing | Bennie Studio",
    "/generate-preview": "Website Direction | Bennie Studio",
  };

  const response = await fetch(new URL("/api/health-check", baseUrl));
  if (!response.ok) {
    throw new Error(`Health check failed: HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (payload.status !== "ok") {
    throw new Error("Health check returned an unexpected payload");
  }

  for (const route of publicRoutes) {
    const page = await fetch(new URL(route, baseUrl));
    if (!page.ok) {
      throw new Error(`Public route failed: ${route} returned HTTP ${page.status}`);
    }
    const html = await page.text();
    if (!html.includes("<div id=\"root\"")) {
      throw new Error(`Public route did not return the app shell: ${route}`);
    }
  }

  for (const [route, expectedTitle] of Object.entries(marketingMetadata)) {
    const page = await fetch(new URL(route, baseUrl));
    if (!page.ok) throw new Error(`Marketing route failed: ${route} returned HTTP ${page.status}`);
    const html = await page.text();
    if (!html.includes(expectedTitle)) {
      throw new Error(`Marketing route did not return route-specific metadata: ${route}`);
    }
    if (!html.includes('property="og:image"')) {
      throw new Error(`Marketing route is missing an Open Graph image: ${route}`);
    }
  }
}

console.log("Smoke check passed");
