/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole =
  | "super_admin"
  | "platform_staff"
  | "business_admin"
  | "client"
  | "affiliate"
  | "staff";

export interface MonthlyWebsiteResult {
  enquiries: number;
  whatsAppClicks: number;
  callClicks: number;
  bookings: number;
  pageViews: number;
  topEnquiryPage: string | null;
  mostUsedEnquiryPath: string | null;
  opportunity: string | null;
}

export interface WebsiteImprovement {
  id: string;
  title?: string | null;
  details?: string | null;
  status?: string | null;
  allowance_period?: string | null;
  client_request_id?: string | null;
  updated_at?: string | null;
}

export type FeatureId =
  | "ai_synthesis"
  | "lead_crm"
  | "booking"
  | "automation"
  | "ecommerce"
  | "analytics"
  | "custom_domain"
  | "priority_support"
  | "ai_chatbot"
  | "review_management"
  | "advanced_seo"
  | "local_seo_geo"
  | "blog"
  | "website_growth_score"
  | "monthly_improvement_engine"
  | "whatsapp_enquiry_kit"
  | "enquiry_path_tracker"
  | "campaign_landing_pages"
  | "website_rescue_audit"
  | "industry_page_packs"
  | "industry_content"
  | "local_growth_pages"
  | "business_offer_builder"
  | "website_growth_autopilot"
  | "enquiry_loss_detector"
  | "competitor_gap_scanner"
  | "offer_strength_score"
  | "whatsapp_follow_up_crm"
  | "local_seo_opportunity_map"
  | "trust_proof_builder"
  | "campaign_calendar"
  | "sales_page_doctor"
  | "done_for_you_request_portal"
  | "review_to_website_import"
  | "local_ranking_readiness_score"
  | "monthly_website_report"
  | "trust_proof_vault"
  | "ai_receptionist_triage"
  | "before_after_rescue_tool"
  | "affiliate_system"
  | "wordpress_sync";

export interface UserProfile {
  uid: string;
  email: string;
  full_name?: string;
  role: UserRole;
  businessId?: string;
  onboardingCompleted?: boolean;
  status?: "active" | "suspended";
  staffPermissions?: string[];
  createdAt: number;
}

export interface Business {
  id: string;
  name: string;
  ownerId: string;
  plan: string;
  status: "active" | "inactive";
  industry?: string;
  businessNature?: string;
  location?: string;
  subdomain?: string;
  customDomain?: string;
  customDomainStatus?:
    | "not_connected"
    | "dns_pending"
    | "dns_detected"
    | "ssl_pending"
    | "connected"
    | "error";
  customDomainVerifiedAt?: number;
  customDomainLastCheckedAt?: number;
  customDomainError?: string;
  sslStatus?: "not_connected" | "pending" | "issued" | "error";
  sslCheckedAt?: number;
  domainDnsRecords?: Array<{
    type: string;
    name: string;
    value: string;
    expected?: string;
    detected?: boolean;
  }>;
  businessType?: string;
  aiCredits: number;
  aiCreditsUsed: number;
  trialEndsAt: number;
  gaMeasurementId?: string;
  metaPixelId?: string;
  chatbotEnabled?: boolean;
  chatbotWelcomeMessage?: string;
  chatbotModel?: string;
  trackingScriptsHeader?: string;
  trackingScriptsFooter?: string;
  aiModelConfig?: Record<string, string>;
  marketingStatus?: "none" | "trialing" | "active" | "expired";
  marketingTrialEndsAt?: number;
  marketingPlan?: "none" | "active";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeSecretKey?: string;
  stripePublishableKey?: string;
  stripeWebhookSecret?: string;
  stripeConnectedAccountId?: string;
  subscriptionStatus: "trialing" | "active" | "past_due" | "canceled";
  earlySubscriptionDate?: number;
  nextBillingDate?: number;
  platform_type?: "waas" | "wordpress";
  dashboardVisibleFeatures?: string[] | null;
  dashboardHiddenFeatures?: string[];
  dashboardAdminOnlyFeatures?: string[];
  dashboardVisibilityProfile?: string;
  dashboardVisibilityNotes?: string;
  createdAt: number;
}

