/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Shield,
  Scale,
  ArrowLeft,
  Globe,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/src/lib/supabase";
import ReactMarkdown from "react-markdown";
import { Helmet } from "react-helmet-async";
import { DEFAULT_POLICIES } from "../constants/defaultPolicies";
import { PublicSiteFooter, PublicSiteHeader } from "./PublicSiteChrome";
import { COMMERCIAL_MARKETS, getMinimumTermMonths, getStoredMarket, type CommercialMarket } from "../lib/commercialPricing";
import { usePublicCommercialPricing } from "../hooks/usePublicCommercialPricing";

interface PolicyPageProps {
  type:
    | "privacy"
    | "terms"
    | "cookie"
    | "dpa"
    | "subprocessors"
    | "acceptable-use";
}

interface PolicyData {
  title: string;
  content: string;
  updatedAt?: string | number;
}

export function PolicyPage({ type }: PolicyPageProps) {
  const navigate = useNavigate();
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [commercialMarket] = useState<CommercialMarket>(() => getStoredMarket());
  const { products: commercialProducts, loading: commercialTermsLoading } = usePublicCommercialPricing(commercialMarket);

  const slugMap: Record<PolicyPageProps["type"], string> = {
    privacy: "privacy-policy",
    terms: "terms-of-service",
    cookie: "cookie-policy",
    dpa: "data-processing-agreement",
    subprocessors: "subprocessors",
    "acceptable-use": "acceptable-use-policy",
  };
  const slug = slugMap[type];

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("settings")
          .select("content")
          .eq("id", "platform_policies")
          .maybeSingle();

        if (fetchError) throw fetchError;

        let foundPolicy: PolicyData | undefined;

        const defaultPolicy = DEFAULT_POLICIES.find((p) => p.slug === slug);

        if (data?.content?.policies) {
          foundPolicy = data.content.policies.find((p: any) => p.slug === slug);
        }

        const hasLegacyTerms =
          slug === "terms-of-service" &&
          typeof foundPolicy?.content === "string" &&
          (foundPolicy.content.includes("AI Output Liability") ||
            foundPolicy.content.includes("structured AI Output") ||
            foundPolicy.content.includes("AI-driven managed website service") ||
            foundPolicy.content.includes("minimum six-month initial service term") ||
            foundPolicy.content.includes("12-month initial commitment"));

        if (!foundPolicy || hasLegacyTerms) {
          if (defaultPolicy) {
            foundPolicy = {
              title: defaultPolicy.title,
              content: defaultPolicy.content,
              updatedAt: new Date().toLocaleDateString(),
            };
          }
        }

        if (foundPolicy) {
          setPolicy(foundPolicy);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Error fetching policy:", err);
        const defaultPolicy = DEFAULT_POLICIES.find((p) => p.slug === slug);
        if (defaultPolicy) {
          setPolicy({
            title: defaultPolicy.title,
            content: defaultPolicy.content,
            updatedAt: new Date().toLocaleDateString(),
          });
          setError(false);
        } else {
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, [slug]);

  const Icon = type === "privacy" || type === "cookie" ? Shield : Scale;
  const headingId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const documentContent = policy?.content?.replace(/^#\s+[^\n]+\n+/, "") || "";
  const policyHeadings = documentContent
    .split("\n")
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, "").trim());
  const managedCommitments = commercialProducts
    .filter((product) => ["personal-profile", "managed-website", "website-growth", "growth-partner"].includes(product.slug))
    .map((product) => ({
      slug: product.slug,
      name: product.name,
      months: getMinimumTermMonths(product.prices?.[0]),
    }));

  if (loading) {
    return (
      <div className="brand-public min-h-screen flex items-center justify-center bg-[#f6f7fb]">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !policy) {
    return (
      <div className="brand-public min-h-screen flex flex-col items-center justify-center bg-[#f6f7fb] p-4 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Policy Not Found
        </h2>
        <p className="text-slate-600 mb-6">
          We couldn't load the requested legal document.
        </p>
        <Button onClick={() => navigate("/")}>Return Home</Button>
      </div>
    );
  }

  return (
    <div className="brand-public min-h-screen bg-[#f6f7fb] text-[#141821]">
      <Helmet>
        <title>{policy.title} | Bennie Studio</title>
        <meta name="description" content={`${policy.title} for Bennie Studio managed website customers and visitors.`} />
        <link rel="canonical" href={`${window.location.origin}${window.location.pathname}`} />
      </Helmet>
      <PublicSiteHeader />
      <main>
        <section className="brand-grid-bg border-b border-white/10 bg-[#0b1020] text-white">
          <div className="brand-shell py-14 sm:py-20">
            <p className="brand-kicker !text-[#b9b1ff]">Legal & policy</p>
            <h1 className="mt-4 !text-white">{policy.title}</h1>
            <p className="brand-copy brand-muted-on-dark mt-5">This document explains the terms, data handling or platform rules that apply to Bennie Studio visitors and managed website customers.</p>
          </div>
        </section>
        <section className="brand-shell py-12 sm:py-16">
          <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,760px)] lg:justify-center">
            <aside className="hidden lg:block">
              <div className="sticky top-28">
                <p className="text-sm font-semibold">On this page</p>
                <nav className="mt-4 space-y-2">
                  {policyHeadings.map((heading) => <a key={heading} href={"#" + headingId(heading)} className="block text-sm text-[#707b8a] hover:text-[#5746e8]">{heading}</a>)}
                </nav>
              </div>
            </aside>
            <article className="min-w-0">
              <details className="mb-8 border-y border-[#d8d9dc] py-4 lg:hidden">
                <summary className="cursor-pointer font-semibold">On this page</summary>
                <nav className="mt-4 space-y-2">{policyHeadings.map((heading)=><a key={heading} href={"#" + headingId(heading)} className="block text-sm text-[#526071]">{heading}</a>)}</nav>
              </details>
              {type === "terms" ? (
                <div className="mb-8 border border-indigo-200 bg-indigo-50 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-indigo-700">Current configured commitment · {COMMERCIAL_MARKETS[commercialMarket].label}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                    These values are read live from the Products & Pricing catalogue. When an administrator changes a plan's minimum term, this notice, public pricing and new checkout sessions update from the same source of truth.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {commercialTermsLoading ? <span className="text-xs font-bold text-slate-500">Loading current commercial terms…</span> : managedCommitments.map((item) => (
                      <span key={item.slug} className="border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">{item.name}: {item.months === 0 ? "Month-to-month" : `${item.months} month${item.months === 1 ? "" : "s"}`}</span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">The plan/market term shown on the accepted order or proposal governs that specific order if it differs from the current catalogue.</p>
                </div>
              ) : null}
              <div className="legal-document prose prose-slate max-w-none">
                <ReactMarkdown components={{
                  h2: ({children}) => {
                    const text = React.Children.toArray(children).join("");
                    return <h2 id={headingId(text)}>{children}</h2>;
                  },
                }}>{documentContent}</ReactMarkdown>
              </div>
              <div className="mt-14 border-t border-[#d8d9dc] pt-6 text-sm text-[#526071]">
                <p>Bennie Studio · Legal and platform compliance</p>
                {policy.updatedAt ? <p className="mt-1">Last updated: {new Date(policy.updatedAt).toLocaleDateString()}</p> : null}
              </div>
            </article>
          </div>
        </section>
      </main>
      <PublicSiteFooter />
    </div>
  );}
