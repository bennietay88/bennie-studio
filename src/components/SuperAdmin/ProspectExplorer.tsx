import React, { useMemo, useState, useEffect, useRef } from "react";
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
  Send,
  Link as LinkIcon,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";
import { normalizeWebsiteAuditResult } from "../../lib/websiteAudit";
import { scoreProspect } from "../../lib/prospectScoring";
import { parseProspectCsv } from "../../lib/prospectImport";
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
  const [sortMode, setSortMode] = useState("newest");
  const [outreachProspect, setOutreachProspect] = useState<any | null>(null);
  const [outreachSubject, setOutreachSubject] = useState("");
  const [outreachBody, setOutreachBody] = useState("");
  const [outreachRequestId, setOutreachRequestId] = useState("");
  const [outreachSending, setOutreachSending] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [csvFileSize, setCsvFileSize] = useState(0);
  const [showCsvPaste, setShowCsvPaste] = useState(false);
  const [csvPasteText, setCsvPasteText] = useState("");
  const [importingCsv, setImportingCsv] = useState(false);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);

  const csvPreview = useMemo(() => {
    if (!csvText.trim()) {
      return { prospects: [] as Record<string, any>[], duplicates: 0, error: "" };
    }
    try {
      return { ...parseProspectCsv(csvText), error: "" };
    } catch (error: any) {
      return {
        prospects: [] as Record<string, any>[],
        duplicates: 0,
        error: error?.message || "Invalid CSV file",
      };
    }
  }, [csvText]);
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
      setProspects((data || []).map((prospect) => ({ ...prospect, _score: scoreProspect(prospect) })));
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

      setProspects([{ ...data, _score: scoreProspect(data) }, ...prospects]);
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
    setProspects((current) => current.map((p) => (p.id === id ? { ...p, ...patch, _score: scoreProspect({ ...p, ...patch }) } : p)));
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

  const resetCsvImport = () => {
    setCsvText("");
    setCsvFileName("");
    setCsvFileSize(0);
    setCsvPasteText("");
    setShowCsvPaste(false);
    if (csvFileInputRef.current) csvFileInputRef.current.value = "";
  };

  const loadCsvFile = async (file?: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Choose a CSV file ending in .csv");
      return;
    }
    if (file.size > 500_000) {
      toast.error("CSV file must be 500 KB or smaller");
      return;
    }

    try {
      const text = await file.text();
      if (!text.trim()) throw new Error("The selected CSV file is empty");

      setCsvText(text);
      setCsvFileName(file.name);
      setCsvFileSize(file.size);
      setCsvPasteText("");
      setShowCsvPaste(false);
    } catch (error: any) {
      resetCsvImport();
      toast.error(error?.message || "The CSV file could not be read");
    }
  };

  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    void loadCsvFile(event.target.files?.[0]);
  };

  const handleCsvDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file) void loadCsvFile(file);
  };

  const downloadCsvTemplate = () => {
    const template = [
      [
        "business_name",
        "website",
        "industry",
        "market",
        "city_area",
        "email",
        "phone",
        "whatsapp",
        "social_url",
        "source_note",
        "pitch_angle",
        "notes",
      ],
      [
        "Example Dental Clinic",
        "example.com",
        "Dental clinic",
        "Malaysia",
        "Kuala Lumpur",
        "hello@example.com",
        "+60123456789",
        "60123456789",
        "https://instagram.com/example",
        "Official website",
        "Improve booking CTA and local SEO",
        "Owner-led practice",
      ],
    ];
    const csv = template
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bennie-prospect-import-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async () => {
    if (!csvText.trim()) return toast.error("Choose a CSV file first");
    if (csvPreview.error) return toast.error(csvPreview.error);
    if (!csvPreview.prospects.length) return toast.error("No valid prospects found in this CSV");

    try {
      setImportingCsv(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Your admin session has expired. Sign in again and retry.");
      }

      const response = await fetch("/api/admin/prospects/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ csv: csvText }),
      });

      const rawResponse = await response.text();
      let payload: any = {};
      try {
        payload = rawResponse ? JSON.parse(rawResponse) : {};
      } catch {
        payload = {};
      }

      if (!response.ok) {
        throw new Error(
          payload?.error
            || rawResponse
            || `CSV import failed with status ${response.status}`,
        );
      }

      const importedProspects = (payload.prospects || []).map((prospect: any) => ({
        ...prospect,
        _score: scoreProspect(prospect),
      }));
      setProspects((current) => [...importedProspects, ...current]);

      const imported = Number(payload.imported || 0);
      const duplicates = Number(payload.duplicates || 0);
      resetCsvImport();
      setIsImportModalOpen(false);

      if (imported === 0 && duplicates > 0) {
        toast.info(`Nothing new to import. ${duplicates} duplicate prospect(s) were skipped.`);
      } else {
        toast.success(
          `${imported} prospect${imported === 1 ? "" : "s"} imported${duplicates ? `; ${duplicates} duplicate${duplicates === 1 ? "" : "s"} skipped` : ""}.`,
        );
      }
    } catch (error: any) {
      console.error("CSV import failed:", error);
      toast.error(error?.message || "CSV import failed");
    } finally {
      setImportingCsv(false);
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


  const sortedProspects = useMemo(() => {
    const rows = [...filteredProspects];
    const scoreFor = (prospect: any) =>
      Number(prospect.qualification_score ?? prospect._score?.score ?? scoreProspect(prospect).score ?? 0);
    const opportunityRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const outreachRank: Record<string, number> = {
      not_started: 1,
      queued: 2,
      contacted: 3,
      replied: 4,
      call_booked: 5,
      won: 6,
      lost: 7,
    };
    const timestamp = (value: any, empty: number) => {
      const parsed = value ? new Date(value).getTime() : NaN;
      return Number.isFinite(parsed) ? parsed : empty;
    };

    rows.sort((a, b) => {
      switch (sortMode) {
        case "oldest":
          return timestamp(a.created_at, Number.MAX_SAFE_INTEGER) - timestamp(b.created_at, Number.MAX_SAFE_INTEGER);
        case "name_asc":
          return String(a.name || "").localeCompare(String(b.name || ""));
        case "name_desc":
          return String(b.name || "").localeCompare(String(a.name || ""));
        case "score_desc":
          return scoreFor(b) - scoreFor(a);
        case "score_asc":
          return scoreFor(a) - scoreFor(b);
        case "opportunity_desc":
          return (opportunityRank[b.opportunity_level] || 0) - (opportunityRank[a.opportunity_level] || 0);
        case "followup_asc":
          return timestamp(a.next_follow_up_at, Number.MAX_SAFE_INTEGER) - timestamp(b.next_follow_up_at, Number.MAX_SAFE_INTEGER);
        case "outreach_asc":
          return (outreachRank[a.outreach_status] || 0) - (outreachRank[b.outreach_status] || 0);
        case "newest":
        default:
          return timestamp(b.created_at, 0) - timestamp(a.created_at, 0);
      }
    });
    return rows;
  }, [filteredProspects, sortMode]);


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
      ...sortedProspects.map((p) => [
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

  const openOutreachComposer = (prospect: any) => {
    if (!prospect.contact_email) {
      toast.error("Add an email address for this prospect first.");
      return;
    }

    const previewLine = prospect.preview_url
      ? `\n\nI also prepared a quick preview for you: ${prospect.preview_url}`
      : "";
    setOutreachProspect(prospect);
    setOutreachSubject(`Quick website idea for ${prospect.name}`);
    setOutreachBody(
      `Hi ${prospect.name},\n\nI came across your business and noticed a few practical opportunities to improve how your website turns visitors into enquiries.${previewLine}\n\nIf useful, I can share the key recommendations and what I would prioritise first.\n\nBest,\nBennie`,
    );
    setOutreachRequestId(crypto.randomUUID());
  };

  const closeOutreachComposer = () => {
    if (outreachSending) return;
    setOutreachProspect(null);
    setOutreachSubject("");
    setOutreachBody("");
    setOutreachRequestId("");
  };

  const sendOutreach = async () => {
    if (!outreachProspect || !outreachBody.trim()) return;
    if (!outreachSubject.trim()) {
      toast.error("Add an email subject");
      return;
    }

    try {
      setOutreachSending(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Your admin session has expired. Sign in again and retry.");
      }

      const response = await fetch(
        `/api/admin/prospects/${encodeURIComponent(outreachProspect.id)}/outreach`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: "send",
            channel: "email",
            subject: outreachSubject.trim(),
            bodyText: outreachBody.trim(),
            observation: "Direct email outreach sent from Prospect Explorer.",
            requestId: outreachRequestId || crypto.randomUUID(),
          }),
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Email could not be sent");
      }

      if (payload?.prospect) {
        setProspects((current) =>
          current.map((prospect) =>
            prospect.id === payload.prospect.id
              ? {
                  ...prospect,
                  ...payload.prospect,
                  _score: scoreProspect({ ...prospect, ...payload.prospect }),
                }
              : prospect,
          ),
        );
      }

      toast.success(
        payload?.alreadySent
          ? "This email was already sent; no duplicate was created."
          : "Email sent from Bennie Studio",
      );
      setOutreachProspect(null);
      setOutreachSubject("");
      setOutreachBody("");
      setOutreachRequestId("");
    } catch (error: any) {
      console.error("Direct email outreach failed:", error);
      toast.error(error?.message || "Email could not be sent");
    } finally {
      setOutreachSending(false);
    }
  };

  const renderContactActions = (prospect: any) => {
    const phoneHref = prospect.contact_phone ? `tel:${prospect.contact_phone}` : "";
    const whatsappNumber = String(
      prospect.contact_whatsapp || prospect.contact_phone || "",
    ).replace(/[^0-9]/g, "");
    const whatsappText = `Hi ${prospect.name}, I came across your business and noticed a few practical website improvements that could help generate more enquiries.${prospect.preview_url ? ` I prepared a quick preview here: ${prospect.preview_url}` : ""} Would you like me to send the key recommendations?`;
    const whatsappHref = whatsappNumber
      ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}`
      : "";

    return (
      <div className="flex flex-wrap gap-1.5">
        {prospect.contact_email && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openOutreachComposer(prospect)}
            className="h-8 rounded-xl px-3 text-[10px] font-bold"
          >
            <Mail className="mr-1.5 h-3 w-3" />
            Email
          </Button>
        )}
        {phoneHref && (
          <a href={phoneHref} className="inline-flex h-8 items-center rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50">
            <Phone className="mr-1.5 h-3 w-3" />Call
          </a>
        )}
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center rounded-xl border border-slate-200 px-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50"
          >
            <MessageSquare className="mr-1.5 h-3 w-3" />
            WhatsApp
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
        <div className="grid gap-3 border-b border-slate-100 bg-slate-50 p-4 xl:grid-cols-[1fr_190px_190px_220px_auto]">
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
          <Select value={sortMode} onValueChange={setSortMode}>
            <SelectTrigger className="rounded-xl bg-white"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="score_desc">Highest score</SelectItem>
              <SelectItem value="score_asc">Lowest score</SelectItem>
              <SelectItem value="opportunity_desc">Highest opportunity</SelectItem>
              <SelectItem value="followup_asc">Next follow-up</SelectItem>
              <SelectItem value="outreach_asc">Outreach stage</SelectItem>
              <SelectItem value="name_asc">Business A–Z</SelectItem>
              <SelectItem value="name_desc">Business Z–A</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="rounded-xl px-6" onClick={() => { setSearchQuery(""); setIndustryFilter("all"); setStatusFilter("all"); setSortMode("newest"); }}>
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
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Score / next action</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Outreach</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Next Step</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={8} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" /><p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading prospects...</p></td></tr>
                ) : sortedProspects.length === 0 ? (
                  <tr><td colSpan={8} className="py-20 text-center"><p className="text-slate-400 font-bold text-sm">No prospects found.</p></td></tr>
                ) : (
                  sortedProspects.map((prospect) => (
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
                        {(() => { const scored = prospect._score || scoreProspect(prospect); return <><div className="flex items-center gap-2"><span className="text-lg font-black text-slate-900">{prospect.qualification_score ?? scored.score}</span><Badge className="rounded-full border-none bg-indigo-50 text-[8px] font-black uppercase text-indigo-700">{prospect.qualification_category || scored.category.replace("_", " ")}</Badge></div><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-indigo-600">{prospect.recommended_next_action || scored.recommendedNextAction}</p><p className="mt-1 text-[10px] font-semibold text-slate-400">{scored.factors.slice(0, 2).map((factor) => `+${factor.points} ${factor.label}`).join(" · ") || "Needs more evidence"}</p></>; })()}
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

      <Dialog
        open={isImportModalOpen}
        onOpenChange={(open) => {
          setIsImportModalOpen(open);
          if (!open && !importingCsv) resetCsvImport();
        }}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-hidden rounded-3xl p-0">
          <div className="border-b border-slate-100 px-6 pb-4 pt-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight text-slate-950">
                Import prospect CSV
              </DialogTitle>
              <DialogDescription>
                Upload one CSV file. Bennie maps common prospect columns automatically,
                checks the file before import, and skips duplicates.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-5">
            <input
              ref={csvFileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleCsvFileChange}
              className="sr-only"
              aria-label="Choose prospect CSV file"
            />

            <div
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDrop={handleCsvDrop}
              className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center transition hover:border-indigo-300 hover:bg-indigo-50/40"
            >
              <Upload className="mx-auto h-7 w-7 text-indigo-600" />
              <p className="mt-3 text-sm font-black text-slate-900">
                Drop your CSV here
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                or choose a file from your computer · max 500 rows / 500 KB
              </p>
              <Button
                type="button"
                onClick={() => csvFileInputRef.current?.click()}
                className="mt-4 rounded-xl bg-slate-950 px-5 text-white hover:bg-indigo-600"
              >
                Choose CSV file
              </Button>
            </div>

            {csvFileName && (
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <p className="truncate text-sm font-black text-slate-900">{csvFileName}</p>
                  </div>
                  <p className="mt-1 pl-6 text-xs font-semibold text-slate-500">
                    {Math.max(1, Math.ceil(csvFileSize / 1024))} KB selected
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetCsvImport();
                    window.setTimeout(() => csvFileInputRef.current?.click(), 0);
                  }}
                  className="shrink-0 rounded-xl"
                >
                  Replace
                </Button>
              </div>
            )}

            {csvText && (
              <div className={`rounded-2xl border p-4 ${csvPreview.error ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50/50"}`}>
                {csvPreview.error ? (
                  <div>
                    <p className="font-black text-rose-900">This CSV needs attention</p>
                    <p className="mt-1 text-sm font-semibold leading-5 text-rose-700">
                      {csvPreview.error}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-rose-600">
                      Fix the file and choose it again. Nothing has been imported.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                      <span className="text-sm font-black text-emerald-800">
                        {csvPreview.prospects.length} ready to import
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        {csvPreview.duplicates} duplicate row(s) inside this file will be skipped
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-emerald-100 bg-white">
                      <table className="w-full min-w-[560px] text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="px-3 py-2 font-black">Business</th>
                            <th className="px-3 py-2 font-black">Website</th>
                            <th className="px-3 py-2 font-black">Location</th>
                            <th className="px-3 py-2 font-black">Contact</th>
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.prospects.slice(0, 5).map((prospect, index) => (
                            <tr key={`${prospect.name}-${index}`} className="border-t border-slate-100">
                              <td className="max-w-48 truncate px-3 py-2 font-bold text-slate-900">
                                {prospect.name}
                              </td>
                              <td className="max-w-40 truncate px-3 py-2 text-slate-600">
                                {prospect.domain || "—"}
                              </td>
                              <td className="max-w-40 truncate px-3 py-2 text-slate-600">
                                {prospect.location || "—"}
                              </td>
                              <td className="max-w-48 truncate px-3 py-2 text-slate-600">
                                {prospect.contact_email || prospect.contact_phone || prospect.contact_whatsapp || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {csvPreview.prospects.length > 5 && (
                      <p className="text-xs font-semibold text-slate-500">
                        Showing the first 5 rows. All {csvPreview.prospects.length} valid rows will be imported.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Need the expected format?
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Common business, website, industry, location, email, phone and WhatsApp headers are auto-mapped.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={downloadCsvTemplate}
                className="rounded-xl"
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                Download template
              </Button>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowCsvPaste((current) => !current)}
                className="text-xs font-black text-indigo-600 hover:text-indigo-700"
              >
                {showCsvPaste ? "Hide paste option" : "Paste CSV instead"}
              </button>

              {showCsvPaste && (
                <div className="mt-3">
                  <Textarea
                    value={csvPasteText}
                    onChange={(event) => {
                      const value = event.target.value;
                      setCsvPasteText(value);
                      setCsvText(value);
                      setCsvFileName("");
                      setCsvFileSize(0);
                      if (csvFileInputRef.current) csvFileInputRef.current.value = "";
                    }}
                    className="!h-32 min-h-32 max-h-48 resize-y overflow-auto rounded-xl font-mono text-xs [field-sizing:fixed]"
                    placeholder="business_name,website,industry,location,email,phone,whatsapp,notes"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-white px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsImportModalOpen(false)}
              disabled={importingCsv}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={importCsv}
              disabled={
                importingCsv
                || !csvText.trim()
                || !csvPreview.prospects.length
                || Boolean(csvPreview.error)
              }
              className="rounded-xl bg-indigo-600 px-5 hover:bg-indigo-700"
            >
              {importingCsv ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {importingCsv
                ? "Importing…"
                : csvPreview.prospects.length
                  ? `Import ${csvPreview.prospects.length} prospect${csvPreview.prospects.length === 1 ? "" : "s"}`
                  : "Import prospects"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(outreachProspect)}
        onOpenChange={(open) => {
          if (!open) closeOutreachComposer();
        }}
      >
        <DialogContent className="max-w-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">
              Send email outreach
            </DialogTitle>
            <DialogDescription>
              Send directly from Bennie Studio. A successful send updates the prospect's outreach status and follow-up automatically.
            </DialogDescription>
          </DialogHeader>

          {outreachProspect && (
            <div className="space-y-4 py-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Recipient</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{outreachProspect.name}</p>
                <p className="mt-1 break-all text-xs font-semibold text-slate-500">
                  {outreachProspect.contact_email}
                </p>
              </div>

              <Field label="Subject">
                <Input
                  value={outreachSubject}
                  onChange={(event) => setOutreachSubject(event.target.value)}
                  maxLength={160}
                  className="h-11 rounded-xl"
                />
              </Field>

              <Field label="Message">
                <Textarea
                  value={outreachBody}
                  onChange={(event) => setOutreachBody(event.target.value)}
                  maxLength={10000}
                  className="!h-56 min-h-56 max-h-72 resize-y overflow-auto rounded-2xl [field-sizing:fixed]"
                />
              </Field>

              <p className="text-xs font-semibold leading-5 text-slate-500">
                Email is sent through the configured Resend account. WhatsApp continues to open through wa.me because no WhatsApp API is configured.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeOutreachComposer}
              disabled={outreachSending}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={sendOutreach}
              disabled={outreachSending || !outreachBody.trim() || !outreachSubject.trim()}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
            >
              {outreachSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {outreachSending ? "Sending…" : "Send email"}
            </Button>
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
          <DialogFooter>{selectedProspect?.preview_url && <a href={selectedProspect.preview_url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-bold"><ExternalLink className="mr-2 h-4 w-4"/>Open Preview</a>}</DialogFooter>
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
