/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Save, Shield, Globe, Cookie, FileText, Lock, PoundSterling, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import { toast } from "sonner";

const DEFAULT_SETTINGS = {
  targetMarket: "UK",
  currency: "GBP",
  currencySymbol: "£",
  wordingVariant: "uk",
  ukTemplatesEnabled: true,
  cookieBannerEnabled: true,
  analyticsRequiresConsent: true,
  marketingRequiresConsent: true,
  analyticsScriptsEnabled: false,
  marketingScriptsEnabled: false,
  secureFormsEnabled: true,
  marketingConsentEnabled: true,
  consentVersion: "secure_consent_form_v2",
  cookieConsentVersion: "cookie_consent_v2",
  retentionPeriodDays: 365,
  plans: [
    { id: "starter", name: "Starter", price: "£49/month", description: "A managed one-page website for fast launch." },
    { id: "growth", name: "Growth", price: "£99/month", description: "A complete small business website with key pages." },
    { id: "authority", name: "Authority", price: "£199/month", description: "More pages, local SEO structure, and growth support." },
  ],
  customWebsiteFrom: "£1,500",
  customWebsiteRange: "from £1,500",
  legal: {
    businessLegalName: "Bennie Studio",
    businessAddress: "",
    contactEmail: "hello@bennietay.com",
    privacyEmail: "support@bennietay.com",
    servicesOffered: "Managed website subscriptions, custom website services, support, and related digital services.",
    dataCollected: "Name, email address, phone number, business details, website enquiries, billing and support information.",
    thirdPartyTools: "Hosting, database, email, payments, analytics, DNS/security, and support tools.",
    marketingConsentCollected: true,
  },
  hosting: {
    sslStatus: "Enabled",
    hostingProvider: "Managed hosting provider",
    deploymentUrl: "",
    customDomainStatus: "Not connected",
    backupStatus: "Managed platform backups where available",
    dpaUrl: "",
  },
  subprocessors: [
    { category: "Hosting", provider: "Managed hosting provider", purpose: "Website hosting and delivery" },
    { category: "Database", provider: "Supabase", purpose: "Database, authentication, and lead storage" },
    { category: "Payments", provider: "Stripe", purpose: "Subscription and payment processing" },
    { category: "Email", provider: "Email service provider", purpose: "Transactional notifications" },
    { category: "Analytics", provider: "Analytics provider", purpose: "Consent-based traffic measurement" },
  ],
  generatedPages: {
    privacy: "",
    cookies: "",
    terms: "",
    subprocessors: "",
    dpa: "",
    acceptableUse: "",
  },
};

const marketPresets: Record<string, any> = {
  UK: { currency: "GBP", currencySymbol: "£", wordingVariant: "uk", ukTemplatesEnabled: true },
  Malaysia: { currency: "MYR", currencySymbol: "RM", wordingVariant: "global", ukTemplatesEnabled: false },
  Singapore: { currency: "SGD", currencySymbol: "S$", wordingVariant: "global", ukTemplatesEnabled: false },
  US: { currency: "USD", currencySymbol: "$", wordingVariant: "us", ukTemplatesEnabled: false },
  Global: { currency: "USD", currencySymbol: "$", wordingVariant: "global", ukTemplatesEnabled: false },
};

