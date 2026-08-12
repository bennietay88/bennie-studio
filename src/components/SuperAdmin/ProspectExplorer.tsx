import React, { useMemo, useState, useEffect } from "react";
import {
  Search,
  Globe,
  CheckCircle2,
  Loader2,
  Plus,
  Filter,
  Trash2,
  Shield,
  Zap,
  MessageSquare,
  Users,
  Upload,
  Download,
  ExternalLink,
  CalendarDays,
  Copy,
  Mail,
  Phone,
  Link as LinkIcon,
  ArrowRightCircle,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";
import { normalizeWebsiteAuditResult } from "../../lib/websiteAudit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";

const WEBSITE_STATUSES = ["unknown", "no_website", "weak", "average", "strong"];
const OPPORTUNITY_LEVELS = ["low", "medium", "high"];
const OUTREACH_STATUSES = ["not_started", "queued", "contacted", "replied", "call_booked", "won", "lost"];

const cleanDomain = (value: string) =>
  value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0];

const toTitle = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const buildPreviewUrl = (prospect: any) => {
  const params = new URLSearchParams();
  params.set("business", prospect.name || "Prospect");
  if (prospect.industry) params.set("industry", prospect.industry);
  if (prospect.location) params.set("location", prospect.location);
  return `${window.location.origin}/website-audit?${params.toString()}`;
};

