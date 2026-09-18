/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Website, WebsiteSection, BlogPost } from "../types";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  CheckCircle2,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Send,
  Twitter,
  X,
  Zap,
  ArrowLeft,
  ArrowRight,
  Calendar,
  User,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Youtube,
  MessageSquare,
  Sparkles,
  Quote,
  ShoppingBag,
  Tag,
  CreditCard,
  Layers,
  Shield,
  Check,
  AlertCircle,
  Activity,
  Cookie,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";
import { generateChatResponse } from "../lib/gemini";
import { cn, formatDate, generateId, formatStatValue } from "../lib/utils";
import { Helmet, HelmetProvider } from "react-helmet-async";
import { toast } from "sonner";
import { useFeatures } from "../hooks/useFeatures";
import {
  trackPinterestCheckout,
  trackPinterestLead,
  trackPinterestPageVisit,
} from "../lib/pinterestTracking";
import { NICHE_TEMPLATES } from "../constants/nicheTemplates";
import {
  buildHrefFromButton,
  getContactDetailsFromWebsite,
  inferButtonAction,
  normalizePhoneForHref,
  normalizeWebsiteForPreview,
} from "../lib/websiteButtons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { DESIGN_TOKENS, resolveDesignProfile } from "../constants/designProfiles";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] },
};

const staggerContainer = {
  initial: {},
  whileInView: {
    transition: {
      staggerChildren: 0.1,
    },
  },
  viewport: { once: true, margin: "-50px" },
};

