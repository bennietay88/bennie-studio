Warning: truncated output (original token count: 144534)
Total output lines: 11592

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from "react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { Button, buttonVariants } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Save,
  Globe,
  Eye,
  Palette,
  Layout,
  Settings as SettingsIcon,
  Plus,
  Loader2,
  EyeOff,
  Trash2,
  Bold,
  Italic,
  List as ListIcon,
  Image as ImageIcon,
  Type,
  Copy,
  ArrowRight,
  Paintbrush,
  PanelBottom,
  Calendar,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Shield,
  FileText,
  Lock,
  ChevronUp,
  ChevronDown,
  Music,
  Search,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  X,
  Monitor,
  Tablet,
  MapPin,
  Edit3,
  Smartphone,
  Zap,
  GripVertical,
  Mail,
  HelpCircle,
  CreditCard,
  RefreshCw,
  RotateCcw,
  TrendingUp,
  ShoppingBag,
  BarChart3,
  Code,
  Layers,
  Activity,
  Wand2,
  History,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Website, WebsitePage, WebsiteSection } from "../types";
import { useFeatures } from "../hooks/useFeatures";
import {
  SECTION_TEMPLATES,
  createSectionFromTemplate,
} from "../constants/sectionTemplates";
import { DEFAULT_POLICIES } from "../constants/defaultPolicies";
import { NICHE_TEMPLATES } from "../constants/nicheTemplates";
import { APPROVED_VARIANTS, DESIGN_PROFILE_OPTIONS, type DesignProfileId } from "../constants/designProfiles";
import { BennieDesignStudio } from "./BennieDesignStudio";
import {
  createPlanLimitUpgradeMessage,
  getPlanPageLimit,
  getPlanUpgradeValue,
  WebsitePlanId,
} from "../constants/pageBlueprints";
import { normalizePlans } from "../constants/plans";
import { ImageUpload } from "./ImageUpload";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { generateId, cn } from "../lib/utils";
import { auditWebsiteButtons, normalizeWebsiteForPreview } from "../lib/websiteButtons";
import { assessWebsiteDesign } from "../lib/designQa";
import {
  DELIVERY_STANDARD_VERSION,
  evaluateWorldClassLaunchGate,
} from "../constants/deliveryStandards";
import { 
  generatePageContent, 
  generateSectionContent, 
  generateWebsiteContent,
  improveHeadline,
  rewriteSubheadline,
  generateSEOMetadata,
  generateFAQs,
  generateMarketingContent
} from "../lib/gemini";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Skeleton } from "./ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

import { emailService } from "../services/emailService";
import { toast } from "sonner";

const WebsiteGenerator = React.lazy(() =>
  import("./WebsiteGenerator").then((module) => ({
    default: module.WebsiteGenerator,
  })),
);

const WebsiteRenderer = React.lazy(() =>
  import("./WebsiteRenderer").then((module) => ({
    default: module.WebsiteRenderer,
  })),
);

const ReactMarkdown = React.lazy(() => import("react-markdown"));

const InlineModuleFallback = ({
  label = "Loading preview...",
}: {
  label?: string;
}) => (
  <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-500">
    <Loader2 className="mr-2 h-4 w-4 animate-spin text-indigo-500" />
    {label}
  </div>
);

const seoSchema = z.object({
  title: z
    .string()
    .min(1, "Title is too short")
    .max(100, "Title is too long")
    .optional()
    .or(z.literal("")),
  description: z
    .string()
    .min(1, "Description is too short")
    .max(500, "Description is too long")
    .optional()
    .or(z.literal("")),
  keywords: z.string().optional().or(z.literal("")),
  favicon: z
    .string()
    .url("Please enter a valid URL for the favicon")
    .optional()
    .or(z.literal("")),
  ogImage: z
    .string()
    .url("Please enter a valid URL for the OG image")
    .optional()
    .or(z.literal("")),
  canonicalUrl: z
    .string()
    .url("Please enter a valid URL for the canonical link")
    .optional()
    .or(z.literal("")),
  // GEO & Local SEO
  region: z.string().optional(),
  placename: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  businessType: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  priceRange: z.string().optional(),
  // GEO (Generative Engine Optimization)
  brandVoice: z.string().optional(),
  targetAudience: z.string().optional(),
  coreValueProposition: z.string().optional(),
  knowledgeBaseSummary: z.string().optional(),
});

const fallbackTheme: Website["theme"] = {
  primaryColor: "#4f46e5",
  secondaryColor: "#0f172a",
  fontFamily: "Inter",
  style: "modern" as const,
  footer: {
    showMenu: true,
    showSocials: true,
    showContact: true,
    customText: "",
    contactEmail: "",
    contactPhone: "",
    contactAddress: "",
    socialLinks: [
      { platform: "facebook", url: "", isVisible: true },
      { platform: "instagram", url: "", isVisible: true },
      { platform: "twitter", url: "", isVisible: true },
      { platform: "linkedin", url: "", isVisible: true },
      { platform: "youtube", url: "", isVisible: true },
    ],
  },
};

const safeSlug = (value: unknown, fallback: string) => {
  if (typeof value === "string") return value;
  return fallback;
};

const normalizeSectionType = (type: unknown) => {
  const normalized = String(type || "text_content")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const aliases: Record<string, string> = {
    hero_section: "hero",
    headline: "hero",
    service: "services",
    services_section: "services",
    proof_section: "proof",
    social_proof: "proof",
    logo_marquee: "proof",
    logo_strip: "proof",
    trust_bar: "proof",
    partner_logos: "proof",
    technology_logos: "proof",
    feature: "features",
    features_section: "features",
    benefit: "benefits",
    benefits_section: "benefits",
    call_to_action: "cta",
    final_cta: "cta",
    cta_section: "cta",
    contact_form: "contact",
    booking: "appointment",
    appointments: "appointment",
    testimonial: "testimonials",
    testimonials_section: "testimonials",
  };

  return aliases[normalized] || normalized;
};

const normalizeSectionContent = (type: string, content: unknown) => {
  const source = content && typeof content === "object" ? { ...(content as Record<string, any>) } : {};

  if (type === "hero") {
    source.headline = source.headline || source.title || source.heading || "";
    source.subheadline = source.subheadline || source.subtitle || source.description || "";
    source.ctaText = source.ctaText || source.cta || source.buttonText || "Get Started";
  }

  if (type === "cta") {
    source.buttonText = source.buttonText || source.cta || source.ctaText || "Get Started";
    source.title = source.title || source.headline || "Ready to Get Started?";
    source.description = source.description || source.subtitle || source.subheadline || "";
  }

  if ((type === "services" || type === "benefits") && !Array.isArray(source.items)) {
    source.items = [];
  }

  if (type === "features" && !Array.isArray(source.items)) {
    source.items = [];
  }

  if (type === "proof") {
    if (!Array.isArray(source.stats)) source.stats = [];
    if (!Array.isArray(source.logos)) source.logos = [];
    if (!Array.isArray(source.items)) source.items = [];
  }

  return source;
};