export function ProspectExplorer() {
  const [prospects, setProspects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState("all");
  const [selectedProspect, setSelectedProspect] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [saving, setSaving] = useState(false);
  const [convertingProspect, setConvertingProspect] = useState<any | null>(null);
  const [conversionPlan, setConversionPlan] = useState("starter");
  const [conversionSubdomain, setConversionSubdomain] = useState("");
  const [newProspect, setNewProspect] = useState({
    name: "",
    domain: "",
    industry: "",
    location: "",
    contact_email: "",
    contact_phone: "",
    contact_whatsapp: "",
    social_url: "",
    source: "manual",
    opportunity_level: "medium",
    website_status: "unknown",
    outreach_status: "not_started",
    next_follow_up_at: "",
    notes: "",
  });

  useEffect(() => {
    fetchProspects();
  }, []);

  const fetchProspects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProspects(data || []);
    } catch (error: any) {
      console.error("Error fetching prospects:", error);
      toast.error("Failed to load prospects. Apply the prospecting migration if this is the first run.");
    } finally {
      setLoading(false);
    }
  };

  const resetNewProspect = () => {
    setNewProspect({
      name: "",
      domain: "",
      industry: "",
      location: "",
      contact_email: "",
      contact_phone: "",
      contact_whatsapp: "",
      social_url: "",
      source: "manual",
      opportunity_level: "medium",
      website_status: "unknown",
      outreach_status: "not_started",
      next_follow_up_at: "",
      notes: "",
    });
  };

  const handleAddProspect = async () => {
    if (!newProspect.name.trim()) {
      toast.error("Business name is required");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...newProspect,
        domain: newProspect.domain ? cleanDomain(newProspect.domain) : null,
        contact_email: newProspect.contact_email || null,
        contact_phone: newProspect.contact_phone || null,
        contact_whatsapp: newProspect.contact_whatsapp || null,
        social_url: newProspect.social_url || null,
        next_follow_up_at: newProspect.next_follow_up_at || null,
      };
      const { data, error } = await supabase
        .from("prospects")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      setProspects([data, ...prospects]);
      setIsAddModalOpen(false);
      resetNewProspect();
      toast.success("Prospect added");
    } catch (error: any) {
      console.error("Error adding prospect:", error);
      toast.error(error.message || "Failed to add prospect");
    } finally {
      setSaving(false);
    }
  };

  const updateProspect = async (id: string, patch: Record<string, any>) => {
    const previous = prospects;
    setProspects((current) => current.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    const { error } = await supabase.from("prospects").update(patch).eq("id", id);
    if (error) {
      setProspects(previous);
      toast.error(error.message || "Prospect update failed");
      return false;
    }
    return true;
  };

  const deleteProspect = async (id: string) => {
    if (!confirm("Remove this prospect from the internal sales list?")) return;

    try {
      const { error } = await supabase.from("prospects").delete().eq("id", id);
      if (error) throw error;

      setProspects(prospects.filter((p) => p.id !== id));
      toast.success("Prospect removed");
    } catch (error: any) {
      console.error("Error deleting prospect:", error);
      toast.error("Failed to remove prospect");
    }
  };

  const runQuickAudit = async (prospect: any) => {
    if (!prospect.domain) {
      toast.error("Add a public website domain before preparing a review.");
      return;
    }
    const auditResponse = await fetch("/api/public/website-audit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: /^https?:\/\//i.test(prospect.domain) ? prospect.domain : `https://${prospect.domain}` }),
    });
    const payload = await auditResponse.json().catch(() => ({}));
    if (!auditResponse.ok || !payload?.report) {
      toast.error(payload?.error || "The website could not be analysed. No review was created.");
      return;
    }
    const report = normalizeWebsiteAuditResult(payload.report);
    const nextFollowUp = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const ok = await updateProspect(prospect.id, {
      audit_score: null,
      last_audit_at: new Date().toISOString(),
      website_status: "unknown",
      opportunity_level: report.findings.some((finding) => finding.priority === "high") ? "high" : "medium",
      outreach_status: prospect.outreach_status === "not_started" ? "queued" : prospect.outreach_status,
      next_follow_up_at: prospect.next_follow_up_at || nextFollowUp,
    });
    if (ok) toast.success(`Website growth review prepared with ${report.findings.length} opportunities.`);
  };

  const generatePreviewLink = async (prospect: any) => {
    const previewUrl = buildPreviewUrl(prospect);
    const ok = await updateProspect(prospect.id, { preview_url: previewUrl });
    if (ok) {
      await navigator.clipboard.writeText(previewUrl).catch(() => undefined);
      toast.success("Preview/audit link saved and copied");
    }
  };

  const openConversion = (prospect: any) => {
    setConvertingProspect(prospect);
    setConversionPlan("starter");
    setConversionSubdomain(
      cleanDomain(prospect.name || "customer")
        .replace(/\./g, "-")
        .replace(/[^a-z0-9-]/gi, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase(),
    );
  };

  const convertToCustomer = async () => {
    if (!convertingProspect || conversionSubdomain.trim().length < 3) {
      toast.error("Enter a unique subdomain with at least three characters");
      return;
    }
    try {
      setSaving(true);
      const { data, error } = await supabase.rpc("convert_prospect_to_customer", {
        p_prospect_id: convertingProspect.id,
        p_plan: conversionPlan,
        p_subdomain: conversionSubdomain,
      });
      if (error) throw error;
      setProspects((rows) => rows.map((row) => row.id === convertingProspect.id ? {
        ...row,
        converted_business_id: data,
        converted_at: new Date().toISOString(),
        outreach_status: "won",
        status: "converted",
      } : row));
      setConvertingProspect(null);
      toast.success("Prospect converted. Project and onboarding records are ready.");
    } catch (error: any) {
      toast.error(error.message || "Prospect conversion failed");
    } finally {
      setSaving(false);
    }
  };

  const importCsv = async () => {
    const lines = csvText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.length) {
      toast.error("Paste CSV rows first");
      return;
    }
    const rows = lines.map((line) => line.split(",").map((cell) => cell.trim().replace(/^\"|\"$/g, "")));
    const hasHeader = rows[0].some((cell) => /name|business|domain|email/i.test(cell));
    const dataRows = hasHeader ? rows.slice(1) : rows;
    const payload = dataRows
      .map(([name, domain, industry, location, email, phone, whatsapp, social, notes]) => ({
        name,
        domain: domain ? cleanDomain(domain) : null,
        industry: industry || null,
        location: location || null,
        contact_email: email || null,
        contact_phone: phone || null,
        contact_whatsapp: whatsapp || null,
        social_url: social || null,
        notes: notes || null,
        source: "csv_import",
        website_status: "unknown",
        outreach_status: "not_started",
        opportunity_level: "medium",
      }))
      .filter((row) => row.name);

    if (!payload.length) {
      toast.error("No valid prospect rows found");
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase.from("prospects").insert(payload).select();
      if (error) throw error;
      setProspects([...(data || []), ...prospects]);
      setCsvText("");
      setIsImportModalOpen(false);
      toast.success(`${payload.length} prospects imported`);
    } catch (error: any) {
      toast.error(error.message || "CSV import failed");
    } finally {
      setSaving(false);
    }
  };

  const filteredProspects = useMemo(
    () =>
      prospects.filter((p) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          !query ||
          [p.name, p.domain, p.industry, p.location, p.contact_email, p.contact_phone, p.outreach_status]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(query));
        const matchesIndustry = industryFilter === "all" || p.industry === industryFilter;
        const matchesStatus = statusFilter === "all" || p.outreach_status === statusFilter;
        const now = Date.now();
        const matchesQuick = quickFilter === "all"
          || (quickFilter === "follow_up_due" && p.next_follow_up_at && new Date(p.next_follow_up_at).getTime() <= now)
          || (quickFilter === "high" && p.opportunity_level === "high")
          || (quickFilter === "audit_not_sent" && !p.last_audit_at)
          || (quickFilter === "preview" && Boolean(p.preview_url))
          || (quickFilter === "replied" && p.outreach_status === "replied")
          || (quickFilter === "call_booked" && p.outreach_status === "call_booked")
          || (quickFilter === "ready" && ["replied", "call_booked"].includes(p.outreach_status) && !p.converted_business_id);
        return matchesSearch && matchesIndustry && matchesStatus && matchesQuick;
      }),
    [prospects, searchQuery, industryFilter, statusFilter, quickFilter],
  );

  const industries = useMemo(
    () => Array.from(new Set(prospects.map((p) => p.industry).filter(Boolean))).sort(),
    [prospects],
  );

  const stats = useMemo(() => {
    const high = prospects.filter((p) => p.opportunity_level === "high").length;
    const contacted = prospects.filter((p) => ["contacted", "replied", "call_booked", "won"].includes(p.outreach_status)).length;
    const booked = prospects.filter((p) => p.outreach_status === "call_booked").length;
    const due = prospects.filter((p) => p.next_follow_up_at && new Date(p.next_follow_up_at) <= new Date()).length;
    return { total: prospects.length, high, contacted, booked, due };
  }, [prospects]);

  const exportCsv = () => {
    const rows = [
      ["Name", "Domain", "Industry", "Location", "Email", "Phone", "WhatsApp", "Social", "Website Status", "Opportunity", "Outreach Status", "Next Follow Up", "Preview URL", "Notes"],
      ...filteredProspects.map((p) => [
        p.name,
        p.domain || "",
        p.industry || "",
        p.location || "",
        p.contact_email || "",
        p.contact_phone || "",
        p.contact_whatsapp || "",
        p.social_url || "",
        p.website_status || "",
        p.opportunity_level || "",
        p.outreach_status || "",
        p.next_follow_up_at || "",
        p.preview_url || "",
        p.notes || "",
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bennie-sales-prospects.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Prospect CSV exported");
  };

  const seedMalaysiaDentalSearch = () => {
    setSearchQuery("dental malaysia");
    setNewProspect({
      ...newProspect,
      industry: "Dental Clinic",
      location: "Malaysia",
      website_status: "weak",
      opportunity_level: "high",
      notes: "Prioritize clinics with no website, outdated mobile UX, missing WhatsApp CTA, weak local SEO, or no online booking path.",
    });
    setIsAddModalOpen(true);
  };

  const renderContactActions = (prospect: any) => {
    const emailHref = prospect.contact_email ? `mailto:${prospect.contact_email}` : "";
    const phoneHref = prospect.contact_phone ? `tel:${prospect.contact_phone}` : "";
    const whatsappHref = prospect.contact_whatsapp
      ? `https://wa.me/${String(prospect.contact_whatsapp).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi ${prospect.name}, I prepared a quick website growth audit for your business. Can I send it over?`)}`
      : "";

    return (
      <div className="flex flex-wrap gap-1.5">
        {emailHref && (
          <a href={emailHref} className="inline-flex h-8 items-center rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50">
            <Mail className="mr-1.5 h-3 w-3" />Email
          </a>
        )}
        {phoneHref && (
          <a href={phoneHref} className="inline-flex h-8 items-center rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50">
            <Phone className="mr-1.5 h-3 w-3" />Call
          </a>
        )}
        {whatsappHref && (
          <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50">
            <MessageSquare className="mr-1.5 h-3 w-3" />WA
          </a>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 pt-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 dark:text-white">
            Sales Prospecting <span className="text-indigo-600">Workspace</span>
          </h1>
          <p className="mt-1 max-w-3xl text-sm font-bold text-slate-500">
            Build targeted lead lists, qualify weak websites, generate preview/audit links, and track follow-up status before prospects become customers.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-xl border-slate-200" onClick={seedMalaysiaDentalSearch}>Malaysia Dental</Button>
          <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => setIsImportModalOpen(true)}><Upload className="mr-2 h-4 w-4" />Import CSV</Button>
          <Button variant="outline" className="rounded-xl border-slate-200" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
          <Button onClick={() => setIsAddModalOpen(true)} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold">
            <Plus className="h-4 w-4 mr-2" /> Add Prospect
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {[
          ["Total", stats.total, Users],
          ["High Opportunity", stats.high, Zap],
          ["Contacted", stats.contacted, MessageSquare],
          ["Calls Booked", stats.booked, CalendarDays],
          ["Due Follow-Up", stats.due, Shield],
        ].map(([label, value, Icon]: any) => (
          <Card key={label} className="rounded-3xl border-slate-100 shadow-sm">
            <CardContent className="p-5">
              <Icon className="h-5 w-5 text-indigo-600" />
              <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
              <p className="text-3xl font-black text-slate-950">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-white p-4">
          {[["all","All"],["follow_up_due","Follow-up due"],["high","High opportunity"],["audit_not_sent","Audit not prepared"],["preview","Preview generated"],["replied","Replied"],["call_booked","Call booked"],["ready","Ready to convert"]].map(([id,label]) => <Button key={id} size="sm" variant={quickFilter === id ? "default" : "outline"} onClick={() => setQuickFilter(id)} className="rounded-xl text-xs">{label}</Button>)}
        </div>
        <div className="grid gap-3 border-b border-slate-100 bg-slate-50 p-4 lg:grid-cols-[1fr_220px_220px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by business, domain, industry, location, email, phone, or status..."
              className="pl-10 bg-white border-slate-200 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={industryFilter} onValueChange={setIndustryFilter}>
            <SelectTrigger className="rounded-xl bg-white"><SelectValue placeholder="Industry" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All industries</SelectItem>
              {industries.map((industry) => <SelectItem key={industry} value={industry}>{industry}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="rounded-xl bg-white"><SelectValue placeholder="Outreach" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outreach</SelectItem>
              {OUTREACH_STATUSES.map((status) => <SelectItem key={status} value={status}>{toTitle(status)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" className="rounded-xl px-6" onClick={() => { setSearchQuery(""); setIndustryFilter("all"); setStatusFilter("all"); }}>
            <Filter className="h-4 w-4 mr-2 text-slate-400" /> Reset
          </Button>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Company</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Website</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Opportunity</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Outreach</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Next Step</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" /><p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading prospects...</p></td></tr>
                ) : filteredProspects.length === 0 ? (
                  <tr><td colSpan={7} className="py-20 text-center"><p className="text-slate-400 font-bold text-sm">No prospects found.</p></td></tr>
                ) : (
                  filteredProspects.map((prospect) => (
                    <tr key={prospect.id} className="hover:bg-slate-50/50 transition-colors align-top">
                      <td className="px-6 py-6">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center"><Globe className="h-5 w-5 text-slate-400" /></div>
                          <div className="min-w-0">
                            <button type="button" onClick={() => setSelectedProspect(prospect)} className="text-left text-sm font-black italic text-slate-900 hover:text-indigo-600 dark:text-white">{prospect.name}</button>
                            <p className="text-[10px] font-bold text-slate-400">{prospect.industry || "No industry"} {prospect.location ? `• ${prospect.location}` : ""}</p>
                            {prospect.domain && <a className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600" href={`https://${prospect.domain}`} target="_blank" rel="noreferrer">{prospect.domain}<ExternalLink className="h-3 w-3" /></a>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        {renderContactActions(prospect)}
                        <p className="mt-2 text-[10px] font-semibold text-slate-400">{prospect.contact_email || prospect.contact_phone || prospect.contact_whatsapp || "No contact yet"}</p>
                      </td>
                      <td className="px-6 py-6">
                        <Badge className="rounded-full border-none bg-slate-100 px-3 py-0.5 text-[8px] font-black uppercase text-slate-600">{toTitle(prospect.website_status || "unknown")}</Badge>
                        <p className="mt-2 text-xs font-bold text-slate-500">Website review: {prospect.last_audit_at ? "Prepared" : "Not prepared"}</p>
                        <p className="text-[10px] font-bold text-slate-400">{prospect.last_audit_at ? format(new Date(prospect.last_audit_at), "MMM dd, yyyy") : "No audit date"}</p>
                      </td>
                      <td className="px-6 py-6">
                        <Select value={prospect.opportunity_level || "medium"} onValueChange={(value) => updateProspect(prospect.id, { opportunity_level: value })}>
                          <SelectTrigger className="h-9 w-32 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>{OPPORTUNITY_LEVELS.map((level) => <SelectItem key={level} value={level}>{toTitle(level)}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-6">
                        <Select value={prospect.outreach_status || "not_started"} onValueChange={(value) => updateProspect(prospect.id, { outreach_status: value })}>
                          <SelectTrigger className="h-9 w-40 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>{OUTREACH_STATUSES.map((status) => <SelectItem key={status} value={status}>{toTitle(status)}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-6">
                        <Input
                          type="date"
                          className="h-9 w-40 rounded-xl"
                          value={prospect.next_follow_up_at ? prospect.next_follow_up_at.slice(0, 10) : ""}
                          onChange={(e) => updateProspect(prospect.id, { next_follow_up_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                        />
                        {prospect.preview_url && <a href={prospect.preview_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-indigo-600"><LinkIcon className="h-3 w-3" /> Preview link</a>}
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" className="rounded-xl h-8 text-[8px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50" onClick={() => runQuickAudit(prospect)}><Zap className="h-3 w-3 mr-1.5" />Audit</Button>
                          <Button variant="ghost" size="sm" className="rounded-xl h-8 text-[8px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50" onClick={() => generatePreviewLink(prospect)}><Copy className="h-3 w-3 mr-1.5" />Preview</Button>
                          {!prospect.converted_business_id && (
                            <Button variant="ghost" size="sm" className="rounded-xl h-8 text-[8px] font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-50" onClick={() => openConversion(prospect)}><ArrowRightCircle className="h-3 w-3 mr-1.5" />Convert</Button>
                          )}
                          {prospect.converted_business_id && <Badge className="bg-emerald-100 text-emerald-700">Customer</Badge>}
                          <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 hover:bg-rose-50 hover:text-rose-600" onClick={() => deleteProspect(prospect.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
        <Shield className="absolute -right-4 -top-4 h-32 w-32 text-indigo-500/10 group-hover:rotate-12 transition-transform duration-700" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="h-16 w-16 rounded-2xl bg-indigo-600/20 backdrop-blur-md flex items-center justify-center border border-indigo-500/30"><Search className="h-8 w-8 text-indigo-400" /></div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">Manual-first prospect workflow</h3>
            <p className="text-slate-300 text-sm font-bold">Import your list, qualify weak websites, create audit links, contact by email/phone/WhatsApp, and track every next step.</p>
          </div>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[10px]" onClick={() => setIsImportModalOpen(true)}>
            Import Lead List
          </Button>
        </div>
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="rounded-3xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase tracking-tight">Add New Prospect</DialogTitle>
            <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add a business for audit, preview, and outreach tracking.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 md:grid-cols-2">
            <Field label="Business Name"><Input value={newProspect.name} onChange={(e) => setNewProspect({ ...newProspect, name: e.target.value })} placeholder="e.g. Acme Dental" className="rounded-xl" /></Field>
            <Field label="Website / Domain"><Input value={newProspect.domain} onChange={(e) => setNewProspect({ ...newProspect, domain: e.target.value })} placeholder="acme.com" className="rounded-xl" /></Field>
            <Field label="Industry"><Input value={newProspect.industry} onChange={(e) => setNewProspect({ ...newProspect, industry: e.target.value })} placeholder="Dental Clinic" className="rounded-xl" /></Field>
            <Field label="Location"><Input value={newProspect.location} onChange={(e) => setNewProspect({ ...newProspect, location: e.target.value })} placeholder="Kuala Lumpur" className="rounded-xl" /></Field>
            <Field label="Email"><Input value={newProspect.contact_email} onChange={(e) => setNewProspect({ ...newProspect, contact_email: e.target.value })} placeholder="owner@example.com" className="rounded-xl" /></Field>
            <Field label="Phone"><Input value={newProspect.contact_phone} onChange={(e) => setNewProspect({ ...newProspect, contact_phone: e.target.value })} placeholder="+60..." className="rounded-xl" /></Field>
            <Field label="WhatsApp"><Input value={newProspect.contact_whatsapp} onChange={(e) => setNewProspect({ ...newProspect, contact_whatsapp: e.target.value })} placeholder="6012..." className="rounded-xl" /></Field>
            <Field label="Social URL"><Input value={newProspect.social_url} onChange={(e) => setNewProspect({ ...newProspect, social_url: e.target.value })} placeholder="Instagram/Facebook/LinkedIn URL" className="rounded-xl" /></Field>
            <Field label="Website Status"><Select value={newProspect.website_status} onValueChange={(value) => setNewProspect({ ...newProspect, website_status: value })}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{WEBSITE_STATUSES.map((status) => <SelectItem key={status} value={status}>{toTitle(status)}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Opportunity"><Select value={newProspect.opportunity_level} onValueChange={(value) => setNewProspect({ ...newProspect, opportunity_level: value })}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{OPPORTUNITY_LEVELS.map((level) => <SelectItem key={level} value={level}>{toTitle(level)}</SelectItem>)}</SelectContent></Select></Field>
            <Field label="Next Follow-Up"><Input type="date" value={newProspect.next_follow_up_at} onChange={(e) => setNewProspect({ ...newProspect, next_follow_up_at: e.target.value })} className="rounded-xl" /></Field>
            <Field label="Source"><Input value={newProspect.source} onChange={(e) => setNewProspect({ ...newProspect, source: e.target.value })} placeholder="manual, OSM, referral..." className="rounded-xl" /></Field>
            <div className="md:col-span-2"><Field label="Notes"><Textarea value={newProspect.notes} onChange={(e) => setNewProspect({ ...newProspect, notes: e.target.value })} placeholder="No website, poor mobile UX, missing WhatsApp CTA..." className="min-h-24 rounded-xl" /></Field></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleAddProspect} disabled={saving} className="rounded-xl bg-indigo-600">{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}Create Prospect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="rounded-3xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase tracking-tight">Import Prospects</DialogTitle>
            <DialogDescription>Paste CSV rows in this order: name, domain, industry, location, email, phone, whatsapp, social, notes.</DialogDescription>
          </DialogHeader>
          <Textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} className="min-h-64 rounded-2xl font-mono text-xs" placeholder={'Business Name,example.com,Dental Clinic,Kuala Lumpur,hello@example.com,+6012...,6012...,https://instagram.com/example,"Weak website and no WhatsApp CTA"'} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportModalOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={importCsv} disabled={saving} className="rounded-xl bg-indigo-600">{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(convertingProspect)} onOpenChange={(open) => !open && setConvertingProspect(null)}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle>Convert Prospect to Customer</DialogTitle>
            <DialogDescription>
              Creates a trial business, production project, and client onboarding queue entry for {convertingProspect?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <Field label="Starting plan">
              <Select value={conversionPlan} onValueChange={setConversionPlan}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Customer subdomain">
              <Input value={conversionSubdomain} onChange={(event) => setConversionSubdomain(event.target.value)} placeholder="customer-name" className="rounded-xl" />
            </Field>
            <div className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
              This creates the business workspace without an owner login. Assign or invite the customer owner from System Users after conversion.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertingProspect(null)}>Cancel</Button>
            <Button onClick={convertToCustomer} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Create Customer Workspace</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedProspect)} onOpenChange={(open) => !open && setSelectedProspect(null)}>
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader><DialogTitle>{selectedProspect?.name}</DialogTitle><DialogDescription>Prospect history, qualification, audit, preview, and next action in one view.</DialogDescription></DialogHeader>
          {selectedProspect && <div className="grid gap-4 py-3 sm:grid-cols-2">
            <Info label="Pipeline" value={toTitle(selectedProspect.outreach_status || "not_started")} />
            <Info label="Opportunity" value={toTitle(selectedProspect.opportunity_level || "medium")} />
            <Info label="Website review" value={selectedProspect.last_audit_at ? `Prepared · ${format(new Date(selectedProspect.last_audit_at), "MMM dd, yyyy")}` : "Not prepared"} />
            <Info label="Next follow-up" value={selectedProspect.next_follow_up_at ? format(new Date(selectedProspect.next_follow_up_at), "MMM dd, yyyy") : "Not scheduled"} />
            <Info label="Contact" value={selectedProspect.contact_email || selectedProspect.contact_phone || selectedProspect.contact_whatsapp || "Missing"} />
            <Info label="Source" value={selectedProspect.source || "Unknown"} />
            <div className="sm:col-span-2 rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-widest text-slate-400">Notes and outreach history</p><p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">{selectedProspect.notes || "No notes recorded."}</p></div>
          </div>}
          <DialogFooter>{selectedProspect?.preview_url && <a href={selectedProspect.preview_url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-bold"><ExternalLink className="mr-2 h-4 w-4"/>Open Preview</a>}<Button onClick={() => { const prospect = selectedProspect; setSelectedProspect(null); openConversion(prospect); }} disabled={Boolean(selectedProspect?.converted_business_id)} className="bg-emerald-600">Convert to Customer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p><p className="mt-2 break-words text-sm font-bold text-slate-800">{value}</p></div>;
}
