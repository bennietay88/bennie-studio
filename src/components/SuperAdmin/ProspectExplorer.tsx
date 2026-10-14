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
  RefreshCw,
  Mail,
  Phone,
  Send,
  Link as LinkIcon,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Check,
  AlertTriangle,
  UserPlus,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { format, formatDistanceToNowStrict } from "date-fns";
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
import { EMAIL_TEMPLATES, buildEmailTemplateDraft, hasUnresolvedEmailPlaceholders, recommendedTemplateId } from "./EmailTemplateHub";
import { getOutreachObservation, getConfirmedReviewObservation, hasDocumentedMarketingConsent } from "../../lib/salesAutomation";

const WEBSITE_STATUSES = ["unknown", "no_website", "weak", "average", "strong"];
const OPPORTUNITY_LEVELS = ["low", "medium", "high"];
const OUTREACH_STATUSES = ["not_started", "queued", "contacted", "replied", "call_booked", "won", "lost"];
const CONTACTED_OUTREACH_STATUSES = ["contacted", "replied", "call_booked", "won"];
const NOT_CONTACTED_OUTREACH_STATUSES = ["not_started", "queued"];

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

const isRecipientReviewUrl = (value?: string | null) => {
  if (!value) return false;
  try {
    const parsed = new URL(value, window.location.origin);
    return parsed.pathname === "/website-audit" && Boolean(parsed.searchParams.get("report") && parsed.searchParams.get("key"));
  } catch { return false; }
};