const normalizeGeneratedSection = (section: any, existing?: WebsiteSection): WebsiteSection => {
  const rawType = String(section?.type || existing?.type || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const type = normalizeSectionType(rawType);
  const incomingContent = normalizeSectionContent(type, section?.content);
  const existingContent = normalizeSectionContent(type, existing?.content);
  const logoMarqueeAlias = ["logo_marquee", "logo_strip", "trust_bar", "partner_logos", "technology_logos"].includes(rawType);

  return {
    ...(existing || {}),
    ...(section || {}),
    id: existing?.id || section?.id || generateId(),
    type,
    content: {
      ...existingContent,
      ...incomingContent,
    },
    isVisible: section?.isVisible !== false && existing?.isVisible !== false,
    settings: {
      ...(existing?.settings || {}),
      ...(section?.settings && typeof section.settings === "object" ? section.settings : {}),
      ...(logoMarqueeAlias ? { variant: "logo_marquee" } : {}),
    },
  } as WebsiteSection;
};

const mergeGeneratedSections = (existingSections: WebsiteSection[] = [], generatedSections: any[] = []) => {
  const usableGenerated = generatedSections.filter(
    (section) => section && typeof section === "object",
  );

  if (usableGenerated.length === 0) return existingSections;

  return usableGenerated.map((section, sectionIndex) => {
    const type = normalizeSectionType(section.type);
    const existing =
      existingSections.find((candidate) => normalizeSectionType(candidate.type) === type) ||
      existingSections[sectionIndex];

    return normalizeGeneratedSection(section, existing);
  });
};

const sanitizePages = (pages: unknown): WebsitePage[] => {
  const rawPages = Array.isArray(pages) ? pages.filter(Boolean) : [];
  const normalized = rawPages.map((page: any, pageIndex) => {
    const title =
      typeof page?.title === "string" && page.title.trim()
        ? page.title.trim()
        : pageIndex === 0
          ? "Home"
          : `Page ${pageIndex + 1}`;

    const sections = Array.isArray(page?.sections)
      ? page.sections.filter(Boolean).map((section: any) => normalizeGeneratedSection(section))
      : [];

    return {
      ...page,
      id: page?.id || generateId(),
      title,
      slug: safeSlug(page?.slug, pageIndex === 0 ? "" : title.toLowerCase().replace(/[^a-z0-9]+/g, "-")),
      sections,
      seo: page?.seo && typeof page.seo === "object" ? page.seo : {},
    } as WebsitePage;
  });

  return normalized.length > 0
    ? normalized
    : [{ id: generateId(), title: "Home", slug: "", sections: [], seo: {} }];
};

const sanitizeWebsite = (website: Website): Website => {
  const theme = {
    ...fallbackTheme,
    ...(website.theme || {}),
    footer: {
      ...fallbackTheme.footer,
      ...(website.theme?.footer || {}),
      socialLinks: Array.isArray(website.theme?.footer?.socialLinks)
        ? website.theme.footer.socialLinks
        : fallbackTheme.footer.socialLinks,
    },
  };

  return normalizeWebsiteForPreview({
    ...website,
    theme,
    pages: sanitizePages(website.pages),
    seo: {
      title: website.seo?.title || "",
      description: website.seo?.description || "",
      keywords: Array.isArray(website.seo?.keywords) ? website.seo.keywords : [],
      ...website.seo,
    },
  });
};

const stripTemplatePayloadFallbackFields = (payload: Record<string, any>) => {
  const { updated_at, is_visible, is_premium, ...fallbackPayload } = payload;
  return fallbackPayload;
};

const isMissingTemplateColumnError = (error: any) =>
  error?.code === "42703" ||
  String(error?.message || "").includes("schema cache") ||
  String(error?.message || "").includes("column") ||
  String(error?.message || "").includes("updated_at") ||
  String(error?.message || "").includes("is_visible") ||
  String(error?.message || "").includes("is_premium");

type SeoFormData = z.infer<typeof seoSchema>;

type WebsiteContentRevision = {
  id: string;
  savedAt: string;
  status: string;
  sourceUpdatedAt?: string | null;
  content: {
    pages: WebsitePage[];
    theme: Website["theme"];
    seo: Partial<Website["seo"]>;
  };
};

const THEME_PRESETS: {
  name: string;
  primary: string;
  secondary: string;
  font: string;
  style: string;
  premium?: boolean;
}[] = [
  {
    name: "Authority Master",
    primary: "#0f172a",
    secondary: "#0d9488",
    font: "Fraunces, serif",
    style: "authority",
  },
  {
    name: "Lead Multiplier",
    primary: "#4f46e5",
    secondary: "#ef4444",
    font: "Plus Jakarta Sans, sans-serif",
    style: "action",
  },
  {
    name: "Visual Narrative",
    primary: "#000000",
    secondary: "#6366f1",
    font: "Outfit, sans-serif",
    style: "immersive",
  },
  {
    name: "Minimalist Clean",
    primary: "#18181b",
    secondary: "#71717a",
    font: "Inter, sans-serif",
    style: "editorial",
  },
  {
    name: "Corporate Pro",
    primary: "#1e3a8a",
    secondary: "#334155",
    font: "Inter, sans-serif",
    style: "corporate",
  },
  {
    name: "Midnight Glass",
    primary: "#1e1b4b",
    secondary: "#f0abfc",
    font: "Outfit, sans-serif",
    style: "glassmorphic",
  },
  {
    name: "Scandinavian",
    primary: "#334155",
    secondary: "#94a3b8",
    font: "Inter, sans-serif",
    style: "modern",
  },
  {
    name: "Elite Prestige",
    primary: "#000000",
    secondary: "#C5A059",
    font: "'Playfair Display', serif",
    style: "prestige",
    premium: true,
  },
  {
    name: "Midnight Luxury",
    primary: "#0f172a",
    secondary: "#e2e8f0",
    font: "Outfit, sans-serif",
    style: "luxury_dark",
    premium: true,
  },
];

const FONTS = [
  { name: "Inter (Sans)", value: "Inter, sans-serif" },
  { name: "Outfit (Modern)", value: "Outfit, sans-serif" },
  { name: "Playfair Display (Serif)", value: "Playfair Display, serif" },
  { name: "JetBrains Mono (Tech)", value: "JetBrains Mono, monospace" },
  { name: "Public Sans (Clean)", value: "Public Sans, sans-serif" },
  {
    name: "Bricolage Grotesque (Bold)",
    value: "Bricolage Grotesque, sans-serif",
  },
  { name: "Syne (Artistic)", value: "Syne, sans-serif" },
  { name: "Fraunces (Elegant Serif)", value: "Fraunces, serif" },
  { name: "Space Grotesque (Tech Sans)", value: "Space Grotesque, sans-serif" },
  { name: "Plus Jakarta Sans (Sleek)", value: "Plus Jakarta Sans, sans-serif" },
];

type WebsiteWorkflowStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "ready_to_launch"
  | "live";

const WEBSITE_WORKFLOW_STATUSES: Array<{
  value: WebsiteWorkflowStatus;
  label: string;
  helper: string;
}> = [
  { value: "draft", label: "Draft", helper: "Still being prepared" },
  { value: "in_review", label: "In Review", helper: "Waiting for review" },
  { value: "changes_requested", label: "Changes Requested", helper: "Needs edits" },
  { value: "ready_to_launch", label: "Ready to Launch", helper: "Approved for launch" },
  { value: "live", label: "Live", helper: "Published to visitors" },
];

const getWorkflowLabel = (status?: string) =>
  WEBSITE_WORKFLOW_STATUSES.find((item) => item.value === status)?.label ||
  "Draft";

function GoogleReviewsEditor({
  content,
  onChange,
}: {
  content: any;
  onChange: (patch: Record<string, any>) => void;
}) {
  const [query, setQuery] = React.useState(String(content?.placeName || ""));
  const [results, setResults] = React.useState<any[]>([]);
  const [selectedPreview, setSelectedPreview] = React.useState<any | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [loadingDetails, setLoadingDetails] = React.useState(false);

  const authHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Your session has expired. Sign in again.");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    };
  };

  const loadDetails = React.useCallback(async (placeId: string) => {
    if (!placeId) {
      setSelectedPreview(null);
      return;
    }
    try {
      setLoadingDetails(true);
      const headers = await authHeaders();
      const response = await fetch(
        `/api/admin/google-places/details?placeId=${encodeURIComponent(placeId)}`,
        { headers },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Could not load Google reviews.");
      setSelectedPreview(payload.place || null);
    } catch (error: any) {
      setSelectedPreview(null);
      toast.error(error?.message || "Could not load Google reviews.");
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  React.useEffect(() => {
    if (content?.placeId) void loadDetails(String(content.placeId));
  }, [content?.placeId, loadDetails]);

  const searchPlaces = async () => {
    if (query.trim().length < 3) return toast.error("Enter the customer business name and location.");
    try {
      setSearching(true);
      const headers = await authHeaders();
      const response = await fetch("/api/admin/google-places/search", {
        method: "POST",
        headers,
        body: JSON.stringify({ query: query.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Google Business search failed.");
      setResults(payload.places || []);
      if (!(payload.places || []).length) toast.info("No matching Google Business locations found.");
    } catch (error: any) {
      toast.error(error?.message || "Google Business search failed.");
    } finally {
      setSearching(false);
    }
  };

  const choosePlace = (place: any) => {
    onChange({
      placeId: place.id,
      placeName: place.displayName,
      enabled: true,
    });
    setQuery(place.displayName || query);
    setResults([]);
    setSelectedPreview(place);
    void loadDetails(place.id);
  };

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Label className="text-sm font-black text-slate-900">Google Reviews</Label>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
            Connect this section to the customer's Google Business listing. Reviews remain live Google data and are not copied into the website.
          </p>
        </div>
        <Switch
          checked={content?.enabled !== false}
          onCheckedChange={(checked) => onChange({ enabled: checked })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Section heading</Label>
        <Input
          value={content?.title || "What our customers say"}
          onChange={(event) => onChange({ title: event.target.value })}
          placeholder="What our customers say"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Find Google Business location</Label>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void searchPlaces();
              }
            }}
            placeholder="e.g. Acme Dental, Singapore"
          />
          <Button type="button" variant="outline" onClick={searchPlaces} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {results.length > 0 ? (
        <div className="space-y-2">
          {results.map((place) => (
            <button
              key={place.id}
              type="button"
              onClick={() => choosePlace(place)}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40"
            >
              <p className="text-sm font-black text-slate-900">{place.displayName}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">{place.formattedAddress || "Address not returned"}</p>
              <p className="mt-1 text-xs font-bold text-amber-600">
                {place.rating ? `${Number(place.rating).toFixed(1)} ★` : "No rating"} {place.userRatingCount ? `· ${Number(place.userRatingCount).toLocaleString()} reviews` : ""}
              </p>
            </button>
          ))}
        </div>
      ) : null}

      {content?.placeId ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Connected</p>
          <p className="mt-1 text-sm font-black text-slate-900">
            {selectedPreview?.displayName || content?.placeName || "Google Business location"}
          </p>
          {loadingDetails ? (
            <p className="mt-2 text-xs font-semibold text-slate-500">Loading live rating…</p>
          ) : selectedPreview ? (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600">
              <span>{Number(selectedPreview.rating || 0).toFixed(1)} ★</span>
              <span>{Number(selectedPreview.userRatingCount || 0).toLocaleString()} Google reviews</span>
              {selectedPreview.googleMapsUri ? (
                <a href={selectedPreview.googleMapsUri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600">
                  Open Google <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </div>
          ) : null}
          <p className="mt-2 break-all font-mono text-[10px] text-slate-400">{content.placeId}</p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label>Reviews to show</Label>
        <Select
          value={String(content?.maxReviews || 5)}
          onValueChange={(value) => onChange({ maxReviews: Number(value) })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {[3, 4, 5].map((value) => (
              <SelectItem key={value} value={String(value)}>{value} reviews</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[10px] font-medium leading-4 text-slate-400">
          The section links visitors to Google for the full review history.
        </p>
      </div>
    </div>
  );
}

interface WebsiteEditorProps {
  businessIdOverride?: string;
  templateIdOverride?: string;
  forceShowGenerator?: boolean;
  onTemplateCreated?: (templateId: string) => void;
}

export function WebsiteEditor({
  businessIdOverride,
  templateIdOverride,
  forceShowGenerator,
  onTemplateCreated,
}: WebsiteEditorProps) {
  const { user, profile, business: authBusiness, refreshProfile } = useAuth();
  const businessId = businessIdOverride || profile?.businessId;
  const isTemplateMode = !!templateIdOverride;
  const navigate = useNavigate();
  const location = useLocation();
  const { isFeatureEnabled } = useFeatures();
  const [website, setWebsite] = useState<Website | null>(null);
  const [business, setBusiness] = useState<any | null>(null);
  const [template, setTemplate] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "content"
    | "general"
    | "theme"
    | "design_studio"
    | "seo"
    | "footer"
    | "template"
    | "tracking"
    | "advanced"
  >("content");
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showRevisionHistory, setShowRevisionHistory] = useState(false);
  const [websiteRevisions, setWebsiteRevisions] = useState<WebsiteContentRevision[]>([]);
  const [isLoadingRevisions, setIsLoadingRevisions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddSection, setShowAddSection] = useState<{
    pageId: string;
  } | null>(null);
  const [showGenerator, setShowGenerator] = useState(
    forceShowGenerator || false,
  );
  const [showTemplatePreview, setShowTemplatePreview] = useState(false);
  const [livePreviewViewport, setLivePreviewViewport] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");
  const [expandedSettings, setExpandedSettings] = useState<string | null>(null);
  const [seoAudit, setSeoAudit] = useState<any>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [legalAcknowledged, setLegalAcknowledged] = useState(false);
  const [activeElement, setActiveElement] = useState<{
    type: "page" | "section";
    pageId: string;
    sectionId?: string;
  } | null>(null);
  const [showAddPage, setShowAddPage] = useState(false);
  const [maxPages, setMaxPages] = useState(5);
  const [currentPlanConfig, setCurrentPlanConfig] = useState<any>(null);
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);
  const [newPageData, setNewPageData] = useState({ title: "", slug: "" });
  const [isGeneratingPage, setIsGeneratingPage] = useState(false);
  const [isGeneratingSection, setIsGeneratingSection] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [showAiEditor, setShowAiEditor] = useState(false);
  const [styleToPreview, setStyleToPreview] = useState<string | null>(null);
  const [enabledStyles, setEnabledStyles] = useState<string[]>([]);
  const [enabledThemes, setEnabledThemes] = useState<string[]>([]);

  const [activePageId, setActivePageId] = useState<string | null>(null);

  const loadWebsiteRevisions = useCallback(async (websiteId: string) => {
    if (isTemplateMode) return;
    setIsLoadingRevisions(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const response = await fetch(`/api/admin/websites/${websiteId}/revisions`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Version history could not be loaded.");
      setWebsiteRevisions(Array.isArray(payload.revisions) ? payload.revisions : []);
    } catch (error) {
      console.warn("Website revision history could not be loaded:", error);
    } finally {
      setIsLoadingRevisions(false);
    }
  }, [isTemplateMode]);

  useEffect(() => {
    if (website?.id && !isTemplateMode) void loadWebsiteRevisions(website.id);
  }, [website?.id, isTemplateMode, loadWebsiteRevisions]);

  const [showAnalysis, setShowAnalysis] = useState(false);
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [improving, setImproving] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [customerApprovalRecorded, setCustomerApprovalRecorded] = useState(false);
  const isInternalOperator = ["super_admin", "platform_staff", "staff"].includes(String(profile?.role || ""));
  const workflowStatus: WebsiteWorkflowStatus =
    (website?.seo?.workflowStatus as WebsiteWorkflowStatus | undefined) ||
    (website?.status === "published" ? "live" : "draft");
  const buttonAudit = useMemo(() => (website ? auditWebsiteButtons(website) : []), [website]);
  const brokenButtons = buttonAudit.filter((button) => button.status !== "working");
  const criticalBrokenButtons = brokenButtons.filter((button) => button.critical);
  const designAudit = useMemo(() => (website ? assessWebsiteDesign(website) : null), [website]);
  const generationMode = website?.theme?.generationMode || "fast";
  const designPublishBlocked =
    generationMode !== "fast" &&
    Boolean(designAudit && !designAudit.productionReady);
  const designBlockingChecks =
    designAudit?.checks.filter((check) => !check.pass && (check.severity === "high" || generationMode === "brand_led")) || [];
  const deliveryQuality = (website?.seo?.deliveryQuality || {}) as {
    internalCreativeReviewApproved?: boolean;
    responsiveQaApproved?: boolean;
    customerApprovalRecorded?: boolean;
  };
  const launchGate = useMemo(
    () =>
      website
        ? evaluateWorldClassLaunchGate({
            website,
            buttonIssues: buttonAudit,
            designProductionReady: !designPublishBlocked,
            internalCreativeReviewApproved: Boolean(deliveryQuality.internalCreativeReviewApproved),
            responsiveQaApproved: Boolean(deliveryQuality.responsiveQaApproved),
            customerApprovalRecorded:
              customerApprovalRecorded || Boolean(deliveryQuality.customerApprovalRecorded),
          })
        : null,
    [
      website,
      buttonAudit,
      designPublishBlocked,
      deliveryQuality.internalCreativeReviewApproved,
      deliveryQuality.responsiveQaApproved,
      deliveryQuality.customerApprovalRecorded,
      customerApprovalRecorded,
    ],
  );

  React.useEffect(() => {
    if (!businessId || isTemplateMode) return;
    let active = true;
    supabase
      .from("customer_approvals")
      .select("status,responded_at")
      .eq("business_id", businessId)
      .eq("status", "approved")
      .order("responded_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setCustomerApprovalRecorded(Boolean(data));
      });
    return () => {
      active = false;
    };
  }, [businessId, isTemplateMode]);

  const updateDeliveryQuality = async (
    key: "internalCreativeReviewApproved" | "responsiveQaApproved" | "customerApprovalRecorded",
    value: boolean,
  ) => {
    if (!website || !isInternalOperator) return;
    const nextSeo = {
      ...website.seo,
      deliveryStandardVersion: DELIVERY_STANDARD_VERSION,
      deliveryQuality: {
        ...(website.seo?.deliveryQuality || {}),
        [key]: value,
        lastReviewedAt: new Date().toISOString(),
        lastReviewedBy: profile?.uid || profile?.email || "internal_operator",
      },
    };
    setSaving(true);
    try {
      const { error } = await supabase
        .from("websites")
        .update({ seo: nextSeo, updated_at: new Date().toISOString() })
        .eq("id", website.id);
      if (error) throw error;
      setWebsite({ ...website, seo: nextSeo });
      if (key === "customerApprovalRecorded") setCustomerApprovalRecorded(value);
      toast.success("Delivery quality gate updated");
    } catch (error: any) {
      toast.error(error?.message || "Could not update the delivery quality gate");
    } finally {
      setSaving(false);
    }
  };

  const previewUrl = useMemo(() => {
    return isTemplateMode && templateIdOverride
      ? `/preview/template/${templateIdOverride}`
      : businessId
        ? `/w/${businessId}?draft=1${website?.id ? `&website=${website.id}` : ""}`
        : "";
  }, [businessId, isTemplateMode, templateIdOverride, website?.id]);

  const handleFieldAIAssist = async (
    field: "headline" | "subheadline" | "faq" | "seo" | "marketing",
    sectionId?: string,
    currentValue?: any,
  ) => {
    if (!business || !website) return;

    const loadingKey = sectionId ? `${sectionId}-${field}` : field;
    setImproving(loadingKey);

    try {
      let result;
      const industryText = business.industry || "General";
      const nameText = business.name;

      if (field === "headline") {
        result = await improveHeadline(
          currentValue,
          nameText,
          industryText,
          business.id,
        );
      } else if (field === "subheadline") {
        result = await rewriteSubheadline(
          currentValue,
          nameText,
          industryText,
          business.id,
        );
      } else if (field === "faq") {
        const services = [
          business.service1,
          business.service2,
          business.service3,
        ].filter(Boolean);
        result = await generateFAQs(
          nameText,
          industryText,
          services,
          business.id,
        );
      } else if (field === "seo") {
        result = await generateSEOMetadata(
          nameText,
          industryText,
          business.business_nature || business.description || "",
          business.id,
        );
      } else if (field === "marketing" && sectionId && currentValue) {
        result = await generateMarketingContent(currentValue, {
          ...business,
          ...website,
        });
      }

      if (result) {
        if (sectionId && (field === "headline" || field === "subheadline")) {
          updateSectionContent(activeElement?.pageId || "", sectionId, {
            [field]: result,
          });
          toast.success("AI rewrite complete. The section copy has been updated.");
        } else if (field === "faq" && sectionId) {
          updateSectionContent(activeElement?.pageId || "", sectionId, {
            items: result,
          });
          toast.success("FAQs Generated.");
        } else if (field === "seo") {
          setWebsite({ ...website, seo: result });
          toast.success("SEO Metadata Optimized.");
        }
      }
    } catch (error: any) {
      console.error("AI Assist failed:", error);
      toast.error(error.message || "AI Agent encountered an error.");
    } finally {
      setImproving(null);
    }
  };

  const identifyBlueprintGaps = useCallback(() => {
    if (!website) return;
    const missing: string[] = [];
    const homePage = website.pages.find(p => p.slug === "" || p.slug === "home");
    
    if (homePage) {
      const hero = homePage.sections.find(s => s.type === "hero");
      if (!(hero?.content?.headline && hero?.content?.subheadline && hero?.content?.imageUrl)) missing.push("High-Impact Hero Strategy");

      const proof = homePage.sections.find(s => s.type === "proof" || s.type === "testimonials" || s.type === "google_reviews");
      if (!proof) missing.push("Trust & Social Proof");

      const services = homePage.sections.find(s => s.type === "services");
      if (!services) missing.push("Core Service Grid");

      const faq = homePage.sections.find(s => s.type === "faq");
      if (!faq) missing.push("Objection-Blocking FAQ");

      const cta = homePage.sections.find(s => s.type === "cta");
      if (!cta) missing.push("Final Conversion Call");
    }

    if (!(website.seo?.title && website.seo?.description && website.seo?.keywords?.length > 0)) missing.push("SEO Optimization");

    setMissingItems(missing);
  }, [website]);

  useEffect(() => {
    identifyBlueprintGaps();
  }, [identifyBlueprintGaps]);

  const handleAiImprove = async (type: "copy" | "cta" | "trust" | "full") => {
    if (!website) return;
    setImproving(type);
    try {
      const prompt = `You are a world-class conversion copywriting and UX agency. Analyze this website and improve its ${type === "copy" ? "professionalism and vocabulary" : type === "cta" ? "conversion urgency and buttons" : "trust proof and authority"}.
      
      Website Details:
      Name: ${website.seo.title}
      Industry: ${website.seo.keywords[0] || "Services"}
      
      Current Structure: ${JSON.stringify(website.pages[0])}
      
      Return ONLY a JSON object representing the UPDATED Home Page sections only. Do not change IDs. Maintain structure. Focus on extreme premium quality.`;

      // Keep the refinement prompt in the dedicated final argument. The
      // generator signature includes location, tone and business context
      // before customPrompt; passing it as the fourth/fifth argument caused
      // the main AI Improve action to silently discard the user's direction.
      const aiResponse = await generateSectionContent(
        "Home Page Strategy Improvement",
        website.seo.title,
        website.seo.keywords[0] || "Services",
        website.seo.placename || "Online",
        website.theme.style || "Professional",
        website.seo.description || "",
        business.id,
        prompt,
      );
      
      if (aiResponse && aiResponse.sections) {
        const newPages = website.pages.map(p => {
          if (p.slug === "" || p.slug === "home") {
            return {
              ...p,
              sections: mergeGeneratedSections(p.sections || [], aiResponse.sections)
            };
          }
          return p;
        });
        
        setWebsite({ ...website, pages: newPages });
        toast.success("AI rewrite complete. Website copy updated.");
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.response?.data?.details || err.message;
      if (errorMessage === "INSUFFICIENT_CREDITS" || errorMessage?.toLowerCase().includes("credits")) {
        toast.error("You have reached this plan's AI-assisted editing allowance. Send the change as a managed update request or contact support.");
      } else if (errorMessage === "DAILY_LIMIT_EXCEEDED" || errorMessage?.toLowerCase().includes("daily")) {
        toast.info("Today's AI-assisted editing allowance has been reached. Try again tomorrow or send the change as a managed update request.", { duration: 6000 });
      } else {
        toast.error(errorMessage || "AI Improvement failed. Please try again.");
      }
    } finally {
      setImproving(null);
    }
  };

  const {
    register: registerSeo,
    handleSubmit: handleSubmitSeo,
    formState: { errors: seoErrors, isDirty: isSeoDirty },
    reset: resetSeo,
    setValue: setSeoValue,
    watch: watchSeo,
    getValues: getValuesSeo,
  } = useForm<SeoFormData>({
    resolver: zodResolver(seoSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      keywords: "",
      favicon: "",
      ogImage: "",
      canonicalUrl: "",
      region: "",
      placename: "",
      latitude: "",
      longitude: "",
      businessType: "LocalBusiness",
      address: "",
      phone: "",
      priceRange: "$$",
      brandVoice: "Professional",
      targetAudience: "",
      coreValueProposition: "",
      knowledgeBaseSummary: "",
    }
  });

  const fetchData = useCallback(
    async (targetBusinessId?: string) => {
      const activeBusinessId = isTemplateMode ? undefined : targetBusinessId || businessId;

      if (!activeBusinessId && !templateIdOverride) {
        setLoading(false);
        return;
      }

      // Validate businessId format to prevent malformed requests and Postgres error 22P02
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!isTemplateMode && activeBusinessId && activeBusinessId !== "template" && !uuidRegex.test(activeBusinessId)) {
        console.warn("Invalid businessId format in WebsiteEditor:", activeBusinessId);
        setWebsite(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        console.log("WebsiteEditor fetchData context:", isTemplateMode ? templateIdOverride : activeBusinessId);
        
        // 1. Fetch content (Website or Template)
        const fetchContent = async (id: string, attempt = 1): Promise<any> => {
          const res = await (isTemplateMode
            ? templateIdOverride === "new"
              ? Promise.resolve({ data: null, error: null })
              : supabase
                  .from("templates")
                  .select("*")
                  .eq("id", templateIdOverride)
                  .maybeSingle()
            : supabase
                .from("websites")
                .select("*")
                .eq("business_id", id)
                .order("updated_at", { ascending: false })
                .limit(1)
                .maybeSingle());

          // If recently generated but not found, retry (Supabase replication lag or cold starts)
          if (!res.data && !res.error && !isTemplateMode && attempt < 10) {
             console.log(`Website not found (attempt ${attempt}), retrying for business ${id}...`);
             await new Promise(r => setTimeout(r, 1000 * Math.min(attempt, 3)));
             return fetchContent(id, attempt + 1);
          }
          return res;
        };

        const [plansSettingsResult, businessResult, contentResult] =
          await Promise.all([
            supabase
              .from("settings")
              .select("content")
              .eq("id", "plans")
              .maybeSingle(),
            !isTemplateMode && activeBusinessId && activeBusinessId !== "template"
              ? supabase
                  .from("businesses")
                  .select("*")
                  .eq("id", activeBusinessId)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null }),
            isTemplateMode || activeBusinessId ? fetchContent(activeBusinessId || "template") : Promise.resolve({ data: null, error: null })
          ]);

        if (contentResult.error) {
          console.error("Error fetching content:", contentResult.error);
        }

        const planConfigs = normalizePlans(plansSettingsResult.data?.content?.pricing || []);

        // Process Business Data
        if (businessResult.data) {
          setBusiness(businessResult.data);
          const currentPlan = planConfigs.find(
            (p: any) => p.id === businessResult.data.plan,
          );
          setCurrentPlanConfig(currentPlan || null);
          setMaxPages(getPlanPageLimit(businessResult.data.plan, currentPlan?.maxPages));
        }

        // Process Website/Template Content
        if (isTemplateMode) {
          setMaxPages(50);
          if (templateIdOverride === "new") {
            const websiteData: Website = {
              id: generateId(),
              businessId: "template",
              theme: {
                primaryColor: THEME_PRESETS[0].primary,
                secondaryColor: THEME_PRESETS[0].secondary,
                fontFamily: THEME_PRESETS[0].font,
                style: THEME_PRESETS[0].style as any,
                footer: {
                  showMenu: true,
                  showSocials: true,
                  showContact: true,
                  customText: "",
                  contactEmail: "",
                  contactPhone: "",
                  contactAddress: "",
                  socialLinks: [
                    { platform: "facebook", url: "", isVisible: true },
                    { platform: "instagram", url: "", isVisible: true },
                    { platform: "twitter", url: "", isVisible: true },
                    { platform: "linkedin", url: "", isVisible: true },
                    { platform: "youtube", url: "", isVisible: true },
                  ],
                },
              },
              pages: [
                { id: generateId(), title: "Home", slug: "", sections: [] },
              ],
              seo: {
                title: "New Template",
                description: "A professional website template.",
                keywords: ["template", "business"],
                businessType: "LocalBusiness",
              },
              status: "published",
              updatedAt: Date.now(),
            };
            const safeWebsiteData = sanitizeWebsite(websiteData);
            setWebsite(safeWebsiteData);
            setActivePageId(safeWebsiteData.pages[0].id);
            setTemplate({ name: "New Template", category: "General" });
            resetSeo({
              title: safeWebsiteData.seo.title,
              description: safeWebsiteData.seo.description,
              keywords: safeWebsiteData.seo.keywords.join(", "),
              favicon: "",
              ogImage: "",
              canonicalUrl: "",
              businessType: "LocalBusiness",
              priceRange: "$$",
              brandVoice: "Professional",
              targetAudience: "",
              coreValueProposition: "",
              knowledgeBaseSummary: "",
            });
          } else if (contentResult.data) {
            const data = contentResult.data;
            setTemplate(data);
            const websiteData: Website = {
              id: data.id,
              businessId: "template",
              theme: data.config?.theme || fallbackTheme,
              pages: data.config?.pages || [],
              seo: data.config?.seo || {},
              status: "published",
              updatedAt: new Date(data.created_at).getTime(),
            };
            const safeWebsiteData = sanitizeWebsite(websiteData);
            setWebsite(safeWebsiteData);
            setActivePageId(safeWebsiteData.pages[0].id);
            resetSeo({
              title: safeWebsiteData.seo.title,
              description: safeWebsiteData.seo.description,
              keywords: safeWebsiteData.seo.keywords.join(", "),
              favicon: safeWebsiteData.seo.favicon || "",
              ogImage: safeWebsiteData.seo.ogImage || "",
              canonicalUrl: safeWebsiteData.seo.canonicalUrl || "",
              region: safeWebsiteData.seo.region || "",
              placename: safeWebsiteData.seo.placename || "",
              latitude: safeWebsiteData.seo.latitude || "",
              longitude: safeWebsiteData.seo.longitude || "",
              businessType: safeWebsiteData.seo.businessType || "LocalBusiness",
              address: safeWebsiteData.seo.address || "",
              phone: safeWebsiteData.seo.phone || "",
              priceRange: safeWebsiteData.seo.priceRange || "$$",
              brandVoice: safeWebsiteData.seo.brandVoice || "Professional",
              targetAudience: safeWebsiteData.seo.targetAudience || "",
              coreValueProposition: safeWebsiteData.seo.coreValueProposition || "",
              knowledgeBaseSummary: safeWebsiteData.seo.knowledgeBaseSummary || "",
            });
          }
        } else {
        if (contentResult.data) {
          const websiteData = mapWebsite(contentResult.data);
          console.log("WebsiteEditor successfully fetched website:", websiteData.id);
          setWebsite(websiteData);
          setActivePageId(websiteData.pages[0].id);
          resetSeo({
            title: websiteData.seo.title,
            description: websiteData.seo.description,
            keywords: websiteData.seo.keywords.join(", "),
            favicon: websiteData.seo.favicon || "",
            ogImage: websiteData.seo.ogImage || "",
            canonicalUrl: websiteData.seo.canonicalUrl || "",
            region: websiteData.seo.region || "",
            placename: websiteData.seo.placename || "",
            latitude: websiteData.seo.latitude || "",
            longitude: websiteData.seo.longitude || "",
            businessType: websiteData.seo.businessType || "LocalBusiness",
            address: websiteData.seo.address || "",
            phone: websiteData.seo.phone || "",
            priceRange: websiteData.seo.priceRange || "$$",
            brandVoice: websiteData.seo.brandVoice || "Professional",
            targetAudience: websiteData.seo.targetAudience || "",
            coreValueProposition: websiteData.seo.coreValueProposition || "",
            knowledgeBaseSummary: websiteData.seo.knowledgeBaseSummary || "",
          });
        } else {
          console.warn("WebsiteEditor: No website data found for business:", activeBusinessId);
          setWebsite(null);
        }
        }
      } catch (err: any) {
      console.error("WebsiteEditor fetchData error:", err);
      setWebsite(null);
    } finally {
      setLoading(false);
    }
  }, [businessId, isTemplateMode, templateIdOverride, resetSeo]);

  useEffect(() => {
    fetchData();

    if (forceShowGenerator) {
      setShowGenerator(true);
    }

    const fetchDesignConfig = async () => {
      const { data } = await supabase
        .from("settings")
        .select("*")
        .eq("id", "archetype_config")
        .maybeSingle();

      if (data) {
        setEnabledStyles(data.content.enabledStyles || []);
        setEnabledThemes(data.content.enabledThemes || []);
      }
    };
    fetchDesignConfig();

    if (businessId && !isTemplateMode) {
      const channel = supabase
        .channel(`website-editor-${Math.random()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "websites",
            filter: `business_id=eq.${businessId}`,
          },
          () => {
            if (!isDeleting) {
              fetchData();
            }
          },
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [businessId, isTemplateMode, fetchData, isDeleting]);

  useEffect(() => {
    const shouldShowGenerator =
      Boolean(forceShowGenerator) || location.pathname.includes("/regenerate");
    setShowGenerator(shouldShowGenerator);
  }, [forceShowGenerator, location.pathname]);

  const handleSmartBuild = async () => {
    if (!website || !business) return;

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      const interval = setInterval(() => {
        setGenerationProgress((prev) => Math.min(prev + 5, 90));
      }, 500);

      // We use current page structure as a hint
      const sectionTypes = website.pages[0]?.sections.map((s) => s.type) || [
        "Hero",
        "Services",
        "CTA",
      ];

      const result = await generateWebsiteContent(
        business.name,
        business.industry || "General",
        business.address || "Global",
        website.seo?.brandVoice || "Professional",
        website.theme?.style || "modern",
        website.seo?.description || business.description || "",
        website.businessId,
        sectionTypes,
      );

      clearInterval(interval);
      setGenerationProgress(100);

      if (result && (result.pages || result.sections)) {
        let finalPages = sanitizePages(website.pages);

        if (result.pages && Array.isArray(result.pages)) {
          const generatedPages = result.pages.filter(
            (page: any) => page && typeof page === "object",
          );

          if (generatedPages.length === 0) {
            throw new Error("System returned pages without usable content");
          }

          finalPages = generatedPages.map((p: any, pageIndex: number) => {
            const existingPage = website.pages[pageIndex] || website.pages[0];
            const mergedSections = mergeGeneratedSections(
              existingPage?.sections || [],
              Array.isArray(p.sections) ? p.sections : [],
            );

            return {
              ...(existingPage || {}),
              ...p,
              id: existingPage?.id || p.id || generateId(),
              title: p.title || existingPage?.title || (pageIndex === 0 ? "Home" : `Page ${pageIndex + 1}`),
              slug: pageIndex === 0 ? (existingPage?.slug || "") : (p.slug || existingPage?.slug || `page-${pageIndex + 1}`),
              sections: mergedSections.length > 0 ? mergedSections : existingPage?.sections || [],
              seo: {
                ...(existingPage?.seo || {}),
                ...(p.seo && typeof p.seo === "object" ? p.seo : {}),
              },
            } as WebsitePage;
          });
        } else if (result.sections && Array.isArray(result.sections)) {
          finalPages = website.pages.map((p: any, idx: number) => {
            if (idx === 0) {
              return {
                ...p,
                sections: mergeGeneratedSections(p.sections || [], result.sections),
              };
            }
            return p;
          });
        }

        finalPages = sanitizePages(finalPages);
        if (!finalPages[0]?.sections?.length) {
          throw new Error("Smart refinement produced no usable sections, so the existing site was kept.");
        }

        const { error: updateErr } = await supabase
          .from("websites")
          .update({
            pages: finalPages,
            seo: result.seo || website.seo || {},
          })
          .eq("id", website.id);

        if (updateErr) throw updateErr;

        toast.success("Website revitalized with smart generation!");
        await fetchData(website.businessId);
      } else {
        throw new Error("System returned empty or invalid structure");
      }
    } catch (err: any) {
      console.error("Smart Build failed:", err);
      const msg = err.message || "";
      if (msg.includes("DAILY_LIMIT_EXCEEDED") || msg.toLowerCase().includes("daily limit")) {
        toast.info("Daily limit reached. Using standard high-performance framework.", { duration: 6000 });
      } else {
        toast.error("Generation failed: " + (msg || "Unknown error"));
      }
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const mapWebsite = (dbWebsite: any): Website => {
    const theme = { ...(dbWebsite.theme || {}) };
    if (!theme.footer) {
      theme.footer = {
        showMenu: true,
        showSocials: true,
        showContact: true,
        customText: "",
        contactEmail:
          dbWebsite.theme?.footer?.contactEmail || "",
        contactPhone:
          dbWebsite.theme?.footer?.contactPhone || "",
        contactAddress:
          dbWebsite.theme?.footer?.contactAddress ||
          "",
        socialLinks: dbWebsite.theme?.footer?.socialLinks || [
          { platform: "facebook", url: "", isVisible: true },
          { platform: "instagram", url: "", isVisible: true },
          { platform: "twitter", url: "", isVisible: true },
          { platform: "linkedin", url: "", isVisible: true },
          { platform: "youtube", url: "", isVisible: true },
        ],
      };
    }

    return sanitizeWebsite({
      id: dbWebsite.id,
      businessId: dbWebsite.business_id,
      theme: theme,
      pages: sanitizePages(dbWebsite.pages),
      seo: {
        title: dbWebsite.seo?.title || "",
        description: dbWebsite.seo?.description || "",
        keywords: Array.isArray(dbWebsite.seo?.keywords) ? dbWebsite.seo.keywords : [],
        favicon: dbWebsite.seo?.favicon || "",
        ogImage: dbWebsite.seo?.ogImage || "",
        canonicalUrl: dbWebsite.seo?.canonicalUrl || "",
        region: dbWebsite.seo?.region || "",
        placename: dbWebsite.seo?.placename || "",
        latitude: dbWebsite.seo?.latitude || "",
        longitude: dbWebsite.seo?.longitude || "",
        businessType: dbWebsite.seo?.businessType || "LocalBusiness",
        address: dbWebsite.seo?.address || "",
        phone: dbWebsite.seo?.phone || "",
        priceRange: dbWebsite.seo?.priceRange || "$$",
        brandVoice: dbWebsite.seo?.brandVoice || "Professional",
        targetAudience: dbWebsite.seo?.targetAudience || "",
        coreValueProposition: dbWebsite.seo?.coreValueProposition || "",
        knowledgeBaseSummary: dbWebsite.seo?.knowledgeBaseSummary || "",
      },
      status: dbWebsite.status,
      updatedAt: dbWebsite.updated_at ? new Date(dbWebsite.updated_at).getTime() : Date.now(),
    });
  };

  const snapshotSavedWebsiteVersion = async (websiteId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const response = await fetch(`/api/admin/websites/${websiteId}/revisions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Version history could not be saved.");
      if (Array.isArray(payload.revisions)) setWebsiteRevisions(payload.revisions);
    } catch (error) {
      console.warn("Website version history could not be saved:", error);
    }
  };

  const restoreWebsiteRevision = (revision: WebsiteContentRevision) => {
    if (!website) return;
    const currentSeo = website.seo;
    const preservedOperationalSeo = {
      workflowStatus: currentSeo.workflowStatus,
      deliveryStandardVersion: currentSeo.deliveryStandardVersion,
      deliveryQuality: currentSeo.deliveryQuality,
      launchGate: currentSeo.launchGate,
      publishedVersion: currentSeo.publishedVersion,
      releaseHistory: currentSeo.releaseHistory,
    };
    setWebsite(sanitizeWebsite({
      ...website,
      theme: revision.content.theme,
      pages: revision.content.pages,
      seo: { ...currentSeo, ...revision.content.seo, ...preservedOperationalSeo },
      updatedAt: Date.now(),
    }));
    setShowRevisionHistory(false);
    toast.success("Previous site content loaded into the editor. Preview it before saving.");
  };

  const handleSave = async (data?: any) => {
    if (!website) return;
    if (website.status === "published" && !isInternalOperator) {
      toast.info("Live website changes are handled through the managed update workflow so production stays protected.");
      navigate("/dashboard/update-requests");
      return;
    }
    setSaving(true);
    try {
      const isWebsiteObject = data && data.pages && data.theme && data.seo;
      const targetWebsite = normalizeWebsiteForPreview(isWebsiteObject ? data : website);
      const nextButtonAudit = auditWebsiteButtons(targetWebsite);
      const nextSeo: Website["seo"] = {
        ...targetWebsite.seo,
        buttonHealth: {
          total: nextButtonAudit.length,
          working: nextButtonAudit.filter((button) => button.status === "working").length,
          broken: nextButtonAudit.filter((button) => button.status !== "working").length,
          critical: nextButtonAudit.filter((button) => button.critical && button.status !== "working").length,
          criticalBroken: nextButtonAudit.filter((button) => button.critical && button.status !== "working").length,
          checkedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      const updatedWebsiteConfig: any = {
        theme: targetWebsite.theme,
        pages: targetWebsite.pages,
        seo: nextSeo,
        status: targetWebsite.status,
        updated_at: new Date().toISOString(),
      };

      // If it's SEO form data
      if (data && activeTab === "seo" && !isWebsiteObject) {
        const seoData = {
          title: data.title,
          description: data.description,
          keywords: data.keywords.split(",").map((k: string) => k.trim()),
          favicon: data.favicon || "",
          ogImage: data.ogImage || "",
          canonicalUrl: data.canonicalUrl || "",
          region: data.region || "",
          placename: data.placename || "",
          latitude: data.latitude || "",
          longitude: data.longitude || "",
          businessType: data.businessType || "LocalBusiness",
          address: data.address || "",
          phone: data.phone || "",
          priceRange: data.priceRange || "$$",
          brandVoice: data.brandVoice || "Professional",
          targetAudience: data.targetAudience || "",
          coreValueProposition: data.coreValueProposition || "",
          knowledgeBaseSummary: data.knowledgeBaseSummary || "",
          workflowStatus: website.seo.workflowStatus || workflowStatus,
        };
        updatedWebsiteConfig.seo = seoData;
        if (isTemplateMode) {
          website.seo = seoData; // Update local state for consistency
        }
      }

      if (isTemplateMode) {
        const templateData = {
          name: template?.name || "New Template",
          category: template?.category || "General",
          description:
            template?.description || updatedWebsiteConfig.seo.description,
          thumbnail:
            template?.thumbnail ||
            "/brand-template-preview.svg",
          config: {
            theme: updatedWebsiteConfig.theme,
            pages: updatedWebsiteConfig.pages,
            seo: updatedWebsiteConfig.seo,
          },
          is_premium: template?.is_premium || false,
        };

        if (templateIdOverride === "new") {
          let { data: newTemplate, error } = await supabase
            .from("templates")
            .insert([templateData])
            .select()
            .single();

          if (error && isMissingTemplateColumnError(error)) {
            const { data: retryTemplate, error: retryError } = await supabase
              .from("templates")
              .insert([stripTemplatePayloadFallbackFields(templateData)])
              .select()
              .single();
            newTemplate = retryTemplate;
            error = retryError;
          }

          if (error) throw error;
          toast.success("Template created successfully!");
          if (newTemplate?.id) {
            onTemplateCreated?.(newTemplate.id);
          }
        } else {
          let { error } = await supabase
            .from("templates")
            .update(templateData)
            .eq("id", templateIdOverride);

          if (error && isMissingTemplateColumnError(error)) {
            const { error: retryError } = await supabase
              .from("templates")
              .update(stripTemplatePayloadFallbackFields(templateData))
              .eq("id", templateIdOverride);
            error = retryError;
          }

          if (error) throw error;
          toast.success("Template saved successfully!");
        }
      } else {
        await snapshotSavedWebsiteVersion(website.id);
        const websitePromise = supabase
          .from("websites")
          .update(updatedWebsiteConfig)
          .eq("id", website.id);

        // Also update business tracking settings if in tracking tab
        let businessPromise: Promise<any> = Promise.resolve({ error: null });
        if (activeTab === "tracking" && business) {
          businessPromise = supabase
            .from("businesses")
            .update({
              ga_measurement_id: business.ga_measurement_id,
              meta_pixel_id: business.meta_pixel_id,
              tracking_scripts_header: business.tracking_scripts_header,
              tracking_scripts_footer: business.tracking_scripts_footer,
            })
            .eq("id", business.id) as any;
        }

        const [websiteRes, businessRes] = await Promise.all([
          websitePromise,
          businessPromise,
        ]);

        if (websiteRes.error) throw websiteRes.error;
        if (businessRes.error) throw businessRes.error;

        const savedWebsite = sanitizeWebsite({
          ...targetWebsite,
          seo: updatedWebsiteConfig.seo,
          status: updatedWebsiteConfig.status,
          updatedAt: new Date(updatedWebsiteConfig.updated_at).getTime(),
        });
        setWebsite(savedWebsite);

        toast.success("Settings saved successfully!");
      }
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save website");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!website) return;
    if (!isInternalOperator) {
      await handleUpdateWorkflowStatus("in_review");
      toast.info("Submitted for Bennie Studio review. An internal operator must approve launch.");
      setShowPublishConfirm(false);
      return;
    }
    if (!launchGate?.ready) {
      toast.error(launchGate?.blockers?.[0] || "Complete the launch-readiness checks before publishing.");
      setShowPublishConfirm(false);
      return;
    }
    setSaving(true);
    setShowPublishConfirm(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your session expired. Sign in again before publishing.");
      const preflightResponse = await fetch(`/api/admin/businesses/${encodeURIComponent(businessId)}/launch-readiness?preflight=true`, {
        headers: { Authorization: `Bearer ${session.access_token}`, "Cache-Control": "no-store" },
        cache: "no-store",
      });
      const preflight = await preflightResponse.json().catch(() => ({}));
      if (!preflightResponse.ok) throw new Error(preflight.error || "Launch checks could not be completed.");
      if (!preflight.ready) {
        throw new Error(preflight.blockers?.[0]?.label || "Resolve all launch-readiness blockers before publishing.");
      }
      await snapshotSavedWebsiteVersion(website.id);
      const releaseRecord = {
        id: `release_${Date.now()}`,
        publishedAt: new Date().toISOString(),
        standardVersion: DELIVERY_STANDARD_VERSION,
      };
      const nextSeo: Website["seo"] = {
        ...website.seo,
        workflowStatus: "live",
        deliveryStandardVersion: DELIVERY_STANDARD_VERSION,
        deliveryQuality: {
          ...(website.seo?.deliveryQuality || {}),
          customerApprovalRecorded:
            customerApprovalRecorded || Boolean(deliveryQuality.customerApprovalRecorded),
          lastLaunchApprovedAt: new Date().toISOString(),
        },
        launchGate: launchGate,
        publishedVersion: releaseRecord,
        releaseHistory: [
          ...((Array.isArray(website.seo?.releaseHistory) ? website.seo.releaseHistory : []).slice(-9)),
          releaseRecord,
        ],
      };
      const { error } = await supabase
        .from("websites")
        .update({
          status: "published",
          seo: nextSeo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", website.id);
      if (error) throw error;
      setWebsite({ ...website, status: "published", seo: nextSeo });
      toast.success("Website passed launch readiness and is now live.");
    } catch (error) {
      console.error("Publish failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to publish website");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (newStatus: "published" | "draft") => {
    if (!website) return;
    if (newStatus === "draft" && website.status === "published" && !isInternalOperator) {
      toast.error("Live managed websites can only be unpublished by the Bennie Studio delivery team.");
      return;
    }
    if (newStatus === "published") {
      if (!isInternalOperator) {
        await handleUpdateWorkflowStatus("in_review");
        toast.info("Submitted for internal review instead of publishing directly.");
        return;
      }
      if (!launchGate?.ready) {
        toast.error(launchGate?.blockers?.[0] || "Complete launch readiness before publishing.");
        return;
      }
    }
    setSaving(true);
    try {
      if (newStatus === "published") await snapshotSavedWebsiteVersion(website.id);
      const nextWorkflowStatus: WebsiteWorkflowStatus = newStatus === "published" ? "live" : "draft";
      const releaseRecord = newStatus === "published"
        ? { id: `release_${Date.now()}`, publishedAt: new Date().toISOString(), standardVersion: DELIVERY_STANDARD_VERSION }
        : null;
      const nextSeo: Website["seo"] = {
        ...website.seo,
        workflowStatus: nextWorkflowStatus,
        deliveryStandardVersion: DELIVERY_STANDARD_VERSION,
        deliveryQuality: {
          ...(website.seo?.deliveryQuality || {}),
          ...(newStatus === "published"
            ? {
                customerApprovalRecorded:
                  customerApprovalRecorded || Boolean(deliveryQuality.customerApprovalRecorded),
                lastLaunchApprovedAt: new Date().toISOString(),
              }
            : {}),
        },
        ...(newStatus === "published"
          ? {
              launchGate,
              publishedVersion: releaseRecord,
              releaseHistory: [
                ...((Array.isArray(website.seo?.releaseHistory) ? website.seo.releaseHistory : []).slice(-9)),
                releaseRecord,
              ],
            }
          : {}),
      };
      const { error } = await supabase
        .from("websites")
        .update({ status: newStatus, seo: nextSeo, updated_at: new Date().toISOString() })
        .eq("id", website.id);
      if (error) throw error;
      setWebsite({ ...website, status: newStatus, seo: nextSeo });
      toast.success(`Website status updated to ${newStatus}`);
    } catch (error) {
      console.error("Status update failed:", error);
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateWorkflowStatus = async (newStatus: WebsiteWorkflowStatus) => {
    if (!website) return;
    if (website.status === "published" && newStatus !== "live" && !isInternalOperator) {
      toast.error("The delivery team manages workflow changes for a live website.");
      return;
    }
    if ((newStatus === "ready_to_launch" || newStatus === "live") && !isInternalOperator) {
      toast.error("Only the Bennie Studio delivery team can approve a site for launch.");
      return;
    }
    if (newStatus === "live" && !launchGate?.ready) {
      toast.error(launchGate?.blockers?.[0] || "Complete launch readiness before moving this site live.");
      return;
    }
    setSaving(true);
    try {
      if (newStatus === "live") await snapshotSavedWebsiteVersion(website.id);
      const publishStatus = newStatus === "live" ? "published" : "draft";
      const releaseRecord = newStatus === "live"
        ? { id: `release_${Date.now()}`, publishedAt: new Date().toISOString(), standardVersion: DELIVERY_STANDARD_VERSION }
        : null;
      const nextSeo = {
        ...website.seo,
        workflowStatus: newStatus,
        deliveryStandardVersion: DELIVERY_STANDARD_VERSION,
        deliveryQuality: {
          ...(website.seo?.deliveryQuality || {}),
          ...(newStatus === "live"
            ? {
                customerApprovalRecorded:
                  customerApprovalRecorded || Boolean(deliveryQuality.customerApprovalRecorded),
                lastLaunchApprovedAt: new Date().toISOString(),
              }
            : {}),
        },
        ...(newStatus === "live"
          ? {
              launchGate,
              publishedVersion: releaseRecord,
              releaseHistory: [
                ...((Array.isArray(website.seo?.releaseHistory) ? website.seo.releaseHistory : []).slice(-9)),
                releaseRecord,
              ],
            }
          : {}),
      };
      const { error } = await supabase
        .from("websites")
        .update({ status: publishStatus, seo: nextSeo, updated_at: new Date().toISOString() })
        .eq("id", website.id);
      if (error) throw error;
      setWebsite({ ...website, status: publishStatus, seo: nextSeo });
      toast.success(`Website moved to ${getWorkflowLabel(newStatus)}`);
    } catch (error) {
      console.error("Workflow status update failed:", error);
      toast.error("Failed to update workflow status");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWebsite = async () => {
    if (!website) return;
    if (!isInternalOperator) {
      toast.error("Managed websites can only be deleted by the Bennie Studio delivery team.");
      setShowDeleteConfirm(false);
      return;
    }
    setIsDeleting(true);
    setSaving(true);
    try {
      const { error } = await supabase
        .from("websites")
        .delete()
        .eq("id", website.id);

      if (error) throw error;
      toast.success("Website deleted successfully");
      navigate(isInternalOperator ? "/admin/businesses" : "/dashboard", { replace: true });
    } catch (err: any) {
      console.error("Delete failed:", err);
      toast.error(err.message || "Failed to delete website");
      setIsDeleting(false);
      setSaving(false);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const updateSectionContent = (
    pageId: string,
    sectionId: string,
    newContent: any,
  ) => {
    if (!website) return;
    const newPages = website.pages.map((page) => {
      if (page.id === pageId) {
        return {
          ...page,
          sections: page.sections.map((section) => {
            if (section.id === sectionId) {
              return {
                ...section,
                content: { ...section.content, ...newContent },
              };
            }
            return section;
          }),
        };
      }
      return page;
    });
    setWebsite({ ...website, pages: newPages });
  };

  const generateAISectionContent = async (
    pageId: string,
    sectionId: string,
    sectionType: string,
  ) => {
    if (!website) return;
    setIsGeneratingSection(true);
    try {
      const currentPage = website.pages.find((page) => page.id === pageId);
      const currentSection = currentPage?.sections.find(
        (section) => section.id === sectionId,
      );
      const existingContent = currentSection?.content || {};
      const guidedPrompt = [
        "Rewrite and improve the copy for this exact website section.",
        "Return JSON only in the shape { \"content\": { ... } }.",
        "Preserve the existing content keys and structure unless a key is empty.",
        "Do not invent fake testimonials, fake reviews, fake addresses, or fake local proof.",
        "Keep CTA/link fields usable and customer-facing.",
        `Existing section content: ${JSON.stringify(existingContent)}`,
        customPrompt ? `User refinement: ${customPrompt}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      const result = await generateSectionContent(
        sectionType,
        business?.name || website.seo?.title || "Business",
        business?.industry || website.seo?.keywords?.[0] || "General",
        website.seo?.placename || business?.city || "Online",
        website.seo?.brandVoice || "Professional",
        business?.description || website.seo?.description,
        business?.id,
        guidedPrompt,
      );

      if (result && result.content) {
        // Update the section content
        const newPages = website.pages.map((page) => {
          if (page.id === pageId) {
            return {
              ...page,
              sections: page.sections.map((section) => {
                if (section.id === sectionId) {
                  return {
                    ...section,
                    content: { ...section.content, ...result.content },
                  };
                }
                return section;
              }),
            };
          }
          return page;
        });

        setWebsite({ ...website, pages: newPages });
        toast.success("AI content generated successfully!");
        setShowAiEditor(false);
        setCustomPrompt("");
      }
    } catch (error: any) {
      console.error("AI Generation failed:", error);
      toast.error(error.message || "Failed to generate AI content");
    } finally {
      setIsGeneratingSection(false);
    }
  };

  const updateSectionSettings = (
    pageId: string,
    sectionId: string,
    newSettings: any,
  ) => {
    if (!website) return;
    const newPages = website.pages.map((page) => {
      if (page.id === pageId) {
        return {
          ...page,
          sections: page.sections.map((section) => {
            if (section.id === sectionId) {
              return {
                ...section,
                settings: { ...section.settings, ...newSettings },
              };
            }
            return section;
          }),
        };
      }
      return page;
    });
    setWebsite({ ...website, pages: newPages });
  };

  const updateSectionSeo = (pageId: string, sectionId: string, newSeo: any) => {
    if (!website) return;
    const newPages = website.pages.map((page) => {
      if (page.id === pageId) {
        return {
          ...page,
          sections: page.sections.map((section) => {
            if (section.id === sectionId) {
              return { ...section, seo: { ...section.seo, ...newSeo } };
            }
            return section;
          }),
        };
      }
      return page;
    });
    setWebsite({ ...website, pages: newPages });
  };

  const updatePageSeo = (pageId: string, newSeo: any) => {
    if (!website) return;
    const newPages = website.pages.map((page) => {
      if (page.id === pageId) {
        return { ...page, seo: { ...page.seo, ...newSeo } };
      }
      return page;
    });
    setWebsite({ ...website, pages: newPages });
  };

  const updatePageTitle = (pageId: string, newTitle: string) => {
    if (!website) return;
    const newPages = website.pages.map((page) => {
      if (page.id === pageId) {
        return { ...page, title: newTitle };
      }
      return page;
    });
    setWebsite({ ...website, pages: newPages });
  };

  const updatePageSlug = (pageId: string, newSlug: string) => {
    if (!website) return;
    const newPages = website.pages.map((page) => {
      if (page.id === pageId) {
        // Prevent changing home page slug
        if (page.slug === "") return page;
        return {
          ...page,
          slug: newSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        };
      }
      return page;
    });
    setWebsite({ ...website, pages: newPages });
  };

  const movePage = (pageId: string, direction: "up" | "down") => {
    if (!website) return;
    const index = website.pages.findIndex((p) => p.id === pageId);
    if (index === -1) return;

    // Safety check: prevent moving out of bounds
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === website.pages.length - 1) return;

    const newPages = [...website.pages];
    const newIndex = direction === "up" ? index - 1 : index + 1;

    [newPages[index], newPages[newIndex]] = [
      newPages[newIndex],
      newPages[index],
    ];
    setWebsite({ ...website, pages: newPages });
  };

  const moveSection = (
    pageId: string,
    sectionId: string,
    direction: "up" | "down",
  ) => {
    if (!website) return;
    const newPages = website.pages.map((page) => {
      if (page.id === pageId) {
        const index = page.sections.findIndex((s) => s.id === sectionId);
        if (index === -1) return page;

        const newSections = [...page.sections];
        const newIndex = direction === "up" ? index - 1 : index + 1;

        if (newIndex >= 0 && newIndex < newSections.length) {
          [newSections[index], newSections[newIndex]] = [
            newSections[newIndex],
            newSections[index],
          ];
        }

        return { ...page, sections: newSections };
      }
      return page;
    });
    setWebsite({ ...website, pages: newPages });
  };

  const [draggingSection, setDraggingSection] = useState<{
    pageId: string;
    index: number;
  } | null>(null);

  const handleDragStart = (pageId: string, index: number) => {
    setDraggingSection({ pageId, index });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropSection = (targetPageId: string, targetIndex: number) => {
    if (!draggingSection || !website) return;
    if (draggingSection.pageId !== targetPageId) return; // Only reorder within same page

    const sourceIndex = draggingSection.index;
    if (sourceIndex === targetIndex) return;

    const newPages = website.pages.map((page) => {
      if (page.id === targetPageId) {
        const newSections = [...page.sections];
        const [moved] = newSections.splice(sourceIndex, 1);
        newSections.splice(targetIndex, 0, moved);
        return { ...page, sections: newSections };
      }
      return page;
    });

    setWebsite({ ...website, pages: newPages });
    setDraggingSection(null);
  };

  const toggleSectionVisibility = (pageId: string, sectionId: string) => {
    if (!website) return;
    const newPages = website.pages.map((page) => {
      if (page.id === pageId) {
        return {
          ...page,
          sections: page.sections.map((section) => {
            if (section.id === sectionId) {
              return {
                ...section,
                isVisible: section.isVisible === false ? true : false,
              };
            }
            return section;
          }),
        };
      }
      return page;
    });
    setWebsite({ ...website, pages: newPages });
  };

  const removeSection = (pageId: string, sectionId: string) => {
    if (!website) return;
    const newPages = website.pages.map((page) => {
      if (page.id === pageId) {
        return {
          ...page,
          sections: page.sections.filter((s) => s.id !== sectionId),
        };
      }
      return page;
    });
    setWebsite({ ...website, pages: newPages });
  };

  const duplicateSection = (pageId: string, sectionId: string) => {
    if (!website) return;
    const newPages = website.pages.map((page) => {
      if (page.id === pageId) {
        const sectionIndex = page.sections.findIndex((s) => s.id === sectionId);
        if (sectionIndex === -1) return page;

        const sectionToDuplicate = page.sections[sectionIndex];
        const duplicatedSection = JSON.parse(
          JSON.stringify({
            ...sectionToDuplicate,
            id: generateId(),
          }),
        );

        const newSections = [...page.sections];
        newSections.splice(sectionIndex + 1, 0, duplicatedSection);

        return {
          ...page,
          sections: newSections,
        };
      }
      return page;
    });
    setWebsite({ ...website, pages: newPages });
  };

  const showPageLimitToast = () => {
    const planId = (business?.plan || "starter") as WebsitePlanId;
    toast.error(createPlanLimitUpgradeMessage(planId), {
      description: currentPlanConfig?.upgradePrompt || getPlanUpgradeValue(planId, maxPages),
      duration: 7000,
    });
  };

  const addStandardPage = (
    type:
      | "blog"
      | "privacy"
      | "terms"
      | "about"
      | "contact"
      | "services"
      | "pricing"
      | "faq"
      | "shop",
  ) => {
    if (!website) return;

    if (website.pages.length >= maxPages) {
      showPageLimitToast();
      return;
    }

    const pageConfigs = {
      blog: { title: "Blog", slug: "blog", sectionType: "blog_list" },
      privacy: {
        title: "Privacy Policy",
        slug: "privacy-policy",
        sectionType: "text_content",
      },
      terms: {
        title: "Terms of Service",
        slug: "terms-of-service",
        sectionType: "text_content",
      },
      about: { title: "About Us", slug: "about", sectionType: "about" },
      contact: { title: "Contact", slug: "contact", sectionType: "contact" },
      services: {
        title: "Services",
        slug: "services",
        sectionType: "services",
      },
      pricing: { title: "Pricing", slug: "pricing", sectionType: "pricing" },
      faq: { title: "FAQ", slug: "faq", sectionType: "faq" },
      shop: { title: "Shop", slug: "shop", sectionType: "product_list" },
    };

    const config = pageConfigs[type];
    if (website.pages.some((p) => p.slug === config.slug)) {
      toast.error(`${config.title} page already exists`);
      return;
    }

    // Create optimized sections based on page type
    const sections: WebsiteSection[] = [];

    // 1. Hero Section (Common for all)
    const heroSection = createSectionFromTemplate("hero");
    heroSection.content.headline = config.title;
    heroSection.content.subheadline = `Learn more about our ${config.title.toLowerCase()} and how we can help you achieve your goals.`;
    sections.push(heroSection);

    // 2. Page Specific Sections
    if (type === "about") {
      const story = createSectionFromTemplate("about");
      story.content.text = `## Our Story\n\nAdd the verified story, experience, and differentiators for this business here. Replace this draft with customer-approved facts before publishing.`;

      const vision = createSectionFromTemplate("vision");
      const team = createSectionFromTemplate("team");
      const cta = createSectionFromTemplate("cta");
      cta.content.title = "Want to learn more about our mission?";

      sections.push(story, vision, team, cta);
    } else if (type === "services") {
      const servicesList = createSectionFromTemplate("services");
      const howItWorks = createSectionFromTemplate("how_it_works");
      const benefits = createSectionFromTemplate("benefits");
      const cta = createSectionFromTemplate("cta");
      cta.content.title = "Ready to experience these services?";

      sections.push(servicesList, howItWorks, benefits, cta);
    } else if (type === "pricing") {
      const pricing = createSectionFromTemplate("pricing");
      const comparison = createSectionFromTemplate("comparison");
      const faq = createSectionFromTemplate("faq");
      faq.content.title = "Pricing Questions";
      const cta = createSectionFromTemplate("cta");

      sections.push(pricing, comparison, faq, cta);
    } else if (type === "contact") {
      const contact = createSectionFromTemplate("contact");
      const faq = createSectionFromTemplate("faq");
      faq.content.title = "Common Questions";

      sections.push(contact, faq);
    } else if (type === "faq") {
      const faq = createSectionFromTemplate("faq");
      const cta = createSectionFromTemplate("cta");
      cta.content.title = "Still have questions?";
      cta.content.buttonText = "Contact Support";

      sections.push(faq, cta);
    } else if (type === "blog") {
      sections.push(createSectionFromTemplate("blog_list"));
    } else if (type === "shop") {
      const shopHero = createSectionFromTemplate("hero");
      shopHero.content.headline = "The Professional Collection";
      shopHero.content.subheadline =
        "Experience excellence in every detail with our curated selection of premium offerings.";

      const productList = createSectionFromTemplate("products");
      const benefits = createSectionFromTemplate("benefits");
      benefits.content = benefits.content || {};
      benefits.content.title = "Why Shop With Us?";

      const cta = createSectionFromTemplate("cta");
      cta.content.title = "Can't find what you're looking for?";
      cta.content.buttonText = "Contact Support";

      sections.push(shopHero, productList, benefits, cta);
    } else if (type === "privacy" || type === "terms") {
      const doc = createSectionFromTemplate("text_content");
      if (type === "privacy") {
        doc.content.title = "Privacy Policy";
        doc.content.body = `# Privacy Policy\n\n**Last Updated: ${new Date().toLocaleDateString()}**\n\nYour privacy is important to us. This policy explains how we collect, use, and protect your information.`;
      } else {
        doc.content.title = "Terms of Service";
        doc.content.body = `# Terms of Service\n\n**Last Updated: ${new Date().toLocaleDateString()}**\n\nBy accessing our website, you agree to be bound by these terms. Please read them carefully.`;
      }
      sections.push(doc);
    }

    const newPage: WebsitePage = {
      id: generateId(),
      title: config.title,
      slug: config.slug,
      sections: sections,
    };

    setWebsite({ ...website, pages: [...website.pages, newPage] });
    setActivePageId(newPage.id);
    toast.success(`${config.title} page added`);
  };

  const handleAddPage = async () => {
    if (!website) return;
    if (website.pages.length >= maxPages) {
      showPageLimitToast();
      return;
    }

    if (!newPageData.title.trim()) {
      toast.error("Page title is required");
      return;
    }

    setIsGeneratingPage(true);
    const toastId = toast.loading(
      `Generating content for "${newPageData.title}"...`,
    );

    try {
      const industry =
        business?.industry || (website as any).industry || "Business";
      const location = business?.location || (website as any).location || "";
      const businessNature =
        business?.description || (website as any).description || "";
      const tone = (website as any).tone || "Professional";

      const aiPage = await generatePageContent(
        newPageData.title.trim(),
        business?.name || website.seo?.title || "My Business",
        industry,
        location,
        tone,
        businessNature,
        businessId,
      );

      const newPage: WebsitePage = {
        id: generateId(),
        title: aiPage.title || newPageData.title.trim(),
        slug:
          aiPage.slug ||
          newPageData.slug.trim() ||
          newPageData.title.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        seo: aiPage.seo,
        sections: (aiPage.sections || []).map((section: any) => ({
          ...section,
          id: generateId(),
          isVisible: true,
        })),
      };

      setWebsite({ ...website, pages: [...website.pages, newPage] });
      setActivePageId(newPage.id);
      setShowAddPage(false);
      setNewPageData({ title: "", slug: "" });
      toast.success("Page created with AI-powered content!", { id: toastId });
    } catch (error) {
      console.error("AI Page Generation Error:", error);

      // Fallback to manual creation if AI fails
      const slug =
        newPageData.slug.trim() ||
        newPageData.title.toLowerCase().replace(/[^a-z0-9-]/g, "-");

      const heroSection = createSectionFromTemplate("hero");
      heroSection.content.headline = newPageData.title.trim();

      const newPage: WebsitePage = {
        id: generateId(),
        title: newPageData.title.trim(),
        slug: slug,
        sections: [
          heroSection,
          createSectionFromTemplate("about"),
          createSectionFromTemplate("cta"),
        ],
      };

      setWebsite({ ...website, pages: [...website.pages, newPage] });
      setActivePageId(newPage.id);
      setShowAddPage(false);
      setNewPageData({ title: "", slug: "" });
      toast.success("Page created (Fallback mode)", { id: toastId });
    } finally {
      setIsGeneratingPage(false);
    }
  };

  const removePage = (pageId: string) => {
    if (!website) return;
    const page = website.pages.find((p) => p.id === pageId);
    if (page?.slug === "") {
      toast.error("Cannot delete the home page.");
      return;
    }

    const newPages = website.pages.filter((p) => p.id !== pageId);
    const updatedWebsite = { ...website, pages: newPages };
    setWebsite(updatedWebsite);

    if (activePageId === pageId) {
      setActivePageId(newPages[0].id);
    }

    if (activeElement?.pageId === pageId) {
      setActiveElement(null);
    }

    setPageToDelete(null);

    // Auto-save if not in template mode
    if (!isTemplateMode) {
      handleSave(updatedWebsite);
    } else {
      toast.success("Page removed from template.");
    }
  };

  const handleSyncSeoFromBusiness = async () => {
    let targetBusiness = business;

    if (!targetBusiness && profile?.businessId) {
      try {
        const { data, error } = await supabase
          .from("businesses")
          .select("*")
          .eq("id", profile.businessId)
          .maybeSingle();
        
        if (data) {
          targetBusiness = data;
          setBusiness(data);
        }
      } catch (err) {
        console.error("Failed to fetch business for sync:", err);
      }
    }

    if (!targetBusiness || !website) {
      toast.error("Business data or website configuration missing. Please ensure your profile is complete.");
      return;
    }

    const industry = targetBusiness.industry || "";
    // ... rest of sync logic
    const industryLower = industry.toLowerCase();
    let inferredType = "LocalBusiness";
    if (industryLower.includes("restaurant") || industryLower.includes("food")) inferredType = "Restaurant";
    else if (industryLower.includes("medical") || industryLower.includes("health")) inferredType = "MedicalBusiness";
    else if (industryLower.includes("legal") || industryLower.includes("law")) inferredType = "ProfessionalService";
    else if (industryLower.includes("real estate")) inferredType = "RealEstateAgent";
    else if (industryLower.includes("shop") || industryLower.includes("store")) inferredType = "Store";

    const syncData: Partial<SeoFormData> = {
      title: (targetBusiness.name || website.seo.title || "").substring(0, 70),
      description: (targetBusiness.description || website.seo.description || "").substring(0, 160),
      phone: targetBusiness.phone || website.seo.phone || "",
      address: targetBusiness.address || targetBusiness.location || website.seo.address || "",
      placename: targetBusiness.city || website.seo.placename || "",
      region: targetBusiness.state || website.seo.region || "",
      businessType: inferredType,
      keywords: (getValuesSeo("keywords") || targetBusiness.industry || ""),
    };

    resetSeo({
      ...getValuesSeo(),
      ...syncData,
    });

    const updatedSeo = {
      ...website.seo,
      ...syncData,
      keywords: (syncData.keywords || "").split(",").map(k => k.trim()).filter(k => k !== ""),
    };

    setWebsite({
      ...website,
      seo: updatedSeo as any,
    });
    toast.success("SEO settings synchronized with business profile");
  };

  const addWhyChooseUsSection = async (pageId: string) => {
    if (!website) return;

    const homePage = website.pages.find((p) => p.id === pageId);
    if (homePage?.sections.some((s) => s.content?.title === "Why Choose Us?")) {
      toast.error("Features section already exists");
      return;
    }

    const toastId = toast.loading("Generating 'Why Choose Us' section...");
    setIsGeneratingSection(true);

    try {
      const industry =
        business?.industry || (website as any).industry || "Business";
      const location = business?.location || (website as any).location || "";
      const businessNature =
        business?.description || (website as any).description || "";
      const tone = (website as any).tone || "Professional";

      const aiSection = await generateSectionContent(
        "benefits",
        business?.name || website.seo?.title || "My Business",
        industry,
        location,
        tone,
        businessNature,
        businessId,
      );

      const newSection: WebsiteSection = {
        id: generateId(),
        type: "benefits",
        content: aiSection.content,
        isVisible: true,
        settings: {
          backgroundColor: "#f8fafc",
          textColor: "#1e293b",
        },
      };

      const newPages = website.pages.map((page) => {
        if (page.id === pageId) {
          return {
            ...page,
            sections: [...page.sections, newSection],
          };
        }
        return page;
      });

      setWebsite({ ...website, pages: newPages });
      toast.success("Section added with AI content!", { id: toastId });
    } catch (error) {
      console.error("AI Section Generation Error:", error);

      // Fallback
      const newSection: WebsiteSection = {
        id: generateId(),
        type: "benefits",
        content: {
          title: "Why Choose Us?",
          items: [
            {
              title: "Team experience",
              description:
                "Add verified team experience and qualifications here.",
            },
            {
              title: "Service standard",
              description:
                "Describe the specific service standard this business can substantiate.",
            },
            {
              title: "Responsive support",
              description:
                "Add the verified support hours and response expectations here.",
            },
          ],
        },
        isVisible: true,
        settings: {
          backgroundColor: "#f8fafc",
          textColor: "#1e293b",
        },
      };

      const newPages = website.pages.map((page) => {
        if (page.id === pageId) {
          return {
            ...page,
            sections: [...page.sections, newSection],
          };
        }
        return page;
      });

      setWebsite({ ...website, pages: newPages });
      toast.success("Section added (Fallback mode)", { id: toastId });
    } finally {
      setIsGeneratingSection(false);
    }
  };

  const addSection = async (pageId: string, type: string) => {
    if (!website) return;

    const toastId = toast.loading(`Generating ${type} section...`);
    setIsGeneratingSection(true);

    try {
      const industry =
        business?.industry || (website as any).industry || "Business";
      const location = business?.location || (website as any).location || "";
      const businessNature =
        business?.description || (website as any).description || "";
      const tone = (website as any).tone || "Professional";

      const aiSection = await generateSectionContent(
        type,
        business?.name || website.seo?.title || "My Business",
        industry,
        location,
        tone,
        businessNature,
        businessId,
      );

      const newSection: WebsiteSection = {
        ...createSectionFromTemplate(type),
        id: generateId(),
        content: aiSection.content,
      };

      const newPages = website.pages.map((page) => {
        if (page.id === pageId) {
          return {
            ...page,
            sections: [...page.sections, newSection],
          };
        }
        return page;
      });

      setWebsite({ ...website, pages: newPages });
      setShowAddSection(null);
      toast.success(`${type} section added!`, { id: toastId });
    } catch (error) {
      console.error("AI Section Generation Error:", error);

      try {
        const newSection = createSectionFromTemplate(type);

        const newPages = website.pages.map((page) => {
          if (page.id === pageId) {
            return {
              ...page,
              sections: [...page.sections, newSection],
            };
          }
          return page;
        });

        setWebsite({ ...website, pages: newPages });
        setShowAddSection(null);
        toast.success(`${type} section added (Fallback mode)`, { id: toastId });
      } catch (innerError) {
        toast.error("Failed to add section", { id: toastId });
      }
    } finally {
      setIsGeneratingSection(false);
    }
  };

  const getGoogleFontUrl = (...fontFamilies: Array<string | undefined>) => {
    const systemFonts = /^(arial|helvetica|system-ui|ui-sans-serif|sans-serif|geist variable)$/i;
    const names = Array.from(new Set(fontFamilies
      .map((family) => String(family || "").split(",")[0].replace(/[\'\"]/g, "").trim())
      .filter((name) => name && !systemFonts.test(name))));
    if (!names.length) return "";
    const families = names
      .map((name) => `family=${encodeURIComponent(name).replace(/%20/g, "+")}:wght@400;500;600;700;800`)
      .join("&");
    return `https://fonts.googleapis.com/css2?${families}&display=swap`;
  };

  React.useEffect(() => {
    const linkId = "website-editor-selected-fonts";
    const href = getGoogleFontUrl(website?.theme?.fontFamily, website?.theme?.displayFont);
    let link = document.getElementById(linkId) as HTMLLinkElement | null;
    if (!href) {
      link?.remove();
      return;
    }
    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.href !== href) link.href = href;
    return () => link?.remove();
  }, [website?.theme?.fontFamily, website?.theme?.displayFont]);

  const renderSidebar = () => {
    if (!activeElement) return null;

    const page = website?.pages.find((p) => p.id === activeElement.pageId);
    if (!page) return null;

    const section =
      activeElement.type === "section"
        ? page.sections.find((s) => s.id === activeElement.sectionId)
        : null;

    return (
      <…94534 tokens truncated…te-400" />
                          Secondary Color
                        </Label>
                        <div
                          className="h-6 w-12 rounded-full border border-slate-200"
                          style={{
                            backgroundColor: website.theme.secondaryColor,
                          }}
                        />
                      </div>
                      <div className="flex gap-3">
                        <div className="relative group shrink-0">
                          <input
                            type="color"
                            className="h-12 w-12 rounded-xl border border-slate-200 cursor-pointer overflow-hidden p-0 bg-transparent appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
                            value={website.theme.secondaryColor}
                            onChange={(e) =>
                              setWebsite({
                                ...website,
                                theme: {
                                  ...website.theme,
                                  secondaryColor: e.target.value,
                                },
                              })
                            }
                          />
                          <div className="absolute inset-0 rounded-xl pointer-events-none ring-1 ring-inset ring-black/5" />
                        </div>
                        <div className="flex-1 relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                            #
                          </span>
                          <Input
                            className="h-12 pl-7 font-mono text-sm rounded-xl uppercase"
                            value={website.theme.secondaryColor.replace(
                              "#",
                              "",
                            )}
                            onChange={(e) => {
                              const val = e.target.value.startsWith("#")
                                ? e.target.value
                                : `#${e.target.value}`;
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                                setWebsite({
                                  ...website,
                                  theme: {
                                    ...website.theme,
                                    secondaryColor: val,
                                  },
                                });
                              }
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Accent color for secondary elements and backgrounds.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Layout className="h-4 w-4 text-indigo-600" />
                      <Label className="text-sm font-bold uppercase tracking-wider text-slate-500">
                        Design Style
                      </Label>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-400">
                        Layout & Polish Style
                      </Label>
                      <Select
                        value={website.theme.style || "modern"}
                        onValueChange={(val) =>
                          setWebsite({
                            ...website,
                            theme: { ...website.theme, style: val as any },
                          })
                        }
                      >
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white">
                          <SelectValue placeholder="Select a design layout" />
                        </SelectTrigger>
                        <SelectContent className="max-h-80">
                          {[
                            {
                              value: "corporate",
                              label: "Modern Corporate (Standard Professional)",
                            },
                            {
                              value: "action",
                              label: "Lead Generation (High Conversion Focus)",
                            },
                            {
                              value: "immersive",
                              label: "Visual Immersive (Branding Focus)",
                            },
                            {
                              value: "editorial",
                              label: "Minimalist Clean (Content Focus)",
                            },
                            {
                              value: "authority",
                              label: "Personal Authority (Coach/Speaker Focus)",
                            },
                            {
                              value: "modern",
                              label: "Sleek Modern (Clean & Versatile)",
                            },
                            {
                              value: "neumorphic",
                              label: "Neumorphic (Soft UI Design)",
                            },
                            {
                              value: "glassmorphic",
                              label: "Glassmorphic (Creative Tech UI)",
                            },
                            {
                              value: "brutalist",
                              label: "Brutalist (Bold & Experimental)",
                            },
                          ]
                            .filter(
                              (item) =>
                                enabledStyles.length === 0 ||
                                enabledStyles.includes(item.value),
                            )
                            .map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-slate-500">
                        The design style controls typography, layout spacing, and
                        visual patterns across all sections.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Type className="h-4 w-4 text-indigo-600" />
                      <Label className="text-sm font-bold uppercase tracking-wider text-slate-500">
                        Typography
                      </Label>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-400">
                        Global Font Family
                      </Label>
                      <Select
                        value={website.theme.fontFamily || "Inter, sans-serif"}
                        onValueChange={(val) =>
                          setWebsite({
                            ...website,
                            theme: { ...website.theme, fontFamily: val },
                          })
                        }
                      >
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white">
                          <SelectValue placeholder="Select a font" />
                        </SelectTrigger>
                        <SelectContent className="max-h-80">
                          {FONTS.map((font) => (
                            <SelectItem
                              key={font.value}
                              value={font.value}
                              className="py-3"
                            >
                              <span
                                style={{ fontFamily: font.value }}
                                className="text-base"
                              >
                                {font.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="p-4 bg-white rounded-xl border border-slate-100 mt-4">
                        <p className="text-xs text-slate-400 mb-2 font-mono uppercase tracking-widest">
                          Font Preview
                        </p>
                        <div
                          style={{ fontFamily: website.theme.fontFamily }}
                          className="space-y-2"
                        >
                          <h4 className="text-xl font-bold">
                            The quick brown fox jumps over the lazy dog
                          </h4>
                          <p className="text-sm text-slate-600">
                            Lorem ipsum dolor sit amet, consectetur adipiscing
                            elit. Sed do eiusmod tempor incididunt ut labore et
                            dolore magna aliqua.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <Label className="text-base">Logo Settings</Label>
                    <div className="space-y-4">
                      <ImageUpload
                        label="Logo Upload"
                        description="PNG or SVG recommended."
                        value={website.theme.logoUrl || ""}
                        onUpload={(url) =>
                          setWebsite({
                            ...website,
                            theme: { ...website.theme, logoUrl: url },
                          })
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "footer" && (
              <Card>
                <CardHeader>
                  <CardTitle>Footer Settings</CardTitle>
                  <CardDescription>
                    Customize what appears at the bottom of your website.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="space-y-0.5">
                        <Label>Show Menu</Label>
                        <p className="text-[10px] text-slate-500">
                          Display page links
                        </p>
                      </div>
                      <Switch
                        checked={website?.theme?.footer?.showMenu}
                        onCheckedChange={(checked) =>
                          setWebsite({
                            ...website!,
                            theme: {
                              ...website!.theme,
                              footer: {
                                ...website!.theme.footer!,
                                showMenu: checked,
                              },
                            },
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="space-y-0.5">
                        <Label>Show Socials</Label>
                        <p className="text-[10px] text-slate-500">
                          Display social icons
                        </p>
                      </div>
                      <Switch
                        checked={website?.theme?.footer?.showSocials}
                        onCheckedChange={(checked) =>
                          setWebsite({
                            ...website!,
                            theme: {
                              ...website!.theme,
                              footer: {
                                ...website!.theme.footer!,
                                showSocials: checked,
                              },
                            },
                          })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="space-y-0.5">
                        <Label>Show Contact</Label>
                        <p className="text-[10px] text-slate-500">
                          Display contact info
                        </p>
                      </div>
                      <Switch
                        checked={website?.theme?.footer?.showContact}
                        onCheckedChange={(checked) =>
                          setWebsite({
                            ...website!,
                            theme: {
                              ...website!.theme,
                              footer: {
                                ...website!.theme.footer!,
                                showContact: checked,
                              },
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Custom Footer Text</Label>
                    <Input
                      placeholder="e.g. Your tagline or additional info"
                      value={website?.theme?.footer?.customText || ""}
                      onChange={(e) =>
                        setWebsite({
                          ...website!,
                          theme: {
                            ...website!.theme,
                            footer: {
                              ...website!.theme.footer!,
                              customText: e.target.value,
                            },
                          },
                        })
                      }
                    />
                  </div>

                  <div className="space-y-4 border-t border-slate-100 pt-6">
                    <Label className="text-base">Contact Information</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Contact Email</Label>
                        <Input
                          placeholder="contact@business.com"
                          value={website?.theme?.footer?.contactEmail || ""}
                          onChange={(e) =>
                            setWebsite({
                              ...website!,
                              theme: {
                                ...website!.theme,
                                footer: {
                                  ...website!.theme.footer!,
                                  contactEmail: e.target.value,
                                },
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Contact Phone</Label>
                        <Input
                          placeholder="+1 (555) 000-0000"
                          value={website?.theme?.footer?.contactPhone || ""}
                          onChange={(e) =>
                            setWebsite({
                              ...website!,
                              theme: {
                                ...website!.theme,
                                footer: {
                                  ...website!.theme.footer!,
                                  contactPhone: e.target.value,
                                },
                              },
                            })
                          }
                        />
                      </div>
                      <div className="col-span-full space-y-1.5">
                        <Label>Business Address</Label>
                        <Input
                          placeholder="123 Business St, City, Country"
                          value={website?.theme?.footer?.contactAddress || ""}
                          onChange={(e) =>
                            setWebsite({
                              ...website!,
                              theme: {
                                ...website!.theme,
                                footer: {
                                  ...website!.theme.footer!,
                                  contactAddress: e.target.value,
                                },
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-slate-100 pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Social Media Links</Label>
                        <p className="text-[10px] text-slate-500">
                          Add and reorder your social profiles.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-xl"
                        onClick={() => {
                          const newLinks = [
                            ...(website!.theme.footer!.socialLinks || []),
                            { platform: "facebook" as const, url: "" },
                          ];
                          setWebsite({
                            ...website!,
                            theme: {
                              ...website!.theme,
                              footer: {
                                ...website!.theme.footer!,
                                socialLinks: newLinks,
                              },
                            },
                          });
                        }}
                      >
                        <Plus className="h-4 w-4" /> Add Link
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {(website?.theme?.footer?.socialLinks || []).map(
                        (link, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 group"
                          >
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-white"
                                disabled={idx === 0}
                                onClick={() => {
                                  const newLinks = [
                                    ...website!.theme.footer!.socialLinks!,
                                  ];
                                  [newLinks[idx - 1], newLinks[idx]] = [
                                    newLinks[idx],
                                    newLinks[idx - 1],
                                  ];
                                  setWebsite({
                                    ...website!,
                                    theme: {
                                      ...website!.theme,
                                      footer: {
                                        ...website!.theme.footer!,
                                        socialLinks: newLinks,
                                      },
                                    },
                                  });
                                }}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-white"
                                disabled={
                                  idx ===
                                  website!.theme.footer!.socialLinks!.length - 1
                                }
                                onClick={() => {
                                  const newLinks = [
                                    ...website!.theme.footer!.socialLinks!,
                                  ];
                                  [newLinks[idx + 1], newLinks[idx]] = [
                                    newLinks[idx],
                                    newLinks[idx + 1],
                                  ];
                                  setWebsite({
                                    ...website!,
                                    theme: {
                                      ...website!.theme,
                                      footer: {
                                        ...website!.theme.footer!,
                                        socialLinks: newLinks,
                                      },
                                    },
                                  });
                                }}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-3">
                              <div className="sm:col-span-3 space-y-1.5">
                                <Label className="text-[10px] uppercase tracking-widest text-slate-400">
                                  Platform
                                </Label>
                                <select
                                  className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                  value={link.platform}
                                  onChange={(e) => {
                                    const newLinks = [
                                      ...website!.theme.footer!.socialLinks!,
                                    ];
                                    newLinks[idx] = {
                                      ...link,
                                      platform: e.target.value as any,
                                    };
                                    setWebsite({
                                      ...website!,
                                      theme: {
                                        ...website!.theme,
                                        footer: {
                                          ...website!.theme.footer!,
                                          socialLinks: newLinks,
                                        },
                                      },
                                    });
                                  }}
                                >
                                  <option value="facebook">Facebook</option>
                                  <option value="instagram">Instagram</option>
                                  <option value="twitter">Twitter / X</option>
                                  <option value="linkedin">LinkedIn</option>
                                  <option value="youtube">YouTube</option>
                                  <option value="tiktok">TikTok</option>
                                </select>
                              </div>
                              <div className="sm:col-span-7 space-y-1.5">
                                <Label className="text-[10px] uppercase tracking-widest text-slate-400">
                                  URL
                                </Label>
                                <Input
                                  placeholder="https://..."
                                  className="rounded-xl bg-white"
                                  value={link.url}
                                  onChange={(e) => {
                                    const newLinks = [
                                      ...website!.theme.footer!.socialLinks!,
                                    ];
                                    newLinks[idx] = {
                                      ...link,
                                      url: e.target.value,
                                    };
                                    setWebsite({
                                      ...website!,
                                      theme: {
                                        ...website!.theme,
                                        footer: {
                                          ...website!.theme.footer!,
                                          socialLinks: newLinks,
                                        },
                                      },
                                    });
                                  }}
                                />
                              </div>
                              <div className="sm:col-span-2 flex flex-col items-center justify-center space-y-1.5">
                                <Label className="text-[10px] uppercase tracking-widest text-slate-400">
                                  Visible
                                </Label>
                                <Switch
                                  checked={link.isVisible !== false}
                                  onCheckedChange={(checked) => {
                                    const newLinks = [
                                      ...website!.theme.footer!.socialLinks!,
                                    ];
                                    newLinks[idx] = {
                                      ...link,
                                      isVisible: checked,
                                    };
                                    setWebsite({
                                      ...website!,
                                      theme: {
                                        ...website!.theme,
                                        footer: {
                                          ...website!.theme.footer!,
                                          socialLinks: newLinks,
                                        },
                                      },
                                    });
                                  }}
                                />
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:bg-red-50 rounded-xl mt-5"
                              onClick={() => {
                                const newLinks =
                                  website!.theme.footer!.socialLinks!.filter(
                                    (_, i) => i !== idx,
                                  );
                                setWebsite({
                                  ...website!,
                                  theme: {
                                    ...website!.theme,
                                    footer: {
                                      ...website!.theme.footer!,
                                      socialLinks: newLinks,
                                    },
                                  },
                                });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === "seo" && (
              <div className="space-y-6">
                <Card className="overflow-hidden border-indigo-100 shadow-sm">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-indigo-600" />
                          Revenue Search (Global SEO)
                        </CardTitle>
                        <CardDescription>
                          Dominate search engines and turn global searchers into
                          paying customers.
                        </CardDescription>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center">
                        <Search className="h-5 w-5 text-indigo-600" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-8">
                    {/* Search Result Preview */}
                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Search Engine Preview
                      </Label>
                      <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm max-w-2xl">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                            {website.seo.favicon ? (
                              <img
                                src={website.seo.favicon}
                                alt="Favicon"
                                className="h-4 w-4"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Globe className="h-3 w-3 text-slate-400" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[12px] leading-tight text-slate-900 font-medium">
                              {website.seo.title || "Site Title"}
                            </span>
                            <span className="text-[10px] leading-tight text-slate-500">
                              https://yourdomain.com › {website.businessId}
                            </span>
                          </div>
                        </div>
                        <h3 className="text-[20px] leading-tight text-[#1a0dab] hover:underline cursor-pointer mb-1">
                          {website.seo.title || "Your Business Website Title"}
                        </h3>
                        <p className="text-[14px] leading-normal text-[#4d5156] line-clamp-2">
                          {website.seo.description ||
                            "Add a meta description to see how your site will appear in search results. This description should be between 150-160 characters for optimal visibility."}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Site Title</Label>
                        <Input
                          {...registerSeo("title")}
                          placeholder="Business Name | Professional Service"
                        />
                        {seoErrors.title && (
                          <p className="text-xs text-red-500">
                            {seoErrors.title.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Keywords (comma separated)</Label>
                        <Input
                          {...registerSeo("keywords")}
                          placeholder="service, quality, location"
                        />
                        {seoErrors.keywords && (
                          <p className="text-xs text-red-500">
                            {seoErrors.keywords.message}
                          </p>
                        )}
                      </div>
                      <div className="col-span-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Meta Description</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            disabled={improving === "seo"}
                            onClick={() => handleFieldAIAssist("seo")}
                          >
                            {improving === "seo" ? (
                              <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-2.5 w-2.5" />
                            )}
                            Optimize All Meta
                          </Button>
                        </div>
                        <Textarea
                          {...registerSeo("description")}
                          className="min-h-[100px]"
                          placeholder="Briefly describe what your business does and why customers should choose you."
                        />
                        {seoErrors.description && (
                          <p className="text-xs text-red-500">
                            {seoErrors.description.message}
                          </p>
                        )}
                      </div>

                      {/* Advanced SEO Fields - Feature Gated */}
                      <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                        {!isFeatureEnabled("advanced_seo") && (
                          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-xl border border-dashed border-indigo-200 p-6 text-center">
                            <Lock className="h-6 w-6 text-indigo-600 mb-2" />
                            <p className="text-xs font-bold text-slate-900 mb-1">
                              Advanced SEO Features Locked
                            </p>
                            <p className="text-[10px] text-slate-500 mb-3">
                              Upgrade to Growth to unlock Favicons, Social
                              Images, and Page-Specific SEO.
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] rounded-lg border-indigo-200 text-indigo-600"
                              onClick={() => navigate("/dashboard/billing")}
                            >
                              Upgrade Now
                            </Button>
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Favicon URL</Label>
                          <div className="flex gap-2">
                            <Input
                              {...registerSeo("favicon")}
                              placeholder="https://..."
                              disabled={!isFeatureEnabled("advanced_seo")}
                            />
                            <div className="h-10 w-10 shrink-0 border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                              {website.seo.favicon ? (
                                <img
                                  src={website.seo.favicon}
                                  alt="Favicon"
                                  className="h-6 w-6"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-slate-300" />
                              )}
                            </div>
                          </div>
                          {seoErrors.favicon && (
                            <p className="text-xs text-red-500">
                              {seoErrors.favicon.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>OG Image URL (Social Sharing)</Label>
                          <div className="flex gap-2">
                            <Input
                              {...registerSeo("ogImage")}
                              placeholder="https://..."
                              disabled={!isFeatureEnabled("advanced_seo")}
                            />
                            <div className="h-10 w-10 shrink-0 border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                              {website.seo.ogImage ? (
                                <img
                                  src={website.seo.ogImage}
                                  alt="OG"
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <ImageIcon className="h-5 w-5 text-slate-300" />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="col-span-full space-y-2">
                          <Label>Canonical URL</Label>
                          <Input
                            {...registerSeo("canonicalUrl")}
                            placeholder="https://yourdomain.com"
                            disabled={!isFeatureEnabled("advanced_seo")}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-indigo-100 shadow-sm relative">
                  {!isFeatureEnabled("local_seo_geo") && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[4px] z-10 flex flex-col items-center justify-center p-8 text-center">
                      <div className="h-16 w-16 rounded-3xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                        <Lock className="h-8 w-8 text-amber-600" />
                      </div>
                      <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        Local SEO & GEO Data Locked
                      </h4>
                      <p className="text-sm text-slate-500 max-w-xs mb-6">
                        Upgrade to Premium to unlock Rich Snippets, GEO Tags,
                        and Google Maps integration.
                      </p>
                      <Button
                        onClick={() => navigate("/dashboard/billing")}
                        className="rounded-xl bg-amber-600 hover:bg-amber-700 h-12 px-8"
                      >
                        Upgrade Now
                      </Button>
                    </div>
                  )}
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5 text-indigo-600" />
                      GEO & Local SEO
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2 md:mt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSyncSeoFromBusiness}
                        className="h-8 text-xs gap-2 rounded-lg"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Sync from Profile
                      </Button>
                      <CardDescription>
                        Enhance local ranking by providing location and business
                        details.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Business Type</Label>
                        <Select
                          value={
                            watchSeo("businessType") ||
                            website.seo.businessType ||
                            "LocalBusiness"
                          }
                          onValueChange={(val) => {
                            setSeoValue("businessType", val, {
                              shouldDirty: true,
                            });
                            setWebsite({
                              ...website,
                              seo: { ...website.seo, businessType: val },
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LocalBusiness">
                              Local Business
                            </SelectItem>
                            <SelectItem value="Restaurant">
                              Restaurant
                            </SelectItem>
                            <SelectItem value="ProfessionalService">
                              Professional Service
                            </SelectItem>
                            <SelectItem value="HealthAndBeautyBusiness">
                              Health & Beauty
                            </SelectItem>
                            <SelectItem value="RealEstateAgent">
                              Real Estate Agent
                            </SelectItem>
                            <SelectItem value="MedicalBusiness">
                              Medical Business
                            </SelectItem>
                            <SelectItem value="Store">
                              Store / Retail
                            </SelectItem>
                            <SelectItem value="Hotel">
                              Hotel / Lodging
                            </SelectItem>
                            <SelectItem value="AutomotiveBusiness">
                              Automotive
                            </SelectItem>
                            <SelectItem value="FinancialService">
                              Financial Service
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input
                          {...registerSeo("phone")}
                          placeholder="+1 (555) 000-0000"
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label>Full Address</Label>
                        <Input
                          {...registerSeo("address")}
                          placeholder="123 Main St, City, State, ZIP"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Region / State</Label>
                        <Input
                          {...registerSeo("region")}
                          placeholder="California"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Place Name / City</Label>
                        <Input
                          {...registerSeo("placename")}
                          placeholder="San Francisco"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Latitude</Label>
                        <Input
                          {...registerSeo("latitude")}
                          placeholder="37.7749"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Longitude</Label>
                        <Input
                          {...registerSeo("longitude")}
                          placeholder="-122.4194"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Opening Hours</Label>
                        <Textarea
                          placeholder="Mon 09:00-17:00, Tue 09:00-17:00..."
                          className="min-h-[80px]"
                          value={website.seo.openingHours?.join("\n") || ""}
                          onChange={(e) => {
                            setWebsite({
                              ...website,
                              seo: {
                                ...website.seo,
                                openingHours: e.target.value
                                  .split("\n")
                                  .filter(Boolean),
                              },
                            });
                          }}
                        />
                        <p className="text-[10px] text-slate-500 italic">
                          One day/hours pair per line.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Price Range</Label>
                        <Select
                          value={
                            watchSeo("priceRange") ||
                            website.seo.priceRange ||
                            "$$"
                          }
                          onValueChange={(val) => {
                            setSeoValue("priceRange", val, {
                              shouldDirty: true,
                            });
                            setWebsite({
                              ...website,
                              seo: { ...website.seo, priceRange: val },
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select price range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="$">$ (Inexpensive)</SelectItem>
                            <SelectItem value="$$">$$ (Moderate)</SelectItem>
                            <SelectItem value="$$$">$$$ (Expensive)</SelectItem>
                            <SelectItem value="$$$$">$$$$ (Luxury)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-indigo-100 shadow-sm relative">
                  <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-white border-b border-slate-100">
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-indigo-600" />
                      Generative Engine Optimization (GEO)
                    </CardTitle>
                    <CardDescription>
                      Optimize your website for AI search engines like Gemini,
                      Claude, and Perplexity.
                    </CardDescription>
                  </CardHeader>
                  <div className="absolute top-6 right-6 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-2 font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      onClick={async () => {
                        try {
                          toast.loading(
                            "Generating AI-optimized GEO content...",
                          );
                          const { generateGeoContent } =
                            await import("../lib/gemini");
                          let bId = business?.id || website?.businessId || businessId;
                          let targetBusiness = business;

                          // Fallback to profile business if possible
                          if (!targetBusiness && profile?.businessId) {
                            try {
                              const { data } = await supabase.from("businesses").select("*").eq("id", profile.businessId).maybeSingle();
                              if (data) {
                                targetBusiness = data;
                                // Optionally update state if it helps
                                // setBusiness(data); 
                              }
                            } catch (e) {}
                          }

                          if (!bId && !targetBusiness)
                            throw new Error("No business context found. Please complete your profile first.");
                          if (!targetBusiness && bId && bId !== "template") {
                            try {
                              const { data: bData } = await supabase
                                .from("businesses")
                                .select("*")
                                .eq("id", bId)
                                .maybeSingle();
                              targetBusiness = bData;
                            } catch (err) {
                              console.error("Error fetching business:", err);
                            }
                          }

                          // If still no targetBusiness, create a fallback from website/seo data
                          if (!targetBusiness) {
                            if (bId === "template") {
                              throw new Error(
                                "Cannot generate GEO content for templates without a business context.",
                              );
                            }
                            
                            // Last resort fallback using SEO data
                            targetBusiness = {
                              name: website?.seo?.title || "Local Business",
                              industry: website?.seo?.keywords?.[0] || "General Industry",
                              location: website?.seo?.placename || "Local Area",
                              business_nature: website?.seo?.description || "A professional local business.",
                            };
                          }

                          const geoContent = await generateGeoContent(
                            targetBusiness.name,
                            targetBusiness.industry,
                            targetBusiness.location,
                            targetBusiness.business_nature || "",
                            bId !== "template" ? bId : undefined,
                          );

                          // Update current state and form
                          const updatedSeo = {
                            ...website.seo,
                            coreValueProposition:
                              geoContent.coreValueProposition,
                            knowledgeBaseSummary:
                              geoContent.knowledgeBaseSummary,
                            targetAudience: geoContent.targetAudience,
                            keywords: geoContent.keywords,
                            businessType: geoContent.businessType,
                          };

                          setSeoValue(
                            "coreValueProposition",
                            geoContent.coreValueProposition,
                            { shouldDirty: true },
                          );
                          setSeoValue(
                            "knowledgeBaseSummary",
                            geoContent.knowledgeBaseSummary,
                            { shouldDirty: true },
                          );
                          setSeoValue(
                            "targetAudience",
                            geoContent.targetAudience,
                            { shouldDirty: true },
                          );
                          setSeoValue("keywords", geoContent.keywords, {
                            shouldDirty: true,
                          });
                          setSeoValue("businessType", geoContent.businessType, {
                            shouldDirty: true,
                          });

                          setWebsite({
                            ...website,
                            seo: updatedSeo,
                          });

                          toast.dismiss();
                          toast.success("AI-optimized GEO content generated!");
                        } catch (err: any) {
                          toast.dismiss();
                          toast.error(
                            "Failed to generate GEO content: " + err.message,
                          );
                        }
                      }}
                    >
                      <Sparkles className="h-4 w-4" /> AI Regenerate GEO
                    </Button>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          Core Value Proposition
                          <Badge variant="outline" className="text-[8px] h-4">
                            CRITICAL FOR AI
                          </Badge>
                        </Label>
                        <Input
                          {...registerSeo("coreValueProposition")}
                          placeholder="e.g. The premier aesthetic clinic in Tokyo offering non-surgical facial rejuvenation."
                          onChange={(e) => {
                            registerSeo("coreValueProposition").onChange(e);
                            setWebsite({
                              ...website,
                              seo: {
                                ...website.seo,
                                coreValueProposition: e.target.value,
                              },
                            });
                          }}
                        />
                        <p className="text-[10px] text-slate-500 italic">
                          This helps AI engines summarize your business in one
                          clear sentence.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Brand Voice & Personality</Label>
                        <Select
                          value={
                            watchSeo("brandVoice") ||
                            website.seo.brandVoice ||
                            "Professional"
                          }
                          onValueChange={(val) => {
                            setSeoValue("brandVoice", val, {
                              shouldDirty: true,
                            });
                            setWebsite({
                              ...website,
                              seo: { ...website.seo, brandVoice: val },
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select brand voice" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Professional">
                              Professional & Authoritative
                            </SelectItem>
                            <SelectItem value="Warm">
                              Warm & Compassionate
                            </SelectItem>
                            <SelectItem value="Bold">Bold & Direct</SelectItem>
                            <SelectItem value="Minimal">
                              Minimal & Clean
                            </SelectItem>
                            <SelectItem value="Whimsical">
                              Whimsical & Playful
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Knowledge Base Summary</Label>
                        <Textarea
                          placeholder="Provide a factual overview of your business history, milestones, and core expertise..."
                          className="min-h-[120px]"
                          {...registerSeo("knowledgeBaseSummary")}
                          onChange={(e) => {
                            registerSeo("knowledgeBaseSummary").onChange(e);
                            setWebsite({
                              ...website,
                              seo: {
                                ...website.seo,
                                knowledgeBaseSummary: e.target.value,
                              },
                            });
                          }}
                        />
                        <p className="text-[10px] text-slate-500 italic">
                          Detailed context increases the accuracy of
                          AI-generated answers about your brand.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Target Audience Profile</Label>
                        <Input
                          {...registerSeo("targetAudience")}
                          placeholder="e.g. High-net-worth individuals aged 35-60 interested in skincare."
                          onChange={(e) => {
                            registerSeo("targetAudience").onChange(e);
                            setWebsite({
                              ...website,
                              seo: {
                                ...website.seo,
                                targetAudience: e.target.value,
                              },
                            });
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-indigo-100 shadow-sm relative">
                  {!isFeatureEnabled("advanced_seo") && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-[4px] z-10 flex flex-col items-center justify-center p-8 text-center">
                      <div className="h-16 w-16 rounded-3xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-4">
                        <Lock className="h-8 w-8 text-indigo-600" />
                      </div>
                      <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        Page-Specific SEO Locked
                      </h4>
                      <p className="text-sm text-slate-500 max-w-xs mb-6">
                        Upgrade to Growth to customize SEO settings for every
                        single page individually.
                      </p>
                      <Button
                        onClick={() => navigate("/dashboard/billing")}
                        className="rounded-xl bg-indigo-600 h-12 px-8"
                      >
                        Upgrade Now
                      </Button>
                    </div>
                  )}
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <CardTitle className="flex items-center gap-2">
                      <Layout className="h-5 w-5 text-indigo-600" />
                      Page-Specific SEO
                    </CardTitle>
                    <CardDescription>
                      Customize SEO settings for individual pages.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {website.pages.map((page) => (
                      <div
                        key={page.id}
                        className="p-5 border border-slate-200 rounded-2xl space-y-6 bg-white shadow-sm hover:border-indigo-200 transition-colors"
                      >
                        <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                              <FileText className="h-4 w-4 text-indigo-600" />
                            </div>
                            <h4 className="font-bold text-slate-900">
                              {page.title}
                            </h4>
                          </div>
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 text-slate-600 border-none"
                          >
                            {page.slug}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">
                              Page Title Tag
                            </Label>
                            <Input
                              className="h-9 text-sm"
                              value={page.seo?.title || ""}
                              placeholder={`${page.title} | ${website.seo.title}`}
                              onChange={(e) => {
                                updatePageSeo(page.id, {
                                  title: e.target.value,
                                });
                              }}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">
                              Page Keywords
                            </Label>
                            <Input
                              className="h-9 text-sm"
                              value={page.seo?.keywords?.join(", ") || ""}
                              placeholder="keyword1, keyword2"
                              onChange={(e) =>
                                updatePageSeo(page.id, {
                                  keywords: e.target.value
                                    .split(",")
                                    .map((k) => k.trim()),
                                })
                              }
                            />
                          </div>
                          <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">
                              Page Meta Description
                            </Label>
                            <Textarea
                              className="text-sm min-h-[80px]"
                              value={page.seo?.description || ""}
                              placeholder="Specific description for this page..."
                              onChange={(e) =>
                                updatePageSeo(page.id, {
                                  description: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">
                              Page Canonical URL
                            </Label>
                            <Input
                              className="h-9 text-sm"
                              value={page.seo?.canonicalUrl || ""}
                              placeholder="https://yourdomain.com/page"
                              onChange={(e) =>
                                updatePageSeo(page.id, {
                                  canonicalUrl: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">
                              Page OG Image URL
                            </Label>
                            <div className="flex gap-3">
                              <Input
                                className="h-9 text-sm"
                                value={page.seo?.ogImage || ""}
                                placeholder="https://..."
                                onChange={(e) =>
                                  updatePageSeo(page.id, {
                                    ogImage: e.target.value,
                                  })
                                }
                              />
                              <div className="h-9 w-16 shrink-0 border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                                {page.seo?.ogImage ? (
                                  <img
                                    src={page.seo.ogImage}
                                    alt="Page OG"
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <ImageIcon className="h-4 w-4 text-slate-300" />
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="col-span-2 space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">
                              Page Favicon URL
                            </Label>
                            <div className="flex gap-3">
                              <Input
                                className="h-9 text-sm"
                                value={page.seo?.favicon || ""}
                                placeholder="https://..."
                                onChange={(e) =>
                                  updatePageSeo(page.id, {
                                    favicon: e.target.value,
                                  })
                                }
                              />
                              <div className="h-9 w-16 shrink-0 border border-slate-200 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">
                                {page.seo?.favicon ? (
                                  <img
                                    src={page.seo.favicon}
                                    alt="Page Favicon"
                                    className="h-4 w-4"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <Globe className="h-4 w-4 text-slate-300" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Page-Specific Local SEO */}
                          <div className="col-span-2 pt-4 border-t border-slate-100">
                            <Accordion className="w-full">
                              <AccordionItem
                                value="local-seo"
                                className="border-none"
                              >
                                <AccordionTrigger className="py-2 hover:no-underline">
                                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    <MapPin className="h-4 w-4" /> Local SEO &
                                    GEO Overrides
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-4 space-y-6">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <Label className="text-xs">
                                        Business Type
                                      </Label>
                                      <Select
                                        value={page.seo?.businessType || ""}
                                        onValueChange={(val) =>
                                          updatePageSeo(page.id, {
                                            businessType: val,
                                          })
                                        }
                                      >
                                        <SelectTrigger className="h-9 text-xs">
                                          <SelectValue placeholder="Use Global" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="LocalBusiness">
                                            Local Business
                                          </SelectItem>
                                          <SelectItem value="Restaurant">
                                            Restaurant
                                          </SelectItem>
                                          <SelectItem value="ProfessionalService">
                                            Professional Service
                                          </SelectItem>
                                          <SelectItem value="HealthAndBeautyBusiness">
                                            Health & Beauty
                                          </SelectItem>
                                          <SelectItem value="RealEstateAgent">
                                            Real Estate Agent
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs">
                                        Phone Number
                                      </Label>
                                      <Input
                                        className="h-9 text-xs"
                                        value={page.seo?.phone || ""}
                                        placeholder={website.seo.phone}
                                        onChange={(e) =>
                                          updatePageSeo(page.id, {
                                            phone: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="col-span-2 space-y-1.5">
                                      <Label className="text-xs">
                                        Full Address
                                      </Label>
                                      <Input
                                        className="h-9 text-xs"
                                        value={page.seo?.address || ""}
                                        placeholder={website.seo.address}
                                        onChange={(e) =>
                                          updatePageSeo(page.id, {
                                            address: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs">
                                        Region / State
                                      </Label>
                                      <Input
                                        className="h-9 text-xs"
                                        value={page.seo?.region || ""}
                                        placeholder={website.seo.region}
                                        onChange={(e) =>
                                          updatePageSeo(page.id, {
                                            region: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs">
                                        City / Placename
                                      </Label>
                                      <Input
                                        className="h-9 text-xs"
                                        value={page.seo?.placename || ""}
                                        placeholder={website.seo.placename}
                                        onChange={(e) =>
                                          updatePageSeo(page.id, {
                                            placename: e.target.value,
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs">
                                        Opening Hours (Overrride)
                                      </Label>
                                      <Textarea
                                        className="text-xs min-h-[60px]"
                                        value={
                                          page.seo?.openingHours?.join("\n") ||
                                          ""
                                        }
                                        placeholder="Use global opening hours..."
                                        onChange={(e) =>
                                          updatePageSeo(page.id, {
                                            openingHours: e.target.value
                                              .split("\n")
                                              .filter(Boolean),
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs">
                                        Price Range
                                      </Label>
                                      <Select
                                        value={page.seo?.priceRange || ""}
                                        onValueChange={(val) =>
                                          updatePageSeo(page.id, {
                                            priceRange: val,
                                          })
                                        }
                                      >
                                        <SelectTrigger className="h-9 text-xs">
                                          <SelectValue placeholder="Use Global" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="$">$</SelectItem>
                                          <SelectItem value="$$">$$</SelectItem>
                                          <SelectItem value="$$$">
                                            $$$
                                          </SelectItem>
                                          <SelectItem value="$$$$">
                                            $$$$
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* AI SEO Health Auditor */}
                <Card className="overflow-hidden border-rose-100 shadow-sm relative">
                  <CardHeader className="bg-rose-50/30 border-b border-rose-100">
                    <CardTitle className="flex items-center gap-2 text-rose-900">
                      <Shield className="h-5 w-5 text-rose-600" />
                      AI SEO Health Auditor
                    </CardTitle>
                    <CardDescription>
                      Let AI scan your website configuration and provide
                      critical fixes for optimal search ranking.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {!seoAudit ? (
                      <div className="text-center py-12 space-y-4 border-2 border-dashed border-rose-100 rounded-[2rem] bg-rose-50/10">
                        <div className="h-16 w-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
                          <Search className="h-8 w-8 text-rose-600" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-900">
                            No Recent Audit Found
                          </h4>
                          <p className="text-sm text-slate-500 max-w-xs mx-auto">
                            Run a comprehensive scan to identify missing
                            metadata, keyword gaps, and technical SEO issues.
                          </p>
                        </div>
                        <Button
                          onClick={async () => {
                            try {
                              setIsAuditing(true);
                              toast.loading(
                                "Analyzing website SEO structure...",
                              );
                              const { generateMarketingContent } =
                                await import("../lib/gemini");
                              const result = await generateMarketingContent(
                                "seo_audit",
                                {
                                  name: business?.name,
                                  industry: business?.industry,
                                  description: website?.seo.description,
                                  location: business?.location,
                                  targetAudience: website?.seo.targetAudience,
                                  currentSeo: website?.seo,
                                },
                              );
                              setSeoAudit(result);
                              toast.success("SEO Audit Complete!");
                            } catch (err) {
                              toast.error("Failed to run SEO audit");
                            } finally {
                              setIsAuditing(false);
                            }
                          }}
                          disabled={isAuditing}
                          className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold h-11 px-8 shadow-lg shadow-rose-100"
                        >
                          {isAuditing ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Zap className="h-4 w-4 mr-2" />
                          )}
                          Run SEO Scan Now
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                          <div>
                            <h4 className="font-bold text-slate-900">SEO Growth Review</h4>
                            <p className="mt-1 text-xs text-slate-500">Observable findings and recommended improvements.</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                setIsAuditing(true);
                                const { generateMarketingContent } =
                                  await import("../lib/gemini");
                                const result = await generateMarketingContent(
                                  "seo_audit",
                                  {
                                    name: business?.name,
                                    industry: business?.industry,
                                    description: website?.seo.description,
                                    location: business?.location,
                                    targetAudience: website?.seo.targetAudience,
                                    currentSeo: website?.seo,
                                  },
                                );
                                setSeoAudit(result);
                                toast.success("Audit Refreshed");
                              } catch (err) {
                                toast.error("Audit failed");
                              } finally {
                                setIsAuditing(false);
                              }
                            }}
                            disabled={isAuditing}
                            className="rounded-lg h-9 text-xs border-slate-200"
                          >
                            {isAuditing ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-2" />
                            ) : (
                              <RefreshCw className="h-3 w-3 mr-2" />
                            )}
                            Rescan
                          </Button>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                            What We Found
                          </Label>
                          <div className="space-y-2">
                            {seoAudit.criticalIssues.map(
                              (issue: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="p-4 bg-white border border-slate-100 rounded-2xl flex items-start gap-4 shadow-sm hover:border-rose-200 transition-colors"
                                >
                                  <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center shrink-0 mt-1">
                                    <AlertCircle className="h-4 w-4 text-rose-600" />
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <p className="text-sm font-bold text-slate-900">
                                      {issue.issue}
                                    </p>
                                    <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">What we found</p>
                                    <p className="text-xs text-slate-500">{issue.whatWeFound || "This needs a manual review against the live page."}</p>
                                    <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Why it matters</p>
                                    <p className="text-xs text-slate-500">{issue.impact}</p>
                                    <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-indigo-600">Recommended improvement</p>
                                    <p className="text-xs font-bold text-indigo-700">{issue.solution}</p>
                                  </div>
                                  {["title", "description", "keywords"].includes(issue.fixType) && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold text-xs gap-1.5"
                                      onClick={() => {
                                        if (issue.fixType === "title")
                                          setSeoValue("title", issue.solution, {
                                            shouldDirty: true,
                                          });
                                        if (issue.fixType === "description")
                                          setSeoValue(
                                            "description",
                                            issue.solution,
                                            { shouldDirty: true },
                                          );
                                        if (issue.fixType === "keywords")
                                          setSeoValue(
                                            "keywords",
                                            issue.solution,
                                            { shouldDirty: true },
                                          );
                                        toast.success("Optimization Applied!");
                                      }}
                                    >
                                      <Zap className="h-3.5 w-3.5" /> Apply
                                    </Button>
                                  )}
                                </div>
                              ),
                            )}
                          </div>
                        </div>

                        <div className="p-5 bg-indigo-50/30 rounded-[2rem] border border-indigo-100 space-y-3">
                          <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm"><Sparkles className="h-4 w-4" /> Recommended Next Improvement</div>
                          <p className="text-sm font-bold leading-6 text-slate-700">{seoAudit.nextRecommendation || "Review the highest-priority finding and apply one focused improvement."}</p>
                        </div>

                        <div className="p-4 bg-slate-900 rounded-2xl text-white text-xs leading-relaxed">
                          <p className="font-bold mb-1 opacity-60 uppercase tracking-widest text-[10px]">
                            Audit Summary
                          </p>
                          {seoAudit.summary}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={!!pageToDelete}
        onOpenChange={(open) => !open && setPageToDelete(null)}
      >
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              Delete Page?
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Are you sure you want to delete the{" "}
              <strong>
                {website.pages.find((p) => p.id === pageToDelete)?.title}
              </strong>{" "}
              page? This action cannot be undone and all sections on this page
              will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="ghost"
              onClick={() => setPageToDelete(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => pageToDelete && removePage(pageToDelete)}
              className="rounded-xl px-8 font-bold bg-red-600 hover:bg-red-700"
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddPage} onOpenChange={setShowAddPage}>
        <DialogContent className="rounded-3xl sm:max-w-md max-h-[95vh] flex flex-col overflow-hidden p-0 dark:bg-slate-900 border-none shadow-2xl">
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle className="text-2xl font-bold">
              Add New Page
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Create a additional page for your website. (Limit: {maxPages}{" "}
              pages total)
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Page Title
              </Label>
              <Input
                placeholder="e.g., Services, About Us, Contact"
                className="rounded-2xl h-12 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                value={newPageData.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setNewPageData({
                    ...newPageData,
                    title: title,
                    slug: title.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                  });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Page URL (Slug)
              </Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  /
                </span>
                <Input
                  placeholder="slug"
                  className="rounded-2xl h-12 pl-7 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                  value={newPageData.slug}
                  onChange={(e) =>
                    setNewPageData({
                      ...newPageData,
                      slug: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "-"),
                    })
                  }
                />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                The relative path for this page (e.g., /services).
              </p>
            </div>

            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/30">
              <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium leading-relaxed">
                New pages will automatically be added to your website's
                navigation header and footer for a seamless experience.
              </p>
            </div>
          </div>
          <DialogFooter className="p-6 pt-2 border-t shrink-0 dark:border-slate-800">
            <Button
              variant="ghost"
              onClick={() => setShowAddPage(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPage}
              disabled={isGeneratingPage}
              className="rounded-xl px-8 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 dark:shadow-none border-none"
            >
              {isGeneratingPage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Create Page"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAiEditor} onOpenChange={setShowAiEditor}>
        <DialogContent className="rounded-3xl sm:max-w-md bg-white dark:bg-slate-900 border-none shadow-2xl p-0 overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-indigo-600">
                <Sparkles className="h-5 w-5" />
                <span className="text-sm font-semibold">
                  AI Writing Assistant
                </span>
              </div>
              <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Improve Section Copy
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 font-medium">
                AI rewrites the selected section and applies the copy directly
                while preserving the existing layout and fields.
              </DialogDescription>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">
                  Custom Refinement (Optional)
                </Label>
                <Textarea
                  placeholder="e.g. Focus more on our eco-friendly materials, or keep sentences short and punchy..."
                  className="min-h-[120px] rounded-2xl border-slate-200 bg-slate-50 focus:bg-white transition-all resize-none p-4 text-sm"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                />
                <p className="text-[9px] text-slate-400 font-medium pl-1 italic">
                  Tip: Be specific about what you want the AI to highlight or
                  change.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-2xl h-12 font-bold text-slate-600 border-slate-200"
                onClick={() => setShowAiEditor(false)}
                disabled={isGeneratingSection}
              >
                Cancel
              </Button>
              <Button
                className="flex-[2] rounded-2xl h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-50 transition-all border-none"
                disabled={isGeneratingSection}
                onClick={() => {
                  if (activeElement?.pageId && activeElement?.sectionId) {
                    const page = website?.pages.find(
                      (p) => p.id === activeElement.pageId,
                    );
                    const section = page?.sections.find(
                      (s) => s.id === activeElement.sectionId,
                    );
                    if (section) {
                      generateAISectionContent(
                        activeElement.pageId,
                        activeElement.sectionId,
                        section.type,
                      );
                    }
                  }
                }}
              >
                {isGeneratingSection ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Synthesizing...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Apply AI Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