export type PremiumLevel = "Launch" | "Business" | "Growth OS" | "Agency Grade";

export type WebsiteGenerationMode = "fast" | "premium" | "brand_led";
export type BrandPersonality =
  | "professional"
  | "premium"
  | "bold"
  | "friendly"
  | "technical"
  | "established"
  | "elegant"
  | "approachable";
export type BusinessMaturity = "new" | "growing" | "established" | "multi_location";
export type AssetReadiness = "professional" | "some" | "pending";

export type BusinessGoal = 
  | "Generate Leads" 
  | "Book Appointments" 
  | "Sell Packages" 
  | "Build Authority" 
  | "Collect Quote Requests" 
  | "Showcase Portfolio" 
  | "Accept Reservations" 
  | "Drive Demo Calls";

export type VisualStyle = 
  | "Premium Corporate" 
  | "Luxury Minimal" 
  | "Bold Modern" 
  | "Editorial Clean" 
  | "Dark High-Contrast" 
  | "Friendly Local" 
  | "Startup Gradient" 
  | "Immersive Visual"
  | "Property Premium"
  | "Professional Legal"
  | "Calm Wellness";

export type CTAType = 
  | "WhatsApp" 
  | "Book Call" 
  | "Get Quote" 
  | "Call Now" 
  | "Reserve Table" 
  | "View Properties" 
  | "Start Free Trial" 
  | "Request Consultation";

export type IndustryCategory = 
  | "Local Services" 
  | "Clinic / Healthcare" 
  | "Real Estate" 
  | "Legal" 
  | "Consultant" 
  | "Restaurant" 
  | "SaaS" 
  | "Personal Brand" 
  | "Corporate" 
  | "Fitness" 
  | "Wellness" 
  | "Retail / Boutique" 
  | "Portfolio" 
  | "Hospitality";

export interface NicheTemplate {
  id: string;
  name: string;
  premiumName: string;
  category: IndustryCategory;
  bestFor: string;
  businessGoal: BusinessGoal;
  visualStyle: VisualStyle;
  targetMarket?: string;
  recommendedCta?: CTAType;
  ctaType: CTAType;
  premiumLevel: PremiumLevel;
  description: string;
  thumbnail?: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    style: string;
    defaultStyle?: string;
  };
  pages: any[]; // Using any[] here to avoid circular dependencies if needed, but we'll try to refine
  conversionFeatures: string[];
  seoFocus: string;
  trustElements: string[];
  leadCapture: string;
  automation: string;
  qualityChecklist?: string[];
  recommendedFor?: string[];
  previewCopy?: {
    heroHeadline: string;
    heroSubheadline: string;
    ctaText: string;
  };
}

export interface WebsiteSection {
  id: string;
  type:
    | "hero"
    | "services"
    | "testimonials"
    | "pricing"
    | "faq"
    | "contact"
    | "about"
    | "features"
    | "problem"
    | "solution"
    | "benefits"
    | "proof"
    | "cta"
    | "appointment"
    | "blog_list"
    | "blog_post"
    | "text_content"
    | "team"
    | "industry_content"
    | "product_list";
  content: any;
  isVisible?: boolean;
  settings?: {
    variant?: string;
    designProfile?: string;
    motionProfile?: string;
    imageTreatment?: string;
    backgroundColor?: string;
    bgColor?: string;
    textColor?: string;
    padding?: string;
    verticalPadding?: "none" | "small" | "medium" | "large" | "xlarge";
    horizontalPadding?: "none" | "small" | "medium" | "large";
    useCustomPadding?: boolean;
    paddingTop?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    paddingRight?: number;
    backgroundImage?: string;
    isContained?: boolean;
    textAlign?: "left" | "center" | "right";
  };
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    brandVoice?: string;
  };
}