export function ProspectExplorer() {
  const [prospects, setProspects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [prospectTotal, setProspectTotal] = useState(0);
  const [lastImportSummary, setLastImportSummary] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState("all");
  const [selectedProspect, setSelectedProspect] = useState<any | null>(null);
  const [sortMode, setSortMode] = useState("newest");
  const [outreachProspect, setOutreachProspect] = useState<any | null>(null);
  const [outreachSubject, setOutreachSubject] = useState("");
  const [outreachBody, setOutreachBody] = useState("");
  const [outreachTemplateId, setOutreachTemplateId] = useState("enquiry");
  const [outreachObservation, setOutreachObservation] = useState("");
  const [outreachContactFirstName, setOutreachContactFirstName] = useState("");
  const [outreachDraftTouched, setOutreachDraftTouched] = useState(false);
  const [outreachRequestId, setOutreachRequestId] = useState("");
  const [outreachReplyToMessageId, setOutreachReplyToMessageId] = useState<string | null>(null);
  const [outreachSending, setOutreachSending] = useState(false);
  const [outreachConsentSource, setOutreachConsentSource] = useState("");
  const [outreachConsentTimestamp, setOutreachConsentTimestamp] = useState("");
  const [outreachConsentConfirmed, setOutreachConsentConfirmed] = useState(false);
  const [outreachConsentSaving, setOutreachConsentSaving] = useState(false);
  const [reviewLoadingId, setReviewLoadingId] = useState<string | null>(null);
  const reviewCache = useRef<Map<string, { url: string; observation: string }>>(new Map());
  const [engagement, setEngagement] = useState<{ messages: any[]; tasks: any[]; events: any[] } | null>(null);
  const [engagementLoading, setEngagementLoading] = useState(false);
  const [conversionProspect, setConversionProspect] = useState<any | null>(null);
  const [conversionProduct, setConversionProduct] = useState("managed-website");
  const [conversionMarket, setConversionMarket] = useState("INTL");
  const [conversionTerm, setConversionTerm] = useState("3");
  const [conversionCommercialLoading, setConversionCommercialLoading] = useState(false);
  const [conversionSetupFee, setConversionSetupFee] = useState("0");
  const [conversionRecurringFee, setConversionRecurringFee] = useState("0");
  const [conversionContactName, setConversionContactName] = useState("");
  const [conversionEmail, setConversionEmail] = useState("");
  const [conversionPhone, setConversionPhone] = useState("");
  const [conversionWhatsapp, setConversionWhatsapp] = useState("");
  const [conversionSaving, setConversionSaving] = useState(false);
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

  const applyOutreachTemplate = (templateId: string, prospect = outreachProspect, observation = outreachObservation, firstName = outreachContactFirstName) => {
    if (!prospect) return;
    const generated = buildEmailTemplateDraft(templateId, { ...prospect, contact_first_name: firstName }, observation);
    const [subjectLine, ...bodyLines] = generated.split("\n");
    setOutreachSubject(subjectLine.replace(/^Subject:\s*/i, ""));
    setOutreachBody(bodyLines.join("\n").trim());
    setOutreachDraftTouched(false);
  };

  useEffect(() => {
    if (!outreachProspect || outreachReplyToMessageId || outreachDraftTouched) return;
    applyOutreachTemplate(outreachTemplateId, outreachProspect, outreachObservation, outreachContactFirstName);
  }, [outreachProspect?.id, outreachTemplateId, outreachObservation, outreachContactFirstName, outreachReplyToMessageId, outreachDraftTouched]);

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
      // Fetch all pages. A 1,000-row client cap previously hid later imports.
      const loaded: any[] = [];
      let recordedTotal = 0;
      for (let offset = 0; offset < 20000; offset += 500) {
        const { data, error, count } = await supabase.from("prospects")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false }).order("id", { ascending: false })
          .range(offset, offset + 499);
        if (error) throw error;
        if (count !== null) recordedTotal = count;
        loaded.push(...(data || []));
        if ((data || []).length < 500) break;
      }
      setProspectTotal(recordedTotal || loaded.length);
      let rows = loaded.map((prospect) => ({ ...prospect, _score: scoreProspect(prospect) }));
      const [sessionResult, suppressionResult, deliveryResult] = await Promise.all([
        supabase.auth.getSession(),
        supabase.from("sales_suppressions").select("email").not("email", "is", null),
        supabase.from("sales_messages").select("prospect_id,status,sent_at,created_at,error,provider_message_id")
          .eq("direction", "outbound").eq("channel", "email")
          .order("created_at", { ascending: false }).limit(5000),
      ]);
      if (suppressionResult.error) { console.warn("Suppression status unavailable", suppressionResult.error); toast.error("Suppression status unavailable. Email actions are blocked until refresh succeeds."); }
      if (deliveryResult.error) console.warn("Email delivery status unavailable", deliveryResult.error);
      const blocked = new Set((suppressionResult.data || []).map((record) => String(record.email || "").toLowerCase().trim()));
      const deliveryByProspect = new Map<string, any>();
      for (const message of deliveryResult.data || []) {
        if (message.prospect_id && !deliveryByProspect.has(message.prospect_id)) deliveryByProspect.set(message.prospect_id, message);
      }
      rows = rows.map((p) => ({ ...p,
        _suppressed: blocked.has(String(p.contact_email || "").toLowerCase().trim()),
        _contactSafetyUnknown: Boolean(suppressionResult.error),
        _latestDelivery: deliveryByProspect.get(p.id) || null,
      }));
      const session = sessionResult.data.session;
      if (session?.access_token) {
        try {
          const inboxResponse = await fetch("/api/admin/sales-inbox", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
          if (inboxResponse.ok) {
            const inbox = await inboxResponse.json();
            const byProspect = new Map((inbox.conversations || []).map((conversation: any) => [conversation.prospect?.id, conversation]));
            rows = rows.map((prospect) => {
              const conversation: any = byProspect.get(prospect.id);
              return conversation ? {
                ...prospect,
                _latestReply: conversation.latestReply,
                _latestOutbound: conversation.latestOutbound,
                _unreadReply: conversation.unread,
                _replyTaskId: conversation.replyTaskId,
              } : prospect;
            });
          }
        } catch (inboxError) { console.warn("Sales inbox summary unavailable:", inboxError); }
      }
      setProspects(rows);
    } catch (error: any) {
      console.error("Error fetching prospects:", error);
      toast.error("Could not load the prospect list. Check your Sales permission and retry.");
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

  const prepareRecipientReview = async (prospect: any, options: { refresh?: boolean } = {}) => {
    if (!options.refresh && isRecipientReviewUrl(prospect.preview_url)) return prospect.preview_url;
    setReviewLoadingId(prospect.id);
    try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("Your admin session has expired. Sign in again and retry.");
      return "";
    }
    const response = await fetch(`/api/admin/prospects/${encodeURIComponent(prospect.id)}/website-review`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.reportUrl || !payload?.report) {
      toast.error(payload?.error || "The website could not be analysed. No recipient review was created.");
      return "";
    }
    reviewCache.current.set(prospect.id, { url: payload.reportUrl, observation: getConfirmedReviewObservation(payload.report) });
    const updated = {
      ...prospect,
      preview_url: payload.reportUrl,
      preview_generated_at: payload.preparedAt,
      last_audit_at: payload.preparedAt,
      opportunity_level: payload.report.findings?.some((finding: any) => finding.priority === "high") ? "high" : "medium",
    };
    setProspects((current) => current.map((item) => item.id === prospect.id ? { ...item, ...updated, _score: scoreProspect({ ...item, ...updated }) } : item));
    setSelectedProspect((current: any) => current?.id === prospect.id ? { ...current, ...updated } : current);
    return payload.reportUrl as string;
    } catch (error: any) {
      toast.error(error?.message || "Website review could not be prepared.");
      return "";
    } finally {
      setReviewLoadingId((current) => current === prospect.id ? null : current);
    }
  };

  const runQuickAudit = async (prospect: any) => {
    const reviewTab = window.open("about:blank", "_blank");
    const reportUrl = await prepareRecipientReview(prospect, { refresh: true });
    if (!reportUrl) { reviewTab?.close(); return; }
    if (reviewTab) reviewTab.location.href = reportUrl;
    else await navigator.clipboard.writeText(reportUrl).catch(() => undefined);
    toast.success("Website review prepared and saved. The recipient link opens the findings and recommended direction.");
  };

  const generatePreviewLink = async (prospect: any) => {
    const previewUrl = await prepareRecipientReview(prospect);
    if (!previewUrl) return "";
    await navigator.clipboard.writeText(previewUrl).catch(() => undefined);
    window.open(previewUrl, "_blank", "noopener,noreferrer");
    toast.success("Recipient website review link copied and opened.");
    return previewUrl;
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

      // Always reconcile with the server after import, rather than append an unverified local list.
      // The refresh also exposes imported prospects previously hidden by filters.
      setQuickFilter("all");
      setSearchQuery("");
      setIndustryFilter("all");
      setStatusFilter("all");
      setSortMode("newest");
      await fetchProspects();

      const imported = Number(payload.imported || 0);
      const duplicates = Number(payload.duplicates || 0);
      const reasons = payload.skippedReasons || {};
      setLastImportSummary(`Import: ${imported} added, ${duplicates} skipped. ${Number(reasons.existingEmail || 0)} duplicate emails, ${Number(reasons.existingDomain || 0)} duplicate domains, ${Number(reasons.existingBusiness || 0)} business matches, ${Number(reasons.withinFile || 0)} duplicates within CSV.`);
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
        const outreachStatus = p.outreach_status || "not_started";
        const now = Date.now();
        const matchesQuick = quickFilter === "all"
          || (quickFilter === "follow_up_due" && !p._suppressed && !p._contactSafetyUnknown && p.next_follow_up_at && new Date(p.next_follow_up_at).getTime() <= now)
          || (quickFilter === "high" && p.opportunity_level === "high")
          || (quickFilter === "contacted" && CONTACTED_OUTREACH_STATUSES.includes(outreachStatus))
          || (quickFilter === "not_contacted" && NOT_CONTACTED_OUTREACH_STATUSES.includes(outreachStatus))
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
    const opportunityRank: Record<string, number> = { low: 1, medium: 2, high: 3 };
    const outreachRank: Record<string, number> = {
      not_started: 1,
      queued: 2,
      contacted: 3,
      replied: 4,
      call_booked: 5,
      won: 6,
      lost: 7,
    };
    const websiteRank: Record<string, number> = {
      no_website: 1,
      unknown: 2,
      weak: 3,
      average: 4,
      strong: 5,
    };
    const primaryContact = (prospect: any) =>
      String(
        prospect.contact_email
        || prospect.contact_phone
        || prospect.contact_whatsapp
        || "",
      ).trim().toLowerCase();
    const compareOptionalText = (left: string, right: string, direction: 1 | -1) => {
      if (!left && !right) return 0;
      if (!left) return 1;
      if (!right) return -1;
      return left.localeCompare(right) * direction;
    };
    const compareOptionalDate = (left: any, right: any, direction: 1 | -1) => {
      const leftTime = left ? new Date(left).getTime() : NaN;
      const rightTime = right ? new Date(right).getTime() : NaN;
      const leftValid = Number.isFinite(leftTime);
      const rightValid = Number.isFinite(rightTime);
      if (!leftValid && !rightValid) return 0;
      if (!leftValid) return 1;
      if (!rightValid) return -1;
      return (leftTime - rightTime) * direction;
    };

    rows.sort((a, b) => {
      switch (sortMode) {
        case "oldest":
          return compareOptionalDate(a.created_at, b.created_at, 1);
        case "name_asc":
          return compareOptionalText(String(a.name || "").toLowerCase(), String(b.name || "").toLowerCase(), 1);
        case "name_desc":
          return compareOptionalText(String(a.name || "").toLowerCase(), String(b.name || "").toLowerCase(), -1);
        case "contact_asc":
          return compareOptionalText(primaryContact(a), primaryContact(b), 1);
        case "contact_desc":
          return compareOptionalText(primaryContact(a), primaryContact(b), -1);
        case "website_asc":
          return (websiteRank[a.website_status] || 0) - (websiteRank[b.website_status] || 0);
        case "website_desc":
          return (websiteRank[b.website_status] || 0) - (websiteRank[a.website_status] || 0);
        case "score_desc":
          return scoreFor(b) - scoreFor(a);
        case "score_asc":
          return scoreFor(a) - scoreFor(b);
        case "opportunity_desc":
          return (opportunityRank[b.opportunity_level] || 0) - (opportunityRank[a.opportunity_level] || 0);
        case "opportunity_asc":
          return (opportunityRank[a.opportunity_level] || 0) - (opportunityRank[b.opportunity_level] || 0);
        case "followup_asc":
          return compareOptionalDate(a.next_follow_up_at, b.next_follow_up_at, 1);
        case "followup_desc":
          return compareOptionalDate(a.next_follow_up_at, b.next_follow_up_at, -1);
        case "outreach_asc":
          return (outreachRank[a.outreach_status] || 0) - (outreachRank[b.outreach_status] || 0);
        case "outreach_desc":
          return (outreachRank[b.outreach_status] || 0) - (outreachRank[a.outreach_status] || 0);
        case "newest":
        default:
          return compareOptionalDate(a.created_at, b.created_at, -1);
      }
    });
    return rows;
  }, [filteredProspects, sortMode]);


  const replyCenterProspects = useMemo(
    () =>
      prospects
        .filter((prospect) => Boolean(prospect._latestReply))
        .sort((left, right) => {
          const leftAt = new Date(left._latestReply?.sent_at || left._latestReply?.created_at || 0).getTime();
          const rightAt = new Date(right._latestReply?.sent_at || right._latestReply?.created_at || 0).getTime();
          return rightAt - leftAt;
        })
        .slice(0, 12),
    [prospects],
  );

  const unreadReplyCount = useMemo(
    () => prospects.filter((prospect) => prospect._latestReply && prospect._unreadReply).length,
    [prospects],
  );

  const industries = useMemo(
    () => Array.from(new Set(prospects.map((p) => p.industry).filter(Boolean))).sort(),
    [prospects],
  );

  const stats = useMemo(() => {
    const high = prospects.filter((p) => p.opportunity_level === "high").length;
    const contacted = prospects.filter((p) => CONTACTED_OUTREACH_STATUSES.includes(p.outreach_status || "not_started")).length;
    const notContacted = prospects.filter((p) => NOT_CONTACTED_OUTREACH_STATUSES.includes(p.outreach_status || "not_started")).length;
    const booked = prospects.filter((p) => p.outreach_status === "call_booked").length;
    const due = prospects.filter((p) => !p._suppressed && !p._contactSafetyUnknown && p.next_follow_up_at && new Date(p.next_follow_up_at) <= new Date()).length;
    return { total: prospects.length, high, contacted, notContacted, booked, due };
  }, [prospects]);

  const selectSummaryFilter = (filter: string) => {
    setSearchQuery("");
    setIndustryFilter("all");
    setStatusFilter("all");
    setQuickFilter(filter);
  };

  const exportCsv = () => {
    const rows = [
      ["Name", "Domain", "Industry", "Location", "Email", "Phone", "WhatsApp", "Social", "Website Status", "Opportunity", "Outreach Status", "Next Follow Up", "Preview URL", "Notes", "Email Delivery", "Email Sent At", "Email Error", "Suppressed"],
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
        p._latestDelivery?.status || "",
        p._latestDelivery?.sent_at || "",
        p._latestDelivery?.error || "",
        p._suppressed ? "yes" : "no",
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

  const loadEngagement = async (prospectId: string) => {
    try {
      setEngagementLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your admin session has expired.");
      const response = await fetch(
        `/api/admin/prospects/${encodeURIComponent(prospectId)}/engagement`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Conversation could not be loaded.");
      setEngagement({
        messages: payload.messages || [],
        tasks: payload.tasks || [],
        events: payload.events || [],
      });
    } catch (error: any) {
      setEngagement(null);
      toast.error(error?.message || "Conversation could not be loaded.");
    } finally {
      setEngagementLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedProspect?.id) {
      setEngagement(null);
      return;
    }
    void loadEngagement(selectedProspect.id);
  }, [selectedProspect?.id]);

  const updateSalesTask = async (taskId: string, status: "completed" | "dismissed") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return toast.error("Your admin session has expired.");
    const response = await fetch(`/api/admin/sales-tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ status }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return toast.error(payload?.error || "Task could not be updated.");
    setEngagement((current) => current ? {
      ...current,
      tasks: current.tasks.map((task) => task.id === taskId ? { ...task, status } : task),
    } : current);
    setProspects((current) =>
      current.map((prospect) =>
        prospect._replyTaskId === taskId
          ? { ...prospect, _unreadReply: false, _replyTaskId: null }
          : prospect,
      ),
    );
    toast.success(status === "completed" ? "Task completed" : "Task dismissed");
  };

  const setFollowUp = async (prospect: any, dateValue: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your admin session has expired.");
      const dueAt = dateValue ? new Date(`${dateValue}T09:00:00`).toISOString() : null;
      const response = await fetch(`/api/admin/prospects/${encodeURIComponent(prospect.id)}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ dueAt }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Follow-up could not be saved.");
      if (payload.prospect) {
        setProspects((current) => current.map((item) => item.id === prospect.id ? { ...item, ...payload.prospect } : item));
        if (selectedProspect?.id === prospect.id) setSelectedProspect((current: any) => current ? { ...current, ...payload.prospect } : current);
      }
      if (selectedProspect?.id === prospect.id) void loadEngagement(prospect.id);
      toast.success(dueAt ? "Follow-up scheduled" : "Follow-up cleared");
    } catch (error: any) {
      toast.error(error?.message || "Follow-up could not be saved.");
    }
  };

  const openConversion = (prospect: any) => {
    setConversionProspect(prospect);
    setConversionContactName("");
    setConversionEmail(prospect.contact_email || "");
    setConversionPhone(prospect.contact_phone || "");
    setConversionWhatsapp(prospect.contact_whatsapp || "");
    setConversionSetupFee("0");
    setConversionRecurringFee("0");
  };

  useEffect(() => {
    if (!conversionProspect || conversionProduct === "custom-website") return;
    const controller = new AbortController();
    setConversionCommercialLoading(true);
    fetch(`/api/public/pricing?market=${conversionMarket}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || "Commercial catalogue unavailable");
        const product = Array.isArray(payload.products)
          ? payload.products.find((item: any) => item.slug === conversionProduct)
          : null;
        if (!product?.price) throw new Error("Selected product is not configured for this market");
        setConversionTerm(String(Number(product.price.minimumTermMonths || 3)));
        setConversionSetupFee(String(Number(product.price.setupFee || 0)));
        setConversionRecurringFee(String(Number(product.price.monthlyPrice || 0)));
      })
      .catch((error) => {
        if (error?.name !== "AbortError") console.warn("Could not load current conversion terms:", error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setConversionCommercialLoading(false);
      });
    return () => controller.abort();
  }, [conversionMarket, conversionProduct, conversionProspect]);

  const preparePreviewAndEmail = async (prospect: any) => {
    if (prospect._suppressed || prospect._contactSafetyUnknown) return toast.error("Recipient is suppressed or suppression status is unavailable. Outreach is blocked.");
    if (!prospect.domain || prospect.website_status === "no_website") {
      openOutreachComposer(prospect);
      return;
    }
    const previewUrl = await prepareRecipientReview(prospect);
    if (!previewUrl) return;
    let observation = reviewCache.current.get(prospect.id)?.observation || "";
    if (!observation) {
      try {
        const parsed = new URL(previewUrl);
        const jobId = parsed.searchParams.get("report");
        const key = parsed.searchParams.get("key");
        if (jobId && key) {
          const response = await fetch(`/api/public/website-audit/jobs/${encodeURIComponent(jobId)}?key=${encodeURIComponent(key)}`, { cache: "no-store" });
          const payload = response.ok ? await response.json() : null;
          observation = getConfirmedReviewObservation(payload?.report);
          if (observation) reviewCache.current.set(prospect.id, { url: previewUrl, observation });
        }
      } catch { /* Do not invent an observation for inaccessible older reports. */ }
    }
    openOutreachComposer({ ...prospect, preview_url: previewUrl }, undefined, observation);
  };

  const convertProspect = async () => {
    if (!conversionProspect) return;
    try {
      setConversionSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your admin session has expired.");
      const response = await fetch(
        `/api/admin/prospects/${encodeURIComponent(conversionProspect.id)}/convert`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            productSlug: conversionProduct,
            market: conversionMarket,
            termMonths: Number(conversionTerm),
            setupFee: Math.max(0, Number(conversionSetupFee) || 0),
            recurringFee: Math.max(0, Number(conversionRecurringFee) || 0),
            customerName: conversionProspect.name,
            contactName: conversionContactName.trim() || null,
            contactEmail: conversionEmail.trim() || null,
            contactPhone: conversionPhone.trim() || null,
            contactWhatsapp: conversionWhatsapp.trim() || null,
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Prospect could not be converted.");
      if (payload?.prospect) {
        setProspects((current) => current.map((item) =>
          item.id === payload.prospect.id
            ? { ...item, ...payload.prospect, _score: scoreProspect({ ...item, ...payload.prospect }) }
            : item,
        ));
        if (selectedProspect?.id === payload.prospect.id) {
          setSelectedProspect({ ...selectedProspect, ...payload.prospect });
        }
      }
      setConversionProspect(null);
      const accountStatus = String(payload?.business?.accountStatus || "");
      toast.success(
        ["existing_user_attached", "existing_user_notified"].includes(accountStatus)
          ? "Customer workspace created and the existing account is attached."
          : accountStatus === "invite_sent"
            ? "Customer workspace created and onboarding invitation sent."
            : accountStatus === "invite_delivery_pending"
              ? "Customer workspace created. Invitation delivery needs a retry, but account claiming is ready."
              : "Customer workspace created. Add a customer email before onboarding.",
      );
    } catch (error: any) {
      toast.error(error?.message || "Prospect could not be converted.");
    } finally {
      setConversionSaving(false);
    }
  };

  const openOutreachComposer = (prospect: any, replyToMessage?: any, auditObservation = "") => {
    if (prospect._suppressed || prospect._contactSafetyUnknown) {
      toast.error("Recipient is suppressed or suppression status cannot be checked.");
      return;
    }
    if (!prospect.contact_email) {
      toast.error("Add an email address for this prospect first.");
      return;
    }

    const initialTemplateId = replyToMessage ? "interested" : (!prospect.domain || prospect.website_status === "no_website") ? "no-site" : recommendedTemplateId(prospect.outreach_status || "not_started");
    const initialObservation = auditObservation || reviewCache.current.get(prospect.id)?.observation || getOutreachObservation(prospect.notes) || "";
    const contactFirstName = String(prospect.contact_first_name || prospect.contact_name || "").trim().split(/\s+/)[0];
    setOutreachProspect(prospect);
    setOutreachReplyToMessageId(replyToMessage?.id || null);
    setOutreachTemplateId(initialTemplateId);
    setOutreachObservation(initialObservation);
    setOutreachContactFirstName(contactFirstName || "");
    setOutreachDraftTouched(false);
    if (replyToMessage) {
      const priorSubject = String(replyToMessage.subject || `Website conversation with ${prospect.name}`).replace(/^Re:\s*/i, "");
      setOutreachSubject(`Re: ${priorSubject}`);
      setOutreachBody(`Hi ${prospect.name},\n\nThanks for your reply.\n\n\n\nBest,\nBennie`);
    } else {
      const generated = buildEmailTemplateDraft(initialTemplateId, { ...prospect, contact_first_name: contactFirstName }, initialObservation);
      const [subjectLine, ...bodyLines] = generated.split("\n");
      setOutreachSubject(subjectLine.replace(/^Subject:\s*/i, ""));
      setOutreachBody(bodyLines.join("\n").trim());
    }
    setOutreachRequestId(crypto.randomUUID());
    setOutreachConsentSource("");
    setOutreachConsentTimestamp("");
    setOutreachConsentConfirmed(false);
  };

  const recordOutreachConsent = async () => {
    if (!outreachProspect || outreachConsentSaving) return;
    const consentDate = new Date(outreachConsentTimestamp);
    if (!outreachConsentConfirmed || outreachConsentSource.trim().length < 10
      || !Number.isFinite(consentDate.getTime()) || consentDate.getTime() > Date.now()) {
      toast.error("Verify explicit opt-in and record its actual date and evidence source.");
      return;
    }
    setOutreachConsentSaving(true);
    try {
      const { data, error } = await supabase.from("prospects").update({
        marketing_consent: true,
        consent_timestamp: consentDate.toISOString(),
        consent_source: outreachConsentSource.trim(),
        consent_email: outreachProspect.contact_email.trim().toLowerCase(),
      }).eq("id", outreachProspect.id)
        .select("marketing_consent,consent_timestamp,consent_source,consent_email,contact_email").single();
      if (error || !data || !hasDocumentedMarketingConsent(data)) {
        throw new Error(error?.message || "Consent evidence could not be verified in the database.");
      }
      setOutreachProspect((current: any) => current ? { ...current, ...data } : current);
      setProspects((current) => current.map((p) => p.id === outreachProspect.id ? { ...p, ...data } : p));
      toast.success("Email permission evidence saved.");
    } catch (error: any) {
      toast.error(error?.message || "Permission evidence could not be saved.");
    } finally {
      setOutreachConsentSaving(false);
    }
  };

  const closeOutreachComposer = () => {
    if (outreachSending) return;
    setOutreachProspect(null);
    setOutreachSubject("");
    setOutreachBody("");
    setOutreachObservation("");
    setOutreachContactFirstName("");
    setOutreachDraftTouched(false);
    setOutreachReplyToMessageId(null);
    setOutreachRequestId("");
    setOutreachConsentSource("");
    setOutreachConsentTimestamp("");
    setOutreachConsentConfirmed(false);
  };

  const sendOutreach = async () => {
    if (!outreachProspect || !outreachBody.trim()) return;
    if (!outreachSubject.trim()) {
      toast.error("Add an email subject");
      return;
    }
    if (!outreachReplyToMessageId && !hasDocumentedMarketingConsent(outreachProspect)) {
      toast.error("Resend requires documented recipient opt-in. Record the actual permission evidence first.");
      return;
    }
    if (!outreachReplyToMessageId && outreachObservation.trim().length < 10) {
      toast.error("Add one specific website observation you verified before sending a first-touch email.");
      return;
    }
    if (hasUnresolvedEmailPlaceholders(`${outreachSubject}\n${outreachBody}`)) {
      toast.error("Complete every bracketed detail before sending.");
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
            observation: outreachReplyToMessageId ? "Personal reply sent from Prospect Explorer." : outreachObservation.trim(),
            templateId: outreachTemplateId,
            replyToMessageId: outreachReplyToMessageId,
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
          : "Email accepted by provider. Delivery confirmation is pending.",
      );
      setOutreachProspect(null);
      setOutreachSubject("");
      setOutreachBody("");
      setOutreachObservation("");
      setOutreachContactFirstName("");
      setOutreachDraftTouched(false);
      setOutreachReplyToMessageId(null);
      setOutreachRequestId("");
      // Re-read the provider state immediately so the list reflects this send.
      void fetchProspects();
      if (selectedProspect?.id === outreachProspect.id) {
        void loadEngagement(outreachProspect.id);
      }
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
        {prospect.contact_email && !prospect._suppressed && !prospect._contactSafetyUnknown && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openOutreachComposer(prospect)}
            className="h-8 rounded-xl px-3 text-xs font-bold"
          >
            <Mail className="mr-1.5 h-3 w-3" />
            Email
          </Button>
        )}
        {phoneHref && (
          <a href={phoneHref} className="inline-flex h-8 items-center rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">
            <Phone className="mr-1.5 h-3 w-3" />Call
          </a>
        )}
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
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
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Prospect <span className="text-indigo-600">Pipeline</span>
          </h1>
          <p className="mt-1 max-w-3xl text-sm font-medium leading-6 text-slate-500">
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

      <Card className="overflow-hidden rounded-[2rem] border-slate-100 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-5 py-5 text-slate-950 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-indigo-700">Sales Reply Center</p>
              {unreadReplyCount > 0 && (
                <Badge className="border-none bg-indigo-500 text-white">{unreadReplyCount} unread</Badge>
              )}
            </div>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Recent inbound conversations, reply classification, delivery state, and next follow-up in one queue.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
            onClick={() => setQuickFilter("replied")}
          >
            View all replied prospects
          </Button>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-600" /></div>
          ) : replyCenterProspects.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-800">No inbound sales replies yet</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">New Resend replies will appear here automatically and remain linked to the full prospect thread.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {replyCenterProspects.map((prospect) => {
                const reply = prospect._latestReply;
                const replyAt = new Date(reply.sent_at || reply.created_at);
                return (
                  <div key={prospect.id} className={`grid gap-4 p-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(190px,.7fr)_auto] lg:items-center ${prospect._unreadReply ? "bg-indigo-50/60" : "bg-white"}`}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {prospect._unreadReply && <span className="h-2 w-2 rounded-full bg-indigo-600" aria-label="Unread reply" />}
                        <button type="button" onClick={() => setSelectedProspect(prospect)} className="truncate text-left text-sm font-black text-slate-950 hover:text-indigo-600">
                          {prospect.name}
                        </button>
                        {reply.classification && <Badge variant="outline" className="text-xs">{toTitle(reply.classification)}</Badge>}
                        {prospect._latestOutbound?.status && <Badge variant="outline" className="text-xs">Last send: {toTitle(prospect._latestOutbound.status)}</Badge>}
                      </div>
                      <p className="mt-1 truncate text-xs font-bold text-slate-700">{reply.subject || "Email reply"}</p>
                      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">{reply.preview || reply.body_text}</p>
                      <p className="mt-2 text-xs font-semibold text-indigo-600">
                        Replied · {formatDistanceToNowStrict(replyAt, { addSuffix: true })}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-400">Follow-up</Label>
                      <Input
                        type="date"
                        className="mt-1 h-9 rounded-xl bg-white"
                        value={prospect.next_follow_up_at ? prospect.next_follow_up_at.slice(0, 10) : ""}
                        onChange={(event) => void setFollowUp(prospect, event.target.value)}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {prospect.contact_email && (
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => openOutreachComposer(prospect, reply)}
                        >
                          <Send className="mr-1.5 h-3.5 w-3.5" />Reply
                        </Button>
                      )}
                      <Button type="button" size="sm" variant="outline" className="rounded-xl" onClick={() => setSelectedProspect(prospect)}>
                        <MessageSquare className="mr-1.5 h-3.5 w-3.5" />Thread
                      </Button>
                      {prospect._unreadReply && prospect._replyTaskId && (
                        <Button type="button" size="sm" variant="outline" className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => updateSalesTask(prospect._replyTaskId, "completed")}>
                          <Check className="mr-1.5 h-3.5 w-3.5" />Mark handled
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Total", value: stats.total, Icon: Users, filter: "all" },
          { label: "High Opportunity", value: stats.high, Icon: Zap, filter: "high" },
          { label: "Contacted", value: stats.contacted, Icon: MessageSquare, filter: "contacted" },
          { label: "Calls Booked", value: stats.booked, Icon: CalendarDays, filter: "call_booked" },
          { label: "Due Follow-Up", value: stats.due, Icon: Shield, filter: "follow_up_due" },
          { label: "Not Contacted", value: stats.notContacted, Icon: UserPlus, filter: "not_contacted" },
        ].map(({ label, value, Icon, filter }) => (
          <Card
            key={label}
            className={`rounded-3xl border-slate-100 p-0 shadow-sm transition-colors ${quickFilter === filter ? "border-indigo-300 ring-2 ring-indigo-100" : "hover:border-indigo-200 hover:shadow-md"}`}
          >
            <button
              type="button"
              aria-pressed={quickFilter === filter}
              aria-label={`${label}: ${value}. Filter prospects`}
              onClick={() => selectSummaryFilter(filter)}
              className="flex h-full w-full flex-col rounded-3xl p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <Icon className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              <span className="mt-4 text-xs font-semibold text-slate-400">{label}</span>
              <span className="text-3xl font-black text-slate-950">{value}</span>
            </button>
          </Card>
        ))}
      </div>

      <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-white p-4">
          {[["all","All"],["follow_up_due","Follow-up due"],["high","High opportunity"],["contacted","Contacted"],["not_contacted","Not contacted"],["audit_not_sent","Audit not prepared"],["preview","Preview generated"],["replied","Replied"],["call_booked","Call booked"],["ready","Ready to convert"]].map(([id,label]) => <Button key={id} size="sm" variant={quickFilter === id ? "default" : "outline"} onClick={() => setQuickFilter(id)} className="rounded-xl text-xs">{label}</Button>)}
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
              <SelectItem value="name_asc">Business A–Z</SelectItem>
              <SelectItem value="name_desc">Business Z–A</SelectItem>
              <SelectItem value="contact_asc">Contact A–Z</SelectItem>
              <SelectItem value="contact_desc">Contact Z–A</SelectItem>
              <SelectItem value="website_asc">Website: weakest first</SelectItem>
              <SelectItem value="website_desc">Website: strongest first</SelectItem>
              <SelectItem value="opportunity_desc">Highest opportunity</SelectItem>
              <SelectItem value="opportunity_asc">Lowest opportunity</SelectItem>
              <SelectItem value="score_desc">Highest score</SelectItem>
              <SelectItem value="score_asc">Lowest score</SelectItem>
              <SelectItem value="outreach_asc">Outreach: earliest stage</SelectItem>
              <SelectItem value="outreach_desc">Outreach: latest stage</SelectItem>
              <SelectItem value="followup_asc">Next follow-up first</SelectItem>
              <SelectItem value="followup_desc">Latest follow-up first</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="rounded-xl px-6" onClick={() => { setSearchQuery(""); setIndustryFilter("all"); setStatusFilter("all"); setQuickFilter("all"); setSortMode("newest"); }}>
            <Filter className="h-4 w-4 mr-2 text-slate-400" /> Reset
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 text-xs font-semibold text-slate-600">
          <span>Showing {sortedProspects.length} of {prospects.length} loaded prospects · {prospectTotal} in database</span>
          <Button variant="outline" size="sm" onClick={() => void fetchProspects()} disabled={loading}><RefreshCw className="mr-1 h-3 w-3" /> Refresh list</Button>
          {lastImportSummary && <p className="w-full text-indigo-700">{lastImportSummary}</p>}
        </div>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 xl:hidden">
            {loading ? (
              <div className="p-10 text-center">
                <Loader2 className="mx-auto h-7 w-7 animate-spin text-indigo-600" />
                <p className="mt-3 text-sm font-medium text-slate-500">Loading prospects...</p>
              </div>
            ) : sortedProspects.length === 0 ? (
              <div className="p-10 text-center text-sm font-medium text-slate-500">No prospects found.</div>
            ) : (
              sortedProspects.map((prospect) => {
                const scored = prospect._score || scoreProspect(prospect);
                return (
                  <div key={`mobile-${prospect.id}`} className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <button type="button" onClick={() => setSelectedProspect(prospect)} className="min-w-0 text-left">
                        <span className="block truncate text-base font-semibold text-slate-950 dark:text-white">{prospect.name}</span>
                        <span className="mt-1 block text-sm text-slate-500">{prospect.industry || "No industry"}{prospect.location ? ` · ${prospect.location}` : ""}</span>
                      </button>
                      <Badge className="shrink-0 border-none bg-indigo-50 text-sm font-semibold text-indigo-700">{prospect.qualification_score ?? scored.score}</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="outline" className="capitalize">{toTitle(prospect.website_status || "unknown")}</Badge>
                      <Badge variant="outline" className="capitalize">{toTitle(prospect.opportunity_level || "medium")} opportunity</Badge>
                      <Badge variant="outline" className="capitalize">{toTitle(prospect.outreach_status || "not_started")}</Badge>
                      {prospect.converted_business_id && <Badge className="bg-emerald-100 text-emerald-700">Customer</Badge>}
                    </div>
                    {(prospect._latestDelivery || prospect._suppressed) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                        {prospect._latestDelivery && <Badge variant="outline">Email: {toTitle(prospect._latestDelivery.status)}</Badge>}
                        {prospect._suppressed && <Badge className="bg-rose-100 text-rose-700">Suppressed · do not contact</Badge>}
                        {prospect._latestDelivery?.error && <span className="text-rose-600">{prospect._latestDelivery.error}</span>}
                      </div>
                    )}
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-semibold text-slate-500">Recommended next action</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{prospect.recommended_next_action || scored.recommendedNextAction}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{scored.factors.slice(0, 2).map((factor) => `+${factor.points} ${factor.label}`).join(" · ") || "Needs more evidence"}</p>
                    </div>
                    <div className="mt-4">
                      {renderContactActions(prospect)}
                      <p className="mt-2 break-words text-sm text-slate-500">{prospect.contact_email || prospect.contact_phone || prospect.contact_whatsapp || "No contact yet"}</p>
                    </div>
                    {prospect._latestReply && (
                      <button type="button" onClick={() => setSelectedProspect(prospect)} className={`mt-4 w-full rounded-2xl border p-3 text-left ${prospect._unreadReply ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white"}`}>
                        <span className="block text-sm font-semibold text-indigo-700">{prospect._unreadReply ? "● " : ""}Reply · {formatDistanceToNowStrict(new Date(prospect._latestReply.sent_at || prospect._latestReply.created_at), { addSuffix: true })}</span>
                        <span className="mt-1 block line-clamp-2 text-sm text-slate-500">{prospect._latestReply.preview}</span>
                      </button>
                    )}
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div><Label className="text-xs font-semibold text-slate-500">Follow-up</Label><Input type="date" className="mt-1 h-11 rounded-xl" value={prospect.next_follow_up_at ? prospect.next_follow_up_at.slice(0, 10) : ""} onChange={(event) => void setFollowUp(prospect, event.target.value)} /></div>
                      <div><Label className="text-xs font-semibold text-slate-500">Outreach status</Label><Select value={prospect.outreach_status || "not_started"} onValueChange={(value) => updateProspect(prospect.id, { outreach_status: value })}><SelectTrigger className="mt-1 h-11 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{OUTREACH_STATUSES.map((status) => <SelectItem key={status} value={status}>{toTitle(status)}</SelectItem>)}</SelectContent></Select></div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Button variant="outline" className="h-11 rounded-xl" disabled={reviewLoadingId === prospect.id} onClick={() => runQuickAudit(prospect)}><Zap className="mr-2 h-4 w-4" />Audit</Button>
                      <Button variant="outline" className="h-11 rounded-xl" disabled={reviewLoadingId === prospect.id} onClick={() => generatePreviewLink(prospect)}><Copy className="mr-2 h-4 w-4" />Preview</Button>
                      {prospect.contact_email && !prospect._suppressed && !prospect._contactSafetyUnknown && !prospect.converted_business_id && <Button className="col-span-2 h-11 rounded-xl bg-indigo-600" disabled={reviewLoadingId === prospect.id} onClick={() => preparePreviewAndEmail(prospect)}><Send className="mr-2 h-4 w-4" />Prepare & Email</Button>}
                      {!prospect.converted_business_id && ["replied", "call_booked"].includes(prospect.outreach_status) && <Button variant="outline" className="col-span-2 h-11 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => openConversion(prospect)}><UserPlus className="mr-2 h-4 w-4" />Convert to customer</Button>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[1180px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <SortableHeader label="Company" sortMode={sortMode} ascMode="name_asc" descMode="name_desc" onChange={setSortMode} />
                  <SortableHeader label="Contact" sortMode={sortMode} ascMode="contact_asc" descMode="contact_desc" onChange={setSortMode} />
                  <SortableHeader label="Website" sortMode={sortMode} ascMode="website_asc" descMode="website_desc" onChange={setSortMode} />
                  <SortableHeader label="Opportunity" sortMode={sortMode} ascMode="opportunity_asc" descMode="opportunity_desc" onChange={setSortMode} />
                  <SortableHeader label="Score / next action" sortMode={sortMode} ascMode="score_asc" descMode="score_desc" onChange={setSortMode} />
                  <SortableHeader label="Outreach" sortMode={sortMode} ascMode="outreach_asc" descMode="outreach_desc" onChange={setSortMode} />
                  <SortableHeader label="Next Step" sortMode={sortMode} ascMode="followup_asc" descMode="followup_desc" onChange={setSortMode} />
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={8} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" /><p className="mt-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Loading prospects...</p></td></tr>
                ) : sortedProspects.length === 0 ? (
                  <tr><td colSpan={8} className="py-20 text-center"><p className="text-slate-400 font-bold text-sm">No prospects found.</p></td></tr>
                ) : (
                  sortedProspects.map((prospect) => (
                    <tr key={prospect.id} className="hover:bg-slate-50/50 transition-colors align-top">
                      <td className="px-6 py-6">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center"><Globe className="h-5 w-5 text-slate-400" /></div>
                          <div className="min-w-0">
                            <button type="button" onClick={() => setSelectedProspect(prospect)} className="text-left text-sm font-semibold text-slate-900 hover:text-indigo-600 dark:text-white">{prospect.name}</button>
                            <p className="text-xs font-bold text-slate-400">{prospect.industry || "No industry"} {prospect.location ? `• ${prospect.location}` : ""}</p>
                            {prospect.domain && <a className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-indigo-600" href={`https://${prospect.domain}`} target="_blank" rel="noreferrer">{prospect.domain}<ExternalLink className="h-3 w-3" /></a>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        {renderContactActions(prospect)}
                        <p className="mt-2 text-xs font-semibold text-slate-400">{prospect.contact_email || prospect.contact_phone || prospect.contact_whatsapp || "No contact yet"}</p>
                      </td>
                      <td className="px-6 py-6">
                        <Badge className="rounded-full border-none bg-slate-100 px-3 py-0.5 text-xs font-black uppercase text-slate-600">{toTitle(prospect.website_status || "unknown")}</Badge>
                        <p className="mt-2 text-xs font-bold text-slate-500">Website review: {prospect.last_audit_at ? "Prepared" : "Not prepared"}</p>
                        <p className="text-xs font-bold text-slate-400">{prospect.last_audit_at ? format(new Date(prospect.last_audit_at), "MMM dd, yyyy") : "No audit date"}</p>
                      </td>
                      <td className="px-6 py-6">
                        <Select value={prospect.opportunity_level || "medium"} onValueChange={(value) => updateProspect(prospect.id, { opportunity_level: value })}>
                          <SelectTrigger className="h-9 w-32 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>{OPPORTUNITY_LEVELS.map((level) => <SelectItem key={level} value={level}>{toTitle(level)}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-6">
                        {(() => { const scored = prospect._score || scoreProspect(prospect); return <><div className="flex items-center gap-2"><span className="text-lg font-black text-slate-900">{prospect.qualification_score ?? scored.score}</span><Badge className="rounded-full border-none bg-indigo-50 text-xs font-black uppercase text-indigo-700">{prospect.qualification_category || scored.category.replace("_", " ")}</Badge></div><p className="mt-1 text-xs font-semibold text-indigo-600">{prospect.recommended_next_action || scored.recommendedNextAction}</p><p className="mt-1 text-xs font-semibold text-slate-400">{scored.factors.slice(0, 2).map((factor) => `+${factor.points} ${factor.label}`).join(" · ") || "Needs more evidence"}</p></>; })()}
                      </td>
                      <td className="px-6 py-6">
                        <Select value={prospect.outreach_status || "not_started"} onValueChange={(value) => updateProspect(prospect.id, { outreach_status: value })}>
                          <SelectTrigger className="h-9 w-40 rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>{OUTREACH_STATUSES.map((status) => <SelectItem key={status} value={status}>{toTitle(status)}</SelectItem>)}</SelectContent>
                        </Select>
                        {prospect._latestReply && (
                          <button
                            type="button"
                            onClick={() => setSelectedProspect(prospect)}
                            className={`mt-2 block max-w-[220px] rounded-xl border px-3 py-2 text-left ${prospect._unreadReply ? "border-indigo-200 bg-indigo-50" : "border-slate-100 bg-slate-50"}`}
                          >
                            <span className="block text-xs font-black text-indigo-700">
                              {prospect._unreadReply ? "● " : ""}Replied · {formatDistanceToNowStrict(new Date(prospect._latestReply.sent_at || prospect._latestReply.created_at), { addSuffix: true })}
                            </span>
                            <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{prospect._latestReply.preview}</span>
                          </button>
                        )}
                        {prospect._latestDelivery && (
                          <div className="mt-2 text-xs font-semibold">
                            <span className={["bounced","failed","complained"].includes(prospect._latestDelivery.status) ? "text-rose-700" : prospect._latestDelivery.status === "delivered" ? "text-emerald-700" : "text-slate-500"}>
                              Email: {toTitle(prospect._latestDelivery.status)}
                            </span>
                            {prospect._latestDelivery.sent_at && <span className="ml-2 text-slate-400">{format(new Date(prospect._latestDelivery.sent_at), "MMM dd")}</span>}
                            {prospect._latestDelivery.error && <p className="mt-1 max-w-[220px] truncate text-rose-600" title={prospect._latestDelivery.error}>{prospect._latestDelivery.error}</p>}
                          </div>
                        )}
                        {prospect._suppressed && <p className="mt-1 text-xs font-bold text-rose-700">Suppressed · do not contact</p>}
                        {prospect._contactSafetyUnknown && <p className="mt-1 text-xs font-bold text-amber-700">Safety check unavailable · sending blocked</p>}
                      </td>
                      <td className="px-6 py-6">
                        <Input
                          type="date"
                          className="h-9 w-40 rounded-xl"
                          value={prospect.next_follow_up_at ? prospect.next_follow_up_at.slice(0, 10) : ""}
                          onChange={(e) => void setFollowUp(prospect, e.target.value)}
                        />
                        {prospect.preview_url && <a href={prospect.preview_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600"><LinkIcon className="h-3 w-3" /> Preview link</a>}
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" className="rounded-xl h-8 text-xs font-semibold text-indigo-600 hover:bg-indigo-50" disabled={reviewLoadingId === prospect.id} onClick={() => runQuickAudit(prospect)}><Zap className="h-3 w-3 mr-1.5" />Audit</Button>
                          <Button variant="ghost" size="sm" className="rounded-xl h-8 text-xs font-semibold text-indigo-600 hover:bg-indigo-50" disabled={reviewLoadingId === prospect.id} onClick={() => generatePreviewLink(prospect)}><Copy className="h-3 w-3 mr-1.5" />Preview</Button>
                          {prospect.contact_email && !prospect._suppressed && !prospect._contactSafetyUnknown && !prospect.converted_business_id && <Button variant="ghost" size="sm" className="rounded-xl h-8 text-xs font-semibold text-indigo-600 hover:bg-indigo-50" disabled={reviewLoadingId === prospect.id} onClick={() => preparePreviewAndEmail(prospect)}><Send className="h-3 w-3 mr-1.5" />Prepare & Email</Button>}
                          {!prospect.converted_business_id && ["replied", "call_booked"].includes(prospect.outreach_status) && <Button variant="ghost" size="sm" className="rounded-xl h-8 text-xs font-semibold text-emerald-700 hover:bg-emerald-50" onClick={() => openConversion(prospect)}><UserPlus className="h-3 w-3 mr-1.5" />Convert</Button>}
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
            <h3 className="text-xl font-semibold text-white">Manual-first prospect workflow</h3>
            <p className="text-slate-300 text-sm font-bold">Import your list, qualify weak websites, create audit links, contact by email/phone/WhatsApp, and track every next step.</p>
          </div>
          <Button className="h-12 rounded-xl bg-indigo-600 px-8 text-sm font-semibold text-white hover:bg-indigo-700" onClick={() => setIsImportModalOpen(true)}>
            Import Lead List
          </Button>
        </div>
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="rounded-3xl max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight">Add New Prospect</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">Add a business for audit, preview, and outreach tracking.</DialogDescription>
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
        <DialogContent className="h-[calc(100dvh-2rem)] max-h-[56rem] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-3xl p-0">
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

          <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
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
        <DialogContent className="!flex h-[min(92dvh,920px)] w-[calc(100vw-2rem)] !max-w-5xl min-w-0 flex-col gap-0 overflow-hidden rounded-3xl p-0">
          <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-5 pr-14 sm:px-7">
            <DialogTitle className="text-xl font-black tracking-tight">Review email outreach</DialogTitle>
            <DialogDescription>
              Review the recipient, evidence and message before submitting. Provider acceptance does not confirm inbox delivery.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
            {outreachProspect && (
              <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <section className="min-w-0 space-y-4" aria-label="Recipient and evidence">
                  <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500">Recipient</p>
                    <p className="mt-1 break-words text-sm font-bold text-slate-900">{outreachProspect.name}</p>
                    <p className="mt-1 break-all text-xs font-semibold text-slate-600">{outreachProspect.contact_email}</p>
                  </div>
                  {!outreachReplyToMessageId && (
                    <>
                      <Field label="Message type">
                        <Select value={outreachTemplateId} onValueChange={setOutreachTemplateId}>
                          <SelectTrigger aria-label="Choose an email template" className="h-11 w-full min-w-0 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EMAIL_TEMPLATES.filter((template) => template.stage === "First contact" || template.stage === "Contacted").map((template) => (
                              <SelectItem key={template.id} value={template.id}>{template.name} · {template.problem}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-1 text-xs font-medium leading-5 text-slate-500">Choose a template that matches a verified issue. Switching templates will replace an untouched draft.</p>
                      </Field>
                      <Field label="Contact first name (optional)">
                        <Input value={outreachContactFirstName} onChange={(event) => setOutreachContactFirstName(event.target.value)} placeholder="Only if verified" className="h-11 w-full min-w-0 rounded-xl" />
                      </Field>
                      <Field label="Verified website observation">
                        <Textarea value={outreachObservation} onChange={(event) => setOutreachObservation(event.target.value)}
                          placeholder="Quote the exact issue you personally checked, on the relevant page."
                          className="min-h-24 w-full min-w-0 resize-y rounded-xl" />
                      </Field>
                      {outreachObservation.trim().length < 10 && (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">
                          Add one specific, substantiated observation. Do not guess rankings, traffic or lost sales.
                        </p>
                      )}
                      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-bold text-slate-900">Recipient email permission</p>
                        {hasDocumentedMarketingConsent(outreachProspect) ? (
                          <div className="space-y-1 text-xs font-medium text-emerald-800">
                            <p><CheckCircle2 className="mr-1 inline h-4 w-4" />Documented opt-in recorded</p>
                            <p className="break-words text-slate-600">Source: {outreachProspect.consent_source}</p>
                            <p className="text-slate-600">Opt-in: {new Date(outreachProspect.consent_timestamp).toLocaleString()}</p>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs leading-5 text-amber-900">Resend cannot be used for unsolicited prospecting. An email listed publicly on a website is not permission.</p>
                            <Field label="Original date and time of explicit opt-in">
                              <Input type="datetime-local" value={outreachConsentTimestamp} onChange={(event) => setOutreachConsentTimestamp(event.target.value)} className="h-11 w-full min-w-0 rounded-xl" />
                            </Field>
                            <Field label="Verifiable opt-in source">
                              <Textarea value={outreachConsentSource} onChange={(event) => setOutreachConsentSource(event.target.value)}
                                placeholder="Example: newsletter form submission record or written request, with source reference"
                                className="min-h-20 w-full min-w-0 resize-y rounded-xl" />
                            </Field>
                            <label className="flex items-start gap-2 text-xs font-medium leading-5 text-slate-700">
                              <input type="checkbox" checked={outreachConsentConfirmed} onChange={(event) => setOutreachConsentConfirmed(event.target.checked)} className="mt-1" />
                              I have checked evidence that this recipient expressly requested marketing email from Bennie Studio.
                            </label>
                            <Button type="button" variant="outline" onClick={() => void recordOutreachConsent()}
                              disabled={outreachConsentSaving || !outreachConsentConfirmed || outreachConsentSource.trim().length < 10 || !outreachConsentTimestamp}
                              className="w-full rounded-xl">
                              {outreachConsentSaving ? "Saving evidence…" : "Record verified opt-in"}
                            </Button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </section>

                <section className="min-w-0 space-y-4" aria-label="Editable email">
                  <Field label="Subject">
                    <Input value={outreachSubject}
                      onChange={(event) => { setOutreachDraftTouched(true); setOutreachSubject(event.target.value); }}
                      maxLength={160} className="h-11 w-full min-w-0 rounded-xl" />
                  </Field>
                  <Field label="Message">
                    <Textarea value={outreachBody}
                      onChange={(event) => { setOutreachDraftTouched(true); setOutreachBody(event.target.value); }}
                      maxLength={10000} className="min-h-[340px] w-full min-w-0 resize-y rounded-2xl leading-6" />
                  </Field>
                  <p className="text-xs font-medium leading-5 text-slate-500">
                    Keep one clear call to action. The audit link is not added automatically; include it only when it supports this specific message.
                  </p>
                  <p className="text-xs font-medium leading-5 text-slate-500">
                    Email is submitted through your configured provider. WhatsApp opens externally through wa.me and is not automatically delivered.
                  </p>
                </section>
              </div>
            )}
          </div>

          <DialogFooter className="!mx-0 !mb-0 shrink-0 gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
            <Button type="button" variant="outline" onClick={closeOutreachComposer}
              disabled={outreachSending} className="rounded-xl">Cancel</Button>
            <Button type="button" onClick={sendOutreach}
              disabled={outreachSending || !outreachBody.trim() || !outreachSubject.trim() || (
                !outreachReplyToMessageId && (
                  outreachObservation.trim().length < 10 || !hasDocumentedMarketingConsent(outreachProspect)
                )
              ) || hasUnresolvedEmailPlaceholders(outreachSubject + "\n" + outreachBody)}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
              {outreachSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {outreachSending ? "Sending…" : "Send email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedProspect)} onOpenChange={(open) => !open && setSelectedProspect(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>{selectedProspect?.name}</DialogTitle>
            <DialogDescription>Sales conversation, next actions, preview status, and conversion in one view.</DialogDescription>
          </DialogHeader>
          {selectedProspect && (
            <div className="space-y-5 py-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Info label="Pipeline" value={toTitle(selectedProspect.outreach_status || "not_started")} />
                <Info label="Opportunity" value={toTitle(selectedProspect.opportunity_level || "medium")} />
                <Info label="Next follow-up" value={selectedProspect.next_follow_up_at ? format(new Date(selectedProspect.next_follow_up_at), "MMM dd, yyyy") : "Not scheduled"} />
              </div>

              <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                {[
                  ["Audit Site", Boolean(selectedProspect.last_audit_at)],
                  ["Generate Preview", Boolean(selectedProspect.preview_url)],
                  ["Review Preview", Boolean(selectedProspect.preview_generated_at)],
                  ["Send Email", Boolean((engagement?.messages || []).some((message: any) => message.direction === "outbound"))],
                  ["Viewed", Boolean((engagement?.messages || []).some((message: any) => message.direction === "outbound" && ["opened", "clicked"].includes(message.status)))],
                  ["Replied", Boolean((engagement?.messages || []).some((message: any) => message.direction === "inbound"))],
                  ["Customer", Boolean(selectedProspect.converted_business_id)],
                ].map(([label, done]: any) => (
                  <Badge key={label} variant="outline" className={done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-400"}>
                    {done ? <Check className="mr-1 h-3 w-3" /> : null}{label}
                  </Badge>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 p-4">
                  <div>
                    <p className="text-sm font-black text-slate-900">Sales Inbox</p>
                    <p className="text-xs font-semibold text-slate-500">Inbound replies and Bennie Studio emails are kept together.</p>
                  </div>
                  {selectedProspect.contact_email && (
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => {
                      const prospect = selectedProspect;
                      setSelectedProspect(null);
                      openOutreachComposer(prospect);
                    }}>
                      <Mail className="mr-2 h-4 w-4" />New email
                    </Button>
                  )}
                </div>
                <div className="max-h-[360px] space-y-3 overflow-y-auto p-4">
                  {engagementLoading ? (
                    <div className="py-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-600" /></div>
                  ) : !engagement?.messages?.length ? (
                    <p className="py-8 text-center text-sm font-semibold text-slate-400">No email conversation recorded yet.</p>
                  ) : engagement.messages.map((message: any) => (
                    <div key={message.id} className={message.direction === "inbound" ? "mr-8 rounded-2xl border border-indigo-100 bg-indigo-50 p-4" : "ml-8 rounded-2xl border border-slate-200 bg-white p-4"}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-slate-500">{message.direction === "inbound" ? "Client reply" : "Bennie Studio"}</p>
                          <p className="mt-1 text-sm font-black text-slate-900">{message.subject || "Email"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-400">{format(new Date(message.sent_at || message.created_at), "MMM dd, yyyy · h:mm a")}</p>
                          <div className="mt-1 flex justify-end gap-1">
                            {message.classification && <Badge variant="outline" className="text-xs">{toTitle(message.classification)}</Badge>}
                            {message.direction === "outbound" && <Badge variant="outline" className="text-xs">{toTitle(message.status || "sent")}</Badge>}
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-700">{message.body_text}</p>
                      {message.direction === "inbound" && selectedProspect.contact_email && (
                        <Button size="sm" className="mt-3 rounded-xl bg-indigo-600" onClick={() => {
                          const prospect = selectedProspect;
                          setSelectedProspect(null);
                          openOutreachComposer(prospect, message);
                        }}>
                          <Send className="mr-2 h-3.5 w-3.5" />Reply
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-400">Open sales tasks</p>
                <div className="mt-3 space-y-2">
                  {(engagement?.tasks || []).filter((task: any) => task.status === "open").map((task: any) => (
                    <div key={task.id} className="flex flex-col gap-3 rounded-xl bg-slate-50 p-3 sm:flex-row sm:items-center">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-800">{task.title}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-400">{task.due_at ? `Due ${format(new Date(task.due_at), "MMM dd, yyyy · h:mm a")}` : "No due date"} · {toTitle(task.priority || "medium")}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="rounded-xl" onClick={() => updateSalesTask(task.id, "dismissed")}>Dismiss</Button>
                        <Button size="sm" className="rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={() => updateSalesTask(task.id, "completed")}><Check className="mr-1 h-3.5 w-3.5" />{task.task_type === "reply" ? "Mark handled" : "Done"}</Button>
                      </div>
                    </div>
                  ))}
                  {!(engagement?.tasks || []).some((task: any) => task.status === "open") && (
                    <p className="text-sm font-semibold text-slate-400">No open sales tasks.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-400">Internal notes</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-700">{selectedProspect.notes || "No notes recorded."}</p>
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap">
            {selectedProspect?.preview_url && <a href={selectedProspect.preview_url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-bold"><ExternalLink className="mr-2 h-4 w-4"/>Open Preview</a>}
            {selectedProspect && !selectedProspect.converted_business_id && (
              <Button variant="outline" onClick={() => openConversion(selectedProspect)} className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <UserPlus className="mr-2 h-4 w-4" />Convert to Customer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(conversionProspect)} onOpenChange={(open) => !open && setConversionProspect(null)}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>Convert {conversionProspect?.name} to Customer</DialogTitle>
            <DialogDescription>Create the pending customer workspace, onboarding queue, and delivery project without duplicating records on retry.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-3">
            <Field label="Product">
              <Select value={conversionProduct} onValueChange={setConversionProduct}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="managed-website">Managed Website</SelectItem>
                  <SelectItem value="website-growth">Website Growth</SelectItem>
                  <SelectItem value="growth-partner">Growth Partner</SelectItem>
                  <SelectItem value="custom-website">Custom Website</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Market">
                <Select value={conversionMarket} onValueChange={setConversionMarket}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MY">Malaysia</SelectItem>
                    <SelectItem value="SG">Singapore</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="INTL">International / USD</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Initial commitment">
                <Input type="number" min="1" max="120" step="1" value={conversionTerm} onChange={(e) => setConversionTerm(e.target.value)} className="rounded-xl" />
                <p className="mt-1 text-xs font-semibold leading-4 text-slate-500">{conversionCommercialLoading ? "Loading the current catalogue term…" : "Defaults from Products & Pricing for this product/market. Change only for a negotiated customer-specific term."}</p>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`Setup fee (${conversionMarket === "MY" ? "MYR" : conversionMarket === "SG" ? "SGD" : conversionMarket === "GB" ? "GBP" : "USD"})`}>
                <Input type="number" min="0" step="0.01" value={conversionSetupFee} onChange={(e) => setConversionSetupFee(e.target.value)} className="rounded-xl" />
              </Field>
              <Field label="Recurring fee">
                <Input type="number" min="0" step="0.01" value={conversionRecurringFee} onChange={(e) => setConversionRecurringFee(e.target.value)} className="rounded-xl" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contact name"><Input value={conversionContactName} onChange={(e) => setConversionContactName(e.target.value)} className="rounded-xl" placeholder="Decision maker / approval contact" /></Field>
              <Field label="Contact email"><Input type="email" value={conversionEmail} onChange={(e) => setConversionEmail(e.target.value)} className="rounded-xl" /></Field>
              <Field label="Contact phone"><Input value={conversionPhone} onChange={(e) => setConversionPhone(e.target.value)} className="rounded-xl" /></Field>
              <Field label="WhatsApp"><Input value={conversionWhatsapp} onChange={(e) => setConversionWhatsapp(e.target.value)} className="rounded-xl" /></Field>
            </div>
            {!conversionEmail.trim() && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                <AlertTriangle className="mr-2 inline h-4 w-4" />No customer email is captured. Add one so Bennie Studio can send onboarding access automatically.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConversionProspect(null)} disabled={conversionSaving} className="rounded-xl">Cancel</Button>
            <Button onClick={convertProspect} disabled={conversionSaving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
              {conversionSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Create Customer Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function SortableHeader({
  label,
  sortMode,
  ascMode,
  descMode,
  onChange,
}: {
  label: string;
  sortMode: string;
  ascMode: string;
  descMode: string;
  onChange: (value: string) => void;
}) {
  const ascending = sortMode === ascMode;
  const descending = sortMode === descMode;
  const active = ascending || descending;
  const nextMode = ascending ? descMode : ascMode;

  return (
    <th
      aria-sort={ascending ? "ascending" : descending ? "descending" : "none"}
      className="px-6 py-4 text-xs font-semibold text-slate-400"
    >
      <button
        type="button"
        onClick={() => onChange(nextMode)}
        className="group inline-flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
        title={ascending ? `Sort ${label} descending` : `Sort ${label} ascending`}
      >
        <span>{label}</span>
        {ascending ? (
          <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
        ) : descending ? (
          <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-slate-300 transition-colors group-hover:text-indigo-500" />
        )}
      </button>
    </th>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-semibold text-slate-400">{label}</p><p className="mt-2 break-words text-sm font-bold text-slate-800">{value}</p></div>;
}