export function WebsiteRenderer({
  initialData,
  activePageSlug: propActivePageSlug,
  businessIdOverride,
  isTemplatePreview = false,
}: {
  initialData?: Website;
  activePageSlug?: string;
  businessIdOverride?: string;
  isTemplatePreview?: boolean;
}) {
  const { businessId: businessIdFromParams, templateId } = useParams<{
    businessId: string;
    templateId: string;
  }>();
  const businessId = initialData?.businessId || businessIdOverride || businessIdFromParams;
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const draftPreview = searchParams.get("draft") === "1" || searchParams.get("draft") === "true";
  const isThumbnail = searchParams.get("thumbnail") === "1";
  const requestedWebsiteId = searchParams.get("website");
  const { isFeatureEnabled } = useFeatures();
  const [website, setWebsite] = useState<Website | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const rendererRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialData) {
      setWebsite(initialData);
    }
  }, [initialData]);

  const [leadForm, setLeadForm] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
    marketingConsent: false,
  });
  const [complianceSettings, setComplianceSettings] = useState<any>(null);
  const [cookieConsent, setCookieConsent] = useState<any>(() => {
    try {
      const stored = localStorage.getItem("bt_cookie_consent");
      const parsed = stored ? JSON.parse(stored) : null;
      if (parsed?.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) {
        localStorage.removeItem("bt_cookie_consent");
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [showCookiePrefs, setShowCookiePrefs] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [activePageSlug, setActivePageSlug] = useState(
    propActivePageSlug || "home",
  );

  const scrollPreviewToTop = (behavior: ScrollBehavior = "auto") => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior });
      rendererRootRef.current?.scrollIntoView({ block: "start", behavior });

      let parent = rendererRootRef.current?.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        const canScroll =
          /(auto|scroll)/.test(`${style.overflow}${style.overflowY}`) &&
          parent.scrollHeight > parent.clientHeight;
        if (canScroll) parent.scrollTo({ top: 0, left: 0, behavior });
        parent = parent.parentElement;
      }
    });
  };

  useEffect(() => {
    if (propActivePageSlug !== undefined) {
      setActivePageSlug(propActivePageSlug);
      setSelectedPost(null);
    }
  }, [propActivePageSlug]);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [policies, setPolicies] = useState<any[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "ai"; content: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [industryItems, setIndustryItems] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const saveCookieConsent = (nextConsent: any) => {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 6);
    const payload = {
      necessary: true,
      functional: !!nextConsent.functional,
      analytics: !!nextConsent.analytics,
      marketing: !!nextConsent.marketing,
      version: complianceSettings?.cookieConsentVersion || "cookie_consent_v2",
      timestamp: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    localStorage.setItem("bt_cookie_consent", JSON.stringify(payload));
    setCookieConsent(payload);
    setShowCookiePrefs(false);
  };

  useEffect(() => {
    scrollPreviewToTop("auto");
    trackPinterestPageVisit(window.location.pathname + window.location.search);
  }, [activePageSlug, selectedPost?.id]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    } else {
      // Find the first contact or lead_form section if generic "contact" id fails
      const contactSection = website?.pages.find(p => p.slug === activePageSlug)?.sections.find(s => s.type === "contact");
      if (contactSection) {
        const contactEl = document.getElementById(contactSection.id || "contact");
        contactEl?.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const getTrackingIds = () => {
    let visitorId = localStorage.getItem("bt_visitor_id");
    if (!visitorId) {
      visitorId = generateId();
      localStorage.setItem("bt_visitor_id", visitorId);
    }

    let sessionId = sessionStorage.getItem("bt_session_id");
    if (!sessionId) {
      sessionId = generateId();
      sessionStorage.setItem("bt_session_id", sessionId);
    }

    return { visitorId, sessionId };
  };

  const trackInteraction = (
    eventType: string,
    label: string,
    metadata: Record<string, any> = {},
  ) => {
    if (!website || website.id === "preview") return;

    try {
      const { visitorId, sessionId } = getTrackingIds();
      void fetch("/api/leads/interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          businessId: website.businessId,
          visitorId,
          sessionId,
          eventType,
          label,
          target: metadata.target || null,
          pagePath: window.location.pathname,
          metadata,
        }),
      });
    } catch (error) {
      console.warn("Interaction tracking failed:", error);
    }

    if (
      [
        "lead_form_submit",
        "whatsapp_click",
        "booking_click",
        "appointment_requested",
        "appointment_booked",
        "quote_button_click",
      ].includes(eventType) ||
      metadata.leadIntent === true
    ) {
      trackPinterestLead(eventType, {
        label,
        page_path: window.location.pathname,
        target: metadata.target || null,
      });
    }
  };

  const trackAndScroll = (targetId: string, label: string) => {
    const isEnquiryTarget = ["contact", "booking"].includes(targetId);
    trackInteraction(isEnquiryTarget ? "quote_button_click" : "cta_click", label, {
      target: targetId,
      leadIntent: isEnquiryTarget,
    });
    scrollToSection(targetId);
  };

  const handleButtonAction = (
    label: string,
    explicitAction?: any,
    metadata: Record<string, any> = {},
  ) => {
    if (!website) return;
    const contacts = {
      ...getContactDetailsFromWebsite(website),
      email: contactEmail || getContactDetailsFromWebsite(website).email,
      phone: contactPhone || getContactDetailsFromWebsite(website).phone,
      whatsapp: businessInfo?.whatsapp_number || businessInfo?.whatsapp || getContactDetailsFromWebsite(website).whatsapp,
      bookingUrl: businessInfo?.booking_url || getContactDetailsFromWebsite(website).bookingUrl,
      checkoutUrl: businessInfo?.checkout_url || getContactDetailsFromWebsite(website).checkoutUrl,
    };
    const action = explicitAction?.actionType
      ? explicitAction
      : inferButtonAction(label, contacts, pages);
    const href = buildHrefFromButton(action, contacts);
    const eventName = action.trackingEventName || metadata.eventType || "website_button_clicked";
    trackInteraction(eventName, action.label || label, {
      ...metadata,
      buttonId: action.id,
      buttonLabel: action.label || label,
      actionType: action.actionType,
      target: action.target || href,
      leadIntent: ["contact_form", "whatsapp", "phone", "email", "booking_link", "checkout_link"].includes(action.actionType),
    });

    if (action.actionType === "internal_page") {
      const slug = (action.target || "").replace(/^\/+/, "") || "home";
      setActivePageSlug(slug === "home" ? "" : slug);
      setSelectedPost(null);
      scrollPreviewToTop("smooth");
      return;
    }

    if (action.actionType === "section_anchor" || action.actionType === "contact_form") {
      const target = (action.target || "#contact").replace("#", "");
      scrollToSection(target);
      return;
    }

    if (!href) {
      if (website.id === "preview") toast.warning("This button needs a destination before publishing.");
      return;
    }

    if (action.openInNewTab || ["external_url", "booking_link", "checkout_link", "file_download", "whatsapp"].includes(action.actionType)) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    window.location.href = href;
  };

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 500);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Appointment states
  const [bookingDate, setBookingDate] = useState<Date | null>(new Date());
  const [bookingTime, setBookingTime] = useState<string | null>(null);
  const [bookingForm, setBookingForm] = useState({
    name: "",
    email: "",
    service: "",
  });
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (initialData) return;

    if (isTemplatePreview && templateId) {
      const hardcodedTemplate = Object.values(NICHE_TEMPLATES).find(t => t.id === templateId);
      if (hardcodedTemplate) {
        const previewParams = new URLSearchParams(location.search);
        const businessName = previewParams.get("business")?.trim() || "";
        const city = previewParams.get("city")?.trim() || "";
        const mainService = previewParams.get("service")?.trim() || "";
        const preferredCta = previewParams.get("cta")?.trim() || "";
        const personalizedPages = hardcodedTemplate.pages.map((page) => ({
          ...page,
          id: generateId(),
          sections: page.sections.map((section) => {
            const content = { ...section.content };
            if (section.type === "hero") {
              if (mainService && city) content.headline = `${mainService} in ${city}`;
              else if (mainService) content.headline = `${mainService}, made easier`;
              if (businessName || city) {
                content.subheadline = `${businessName || hardcodedTemplate.name} helps customers${city ? ` in ${city}` : ""} understand the service, trust the business, and take the next step with confidence.`;
              }
              if (preferredCta) content.ctaText = preferredCta;
            }
            if (section.type === "contact" && preferredCta) {
              content.title = preferredCta;
            }
            return { ...section, id: generateId(), content };
          }),
        }));
        setWebsite(normalizeWebsiteForPreview({
          id: "preview",
          businessId: "preview",
          theme: hardcodedTemplate.theme as any,
          pages: personalizedPages as any,
          seo: {
            title: businessName ? `${businessName} | ${hardcodedTemplate.name}` : hardcodedTemplate.name,
            description: hardcodedTemplate.description,
            keywords: [],
          },
          status: "published",
          updatedAt: Date.now(),
        }));
        setLoading(false);
        return;
      }

      // If not hardcoded, fetch from Supabase
      const fetchTemplateFromDb = async () => {
        try {
          console.log("Synthesizing template preview:", templateId);
          const { data, error } = await supabase
            .from("templates")
            .select("*")
            .eq("id", templateId)
            .maybeSingle();

          if (error) throw error;

          if (data && data.config) {
            const config = data.config;
            setWebsite(normalizeWebsiteForPreview({
              id: "preview",
              businessId: "preview",
              theme: config.theme,
              pages: (config.pages || []).map((p: any) => ({
                ...p,
                id: generateId(),
                sections: (p.sections || []).map((s: any) => ({ ...s, id: generateId() }))
              })) as any,
              seo: config.seo || {
                title: data.name,
                description: data.description,
                keywords: [],
              },
              status: "published",
              updatedAt: Date.now(),
            }));
          } else {
            setError("The requested blueprint was not found in our neural archives.");
          }
        } catch (err: any) {
          console.error("Failed to fetch template preview:", err);
          setError(err.message || "Failed to retrieve blueprint.");
        } finally {
          setLoading(false);
        }
      };
      fetchTemplateFromDb();
      return;
    }

    const fetchWebsite = async () => {
      if (!businessId) return;
      try {
        let query = supabase
          .from("websites")
          .select("*")
          .eq("business_id", businessId);

        if (requestedWebsiteId) {
          query = query.eq("id", requestedWebsiteId);
        } else if (!draftPreview) {
          query = query.eq("status", "published");
        }

        const { data, error } = await query
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          const theme = { ...data.theme };
          if (!theme.footer) {
            theme.footer = {
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
            };
          }

          const mappedWebsite: Website = {
            id: data.id,
            businessId: data.business_id,
            theme: theme,
            pages: data.pages,
            seo: data.seo,
            status: data.status,
            updatedAt: new Date(data.updated_at).getTime(),
          };
          setWebsite(normalizeWebsiteForPreview(mappedWebsite));
        } else {
          setError("Your website preview could not be generated. Please try again or contact support.");
        }
      } catch (error) {
        console.error("Fetch website failed:", error);
        setError("Your website preview could not be generated. Please try again or contact support.");
      } finally {
        setLoading(false);
      }
    };
    fetchWebsite();
  }, [businessId, templateId, isTemplatePreview, initialData, draftPreview, requestedWebsiteId, location.search]);

  useEffect(() => {
    // We're using Helmet now, so we don't need manual title updates
  }, [activePageSlug, website]);

  useEffect(() => {
    const hasBlogList = website?.pages.some((p) =>
      p.sections.some((s) => s.type === "blog_list"),
    );
    if (
      (activePageSlug === "blog" || hasBlogList) &&
      businessId &&
      businessId !== "preview"
    ) {
      const fetchPosts = async () => {
        const { data } = await supabase
          .from("posts")
          .select("*")
          .eq("business_id", businessId)
          .eq("status", "published")
          .order("created_at", { ascending: false });

        if (data) {
          setPosts(
            data.map((p: any) => ({
              id: p.id,
              businessId: p.business_id,
              title: p.title,
              content: p.content,
              excerpt: p.excerpt,
              author: p.author,
              status: p.status,
              createdAt: new Date(p.created_at).getTime(),
              updatedAt: new Date(p.updated_at).getTime(),
              imageUrl: p.image_url,
              slug: p.slug,
            })),
          );
        }
      };
      fetchPosts();

      let channel: ReturnType<typeof supabase.channel> | null = null;
      try {
        channel = supabase
          .channel(`public:posts:${businessId}:${Math.random().toString(36).slice(2)}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "posts",
              filter: `business_id=eq.${businessId}`,
            },
            () => fetchPosts(),
          )
          .subscribe((status, error) => {
            if (status === "CHANNEL_ERROR") {
              console.warn("Posts realtime unavailable; falling back to manual fetch.", error);
            }
          });
      } catch (error) {
        console.warn("Posts realtime subscription skipped.", error);
      }

      return () => {
        if (channel) supabase.removeChannel(channel);
      };
    }
  }, [activePageSlug, businessId, website]);

  useEffect(() => {
    if (businessId) {
      const fetchPolicies = async () => {
        const { data } = await supabase
          .from("settings")
          .select("content")
          .eq("id", `business_policies_${businessId}`)
          .single();

        if (data?.content?.policies) {
          setPolicies(
            data.content.policies.filter((p: any) => p.status === "published"),
          );
        }
      };
      fetchPolicies();
    }
  }, [businessId]);

  useEffect(() => {
    if (businessId) {
      if (businessId === "preview") {
        setBusinessInfo({
          name: "Blueprint Demo",
          industry: "Industry Standard",
          business_nature: "Professional Services",
          location: "Premium Location",
        });
        return;
      }
      const fetchBusiness = async () => {
        const { data } = await supabase
          .from("public_businesses")
          .select("*")
          .eq("id", businessId)
          .maybeSingle();
        if (data) {
          setBusinessInfo(data);
          return;
        }

        const { data: privateBusiness } = await supabase
          .from("businesses")
          .select("*")
          .eq("id", businessId)
          .maybeSingle();
        if (privateBusiness) setBusinessInfo(privateBusiness);
      };
      fetchBusiness();
    }

    const searchParams = new URLSearchParams(location.search);
    const refCode = searchParams.get("ref");
    if (refCode && businessId) {
      localStorage.setItem(`ref_${businessId}`, refCode);
    }
  }, [businessId, location.search]);

  useEffect(() => {
    const fetchComplianceSettings = async () => {
      try {
        const { data } = await supabase
          .from("settings")
          .select("content")
          .eq("id", "compliance_market")
          .maybeSingle();
        setComplianceSettings(data?.content || null);
      } catch (error) {
        console.error("Compliance settings fetch failed:", error);
      }
    };
    fetchComplianceSettings();
  }, []);

  useEffect(() => {
    if (businessId && businessId !== "preview") {
      const fetchProducts = async () => {
        const { data } = await supabase
          .from("products")
          .select("*")
          .eq("business_id", businessId)
          .eq("status", "active")
          .order("created_at", { ascending: false });
        if (data) setProducts(data);
      };
      const fetchIndustryItems = async () => {
        const { data, error } = await supabase
          .from("industry_items")
          .select("*")
          .eq("business_id", businessId)
          .eq("is_visible", true)
          .not("status", "in", "(draft,inactive,archived)")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });

        if (!error && data) {
          setIndustryItems(
            data.map((item: any) => ({
              ...item,
              sourceType: "industry_content",
              name: item.title,
              price: item.price_label,
              imageUrl: item.image_url,
              description: item.short_description || item.description,
              category: item.category || item.module_type?.replace(/_/g, " "),
            })),
          );
        }
      };
      fetchProducts();
      fetchIndustryItems();

      let channel: ReturnType<typeof supabase.channel> | null = null;
      try {
        channel = supabase
          .channel(`public:products:${businessId}:${Math.random().toString(36).slice(2)}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "products",
              filter: `business_id=eq.${businessId}`,
            },
            () => fetchProducts(),
          )
          .subscribe((status, error) => {
            if (status === "CHANNEL_ERROR") {
              console.warn("Products realtime unavailable; falling back to manual fetch.", error);
            }
          });
      } catch (error) {
        console.warn("Products realtime subscription skipped.", error);
      }

      return () => {
        if (channel) supabase.removeChannel(channel);
      };
    }
  }, [businessId]);

  const handleCheckout = async (product: any) => {
    if (!product || !businessId) return;
    trackInteraction("checkout_click", product.name || product.title || "Product Checkout", {
      productId: product.id,
      productName: product.name || product.title,
    });
    trackPinterestCheckout("product_checkout", {
      product_id: product.id,
      product_name: product.name || product.title,
      page_path: window.location.pathname,
    });
    setCheckoutLoading(product.id);
    try {
      const response = await fetch("/api/create-product-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          businessId,
          quantity: 1,
          customerEmail: "", // User can enter during Stripe flow
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to initiate checkout");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(
        error.message || "Payment initiation failed. Please try again.",
      );
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
    ]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const context = `
        You are an AI assistant for a business named "${businessInfo?.name || "this business"}".
        Industry: ${businessInfo?.industry || "Unknown"}
        Nature: ${businessInfo?.business_nature || "Unknown"}
        Location: ${businessInfo?.location || "Unknown"}
        
        Website Content Summary:
        ${website?.pages.map((p) => `Page: ${p.title}\nSections: ${p.sections.map((s) => s.type).join(", ")}`).join("\n")}
        
        Answer visitor questions accurately and professionally. If you don't know something, ask them to leave a message via the contact form.
        Keep responses concise and helpful.
      `;

      const text = await generateChatResponse(
        chatMessages.map((m) => ({ role: m.role, content: m.content })),
        context,
        website?.businessId,
      );

      setChatMessages((prev) => [...prev, { role: "ai", content: text }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content:
            "I'm sorry, I'm having trouble connecting right now. Please try again later or use our contact form.",
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };
  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!website) return;
    setFormLoading(true);
    try {
      const refCode = localStorage.getItem(`ref_${website.businessId}`);
      const { visitorId, sessionId } = getTrackingIds();

      const response = await fetch("/api/leads/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: website.businessId,
          ...leadForm,
          visitorId,
          sessionId,
          refCode,
          source: "website_form",
          sourcePage: window.location.pathname,
          formName: "Website contact form",
          consentText: secureFormsEnabled
            ? `By submitting this form, you agree that ${businessInfo?.name || businessInfo?.business_name || website.seo.title.split("|")[0].trim()} may contact you about your enquiry. See our Privacy Policy for details.`
            : "",
          consentTimestamp: new Date().toISOString(),
          marketingConsent: !!leadForm.marketingConsent,
          metadata: {
            activePageSlug,
            websiteId: website.id,
            formVersion: complianceSettings?.consentVersion || "secure_consent_form_v2",
            consentJurisdiction: complianceSettings?.targetMarket || "Global",
            marketingConsentOptional: true,
            sourcePage: window.location.pathname,
          },
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Submission failed");

      setFormSuccess(true);
      trackInteraction("lead_form_submit", "Website contact form", {
        target: activePageSlug,
        sourcePage: window.location.pathname,
      });
      setLeadForm({ name: "", email: "", phone: "", service: "", message: "", marketingConsent: false });
      toast.success("Thank you. Your enquiry has been sent successfully.");
    } catch (error: any) {
      console.error("Lead submission failed:", error);
      toast.error(error.message || "Failed to send message. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!website || website.id === "preview") {
      if (website?.id === "preview")
        toast.info("Booking is simulated in preview mode");
      return;
    }
    if (
      !bookingDate ||
      !bookingTime ||
      !bookingForm.name ||
      !bookingForm.email
    ) {
      toast.error("Please fill in all booking details");
      return;
    }
    setBookingLoading(true);
    try {
      const { visitorId, sessionId } = getTrackingIds();
      await fetch("/api/leads/interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: website.businessId,
          visitorId,
          sessionId,
          eventType: "appointment_requested",
          label: `Appointment request: ${bookingForm.service || "General Inquiry"}`,
          pagePath: window.location.pathname,
          name: bookingForm.name,
          email: bookingForm.email,
          message: `Appointment requested for ${bookingDate.toISOString().split("T")[0]} at ${bookingTime}. Service: ${bookingForm.service || "General Inquiry"}.`,
          metadata: {
            appointmentDate: bookingDate.toISOString().split("T")[0],
            appointmentTime: bookingTime,
            service: bookingForm.service || "General Inquiry",
            activePageSlug,
          },
        }),
      });

      const { error } = await supabase.from("appointments").insert([
        {
          id: generateId(),
          business_id: website.businessId,
          customer_name: bookingForm.name,
          customer_email: bookingForm.email,
          service: bookingForm.service || "General Inquiry",
          date: bookingDate.toISOString().split("T")[0],
          time: bookingTime,
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      try {
        await fetch("/api/leads/interaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId: website.businessId,
            visitorId,
            sessionId,
            eventType: "appointment_booked",
            label: `Appointment booked: ${bookingForm.service || "General Inquiry"}`,
            pagePath: window.location.pathname,
            name: bookingForm.name,
            email: bookingForm.email,
            message: `Appointment booked for ${bookingDate.toISOString().split("T")[0]} at ${bookingTime}. Service: ${bookingForm.service || "General Inquiry"}.`,
            metadata: {
              appointmentDate: bookingDate.toISOString().split("T")[0],
              appointmentTime: bookingTime,
              service: bookingForm.service || "General Inquiry",
            },
          }),
        });
      } catch (trackingError) {
        console.warn("Appointment CRM tracking failed:", trackingError);
      }

      setBookingSuccess(true);
      toast.success("Appointment booked successfully!");
    } catch (error: any) {
      console.error("Booking failed:", error);
      toast.error("Failed to book appointment: " + error.message);
    } finally {
      setBookingLoading(false);
    }
  };

  useEffect(() => {
    if (website?.theme?.customSelectors) {
      const activeSelectors = website.theme.customSelectors.filter(
        (cs) => cs.isEnabled && cs.content,
      );
      if (activeSelectors.length > 0) {
        // Use a small timeout to ensure DOM is ready after React render
        const timer = setTimeout(() => {
          activeSelectors.forEach((cs) => {
            try {
              const elements = document.querySelectorAll(cs.selector);
              elements.forEach((el) => {
                if (cs.content) {
                  el.textContent = cs.content;
                }
              });
            } catch (e) {
              console.warn("Custom selector injection failed:", cs.selector, e);
            }
          });
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [activePageSlug, website]);

  useEffect(() => {
    const style = website?.theme?.style;
    if (!style) return;

    const isDark =
      style === "luxury_dark" ||
      style === "immersive" ||
      style === "glassmorphic";

    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [website?.theme?.style]);

  if (loading)
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500 font-medium animate-pulse text-sm uppercase tracking-widest">
          Crafting Experience...
        </p>
      </div>
    );

  if (error)
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white p-6 text-center">
        <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="h-10 w-10 text-red-300" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Synthesis Interrupt
        </h1>
        <p className="text-slate-500 max-w-md mb-8">
          {error}
        </p>
        <Button
          onClick={() => (window.location.href = "/")}
          variant="outline"
          className="rounded-xl"
        >
          Back to Terminal
        </Button>
      </div>
    );

  if (!website)
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white p-6 text-center">
        <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <Globe className="h-10 w-10 text-slate-300" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          Website Not Found
        </h1>
        <p className="text-slate-500 max-w-md mb-8">
          The website you are looking for doesn't exist or hasn't been published
          yet.
        </p>
        <Button
          onClick={() => (window.location.href = "/")}
          variant="outline"
          className="rounded-xl"
        >
          Back to Bennie Studio
        </Button>
      </div>
    );

  const theme: Website["theme"] = {
    primaryColor: website?.theme?.primaryColor || "#4f46e5",
    secondaryColor: website?.theme?.secondaryColor || "#10b981",
    fontFamily: website?.theme?.fontFamily || "Inter, sans-serif",
    style: (website?.theme?.style || "modern") as any, // Use any briefly or the full union
    designProfile: website?.theme?.designProfile,
    typographyProfile: website?.theme?.typographyProfile,
    spacingProfile: website?.theme?.spacingProfile,
    layoutDensity: website?.theme?.layoutDensity,
    motionProfile: website?.theme?.motionProfile,
    imageProfile: website?.theme?.imageProfile,
    logoUrl: website?.theme?.logoUrl,
    footer: {
      showMenu: website?.theme?.footer?.showMenu ?? true,
      showSocials: website?.theme?.footer?.showSocials ?? true,
      showContact: website?.theme?.footer?.showContact ?? true,
      customText: website?.theme?.footer?.customText || "",
      contactEmail: website?.theme?.footer?.contactEmail || "",
      contactPhone: website?.theme?.footer?.contactPhone || "",
      contactAddress: website?.theme?.footer?.contactAddress || "",
      socialLinks: website?.theme?.footer?.socialLinks || [],
    },
  };
  const designProfile = resolveDesignProfile(theme.designProfile, businessInfo?.industry || website?.seo?.businessType);
  const generationMode = theme.generationMode || "fast";
  const spacingTokens = DESIGN_TOKENS.spacing[theme.spacingProfile || designProfile.spacing];
  const motionTokens = DESIGN_TOKENS.motion[theme.motionProfile || designProfile.motion];
  const pages = website?.pages || [];
  const displayBusinessName = String(
    businessInfo?.name ||
      businessInfo?.business_name ||
      website.seo.title.split("|")[0].trim() ||
      "Business Website",
  );
  const displayBusinessDescriptor = String(
    businessInfo?.industry || businessInfo?.business_nature || "Professional Services",
  );
  const derivedContacts = getContactDetailsFromWebsite(website);
  const contactEmail = theme.footer.contactEmail || businessInfo?.email || derivedContacts.email || "";
  const contactPhone = theme.footer.contactPhone || businessInfo?.phone || derivedContacts.phone || "";
  const normalizedPhone = normalizePhoneForHref(contactPhone);
  const whatsappPhone = normalizePhoneForHref(
    businessInfo?.whatsapp_number || businessInfo?.whatsapp || derivedContacts.whatsapp || contactPhone,
  ).replace(/^\+/, "");
  const whatsappMessage = encodeURIComponent(
    `Hi, I found your website and I'm interested in ${businessInfo?.industry || "your service"}. Can I get more details?`,
  );
  const whatsappHref = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${whatsappMessage}`
    : "";
  const cookieBannerEnabled = complianceSettings?.cookieBannerEnabled !== false;
  const secureFormsEnabled = complianceSettings?.secureFormsEnabled !== false;
  const marketingConsentEnabled = complianceSettings?.marketingConsentEnabled !== false;
  const canLoadAnalytics =
    complianceSettings?.analyticsScriptsEnabled === true &&
    (!complianceSettings?.analyticsRequiresConsent || !!cookieConsent?.analytics);
  const canLoadMarketing =
    complianceSettings?.marketingScriptsEnabled === true &&
    (!complianceSettings?.marketingRequiresConsent || !!cookieConsent?.marketing);
  const generatedPolicies = complianceSettings?.generatedPages || {};
  const legalPolicyLinks = [
    ...((policies || []).map((policy) => ({
      id: policy.id,
      title: policy.title,
      slug: policy.slug,
      content: policy.content,
    }))),
    ...[
      ["privacy", "Privacy Policy", generatedPolicies.privacy],
      ["cookies", "Cookie Policy", generatedPolicies.cookies],
      ["terms", "Terms", generatedPolicies.terms],
      ["subprocessors", "Subprocessors", generatedPolicies.subprocessors],
    ]
      .filter(([, , content]) => !!content)
      .map(([slug, title, content]) => ({
        id: `generated-${slug}`,
        slug,
        title,
        content,
      })),
  ];

  const trackContactAction = (eventType: string, label: string, target?: string) => {
    trackInteraction(eventType, label, {
      target,
      leadIntent: true,
      activePageSlug,
    });
  };

  if (pages.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="h-20 w-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
          <Layers className="h-10 w-10 text-indigo-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          No Content Available
        </h2>
        <p className="text-slate-500 max-w-sm mb-8 italic">
          "The architecture is currently undergoing synthesis. Please check back
          shortly for the full deployment."
        </p>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="rounded-xl border-slate-200"
        >
          Sync Ecosystem
        </Button>
      </div>
    );
  }

  const activePage =
    pages?.find((p) => p.slug === activePageSlug) ||
    pages?.find(
      (p) =>
        (p.slug === "" || p.slug === "home") &&
        (activePageSlug === "" || activePageSlug === "home"),
    ) ||
    pages?.find((p) => p.slug === "home" && activePageSlug === "") ||
    pages?.find((p) => p.title.toLowerCase() === "home") ||
    pages?.[0];

  const homePage =
    pages?.find((p) => p.slug === "home" || p.slug === "") || pages?.[0];

  const mergeSeo = (base: any, override: any) => {
    const result = { ...base };
    if (override?.title) result.title = override.title;
    if (override?.description) result.description = override.description;
    if (override?.ogImage) result.ogImage = override.ogImage;
    if (override?.favicon) result.favicon = override.favicon;
    if (
      override?.keywords &&
      override.keywords.length > 0 &&
      override.keywords[0] !== ""
    ) {
      result.keywords = override.keywords;
    }
    return result;
  };

  const pageSeo = mergeSeo(website.seo, activePage?.seo);
  const currentPageSeo = mergeSeo(
    pageSeo,
    activePage?.sections?.find(
      (s) =>
        s.isVisible !== false &&
        s.seo &&
        (s.seo.title ||
          s.seo.description ||
          (s.seo.keywords && s.seo.keywords.length > 0)),
    )?.seo,
  );

  // Auto-generate defaults for missing SEO
  const displayTitle = selectedPost
    ? `${selectedPost.title} | ${website.seo.title}`
    : currentPageSeo.title ||
      (activePageSlug === "home"
        ? website.seo.title
        : `${activePage?.title} | ${website.seo.title}`);

  const displayDescription = selectedPost
    ? selectedPost.excerpt ||
      (selectedPost.content
        ? selectedPost.content.substring(0, 160).replace(/[#*`]/g, "").trim() +
          "..."
        : website.seo.description)
    : currentPageSeo.description || website.seo.description;
  const displayKeywords =
    currentPageSeo.keywords && currentPageSeo.keywords.length > 0
      ? currentPageSeo.keywords
      : website.seo.keywords;

  const currentUrl = window.location.href.split("?")[0];
  const canonicalUrl = website.seo.canonicalUrl || currentUrl;

  const generateJsonLd = () => {
    if (!website) return null;
    const { seo } = website;
    const schema: any = {
      "@context": "https://schema.org",
      "@type": seo.businessType || "LocalBusiness",
      name: seo.title,
      description: seo.description,
      url: window.location.href,
    };

    if (seo.address)
      schema.address = { "@type": "PostalAddress", streetAddress: seo.address };
    if (seo.phone) schema.telephone = seo.phone;
    if (seo.latitude && seo.longitude) {
      schema.geo = {
        "@type": "GeoCoordinates",
        latitude: seo.latitude,
        longitude: seo.longitude,
      };
    }
    if (seo.priceRange) schema.priceRange = seo.priceRange;
    if (seo.ratingValue) {
      schema.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: seo.ratingValue,
        reviewCount: seo.reviewCount || 1,
      };
    }

    // GEO Enhancements
    if (seo.coreValueProposition) schema.slogan = seo.coreValueProposition;
    if (seo.brandVoice)
      schema.keywords = `${seo.keywords?.join(", ")}, ${seo.brandVoice}`;
    if (seo.knowledgeBaseSummary) schema.abstract = seo.knowledgeBaseSummary;

    return JSON.stringify(schema);
  };

  const getSectionStyles = (section: WebsiteSection) => {
    const styles: React.CSSProperties = {};
    const settings = section.settings || {};

    if (settings.backgroundColor) {
      styles.backgroundColor = settings.backgroundColor;
    } else if (settings.bgColor) {
      // Support both naming variants
      styles.backgroundColor = settings.bgColor;
    }

    if (settings.textColor) {
      styles.color = settings.textColor;
    }

    if (settings.backgroundImage) {
      styles.backgroundImage = `url(${settings.backgroundImage})`;
      styles.backgroundSize = "cover";
      styles.backgroundPosition = "center";
    }

    // Apply custom padding if enabled
    if (settings.useCustomPadding) {
      styles.paddingTop = `${settings.paddingTop ?? 16}px`;
      styles.paddingBottom = `${settings.paddingBottom ?? 16}px`;
      styles.paddingLeft = `${settings.paddingLeft ?? 0}px`;
      styles.paddingRight = `${settings.paddingRight ?? 0}px`;
    }

    return styles;
  };

  const getPaddingClass = (section: WebsiteSection) => {
    const settings = section.settings || {};

    // If using custom padding, style overrides handled in getSectionStyles
    if (settings.useCustomPadding) return "";

    const vPadding = settings.verticalPadding || "small";
    const hPadding = settings.horizontalPadding || "none";

    let classes = "";

    switch (vPadding) {
      case "none":
        classes += "py-0 ";
        break;
      case "small":
        classes += "py-4 sm:py-8 ";
        break;
      case "medium":
        classes += "py-10 sm:py-16 ";
        break;
      case "large":
        classes += "py-16 sm:py-24 ";
        break;
      case "xlarge":
        classes += "py-24 sm:py-32 ";
        break;
      default:
        classes += "py-4 sm:py-8 ";
    }

    switch (hPadding) {
      case "none":
        classes += "px-4 sm:px-6 ";
        break;
      case "small":
        classes += "px-8 sm:px-12 ";
        break;
      case "medium":
        classes += "px-12 sm:px-24 ";
        break;
      case "large":
        classes += "px-16 sm:px-40 ";
        break;
    }

    return classes;
  };

  const getAlignmentClass = (section: WebsiteSection) => {
    const alignment = section.settings?.textAlign;
    if (!alignment) {
      if (
        section.type === "proof" ||
        section.type === "problem" ||
        section.type === "solution"
      )
        return "text-center";
      return "text-center md:text-left"; // Default for most sections
    }

    switch (alignment) {
      case "left":
        return "text-left";
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "";
    }
  };

  const getGoogleFontUrl = (fontFamily: string) => {
    const fontName = fontFamily
      .split(",")[0]
      .replace(/'/g, "")
      .replace(/"/g, "")
      .trim();
    // Pre-fetch all fonts from the FONTS constant to ensure they are visible
    const allFonts = [
      "Inter:wght@100..900",
      "Outfit:wght@100..900",
      "Playfair+Display:ital,wght@0,400..900;1,400..900",
      "JetBrains+Mono:wght@100..800",
      "Public+Sans:ital,wght@0,100..900;1,100..900",
      "Bricolage+Grotesque:opsz,wght@12..96,200..800",
      "Syne:wght@400..800",
      "Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900",
      "Space+Grotesque:wght@300..700",
      "Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800",
      "Roboto+Condensed:wght@100..900",
    ].join("|");

    return `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, "+")}:wght@400;500;600;700;800&family=${allFonts}&display=swap`;
  };

  return (
    <HelmetProvider>
      <div
        ref={rendererRootRef}
        style={{ fontFamily: theme.fontFamily || "Inter, sans-serif" }}
        data-design-profile={designProfile.id}
        data-generation-mode={generationMode}
        data-motion-profile={theme.motionProfile || designProfile.motion}
        data-image-profile={theme.imageProfile || designProfile.imageTreatment}
        className={cn(
          "bt-website-renderer min-h-screen flex flex-col transition-colors duration-500",
          theme.style === "glassmorphic" || theme.style === "immersive"
            ? "bg-slate-950 text-white"
            : "bg-white text-slate-900",
          theme.style === "prestige" ? "bg-[#fcfcfc] text-neutral-900" : "",
          theme.style === "luxury_dark" ? "bg-slate-950 text-neutral-100" : "",
          theme.style === "neumorphic" ? "bg-[#f0f0f3]" : "",
          theme.style === "editorial" ? "bg-[#fdfbf9] text-slate-900" : "",
          theme.style === "authority" ? "bg-[#fdfbf7] text-slate-900" : "",
          theme.style === "corporate" ? "bg-[#fafafa] text-[#1a1c20]" : "",
          `style-${theme.style}`,
        )}
      >
        <Helmet>
          <title>{displayTitle}</title>
          <meta name="description" content={displayDescription} />
          <meta name="keywords" content={displayKeywords.join(", ")} />

          {isFeatureEnabled("advanced_seo") && (
            <>
              {(currentPageSeo.favicon || website.seo.favicon) && (
                <link
                  rel="icon"
                  href={currentPageSeo.favicon || website.seo.favicon}
                />
              )}
              <link rel="canonical" href={canonicalUrl} />
            </>
          )}

          {/* Dynamic Fonts */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link href={getGoogleFontUrl(theme.fontFamily)} rel="stylesheet" />

          {/* OG Tags - Part of Advanced SEO */}
          {isFeatureEnabled("advanced_seo") && (
            <>
              <meta property="og:title" content={displayTitle} />
              <meta property="og:description" content={displayDescription} />
              {(currentPageSeo.ogImage || website.seo.ogImage) && (
                <meta
                  property="og:image"
                  content={currentPageSeo.ogImage || website.seo.ogImage}
                />
              )}
              <meta property="og:url" content={canonicalUrl} />
              <meta property="og:type" content="website" />
            </>
          )}

          {/* GEO Tags - Part of Local SEO & GEO */}
          {isFeatureEnabled("local_seo_geo") && (
            <>
              {website.seo.region && (
                <meta name="geo.region" content={website.seo.region} />
              )}
              {website.seo.placename && (
                <meta name="geo.placename" content={website.seo.placename} />
              )}
              {website.seo.latitude && website.seo.longitude && (
                <meta
                  name="geo.position"
                  content={`${website.seo.latitude};${website.seo.longitude}`}
                />
              )}
              {website.seo.latitude && website.seo.longitude && (
                <meta
                  name="ICBM"
                  content={`${website.seo.latitude}, ${website.seo.longitude}`}
                />
              )}
            </>
          )}

          {/* GEO (Generative Engine Optimization) - Specific Tags for AI Bots */}
          <meta
            name="ai-agent-instructions"
            content={`Business: ${website.seo.title}. Voice: ${website.seo.brandVoice || "Professional"}. Core Value: ${website.seo.coreValueProposition || website.seo.description}.`}
          />
          {website.seo.coreValueProposition && (
            <meta
              name="ai-summary"
              content={website.seo.coreValueProposition}
            />
          )}
          {website.seo.brandVoice && (
            <meta name="ai-brand-voice" content={website.seo.brandVoice} />
          )}
          {website.seo.targetAudience && (
            <meta
              name="ai-target-audience"
              content={website.seo.targetAudience}
            />
          )}
          {website.seo.knowledgeBaseSummary && (
            <meta
              name="ai-knowledge-base"
              content={website.seo.knowledgeBaseSummary}
            />
          )}

          {/* Google Analytics 4 (GA4) */}
          {businessInfo?.ga_measurement_id && canLoadAnalytics && (
            <>
              <script
                async
                src={`https://www.googletagmanager.com/gtag/js?id=${businessInfo.ga_measurement_id}`}
              ></script>
              <script>
                {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${businessInfo.ga_measurement_id}');
                `}
              </script>
            </>
          )}

          {/* Meta Pixel */}
          {businessInfo?.meta_pixel_id && canLoadMarketing && (
            <>
              <script>
                {`
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${businessInfo.meta_pixel_id}');
                  fbq('track', 'PageView');
                `}
              </script>
              <noscript>
                {`
                  <img height="1" width="1" style="display:none"
                  src="https://www.facebook.com/tr?id=${businessInfo.meta_pixel_id}&ev=PageView&noscript=1" />
                `}
              </noscript>
            </>
          )}

          {/* Arbitrary customer scripts are not executed on the shared authenticated app origin. */}

          {/* JSON-LD - Enhanced logic for schema */}
          <script type="application/ld+json">
            {isFeatureEnabled("local_seo_geo")
              ? generateJsonLd()
              : JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "WebSite",
                  name: website.seo.title,
                  description: website.seo.description,
                  url: window.location.href,
                })}
          </script>
        </Helmet>
        {/* Dynamic Styles */}
        <style>{`
        :root {
          --primary: ${theme.primaryColor};
          --secondary: ${theme.secondaryColor};
          --bt-display-font: ${designProfile.displayFont};
          --bt-body-font: ${designProfile.bodyFont};
          --bt-section-padding: ${spacingTokens.section};
          --bt-grid-gap: ${spacingTokens.gap};
          --bt-content-width: ${spacingTokens.content};
          --bt-motion-duration: ${motionTokens.duration};
          --bt-motion-easing: ${motionTokens.easing};
          --font-serif: 'Playfair Display', serif;
          --font-display: 'Space Grotesk', sans-serif;
          --font-romantic: 'Fraunces', serif;
        }
        
        .btn-primary { 
          background-color: var(--primary); 
          color: white; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .text-gradient {
          background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .bt-website-renderer,
        .bt-website-renderer * {
          min-width: 0;
        }

        .bt-website-renderer {
          container-type: inline-size;
          --bt-radius: ${designProfile.radii === "sharp" ? "0.5rem" : designProfile.radii === "round" ? "1.5rem" : "1rem"};
        }

        .bt-website-renderer main > section {
          scroll-margin-top: 6rem;
        }
        .bt-website-renderer main > section h1,
        .bt-website-renderer main > section h2,
        .bt-website-renderer main > section h3 {
          font-family: var(--bt-display-font, inherit);
          text-wrap: balance;
        }
        .bt-website-renderer main > section p {
          max-width: 72ch;
        }
        .bt-website-renderer[data-motion-profile="none"] *,
        .bt-website-renderer[data-motion-profile="subtle"] * {
          animation-duration: var(--bt-motion-duration);
          transition-duration: var(--bt-motion-duration);
        }
        .bt-website-renderer[data-motion-profile="expressive"] main > section:nth-child(even) {
          --bt-section-shift: 0.5rem;
        }
        @media (prefers-reduced-motion: reduce) {
          .bt-website-renderer *, .bt-website-renderer *::before, .bt-website-renderer *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }

        .bt-website-renderer h1,
        .bt-website-renderer h2,
        .bt-website-renderer h3,
        .bt-website-renderer h4,
        .bt-website-renderer p,
        .bt-website-renderer a,
        .bt-website-renderer button,
        .bt-website-renderer span {
          overflow-wrap: anywhere;
          word-break: normal;
        }

        .bt-website-renderer h1 {
          font-size: clamp(2.35rem, 9cqw, 6rem) !important;
          line-height: 0.98 !important;
          letter-spacing: 0 !important;
        }

        .bt-website-renderer h2 {
          font-size: clamp(1.95rem, 6.5cqw, 4.75rem) !important;
          line-height: 1.03 !important;
          letter-spacing: 0 !important;
        }

        .bt-website-renderer h3 {
          font-size: clamp(1.25rem, 3.5cqw, 2.25rem) !important;
          line-height: 1.12 !important;
          letter-spacing: 0 !important;
        }

        .bt-website-renderer .btn-primary,
        .bt-website-renderer button,
        .bt-website-renderer a {
          white-space: normal;
          text-wrap: balance;
        }

        @media (max-width: 640px) {
          .bt-website-renderer h1 {
            font-size: clamp(2rem, 11cqw, 3.5rem) !important;
          }

          .bt-website-renderer h2 {
            font-size: clamp(1.75rem, 8cqw, 3rem) !important;
          }

          .bt-website-renderer .btn-primary,
          .bt-website-renderer button,
          .bt-website-renderer a {
            letter-spacing: 0.04em !important;
          }
        }

        .bento-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        /* Design Style: Editorial Clean */
        .style-editorial { background-color: #fcfaf7; color: #1a1a1a; }
        .style-editorial h1, .style-editorial h2, .style-editorial h3 { font-family: var(--font-serif); letter-spacing: -0.01em; color: #0f172a; }
        .style-editorial .section-container { max-width: 1100px; margin: 0 auto; }
        .style-editorial .btn-primary { border-radius: 0; padding: 1.5rem 3rem; text-transform: uppercase; letter-spacing: 0.2em; background-color: #0f172a; color: white; border: none; font-weight: 700; }
        .style-editorial .btn-primary:hover { background-color: #334155; }

        /* Design Style: Action/Urgency */
        .style-action { background-color: #ffffff; }
        .style-action h1, .style-action h2, .style-action h3 { font-family: var(--font-display); font-weight: 900; text-transform: uppercase; line-height: 1; letter-spacing: -0.02em; }
        .style-action .btn-primary { border-radius: 12px; font-weight: 900; font-size: 1.25rem; padding: 1.5rem 2.5rem; border: none; box-shadow: 0 15px 30px -10px var(--primary); }
        .style-action .btn-primary:hover { transform: translateY(-4px) scale(1.02); }

        /* Design Style: Immersive */
        .style-immersive { background-color: #0c0a09; color: #fafaf9; }
        .style-immersive h1, .style-immersive h2 { font-family: var(--font-romantic); font-weight: 200; letter-spacing: -0.02em; }
        .style-immersive p { color: #d6d3d1; }
        .style-immersive .hero-overlay { background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.8)); }
        .style-immersive .btn-primary { background: transparent; border: 1px solid #fafaf9; border-radius: 100px; padding: 1rem 2.5rem; text-transform: uppercase; font-weight: 500; letter-spacing: 0.1em; color: #fafaf9; }
        .style-immersive .btn-primary:hover { background: #fafaf9; color: #0c0a09; }

        /* Design Style: Authority */
        .style-authority { background-color: #fcfaf8; color: #1c1917; }
        .style-authority h1, .style-authority h2 { font-family: var(--font-serif); font-weight: 800; color: #1c1917; }
        .style-authority p { color: #44403c; }
        .style-authority .btn-primary { border-radius: 12px; font-weight: 700; background-color: #1c1917; color: #fcfaf8; }

        /* Design Style: Modern Corporate */
        .style-corporate { background-color: #ffffff; color: #0f172a; }
        .style-corporate h1, .style-corporate h2, .style-corporate h3 { font-family: var(--font-sans); font-weight: 800; letter-spacing: -0.02em; }
        .style-corporate .btn-primary { border-radius: 8px; font-weight: 600; background-color: var(--primary); }

        /* Design Style: Modern (Default) */
        .style-modern h1, .style-modern h2 { font-family: var(--font-display); font-weight: 800; letter-spacing: -0.04em; }
        .style-modern .btn-primary { border-radius: 9999px; font-weight: 700; }

        /* Design Style: Neumorphic */
        .style-neumorphic { background-color: #f0f2f5; color: #334155; }
        .style-neumorphic .section-container { background: #f0f2f5; box-shadow: 20px 20px 60px #d1d9e6, -20px -20px 60px #ffffff; border-radius: 40px; padding: 4rem; margin-bottom: 4rem; }
        .style-neumorphic .btn-primary { background: #f0f2f5; box-shadow: 8px 8px 16px #d1d9e6, -8px -8px 16px #ffffff; color: var(--primary); border: none; border-radius: 16px; font-weight: 700; }
        .style-neumorphic .btn-primary:hover { box-shadow: inset 8px 8px 16px #d1d9e6, inset -8px -8px 16px #ffffff; transform: scale(0.98); }

        /* Design Style: Brutalist */
        .style-brutalist { background-color: #fff; color: #000; }
        .style-brutalist h1, .style-brutalist h2 { text-transform: uppercase; font-weight: 900; font-size: 4.5rem; line-height: 0.85; letter-spacing: -0.04em; border-bottom: 12px solid #000; padding-bottom: 2rem; margin-bottom: 2.5rem; }
        .style-brutalist .btn-primary { border-radius: 0; border: 4px solid #000; background: #fff; color: #000; font-weight: 900; font-size: 1.25rem; box-shadow: 10px 10px 0px #000; padding: 1.25rem 2.5rem; }
        .style-brutalist .btn-primary:hover { box-shadow: 4px 4px 0px #000; transform: translate(6px, 6px); }

        /* Design Style: Glassmorphic */
        .style-glassmorphic { background: #0f172a; color: #f8fafc; }
        .style-glassmorphic .glass-nav { background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
        .style-glassmorphic .btn-primary { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.2); color: white; font-weight: 600; }
        .style-glassmorphic .btn-primary:hover { background: rgba(255, 255, 255, 0.2); }

        /* Design Style: Prestige / Luxury */
        .style-prestige { background-color: #fcfcfc; color: #1a1a1a; }
        .style-prestige h1, .style-prestige h2, .style-prestige h3 { font-family: var(--font-serif); font-weight: 400; letter-spacing: -0.01em; color: #000; }
        .style-prestige p { color: #404040; font-weight: 500; line-height: 1.8; }
        .style-prestige .section-container { max-width: 1200px; margin: 0 auto; }
        .style-prestige .btn-primary { border: 1px solid #1a1a1a; background: transparent; color: #1a1a1a; border-radius: 9999px; padding: 1.25rem 3.5rem; text-transform: uppercase; letter-spacing: 0.2em; font-size: 0.7rem; font-weight: 700; transition: all 0.5s cubic-bezier(0.19, 1, 0.22, 1); }
        .style-prestige .btn-primary:hover { background: #1a1a1a; color: #fff; letter-spacing: 0.3em; transform: translateY(-2px); }
        .style-prestige .card-premium { border: 1px solid rgba(0,0,0,0.05); background: white; border-radius: 0; padding: 3rem; transition: all 0.4s ease; }
        .style-prestige .card-premium:hover { border-color: #000; }

        /* Design Style: Luxury Dark / Midnight */
        .style-luxury_dark { background-color: #020617; color: #f1f5f9; }
        .style-luxury_dark h1, .style-luxury_dark h2, .style-luxury_dark h3 { font-family: var(--font-display); font-weight: 800; color: #ffffff; text-shadow: 0 0 20px rgba(255,255,255,0.05); }
        .style-luxury_dark p { color: #94a3b8; font-weight: 500; }
        .style-luxury_dark .glass-panel { background: rgba(30, 41, 59, 0.6); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.1); }
        .style-luxury_dark .btn-primary { background: #ffffff; color: #020617; border-radius: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; box-shadow: 0 0 30px rgba(255,255,255,0.2); }
        .style-luxury_dark .btn-primary:hover { background: #f8fafc; transform: scale(1.05) translateY(-2px); box-shadow: 0 0 50px rgba(255,255,255,0.5); }
        .style-luxury_dark .text-gradient { background: linear-gradient(to bottom right, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        /* Dark sections must keep readable text even when a template preset defines global heading colors. */
        section.bg-slate-950 h1,
        section.bg-slate-950 h2,
        section.bg-slate-950 h3,
        section.bg-slate-950 h4,
        section.bg-slate-950 h5,
        section.bg-slate-950 h6,
        section.bg-slate-950 :not(button):not(a).text-slate-950,
        section.bg-slate-950 :not(button):not(a).text-slate-900,
        section.bg-slate-950 :not(button):not(a).text-gray-950,
        section.bg-slate-950 :not(button):not(a).text-gray-900,
        section.bg-slate-950 :not(button):not(a).text-neutral-950,
        section.bg-slate-950 :not(button):not(a).text-neutral-900,
        section.bg-slate-950 :not(button):not(a).text-black {
          color: #f8fafc !important;
        }

        section.bg-slate-950 p,
        section.bg-slate-950 li,
        section.bg-slate-950 .text-slate-700,
        section.bg-slate-950 .text-slate-600,
        section.bg-slate-950 .text-slate-500,
        section.bg-slate-950 .text-gray-700,
        section.bg-slate-950 .text-gray-600,
        section.bg-slate-950 .text-gray-500,
        section.bg-slate-950 .text-neutral-700,
        section.bg-slate-950 .text-neutral-600,
        section.bg-slate-950 .text-neutral-500 {
          color: #cbd5e1 !important;
        }

        section.bg-slate-950 .text-slate-400,
        section.bg-slate-950 .text-gray-400,
        section.bg-slate-950 .text-neutral-400 {
          color: #94a3b8 !important;
        }

        section.bg-slate-950 .text-primary {
          color: color-mix(in srgb, var(--primary) 42%, white 58%) !important;
        }

        section.bg-slate-950 button.bg-white,
        section.bg-slate-950 a.bg-white,
        section.bg-slate-950 .bg-white.text-slate-950,
        section.bg-slate-950 .bg-white.text-slate-900 {
          color: #020617 !important;
        }

        section.bg-slate-950 button.bg-white:hover,
        section.bg-slate-950 a.bg-white:hover {
          color: #ffffff !important;
        }

        section.bg-slate-950 .text-gradient {
          background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .glass-panel {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
        }

        .floating {
          animation: floating 3s ease-in-out infinite;
        }

        @keyframes floating {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }

        .gradient-blur {
          position: absolute;
          width: 50vw;
          height: 50vw;
          filter: blur(100px);
          opacity: 0.15;
          z-index: -1;
          border-radius: 50%;
        }
        {/* Custom Selectors CSS Injection */}
        ${website?.theme?.customSelectors
          ?.filter((cs: any) => cs.isEnabled && cs.css)
          .map(
            (cs: any) => `
          ${cs.selector} { ${cs.css} }
        `,
          )
          .join("\n")}
      `}</style>

        {/* Navigation */}
        {generationMode === "brand_led" ? (
          <nav role="navigation" aria-label="Main Navigation" className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex h-20 max-w-[90rem] items-center justify-between px-5 sm:px-8">
              <button
                onClick={() => {
                  trackInteraction("nav_click", "Logo / Home", { target: "home" });
                  setActivePageSlug("home");
                  setSelectedPost(null);
                  scrollPreviewToTop();
                }}
                className="flex min-w-0 items-center gap-4 text-left"
              >
                {theme.logoUrl ? (
                  <img src={theme.logoUrl} alt={displayBusinessName} className="max-h-9 max-w-[11rem] object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <span className="truncate text-xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-2xl" style={{ fontFamily: theme.displayFont || designProfile.displayFont }}>{displayBusinessName}</span>
                )}
                <span className="hidden border-l border-slate-200 pl-4 text-[9px] font-black uppercase tracking-[0.22em] text-slate-400 xl:block">{displayBusinessDescriptor}</span>
              </button>

              <div className="hidden items-center gap-7 lg:flex">
                {pages.map((page) => (
                  <button key={page.id} onClick={() => { trackInteraction("nav_click", page.title, { target: page.slug || "home" }); setActivePageSlug(page.slug); setSelectedPost(null); scrollPreviewToTop(); }} className={cn("border-b py-2 text-[11px] font-semibold tracking-tight transition-colors", activePageSlug === page.slug ? "border-primary text-slate-950" : "border-transparent text-slate-500 hover:text-slate-950")}>
                    {page.title}
                  </button>
                ))}
                <Button className="h-11 rounded-none px-6 text-[10px] font-black uppercase tracking-[0.18em]" onClick={() => handleButtonAction("Contact Us")}>Get in touch</Button>
              </div>

              <Button variant="ghost" size="icon" className="h-11 w-11 rounded-none lg:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                <span className="sr-only">{isMobileMenuOpen ? "Close Menu" : "Open Menu"}</span>
                <div className="space-y-1.5"><span className="block h-px w-6 bg-slate-950" /><span className="block h-px w-6 bg-slate-950" /><span className="block h-px w-4 bg-slate-950" /></div>
              </Button>
            </div>
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="border-t border-slate-200 bg-white lg:hidden">
                  <div className="mx-auto max-w-[90rem] space-y-1 px-5 py-5">
                    {pages.map((page) => (
                      <button key={page.id} onClick={() => { trackInteraction("nav_click", page.title, { target: page.slug || "home" }); setActivePageSlug(page.slug); setSelectedPost(null); setIsMobileMenuOpen(false); scrollPreviewToTop(); }} className="flex w-full items-center justify-between border-b border-slate-100 py-4 text-left text-base font-semibold text-slate-950">
                        {page.title}<ArrowRight className="h-4 w-4 text-primary" />
                      </button>
                    ))}
                    <Button className="mt-4 h-12 w-full rounded-none text-[10px] font-black uppercase tracking-[0.18em]" onClick={() => { setIsMobileMenuOpen(false); handleButtonAction("Contact Us"); }}>Get in touch</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </nav>
        ) : (
        <nav
          role="navigation"
          aria-label="Main Navigation"
          className={cn(
            "sticky top-0 z-50 transition-all duration-300 w-full",
            theme.style === "glassmorphic"
              ? "glass-nav"
              : theme.style === "luxury_dark" || theme.style === "immersive"
                ? "bg-slate-950/80 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-black/50"
                : "bg-white/80 backdrop-blur-xl border-b border-slate-100",
          )}
        >
          <div className="max-w-7xl mx-auto px-6 h-20 sm:h-24 flex items-center justify-between">
            <button
              onClick={() => {
                trackInteraction("nav_click", "Logo / Home", { target: "home" });
                setActivePageSlug("home");
                setSelectedPost(null);
                scrollPreviewToTop();
              }}
              className="group flex items-center gap-3 focus:outline-none"
            >
              <div className="h-12 w-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20 group-hover:scale-110 transition-transform">
                {theme.logoUrl ? (
                  <img
                    src={theme.logoUrl}
                    alt="Logo"
                    className="h-8 w-8 object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Globe className="h-6 w-6" />
                )}
              </div>
              <div className="flex flex-col">
                <span
                  className={cn(
                    "text-xl font-bold tracking-tight group-hover:text-primary transition-colors text-slate-900",
                    (theme.style === "luxury_dark" ||
                      theme.style === "immersive") &&
                      "text-white",
                  )}
                >
                  {displayBusinessName}
                </span>
                <span className="text-xs uppercase font-black tracking-[0.2em] text-slate-400">
                  {displayBusinessDescriptor}
                </span>
              </div>
            </button>

            <div className="hidden md:flex items-center gap-10">
              {pages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => {
                    trackInteraction("nav_click", page.title, { target: page.slug || "home" });
                    setActivePageSlug(page.slug);
                    setSelectedPost(null);
                    scrollPreviewToTop();
                  }}
                  className={cn(
                    "text-sm font-bold uppercase tracking-widest transition-all relative py-2 group",
                    activePageSlug === page.slug
                      ? "text-primary"
                      : theme.style === "luxury_dark" ||
                          theme.style === "immersive" ||
                          theme.style === "glassmorphic"
                        ? "text-slate-400 hover:text-white"
                        : "text-slate-500 hover:text-slate-900",
                  )}
                >
                  {page.title}
                  <span
                    className={cn(
                      "absolute bottom-0 left-0 w-full h-0.5 bg-primary transition-all duration-300",
                      activePageSlug === page.slug
                        ? "scale-x-100"
                        : "scale-x-0 group-hover:scale-x-100",
                    )}
                  />
                </button>
              ))}
              <Button
                className="btn-primary rounded-full px-8 h-12 font-bold uppercase tracking-widest text-[11px] shadow-2xl shadow-primary/30"
                onClick={() => handleButtonAction("Get Started")}
              >
                Get Started
              </Button>
            </div>

            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-2xl h-12 w-12 hover:bg-slate-100"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <span className="sr-only">
                  {isMobileMenuOpen ? "Close Menu" : "Open Menu"}
                </span>
                <div className="space-y-1.5 w-6 flex flex-col items-end">
                  <motion.div
                    animate={
                      isMobileMenuOpen
                        ? { rotate: 45, y: 7, width: 24 }
                        : { rotate: 0, y: 0, width: 24 }
                    }
                    className={cn(
                      "h-0.5 rounded-full origin-center",
                      theme.style === "luxury_dark" ||
                        theme.style === "immersive" ||
                        theme.style === "glassmorphic"
                        ? "bg-white"
                        : "bg-slate-900",
                    )}
                  />
                  <motion.div
                    animate={isMobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                    className={cn(
                      "h-0.5 w-4 rounded-full",
                      theme.style === "luxury_dark" ||
                        theme.style === "immersive" ||
                        theme.style === "glassmorphic"
                        ? "bg-white"
                        : "bg-slate-900",
                    )}
                  />
                  <motion.div
                    animate={
                      isMobileMenuOpen
                        ? { rotate: -45, y: -7, width: 24 }
                        : { rotate: 0, y: 0, width: 16 }
                    }
                    className={cn(
                      "h-0.5 rounded-full origin-center",
                      theme.style === "luxury_dark" ||
                        theme.style === "immersive" ||
                        theme.style === "glassmorphic"
                        ? "bg-white"
                        : "bg-slate-900",
                    )}
                  />
                </div>
              </Button>
            </div>
          </div>

          {/* Mobile Menu Overlay */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={cn(
                  "md:hidden border-t overflow-hidden shadow-2xl",
                  theme.style === "luxury_dark" ||
                    theme.style === "immersive" ||
                    theme.style === "glassmorphic"
                    ? "bg-slate-900 border-white/10"
                    : "bg-white border-slate-100",
                )}
              >
                <div className="p-6 space-y-4">
                  {pages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => {
                        trackInteraction("nav_click", page.title, { target: page.slug || "home" });
                        setActivePageSlug(page.slug);
                        setSelectedPost(null);
                        setIsMobileMenuOpen(false);
                        scrollPreviewToTop();
                      }}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl text-lg font-black uppercase tracking-widest flex items-center justify-between group",
                        activePageSlug === page.slug
                          ? "bg-primary text-white"
                          : theme.style === "luxury_dark" ||
                              theme.style === "immersive" ||
                              theme.style === "glassmorphic"
                            ? "text-slate-400 hover:bg-white/5"
                            : "text-slate-500 hover:bg-slate-50",
                      )}
                    >
                      {page.title}
                      <ArrowRight
                        className={cn(
                          "h-5 w-5 transition-transform",
                          activePageSlug === page.slug
                            ? "translate-x-0"
                            : "-translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100",
                        )}
                      />
                    </button>
                  ))}
                  <div className="pt-4">
                    <Button
                      className="w-full h-16 btn-primary rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleButtonAction("Get Started");
                      }}
                    >
                      Get Started Now
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
        )}

        {/* Main Content */}
        <main className="flex-1">
          {activePage?.sections
            ?.filter((s: WebsiteSection) => s.isVisible !== false)
            .map((section: WebsiteSection, idx: number) => {
              const sectionId = section.type;
              switch (section.type) {
                case "problem":
                  return (
                    <motion.section
                      id={sectionId}
                      key={section.id || `problem-${idx}`}
                      initial="initial"
                      whileInView="whileInView"
                      viewport={{ once: true, margin: "-100px" }}
                      variants={fadeInUp}
                      className="py-24 sm:py-32 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden"
                    >
                      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
                        <motion.div variants={fadeInUp} className="space-y-8">
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                            The Conflict
                          </span>
                          <h2 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight dark:text-white">
                            {section.content.title || "Challenges Faced"}
                          </h2>
                          <p className="text-xl text-slate-500 leading-relaxed max-w-lg">
                            {section.content.description}
                          </p>
                          <div className="space-y-4">
                            {(section.content.painPoints || []).map(
                              (point: string, pIdx: number) => (
                                <div
                                  key={pIdx}
                                  className="flex gap-4 p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 shadow-sm transition-all hover:translate-x-2"
                                >
                                  <div className="h-6 w-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                                    <X className="h-4 w-4" />
                                  </div>
                                  <span className="text-slate-700 dark:text-slate-200 font-bold">
                                    {point}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        </motion.div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full" />
                          <div className="relative aspect-square bg-slate-950 rounded-[3rem] overflow-hidden shadow-2xl p-8 sm:p-10 border border-white/10">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.22),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(20,184,166,0.16),transparent_40%)]" />
                            <div className="relative z-10 flex h-full flex-col justify-between text-white [&_*]:text-inherit [&_.text-primary]:!text-cyan-300 [&_.text-slate-400]:!text-slate-300 [&_.text-slate-500]:!text-slate-400 [&_.text-white]:!text-white">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-cyan-300">
                                    Conversion Map
                                  </p>
                                  <h3 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-white">
                                    Lead Friction Audit
                                  </h3>
                                </div>
                                <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-cyan-300">
                                  <Activity className="h-7 w-7" />
                                </div>
                              </div>

                              <div className="space-y-3">
                                {(section.content.painPoints || [
                                  "Unclear offer",
                                  "Missing trust proof",
                                  "Slow follow-up",
                                ])
                                  .slice(0, 3)
                                  .map((point: string, pointIdx: number) => (
                                    <motion.div
                                      key={pointIdx}
                                      variants={fadeInUp}
                                      className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm"
                                    >
                                      <div className="mb-3 flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                                          Signal 0{pointIdx + 1}
                                        </span>
                                        <span className="rounded-full bg-cyan-300/15 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-cyan-200">
                                          Actionable
                                        </span>
                                      </div>
                                      <p className="text-base sm:text-lg font-bold leading-snug text-white">
                                        {point}
                                      </p>
                                    </motion.div>
                                  ))}
                              </div>

                              <div className="grid grid-cols-3 gap-3">
                                {[
                                  ["CTA", "Tracked"],
                                  ["CRM", "Synced"],
                                  ["Speed", "Ready"],
                                ].map(([label, value]) => (
                                  <div key={label} className="rounded-2xl bg-white/[0.06] p-4 text-center border border-white/10">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                      {label}
                                    </p>
                                    <p className="mt-1 text-sm font-black text-white">
                                      {value}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.section>
                  );
                case "solution":
                  return (
                    <motion.section
                      id={sectionId}
                      key={section.id || `solution-${idx}`}
                      initial="initial"
                      whileInView="whileInView"
                      viewport={{ once: true, margin: "-100px" }}
                      variants={staggerContainer}
                      className="py-24 sm:py-32 bg-white dark:bg-slate-950 relative"
                    >
                      <div className="max-w-7xl mx-auto px-6 flex flex-col items-center text-center space-y-16">
                        <motion.div variants={fadeInUp} className="space-y-6 max-w-3xl">
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                            The Resolution
                          </span>
                          <h2 className="text-4xl sm:text-7xl font-bold tracking-tight leading-[0.9] dark:text-white">
                            {section.content.title || "Engineering Success"}
                          </h2>
                          <p className="text-xl text-slate-500 leading-relaxed">
                            {section.content.description}
                          </p>
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full">
                          {(section.content.features || []).map(
                            (feature: string, fIdx: number) => (
                              <div key={fIdx} className="space-y-8 group">
                                <div className="h-24 w-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center text-primary mx-auto group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                  <CheckCircle2 className="h-12 w-12" />
                                </div>
                                <h3 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                  {feature}
                                </h3>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </motion.section>
                  );
                case "proof":
                  if (
                    section.content.verified !== true &&
                    section.content.providedByBusiness !== true &&
                    !section.content.sourceUrl &&
                    !section.content.sourceLabel
                  ) {
                    return null;
                  }
                  const proofVariant = section.settings?.variant || "metrics";
                  const proofItems = section.content.items || [];
                  const proofLogos = section.content.logos || [];
                  if (["logo_wall", "certification_strip", "trust_strip"].includes(proofVariant) && (proofItems.length || proofLogos.length)) {
                    return (
                      <motion.section
                        id={sectionId}
                        key={section.id || `proof-${idx}`}
                        initial="initial"
                        whileInView="whileInView"
                        viewport={{ once: true, margin: "-80px" }}
                        variants={staggerContainer}
                        className="border-y border-slate-200 bg-[#f8f7f4] py-16 sm:py-20"
                      >
                        <div className="mx-auto max-w-7xl px-6">
                          <motion.div variants={fadeInUp} className="grid gap-8 lg:grid-cols-12 lg:items-end">
                            <div className="lg:col-span-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Evidence</p>
                              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl" style={{ fontFamily: theme.displayFont || designProfile.displayFont }}>
                                {section.content.title || "Proof"}
                              </h2>
                              {section.content.description && <p className="mt-5 text-sm leading-7 text-slate-600">{section.content.description}</p>}
                            </div>
                            <div className="lg:col-span-8">
                              {proofLogos.length > 0 && (
                                <div className="grid grid-cols-2 border-l border-t border-slate-200 sm:grid-cols-3">
                                  {proofLogos.map((logo: any, logoIndex: number) => {
                                    const url = typeof logo === "string" ? logo : logo?.url || logo?.imageUrl;
                                    const name = typeof logo === "string" ? `Logo ${logoIndex + 1}` : logo?.name || logo?.label || `Logo ${logoIndex + 1}`;
                                    return (
                                      <div key={logoIndex} className="flex min-h-28 items-center justify-center border-b border-r border-slate-200 bg-white p-6">
                                        {url ? <img src={url} alt={name} className="max-h-10 max-w-[9rem] object-contain grayscale" loading="lazy" referrerPolicy="no-referrer" /> : <span className="text-sm font-semibold text-slate-700">{name}</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {proofItems.length > 0 && (
                                <div className="divide-y divide-slate-200 border-y border-slate-200">
                                  {proofItems.map((item: any, itemIndex: number) => (
                                    <div key={itemIndex} className="grid gap-3 py-6 sm:grid-cols-12">
                                      <p className="text-[10px] font-black tracking-[0.22em] text-primary sm:col-span-1">{String(itemIndex + 1).padStart(2, "0")}</p>
                                      <p className="text-lg font-semibold text-slate-950 sm:col-span-4">{typeof item === "string" ? item : item.title}</p>
                                      {typeof item === "object" && item.description && <p className="text-sm leading-7 text-slate-600 sm:col-span-7">{item.description}</p>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        </div>
                      </motion.section>
                    );
                  }
                  return (
                    <motion.section
                      id={sectionId}
                      key={section.id || `proof-${idx}`}
                      initial="initial"
                      whileInView="whileInView"
                      viewport={{ once: true, margin: "-100px" }}
                      variants={staggerContainer}
                      className="py-24 sm:py-32 bg-slate-950 text-white relative overflow-hidden"
                    >
                      <div className="absolute inset-0">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.12),transparent)]" />
                        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_100%,rgba(99,102,241,0.08),transparent)]" />
                      </div>
                      <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                        {section.content.title && (
                          <div className="mb-20 space-y-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">
                              Quantifiable Excellence
                            </span>
                            <h2 className="text-4xl sm:text-6xl font-bold tracking-tight">
                              {section.content.title}
                            </h2>
                          </div>
                        )}
                        <div
                          className={cn(
                            "grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8",
                            (section.content.stats || []).length === 3
                              ? "lg:grid-cols-3"
                              : "lg:grid-cols-4",
                          )}
                        >
                          {(section.content.stats || []).map(
                            (stat: any, sIdx: number) => (
                              <div
                                key={sIdx}
                                className="relative group p-8 sm:p-10 rounded-[2rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-500 overflow-hidden"
                              >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
                                <div className="space-y-4">
                                  <div className="whitespace-nowrap text-[clamp(2.75rem,7vw,4rem)] font-black text-white tracking-tighter tabular-nums leading-none">
                                    {formatStatValue(stat.value)}
                                  </div>
                                  <div className="flex flex-col items-center gap-3">
                                    <div className="h-0.5 w-8 bg-primary rounded-full group-hover:w-16 transition-all duration-500" />
                                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em]">
                                      {stat.label}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </motion.section>
                  );
                case "hero":
                  if (["brand_media", "editorial_split", "full_bleed_editorial", "statement_media"].includes(section.settings?.variant || "")) {
                    const heroVariant = section.settings?.variant || "editorial_split";
                    const hasHeroImage = Boolean(section.content.imageUrl);

                    if (heroVariant === "statement_media") {
                      return (
                        <motion.section
                          id={sectionId}
                          key={section.id || `hero-${idx}`}
                          initial="initial"
                          animate="animate"
                          variants={staggerContainer}
                          className="relative overflow-hidden border-b border-slate-200 bg-[#f4f2ed]"
                        >
                          <div className="pointer-events-none absolute inset-0">
                            <div className="absolute -right-[10vw] top-[8%] h-[34vw] w-[34vw] min-h-[20rem] min-w-[20rem] rounded-full border border-primary/20" />
                            <div className="absolute -right-[2vw] top-[16%] h-[22vw] w-[22vw] min-h-[13rem] min-w-[13rem] rounded-full bg-primary/10" />
                          </div>
                          <div className="relative mx-auto flex min-h-[78vh] max-w-[90rem] flex-col justify-between px-6 py-16 sm:px-10 sm:py-20 lg:px-16">
                            <motion.div variants={fadeInUp} className="flex items-center gap-4">
                              <span className="h-px w-12 bg-primary" />
                              <p className="text-[10px] font-black uppercase tracking-[0.32em] text-slate-500">{displayBusinessDescriptor}</p>
                            </motion.div>
                            <motion.div variants={fadeInUp} className="max-w-[78rem] py-16">
                              <h1 className="text-[clamp(3.8rem,9.5vw,9.5rem)] font-semibold leading-[0.84] tracking-[-0.065em] text-slate-950" style={{ fontFamily: theme.displayFont || designProfile.displayFont }}>
                                {section.content.headline || displayBusinessName}
                              </h1>
                              <div className="mt-10 grid gap-8 border-t border-slate-300 pt-8 md:grid-cols-12">
                                <p className="max-w-2xl text-lg font-medium leading-8 text-slate-600 md:col-span-7">{section.content.subheadline}</p>
                                <div className="md:col-span-5 md:justify-self-end">
                                  <Button size="lg" className="h-14 rounded-none px-8 text-[11px] font-black uppercase tracking-[0.18em]" onClick={() => handleButtonAction(section.content.ctaText || "Contact Us", section.content.buttonAction, { eventType: "hero_cta_clicked", sectionId: section.id })}>
                                    {section.content.ctaText || "Contact Us"} <ArrowRight className="ml-2 h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        </motion.section>
                      );
                    }

                    if (heroVariant === "full_bleed_editorial") {
                      return (
                        <motion.section
                          id={sectionId}
                          key={section.id || `hero-${idx}`}
                          initial="initial"
                          animate="animate"
                          variants={staggerContainer}
                          className="relative min-h-[78vh] overflow-hidden bg-slate-950 text-white"
                        >
                          {hasHeroImage ? (
                            <>
                              <img src={section.content.imageUrl} alt={section.content.imageAlt || displayBusinessName} className="absolute inset-0 h-full w-full object-cover" loading="eager" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/75 to-slate-950/15" />
                            </>
                          ) : (
                            <div className="absolute inset-0">
                              <div className="absolute -right-24 -top-24 h-[32rem] w-[32rem] rounded-full border border-white/10" />
                              <div className="absolute bottom-0 right-[15%] h-[22rem] w-[22rem] rounded-full bg-primary/20 blur-3xl" />
                            </div>
                          )}
                          <div className="relative mx-auto flex min-h-[78vh] max-w-[90rem] items-end px-6 py-16 sm:px-10 sm:py-20 lg:px-16 lg:py-24">
                            <motion.div variants={fadeInUp} className="max-w-5xl">
                              <p className="mb-6 text-[10px] font-black uppercase tracking-[0.34em] text-white/55">{displayBusinessDescriptor}</p>
                              <h1 className="text-[clamp(3.5rem,8vw,8rem)] font-semibold leading-[0.88] tracking-[-0.06em]" style={{ fontFamily: theme.displayFont || designProfile.displayFont }}>
                                {section.content.headline || displayBusinessName}
                              </h1>
                              <div className="mt-9 flex max-w-3xl flex-col gap-8 border-t border-white/20 pt-7 sm:flex-row sm:items-end sm:justify-between">
                                <p className="max-w-2xl text-lg font-medium leading-8 text-white/70">{section.content.subheadline}</p>
                                <Button size="lg" className="h-14 shrink-0 rounded-none bg-white px-7 text-[10px] font-black uppercase tracking-[0.18em] text-slate-950 hover:bg-white/90" onClick={() => handleButtonAction(section.content.ctaText || "Contact Us", section.content.buttonAction, { eventType: "hero_cta_clicked", sectionId: section.id })}>
                                  {section.content.ctaText || "Contact Us"} <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </div>
                            </motion.div>
                          </div>
                        </motion.section>
                      );
                    }

                    const brandHero = heroVariant === "brand_media";
                    return (
                      <motion.section
                        id={sectionId}
                        key={section.id || `hero-${idx}`}
                        initial="initial"
                        whileInView="whileInView"
                        viewport={{ once: true }}
                        variants={staggerContainer}
                        className={cn(
                          "relative overflow-hidden border-b",
                          brandHero ? "text-white border-white/10" : "bg-[#f8f7f4] text-slate-950 border-slate-200",
                        )}
                        style={brandHero ? { backgroundColor: theme.primaryColor } : undefined}
                      >
                        <div className="mx-auto grid min-h-[72vh] max-w-[90rem] grid-cols-1 items-stretch lg:grid-cols-12">
                          <motion.div variants={fadeInUp} className="flex flex-col justify-center px-6 py-20 sm:px-10 lg:col-span-7 lg:px-16 lg:py-28">
                            <div className={cn("mb-8 h-px w-16", brandHero ? "bg-white/70" : "bg-primary")} />
                            <p className={cn("mb-5 text-[10px] font-black uppercase tracking-[0.32em]", brandHero ? "text-white/70" : "text-primary")}>
                              {displayBusinessDescriptor}
                            </p>
                            <h1
                              className="max-w-4xl text-[clamp(3rem,7vw,7.2rem)] font-semibold leading-[0.9] tracking-[-0.055em]"
                              style={{ fontFamily: theme.displayFont || designProfile.displayFont }}
                            >
                              {section.content.headline || displayBusinessName}
                            </h1>
                            <p className={cn("mt-8 max-w-2xl text-lg font-medium leading-8 sm:text-xl", brandHero ? "text-white/80" : "text-slate-600")}>
                              {section.content.subheadline}
                            </p>
                            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                              <Button
                                size="lg"
                                className={cn(
                                  "h-14 rounded-none px-8 text-sm font-black uppercase tracking-widest",
                                  brandHero ? "bg-white text-slate-950 hover:bg-white/90" : "btn-primary",
                                )}
                                onClick={() => handleButtonAction(section.content.ctaText || "Contact Us", section.content.buttonAction, { eventType: "hero_cta_clicked", sectionId: section.id })}
                              >
                                {section.content.ctaText || "Contact Us"}
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </div>
                          </motion.div>
                          <motion.div variants={fadeInUp} className={cn("relative min-h-[22rem] lg:col-span-5 lg:min-h-full", brandHero ? "bg-black/10" : "bg-white")}>
                            {hasHeroImage ? (
                              <img
                                src={section.content.imageUrl}
                                alt={section.content.imageAlt || displayBusinessName}
                                className="absolute inset-0 h-full w-full object-cover"
                                loading="eager"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className={cn("absolute inset-6 flex flex-col justify-end border p-8 sm:inset-10", brandHero ? "border-white/25 bg-white/[0.04]" : "border-slate-200 bg-slate-50")}>
                                <div className={cn("mb-auto h-16 w-16 border", brandHero ? "border-white/30" : "border-primary/30")} />
                                <p className={cn("text-[10px] font-black uppercase tracking-[0.28em]", brandHero ? "text-white/60" : "text-slate-400")}>Customer media slot</p>
                                <p className={cn("mt-3 max-w-sm text-xl font-semibold leading-7", brandHero ? "text-white" : "text-slate-900")}>Add real photography, product UI, projects or brand artwork here.</p>
                              </div>
                            )}
                          </motion.div>
                        </div>
                      </motion.section>
                    );
                  }
                  // Premium Default Hero
                  return (
                    <motion.section
                      id={sectionId}
                      key={section.id || `hero-${idx}`}
                      initial="initial"
                      whileInView="whileInView"
                      viewport={{ once: true }}
                      variants={staggerContainer}
                      className="relative flex min-h-[72vh] items-center overflow-hidden px-0 py-16 sm:min-h-[82vh] sm:py-24 lg:py-32"
                    >
                      {/* Decorative Background Elements */}
                      <div className="gradient-blur bg-primary -top-[10%] -left-[10%]" />
                      <div className="gradient-blur bg-secondary -bottom-[10%] -right-[10%] opacity-10" />

                      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-5 sm:px-6 lg:grid-cols-12 lg:gap-16">
                        <motion.div variants={fadeInUp} className="space-y-7 sm:space-y-10 lg:col-span-12 xl:col-span-7">
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20"
                          >
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                              Business Website Ready
                            </span>
                          </motion.div>

                          <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="max-w-full break-words text-[clamp(2.35rem,9cqw,6rem)] font-bold leading-[0.95] tracking-normal"
                          >
                            {(
                              section.content.headline ||
                              displayBusinessName
                            )
                              .split(" ")
                              .map((word: string, i: number, arr: string[]) => (
                                <span
                                  key={i}
                                  className={
                                    i === arr.length - 1 ? "text-gradient" : ""
                                  }
                                >
                                  {word}{" "}
                                </span>
                              ))}
                          </motion.h1>

                          <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.8 }}
                            className="max-w-2xl text-base font-medium leading-relaxed text-slate-500 sm:text-xl lg:text-2xl"
                          >
                            {section.content.subheadline}
                          </motion.p>

                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4, duration: 0.8 }}
                            className="flex flex-col gap-4 pt-4 sm:flex-row sm:gap-6 sm:pt-6"
                          >
                            <Button
                              size="lg"
                              onClick={() => handleButtonAction(section.content.ctaText || "Contact Us", section.content.buttonAction, {
                                eventType: "hero_cta_clicked",
                                sectionId: section.id,
                              })}
                              className="btn-primary group h-auto min-h-14 rounded-2xl px-6 py-4 text-sm font-bold shadow-2xl shadow-primary/30 sm:px-10 sm:text-base lg:px-12 lg:text-lg"
                            >
                              {section.content.ctaText}
                              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-2 transition-transform" />
                            </Button>
                            <Button
                              variant="outline"
                              size="lg"
                              className="h-auto min-h-14 rounded-2xl border-slate-200 px-6 py-4 text-sm font-bold hover:bg-slate-50 sm:px-10 sm:text-base lg:text-lg"
                              onClick={() => handleButtonAction("Learn More", undefined, { sectionId: section.id })}
                            >
                              Learn More
                            </Button>
                          </motion.div>

                        </motion.div>

                        <div className="lg:col-span-12 xl:col-span-5 relative">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, rotate: 5 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            transition={{ duration: 1.2, ease: "circOut" }}
                            className="relative z-10 aspect-[4/5] rounded-[3rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border-8 border-white group"
                          >
                            {section.content.imageUrl ? (
                              <img
                                src={section.content.imageUrl}
                                alt={section.content.imageAlt || displayBusinessName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-slate-950 p-8 text-white">
                                <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border border-white/10" />
                                <div className="absolute -bottom-24 -left-10 h-80 w-80 rounded-full border border-primary/40" />
                                <div className="relative h-12 w-12 border border-white/25" />
                                <div className="relative">
                                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50">Customer media slot</p>
                                  <p className="mt-3 max-w-xs text-2xl font-semibold leading-tight">Real business photography or product media goes here.</p>
                                </div>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                          </motion.div>

                        </div>
                      </div>
                    </motion.section>
                  );
                case "services":
                  if (section.settings?.variant === "brand_families") {
                    return (
                      <motion.section
                        id={sectionId}
                        key={section.id || `services-${idx}`}
                        initial="initial"
                        whileInView="whileInView"
                        viewport={{ once: true, margin: "-80px" }}
                        variants={staggerContainer}
                        className="bg-white py-20 sm:py-28"
                      >
                        <div className="mx-auto max-w-[90rem] px-6 sm:px-10">
                          <motion.div variants={fadeInUp} className="grid gap-8 border-b border-slate-200 pb-12 lg:grid-cols-12 lg:items-end">
                            <div className="lg:col-span-8">
                              <p className="text-[10px] font-black uppercase tracking-[0.32em] text-primary">Capabilities</p>
                              <h2 className="mt-4 max-w-5xl text-5xl font-semibold tracking-[-0.045em] text-slate-950 sm:text-7xl" style={{ fontFamily: theme.displayFont || designProfile.displayFont }}>
                                {section.content.title || "What we do"}
                              </h2>
                            </div>
                            <p className="max-w-xl text-base leading-7 text-slate-600 lg:col-span-4 lg:justify-self-end">{section.content.description}</p>
                          </motion.div>
                          <div className="divide-y divide-slate-200">
                            {(section.content.items || []).map((item: any, itemIndex: number) => (
                              <motion.article key={item.id || itemIndex} variants={fadeInUp} className="grid min-h-[18rem] gap-8 py-10 lg:grid-cols-12 lg:items-stretch">
                                <div className="flex flex-col justify-between lg:col-span-1">
                                  <p className="text-[10px] font-black tracking-[0.24em] text-primary">{String(itemIndex + 1).padStart(2, "0")}</p>
                                </div>
                                <div className="flex flex-col justify-between lg:col-span-5">
                                  <h3 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl">{item.title}</h3>
                                  <p className="mt-6 max-w-xl text-base leading-7 text-slate-600">{item.description}</p>
                                </div>
                                <div className="lg:col-span-6">
                                  {item.imageUrl ? (
                                    <div className="h-full min-h-[16rem] overflow-hidden bg-slate-100">
                                      <img src={item.imageUrl} alt={item.imageAlt || item.title || "Service"} className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                                    </div>
                                  ) : (
                                    <div className="flex h-full min-h-[16rem] items-end border border-slate-200 bg-[#f8f7f4] p-7">
                                      <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">Optional customer media</p>
                                        <button onClick={() => trackInteraction("service_click", item.title || "Service", { target: section.id || "services" })} className="mt-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-950">
                                          Explore capability <ArrowRight className="h-4 w-4 text-primary" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.article>
                            ))}
                          </div>
                        </div>
                      </motion.section>
                    );
                  }

                  if (["editorial_list", "alternating"].includes(section.settings?.variant || "")) {
                    return (
                      <motion.section
                        id={sectionId}
                        key={section.id || `services-${idx}`}
                        initial="initial"
                        whileInView="whileInView"
                        viewport={{ once: true, margin: "-80px" }}
                        variants={staggerContainer}
                        className="bg-white py-20 sm:py-28"
                      >
                        <div className="mx-auto max-w-7xl px-6">
                          <motion.div variants={fadeInUp} className="grid gap-8 border-b border-slate-200 pb-12 lg:grid-cols-12 lg:items-end">
                            <div className="lg:col-span-7">
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Capabilities</p>
                              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-6xl" style={{ fontFamily: theme.displayFont || designProfile.displayFont }}>
                                {section.content.title || "What We Do"}
                              </h2>
                            </div>
                            <p className="max-w-xl text-base font-medium leading-7 text-slate-600 lg:col-span-5 lg:justify-self-end">
                              {section.content.description}
                            </p>
                          </motion.div>
                          <div className="divide-y divide-slate-200">
                            {(section.content.items || []).map((item: any, itemIndex: number) => (
                              <motion.div key={itemIndex} variants={fadeInUp} className="grid gap-5 py-8 sm:py-10 lg:grid-cols-12 lg:items-start">
                                <div className="text-xs font-black tracking-[0.22em] text-primary lg:col-span-1">{String(itemIndex + 1).padStart(2, "0")}</div>
                                <h3 className="text-2xl font-semibold tracking-tight text-slate-950 lg:col-span-4 sm:text-3xl">{item.title}</h3>
                                <p className="text-base leading-7 text-slate-600 lg:col-span-5">{item.description}</p>
                                <div className="lg:col-span-2 lg:justify-self-end">
                                  {item.imageUrl ? (
                                    <div className="aspect-[4/3] w-full max-w-[10rem] overflow-hidden bg-slate-100">
                                      <img src={item.imageUrl} alt={item.imageAlt || item.title || "Service"} className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                                    </div>
                                  ) : (
                                    <button onClick={() => trackInteraction("service_click", item.title || "Service", { target: section.id || "services" })} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-950">
                                      Learn more <ArrowRight className="h-4 w-4 text-primary" />
                                    </button>
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </motion.section>
                    );
                  }
                  return (
                    <motion.section
                      id={sectionId}
                      key={section.id || `services-${idx}`}
                      initial="initial"
                      whileInView="whileInView"
                      viewport={{ once: true, margin: "-100px" }}
                      variants={staggerContainer}
                      className="py-24 sm:py-32 relative overflow-hidden section-container dark:bg-slate-950"
                    >
                      <div className="max-w-7xl mx-auto px-6 relative z-10">
                        <motion.div variants={fadeInUp} className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                          <div className="space-y-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                              Execution Strategy
                            </span>
                            <h2 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight dark:text-white">
                              {section.content.title || "Our Services"}
                            </h2>
                          </div>
                          <p className="text-lg text-slate-500 max-w-md">
                            {section.content.description ||
                              "We deliver specialized solutions tailored to your unique market challenges."}
                          </p>
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {(section.content.items || []).map(
                            (item: any, sIdx: number) => (
                              <motion.div
                                key={sIdx}
                                variants={fadeInUp}
                                whileHover={{ y: -10 }}
                                className="group p-8 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-white/5 transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)]"
                              >
                                <div className="h-16 w-16 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center text-primary shadow-sm mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                                  <Zap className="h-8 w-8" />
                                </div>
                                <h3 className="text-2xl font-bold mb-4 dark:text-white">
                                  {item.title}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                                  {item.description}
                                </p>
                                <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-white/5">
                                  <span className="text-sm font-black text-primary uppercase tracking-widest">
                                    {item.price || "Consulting"}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="rounded-full group-hover:bg-primary group-hover:text-white transition-colors"
                                    onClick={() =>
                                      trackInteraction("service_click", item.title || "Service", {
                                        target: section.id || "services",
                                        serviceTitle: item.title,
                                      })
                                    }
                                  >
                                    <ArrowRight className="h-4 w-4" />
                                  </Button>
                                </div>
                              </motion.div>
                            ),
                          )}
                        </div>
                      </div>
                    </motion.section>
                  );
                case "about": {
                  const reverseStory = section.settings?.variant === "split_media_right";
                  const storyImage = section.content.imageUrl;
                  return (
                    <motion.section
                      id={sectionId}
                      key={section.id || `about-${idx}`}
                      initial="initial"
                      whileInView="whileInView"
                      viewport={{ once: true, margin: "-80px" }}
                      variants={staggerContainer}
                      className="bg-[#f4f2ed] py-20 sm:py-28"
                    >
                      <div className={cn("mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-12 lg:items-center", reverseStory && "lg:[&>*:first-child]:order-2")}>
                        <motion.div variants={fadeInUp} className="lg:col-span-6">
                          {storyImage ? (
                            <div className="aspect-[5/4] overflow-hidden bg-slate-200">
                              <img src={storyImage} alt={section.content.imageAlt || displayBusinessName} className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                            </div>
                          ) : (
                            <div className="flex aspect-[5/4] flex-col justify-end border border-slate-300 bg-white/60 p-8">
                              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Customer story image</p>
                              <p className="mt-3 max-w-sm text-xl font-semibold leading-7 text-slate-900">Use real founder, team, office, project or service photography.</p>
                            </div>
                          )}
                        </motion.div>
                        <motion.div variants={fadeInUp} className="lg:col-span-6 lg:px-8">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Our story</p>
                          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-6xl" style={{ fontFamily: theme.displayFont || designProfile.displayFont }}>
                            {section.content.title || `About ${displayBusinessName}`}
                          </h2>
                          <div className="mt-8 max-w-xl text-base font-medium leading-8 text-slate-600 prose-p:mb-5">
                            <ReactMarkdown>{section.content.text || ""}</ReactMarkdown>
                          </div>
                        </motion.div>
                      </div>
                    </motion.section>
                  );
                }
                case "benefits":
                  if (["editorial_values", "numbered_principles"].includes(section.settings?.variant || "")) {
                    return (
                      <motion.section key={section.id || `benefits-${idx}`} initial="initial" whileInView="whileInView" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer} className="bg-white py-20 sm:py-28">
                        <div className="mx-auto max-w-7xl px-6">
                          <motion.div variants={fadeInUp} className="max-w-3xl">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Principles</p>
                            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-6xl" style={{ fontFamily: theme.displayFont || designProfile.displayFont }}>{section.content.title || "How We Work"}</h2>
                          </motion.div>
                          <div className="mt-14 grid border-y border-slate-200 sm:grid-cols-2 lg:grid-cols-4">
                            {(section.content.items || []).map((item: any, itemIndex: number) => (
                              <motion.div key={itemIndex} variants={fadeInUp} className="border-b border-slate-200 p-7 sm:border-r lg:border-b-0 lg:p-9 last:border-r-0">
                                <p className="text-[10px] font-black tracking-[0.25em] text-primary">{String(itemIndex + 1).padStart(2, "0")}</p>
                                <h3 className="mt-8 text-xl font-semibold tracking-tight text-slate-950">{typeof item === "string" ? item : item.title}</h3>
                                {typeof item === "object" && item.description && <p className="mt-4 text-sm leading-7 text-slate-600">{item.description}</p>}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </motion.section>
                    );
                  }
                  return (
                    <motion.section
                      key={section.id || `benefits-${idx}`}
                      initial="initial"
                      whileInView="whileInView"
                      viewport={{ once: true, margin: "-100px" }}
                      variants={staggerContainer}
                      style={getSectionStyles(section)}
                      className={cn("relative overflow-hidden bg-white px-4 sm:px-6", getPaddingClass(section))}
                    >
                      <div className="mx-auto max-w-7xl space-y-12">
                        <motion.div variants={fadeInUp} className="mx-auto max-w-3xl text-center">
                          <Badge
                            variant="outline"
                            className="mb-5 rounded-full border-primary/20 bg-primary/5 px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary"
                          >
                            Why Choose Us
                          </Badge>
                          <h2 className="text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-6xl">
                            {section.content.title || "Built Around What Customers Need"}
                          </h2>
                        </motion.div>

                        <div className="grid gap-6 md:grid-cols-3">
                          {(section.content.items || []).map((item: any, itemIndex: number) => (
                            <motion.div
                              key={item.id || `benefit-${itemIndex}`}
                              variants={fadeInUp}
                              className="rounded-[2rem] border border-slate-100 bg-slate-50/80 p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl"
                            >
                              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                                <CheckCircle2 className="h-6 w-6" />
                              </div>
                              <h3 className="text-xl font-black tracking-tight text-slate-950">
                                {typeof item === "string" ? item : item.title || `Benefit ${itemIndex + 1}`}
                              </h3>
                              {typeof item === "object" && item.description && (
                                <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
                                  {item.description}
                                </p>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.section>
                  );
                case "features":
                  if (section.settings?.variant === "capability_matrix") {
                    return (
                      <motion.section
                        key={section.id || `features-${idx}`}
                        initial="initial"
                        whileInView="whileInView"
                        viewport={{ once: true, margin: "-80px" }}
                        variants={staggerContainer}
                        className="bg-slate-950 py-20 text-white sm:py-28"
                      >
                        <div className="mx-auto max-w-7xl px-6">
                          <motion.div variants={fadeInUp} className="grid gap-8 lg:grid-cols-12 lg:items-end">
                            <div className="lg:col-span-7">
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/45">Capability system</p>
                              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl" style={{ fontFamily: theme.displayFont || designProfile.displayFont }}>{section.content.title || "Built to work together"}</h2>
                            </div>
                            <p className="max-w-xl text-sm leading-7 text-slate-400 lg:col-span-5 lg:justify-self-end">{section.content.description}</p>
                          </motion.div>
                          <div className="mt-14 grid border-l border-t border-white/10 sm:grid-cols-2">
                            {(section.content.items || []).slice(0, 6).map((item: any, itemIndex: number) => (
                              <motion.div key={itemIndex} variants={fadeInUp} className="min-h-[14rem] border-b border-r border-white/10 p-7 sm:p-9">
                                <p className="text-[9px] font-black tracking-[0.24em] text-primary">{String(itemIndex + 1).padStart(2, "0")}</p>
                                <h3 className="mt-10 text-2xl font-semibold tracking-[-0.025em] text-white">{typeof item === "string" ? item : item.title}</h3>
                                {typeof item === "object" && item.description && <p className="mt-4 max-w-md text-sm leading-7 text-slate-400">{item.description}</p>}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </motion.section>
                    );
                  }

                  if (section.settings?.variant === "editorial_strip") {
                    return (
                      <motion.section key={section.id || `features-${idx}`} initial="initial" whileInView="whileInView" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer} className="border-y border-slate-200 bg-[#f8f7f4] py-16 sm:py-20">
                        <div className="mx-auto max-w-7xl px-6">
                          <motion.div variants={fadeInUp} className="grid gap-8 lg:grid-cols-12 lg:items-end">
                            <div className="lg:col-span-5">
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">At a glance</p>
                              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl" style={{ fontFamily: theme.displayFont || designProfile.displayFont }}>{section.content.title || "What Matters"}</h2>
                            </div>
                            <div className="grid gap-0 border-l border-slate-200 sm:grid-cols-2 lg:col-span-7">
                              {(section.content.items || []).slice(0, 4).map((item: any, itemIndex: number) => (
                                <div key={itemIndex} className="border-b border-r border-slate-200 p-6">
                                  <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary">0{itemIndex + 1}</p>
                                  <h3 className="mt-5 text-lg font-semibold text-slate-950">{typeof item === "string" ? item : item.title}</h3>
                                  {typeof item === "object" && item.description && <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        </div>
                      </motion.section>
                    );
                  }
                  return (
                    <motion.section
                      key={section.id || `features-${idx}`}
                      initial="initial"
                      whileInView="whileInView"
                      viewport={{ once: true, margin: "-100px" }}
                      variants={staggerContainer}
                      className="py-24 sm:py-32 bg-slate-950 text-white overflow-hidden relative"
                    >
                      <div className="gradient-blur bg-primary -top-[20%] -right-[20%] opacity-20" />

                      <div className="max-w-7xl mx-auto px-6 relative z-10">
                        <motion.div variants={fadeInUp} className="text-center max-w-3xl mx-auto mb-20 space-y-6">
                          <span className="text-xs font-black uppercase tracking-[0.4em] text-primary">
                            Core Advantages
                          </span>
                          <h2 className="text-4xl sm:text-7xl font-bold tracking-tight leading-tight">
                            {section.content.title || "The Advantage"}
                          </h2>
                          <p className="text-xl text-slate-400">
                            {section.content.description ||
                              "Our platform is engineered for scale, security, and absolute performance."}
                          </p>
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[250px]">
                          {(section.content.items || [])
                            .slice(0, 4)
                            .map((feature: any, fIdx: number) => (
                              <motion.div
                                key={fIdx}
                                variants={fadeInUp}
                                whileHover={{ scale: 1.02 }}
                                className={cn(
                                  "rounded-[2.5rem] p-10 flex flex-col justify-end group cursor-default transition-all duration-700 border backdrop-blur-xl",
                                  fIdx === 0
                                    ? "md:col-span-8"
                                    : "md:col-span-4",
                                  fIdx === 1 ? "md:col-span-4" : "",
                                  fIdx === 2 ? "md:col-span-4" : "",
                                  fIdx === 3 ? "md:col-span-8" : "",
                                  "bg-slate-900/75 border-white/10 hover:bg-slate-800/90 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)]",
                                )}
                              >
                                <div className="space-y-4">
                                  <div className="h-12 w-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <Sparkles className="h-6 w-6" />
                                  </div>
                                  <h3 className="text-2xl font-bold text-white">
                                    {typeof feature === "string"
                                      ? feature
                                      : feature.title}
                                  </h3>
                                  <p className="text-slate-400 text-sm leading-relaxed max-w-md opacity-0 group-hover:opacity-100 transition-opacity">
                                    {typeof feature === "object"
                                      ? feature.description
                                      : "High-intensity performance engineering combined with intuitive design paradigms."}
                                  </p>
                                </div>
                              </motion.div>
                            ))}
                        </div>
                      </div>
                    </motion.section>
                  );
                case "contact":
                  return (
                    <motion.section
                      id={sectionId}
                      key={section.id || `contact-${idx}`}
                      initial="initial"
                      whileInView="whileInView"
                      viewport={{ once: true, margin: "-100px" }}
                      variants={staggerContainer}
                      className="py-24 sm:py-32 relative overflow-hidden section-container"
                    >
                      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
                        <motion.div variants={fadeInUp} className="space-y-12">
                          <div className="space-y-6">
                            <span className="text-xs font-black uppercase tracking-[0.3em] text-primary">
                              Get In Touch
                            </span>
                            <h2 className="text-4xl sm:text-6xl font-bold tracking-tight leading-tight dark:text-white">
                              {section.content.title || "Let's Connect"}
                            </h2>
                            <p className="text-xl text-slate-500 leading-relaxed max-w-lg">
                              {section.content.description ||
                                "Have a question or ready to get started? We're here to help you navigate your next steps."}
                            </p>
                          </div>

                          <div className="space-y-6">
                            {contactEmail && (
                            <motion.a
                              href={`mailto:${contactEmail}`}
                              onClick={() => trackContactAction("email_click", "Contact email", contactEmail)}
                              whileHover={{ x: 10 }}
                              className="flex gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 shadow-sm transition-all"
                            >
                              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                <Mail className="h-6 w-6" />
                              </div>
                              <div>
                                <p className="text-xs uppercase font-bold text-slate-400 tracking-widest mb-1">
                                  Email Us
                                </p>
                                <p className="text-slate-900 dark:text-white font-bold text-lg">
                                  {contactEmail}
                                </p>
                              </div>
                            </motion.a>
                            )}
                            {normalizedPhone && (
                            <motion.a
                              href={`tel:${normalizedPhone}`}
                              onClick={() => trackContactAction("phone_clicked", "Contact phone", normalizedPhone)}
                              whileHover={{ x: 10 }}
                              className="flex gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 shadow-sm transition-all"
                            >
                              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                <Phone className="h-6 w-6" />
                              </div>
                              <div>
                                <p className="text-xs uppercase font-bold text-slate-400 tracking-widest mb-1">
                                  Call Us
                                </p>
                                <p className="text-slate-900 dark:text-white font-bold text-lg">
                                  {contactPhone}
                                </p>
                              </div>
                            </motion.a>
                            )}
                            {whatsappHref && (
                              <motion.a
                                href={whatsappHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => trackContactAction("whatsapp_click", "Contact WhatsApp", whatsappHref)}
                                whileHover={{ x: 10 }}
                                className="flex gap-4 p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 shadow-sm transition-all"
                              >
                                <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                                  <MessageSquare className="h-6 w-6" />
                                </div>
                                <div>
                                  <p className="text-xs uppercase font-bold text-emerald-600 tracking-widest mb-1">
                                    WhatsApp
                                  </p>
                                  <p className="text-slate-900 dark:text-white font-bold text-lg">
                                    Send a quick enquiry
                                  </p>
                                </div>
                              </motion.a>
                            )}
                          </div>
                        </motion.div>

                        <motion.div
                          variants={fadeInUp}
                          className="bg-white dark:bg-slate-950 p-8 sm:p-12 rounded-[3rem] shadow-2xl shadow-indigo-900/5 border border-slate-100 dark:border-white/5 relative"
                        >
                          <div className="absolute -top-6 -right-6 h-20 w-20 bg-primary/10 rounded-full blur-2xl" />
                          {formSuccess ? (
                            <div className="space-y-6 text-center py-10">
                              <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="h-10 w-10" />
                              </div>
                              <h3 className="text-2xl font-black uppercase tracking-tighter">
                                Synthesis Successful
                              </h3>
                              <p className="text-slate-500 font-medium">
                                Your request has been integrated into our queue.
                                A strategist will contact you shortly.
                              </p>
                              <Button
                                variant="outline"
                                className="rounded-2xl h-14"
                                onClick={() => setFormSuccess(false)}
                              >
                                Send Another Message
                              </Button>
                            </div>
                          ) : (
                            <form
                              onSubmit={handleLeadSubmit}
                              className="space-y-6"
                            >
                              <div className="grid sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 dark:text-slate-500">
                                    Full Name
                                  </label>
                                  <Input
                                    required
                                    value={leadForm.name}
                                    onChange={(e) =>
                                      setLeadForm({
                                        ...leadForm,
                                        name: e.target.value,
                                      })
                                    }
                                    placeholder="John Doe"
                                    className="h-14 rounded-2xl border-slate-200 bg-white text-slate-950 placeholder:text-slate-500 focus:bg-white focus:ring-primary/20 transition-all font-bold"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 dark:text-slate-500">
                                    Email Address
                                  </label>
                                  <Input
                                    required
                                    type="email"
                                    value={leadForm.email}
                                    onChange={(e) =>
                                      setLeadForm({
                                        ...leadForm,
                                        email: e.target.value,
                                      })
                                    }
                                    placeholder="john@example.com"
                                    className="h-14 rounded-2xl border-slate-200 bg-white text-slate-950 placeholder:text-slate-500 focus:bg-white focus:ring-primary/20 transition-all font-bold"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 dark:text-slate-500">
                                    Phone Number
                                  </label>
                                  <Input
                                    value={leadForm.phone}
                                    onChange={(e) =>
                                      setLeadForm({
                                        ...leadForm,
                                        phone: e.target.value,
                                      })
                                    }
                                    placeholder="+60 12 345 6789"
                                    className="h-14 rounded-2xl border-slate-200 bg-white text-slate-950 placeholder:text-slate-500 focus:bg-white focus:ring-primary/20 transition-all font-bold"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 dark:text-slate-500">
                                    Service Interested
                                  </label>
                                  <Input
                                    value={leadForm.service}
                                    onChange={(e) =>
                                      setLeadForm({
                                        ...leadForm,
                                        service: e.target.value,
                                      })
                                    }
                                    placeholder="Service or package"
                                    className="h-14 rounded-2xl border-slate-200 bg-white text-slate-950 placeholder:text-slate-500 focus:bg-white focus:ring-primary/20 transition-all font-bold"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 dark:text-slate-500">
                                  Project Brief
                                </label>
                                <textarea
                                  required
                                  value={leadForm.message}
                                  onChange={(e) =>
                                    setLeadForm({
                                      ...leadForm,
                                      message: e.target.value,
                                    })
                                  }
                                  className="flex min-h-[150px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-base font-medium text-slate-950 placeholder:text-slate-500 focus:bg-white focus-visible:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                  placeholder="Define your requirements..."
                                ></textarea>
                              </div>
                              {secureFormsEnabled && (
                                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                                  <p className="text-xs leading-relaxed text-slate-700">
                                    By submitting this form, you agree that{" "}
                                    <strong>{displayBusinessName}</strong>{" "}
                                    may contact you about your enquiry. See our{" "}
                                    <button
                                      type="button"
                                      className="font-bold text-primary underline underline-offset-4"
                                      onClick={() => {
                                        setActivePageSlug("privacy");
                                        scrollPreviewToTop("smooth");
                                      }}
                                    >
                                      Privacy Policy
                                    </button>{" "}
                                    for details.
                                  </p>
                                  {marketingConsentEnabled && (
                                    <label className="flex items-start gap-3 text-xs font-medium text-slate-700">
                                      <input
                                        type="checkbox"
                                        checked={leadForm.marketingConsent}
                                        onChange={(e) =>
                                          setLeadForm({
                                            ...leadForm,
                                            marketingConsent: e.target.checked,
                                          })
                                        }
                                        className="mt-0.5 h-4 w-4 rounded border-slate-400 bg-white text-primary focus:ring-primary"
                                      />
                                      <span>I agree to receive marketing updates and offers.</span>
                                    </label>
                                  )}
                                </div>
                              )}
                              <Button
                                type="submit"
                                isLoading={formLoading}
                                className="w-full h-16 btn-primary rounded-2xl text-lg font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30"
                              >
                                Initialize Connection
                              </Button>
                            </form>
                          )}
                        </motion.div>
                      </div>
                    </motion.section>
                  );
                case "pricing":
                  return (
                    <motion.section
                      id={sectionId}
                      key={section.id || `pricing-${idx}`}
                      initial="initial"
                      whileInView="whileInView"
                      viewport={{ once: true, margin: "-100px" }}
                      variants={staggerContainer}
                      className="py-24 sm:py-48 bg-white dark:bg-slate-950 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 blur-[120px] rounded-full -z-10" />
                      
                      <div className="max-w-7xl mx-auto px-6 relative border-t border-slate-100 dark:border-white/5 pt-24">
                        <motion.div variants={fadeInUp} className="text-center max-w-3xl mx-auto mb-24 space-y-8">
                          <span className="text-xs font-black uppercase tracking-[0.5em] text-primary">
                            Strategic Investment
                          </span>
                          <h2 className="text-5xl sm:text-8xl font-black tracking-tighter leading-[0.85] dark:text-white uppercase">
                            {section.content.title || "Choose Your Path"}
                          </h2>
                          <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">
                            {section.content.description ||
                              "Transparent tiers designed for elite scalability and long-term institutional success."}
                          </p>
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12 items-stretch">
                          {(section.content.plans || []).map(
                            (plan: any, pIdx: number) => (
                              <motion.div
                                key={pIdx}
                                variants={fadeInUp}
                                whileHover={{ y: -15, scale: 1.02 }}
                                className={cn(
                                  "relative flex flex-col p-10 sm:p-14 lg:p-16 rounded-[4rem] transition-all duration-700 group",
                                  plan.isPopular
                                    ? "bg-slate-950 text-white shadow-[0_50px_100px_-20px_rgba(15,23,42,0.5)] ring-1 ring-white/10 scale-105 z-10"
                                    : "bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white border border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-slate-900 hover:shadow-2xl",
                                  pIdx === 2 && (section.content.plans.length === 3) && "md:col-span-2 lg:col-span-1"
                                )}
                              >
                                {plan.isPopular && (
                                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-10 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-[0.4em] rounded-full shadow-2xl">
                                    Priority Choice
                                  </div>
                                )}
                                
                                <div className="mb-12">
                                  <div className={cn(
                                    "inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] mb-6",
                                    plan.isPopular ? "text-primary" : "text-slate-400"
                                  )}>
                                    <div className={cn("h-2 w-2 rounded-full", plan.isPopular ? "bg-primary animate-pulse" : "bg-slate-300")} />
                                    {plan.name}
                                  </div>
                                  
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-7xl font-black tracking-tighter">
                                      ${formatStatValue(plan.price)}
                                    </span>
                                    <span className="text-xs font-bold uppercase tracking-widest opacity-40">
                                      / cycle
                                    </span>
                                  </div>
                                </div>

                                <ul className="space-y-6 mb-16 flex-1">
                                  {(
                                    plan.features || [
                                      "Premium Support",
                                      "High Bandwidth",
                                      "Expert Consultation",
                                      "Custom Integration"
                                    ]
                                  ).map((f: string, fi: number) => (
                                    <li
                                      key={fi}
                                      className="flex gap-5 text-sm font-bold items-start leading-tight"
                                    >
                                      <div className={cn(
                                        "h-6 w-6 shrink-0 rounded-full flex items-center justify-center transition-transform group-hover:rotate-12",
                                        plan.isPopular ? "bg-primary/20 text-primary border border-primary/30" : "bg-primary/10 text-primary"
                                      )}>
                                        <Check className="h-3 w-3 stroke-[4]" />
                                      </div>
                                      <span className={cn(
                                        plan.isPopular ? "text-slate-300" : "text-slate-600 dark:text-slate-400"
                                      )}>
                                        {f}
                                      </span>
                                    </li>
                                  ))}
                                </ul>

                                <Button
                                  className={cn(
                                    "w-full h-24 rounded-[3rem] text-sm font-black uppercase tracking-[0.3em] transition-all duration-500",
                                    plan.isPopular 
                                      ? "bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/30"
                                      : "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                                  )}
                                  onClick={() =>
                                    handleButtonAction(plan.buttonText || "Choose Plan", plan.buttonAction, {
                                      eventType: "pricing_cta_clicked",
                                      planName: plan.name,
                                      planPrice: plan.price,
                                    })
                                  }
                                >
                                  {plan.buttonText || "Choose Plan"}
                                </Button>
                              </motion.div>
                            )
                          )}
                        </div>
                      </div>
                    </motion.section>
                  );
                case "testimonials": {
                  const testimonialItems = (section.content.items || []).filter((item: any) => item?.text);
                  if (testimonialItems.length === 0) return null;
                  const editorialTestimonials = ["editorial_quote", "featured", "proof_wall"].includes(section.settings?.variant || "");
                  if (editorialTestimonials) {
                    const [featured, ...supporting] = testimonialItems;
                    return (
                      <motion.section
                        id={sectionId}
                        key={section.id || `testimonials-${idx}`}
                        initial="initial"
                        whileInView="whileInView"
                        viewport={{ once: true, margin: "-80px" }}
                        variants={staggerContainer}
                        className="bg-slate-950 py-20 text-white sm:py-28"
                      >
                        <div className="mx-auto max-w-7xl px-6">
                          <motion.div variants={fadeInUp} className="grid gap-8 border-b border-white/10 pb-10 lg:grid-cols-12 lg:items-end">
                            <div className="lg:col-span-5">
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/45">Customer perspective</p>
                              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl" style={{ fontFamily: theme.displayFont || designProfile.displayFont }}>
                                {section.content.title || "What customers say"}
                              </h2>
                            </div>
                            <p className="max-w-xl text-sm leading-7 text-slate-400 lg:col-span-7 lg:justify-self-end">
                              Only customer-supplied feedback is shown here.
                            </p>
                          </motion.div>

                          <motion.article variants={fadeInUp} className="grid gap-8 border-b border-white/10 py-12 lg:grid-cols-12">
                            <Quote className="h-10 w-10 text-primary lg:col-span-1" />
                            <div className="lg:col-span-8">
                              <blockquote className="text-2xl font-medium leading-[1.35] tracking-[-0.02em] text-white sm:text-4xl">
                                “{featured.text}”
                              </blockquote>
                            </div>
                            <div className="lg:col-span-3 lg:text-right">
                              <p className="text-sm font-semibold text-white">{featured.name || "Customer review"}</p>
                              {featured.role && <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{featured.role}</p>}
                            </div>
                          </motion.article>

                          {supporting.length > 0 && (
                            <div className="grid gap-px bg-white/10 md:grid-cols-2">
                              {supporting.slice(0, 4).map((item: any, itemIndex: number) => (
                                <motion.article key={item.id || itemIndex} variants={fadeInUp} className="bg-slate-950 p-7 sm:p-9">
                                  <p className="text-lg font-medium leading-8 text-slate-200">“{item.text}”</p>
                                  <p className="mt-6 text-xs font-semibold text-white">{item.name || "Customer review"}</p>
                                  {item.role && <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-500">{item.role}</p>}
                                </motion.article>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.section>
                    );
                  }

                  return (
                    <motion.section
                      id={sectionId}
                      key={section.id || `testimonials-${idx}`}
                      initial="initial"
                      whileInView="whileInView"
                      viewport={{ once: true, margin: "-80px" }}
                      variants={staggerContainer}
                      className="section-container py-20 sm:py-28"
                    >
                      <div className="mx-auto max-w-7xl px-6">
                        <motion.div variants={fadeInUp} className="mb-12 max-w-3xl">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Customer feedback</p>
                          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-6xl" style={{ fontFamily: theme.displayFont || designProfile.displayFont }}>
                            {section.content.title || "What customers say"}
                          </h2>
                        </motion.div>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                          {testimonialItems.map((item: any, itemIndex: number) => (
                            <motion.article key={item.id || itemIndex} variants={fadeInUp} className="border border-slate-200 bg-white p-7 sm:p-9">
                              <Quote className="h-7 w-7 text-primary/30" />
                              <p className="mt-7 text-lg font-medium leading-8 text-slate-800">“{item.text}”</p>
                              <div className="mt-8 border-t border-slate-100 pt-5">
                                <p className="text-sm font-semibold text-slate-950">{item.name || "Customer review"}</p>
                                {item.role && <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">{item.role}</p>}
                              </div>
                            </motion.article>
                          ))}
                        </div>
                      </div>
                    </motion.section>
                  );
                }
                case "cta":
                  if (["brand_band", "consultation", "editorial", "full_bleed"].includes(section.settings?.variant || "")) {
                    return (
                      <motion.section key={section.id || `cta-${idx}`} initial="initial" whileInView="whileInView" viewport={{ once: true }} variants={staggerContainer} className="text-white" style={{ backgroundColor: theme.primaryColor }}>
                        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:py-20 lg:grid-cols-12 lg:items-center">
                          <motion.div variants={fadeInUp} className="lg:col-span-8">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Next step</p>
                            <h2 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl" style={{ fontFamily: theme.displayFont || designProfile.displayFont }}>{section.content.title || "Ready to talk?"}</h2>
                            <p className="mt-5 max-w-2xl text-base leading-7 text-white/75">{section.content.description}</p>
                          </motion.div>
                          <motion.div variants={fadeInUp} className="lg:col-span-4 lg:justify-self-end">
                            <Button size="lg" className="h-14 rounded-none bg-white px-8 text-sm font-black uppercase tracking-widest text-slate-950 hover:bg-white/90" onClick={() => handleButtonAction(section.content.buttonText || section.content.ctaText || "Contact Us", section.content.buttonAction, { eventType: "website_button_clicked", sectionId: section.id })}>
                              {section.content.buttonText || section.content.ctaText || "Contact Us"} <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </motion.div>
                        </div>
                      </motion.section>
                    );
                  }
                  return (
                    <motion.section
                      id={sectionId}
                      key={section.id || `cta-${idx}`}
                      initial="initial"
                      whileInView="whileInView"
                      viewport={{ once: true, margin: "-100px" }}
                      variants={fadeInUp}
                      className="py-24 sm:py-32 relative overflow-hidden bg-slate-950"
                    >
                      <div className="absolute inset-0">
                        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.15),transparent)]" />
                      </div>

                      <div className="max-w-5xl mx-auto px-6 relative z-10 text-center space-y-12">
                        <motion.span variants={fadeInUp} className="text-xs font-black uppercase tracking-[0.5em] text-primary">
                          Strategic Initiative
                        </motion.span>
                        <motion.h2 variants={fadeInUp} className="text-6xl sm:text-9xl font-bold tracking-tight text-white leading-[0.85]">
                          Ready to <br />
                          <span className="text-gradient">Lead?</span>
                        </motion.h2>
                        <motion.p variants={fadeInUp} className="text-2xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                          {section.content.description ||
                            "Secure your position at the forefront of industrial innovation with our elite solutions."}
                        </motion.p>
                        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
                          <Button
                            size="lg"
                            className="h-20 px-12 text-lg font-black uppercase tracking-widest bg-white text-slate-950 hover:bg-primary hover:text-white rounded-none transition-all duration-500 shadow-2xl"
                            onClick={() =>
                              handleButtonAction(section.content.buttonText || section.content.ctaText || "Contact Us", section.content.buttonAction, {
                                eventType: "website_button_clicked",
                                sectionId: section.id,
                              })
                            }
                          >
                            {section.content.buttonText || "Begin Consultation"}
                          </Button>
                        </motion.div>
                      </div>
                    </motion.section>
                  );
                case "faq":
                  if (["media_accordion", "two_column"].includes(section.settings?.variant || "")) {
                    return (
                      <motion.section id={sectionId} key={section.id || `faq-${idx}`} initial="initial" whileInView="whileInView" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer} className="bg-white py-20 sm:py-28">
                        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-12">
                          <motion.div variants={fadeInUp} className="lg:col-span-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Questions</p>
                            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-5xl" style={{ fontFamily: theme.displayFont || designProfile.displayFont }}>{section.content.title || "Frequently asked"}</h2>
                            <p className="mt-5 text-sm leading-7 text-slate-600">Clear answers before a customer has to contact you.</p>
                          </motion.div>
                          <div className="lg:col-span-8">
                            {(section.content.items || []).map((item: any, itemIndex: number) => (
                              <motion.details key={itemIndex} variants={fadeInUp} className="group border-t border-slate-200 py-1 last:border-b">
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-left">
                                  <h3 className="text-lg font-semibold text-slate-950 sm:text-xl">{item.question}</h3>
                                  <ChevronRight className="h-5 w-5 shrink-0 text-primary transition-transform group-open:rotate-90" />
                                </summary>
                                <p className="max-w-2xl pb-7 text-base leading-7 text-slate-600">{item.answer}</p>
                              </motion.details>
                            ))}
                          </div>
                        </div>
                      </motion.section>
                    );
                  }
                  return (
                    <motion.section
                      id={sectionId}
                      key={section.id || `faq-${idx}`}
                      initial="initial"
                      whileInView="whileInView"
                      viewport={{ once: true, margin: "-100px" }}
                      variants={staggerContainer}
                      className="py-24 sm:py-32 relative overflow-hidden section-container dark:bg-slate-950"
                    >
                      <div className="max-w-4xl mx-auto px-6">
                        <motion.div variants={fadeInUp} className="text-center mb-16 space-y-6">
                          <span className="text-xs font-black uppercase tracking-[0.4em] text-primary">
                            The Knowledge Base
                          </span>
                          <h2 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[0.9] dark:text-white">
                            Operational Clarity.
                          </h2>
                        </motion.div>

                        <div className="space-y-6">
                          {(section.content.items || []).map(
                            (item: any, fIdx: number) => (
                              <motion.div
                                key={item.id || `renderer-faq-${fIdx}`}
                                variants={fadeInUp}
                                className="group bg-slate-50/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:border-primary/20"
                              >
                                <details className="w-full">
                                  <summary className="flex items-center justify-between p-10 cursor-pointer list-none outline-none">
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white pr-12 leading-tight">
                                      {item.question}
                                    </h3>
                                    <div className="h-14 w-14 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/10 text-slate-400 group-hover:border-primary group-hover:text-primary rounded-2xl flex items-center justify-center transition-all shrink-0">
                                      <ChevronRight className="h-6 w-6 transition-transform duration-500 group-open:rotate-90" />
                                    </div>
                                  </summary>
                                  <div className="px-10 pb-10 text-slate-600 dark:text-slate-400 leading-relaxed text-xl max-w-3xl">
                                    {item.answer}
                                  </div>
                                </details>
                              </motion.div>
                            ),
                          )}
                        </div>
                      </div>
                    </motion.section>
                  );
                case "team":
                  if (!Array.isArray(section.content.members) || section.content.members.length === 0) return null;
                  if (["leadership_grid", "editorial_people", "founder_story"].includes(section.settings?.variant || "")) {
                    return (
                      <motion.section key={section.id || `team-${idx}`} initial="initial" whileInView="whileInView" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer} className="bg-[#f4f2ed] py-20 sm:py-28">
                        <div className="mx-auto max-w-7xl px-6">
                          <motion.div variants={fadeInUp} className="grid gap-6 lg:grid-cols-12 lg:items-end">
                            <div className="lg:col-span-7">
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">People</p>
                              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-6xl" style={{ fontFamily: theme.displayFont || designProfile.displayFont }}>{section.content.title || "Meet the team"}</h2>
                            </div>
                            <p className="text-base leading-7 text-slate-600 lg:col-span-5">{section.content.description}</p>
                          </motion.div>
                          <div className="mt-14 grid gap-px bg-slate-300 sm:grid-cols-2 lg:grid-cols-4">
                            {section.content.members.map((member: any, memberIndex: number) => (
                              <motion.article key={memberIndex} variants={fadeInUp} className="bg-[#f4f2ed]">
                                {member.imageUrl ? (
                                  <div className="aspect-[4/5] overflow-hidden bg-slate-200"><img src={member.imageUrl} alt={member.name} className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" /></div>
                                ) : (
                                  <div className="flex aspect-[4/5] items-end border border-slate-300 bg-white/60 p-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Customer portrait needed</div>
                                )}
                                <div className="p-6">
                                  <h3 className="text-lg font-semibold text-slate-950">{member.name}</h3>
                                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-primary">{member.role}</p>
                                  {member.bio && <p className="mt-4 text-sm leading-6 text-slate-600">{member.bio}</p>}
                                </div>
                              </motion.article>
                            ))}
                          </div>
                        </div>
                      </motion.section>
                    );
                  }
                  return (
                    <motion.section
                      key={section.id || `team-${idx}`}
                      initial="initial"
                      whileInView="whileInView"
                      viewport={{ once: true, margin: "-100px" }}
                      variants={staggerContainer}
                      className="py-24 sm:py-32 section-container dark:bg-slate-950"
                    >
                      <div className="max-w-7xl mx-auto px-6 text-center">
                        <motion.div variants={fadeInUp} className="max-w-3xl mx-auto mb-16 space-y-6">
                          <span className="text-xs font-black uppercase tracking-[0.4em] text-primary">
                            The Architects
                          </span>
                          <h2 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[0.9] dark:text-white">
                            Elite Leadership.
                          </h2>
                          <p className="text-xl text-slate-500 leading-relaxed">
                            {section.content.description ||
                              "Our team is comprised of world-class experts dedicated to redefining industry standards."}
                          </p>
                        </motion.div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                          {(section.content.members || []).map(
                            (member: any, mIdx: number) => (
                              <motion.div
                                key={mIdx}
                                variants={fadeInUp}
                                whileHover={{ y: -10 }}
                                className="group bg-white dark:bg-slate-900/50 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-2xl transition-all duration-700"
                              >
                                <div className="aspect-[4/5] rounded-[2rem] overflow-hidden mb-8 relative">
                                  {member.imageUrl ? (
                                    <img
                                      src={member.imageUrl}
                                      alt={member.name}
                                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-end bg-slate-100 p-5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                      Customer portrait needed
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="space-y-2">
                                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                    {member.name}
                                  </h3>
                                  <p className="text-xs font-black text-primary uppercase tracking-[0.2em]">
                                    {member.role}
                                  </p>
                                  <p className="text-sm text-slate-500 pt-4 leading-relaxed line-clamp-3">
                                    {member.bio}
                                  </p>
                                </div>
                              </motion.div>
                            ),
                          )}
                        </div>
                      </div>
                    </motion.section>
                  );
                case "appointment":
                  return (
                    <motion.section
                      id={sectionId}
                      key={section.id || `appointment-${idx}`}
                      initial="initial"
                      whileInView="whileInView"
                      viewport={{ once: true, margin: "-100px" }}
                      variants={fadeInUp}
                      className="py-24 sm:py-32 relative overflow-hidden section-container dark:bg-slate-950"
                    >
                      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-20 items-center">
                        <motion.div variants={fadeInUp} className="space-y-12">
                          <div className="space-y-6">
                            <span className="text-xs font-black uppercase tracking-[0.4em] text-primary">
                              Strategic Session
                            </span>
                            <h2 className="text-5xl sm:text-7xl font-bold tracking-tight leading-[0.9] dark:text-white">
                              {section.content.title || "Reserve Your Time."}
                            </h2>
                            <p className="text-xl text-slate-500 leading-relaxed max-w-lg">
                              {section.content.description ||
                                "Schedule a dedicated consultation with our lead strategists to chart your path forward."}
                            </p>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-8">
                            <div className="space-y-2">
                              <div className="h-10 w-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-primary mb-4">
                                <Calendar className="h-5 w-5" />
                              </div>
                              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                Available Hours
                              </p>
                              <p className="text-slate-900 dark:text-white font-bold">
                                {section.content.workingHours ||
                                  "09:00 AM - 06:00 PM"}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <div className="h-10 w-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-primary mb-4">
                                <MapPin className="h-5 w-5" />
                              </div>
                              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                Location
                              </p>
                              <p className="text-slate-900 dark:text-white font-bold">
                                {section.content.location ||
                                  "Virtual / On-site"}
                              </p>
                            </div>
                          </div>

                          {bookingSuccess ? (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-12 bg-slate-950 rounded-[3rem] text-white shadow-3xl relative overflow-hidden"
                            >
                              <div className="absolute top-0 right-0 h-32 w-32 bg-primary/20 blur-3xl" />
                              <CheckCircle2 className="h-16 w-16 text-primary mb-8" />
                              <h3 className="text-3xl font-black uppercase tracking-tighter mb-4 text-white">
                                Confirmed.
                              </h3>
                              <p className="text-slate-300 text-lg leading-relaxed mb-8">
                                Your strategic session has been reserved. A
                                brief containing the next steps will be
                                delivered to your inbox.
                              </p>
                              <Button
                                variant="outline"
                                className="h-14 px-8 border-white/20 text-white hover:bg-white hover:text-slate-950 rounded-2xl transition-all font-bold"
                                onClick={() => setBookingSuccess(false)}
                              >
                                Book Another
                              </Button>
                            </motion.div>
                          ) : (
                            <motion.div
                              variants={fadeInUp}
                              className="space-y-6 pt-8 border-t border-slate-100 dark:border-white/5"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-1">
                                    Full Name
                                  </label>
                                  <Input
                                    placeholder="Enter your name"
                                    className="h-14 rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-primary/20"
                                    value={bookingForm.name}
                                    onChange={(e) =>
                                      setBookingForm({
                                        ...bookingForm,
                                        name: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-1">
                                    Email Domain
                                  </label>
                                  <Input
                                    placeholder="Enter your email"
                                    type="email"
                                    className="h-14 rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-primary/20"
                                    value={bookingForm.email}
                                    onChange={(e) =>
                                      setBookingForm({
                                        ...bookingForm,
                                        email: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 px-1">
                                  Consultation Depth
                                </label>
                                <Select
                                  value={bookingForm.service}
                                  onValueChange={(val) =>
                                    setBookingForm({
                                      ...bookingForm,
                                      service: val,
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-14 rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                    <SelectValue placeholder="Select Service Tier" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(
                                      section.content.services || [
                                        "Foundational Audit",
                                        "Operational Scale",
                                        "Enterprise Transformation",
                                      ]
                                    ).map((s: string) => (
                                      <SelectItem key={s} value={s}>
                                        {s}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                size="lg"
                                className="btn-primary h-16 w-full rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30"
                                onClick={handleBookingSubmit}
                                isLoading={bookingLoading}
                                disabled={
                                  !bookingTime ||
                                  !bookingForm.name ||
                                  !bookingForm.email
                                }
                              >
                                Reserve Strategic Window
                              </Button>
                            </motion.div>
                          )}
                        </motion.div>

                        <div className="relative">
                          <div className="absolute -inset-4 bg-primary/5 rounded-[4rem] blur-2xl" />
                          <div className="p-10 sm:p-12 rounded-[3.5rem] border border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900 shadow-3xl relative z-10">
                            <div className="mb-10 flex items-center justify-between">
                              <h3 className="font-black text-2xl tracking-tighter uppercase text-slate-900 dark:text-white">
                                {section.content.calendarTitle || "Select Date"}
                              </h3>
                              <div className="flex gap-4">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 rounded-xl bg-slate-50 hover:bg-primary hover:text-white transition-all"
                                >
                                  <ChevronLeft className="h-5 w-5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 rounded-xl bg-slate-50 hover:bg-primary hover:text-white transition-all"
                                >
                                  <ChevronRight className="h-5 w-5" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-7 gap-4 mb-8">
                              {[
                                "Sun",
                                "Mon",
                                "Tue",
                                "Wed",
                                "Thu",
                                "Fri",
                                "Sat",
                              ].map((day, idx) => (
                                <div
                                  key={idx}
                                  className="text-center text-[10px] font-black text-slate-300 uppercase tracking-widest"
                                >
                                  {day}
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-4">
                              {Array.from({ length: 35 }).map((_, i) => {
                                const day = i - 3; // Mock offset
                                const isToday = day === 15;
                                const isBefore = day < 1;
                                const isAfter = day > 31;
                                const isSelected =
                                  bookingDate?.getDate() === day;

                                return (
                                  <button
                                    key={i}
                                    disabled={isBefore || isAfter}
                                    onClick={() => {
                                      const d = new Date();
                                      d.setDate(day);
                                      setBookingDate(d);
                                    }}
                                    className={cn(
                                      "aspect-square rounded-2xl flex items-center justify-center text-sm font-black transition-all",
                                      isSelected
                                        ? "bg-slate-950 text-white shadow-2xl"
                                        : isToday
                                          ? "text-primary bg-primary/10"
                                          : isBefore || isAfter
                                            ? "text-slate-100 cursor-not-allowed"
                                            : "hover:bg-slate-50 text-slate-800",
                                    )}
                                  >
                                    {day > 0 && day <= 31 ? day : ""}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="mt-12 pt-10 border-t border-slate-50">
                              <p className="text-xs font-black text-slate-300 uppercase tracking-[0.3em] mb-6 text-center">
                                Available Intervals
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                  "09:00",
                                  "10:30",
                                  "12:00",
                                  "13:30",
                                  "15:00",
                                  "16:30",
                                  "18:00",
                                  "19:30",
                                ].map((time) => (
                                  <button
                                    key={time}
                                    onClick={() => setBookingTime(time)}
                                    className={cn(
                                      "py-3 rounded-xl border-2 text-[10px] font-black tracking-widest transition-all uppercase",
                                      bookingTime === time
                                        ? "border-slate-950 bg-slate-950 text-white shadow-xl"
                                        : "border-slate-50 hover:border-primary hover:text-primary",
                                    )}
                                  >
                                    {time}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.section>
                  );
                case "blog_list":
                  if (["insights_editorial", "featured_article", "news_grid"].includes(section.settings?.variant || "")) {
                    if (!posts.length) return null;
                    const [featuredPost, ...supportingPosts] = posts.slice(0, section.content.postsPerPage || 5);
                    return (
                      <motion.section key={section.id || `blog-${idx}`} initial="initial" whileInView="whileInView" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer} className="bg-white py-20 sm:py-28">
                        <div className="mx-auto max-w-7xl px-6">
                          <motion.div variants={fadeInUp} className="mb-12 flex flex-col gap-5 border-b border-slate-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Ideas & updates</p>
                              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-6xl" style={{ fontFamily: theme.displayFont || designProfile.displayFont }}>{section.content.title || "Insights"}</h2>
                            </div>
                            <p className="max-w-lg text-sm leading-7 text-slate-600">{section.content.description}</p>
                          </motion.div>
                          {featuredPost && (
                            <motion.article variants={fadeInUp} className="grid cursor-pointer gap-0 border border-slate-200 lg:grid-cols-12" onClick={() => { setSelectedPost(featuredPost); scrollPreviewToTop(); }}>
                              <div className="min-h-[18rem] bg-slate-100 lg:col-span-7">
                                {featuredPost.imageUrl ? <img src={featuredPost.imageUrl} alt={featuredPost.title} className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" /> : <div className="flex h-full min-h-[18rem] items-end p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Customer article image</div>}
                              </div>
                              <div className="flex flex-col justify-end p-8 lg:col-span-5 lg:p-12">
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary">{formatDate(featuredPost.createdAt)}</p>
                                <h3 className="mt-4 text-3xl font-semibold leading-tight text-slate-950">{featuredPost.title}</h3>
                                <p className="mt-4 line-clamp-3 text-sm leading-7 text-slate-600">{featuredPost.excerpt}</p>
                              </div>
                            </motion.article>
                          )}
                          <div className="mt-px grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-3">
                            {supportingPosts.slice(0, 3).map((post) => (
                              <motion.article key={post.id} variants={fadeInUp} onClick={() => { setSelectedPost(post); scrollPreviewToTop(); }} className="cursor-pointer bg-white p-7">
                                <p className="text-[9px] font-black uppercase tracking-widest text-primary">{formatDate(post.createdAt)}</p>
                                <h3 className="mt-4 text-xl font-semibold leading-snug text-slate-950">{post.title}</h3>
                                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{post.excerpt}</p>
                              </motion.article>
                            ))}
                          </div>
                        </div>
                      </motion.section>
                    );
                  }
                  return (
                    <motion.section
                      key={section.id || `blog-${idx}`}
                      initial="initial"
                      whileInView="whileInView"
                      viewport={{ once: true, margin: "-100px" }}
                      variants={staggerContainer}
                      style={getSectionStyles(section)}
                      className={cn("px-4 sm:px-6", getPaddingClass(section))}
                    >
                      <div className="max-w-7xl mx-auto space-y-12">
                        <motion.div
                          variants={fadeInUp}
                          className={cn(
                            "space-y-4",
                            getAlignmentClass(section),
                          )}
                        >
                          <h2 className="text-3xl sm:text-4xl font-bold">
                            {section.content.title}
                          </h2>
                          <p className="text-xl text-slate-600">
                            {section.content.description}
                          </p>
                        </motion.div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                          {(posts || [])
                            .slice(0, section.content.postsPerPage || 6)
                            .map((post) => (
                              <motion.div
                                key={post.id}
                                variants={fadeInUp}
                                whileHover={{ y: -10 }}
                                className="group cursor-pointer"
                                onClick={() => {
                                  setSelectedPost(post);
                                  scrollPreviewToTop();
                                }}
                              >
                                <div className="aspect-video bg-slate-100 rounded-3xl overflow-hidden mb-6 relative group">
                                  {post.imageUrl ? (
                                    <img
                                      src={post.imageUrl}
                                      alt={post.title}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                      <Globe className="h-12 w-12" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                                    <Calendar className="h-3 w-3" />{" "}
                                    {formatDate(post.createdAt)}
                                  </div>
                                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                    {post.title}
                                  </h3>
                                  {section.content.showExcerpts && (
                                    <p className="text-slate-500 dark:text-slate-400 line-clamp-2 text-sm leading-relaxed">
                                      {post.excerpt}
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            ))}
                        </div>
                      </div>
                    </motion.section>
                  );
                case "blog_post":
                  if (!selectedPost) return null;
                  return (
                    <motion.section
                      key={section.id || `post-${idx}`}
                      initial="initial"
                      whileInView="whileInView"
                      viewport={{ once: true, margin: "-100px" }}
                      variants={fadeInUp}
                      style={getSectionStyles(section)}
                      className={cn("px-4 sm:px-6", getPaddingClass(section))}
                    >
                      <div className="max-w-3xl mx-auto space-y-8">
                        <div className="space-y-4">
                          <h1 className="text-4xl sm:text-6xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                            {selectedPost.title}
                          </h1>
                          <div className="flex items-center gap-6 text-sm text-slate-500 font-bold uppercase tracking-widest">
                            {section.content.showAuthor && (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" />{" "}
                                {selectedPost.author}
                              </div>
                            )}
                            {section.content.showDate && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />{" "}
                                {formatDate(selectedPost.createdAt)}
                              </div>
                            )}
                          </div>
                        </div>
                        {section.content.showImage && selectedPost.imageUrl && (
                          <motion.img
                            initial={{ scale: 1.05, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 1 }}
                            src={selectedPost.imageUrl}
                            alt={selectedPost.title}
                            className="w-full aspect-video object-cover rounded-[2.5rem] shadow-2xl"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="prose prose-slate prose-lg dark:prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase prose-p:leading-relaxed prose-p:text-slate-600 dark:prose-p:text-slate-400">
                          <ReactMarkdown>{selectedPost.content}</ReactMarkdown>
                        </div>
                      </div>
                    </motion.section>
                  );
                case "text_content":
                  return (
                    <motion.section
                      key={section.id || `text-${idx}`}
                      initial="initial"
                      whileInView="whileInView"
                      viewport={{ once: true, margin: "-100px" }}
                      variants={fadeInUp}
                      style={getSectionStyles(section)}
                      className={cn("px-4 sm:px-6", getPaddingClass(section))}
                    >
                      <div className="max-w-4xl mx-auto">
                        <motion.h2
                          variants={fadeInUp}
                          className="text-4xl sm:text-6xl font-black mb-12 tracking-tight uppercase"
                        >
                          {section.content.title}
                        </motion.h2>
                        <motion.div
                          variants={fadeInUp}
                          className="prose prose-slate prose-xl dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 leading-relaxed font-medium"
                        >
                          <ReactMarkdown>{section.content.body}</ReactMarkdown>
                        </motion.div>
                      </div>
                    </motion.section>
                  );
                case "product_list":
                case "industry_content": {
                  const contentText = [
                    section.content.title,
                    section.content.description,
                    section.content.moduleType,
                    section.content.itemType,
                    section.type,
                  ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();
                  const shouldUseIndustryItems =
                    industryItems.length > 0 &&
                    /industry|listing|property|portfolio|menu|room|class|program|package|job|event/.test(
                      contentText,
                    );
                  const renderedProducts = shouldUseIndustryItems
                    ? industryItems
                    : products.length > 0
                      ? products
                      : section.content.items || [];
                  return (
                    <motion.section
                      key={section.id || `products-${idx}`}
                      initial="initial"
                      whileInView="whileInView"
                      viewport={{ once: true, margin: "-100px" }}
                      variants={staggerContainer}
                      style={getSectionStyles(section)}
                      className={cn("px-4 sm:px-6", getPaddingClass(section))}
                    >
                      <div className="max-w-7xl mx-auto space-y-12">
                        <motion.div
                          variants={fadeInUp}
                          className="text-center space-y-4 max-w-3xl mx-auto"
                        >
                          <Badge
                            variant="outline"
                            className="bg-primary/5 text-primary border-primary/20 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]"
                          >
                            Curated Selection
                          </Badge>
                          <h2 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase leading-[0.9]">
                            {section.content.title || "Our Boutique"}
                          </h2>
                          <p className="text-xl text-slate-500 font-medium">
                            {section.content.description ||
                              "Discover our exclusive range of premium products and services."}
                          </p>
                        </motion.div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12">
                          {renderedProducts.map((product: any, pIdx: number) => (
                            <motion.div
                              key={product.id || pIdx}
                              whileHover={{ y: -8 }}
                              className="group bg-white rounded-[2.5rem] border border-slate-100 p-6 sm:p-8 space-y-6 hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] transition-all duration-500 flex flex-col h-full"
                            >
                              <div className="aspect-square bg-slate-50 rounded-[1.5rem] overflow-hidden relative group-hover:shadow-inner transition-all shrink-0">
                                {product.image_url || product.imageUrl ? (
                                  <img
                                    src={product.image_url || product.imageUrl}
                                    alt={product.name || product.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-200">
                                    <ShoppingBag className="h-20 w-20" />
                                  </div>
                                )}
                                <div className="absolute top-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                  <Badge className="bg-white/90 backdrop-blur-md text-slate-900 border-none px-4 py-2 rounded-xl font-black text-[10px] tracking-widest shadow-xl">
                                    NEW ARRIVAL
                                  </Badge>
                                </div>
                              </div>

                              <div className="space-y-4 flex-1">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1 mr-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-1">
                                      {product.category || "Premium"}
                                    </p>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                      {product.name || product.title}
                                    </h3>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-2xl font-black tracking-tighter text-slate-950 dark:text-white">
                                      {typeof product.price === "number"
                                        ? `$${product.price}`
                                        : product.price}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">
                                  {product.description}
                                </p>
                              </div>

                              <div className="pt-6 border-t border-slate-50 flex items-center justify-between gap-4">
                                <Button
                                  variant="ghost"
                                  className="flex-1 rounded-2xl h-14 font-black uppercase tracking-widest text-xs hover:bg-slate-50"
                                  onClick={() => {
                                    trackInteraction("product_detail_click", product.name || product.title || "Product Detail", {
                                      productId: product.id,
                                      productName: product.name || product.title,
                                    });
                                    setSelectedProduct(product);
                                  }}
                                >
                                  View Details
                                </Button>
                                <Button
                                  className="flex-1 h-14 bg-slate-950 hover:bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all gap-2 group/btn"
                                  onClick={() => {
                                    if (product.sourceType === "industry_content") {
                                      trackInteraction("industry_item_enquiry_click", product.name || product.title || "Industry Item", {
                                        itemId: product.id,
                                        moduleType: product.module_type,
                                      });
                                      setSelectedProduct(product);
                                      return;
                                    }
                                    handleCheckout(product);
                                  }}
                                  disabled={checkoutLoading === product.id}
                                >
                                  {checkoutLoading === product.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      {product.sourceType === "industry_content" ? product.cta_label || "Enquire" : "Buy Now"}
                                      <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                                    </>
                                  )}
                                </Button>
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        {renderedProducts.length === 0 &&
                          (!section.content.items ||
                            section.content.items.length === 0) && (
                            <div className="text-center py-24 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                              <div className="h-20 w-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6">
                                <ShoppingBag className="h-10 w-10 text-slate-300" />
                              </div>
                              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
                                Collection is being curated
                              </p>
                            </div>
                          )}
                      </div>
                    </motion.section>
                  );
                }
                default:
                  return null;
              }
            })}

          {activePageSlug === "blog" && (
            <div className="py-12 sm:py-16 px-4 sm:px-6 max-w-7xl mx-auto">
              {selectedPost ? (
                <div className="max-w-3xl mx-auto space-y-8">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      trackInteraction("blog_nav_click", "Back to Blog", { target: "blog" });
                      setSelectedPost(null);
                    }}
                    className="gap-2 text-slate-500 hover:text-primary"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to Blog
                  </Button>

                  <div className="space-y-4">
                    <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white">
                      {selectedPost.title}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" /> {selectedPost.author}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />{" "}
                        {formatDate(selectedPost.createdAt)}
                      </div>
                    </div>
                  </div>

                  {selectedPost.imageUrl && (
                    <img
                      src={selectedPost.imageUrl}
                      alt={selectedPost.title}
                      className="w-full aspect-video object-cover rounded-2xl shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                  )}

                  <div className="prose prose-slate max-w-none">
                    <ReactMarkdown>{selectedPost.content}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="space-y-12">
                  <div className="text-center space-y-4">
                    <h1 className="text-4xl sm:text-5xl font-bold">Our Blog</h1>
                    <p className="text-xl text-slate-600">
                      Latest news, insights, and stories from our team.
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.map((post) => (
                      <div
                        key={post.id}
                        className="group cursor-pointer"
                        onClick={() => {
                          trackInteraction("blog_post_click", post.title, { postId: post.id });
                          setSelectedPost(post);
                          scrollPreviewToTop();
                        }}
                      >
                        <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden mb-6">
                          {post.imageUrl ? (
                            <img
                              src={post.imageUrl}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <Globe className="h-12 w-12" />
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
                            <span>{formatDate(post.createdAt)}</span>
                          </div>
                          <h3 className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-2">
                            {post.title}
                          </h3>
                          <p className="text-slate-600 line-clamp-3 text-sm leading-relaxed">
                            {post.excerpt}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {posts.length === 0 && (
                    <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                      <p className="text-slate-500 font-medium">
                        No blog posts published yet.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {legalPolicyLinks?.find((p) => p.slug === activePageSlug) && (
            <div className="mb-16">
              <div className="bg-slate-950 py-32 px-6">
                <div className="max-w-4xl mx-auto text-center">
                  <h1 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase text-white mb-4">
                    {legalPolicyLinks?.find((p) => p.slug === activePageSlug)?.title}
                  </h1>
                  <p className="text-white font-medium opacity-80">
                    Reliable Compliance Infrastructure Powered by Bennie Studio
                  </p>
                </div>
              </div>
              <div className="py-24 px-6 max-w-4xl mx-auto">
                <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:text-black prose-p:text-black prose-p:leading-relaxed prose-li:text-black prose-strong:text-black prose-strong:font-bold prose-h2:border-b prose-h2:pb-4 prose-h2:mt-12">
                  <ReactMarkdown>
                    {legalPolicyLinks?.find((p) => p.slug === activePageSlug)?.content ||
                      ""}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </main>

        {generationMode === "brand_led" ? (
          <footer className="bg-slate-950 text-white">
            <div className="mx-auto max-w-[90rem] px-6 sm:px-8">
              <div className="grid gap-10 border-b border-white/10 py-14 sm:py-20 lg:grid-cols-12 lg:items-end">
                <div className="lg:col-span-8">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/45">Next step</p>
                  <h2 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl" style={{ fontFamily: theme.displayFont || designProfile.displayFont }}>Start a conversation with {displayBusinessName}.</h2>
                </div>
                <div className="lg:col-span-4 lg:justify-self-end">
                  <Button className="h-14 rounded-none bg-white px-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-950 hover:bg-white/90" onClick={() => handleButtonAction("Contact Us")}>Get in touch <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </div>
              </div>

              <div className="grid gap-12 py-14 sm:grid-cols-2 lg:grid-cols-12">
                <div className="lg:col-span-4">
                  {theme.logoUrl ? (
                    <img src={theme.logoUrl} alt={displayBusinessName} className="max-h-10 max-w-[12rem] object-contain brightness-0 invert" referrerPolicy="no-referrer" />
                  ) : (
                    <p className="text-2xl font-semibold tracking-[-0.035em]" style={{ fontFamily: theme.displayFont || designProfile.displayFont }}>{displayBusinessName}</p>
                  )}
                  <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">{theme.footer.customText || displayBusinessDescriptor}</p>
                </div>
                <div className="lg:col-span-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-500">Pages</p>
                  <div className="mt-5 space-y-3">{pages.map((page) => (<button key={page.id} onClick={() => { setActivePageSlug(page.slug); setSelectedPost(null); scrollPreviewToTop(); }} className="block text-sm font-medium text-slate-300 transition-colors hover:text-white">{page.title}</button>))}</div>
                </div>
                <div className="lg:col-span-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-500">Contact</p>
                  <div className="mt-5 space-y-3 text-sm">
                    {contactEmail && <a href={`mailto:${contactEmail}`} onClick={() => trackContactAction("email_click", "Footer email", contactEmail)} className="block text-slate-300 hover:text-white">{contactEmail}</a>}
                    {contactPhone && <a href={normalizedPhone ? `tel:${normalizedPhone}` : undefined} onClick={() => normalizedPhone && trackContactAction("call_click", "Footer phone", normalizedPhone)} className="block text-slate-300 hover:text-white">{contactPhone}</a>}
                    {whatsappHref && <a href={whatsappHref} target="_blank" rel="noopener noreferrer" onClick={() => trackContactAction("whatsapp_click", "Footer WhatsApp", whatsappHref)} className="block text-slate-300 hover:text-white">WhatsApp enquiry</a>}
                  </div>
                </div>
                <div className="lg:col-span-3">
                  <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-500">Legal</p>
                  <div className="mt-5 space-y-3">{(legalPolicyLinks || []).map((policy) => (<button key={policy.slug} onClick={() => { setActivePageSlug(policy.slug); setSelectedPost(null); scrollPreviewToTop(); }} className="block text-sm font-medium text-slate-300 hover:text-white">{policy.title}</button>))}</div>
                </div>
              </div>

              <div className="flex flex-col gap-4 border-t border-white/10 py-7 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>© {new Date().getFullYear()} {displayBusinessName}</span>
                <div className="flex flex-wrap gap-4">{(theme.footer.socialLinks || []).filter((link) => link.url && link.isVisible !== false).map((link) => (<a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white">{link.platform}</a>))}</div>
              </div>
            </div>
          </footer>
        ) : (
        <footer
          className={cn(
            "py-32 px-6 border-t relative overflow-hidden",
            theme.style === "luxury_dark" ||
              theme.style === "immersive" ||
              theme.style === "glassmorphic"
              ? "bg-slate-950 border-white/5 text-white"
              : theme.style === "prestige"
                ? "bg-[#fafafa] border-black/5 text-[#1a1a1a]"
                : "bg-white border-slate-100 text-slate-900",
          )}
        >
          <div className="absolute top-0 right-0 h-64 w-64 bg-primary/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-16">
              <div className="md:col-span-4 space-y-10">
                <button
                  onClick={() => {
                    trackInteraction("footer_logo_click", "Footer Home", { target: "home" });
                    setActivePageSlug("home");
                    setSelectedPost(null);
                    scrollPreviewToTop();
                  }}
                  className="flex items-center gap-4 group text-left"
                >
                  <div className="relative">
                    <div className="h-16 w-16 bg-slate-950 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-all duration-500">
                      <Globe className="h-8 w-8 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-primary rounded-lg border-2 border-white" />
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        "text-2xl font-black tracking-tighter uppercase group-hover:text-primary transition-colors",
                        theme.style === "luxury_dark" ||
                          theme.style === "immersive" ||
                          theme.style === "glassmorphic"
                          ? "text-white"
                          : "text-slate-900",
                      )}
                    >
                      {displayBusinessName}
                    </span>
                    <span className="text-[10px] font-black tracking-[0.4em] text-slate-400 uppercase">
                      {displayBusinessDescriptor}
                    </span>
                  </div>
                </button>
                {theme.footer.customText ? (
                  <p className="text-slate-500 text-lg leading-relaxed max-w-sm font-medium">
                    {theme.footer.customText}
                  </p>
                ) : (
                  <p className="text-slate-500 text-lg leading-relaxed max-w-sm font-medium">
                    Clear service information, trusted contact details, and an
                    easy path for customers to enquire.
                  </p>
                )}
                {theme.footer.showSocials && (
                  <div className="flex gap-4">
                    {(theme.footer.socialLinks || [])
                      .filter((l) => l.url && l.isVisible !== false)
                      .map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() =>
                            trackInteraction("external_link_click", `${link.platform} link`, {
                              target: link.url,
                              platform: link.platform,
                            })
                          }
                          className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-950 hover:text-white transition-all shadow-sm"
                        >
                          {link.platform === "facebook" && (
                            <Facebook className="h-5 w-5" />
                          )}
                          {link.platform === "instagram" && (
                            <Instagram className="h-5 w-5" />
                          )}
                          {link.platform === "twitter" && (
                            <Twitter className="h-5 w-5" />
                          )}
                          {link.platform === "linkedin" && (
                            <Linkedin className="h-5 w-5" />
                          )}
                          {link.platform === "youtube" && (
                            <Youtube className="h-5 w-5" />
                          )}
                        </a>
                      ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2 space-y-10">
                <h4 className="font-black uppercase tracking-[0.3em] text-xs text-slate-950">
                  Sitemap
                </h4>
                <ul className="space-y-6">
                  {(pages || []).map((page) => (
                    <li key={page.id}>
                      <button
                        onClick={() => {
                          trackInteraction("footer_nav_click", page.title, { target: page.slug || "home" });
                          setActivePageSlug(page.slug);
                          scrollPreviewToTop();
                        }}
                        className={cn(
                          "text-lg font-bold transition-all hover:translate-x-2 flex items-center gap-4 group",
                          activePageSlug === page.slug
                            ? "text-primary"
                            : "text-slate-500 hover:text-slate-950",
                        )}
                      >
                        <div className="h-0.5 w-0 bg-primary group-hover:w-4 transition-all" />
                        {page.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="md:col-span-3 space-y-10">
                <h4 className="font-black uppercase tracking-[0.3em] text-xs text-slate-950">
                  Corporate Presence
                </h4>
                <ul className="space-y-8">
                  {contactEmail && (
                    <li>
                    <a
                      href={`mailto:${contactEmail}`}
                      onClick={() => trackContactAction("email_click", "Footer email", contactEmail)}
                      className="flex gap-5 group"
                    >
                      <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase font-black tracking-widest text-slate-400">
                          Electronic Mail
                        </p>
                        <p className="text-slate-950 font-bold">
                          {contactEmail}
                        </p>
                      </div>
                    </a>
                    </li>
                  )}
                  {contactPhone && (
                    <li>
                    <a
                      href={normalizedPhone ? `tel:${normalizedPhone}` : undefined}
                      onClick={() => normalizedPhone && trackContactAction("call_click", "Footer phone", normalizedPhone)}
                      className="flex gap-5 group"
                    >
                      <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase font-black tracking-widest text-slate-400">
                          Direct Line
                        </p>
                        <p className="text-slate-950 font-bold">
                          {contactPhone}
                        </p>
                      </div>
                    </a>
                    </li>
                  )}
                  {whatsappHref && (
                    <li>
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackContactAction("whatsapp_click", "Footer WhatsApp", whatsappHref)}
                      className="flex gap-5 group"
                    >
                      <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all shrink-0">
                        <MessageSquare className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase font-black tracking-widest text-slate-400">
                          WhatsApp
                        </p>
                        <p className="text-slate-950 font-bold">
                          Send a quick enquiry
                        </p>
                      </div>
                    </a>
                    </li>
                  )}
                  {theme.footer?.contactAddress && (
                    <li className="flex gap-5 group">
                      <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase font-black tracking-widest text-slate-400">
                          Headquarters
                        </p>
                        <p className="text-slate-950 font-bold leading-relaxed">
                          {theme.footer.contactAddress}
                        </p>
                      </div>
                    </li>
                  )}
                </ul>
              </div>

              <div className="md:col-span-3 space-y-10">
                <h4 className="font-black uppercase tracking-[0.3em] text-xs text-slate-950">
                  Legal Protocol
                </h4>
                <ul className="space-y-6">
                  {(legalPolicyLinks || []).map((policy) => (
                    <li key={policy.id}>
                      <button
                        onClick={() => {
                          trackInteraction("policy_link_click", policy.title, { target: policy.slug });
                          setActivePageSlug(policy.slug);
                          scrollPreviewToTop();
                        }}
                        className="text-slate-500 hover:text-slate-950 font-bold text-lg hover:translate-x-2 transition-all block"
                      >
                        {policy.title}
                      </button>
                    </li>
                  ))}
                  {cookieBannerEnabled && (
                    <li>
                      <button
                        onClick={() => setShowCookiePrefs(true)}
                        className="text-slate-500 hover:text-slate-950 font-bold text-lg hover:translate-x-2 transition-all block"
                      >
                        Manage Cookies
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="pt-12 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">
                &copy; {new Date().getFullYear()}{" "}
                {displayBusinessName}. Professional website experience.
                Indicated.
              </p>
            </div>
          </div>
        </footer>
        )}

        {/* Product Detail Modal */}
        <AnimatePresence>
          {selectedProduct && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedProduct(null)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-5xl bg-white rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
              >
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-6 right-6 z-10 h-10 w-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-slate-900 hover:bg-slate-950 hover:text-white transition-all shadow-lg"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="md:w-1/2 bg-slate-50 flex items-center justify-center p-8 overflow-hidden">
                  <div className="relative group w-full aspect-square">
                    {selectedProduct.image_url || selectedProduct.imageUrl ? (
                      <img
                        src={
                          selectedProduct.image_url || selectedProduct.imageUrl
                        }
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover rounded-[2rem] shadow-2xl"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-white rounded-[2rem] flex items-center justify-center text-slate-200">
                        <ShoppingBag className="h-40 w-40" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:w-1/2 p-8 sm:p-12 overflow-y-auto space-y-8">
                  {(() => {
                    const isIndustryItem = selectedProduct.sourceType === "industry_content";
                    const itemAttributes = selectedProduct.attributes && typeof selectedProduct.attributes === "object"
                      ? Object.entries(selectedProduct.attributes).filter(([, value]) => Boolean(value))
                      : [];
                    const handleIndustryEnquiry = () => {
                      const target = selectedProduct.cta_target || "#contact";
                      trackInteraction("industry_item_modal_enquiry_click", selectedProduct.name || selectedProduct.title || "Industry Item", {
                        itemId: selectedProduct.id,
                        moduleType: selectedProduct.module_type,
                        ctaType: selectedProduct.cta_type,
                        target,
                      });
                      if (selectedProduct.cta_type === "whatsapp") {
                        const message = encodeURIComponent(
                          selectedProduct.enquiry_message || "Hi, I’m interested in this item. Can you share more details?",
                        );
                        const cleanNumber = String(target).replace(/[^\d]/g, "");
                        window.open(`https://wa.me/${cleanNumber}?text=${message}`, "_blank", "noopener,noreferrer");
                        return;
                      }
                      if (selectedProduct.cta_type === "phone") {
                        window.location.href = `tel:${target}`;
                        return;
                      }
                      if (selectedProduct.cta_type === "email") {
                        window.location.href = `mailto:${target}`;
                        return;
                      }
                      if (selectedProduct.cta_type === "external_url" || selectedProduct.cta_type === "booking_link") {
                        window.open(target, "_blank", "noopener,noreferrer");
                        return;
                      }
                      setSelectedProduct(null);
                      setTimeout(() => scrollToSection("contact"), 150);
                    };
                    return (
                      <>
                  <div className="space-y-4">
                    <Badge
                      variant="outline"
                      className="bg-primary/5 text-primary border-primary/20 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]"
                    >
                      {selectedProduct.category || "Exclusive Release"}
                    </Badge>
                    <h2 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase text-slate-950 leading-tight">
                      {selectedProduct.name || selectedProduct.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-4">
                      {selectedProduct.price && (
                        <span className="text-3xl font-black tracking-tighter text-slate-950">
                          {typeof selectedProduct.price === "number"
                            ? `$${selectedProduct.price}`
                            : selectedProduct.price}
                        </span>
                      )}
                      <Badge className="bg-emerald-500 text-white border-none rounded-lg px-3 py-1 font-bold text-[10px] uppercase tracking-widest">
                        {isIndustryItem ? selectedProduct.status?.replace(/_/g, " ") || "Available" : "In Stock"}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      Specifications
                    </h4>
                    <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed text-sm">
                      <p>{selectedProduct.description}</p>
                    </div>
                  </div>

                  {isIndustryItem ? (
                    itemAttributes.length > 0 && (
                      <div className="grid grid-cols-2 gap-4">
                        {itemAttributes.slice(0, 6).map(([key, value]) => (
                          <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                              {key.replace(/([A-Z])/g, " $1")}
                            </p>
                            <p className="mt-1 break-words text-xs font-bold text-slate-700">
                              {String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                          <Tag className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                            Authenticity
                          </p>
                          <p className="text-xs font-bold text-slate-700">
                            Verified
                          </p>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                          <Layers className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                            Inventory
                          </p>
                          <p className="text-xs font-bold text-slate-700">
                            Limited
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-8 border-t border-slate-100 flex flex-col gap-4">
                    <Button
                      className="w-full h-16 bg-slate-950 hover:bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all gap-3 shadow-xl group"
                      onClick={() => isIndustryItem ? handleIndustryEnquiry() : handleCheckout(selectedProduct)}
                      disabled={checkoutLoading === selectedProduct.id}
                    >
                      {checkoutLoading === selectedProduct.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          {isIndustryItem ? selectedProduct.cta_label || "Send Enquiry" : "Secure Checkout"}
                          {isIndustryItem ? (
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                          ) : (
                            <CreditCard className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                          )}
                        </>
                      )}
                    </Button>
                    {!isIndustryItem && (
                    <div className="flex items-center justify-center gap-6 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Shield className="h-3 w-3" /> Secure SSL
                      </div>
                    </div>
                    )}
                  </div>
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {!isThumbnail && whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackContactAction("whatsapp_click", "Floating WhatsApp", whatsappHref)}
            className="fixed bottom-6 left-6 z-[95] inline-flex h-14 items-center gap-3 rounded-2xl bg-emerald-500 px-5 text-sm font-black uppercase tracking-widest text-white shadow-2xl shadow-emerald-900/20 transition-all hover:-translate-y-1 hover:bg-emerald-600"
          >
            <MessageSquare className="h-5 w-5" />
            WhatsApp
          </a>
        )}

        {/* AI Chatbot Widget */}
        {!isThumbnail && <div className="fixed bottom-6 right-6 z-[100]">
          <AnimatePresence>
            {isChatOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="absolute bottom-20 right-0 w-[350px] sm:w-[400px] h-[500px] bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
              >
                <div className="p-6 bg-indigo-600 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">AI Assistant</h4>
                      <p className="text-[10px] text-indigo-100 uppercase tracking-widest">
                        Powered by Gemini
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="hover:rotate-90 transition-transform duration-300"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide bg-slate-50/50 dark:bg-slate-900/50">
                  {chatMessages.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-12 space-y-4"
                    >
                      <div className="h-20 w-20 rounded-[2rem] bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto shadow-inner">
                        <MessageSquare className="h-10 w-10 text-indigo-600" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900 dark:text-white">
                          How can I help?
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Ask me anything about our services.
                        </p>
                      </div>
                    </motion.div>
                  )}
                  <AnimatePresence mode="popLayout">
                    {chatMessages.map((msg, idx) => (
                      <motion.div
                        key={idx}
                        initial={{
                          opacity: 0,
                          x: msg.role === "user" ? 20 : -20,
                          scale: 0.9,
                        }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{
                          type: "spring",
                          damping: 20,
                          stiffness: 300,
                        }}
                        className={cn(
                          "flex",
                          msg.role === "user" ? "justify-end" : "justify-start",
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] p-4 rounded-2xl text-sm shadow-sm",
                            msg.role === "user"
                              ? "bg-indigo-600 text-white rounded-tr-none shadow-indigo-100 dark:shadow-none"
                              : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-tl-none border border-slate-100 dark:border-slate-700",
                          )}
                        >
                          {msg.content}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {isChatLoading && (
                    <motion.div
                      initial={{ opacity: 0, x: -20, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm flex gap-1">
                        <motion.span
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className="h-1.5 w-1.5 rounded-full bg-indigo-600"
                        />
                        <motion.span
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: 0.2,
                          }}
                          className="h-1.5 w-1.5 rounded-full bg-indigo-600"
                        />
                        <motion.span
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: 0.4,
                          }}
                          className="h-1.5 w-1.5 rounded-full bg-indigo-600"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50"
                >
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ask a question..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || isChatLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-indigo-600 text-white rounded-lg flex items-center justify-center disabled:opacity-50 hover:bg-indigo-700 transition-colors"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="h-16 w-16 bg-indigo-600 text-white rounded-3xl shadow-2xl flex items-center justify-center hover:bg-indigo-700 transition-all duration-300 group relative"
          >
            {isChatOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <MessageSquare className="h-6 w-6" />
            )}
            {!isChatOpen && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse" />
            )}
          </motion.button>
        </div>}

        {!isThumbnail && cookieBannerEnabled && (!cookieConsent || showCookiePrefs) && (
          <div className="fixed inset-x-4 bottom-4 z-[140] mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-4">
                <div className="h-11 w-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Cookie className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950">
                    Cookie Preferences
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    We use necessary cookies to run this website. Optional
                    analytics and marketing cookies only load when you accept
                    them.
                  </p>
                  {showCookiePrefs && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {[
                        ["functional", "Functional"],
                        ["analytics", "Analytics"],
                        ["marketing", "Marketing"],
                      ].map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm font-bold text-slate-700">
                          <input
                            type="checkbox"
                            checked={!!cookieConsent?.[key]}
                            onChange={(e) =>
                              setCookieConsent({
                                ...(cookieConsent || { necessary: true }),
                                [key]: e.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => saveCookieConsent({ functional: false, analytics: false, marketing: false })}
                >
                  Reject Non-Essential
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    if (showCookiePrefs) {
                      saveCookieConsent(cookieConsent || {});
                    } else {
                      setShowCookiePrefs(true);
                    }
                  }}
                >
                  {showCookiePrefs ? "Save Preferences" : "Manage Preferences"}
                </Button>
                <Button
                  className="rounded-xl"
                  onClick={() => saveCookieConsent({ functional: true, analytics: true, marketing: true })}
                >
                  Accept All
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Back to Top */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="fixed bottom-28 right-6 h-12 w-12 bg-white text-slate-900 rounded-2xl shadow-xl border border-slate-100 flex items-center justify-center hover:bg-slate-950 hover:text-white transition-all z-[90]"
            >
              <ArrowRight className="h-5 w-5 -rotate-90" />
            </motion.button>
          )}
          {/* Structured analytics IDs are supported; arbitrary footer HTML is intentionally disabled. */}
        </AnimatePresence>
      </div>
    </HelmetProvider>
  );
}