export type ButtonActionType =
  | "internal_page"
  | "section_anchor"
  | "whatsapp"
  | "phone"
  | "email"
  | "contact_form"
  | "booking_link"
  | "external_url"
  | "checkout_link"
  | "file_download"
  | "none";

export interface WebsiteButton {
  id: string;
  label: string;
  actionType: ButtonActionType;
  target: string;
  openInNewTab?: boolean;
  trackingEventName?: string;
}

export interface ButtonHealthIssue {
  id: string;
  pageId?: string;
  pageName?: string;
  sectionId?: string;
  sectionName?: string;
  buttonLabel: string;
  actionType: ButtonActionType;
  target: string;
  status:
    | "working"
    | "missing_target"
    | "invalid_url"
    | "missing_section"
    | "missing_page"
    | "missing_phone"
    | "missing_whatsapp"
    | "missing_email"
    | "hidden_data_missing";
  critical?: boolean;
}

export interface WebsitePage {
  id: string;
  title: string;
  slug: string;
  sections: WebsiteSection[];
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
    favicon?: string;
    canonicalUrl?: string;
    // GEO & Local SEO Overrides
    region?: string;
    placename?: string;
    latitude?: string;
    longitude?: string;
    businessType?: string;
    address?: string;
    phone?: string;
    openingHours?: string[];
    priceRange?: string;
    // GEO (Generative Engine Optimization)
    brandVoice?: string;
    coreValueProposition?: string;
    targetAudience?: string;
  };
}

export interface Website {
  id: string;
  businessId: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    logoUrl?: string;
    style?:
      | "modern"
      | "neumorphic"
      | "glassmorphic"
      | "brutalist"
      | "editorial"
      | "action"
      | "immersive"
      | "authority"
      | "corporate"
      | "prestige"
      | "luxury_dark";
    /** Approved visual direction used by the shared renderer. Legacy themes fall back safely. */
    designProfile?:
      | "editorial_luxury"
      | "modern_minimal"
      | "bold_contemporary"
      | "trust_authority"
      | "craft_organic"
      | "brand_corporate";
    typographyProfile?: string;
    spacingProfile?: "compact" | "balanced" | "editorial" | "immersive";
    motionProfile?: "none" | "subtle" | "refined" | "expressive" | "cinematic";
    imageProfile?: "editorial" | "clean" | "graphic" | "documentary" | "organic";
    layoutDensity?: "compact" | "balanced" | "editorial" | "immersive";
    generationMode?: WebsiteGenerationMode;
    brandPersonality?: BrandPersonality;
    businessMaturity?: BusinessMaturity;
    assetReadiness?: AssetReadiness;
    displayFont?: string;
    bodyFont?: string;
    customSelectors?: {
      id: string;
      selector: string;
      css?: string;
      content?: string;
      isEnabled: boolean;
    }[];
    footer?: {
      showMenu: boolean;
      showSocials: boolean;
      showContact: boolean;
      customText?: string;
      contactEmail?: string;
      contactPhone?: string;
      contactAddress?: string;
      socialLinks?: {
        platform:
          | "facebook"
          | "twitter"
          | "instagram"
          | "linkedin"
          | "youtube"
          | "tiktok";
        url: string;
        isVisible?: boolean;
      }[];
    };
  };
  pages: WebsitePage[];
  seo: {
    title: string;
    description: string;
    keywords: string[];
    favicon?: string;
    ogImage?: string;
    canonicalUrl?: string;
    // GEO & Local SEO
    region?: string;
    placename?: string;
    latitude?: string;
    longitude?: string;
    businessType?: string;
    address?: string;
    phone?: string;
    openingHours?: string[];
    priceRange?: string;
    ratingValue?: number;
    reviewCount?: number;
    // GEO (Generative Engine Optimization)
    brandVoice?: string;
    targetAudience?: string;
    coreValueProposition?: string;
    knowledgeBaseSummary?: string;
    workflowStatus?: "draft" | "in_review" | "changes_requested" | "ready_to_launch" | "live";
    deliveryStandardVersion?: string;
    assetVault?: {
      logoUrl?: string;
      heroImageUrl?: string;
      storyImageUrl?: string;
      projectImageUrl?: string;
      proofLogoUrl?: string;
      proofLogoName?: string;
      proofLogoRelationship?: string;
      brandNotes?: string;
      complianceNotes?: string;
      referenceLinks?: string[];
    };
    deliveryQuality?: {
      internalCreativeReviewApproved?: boolean;
      responsiveQaApproved?: boolean;
      customerApprovalRecorded?: boolean;
      lastReviewedAt?: string;
      lastReviewedBy?: string;
      lastLaunchApprovedAt?: string;
    };
    launchGate?: {
      ready?: boolean;
      blockers?: string[];
      warnings?: string[];
      checkedAt?: string;
      standardVersion?: string;
    };
    publishedVersion?: {
      id?: string;
      publishedAt?: string;
      standardVersion?: string;
    } | null;
    releaseHistory?: Array<{
      id?: string;
      publishedAt?: string;
      standardVersion?: string;
    } | null>;
    buttonHealth?: {
      total?: number;
      working?: number;
      broken?: number;
      critical?: number;
      criticalBroken?: number;
      updatedAt?: string;
      checkedAt?: string;
    };
  };
  status: "published" | "draft";
  updatedAt: number;
}

