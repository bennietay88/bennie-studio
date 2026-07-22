import { ButtonActionType, ButtonHealthIssue, Website, WebsiteButton, WebsitePage, WebsiteSection } from "../types";
import { SECTION_TEMPLATES } from "../constants/sectionTemplates";
import { generateId } from "./utils";

export interface BusinessContactDetails {
  businessName?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  bookingUrl?: string;
  checkoutUrl?: string;
  defaultMessage?: string;
}

const DEFAULT_MESSAGE = "Hi, I'm interested in your services. Can you share more details?";

export const normalizePhoneForHref = (value?: string | null) => (value || "").replace(/[^\d+]/g, "");
export const normalizeWhatsAppNumber = (value?: string | null) => normalizePhoneForHref(value).replace(/^\+/, "");

const isValidHttpsUrl = (target: string) => /^https:\/\/[^\s]+$/i.test(target);
const isValidEmail = (target: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target.replace(/^mailto:/i, ""));
const isValidPhone = (target: string) => /^\+?\d[\d\s().-]{5,}$/.test(target.replace(/^tel:/i, ""));

export const getContactDetailsFromWebsite = (website?: Partial<Website> | null): BusinessContactDetails => {
  const sections = website?.pages?.flatMap((page) => page.sections || []) || [];
  const contactSection = sections.find((section) => section.type === "contact");
  const contact = contactSection?.content || {};
  return {
    businessName: website?.seo?.title?.split("|")[0]?.trim(),
    email: contact.email || website?.theme?.footer?.contactEmail || "",
    phone: contact.phone || website?.theme?.footer?.contactPhone || website?.seo?.phone || "",
    whatsapp: contact.whatsapp || contact.whatsappNumber || website?.theme?.footer?.contactPhone || website?.seo?.phone || "",
    bookingUrl: contact.bookingUrl || contact.bookingLink || "",
    checkoutUrl: contact.checkoutUrl || contact.checkoutLink || "",
    defaultMessage: contact.defaultMessage || DEFAULT_MESSAGE,
  };
};

export const buildHrefFromButton = (button: WebsiteButton, contacts: BusinessContactDetails): string => {
  const target = button.target || "";
  switch (button.actionType) {
    case "whatsapp": {
      const phone = normalizeWhatsAppNumber(target || contacts.whatsapp);
      if (!phone) return "#contact";
      const message = encodeURIComponent(contacts.defaultMessage || DEFAULT_MESSAGE);
      return `https://wa.me/${phone}?text=${message}`;
    }
    case "phone": {
      const phone = normalizePhoneForHref(target || contacts.phone);
      return phone ? `tel:${phone}` : "#contact";
    }
    case "email": {
      const email = target || contacts.email;
      return email ? `mailto:${email}` : "#contact";
    }
    case "booking_link":
    case "external_url":
    case "checkout_link":
    case "file_download":
      return target || "#contact";
    case "internal_page":
      return target.startsWith("/") ? target : `/${target.replace(/^\/+/, "")}`;
    case "section_anchor":
    case "contact_form":
      return target || "#contact";
    case "none":
    default:
      return "";
  }
};

