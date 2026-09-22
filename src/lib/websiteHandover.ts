export type PortableFile = { name: string; content: string };

type PortableWebsiteInput = {
  business: any;
  websites: any[];
  posts?: any[];
  products?: any[];
  exportedAt?: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function slugify(value: unknown, fallback = "page") {
  const slug = String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || fallback;
}

function firstText(content: any, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = content?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

function asArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function sectionImage(content: any) {
  return firstText(content, ["imageUrl", "image_url", "backgroundImage", "background_image"]);
}

function itemImage(item: any) {
  return firstText(item, ["imageUrl", "image_url", "url", "logo"]);
}

function actionHref(content: any) {
  const href = firstText(content, [
    "buttonUrl",
    "buttonURL",
    "ctaUrl",
    "ctaURL",
    "link",
    "url",
    "href",
    "whatsappUrl",
    "bookingUrl",
  ]);
  if (!href) return "#contact";
  if (/^(https?:|mailto:|tel:|sms:|whatsapp:|#)/i.test(href)) return href;
  return href.startsWith("/") ? href : `https://${href}`;
}

function renderGenericItems(items: any[]) {
  if (!items.length) return "";
  return `<div class="card-grid">${items
    .map((item) => {
      const image = itemImage(item);
      const title = firstText(item, ["title", "name", "question", "role", "label"], "Item");
      const body = firstText(item, ["description", "text", "answer", "quote", "content", "subtitle"]);
      const meta = firstText(item, ["price", "value", "position", "company"]);
      return `<article class="content-card">
        ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(firstText(item, ["imageAlt", "alt", "name", "title"], title))}" loading="lazy" />` : ""}
        <div class="content-card__body">
          <h3>${escapeHtml(title)}</h3>
          ${meta ? `<p class="meta">${escapeHtml(meta)}</p>` : ""}
          ${body ? `<p>${escapeHtml(body)}</p>` : ""}
        </div>
      </article>`;
    })
    .join("")}</div>`;
}

function renderFaq(items: any[]) {
  if (!items.length) return "";
  return `<div class="faq-list">${items
    .map((item) => `<details><summary>${escapeHtml(firstText(item, ["question", "title"], "Question"))}</summary><p>${escapeHtml(firstText(item, ["answer", "description", "text"]))}</p></details>`)
    .join("")}</div>`;
}

function renderTestimonials(items: any[]) {
  if (!items.length) return "";
  return `<div class="card-grid">${items
    .map((item) => `<figure class="quote-card"><blockquote>“${escapeHtml(firstText(item, ["quote", "text", "description"], ""))}”</blockquote><figcaption>${escapeHtml(firstText(item, ["name", "author", "title"], "Customer"))}${firstText(item, ["company", "role"]) ? ` · ${escapeHtml(firstText(item, ["company", "role"]))}` : ""}</figcaption></figure>`)
    .join("")}</div>`;
}

function renderContactForm(content: any, sectionType: string) {
  const email = firstText(content, ["email", "contactEmail"]);
  const phone = firstText(content, ["phone", "telephone"]);
  return `<div class="portable-form-wrap" id="contact">
    <form class="portable-form" data-portable-form data-form-type="${escapeHtml(sectionType)}">
      <label>Name<input name="name" autocomplete="name" /></label>
      <label>Email<input name="email" type="email" autocomplete="email" /></label>
      ${sectionType === "appointment" ? '<label>Preferred date<input name="date" type="date" /></label>' : ""}
      <label>Message<textarea name="message" rows="5"></textarea></label>
      <button type="submit">${escapeHtml(firstText(content, ["buttonText", "cta", "submitText"], sectionType === "appointment" ? "Request appointment" : "Send enquiry"))}</button>
      <p class="portable-note">This form is included for layout continuity. Connect it to your chosen form or booking provider after migration.</p>
    </form>
    <div class="contact-links">
      ${email ? `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` : ""}
      ${phone ? `<a href="tel:${escapeHtml(phone.replace(/\s+/g, ""))}">${escapeHtml(phone)}</a>` : ""}
    </div>
  </div>`;
}

function renderBlogCards(posts: any[]) {
  if (!posts.length) return '<p class="empty-state">No published posts were included in this export.</p>';
  return `<div class="card-grid">${posts
    .map((post) => {
      const slug = slugify(post.slug || post.id, "post");
      const image = post.image_url || post.imageUrl || "";
      return `<article class="content-card">
        ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(post.title || "Blog post")}" loading="lazy" />` : ""}
        <div class="content-card__body">
          <p class="eyebrow">Article</p>
          <h3><a href="blog-${slug}.html">${escapeHtml(post.title || "Untitled post")}</a></h3>
          <p>${escapeHtml(post.excerpt || post.meta_description || post.description || "")}</p>
        </div>
      </article>`;
    })
    .join("")}</div>`;
}

function renderProductCards(products: any[]) {
  if (!products.length) return '<p class="empty-state">No products were included in this export.</p>';
  return `<div class="card-grid">${products
    .map((product) => {
      const slug = slugify(product.slug || product.id || product.name, "product");
      const image = product.image_url || product.imageUrl || "";
      return `<article class="content-card">
        ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(product.name || "Product")}" loading="lazy" />` : ""}
        <div class="content-card__body">
          <p class="eyebrow">Product / Service</p>
          <h3><a href="product-${slug}.html">${escapeHtml(product.name || product.title || "Item")}</a></h3>
          <p>${escapeHtml(product.description || "")}</p>
          ${product.price != null ? `<p class="price">${escapeHtml(product.currency || "")} ${escapeHtml(product.price)}</p>` : ""}
        </div>
      </article>`;
    })
    .join("")}</div>`;
}

function renderSection(section: any, posts: any[], products: any[]) {
  if (!section || section.isVisible === false) return "";
  const type = String(section.type || "content").toLowerCase();
  const content = section.content || {};
  const headline = firstText(content, ["headline", "title", "heading", "question"], type.replace(/_/g, " "));
  const subheadline = firstText(content, ["subheadline", "subtitle", "description", "text", "intro"]);
  const image = sectionImage(content);
  const arrays = [
    content.items,
    content.services,
    content.features,
    content.benefits,
    content.members,
    content.team,
    content.plans,
    content.steps,
    content.stats,
    content.logos,
  ].find(Array.isArray) || [];
  const faqItems = asArray(content.items).length ? asArray(content.items) : asArray(content.questions);
  const testimonialItems = asArray(content.items).length ? asArray(content.items) : asArray(content.testimonials);
  const buttonText = firstText(content, ["buttonText", "cta", "ctaText", "primaryButtonText"]);
  const isHero = type === "hero";
  const classes = ["site-section", `section-${slugify(type)}`, isHero ? "site-section--hero" : ""].filter(Boolean).join(" ");

  let body = "";
  if (type === "faq") body = renderFaq(faqItems);
  else if (type === "testimonials") body = renderTestimonials(testimonialItems);
  else if (type === "contact" || type === "appointment") body = renderContactForm(content, type);
  else if (type === "blog_list" || type === "blog") body = renderBlogCards(posts);
  else if (type === "product_list" || type === "products" || type === "industry_content") body = renderProductCards(products);
  else body = renderGenericItems(asArray(arrays));

  return `<section class="${classes}" id="${escapeHtml(section.id || slugify(type))}">
    <div class="section-copy">
      <p class="eyebrow">${escapeHtml(type.replace(/_/g, " "))}</p>
      <h2>${escapeHtml(headline)}</h2>
      ${subheadline ? `<p class="lead">${escapeHtml(subheadline)}</p>` : ""}
      ${buttonText ? `<a class="button-link" href="${escapeHtml(actionHref(content))}">${escapeHtml(buttonText)}</a>` : ""}
    </div>
    ${image ? `<figure class="section-media"><img src="${escapeHtml(image)}" alt="${escapeHtml(firstText(content, ["imageAlt", "alt"], headline))}" loading="${isHero ? "eager" : "lazy"}" /></figure>` : ""}
    ${body}
  </section>`;
}

function pageFileName(page: any, index: number) {
  const slug = slugify(page?.slug || page?.title, index === 0 ? "index" : `page-${index + 1}`);
  if (index === 0 || slug === "home" || slug === "index") return "index.html";
  return `${slug}.html`;
}

function buildNav(pages: any[]) {
  return pages
    .map((page, index) => `<a href="${pageFileName(page, index)}">${escapeHtml(page.title || (index === 0 ? "Home" : `Page ${index + 1}`))}</a>`)
    .join("");
}

function buildPageDocument(args: {
  business: any;
  website: any;
  page: any;
  pageIndex: number;
  pages: any[];
  posts: any[];
  products: any[];
}) {
  const { business, website, page, pageIndex, pages, posts, products } = args;
  const theme = website?.theme || {};
  const primary = theme.primaryColor || theme.primary || "#4f46e5";
  const secondary = theme.secondaryColor || theme.secondary || "#0f172a";
  const pageTitle = page?.seo?.title || page?.title || website?.seo?.title || business?.name || "Website";
  const description = page?.seo?.description || website?.seo?.description || business?.seo_settings?.description || "";
  const sections = asArray(page?.sections).map((section) => renderSection(section, posts, products)).join("");
  const nav = buildNav(pages);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="generator" content="Bennie Studio Portable Handover" />
  <link rel="stylesheet" href="assets/site.css" />
  <style>:root{--primary:${escapeHtml(primary)};--secondary:${escapeHtml(secondary)};}</style>
</head>
<body>
  <header class="site-header">
    <a class="brand" href="index.html">${escapeHtml(business?.name || "Website")}</a>
    <nav aria-label="Main navigation">${nav}</nav>
  </header>
  <main>
    ${sections || `<section class="site-section"><h1>${escapeHtml(page?.title || business?.name || "Website")}</h1><p>This page was included in the Bennie Studio handover export.</p></section>`}
  </main>
  <footer class="site-footer">
    <strong>${escapeHtml(business?.name || "Website")}</strong>
    <p>Portable website handover exported from Bennie Studio.</p>
  </footer>
  <script src="assets/site.js"></script>
</body>
</html>`;
}

function buildBlogDocument(post: any, business: any, website: any, pages: any[]) {
  const image = post.image_url || post.imageUrl || "";
  const body = post.content || post.body || post.description || "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(post.title || "Article")} | ${escapeHtml(business?.name || "")}</title><meta name="description" content="${escapeHtml(post.meta_description || post.excerpt || "")}"/><link rel="stylesheet" href="assets/site.css"/><style>:root{--primary:${escapeHtml(website?.theme?.primaryColor || "#4f46e5")};--secondary:${escapeHtml(website?.theme?.secondaryColor || "#0f172a")};}</style></head><body><header class="site-header"><a class="brand" href="index.html">${escapeHtml(business?.name || "Website")}</a><nav>${buildNav(pages)}</nav></header><main><article class="article-page"><p class="eyebrow">Article</p><h1>${escapeHtml(post.title || "Article")}</h1>${image ? `<img class="article-hero" src="${escapeHtml(image)}" alt="${escapeHtml(post.title || "Article")}" />` : ""}<div class="article-copy">${escapeHtml(body).replace(/\n/g, "<br/>")}</div></article></main><footer class="site-footer"><p>Portable website handover exported from Bennie Studio.</p></footer></body></html>`;
}

function buildProductDocument(product: any, business: any, website: any, pages: any[]) {
  const image = product.image_url || product.imageUrl || "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(product.name || product.title || "Product")} | ${escapeHtml(business?.name || "")}</title><meta name="description" content="${escapeHtml(product.description || "")}"/><link rel="stylesheet" href="assets/site.css"/><style>:root{--primary:${escapeHtml(website?.theme?.primaryColor || "#4f46e5")};--secondary:${escapeHtml(website?.theme?.secondaryColor || "#0f172a")};}</style></head><body><header class="site-header"><a class="brand" href="index.html">${escapeHtml(business?.name || "Website")}</a><nav>${buildNav(pages)}</nav></header><main><article class="product-page">${image ? `<img class="product-hero" src="${escapeHtml(image)}" alt="${escapeHtml(product.name || "Product")}" />` : ""}<div><p class="eyebrow">Product / Service</p><h1>${escapeHtml(product.name || product.title || "Product")}</h1><p class="lead">${escapeHtml(product.description || "")}</p>${product.price != null ? `<p class="price">${escapeHtml(product.currency || "")} ${escapeHtml(product.price)}</p>` : ""}</div></article></main><footer class="site-footer"><p>Portable website handover exported from Bennie Studio.</p></footer></body></html>`;
}

const SITE_CSS = `:root{--primary:#4f46e5;--secondary:#0f172a;--surface:#fff;--muted:#64748b;--line:#e2e8f0}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a;background:#f8fafc;line-height:1.6}a{color:inherit}.site-header{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:18px clamp(20px,5vw,72px);background:rgba(255,255,255,.95);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}.brand{font-weight:900;text-decoration:none;letter-spacing:-.03em}.site-header nav{display:flex;gap:18px;flex-wrap:wrap}.site-header nav a{font-size:14px;font-weight:700;text-decoration:none;color:#334155}.site-header nav a:hover{color:var(--primary)}main{min-height:60vh}.site-section{max-width:1180px;margin:0 auto;padding:72px clamp(20px,5vw,64px);display:grid;gap:28px}.site-section--hero{max-width:none;padding:clamp(72px,10vw,128px) max(clamp(20px,7vw,96px),calc((100vw - 1180px)/2));background:var(--secondary);color:#fff}.section-copy{max-width:780px}.eyebrow{text-transform:uppercase;letter-spacing:.18em;font-size:12px;font-weight:900;color:var(--primary);margin:0 0 10px}.site-section--hero .eyebrow{color:#c7d2fe}h1,h2,h3{line-height:1.05;letter-spacing:-.035em}h1{font-size:clamp(2.6rem,7vw,5.8rem)}h2{font-size:clamp(2rem,5vw,4rem);margin:0 0 18px}h3{font-size:1.25rem}.lead{font-size:clamp(1.05rem,2vw,1.28rem);color:#475569;max-width:760px}.site-section--hero .lead{color:#cbd5e1}.button-link,.portable-form button{display:inline-flex;align-items:center;justify-content:center;padding:13px 20px;border-radius:999px;border:0;background:var(--primary);color:#fff;text-decoration:none;font-weight:800;cursor:pointer;margin-top:12px}.section-media img,.article-hero,.product-hero{width:100%;max-height:620px;object-fit:cover;border-radius:28px;box-shadow:0 24px 60px rgba(15,23,42,.12)}.card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}.content-card,.quote-card{margin:0;background:#fff;border:1px solid var(--line);border-radius:24px;overflow:hidden;box-shadow:0 12px 34px rgba(15,23,42,.06)}.content-card img{width:100%;height:220px;object-fit:cover}.content-card__body,.quote-card{padding:22px}.meta,.price{font-weight:900;color:var(--primary)}.faq-list{display:grid;gap:12px}.faq-list details{background:#fff;border:1px solid var(--line);border-radius:18px;padding:18px 20px}.faq-list summary{font-weight:800;cursor:pointer}.portable-form-wrap{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,.45fr);gap:24px}.portable-form{display:grid;gap:14px;background:#fff;border:1px solid var(--line);border-radius:24px;padding:24px}.portable-form label{display:grid;gap:6px;font-weight:700}.portable-form input,.portable-form textarea{width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:12px;font:inherit}.portable-note,.empty-state{font-size:13px;color:var(--muted)}.contact-links{display:grid;align-content:start;gap:10px}.site-footer{padding:48px clamp(20px,5vw,72px);background:#0f172a;color:#cbd5e1}.article-page,.product-page{max-width:980px;margin:0 auto;padding:72px clamp(20px,5vw,64px)}.article-copy{font-size:1.08rem;line-height:1.85;background:#fff;border:1px solid var(--line);border-radius:24px;padding:28px;margin-top:24px}.product-page{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:36px;align-items:center}@media(max-width:760px){.site-header{align-items:flex-start;flex-direction:column}.portable-form-wrap,.product-page{grid-template-columns:1fr}.site-section{padding-top:52px;padding-bottom:52px}}`;

const SITE_JS = `document.addEventListener("submit",function(event){var form=event.target;if(form&&form.matches("[data-portable-form]")){event.preventDefault();alert("This exported form is not connected yet. Connect it to your preferred form, CRM, or booking provider before going live.");}});`;

export function buildPortableWebsiteFiles(input: PortableWebsiteInput): PortableFile[] {
  const business = input.business || {};
  const websites = asArray(input.websites);
  const posts = asArray(input.posts);
  const products = asArray(input.products);
  const exportedAt = input.exportedAt || new Date().toISOString();
  const primaryWebsite = websites[0] || { pages: [], theme: {}, seo: {} };
  const pages = asArray(primaryWebsite.pages);
  const normalizedPages = pages.length ? pages : [{ title: business.name || "Home", slug: "home", sections: [] }];

  const files: PortableFile[] = [
    { name: "assets/site.css", content: SITE_CSS },
    { name: "assets/site.js", content: SITE_JS },
  ];

  normalizedPages.forEach((page, index) => {
    files.push({
      name: pageFileName(page, index),
      content: buildPageDocument({
        business,
        website: primaryWebsite,
        page,
        pageIndex: index,
        pages: normalizedPages,
        posts,
        products,
      }),
    });
  });

  posts.forEach((post) => {
    files.push({
      name: `blog-${slugify(post.slug || post.id, "post")}.html`,
      content: buildBlogDocument(post, business, primaryWebsite, normalizedPages),
    });
  });

  products.forEach((product) => {
    files.push({
      name: `product-${slugify(product.slug || product.id || product.name, "product")}.html`,
      content: buildProductDocument(product, business, primaryWebsite, normalizedPages),
    });
  });

  files.push(
    { name: "data/website.json", content: JSON.stringify({ exportVersion: "2.0", exportedAt, business, websites }, null, 2) },
    { name: "data/blog-posts.json", content: JSON.stringify(posts, null, 2) },
    { name: "data/products.json", content: JSON.stringify(products, null, 2) },
    {
      name: "README.md",
      content: `# ${business.name || "Website"} portable handover

This archive contains a dependency-free static version of the published website plus structured content data.

## What keeps working after migration

- Published pages and navigation
- Responsive styling
- Text, images, FAQs, testimonials, team, service and product content
- Blog and product detail pages included in the export
- Normal links, phone links, email links and external calls-to-action

## What must be reconnected

- Contact form delivery
- Appointment booking workflows
- Bennie Studio CRM submission endpoints
- Analytics / pixels / consent tooling
- Automations and managed-service features

Start with DEPLOYMENT.md and DOMAIN-TRANSFER.md. Keep the original archive as a dated backup.
`,
    },
    {
      name: "DEPLOYMENT.md",
      content: `# Deployment guide

1. Extract the archive.
2. Upload the contents to any static host such as Vercel, Netlify, Cloudflare Pages, GitHub Pages, or your own web server.
3. Confirm index.html loads and test every exported page.
4. Reconnect forms, booking, analytics and any third-party integrations.
5. Verify the temporary host URL before changing DNS.
6. Only then point the domain to the new host.

No Bennie Studio runtime, database, API key, or subscription is required to serve the static pages.
`,
    },
    {
      name: "DOMAIN-TRANSFER.md",
      content: `# Domain migration

Your domain is independent of this archive. Keep the current DNS unchanged until the new host is fully verified.

Recommended order:
1. Add the domain to the new hosting provider.
2. Copy the provider's DNS records.
3. Verify the site on the provider's temporary URL.
4. Change DNS at your registrar or DNS provider.
5. Confirm HTTPS works on both the root domain and www hostname.
6. Keep the Bennie Studio export archive as a rollback reference.

Bennie Studio managed hosting may remain available during the configured migration window after service cancellation.
`,
    },
  );

  return files;
}