export interface Lead {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  status: "new" | "contacted" | "qualified" | "engaged" | "meeting" | "closed";
  visitorId?: string;
  source?: string;
  score?: number;
  notes?: string;
  rawFields?: Record<string, any>;
  automationScore?: number;
  automationNextAction?: string;
  automationTemperature?: "Cold" | "Warm" | "Hot";
  lastFollowUpAt?: number;
  nextFollowUpAt?: number;
  firstResponseAt?: number;
  responseChannel?: "email" | "whatsapp" | "phone" | "manual";
  lastActiveAt?: number;
  createdAt: number;
}

export interface LeadRemark {
  id: string;
  lead_id: string;
  profile_id: string;
  remark: string;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface BlogPost {
  id: string;
  businessId: string;
  title: string;
  content: string;
  excerpt: string;
  author: string;
  status: "published" | "draft";
  createdAt: number;
  updatedAt: number;
  imageUrl?: string;
  slug?: string;
}

export interface AnalyticEvent {
  id: string;
  websiteId: string;
  eventType: "page_view" | "click";
  path: string;
  timestamp: number;
  metadata?: any;
}

export interface Appointment {
  id: string;
  businessId: string;
  customerName: string;
  customerEmail: string;
  service: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateProgram {
  id: string;
  businessId: string;
  isEnabled: boolean;
  baseCommissionRate: number;
  payoutMinimum: number;
  cookieDurationDays: number;
  termsAndConditions?: string;
  createdAt: number;
}

export interface CommissionTier {
  id: string;
  programId: string;
  name: string;
  commissionRate: number;
  requirementType: "total_sales" | "referral_count" | "revenue_generated";
  requirementValue: number;
}

export interface Affiliate {
  id: string;
  uid: string;
  businessId: string;
  referralCode: string;
  status: "pending" | "active" | "suspended";
  totalEarnings: number;
  unpaidEarnings: number;
  totalReferrals: number;
  createdAt: number;
}

export interface AffiliateReferral {
  id: string;
  affiliateId: string;
  referredUserId: string;
  status: "pending" | "converted" | "cancelled";
  commissionAmount: number;
  saleAmount?: number;
  createdAt: number;
}

export interface AffiliatePayout {
  id: string;
  affiliateId: string;
  amount: number;
  status: "pending" | "processed" | "failed";
  paymentMethod?: string;
  processedAt?: number;
  createdAt: number;
}

export interface Notification {
  id: string;
  userId: string;
  businessId: string;
  title: string;
  message: string;
  type: "lead" | "appointment" | "payout" | "system" | "billing";
  isRead: boolean;
  metadata?: any;
  createdAt: number;
}

export interface ApiKey {
  id: string;
  business_id: string;
  key_prefix: string;
  name: string;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
}