export const inferButtonAction = (
  label: string,
  contacts: BusinessContactDetails,
  pages: WebsitePage[] = [],
): WebsiteButton => {
  const cleanLabel = (label || "Contact Us").trim();
  const normalized = cleanLabel.toLowerCase();
  const hasServicesPage = pages.some((page) => page.slug === "services");
  const hasPricingPage = pages.some((page) => page.slug === "pricing");

  const button: WebsiteButton = {
    id: generateId(),
    label: cleanLabel,
    actionType: "contact_form",
    target: "#contact",
    trackingEventName: "website_button_clicked",
  };

  if (/whatsapp|message|chat|talk to us/.test(normalized)) {
    if (contacts.whatsapp) return { ...button, actionType: "whatsapp", target: contacts.whatsapp, openInNewTab: true, trackingEventName: "whatsapp_clicked" };
    return { ...button, actionType: "contact_form", target: "#contact" };
  }

  if (/call|speak/.test(normalized)) {
    if (contacts.phone) return { ...button, actionType: "phone", target: contacts.phone, trackingEventName: "phone_clicked" };
    return { ...button, actionType: "contact_form", target: "#contact" };
  }

  if (/email/.test(normalized)) {
    if (contacts.email) return { ...button, actionType: "email", target: contacts.email, trackingEventName: "email_clicked" };
    return { ...button, actionType: "contact_form", target: "#contact" };
  }

  if (/book|schedule|appointment|reserve/.test(normalized)) {
    if (contacts.bookingUrl) return { ...button, actionType: "booking_link", target: contacts.bookingUrl, openInNewTab: true, trackingEventName: "booking_clicked" };
    if (contacts.whatsapp) return { ...button, actionType: "whatsapp", target: contacts.whatsapp, openInNewTab: true, trackingEventName: "whatsapp_clicked" };
    return { ...button, actionType: "contact_form", target: "#contact", trackingEventName: "booking_clicked" };
  }

  if (/learn|service|explore|see more|view services/.test(normalized)) {
    return hasServicesPage
      ? { ...button, actionType: "internal_page", target: "/services" }
      : { ...button, actionType: "section_anchor", target: "#services" };
  }

  if (/pricing|packages|plans/.test(normalized)) {
    return hasPricingPage
      ? { ...button, actionType: "internal_page", target: "/pricing", trackingEventName: "pricing_cta_clicked" }
      : { ...button, actionType: "section_anchor", target: "#pricing", trackingEventName: "pricing_cta_clicked" };
  }

  if (/buy|pay|subscribe|get started/.test(normalized)) {
    if (contacts.checkoutUrl) return { ...button, actionType: "checkout_link", target: contacts.checkoutUrl, openInNewTab: true, trackingEventName: "checkout_clicked" };
    if (contacts.whatsapp) return { ...button, actionType: "whatsapp", target: contacts.whatsapp, openInNewTab: true, trackingEventName: "whatsapp_clicked" };
    return { ...button, actionType: "contact_form", target: "#contact", trackingEventName: "checkout_clicked" };
  }

  if (/quote|contact|touch|enquir|enquiry|consultation/.test(normalized)) {
    if (/quote/.test(normalized) && contacts.whatsapp) return { ...button, actionType: "whatsapp", target: contacts.whatsapp, openInNewTab: true, trackingEventName: "whatsapp_clicked" };
    return { ...button, actionType: "contact_form", target: "#contact" };
  }

  return button;
};

const ensureSectionAnchor = (section: WebsiteSection) => {
  if (section.type === "services") return "services";
  if (section.type === "contact") return "contact";
  if (section.type === "pricing") return "pricing";
  if (section.type === "faq") return "faq";
  return section.id || section.type;
};