const regulatoryProfiles: Record<string, { title: string; summary: string; requirements: string[]; notes: string[] }> = {
  UK: {
    title: "UK GDPR + PECR cookie readiness",
    summary: "Use clear privacy notices, secure lead handling, optional marketing consent, and prior consent for non-essential analytics or marketing cookies.",
    requirements: [
      "Privacy notice must explain controller identity, purposes, lawful basis, recipients, retention, and individual rights.",
      "Non-essential analytics and marketing cookies should not load before consent.",
      "Cookie banner must allow accept, reject non-essential, and manage preferences.",
      "Marketing consent should be separate, optional, and not pre-selected.",
      "Lead records should store consent text, timestamp, source page, and form version.",
    ],
    notes: [
      "Use UK wording such as enquiries and optimised when UK market is selected.",
      "Keep a DPA/subprocessor list available for business customers.",
    ],
  },
  Malaysia: {
    title: "Malaysia PDPA readiness",
    summary: "Use notice-and-choice wording, limit use to stated purposes, protect lead data, and avoid retaining enquiries longer than needed.",
    requirements: [
      "Show a clear privacy notice before collecting personal data.",
      "Explain purposes for contact, support, billing, marketing, and website enquiries.",
      "Keep marketing consent optional and record whether it was given.",
      "Apply reasonable security and retention controls for leads.",
      "Allow customers to export or delete lead data where required and technically available.",
    ],
    notes: [
      "Malaysia pages should use local service-area and WhatsApp enquiry expectations.",
      "Customers should review sector-specific rules if they operate in healthcare, finance, legal, education, or employment.",
    ],
  },
  Singapore: {
    title: "Singapore PDPA readiness",
    summary: "Use notification and consent controls, protect collected leads, and keep purpose limitation clear for customer websites.",
    requirements: [
      "Notify visitors of the purposes for collecting, using, and disclosing personal data.",
      "Keep consent specific to enquiries and separate from marketing updates.",
      "Do not pre-select marketing consent.",
      "Store source page, timestamp, consent status, and form version with lead submissions.",
      "Protect enquiry records and avoid retaining data beyond the configured retention period.",
    ],
    notes: [
      "Singapore buyers usually expect high-trust privacy, clear contact paths, and professional service wording.",
      "Review PDPA obligations when adding analytics, ads, chat widgets, booking tools, or payment tools.",
    ],
  },
  US: {
    title: "US privacy readiness",
    summary: "Use transparent privacy notices, opt-out-aware marketing practices, secure forms, and state-specific review where needed.",
    requirements: [
      "Publish clear privacy, cookie, and terms pages.",
      "Explain analytics, advertising, lead capture, payments, and third-party tools.",
      "Avoid deceptive claims and unsupported testimonials.",
      "Use optional marketing consent and unsubscribe/opt-out processes where applicable.",
      "Review state privacy requirements for California and other regulated markets.",
    ],
    notes: [
      "State-specific privacy rules can vary significantly.",
      "Use this as a platform checklist, not a substitute for US legal review.",
    ],
  },
  Global: {
    title: "Global compliance baseline",
    summary: "Use consent-aware tracking, clear privacy notices, secure forms, retention controls, and market-specific review before launch.",
    requirements: [
      "Publish privacy, cookie, terms, subprocessors, and acceptable use pages.",
      "Gate analytics and marketing scripts behind consent where required.",
      "Store form consent evidence with each lead.",
      "Keep marketing consent optional and not pre-selected.",
      "Review the exact rules for each target market before running ads or collecting leads.",
    ],
    notes: [
      "Use stricter UK-style cookie controls as the safest default when unsure.",
      "Disable scripts that are not configured or not needed.",
    ],
  },
};

