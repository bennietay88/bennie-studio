import React from "react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Monitor,
  Smartphone,
  Sparkles,
  Tablet,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import type { Website } from "../types";
import { WebsiteRenderer } from "./WebsiteRenderer";

type ProspectPreviewPayload = {
  preview: {
    previewId: string;
    businessName: string;
    businessType?: string;
    sourceUrl?: string;
    websiteOnlyUrl?: string;
    headline: string;
    opportunitySummary: string;
    proposedStructure: string[];
    proofSignals: string[];
    primaryConversionPath: string;
    recommendedProduct: {
      slug: "managed-website" | "website-growth" | "growth-partner" | "custom-website";
      label: string;
      reason: string;
      salesMotion: "self_serve" | "review";
    } | null;
    website: Website;
  };
};

export default function ProspectPreviewPage() {
  const { previewId = "" } = useParams<{ previewId: string }>();
  const [payload, setPayload] = React.useState<ProspectPreviewPayload | null>(null);
  const [error, setError] = React.useState("");
  const [device, setDevice] = React.useState<"desktop" | "tablet" | "mobile">("desktop");

  React.useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/public/prospect-preview/${encodeURIComponent(previewId)}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.preview) throw new Error(data?.error || "Preview not found.");
        setPayload(data);
      })
      .catch((cause) => {
        if (cause?.name !== "AbortError") setError(cause?.message || "Preview could not be loaded.");
      });
    return () => controller.abort();
  }, [previewId]);

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f6f7fb] px-6">
        <div className="max-w-lg border border-[#dfe2ea] bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold text-[#141821]">Preview unavailable</h1>
          <p className="mt-3 text-[#526071]">{error}</p>
        </div>
      </main>
    );
  }

  if (!payload) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#0b1020] text-slate-300">
        Preparing the website direction…
      </main>
    );
  }

  const preview = payload.preview;
  const product = preview.recommendedProduct;
  const selfServe = Boolean(product && product.salesMotion === "self_serve" && product.slug !== "custom-website");
  const ctaHref = selfServe
    ? `/pricing?product=${encodeURIComponent(product!.slug)}#plan-${product!.slug}`
    : `/book-demo?preview_id=${encodeURIComponent(preview.previewId)}`;
  const ctaLabel = selfServe
    ? `Continue with ${product?.label || "this direction"}`
    : "Book a scope review";
  const frameWidth = device === "mobile"
    ? "max-w-[430px]"
    : device === "tablet"
      ? "max-w-[820px]"
      : "max-w-[1440px]";

  return (
    <main className="min-h-screen bg-[#edf0f5] text-[#141821]">
      <Helmet>
        <title>{preview.businessName} Website Direction | Bennie Studio</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b1020]/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-[96rem] flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#c9c4ff]">
              <Sparkles className="h-3.5 w-3.5" /> Bennie Studio website direction
            </div>
            <p className="mt-1 truncate text-sm font-semibold text-white">{preview.businessName}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-white/10 bg-white/5 p-1" role="group" aria-label="Preview device">
              {([
                ["desktop", Monitor, "Desktop"],
                ["tablet", Tablet, "Tablet"],
                ["mobile", Smartphone, "Mobile"],
              ] as const).map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={device === value}
                  onClick={() => setDevice(value)}
                  className={device === value
                    ? "inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-[#141821]"
                    : "inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {preview.sourceUrl ? (
              <a
                href={preview.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center rounded-lg border border-white/15 px-3 text-xs font-semibold text-white hover:bg-white/10"
              >
                Current website <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </a>
            ) : null}

            {preview.websiteOnlyUrl ? (
              <a
                href={preview.websiteOnlyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center rounded-lg border border-white/15 px-3 text-xs font-semibold text-white hover:bg-white/10"
              >
                Website only <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </a>
            ) : null}

            <Link
              to={ctaHref}
              className="inline-flex min-h-10 items-center rounded-lg bg-[#5746e8] px-4 text-xs font-bold text-white transition hover:bg-[#4938db]"
            >
              {ctaLabel}<ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-[#0b1020] px-4 pb-8 pt-6 text-white sm:px-8 sm:pb-10">
        <div className="mx-auto max-w-[96rem]">
          <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c9c4ff]">
                Redesigned preview
              </p>
              <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">
                {preview.headline || `${preview.businessName}, presented more clearly online.`}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
                {preview.opportunitySummary}
              </p>
            </div>
            {preview.businessType ? (
              <div className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300">
                {preview.businessType}
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#f6f7fb] shadow-[0_35px_100px_-50px_rgba(0,0,0,.9)]">
            <div className="flex items-center gap-2 border-b border-[#dfe2ea] bg-white px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="ml-2 truncate text-xs font-semibold text-[#526071]">Preview · {preview.businessName}</span>
            </div>
            <div className="bg-[#edf0f5] p-2 sm:p-4">
              <div className={`${frameWidth} mx-auto max-h-[82vh] overflow-y-auto bg-white shadow-[0_24px_70px_-45px_rgba(15,23,42,.55)] transition-[max-width] duration-300`}>
                <WebsiteRenderer initialData={preview.website} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[90rem] px-6 py-14 sm:px-10 lg:px-16 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5746e8]">Why this direction</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                The preview is built to make the business easier to trust, understand and contact.
              </h2>
              <p className="mt-5 text-base leading-7 text-[#526071]">
                The strongest parts of the existing brand are kept where useful. The structure is then tightened around the services, proof and next action a prospective customer actually needs.
              </p>
            </div>

            <div className="grid gap-8 lg:col-span-7 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5746e8]">Page structure</p>
                <div className="mt-4 divide-y divide-[#dfe2ea] border-y border-[#dfe2ea]">
                  {preview.proposedStructure.map((item, index) => (
                    <div key={`${item}-${index}`} className="flex items-center gap-4 py-3 text-sm font-semibold">
                      <span className="text-xs font-black text-[#5746e8]">{String(index + 1).padStart(2, "0")}</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5746e8]">Verified proof retained</p>
                <div className="mt-4 space-y-3">
                  {preview.proofSignals.length ? preview.proofSignals.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm leading-6 text-[#374151]">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-[#5746e8]" />
                      {item}
                    </div>
                  )) : (
                    <p className="text-sm leading-6 text-[#5f6673]">
                      No unsupported proof was added. The final build can become stronger as verified reviews, credentials and business photography are supplied.
                    </p>
                  )}
                </div>
                <div className="mt-6 border-t border-[#dfe2ea] pt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#526071]">Primary action</p>
                  <p className="mt-2 font-semibold">{preview.primaryConversionPath || "Contact the business"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#0b1020] text-white">
        <div className="mx-auto grid max-w-[90rem] gap-8 px-6 py-14 sm:px-10 lg:grid-cols-12 lg:items-center lg:px-16 lg:py-16">
          <div className="lg:col-span-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#c9c4ff]">Next step</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
              Turn this direction into the live website.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
              {product?.reason || "We will confirm the scope, replace any remaining placeholders with approved business content, complete mobile QA and prepare the site for launch."}
            </p>
            <p className="mt-4 text-sm font-semibold text-white">
              Recommended: {product?.label || "Scope review"}
            </p>
          </div>
          <div className="lg:col-span-4 lg:justify-self-end">
            <Link
              to={ctaHref}
              className="inline-flex min-h-12 items-center rounded-lg bg-white px-6 font-bold text-[#141821] transition hover:bg-[#eceafe]"
            >
              {ctaLabel}<ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