export const normalizeWebsiteForPreview = (
  website: Website,
  contacts: BusinessContactDetails = {},
): Website => {
  const repairedPages = (website.pages || []).length
    ? website.pages
    : [
        {
          id: generateId(),
          title: "Home",
          slug: "",
          sections: ["hero", "services", "about", "contact"].map((type) => ({
            ...SECTION_TEMPLATES[type],
            id: generateId(),
          })),
        },
      ];

  const mergedContacts = { ...getContactDetailsFromWebsite({ ...website, pages: repairedPages }), ...contacts };

  return {
    ...website,
    pages: repairedPages.map((page, pageIndex) => {
      const pageSlug = pageIndex === 0 && !page.slug ? "" : page.slug || page.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const sections = (page.sections || []).length
        ? page.sections
        : ["hero", "services", "contact"].map((type) => ({ ...SECTION_TEMPLATES[type], id: generateId() }));

      return {
        ...page,
        id: page.id || generateId(),
        slug: pageSlug,
        sections: sections.map((section) => {
          const content = { ...(section.content || {}) };
          if ((section.type === "hero" || section.type === "cta") && !content.ctaText && !content.buttonText) {
            content.ctaText = "Contact Us";
          }
          if (section.type === "contact") {
            content.email = content.email || mergedContacts.email || "";
            content.phone = content.phone || mergedContacts.phone || "";
            content.whatsapp = content.whatsapp || mergedContacts.whatsapp || "";
          }
          const label = content.ctaText || content.buttonText || content.primaryButtonLabel;
          if (label && !content.buttonAction) {
            content.buttonAction = inferButtonAction(label, mergedContacts, repairedPages);
          }
          if (section.type === "pricing" && Array.isArray(content.plans)) {
            content.plans = content.plans.map((plan: any) => ({
              ...plan,
              buttonAction: plan.buttonAction || inferButtonAction(plan.buttonText || "Choose Plan", mergedContacts, repairedPages),
            }));
          }
          return {
            ...section,
            id: section.id || ensureSectionAnchor(section),
            content,
            isVisible: section.isVisible !== false,
          };
        }),
      };
    }),
  };
};

export const validateWebsiteCreation = (website: Website) => {
  const issues: string[] = [];
  if (!website.id) issues.push("Missing website ID");
  if (!website.businessId) issues.push("Missing business profile link");
  if (!website.pages?.length) issues.push("Missing homepage");
  const homepage = website.pages?.find((page) => page.slug === "" || page.slug === "home" || page.title?.toLowerCase() === "home") || website.pages?.[0];
  if (!homepage) issues.push("Missing homepage");
  if ((homepage?.sections || []).length < 3) issues.push("Homepage needs at least 3 sections");
  if (!website.status) issues.push("Missing draft status");
  return { valid: issues.length === 0, issues };
};

export const auditWebsiteButtons = (website: Website): ButtonHealthIssue[] => {
  const contacts = getContactDetailsFromWebsite(website);
  const sectionIds = new Set(website.pages.flatMap((page) => page.sections.map((section) => section.id || section.type)));
  const pageTargets = new Set(website.pages.map((page) => `/${page.slug || ""}`));
  const issues: ButtonHealthIssue[] = [];

  website.pages.forEach((page) => {
    page.sections.forEach((section) => {
      const labels = [section.content?.ctaText, section.content?.buttonText].filter(Boolean) as string[];
      labels.forEach((label) => {
        const button = section.content?.buttonAction || inferButtonAction(label, contacts, website.pages);
        const target = buildHrefFromButton(button, contacts);
        let status: ButtonHealthIssue["status"] = "working";
        if (button.actionType !== "none" && !button.target && !target) status = "missing_target";
        if (["external_url", "booking_link", "checkout_link", "file_download"].includes(button.actionType) && !isValidHttpsUrl(button.target)) status = "invalid_url";
        if (button.actionType === "email" && !isValidEmail(button.target || contacts.email || "")) status = "missing_email";
        if (button.actionType === "phone" && !isValidPhone(button.target || contacts.phone || "")) status = "missing_phone";
        if (button.actionType === "whatsapp" && !normalizeWhatsAppNumber(button.target || contacts.whatsapp)) status = "missing_whatsapp";
        if (button.actionType === "section_anchor" && !sectionIds.has((button.target || "").replace("#", ""))) status = "missing_section";
        if (button.actionType === "internal_page" && !pageTargets.has(button.target)) status = "missing_page";
        issues.push({
          id: button.id || generateId(),
          pageId: page.id,
          pageName: page.title,
          sectionId: section.id,
          sectionName: section.type,
          buttonLabel: button.label || label,
          actionType: button.actionType,
          target: button.target || target,
          status,
          critical: section.type === "hero" || section.type === "contact" || section.type === "pricing" || section.type === "appointment",
        });
      });
    });
  });

  return issues;
};
