import type { Plugin } from "vite";
import { RESOURCE_ARTICLES } from "../src/content/resources";
import { findOwnSalesSeoPage } from "../src/constants/ownSalesSeoPages";
import { COMPARISON_GUIDES } from "../src/content/comparisonGuides";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function publicRouteHtml(): Plugin {
  return {
    name: "public-route-html",
    apply: "build",
    generateBundle: {
      order: "post",
      handler(_, bundle) {
        const template = bundle["resources/index.html"];
        if (!template || template.type !== "asset") throw Error("Missing built resources entry");
        const pages = [
          ...RESOURCE_ARTICLES.map(article => ({
            path: "/resources/" + article.slug, title: article.title + " | Bennie Studio", description: article.excerpt,
          })),
          ...Object.values(COMPARISON_GUIDES),
          ...["/pay-monthly-websites", "/website-subscription-service"].map(path => {
            const page = findOwnSalesSeoPage(path);
            if (!page) throw Error("Missing service page " + path);
            return { path, title: page.seoTitle, description: page.metaDescription };
          }),
        ];
        for (const page of pages) {
          const title = escapeHtml(page.title);
          const description = escapeHtml(page.description);
          const url = "https://app.bennietay.com" + page.path;
          const html = String(template.source)
            .replace(/<title>.*?<\/title>/, () => `<title>${title}</title>`)
            .replace(/(<meta (?:name="description"|property="og:description") content=")[^"]*"/g, (_, prefix) => prefix + description + '"')
            .replace(/(<meta property="og:title" content=")[^"]*"/, (_, prefix) => prefix + title + '"')
            .replaceAll("https://app.bennietay.com/resources", url)
            .replace(/<noscript>[\s\S]*?<\/noscript>/, () => `<noscript><main><h1>${title}</h1><p>${description}</p></main></noscript>`);
          this.emitFile({ type: "asset", fileName: page.path.slice(1) + "/index.html", source: html });
        }
      },
    },
  };
}
