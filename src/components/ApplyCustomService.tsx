import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Check, Loader2, Send, Sparkles, Building, Briefcase, User } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { DEFAULT_LANDING_CONTENT } from "../constants/landingPageContent";
import { CUSTOM_WEBSITE_QUOTE_RANGES } from "../constants/reviewPoweredWaas";
import { toast } from "sonner";
import { useGeoPricing } from "../hooks/useGeoPricing";
import { WORDPRESS_PROJECT_STATUS_LABELS } from "../constants/salesFlow";

const yesNoFields = [
  ["needsEcommerce", "E-commerce requirement?"],
  ["needsBooking", "Booking requirement?"],
  ["needsMembership", "Membership requirement?"],
  ["needsMultilingual", "Multilingual requirement?"],
] as const;

export default function ApplyCustomService() {
  const location = useLocation();
  const navigate = useNavigate();
  const geoPricing = useGeoPricing();
  const selectedPackageId = location.state?.package || "premium-custom";
  const customServices = DEFAULT_LANDING_CONTENT.customServices.items;
  const currentPackage = customServices.find((s: any) => s.id === selectedPackageId) || customServices[0];

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contactName: "",
    businessName: "",
    email: "",
    phone: "",
    websiteUrl: "",
    businessType: "",
    requiredPages: "",
    requiredFunctionality: "",
    pageCount: "5",
    needsEcommerce: "no",
    needsBooking: "no",
    needsMembership: "no",
    needsMultilingual: "no",
    integrations: "",
    contentReadiness: "partially_ready",
    preferredLaunchDate: "",
    indicativeBudget: "",
    additionalDetails: "",
  });

  const estimatedQuote =
    formData.needsEcommerce === "yes" || formData.needsBooking === "yes" || formData.needsMembership === "yes"
      ? CUSTOM_WEBSITE_QUOTE_RANGES[3]
      : Number(formData.pageCount) > 8 || formData.needsMultilingual === "yes"
        ? CUSTOM_WEBSITE_QUOTE_RANGES[2]
        : Number(formData.pageCount) >= 5
          ? CUSTOM_WEBSITE_QUOTE_RANGES[1]
          : CUSTOM_WEBSITE_QUOTE_RANGES[0];

  const packagePrice = geoPricing.formatUsd(1500, { applyGeoDiscount: false });
  const estimatedQuoteRange = geoPricing.formatUsdRange(
    estimatedQuote.minUsd,
    estimatedQuote.maxUsd,
    { from: true, plus: true, applyGeoDiscount: false },
  );

  const updateField = (key: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/wordpress-project-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          packageName: currentPackage.name,
          pipelineStatus: "new_enquiry",
          sourcePage: window.location.pathname,
          estimatedQuoteRange: {
            ...estimatedQuote,
            formattedRange: estimatedQuoteRange,
            currency: geoPricing.currency.code,
          },
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Failed to submit quotation request");
      }

      toast.success("Quotation request submitted. We will review the scope and contact you soon.");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit quotation request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
          >
            <Sparkles className="h-4 w-4" />
            Custom WordPress Website
          </motion.div>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Request a WordPress Website Quotation
          </h1>
          <p className="mx-auto max-w-2xl text-lg font-medium text-slate-500">
            Submit the qualification form first. Portal access, onboarding, milestones, and production work begin after quotation acceptance and deposit payment.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card className="sticky top-8 overflow-hidden rounded-[2rem] border-none bg-slate-900 text-white shadow-2xl">
              <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-indigo-500 to-emerald-500" />
              <CardHeader className="pt-10">
                <CardTitle className="text-2xl font-black">{currentPackage.name}</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Quoted WordPress project
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-4xl font-black text-indigo-400">{packagePrice}+</div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Indicative Range</p>
                  <p className="mt-1 text-lg font-black text-white">{estimatedQuoteRange}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-300">{estimatedQuote.label}</p>
                </div>
                <ul className="space-y-4">
                  {currentPackage.features.map((feature: string) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />
                      <span className="text-sm font-medium leading-tight text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Pipeline starts at</p>
                  <p className="mt-2 text-base font-black text-white">{WORDPRESS_PROJECT_STATUS_LABELS.new_enquiry}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="rounded-[2.5rem] border-none shadow-2xl">
              <CardContent className="p-8 sm:p-10">
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <Field label="Contact Name" icon={User}>
                      <Input required value={formData.contactName} onChange={(e) => updateField("contactName", e.target.value)} placeholder="Your name" className="h-12 rounded-xl border-none bg-slate-50 pl-11 dark:bg-slate-800" />
                    </Field>
                    <Field label="Company Name" icon={Building}>
                      <Input required value={formData.businessName} onChange={(e) => updateField("businessName", e.target.value)} placeholder="Company name" className="h-12 rounded-xl border-none bg-slate-50 pl-11 dark:bg-slate-800" />
                    </Field>
                    <Field label="Email">
                      <Input required type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} placeholder="you@company.com" className="h-12 rounded-xl border-none bg-slate-50 dark:bg-slate-800" />
                    </Field>
                    <Field label="Telephone or WhatsApp">
                      <Input required value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="+60..." className="h-12 rounded-xl border-none bg-slate-50 dark:bg-slate-800" />
                    </Field>
                    <Field label="Existing Website">
                      <Input value={formData.websiteUrl} onChange={(e) => updateField("websiteUrl", e.target.value)} placeholder="https:// or none" className="h-12 rounded-xl border-none bg-slate-50 dark:bg-slate-800" />
                    </Field>
                    <Field label="Business Type" icon={Briefcase}>
                      <Input required value={formData.businessType} onChange={(e) => updateField("businessType", e.target.value)} placeholder="Clinic, retailer, consultant..." className="h-12 rounded-xl border-none bg-slate-50 pl-11 dark:bg-slate-800" />
                    </Field>
                  </div>

                  <Field label="Required Pages">
                    <Textarea required value={formData.requiredPages} onChange={(e) => updateField("requiredPages", e.target.value)} placeholder="Home, About, Services, Products, Blog, Contact..." className="min-h-[120px] rounded-[1.5rem] border-none bg-slate-50 p-4 dark:bg-slate-800" />
                  </Field>
                  <Field label="Required Functionality">
                    <Textarea required value={formData.requiredFunctionality} onChange={(e) => updateField("requiredFunctionality", e.target.value)} placeholder="Forms, filters, payments, booking, member areas, catalogues, content features..." className="min-h-[120px] rounded-[1.5rem] border-none bg-slate-50 p-4 dark:bg-slate-800" />
                  </Field>

                  <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
                    <p className="mb-5 text-xs font-black uppercase tracking-widest text-slate-400">Website Scope</p>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <Field label="Number of pages">
                        <Input value={formData.pageCount} onChange={(e) => updateField("pageCount", e.target.value)} placeholder="5" className="h-12 rounded-xl border-none bg-white font-bold dark:bg-slate-800" />
                      </Field>
                      {yesNoFields.map(([key, label]) => (
                        <Field key={key} label={label}>
                          <Select value={formData[key]} onValueChange={(value) => updateField(key, value)}>
                            <SelectTrigger className="h-12 w-full rounded-xl border-none bg-white font-bold dark:bg-slate-800">
                              <SelectValue placeholder="Select yes or no" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <Field label="Integrations">
                      <Input value={formData.integrations} onChange={(e) => updateField("integrations", e.target.value)} placeholder="Stripe, CRM, Mailchimp, WhatsApp..." className="h-12 rounded-xl border-none bg-slate-50 dark:bg-slate-800" />
                    </Field>
                    <Field label="Content Readiness">
                      <Select value={formData.contentReadiness} onValueChange={(value) => updateField("contentReadiness", value)}>
                        <SelectTrigger className="h-12 w-full rounded-xl border-none bg-slate-50 font-bold dark:bg-slate-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="ready">Ready</SelectItem>
                          <SelectItem value="partially_ready">Partially ready</SelectItem>
                          <SelectItem value="needs_help">Need help preparing content</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Preferred Launch Date">
                      <Input type="date" value={formData.preferredLaunchDate} onChange={(e) => updateField("preferredLaunchDate", e.target.value)} className="h-12 rounded-xl border-none bg-slate-50 dark:bg-slate-800" />
                    </Field>
                    <Field label="Indicative Budget">
                      <Input required value={formData.indicativeBudget} onChange={(e) => updateField("indicativeBudget", e.target.value)} placeholder="e.g. RM8,000 - RM15,000" className="h-12 rounded-xl border-none bg-slate-50 dark:bg-slate-800" />
                    </Field>
                  </div>

                  <Field label="Additional Details">
                    <Textarea value={formData.additionalDetails} onChange={(e) => updateField("additionalDetails", e.target.value)} placeholder="Deadlines, design references, stakeholder notes, maintenance needs, or special requirements." className="min-h-[120px] rounded-[1.5rem] border-none bg-slate-50 p-4 dark:bg-slate-800" />
                  </Field>

                  <div className="rounded-[2rem] border border-slate-100 bg-white p-5 text-sm font-semibold leading-6 text-slate-600">
                    After review, the next steps are qualification, consultation, quotation, acceptance, deposit payment, portal access, WordPress onboarding, milestones, customer review, final payment, launch, handover, and optional maintenance.
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex h-16 w-full items-center justify-center gap-3 rounded-[1.5rem] bg-indigo-600 text-lg font-black uppercase tracking-widest text-white transition-all duration-500 hover:bg-slate-900"
                  >
                    {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <>Request a Quotation <Send className="h-5 w-5" /></>}
                  </Button>
                  <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Qualification request only. Deposit and portal access happen after quotation acceptance.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: any; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</Label>
      <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
        {children}
      </div>
    </div>
  );
}
