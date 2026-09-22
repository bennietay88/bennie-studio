import React from "react";
import { ArrowRight, Check, Monitor, Smartphone, Tablet } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import type { Website } from "../types";
import { WebsiteRenderer } from "./WebsiteRenderer";

type ProspectPreviewPayload = {
  preview: {
    previewId: string;
    businessName: string;
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
    return <main className="grid min-h-screen place-items-center bg-[#f6f7fb] px-6"><div className="max-w-lg border border-[#dfe2ea] bg-white p-8 text-center"><h1 className="text-2xl font-semibold text-[#141821]">Preview unavailable</h1><p className="mt-3 text-[#526071]">{error}</p></div></main>;
  }
  if (!payload) return <main className="grid min-h-screen place-items-center bg-[#f6f7fb] text-[#526071]">Loading prospect preview…</main>;

  const preview = payload.preview;
  const product = preview.recommendedProduct;
  const selfServe = Boolean(product && product.salesMotion === "self_serve" && product.slug !== "custom-website");
  const ctaHref = selfServe
    ? `/pricing?product=${encodeURIComponent(product!.slug)}#plan-${product!.slug}`
    : `/book-demo?preview_id=${encodeURIComponent(preview.previewId)}`;
  const ctaLabel = selfServe ? "Review plan & continue" : "Book a scope review";
  const frameWidth = device === "mobile" ? "max-w-[430px]" : device === "tablet" ? "max-w-[820px]" : "max-w-[1440px]";

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-[#141821]">
      <Helmet>
        <title>{preview.businessName} Website Direction | Bennie Studio</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <section className="border-b border-[#dfe2ea] bg-white">
        <div className="mx-auto max-w-[90rem] px-6 py-10 sm:px-10 lg:px-16 lg:py-14">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5746e8]">Bennie Studio prospect preview</p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-start">
            <div>
              <h1 className="max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl">{preview.headline || `${preview.businessName}, made clearer online.`}</h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-[#526071]">{preview.opportunitySummary}</p>
              <div className="mt-7">
                <Link to={ctaHref} className="inline-flex min-h-12 items-center bg-[#141821] px-6 font-semibold text-white transition hover:bg-[#5746e8]">
                  {ctaLabel}<ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="border border-[#dfe2ea] bg-[#f9f8f4] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#526071]">Recommended Bennie Studio plan</p>
              <p className="mt-2 text-xl font-semibold">{product?.label || "Custom Website"}</p>
              <p className="mt-2 text-sm leading-6 text-[#5f6673]">{product?.reason || "The scope should be reviewed before checkout."}</p>
              <div className="mt-5 border-t border-[#dfe2ea] pt-4">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#526071]">Primary conversion path</p>
                <p className="mt-2 font-semibold">{preview.primaryConversionPath}</p>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="border border-[#dfe2ea] bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5746e8]">Proposed structure</p>
              <div className="mt-4 grid gap-2">
                {preview.proposedStructure.map((item, index) => <div key={item} className="flex items-center gap-3 text-sm font-semibold"><span className="text-[#5746e8]">{String(index + 1).padStart(2, "0")}</span>{item}</div>)}
              </div>
            </div>
            <div className="border border-[#dfe2ea] bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5746e8]">Trust and proof signals found</p>
              <div className="mt-4 grid gap-2">
                {preview.proofSignals.length ? preview.proofSignals.map((item) => <div key={item} className="flex items-start gap-2 text-sm text-[#374151]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#5746e8]" />{item}</div>) : <p className="text-sm leading-6 text-[#5f6673]">No explicit proof claim was added unless it was found on the public website.</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[96rem] px-4 py-8 sm:px-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[#526071]">Responsive website direction</p><p className="mt-1 text-sm text-[#5f6673]">Switch views to inspect the same concept at common device widths.</p></div>
          <div className="flex gap-2" role="group" aria-label="Preview device">
            {([
              ["desktop", Monitor, "Desktop"],
              ["tablet", Tablet, "Tablet"],
              ["mobile", Smartphone, "Mobile"],
            ] as const).map(([value, Icon, label]) => (
              <button key={value} type="button" aria-pressed={device === value} onClick={() => setDevice(value)} className={device === value ? "inline-flex items-center gap-2 border border-[#5746e8] bg-[#5746e8] px-4 py-2 text-sm font-semibold text-white" : "inline-flex items-center gap-2 border border-[#dfe2ea] bg-white px-4 py-2 text-sm font-semibold text-[#374151]"}>
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
          </div>
        </div>
        <div className={`${frameWidth} mx-auto overflow-hidden border border-[#dfe2ea] bg-white shadow-[0_24px_70px_-45px_rgba(15,23,42,.5)] transition-[max-width] duration-300`}>
          <WebsiteRenderer initialData={preview.website} />
        </div>
      </section>
    </main>
  );
}
