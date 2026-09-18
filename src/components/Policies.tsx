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
            foundPolicy.content.includes("AI-driven managed website service"));

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

  if (loading) {
    return (
      <div className="brand-public min-h-screen flex items-center justify-center bg-[#f7f6f2]">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !policy) {
    return (
      <div className="brand-public min-h-screen flex flex-col items-center justify-center bg-[#f7f6f2] p-4 text-center">
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
    <div className="brand-public min-h-screen bg-[#f7f6f2] text-[#141821]">
      <Helmet>
        <title>{policy.title} | Bennie Studio</title>
        <meta name="description" content={`${policy.title} for Bennie Studio managed website customers and visitors.`} />
        <link rel="canonical" href={`${window.location.origin}${window.location.pathname}`} />
      </Helmet>
      <PublicSiteHeader />
      <main>
        <section className="border-b border-[#d9d7d0]">
          <div className="brand-shell py-14 sm:py-18">
            <p className="brand-kicker">Legal & policy</p>
            <h1 className="mt-4">{policy.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#5f6673]">This document explains the terms, data handling or platform rules that apply to Bennie Studio visitors and managed website customers.</p>
          </div>
        </section>
        <section className="brand-shell py-12 sm:py-16">
          <article className="mx-auto max-w-4xl">
            <div className="prose prose-slate max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-p:text-base prose-p:leading-8 prose-li:text-base prose-li:leading-8 prose-h2:mt-12 prose-h2:border-b prose-h2:border-[#d9d7d0] prose-h2:pb-3">
              <ReactMarkdown>{policy.content}</ReactMarkdown>
            </div>
            <div className="mt-14 border-t border-[#d9d7d0] pt-6 text-sm text-[#5f6673]">
              <p>Bennie Studio · Legal and platform compliance</p>
              {policy.updatedAt ? <p className="mt-1">Last updated: {new Date(policy.updatedAt).toLocaleDateString()}</p> : null}
            </div>
          </article>
        </section>
      </main>
      <PublicSiteFooter />
    </div>
  );}