const generateLegalPages = (settings: typeof DEFAULT_SETTINGS) => {
  const name = settings.legal.businessLegalName || "the business";
  const email = settings.legal.privacyEmail || settings.legal.contactEmail || "[privacy contact email]";
  const address = settings.legal.businessAddress || "[business address]";
  const retention = settings.retentionPeriodDays || 365;
  const profile = regulatoryProfiles[settings.targetMarket] || regulatoryProfiles.Global;

  return {
    privacy: `# Privacy Policy

This privacy policy explains how ${name} handles personal data submitted through this website.

## Who We Are
Legal name: ${name}

Address: ${address}

Privacy contact: ${email}

## Personal Data We Collect
${settings.legal.dataCollected}

## Why We Use This Data
We use this data to respond to enquiries, prepare website or service information, manage customer relationships, provide support, and meet legal or accounting requirements.

## Market Compliance Context
Target market setting: ${settings.targetMarket}

${profile.summary}

Key items to review:
${profile.requirements.map((item) => `- ${item}`).join("\n")}

## Services Covered
${settings.legal.servicesOffered}

## Third-Party Tools
${settings.legal.thirdPartyTools}

## Marketing Consent
Marketing updates are only sent when consent is requested and provided. Marketing consent is optional and can be withdrawn.

## Retention
Enquiry data is normally retained for up to ${retention} days unless a longer period is required for customer support, accounting, legal, or security reasons.

## Your Rights
Depending on your location, you may request access, correction, deletion, restriction, portability, or objection to processing. Contact ${email} to make a request.

## Important Note
This generated policy is a practical starting point and not legal advice. Review it against your business operations, tools, industry, and target market before publishing.`,
    cookies: `# Cookie Policy

This website uses cookies and similar technologies.

## Cookie Categories
- Strictly necessary cookies: required for the website to work.
- Functional cookies: support preferences and optional features.
- Analytics cookies: help measure website usage and performance.
- Marketing cookies: support advertising, remarketing, or conversion tracking.

Analytics and marketing cookies should not load until the visitor has accepted them.

For UK/PECR-style compliance, reject and manage-preference options should be as easy to use as accepting optional cookies.

## Managing Cookies
Visitors can accept all cookies, reject non-essential cookies, or manage preferences from the cookie banner or footer link.

## Contact
Questions about cookies can be sent to ${email}.`,
    terms: `# Terms of Service

These terms are a placeholder for ${name}. Add your commercial terms, payment rules, cancellation process, service scope, ownership wording, acceptable use rules, and liability wording before publishing.

This page is not legal advice.`,
    subprocessors: `# Subprocessor List

${settings.subprocessors.map((item) => `- ${item.category}: ${item.provider} — ${item.purpose}`).join("\n")}

This list should be reviewed whenever tools or providers change.`,
    dpa: `# Data Processing Agreement

Add your Data Processing Agreement or link to your signed DPA process here. This placeholder is not legal advice.`,
    acceptableUse: `# Acceptable Use Policy

Customers and visitors must not use this service for unlawful, harmful, fraudulent, abusive, or security-compromising activity. Add your full acceptable use wording before publishing.`,
  };
};

