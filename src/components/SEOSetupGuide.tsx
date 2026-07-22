import React from "react";
import { CheckCircle2, Copy, Globe, Search, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";

export function SEOSetupGuide() {
  const [domain, setDomain] = React.useState(localStorage.getItem("bts_setup_domain") || "");
  const records = [
    { type: "A", name: "@", value: "76.76.21.21" },
    { type: "CNAME", name: "www", value: "provided during managed hosting setup" },
  ];

  React.useEffect(() => {
    localStorage.setItem("bts_setup_domain", domain);
  }, [domain]);

  const copy = (value: string) => {
    navigator.clipboard?.writeText(value);
    toast.success("Copied.");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Domain + SEO Setup</h1>
        <p className="mt-2 text-sm font-bold uppercase tracking-widest text-slate-400">
          Customer-ready checklist for launch, local SEO, and Google indexing.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card className="rounded-3xl border-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-indigo-600" /> Custom Domain</CardTitle>
            <CardDescription>Use these DNS records when connecting a customer domain to managed hosting.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="www.customer-domain.com" className="h-12 rounded-xl" />
            <div className="overflow-hidden rounded-2xl border border-slate-100">
              {records.map((record) => (
                <div key={record.type + record.name} className="grid grid-cols-[80px_1fr_1fr_48px] items-center gap-3 border-b border-slate-100 p-4 last:border-b-0">
                  <span className="font-black text-indigo-600">{record.type}</span>
                  <span className="text-sm font-bold text-slate-700">{record.name}</span>
                  <span className="truncate text-sm font-medium text-slate-500">{record.value}</span>
                  <Button size="icon" variant="ghost" onClick={() => copy(record.value)}><Copy className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5 text-indigo-600" /> SEO Launch Checklist</CardTitle>
            <CardDescription>Run this before telling a customer the site is live.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "Homepage title and meta description match the business offer",
              "Every core service has a clear page or section",
              "City/location terms are included naturally",
              "Open Graph title/image are ready for WhatsApp sharing",
              "Sitemap submitted in Google Search Console",
              "Contact form and WhatsApp CTA tested on mobile",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                <span className="text-sm font-bold text-slate-700">{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-slate-100 bg-indigo-50/50">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-indigo-600">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-slate-900">Customer handover note</h3>
            <p className="text-sm font-medium text-slate-600">
              After DNS is connected, wait for SSL to issue, then test homepage, service pages, forms, booking, and WhatsApp from a mobile connection.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
