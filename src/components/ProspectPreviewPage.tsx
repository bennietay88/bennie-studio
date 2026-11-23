import React from "react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import type { Website } from "../types";
import { WebsiteRenderer } from "./WebsiteRenderer";
import { PLAN_DELIVERY_STANDARDS, type PublicPlanSlug } from "../constants/deliveryStandards";

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

const safeExternalUrl = (value?: string) => {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : "";
  } catch {
    return "";
  }
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
      <main className="brand-public grid min-h-screen place-items-center bg-[#f8f8f5] px-6">
        <div className="max-w-lg rounded-2xl border border-[#dbe1ea] bg-white p-6 text-center sm:p-9">
          <h1 className="text-2xl font-semibold text-[#141821]">Preview unavailable</h1>
          <p className="mt-3 text-[#526071]">{error}</p>
        </div>
      </main>
    );
  }

  if (!payload) {
    return (
      <main role="status" className="brand-public grid min-h-screen place-items-center bg-[#f8f8f5] px-5 text-[#526071]">
        Preparing your website preview…
      </main>
    );
  }

  const preview = payload.preview;
  const product = preview.recommendedProduct;
  const selfServe = Boolean(product && product.salesMotion === "self_serve" && product.slug !== "custom-website");
  const ctaHref = selfServe
    ? `/pricing?product=${encodeURIComponent(product!.slug)}#plan-${product!.slug}`
    : `/book-demo?preview_id=${encodeURIComponent(preview.previewId)}`;
  const ctaLabel = selfServe ? "See plan and price" : "Discuss this preview";
  const frameWidth = device === "mobile" ? "max-w-[430px]" : device === "tablet" ? "max-w-[820px]" : "max-w-[1600px]";
  const originalUrl = safeExternalUrl(preview.sourceUrl);
  const cleanPreviewUrl = safeExternalUrl(preview.websiteOnlyUrl);
  const deliveryStandard = product && product.slug !== "custom-website"
    ? PLAN_DELIVERY_STANDARDS[product.slug as PublicPlanSlug]
    : null;

  return (
    <main className="brand-public min-h-screen bg-[#f8f8f5] pb-20 text-[#141821] sm:pb-0">
      <Helmet>
        <title>{preview.businessName} Website Preview | Bennie Studio</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <header className="sticky top-0 z-[120] border-b border-[#dbe1ea] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[100rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#1741ed]">Bennie Studio</span>
              <span className="hidden h-3 w-px bg-[#dfe2ea] sm:block" />
              <span className="truncate text-sm font-semibold text-[#141821]">Website preview for {preview.businessName}</span>
            </div>
            <p className="mt-1 hidden text-xs text-[#687180] md:block">
              A first-pass direction for review. Final content and scope are confirmed with you before launch.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="hidden rounded-lg border border-[#dfe2ea] bg-[#f6f7fb] p-1 sm:flex" role="group" aria-label="Preview device">
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
                    ? "inline-flex h-9 items-center gap-2 rounded-md bg-white px-3 text-xs font-bold text-[#141821] shadow-sm"
                    : "inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs font-semibold text-[#687180] hover:text-[#141821]"}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{label}</span>
                </button>
              ))}
            </div>

            {originalUrl ? (
              <a
                href={originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden min-h-10 items-center border border-[#dfe2ea] bg-white px-4 text-xs font-bold text-[#374151] transition hover:border-[#b8bdc8] md:inline-flex"
              >
                Original site <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </a>
            ) : null}

            <Link
              to={ctaHref}
              className="inline-flex min-h-11 items-center rounded-lg bg-[#1741ed] px-4 text-xs font-bold text-white transition hover:bg-[#1035c2] sm:px-5"
            >
              {ctaLabel}<ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-[#dfe2ea] bg-white">
        <div className="mx-auto flex max-w-[100rem] flex-col gap-4 px-4 py-5 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1741ed]">Your redesigned website direction</p>
            <h1 className="mt-2 max-w-4xl text-2xl font-bold leading-tight tracking-[-0.025em] text-[#15191f] sm:text-3xl">
              {preview.headline || `${preview.businessName}, made clearer online.`}
            </h1>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[#526071]">
            This concept preserves the strongest parts of the existing brand while improving hierarchy, trust and the path to {preview.primaryConversionPath || "contact"}.
          </p>
        </div>
      </section>

      <section className="px-2 py-3 sm:px-4 sm:py-5">
        <div className="mx-auto max-w-[100rem]">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#687180]">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Interactive preview
            </div>
            {cleanPreviewUrl ? (
              <a
                href={cleanPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs font-bold text-[#374151] hover:text-[#5746e8]"
              >
                Open website only <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>

          <div className={`${frameWidth} mx-auto overflow-hidden border border-[#cfd3da] bg-white shadow-[0_30px_90px_-50px_rgba(15,23,42,.45)] transition-[max-width] duration-300`}>
            <div className="flex h-9 items-center gap-2 border-b border-[#e4e7ec] bg-[#f7f8fa] px-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#d8dbe1]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#d8dbe1]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#d8dbe1]" />
              <span className="ml-2 truncate text-[10px] font-semibold text-[#7a8391]">{preview.businessName}</span>
            </div>
            <WebsiteRenderer initialData={preview.website} enableRealtime={false} />
          </div>
        </div>
      </section>

      <section className="border-t border-[#dfe2ea] bg-white">
        <div className="mx-auto max-w-[90rem] px-6 py-12 sm:px-10 sm:py-14 lg:px-16">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1741ed]">Why this preview is relevant</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.03em] text-[#141821]">See the evidence, the change and the managed next step.</h2>
          <div className="mt-8 grid gap-px overflow-hidden border border-[#dfe2ea] bg-[#dfe2ea] md:grid-cols-2 xl:grid-cols-4">
            <article className="bg-white p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.1em] text-[#5746e8]">01 · What we found</p>
              <p className="mt-3 text-sm leading-6 text-[#526071]">{preview.opportunitySummary || "The existing customer journey can be made clearer and easier to act on."}</p>
            </article>
            <article className="bg-white p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.1em] text-[#5746e8]">02 · What changes</p>
              <p className="mt-3 text-sm leading-6 text-[#526071]">The preview reorganises the website around {preview.primaryConversionPath || "the primary enquiry action"} and the proposed page structure shown below.</p>
            </article>
            <article className="bg-white p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.1em] text-[#5746e8]">03 · What stays grounded</p>
              <p className="mt-3 text-sm leading-6 text-[#526071]">{preview.proofSignals[0] || "Claims, credentials and proof are finalised from business-supplied or approved evidence before launch."}</p>
            </article>
            <article className="bg-white p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.1em] text-[#5746e8]">04 · After subscription</p>
              <p className="mt-3 text-sm leading-6 text-[#526071]">{deliveryStandard ? `${deliveryStandard.targetFirstDraft}. ${deliveryStandard.revisions}. Nothing publishes until customer approval and launch QA pass.` : "Bennie Studio confirms the scope, completes the managed build, reviews it with you and runs launch QA before publication."}</p>
            </article>
          </div>
        </div>
      </section>

      <section className="border-t border-[#dfe2ea] bg-[#111827] text-white">
        <div className="mx-auto max-w-[90rem] px-6 py-14 sm:px-10 sm:py-16 lg:px-16">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b9b1ff]">Why this direction</p>
              <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
                The redesign should make the business easier to understand and easier to contact.
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200">{preview.opportunitySummary}</p>

              {preview.proofSignals.length ? (
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {preview.proofSignals.slice(0, 6).map((item) => (
                    <div key={item} className="flex items-start gap-3 border-t border-white/10 pt-3 text-sm text-slate-200">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#b9b1ff]" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="lg:col-span-5">
              <div className="border border-white/10 bg-white/[0.04] p-6 sm:p-7">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Website structure</p>
                <div className="mt-5 space-y-3">
                  {preview.proposedStructure.map((item, index) => (
                    <div key={`${item}-${index}`} className="flex items-center gap-4 border-b border-white/10 pb-3 text-sm font-semibold">
                      <span className="text-[#b9b1ff]">{String(index + 1).padStart(2, "0")}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-7 border-t border-white/10 pt-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Recommended next step</p>
                  <p className="mt-2 text-xl font-semibold">{product?.label || "Website build"}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{product?.reason || "Review the direction and confirm the final build scope."}</p>
                  <Link to={ctaHref} className="mt-6 inline-flex min-h-12 items-center rounded-lg bg-white px-5 py-3 font-bold text-[#1741c9] transition hover:bg-[#eef3ff]">
                    {ctaLabel}<ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-[130] border-t border-[#dfe2ea] bg-white/95 p-3 backdrop-blur-xl sm:hidden">
        <div className="flex gap-2">
          {originalUrl ? (
            <a href={originalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-[#dbe1ea] bg-white px-3 text-xs font-bold text-[#1741c9]">
              Original
            </a>
          ) : null}
          <Link to={ctaHref} className="inline-flex min-h-11 flex-[1.5] items-center justify-center rounded-lg bg-[#1741ed] px-3 text-center text-xs font-bold text-white">
            {ctaLabel}<ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