export default function ComplianceMarketSettings() {
  const [settings, setSettings] = React.useState<any>(DEFAULT_SETTINGS);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      try {
        const { data } = await supabase
          .from("settings")
          .select("content")
          .eq("id", "compliance_market")
          .maybeSingle();
        setSettings({ ...DEFAULT_SETTINGS, ...(data?.content || {}) });
      } catch (error) {
        console.error("Compliance settings load failed:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const update = (path: string, value: any) => {
    setSettings((prev: any) => {
      const next = structuredClone(prev);
      const parts = path.split(".");
      let target = next;
      parts.slice(0, -1).forEach((part) => {
        target[part] = target[part] || {};
        target = target[part];
      });
      target[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const checklist = [
    ["Privacy Policy completed", !!settings.generatedPages?.privacy],
    ["Cookie banner enabled", !!settings.cookieBannerEnabled],
    ["Cookie Policy completed", !!settings.generatedPages?.cookies],
    ["Secure forms enabled", !!settings.secureFormsEnabled],
    ["Marketing consent is optional", !!settings.marketingConsentEnabled],
    ["Footer legal links active", !!settings.generatedPages?.privacy && !!settings.generatedPages?.cookies],
    ["Analytics blocked before consent", !!settings.analyticsRequiresConsent],
    ["Marketing scripts blocked before consent", !!settings.marketingRequiresConsent],
    ["Consent version configured", !!settings.consentVersion && !!settings.cookieConsentVersion],
    ["GBP pricing enabled for UK", settings.targetMarket !== "UK" || settings.currency === "GBP"],
  ];
  const activeRegulatoryProfile = regulatoryProfiles[settings.targetMarket] || regulatoryProfiles.Global;

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("settings").upsert({
        id: "compliance_market",
        content: settings,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Compliance and market settings saved");
    } catch (error: any) {
      console.error("Compliance settings save failed:", error);
      toast.error(error.message || "Failed to save compliance settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading compliance settings...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-950">Compliance & Market Settings</h2>
              <p className="text-sm text-slate-500">Set market wording, currency, cookie consent, secure forms, and legal page defaults.</p>
            </div>
          </div>
        </div>
        <Button onClick={save} isLoading={saving} className="rounded-xl gap-2">
          <Save className="h-4 w-4" /> Save Settings
        </Button>
      </div>

      <Card className="rounded-3xl border-amber-100 bg-amber-50/60">
        <CardContent className="p-5 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900">
            This module provides practical website compliance scaffolding, not legal advice. Review all generated policies against the actual business operations, tools, contracts, and local legal requirements before publishing.
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-indigo-100 bg-indigo-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-600" />
            {activeRegulatoryProfile.title}
          </CardTitle>
          <CardDescription className="text-slate-700">
            {activeRegulatoryProfile.summary}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl bg-white p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Required operational checks</p>
            <div className="space-y-2">
              {activeRegulatoryProfile.requirements.map((item) => (
                <div key={item} className="flex gap-3 text-sm font-semibold leading-relaxed text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Admin notes</p>
            <div className="space-y-2">
              {activeRegulatoryProfile.notes.map((item) => (
                <div key={item} className="rounded-xl bg-slate-50 p-3 text-sm font-semibold leading-relaxed text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="rounded-3xl xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-indigo-600" /> Market & Currency</CardTitle>
            <CardDescription>Use separate market pricing tables instead of automatic currency conversion.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>Target Market</Label>
              <Select
                value={settings.targetMarket}
                onValueChange={(value) => setSettings((prev: any) => ({ ...prev, targetMarket: value, ...marketPresets[value] }))}
              >
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["UK", "Malaysia", "Singapore", "US", "Global"].map((market) => <SelectItem key={market} value={market}>{market}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input className="rounded-xl" value={settings.currency} onChange={(e) => update("currency", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Currency Symbol</Label>
              <Input className="rounded-xl" value={settings.currencySymbol} onChange={(e) => update("currencySymbol", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Custom Website Range</Label>
              <Input className="rounded-xl" value={settings.customWebsiteRange} onChange={(e) => update("customWebsiteRange", e.target.value)} />
            </div>
            <div className="md:col-span-2 grid md:grid-cols-3 gap-4">
              {(settings.plans || []).map((plan: any, index: number) => (
                <div key={plan.id} className="rounded-2xl border border-slate-200 p-4 space-y-3">
                  <Label>{plan.name}</Label>
                  <Input
                    className="rounded-xl font-bold"
                    value={plan.price}
                    onChange={(e) => {
                      const nextPlans = [...settings.plans];
                      nextPlans[index] = { ...nextPlans[index], price: e.target.value };
                      update("plans", nextPlans);
                    }}
                  />
                  <Textarea
                    className="rounded-xl min-h-[76px]"
                    value={plan.description}
                    onChange={(e) => {
                      const nextPlans = [...settings.plans];
                      nextPlans[index] = { ...nextPlans[index], description: e.target.value };
                      update("plans", nextPlans);
                    }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Compliance Checklist</CardTitle>
            <CardDescription>Warnings highlight items still needing attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {checklist.map(([label, done]) => (
              <div key={String(label)} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
                <span className="text-sm font-bold text-slate-700">{label}</span>
                <Badge className={done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                  {done ? "Done" : "Missing"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Cookie className="h-5 w-5 text-indigo-600" /> Cookie Consent</CardTitle>
            <CardDescription>Non-essential analytics and marketing scripts are gated by consent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ["cookieBannerEnabled", "Enable cookie banner"],
              ["analyticsRequiresConsent", "Block analytics before consent"],
              ["marketingRequiresConsent", "Block marketing before consent"],
              ["analyticsScriptsEnabled", "Allow analytics scripts when consented"],
              ["marketingScriptsEnabled", "Allow marketing scripts when consented"],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                <Label>{label}</Label>
                <Switch checked={!!settings[key]} onCheckedChange={(checked) => update(key, checked)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-indigo-600" /> Secure Forms & Retention</CardTitle>
            <CardDescription>Consent is stored with enquiries and marketing consent remains optional.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
              <Label>Secure form consent text enabled</Label>
              <Switch checked={!!settings.secureFormsEnabled} onCheckedChange={(checked) => update("secureFormsEnabled", checked)} />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
              <Label>Show optional marketing consent checkbox</Label>
              <Switch checked={!!settings.marketingConsentEnabled} onCheckedChange={(checked) => update("marketingConsentEnabled", checked)} />
            </div>
            <div className="space-y-2">
              <Label>Lead retention period in days</Label>
              <Input type="number" className="rounded-xl" value={settings.retentionPeriodDays} onChange={(e) => update("retentionPeriodDays", Number(e.target.value))} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Form consent version</Label>
                <Input className="rounded-xl" value={settings.consentVersion || ""} onChange={(e) => update("consentVersion", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cookie consent version</Label>
                <Input className="rounded-xl" value={settings.cookieConsentVersion || ""} onChange={(e) => update("cookieConsentVersion", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-600" /> Privacy & Cookie Page Generator</CardTitle>
          <CardDescription>Generate policy drafts and footer legal links for customer websites and your own platform.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-5">
          {[
            ["legal.businessLegalName", "Business legal name"],
            ["legal.businessAddress", "Business address"],
            ["legal.contactEmail", "Contact email"],
            ["legal.privacyEmail", "Privacy contact email"],
          ].map(([path, label]) => (
            <div key={path} className="space-y-2">
              <Label>{label}</Label>
              <Input className="rounded-xl" value={path.split(".").reduce((acc: any, key) => acc?.[key], settings) || ""} onChange={(e) => update(path, e.target.value)} />
            </div>
          ))}
          {[
            ["legal.servicesOffered", "Services offered"],
            ["legal.dataCollected", "Data collected through forms"],
            ["legal.thirdPartyTools", "Third-party tools used"],
          ].map(([path, label]) => (
            <div key={path} className="space-y-2 md:col-span-2">
              <Label>{label}</Label>
              <Textarea className="rounded-xl min-h-[90px]" value={path.split(".").reduce((acc: any, key) => acc?.[key], settings) || ""} onChange={(e) => update(path, e.target.value)} />
            </div>
          ))}
          <div className="md:col-span-2">
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => setSettings((prev: any) => ({ ...prev, generatedPages: generateLegalPages(prev) }))}
            >
              <FileText className="h-4 w-4" /> Generate Policy Drafts
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PoundSterling className="h-5 w-5 text-indigo-600" /> Hosting & Security Transparency</CardTitle>
          <CardDescription>Show practical hosting, SSL, domain, backup, DPA, and subprocessor information.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-5">
          {[
            ["hosting.sslStatus", "SSL status"],
            ["hosting.hostingProvider", "Hosting provider"],
            ["hosting.deploymentUrl", "Deployment URL"],
            ["hosting.customDomainStatus", "Custom domain status"],
            ["hosting.backupStatus", "Backup status"],
            ["hosting.dpaUrl", "DPA link placeholder"],
          ].map(([path, label]) => (
            <div key={path} className="space-y-2">
              <Label>{label}</Label>
              <Input className="rounded-xl" value={path.split(".").reduce((acc: any, key) => acc?.[key], settings) || ""} onChange={(e) => update(path, e.target.value)} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
