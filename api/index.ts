Warning: truncated output (original token count: 194297)
Total output lines: 15507

import { fetchPublishedPreviewContent, isPreviewPublicRead } from "../server/previewPublicContent.js";
import { buildInboundNewsletterMessages, INBOUND_NEWSLETTER_CONSENT, isSupportedNewsletterMarket } from "../server/inboundNewsletter.js";
import express from "express";
import compression from "compression";
import cors from "cors";
import path from "path";
import dns from "node:dns";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { gzipSync } from "node:zlib";
import Stripe from "stripe";
import dotenv from "dotenv";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { waitUntil } from "@vercel/functions";
import { Resend } from "resend";
import { classifyResendSendError, emailProviderStatus, selectEmailProvider, sendHostingerMail, verifyHostingerSmtp } from "../server/emailProviders.js";
import { z } from "zod";
import { Redis } from "@upstash/redis";
import { SharedAbuseProtection, getRateLimitClientIp, isSensitiveRateLimit } from "../server/sharedAbuseProtection.js";
import { callDeepSeek, callOpenAI } from "../src/lib/ai-providers.js";
import { analyzeWebsiteHtml, normalizeWebsiteAuditResult } from "../src/lib/websiteAudit.js";
import {
  classifyTenantHost,
  getAcceptedVercelCnames,
  getDomainLookupCandidates,
  getPlatformHosts,
  getPrimaryVercelCname,
  isValidCustomDomain,
  normalizeDomainInput,
  VERCEL_APEX_A,
} from "../src/lib/tenantDomains.js";
import {
  ensureVercelProjectDomain,
  getVercelDnsInstructions,
  isVercelDomainsConfigured,
  removeVercelProjectDomain,
} from "../server/vercelDomains.js";
import { auditReportPath, createAuditShareCode, isAuditShareCode } from "../server/auditShareLinks.js";
import {
  claimAsyncJob,
  completeAsyncJob,
  createAsyncJob,
  failAsyncJob,
  getAsyncJob,
  getJobWorkerSecret,
  publishJobToQstash,
  type AsyncJobRecord,
} from "../server/jobQueue.js";
import {
  captureServerError,
  initServerObservability,
  requestLogger,
  structuredLog,
} from "../server/observability.js";
import { analyzeTechnicalSeo } from "../server/seo/auditEngine.js";
import { loadSeoWorkspace, resolveSeoAccess } from "../server/seo/service.js";
import {
  escapeHtml as escapePortfolioHtml,
  normalizePortfolioLead,
  PORTFOLIO_LEAD_MAX_BODY_BYTES,
} from "../src/lib/portfolioLead.js";
import {
  buildAvailableSalesCallSlots,
  isAllowedSalesCallSlot,
  SALES_CALL_DURATION_MINUTES,
  SALES_CALL_TIMEZONE,
} from "../server/salesCallSlots.js";
import { resolveOnboardingPlan } from "../server/onboarding.js";
import { canTransitionLifecycle } from "../src/lib/operatingSystem.js";
import { buildInboundLeadSnapshot } from "../server/leadGeneration.js";
import { buildPublicPreviewProfile, extractPreviewEvidenceUrls } from "../server/publicPreview.js";
import { archiveDueNoReplyProspects } from "../server/prospectLifecycle.js";
import { canManageSalesOperations, isSalesSuppressed, exactEmailPattern, normalizeSalesEmail, recordSalesDeliveryEvent, recordSalesReply, runSalesDelivery, renderProspectFollowUpStage, renderProspectInitialEmail, resolveProspectFollowUpAsset, salesRecordId, saveManualOutreach, saveSalesCallOutcome, sendDirectProspectOutreach, suppressSalesRecipient } from "../server/salesOperations.js";
import { buildProspectFollowUpPlan, bulkManageProspectFollowUps, scheduleProspectFollowUpPlan, syncProspectNextFollowUp } from "../server/prospectFollowUps.js";
import { reactivateArchivedProspect } from "../server/prospectLifecycle.js";
import { registerOutreachCompletionRoutes } from "../server/outreachCompletionRoutes.js";
import { attachUploaderOutreachDeclaration, parseProspectCsv } from "../src/lib/prospectImport.js";
import { parseRecipientConsentCsv } from "../src/lib/recipientConsentImport.js";
import { manualRecipientEvidenceSchema } from "../src/lib/manualRecipientEvidence.js";
import { scoreProspect } from "../src/lib/prospectScoring.js";
import { PROSPECT_TEMPLATE_KEYS, validateProspectEmailTemplate } from "../src/lib/prospectOutreachTemplates.js";
import type { ProspectEmailTemplateKey, ProspectEmailOverrides } from "../src/lib/prospectOutreachTemplates.js";
import { COMMERCIAL_DEFAULT_COMMITMENT_MONTHS, COMMERCIAL_RECURRING_COMMITMENT_MONTHS, getMinimumTermMonths } from "../src/lib/commercialPricing.js";
import { DEFAULT_LAUNCH_FLAGS, normalizeLaunchFlags, type LaunchFlags } from "../src/lib/launchFlags.js";
import {
  DELIVERY_STANDARD_VERSION,
  PLAN_DELIVERY_STANDARDS,
  addBusinessDays,
  legacyPlanToPublicPlanSlug,
} from "../src/constants/deliveryStandards.js";
import { buildInternalContentPrompt, INTERNAL_CONTENT_SYSTEM_PROMPT, InternalContentBriefSchema, parseInternalContentDraft, buildHumaniseContentPrompt, HUMANISE_CONTENT_SYSTEM_PROMPT, parseHumaniseContentDraft } from "../src/lib/internalAiContentEngine.js";
import { buildDesignDirectionPrompt, DESIGN_DIRECTOR_SYSTEM_PROMPT, parseDesignDirection } from "../src/lib/designDirector.js";
import { buildPortableWebsiteFiles } from "../src/lib/websiteHandover.js";
import { HANDOVER_GRACE_DAYS, handoverGraceUntil, subscriptionAllowsPermanentDeletion } from "../src/lib/billingLifecycle.js";
import { nextStepForSubmission } from "../src/lib/funnelEngine.js";
import { registerSimpleFunnelAddonRoutes, handleSimpleFunnelAddonWebhook, cancelSimpleFunnelWithParent } from "../server/simpleFunnelAddon.js";
import { registerUnifiedFunnelTierRoutes, handleUnifiedFunnelTierWebhook, cancelUnifiedFunnelWithParent, unifiedFunnelMayServe, getUnifiedFunnelAccess } from "../server/unifiedFunnelTiers.js";
import { processDueFunnelWorkflowRuns, runFunnelAutomations } from "../server/funnelAutomation.js";
// Dark-launch until the new entitlement migration has been installed and verified.
const UNIFIED_FUNNEL_TIERS_ENABLED = process.env.UNIFIED_FUNNEL_TIERS_ENABLED === "true";
import { queueFunnelTrigger, processFunnelTriggerQueue } from "../server/funnelTriggerQueue.js";
import { runFinalLaunchCrawler } from "../server/finalLaunchQa.js";
import { isNewIntroOfferCustomer } from "./introOfferEligibility.js";
import { resolveStripeCommercialPlan } from "../src/lib/stripeCommercialPlanMapping.js";
import { getClosedReportPeriod, shouldRunMonthlyReportSchedule } from "../src/lib/monthlyGrowthReportWorkflow.js";
import { summarizePlatformTraffic } from "../src/lib/trafficAnalytics.js";
import { recordPaidServicePeriod } from "../server/paidServicePeriods.js";
import { checkMonthlyEnquiryRoutes } from "../server/enquiryRouteChecks.js";
import { generateMonthlyGrowthReportDrafts } from "../server/monthlyGrowthReports.js";
import {
  inspectServerSupabaseEnvironment,
  SUPABASE_UNCONFIGURED_KEY,
  SUPABASE_UNCONFIGURED_URL,
} from "../server/supabaseEnvironment.js";

dotenv.config();
initServerObservability();

const COMMERCIAL_TERMS_VERSION = "2026.09.27";

const serverSupabaseEnvironment = inspectServerSupabaseEnvironment(process.env);
const supabaseUrl = serverSupabaseEnvironment.configured
  ? serverSupabaseEnvironment.url
  : SUPABASE_UNCONFIGURED_URL;
const supabaseAnonKey = serverSupabaseEnvironment.configured
  ? serverSupabaseEnvironment.anonKey
  : SUPABASE_UNCONFIGURED_KEY;
const supabaseServiceKey = serverSupabaseEnvironment.configured
  ? serverSupabaseEnvironment.serviceKey
  : SUPABASE_UNCONFIGURED_KEY;

if (!serverSupabaseEnvironment.configured) {
  structuredLog("warn", "supabase_server_configuration_unavailable", {
    missingEnvironment: serverSupabaseEnvironment.missing,
    invalidEnvironment: serverSupabaseEnvironment.invalid,
  });
}

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Admin client for server-side operations that should bypass RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Production-safe shared limiter: prefer Upstash when available, otherwise
 * use the existing Supabase Postgres RPC with an atomic UPSERT.
 * No additional infrastructure account is required for the PostgreSQL path.
 */
const postgresRateLimiter = serverSupabaseEnvironment.configured ? {
  async eval(_script: string, keys: string[], args: (string | number)[]): Promise<unknown> {
    const { data, error } = await supabaseAdmin.rpc("bs_consume_abuse_quota", {
      p_key: keys[0],
      p_max: Number(args[0]),
      p_window_ms: Number(args[1]),
    });
    if (error) {
      structuredLog("error", "postgres_abuse_counter_unavailable", { code: String(error.code || "rpc_failure") });
      throw new Error("Shared rate limiter database RPC unavailable");
    }
    return data;
  },
} : null;
const rateLimitStore = redis || postgresRateLimiter;
if (!rateLimitStore) {
  structuredLog("warn", "shared_rate_limit_store_unconfigured", {
    message: "No Redis or PostgreSQL shared abuse counter is configured.",
  });
} else {
  structuredLog("info", "shared_rate_limit_backend_selected", { backend: redis ? "redis" : "postgres" });
}
const abuseProtection = new SharedAbuseProtection({
  redis: rateLimitStore,
  requireShared: process.env.ABUSE_REQUIRE_SHARED_REDIS === "true" ||
    process.env.ABUSE_REQUIRE_SHARED_STORE === "true" ||
    process.env.VERCEL_ENV === "production",
  hashSecret: process.env.ABUSE_RATE_LIMIT_HASH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  warn: (message, context) => structuredLog("warn", message, context),
});

let platformSettings: any = null;
let platformSettingsLoadedAt = 0;
const PLATFORM_SETTINGS_TTL_MS = 60_000;
let launchFlags: LaunchFlags = DEFAULT_LAUNCH_FLAGS;
let launchFlagsLoadedAt = 0;

async function refreshLaunchFlags(force = false): Promise<LaunchFlags> {
  // E2E runs use deterministic local defaults; never make the test server depend
  // on a real Supabase project or network availability.
  if (process.env.E2E_TEST === "true") return launchFlags;
  if (!serverSupabaseEnvironment.configured) return DEFAULT_LAUNCH_FLAGS;
  if (!force && Date.now() - launchFlagsLoadedAt < PLATFORM_SETTINGS_TTL_MS) return launchFlags;
  try {
    const { data, error } = await supabaseAdmin.from("settings").select("content").eq("id", "launch_flags").maybeSingle();
    if (error) throw error;
    launchFlags = normalizeLaunchFlags(data?.content);
    launchFlagsLoadedAt = Date.now();
  } catch (error) {
    // Fail closed: a settings outage must not expose the new catalogue or AI controls.
    launchFlags = DEFAULT_LAUNCH_FLAGS;
    captureServerError(error, { phase: "launch_flags_refresh" });
  }
  return launchFlags;
}

async function refreshPlatformSettings(force = false) {
  // Keep browser tests hermetic. Production still loads settings from Supabase.
  if (process.env.E2E_TEST === "true") return;
  if (!serverSupabaseEnvironment.configured) return;
  if (!force && Date.now() - platformSettingsLoadedAt < PLATFORM_SETTINGS_TTL_MS) return;
  try {
    const { data, error } = await supabaseAdmin
      .from("settings")
      .select("content")
      .eq("id", "platform")
      .maybeSingle();
    if (error) throw error;
    if (data?.content) {
      const stripeKeyChanged = data.content.stripeSecretKey !== platformSettings?.stripeSecretKey;
      const resendKeyChanged = data.content.resendApiKey !== platformSettings?.resendApiKey;
      platformSettings = data.content;
      if (stripeKeyChanged) stripeInstance = null;
      if (resendKeyChanged) resendConfigCache.clear();
    }
    platformSettingsLoadedAt = Date.now();
  } catch (err) {
    captureServerError(err, { phase: "platform_settings_refresh" });
  }
}

refreshPlatformSettings().catch((error) => captureServerError(error, { phase: "platform_settings_initial_load" }));

// Dist folder resolution
const distPath = path.resolve(process.cwd(), "dist");

let stripeInstance: Stripe | null = null;
const merchantStripeCache = new Map<
  string,
  { instance: Stripe; timestamp: number }
>();

type ResendPurpose = "transactional" | "sales";
type ResendProviderConfig = { expires: number; key: string; from: string; client: Resend };
const resendConfigCache = new Map<ResendPurpose, ResendProviderConfig>();
async function getResendProvider(purpose: ResendPurpose = "transactional"): Promise<{ client: Resend; from: string }> {
  const cached = resendConfigCache.get(purpose);
  if (!cached || cached.expires <= Date.now()) {
    // Only the server-role connection reads Vault; API keys are never returned to the UI.
    const { data, error } = await supabaseAdmin.rpc("get_resend_provider_credentials_for_purpose", { p_purpose: purpose });
    if (error) {
      structuredLog("warn", "resend_provider_vault_read_failed", { code: error.code || "unknown", purpose });
      throw new Error("RESEND_CONFIG_ERROR");
    }
    const portal = Array.isArray(data) ? data[0] : null;
    const key = String(portal?.api_key || process.env.RESEND_API_KEY || "").trim();
    const from = String(portal?.from_address || process.env.RESEND_FROM_EMAIL || platformSettings?.emailFrom || "").trim();
    if (!key.startsWith("re_") || key.includes("TODO") || !from) throw new Error("RESEND_CONFIG_ERROR");
    resendConfigCache.set(purpose, { expires: Date.now() + 15_000, key, from, client: new Resend(key) });
  }
  const config = resendConfigCache.get(purpose)!;
  return { client: config.client, from: config.from };
}
const MAX_CACHE_SIZE = 500; // Keep up to 500 active merchant instances in memory
const CACHE_TTL = 1000 * 60 * 60; // 1 hour TTL

async function getStripe(merchantBusinessId?: string) {
  // Preview-only checkout tests can supply an isolated Stripe test key without
  // ever changing the production/live credential. The flag is deliberately
  // explicit so production continues using the live key by default.
  const configuredPlatformKey =
    process.env.NODE_ENV !== "production" &&
    process.env.STRIPE_TEST_DYNAMIC_PRICES === "true" &&
    process.env.STRIPE_TEST_SECRET_KEY
      ? process.env.STRIPE_TEST_SECRET_KEY
      : process.env.STRIPE_SECRET_KEY;
  let key = configuredPlatformKey;

  if (merchantBusinessId) {
    const cached = merchantStripeCache.get(merchantBusinessId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      cached.timestamp = Date.now(); // Refresh timestamp
      return cached.instance;
    }

    // Cleanup cache if it gets too big
    if (merchantStripeCache.size > MAX_CACHE_SIZE) {
      const oldestKey = merchantStripeCache.keys().next().value;
      if (oldestKey) merchantStripeCache.delete(oldestKey);
    }

    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("stripe_secret_key, stripe_connected_account_id")
      .eq("id", merchantBusinessId)
      .single();

    // Case 1: Merchant provided their own Secret Key (legacy/manual)
    if (biz?.stripe_secret_key && biz.stripe_secret_key.trim() !== "") {
      key = biz.stripe_secret_key.trim();
      const merchantStripe = new Stripe(key, {
        apiVersion: "2025-01-27.acacia" as any,
      });
      merchantStripeCache.set(merchantBusinessId, {
        instance: merchantStripe,
        timestamp: Date.now(),
      });
      return merchantStripe;
    }

    // Case 2: Merchant used Stripe Connect (Single Click)
    if (biz?.stripe_connected_account_id) {
      const platformKey = configuredPlatformKey;
      if (platformKey && platformKey.startsWith("sk_")) {
        const merchantStripe = new Stripe(platformKey, {
          apiVersion: "2025-01-27.acacia" as any,
          stripeAccount: biz.stripe_connected_account_id,
        });
        merchantStripeCache.set(merchantBusinessId, {
          instance: merchantStripe,
          timestamp: Date.now(),
        });
        return merchantStripe;
      }
    }
  }

  if (
    !key ||
    key === "" ||
    key.trim() === "" ||
    key.includes("TODO") ||
    key === "undefined" ||
    key === "null"
  ) {
    throw new Error("STRIPE_CONFIG_ERROR");
  }

  key = key.trim();

  if (key.startsWith("pk_")) {
    throw new Error("STRIPE_SECRET_KEY_REQUIRED_BUT_GOT_PUBLISHABLE");
  }

  if (!key.startsWith("sk_") && !key.startsWith("rk_")) {
    throw new Error("STRIPE_INVALID_KEY_FORMAT");
  }

  if (!stripeInstance) {
    stripeInstance = new Stripe(key, {
      apiVersion: "2025-01-27.acacia" as any,
    });
  }
  return stripeInstance;
}

/**
 * Keep the customer-facing Stripe Product label aligned with the current
 * commercial catalogue without creating replacement Prices or Products.
 * Historical Stripe Prices can retain a retired Product name after the
 * application catalogue is renamed, so repair only the attached Product.
 */
async function syncCommercialStripeProductLabel(
  stripe: Stripe,
  priceId: string,
  expectedName: string,
  expectedDescription?: string | null,
) {
  const livePrice: any = await stripe.prices.retrieve(priceId, { expand: ["product"] });
  const product = livePrice.product && typeof livePrice.product === "object" ? livePrice.product : null;
  if (!product || product.active === false) throw new Error("STRIPE_CATALOG_MISMATCH");
  const expectedProductDescription = String(expectedDescription || "").trim().slice(0, 500);
  const updates: Record<string, string> = {};
  if (String(product.name || "").trim() !== expectedName) updates.name = expectedName;
  if (expectedProductDescription && String(product.description || "").trim() !== expectedProductDescription) {
    updates.description = expectedProductDescription;
  }
  if (Object.keys(updates).length > 0) {
    await stripe.products.update(product.id, updates);
  }
  return livePrice;
}

const useCredits = async (
  businessId: string,
  amount: number = 1,
  useCase: string = "internal",
  modelName: string = "none",
) => {
  try {
    const { data: biz, error } = await supabase
      .from("businesses")
      .select("ai_credits, ai_credits_used")
      .eq("id", businessId)
      .single();

    if (error) {
      console.warn("Credit check/tracking failed:", error);
      // If columns don't exist yet, we allow the operation but log it
      if (error.code === "42703") {
        // Undefined column
        return;
      }
      throw error;
    }

    if (!biz) return;

    // Only enforce if ai_credits is set (not 0)
    if (biz.ai_credits > 0 && (biz.ai_credits_used || 0) >= biz.ai_credits) {
      throw new Error(
        "AI-assisted editing allowance reached. Please use a managed update request or contact support.",
      );
    }

    await supabaseAdmin.rpc("increment_ai_usage", {
      biz_id: businessId,
      amount,
      use_case_name: useCase,
      model_name: modelName,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("allowance reached")) {
      throw err;
    }
    console.error("AI Usage Tracking Error:", err);
    // Continue anyway to not break the user experience if tracking fails
  }
};

function hashApiKey(apiKey: string) {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

const app = express();

const jsonBodyParser = express.json({
  limit: "1mb",
  verify: (req: any, _res, buffer) => {
    req.rawBody = buffer;
  },
});

// Most API routes need parsed JSON bodies, including several privileged admin
// routes that are registered before the Stripe webhook. Keep the webhook raw
// so Stripe signature verification receives the exact request bytes.
// Deployment-safe body parsing hotfix verified for production admin actions.
app.use((req, res, next) => {
  if (req.path === "/api/webhook" || req.path === "/api/webhooks/resend") return next();
  return jsonBodyParser(req, res, next);
});

const normalizeCommercialMarket = (value: unknown) => {
  const market = String(value || "").toUpperCase();
  if (market === "MY") return "MY";
  if (market === "SG") return "SG";
  if (market === "GB" || market === "UK") return "GB";
  return "INTL";
};
const commercialCurrencyForMarket = (market: string) => ({ MY: "MYR", SG: "SGD", GB: "GBP", INTL: "USD" } as Record<string, string>)[market] || "USD";
const commercialMarketForCurrency = (currency: unknown) => {
  const normalized = String(currency || "USD").toUpperCase();
  if (normalized === "MYR") return "MY";
  if (normalized === "SGD") return "SG";
  if (normalized === "GBP") return "GB";
  return "INTL";
};
// Privileged OTC waiver resolution. Never read waived amounts from customer input.
const resolveOtcWaiver = async (businessId?: string | null): Promise<"global" | "customer" | null> => {
  const global = await supabaseAdmin.from("commercial_otc_waivers").select("waived").eq("scope","global").maybeSingle();
  if (global.error) throw global.error;
  if (global.data?.waived === true) return "global";
  if (!businessId) return null;
  const account = await supabaseAdmin.from("commercial_otc_waivers").select("waived")
    .eq("scope","customer").eq("business_id",businessId).maybeSingle();
  if (account.error) throw account.error;
  return account.data?.waived === true ? "customer" : null;
};
app.use(compression());
app.disable("x-powered-by");
app.use((req, res, next) => {
  const localDevelopment = process.env.NODE_ENV !== "production" && !process.env.VERCEL;
  const requestId = String(req.headers["x-request-id"] || crypto.randomUUID());
  (req as any).requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Origin-Agent-Cluster", "?1");
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self)",
  );
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self'${localDevelopment ? " 'unsafe-inline'" : ""} https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://s.pinimg.com https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      `connect-src 'self'${localDevelopment ? " ws://127.0.0.1:* ws://localhost:*" : ""} https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.deepseek.com https://api.openai.com https://api.resend.com https://ct.pinterest.com https://challenges.cloudflare.com https://*.sentry.io https://*.ingest.sentry.io`,
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://ct.pinterest.com https://challenges.cloudflare.com",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "form-action 'self' https://checkout.stripe.com",
    ].join("; "),
  );
  next();
});
app.use(requestLogger);

// Read-only public content can be inspected in Vercel preview without granting
// the preview deployment access to production Supabase or Stripe credentials.
app.use(async (req, res, next) => {
  if (!isPreviewPublicRead(process.env, req.method, req.path, serverSupabaseEnvironment.configured)) {
    return next();
  }
  try {
    const payload = await fetchPublishedPreviewContent(req.path);
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
    res.setHeader("X-Bennie-Preview-Source", "published-public-only");
    return res.status(200).json(payload);
  } catch {
    // Never substitute sample amounts or route preview writes into production.
    return res.status(503).json({ error: "Published public content could not be verified." });
  }
});
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const STATE_MAX_AGE_MS = 10 * 60 * 1000;
const UUID_SCHEMA = z.string().uuid();
const EMAIL_SCHEMA = z.string().email().max(254);
const TEXT_SCHEMA = z.string().trim().min(1).max(500);
const OPTIONAL_TEXT_SCHEMA = z.string().trim().max(5000).optional().nullable();
const BILLING_GRACE_DAYS = Math.max(0, Number(process.env.BILLING_GRACE_DAYS || 7));
const PUBLIC_URL_SCHEMA = z
  .string()
  .url()
  .max(2048)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "URL must use http or https");


const PORTFOLIO_LEAD_ORIGIN = "https://portfolio.bennietay.com";

function portfolioLeadCors(req: any, res: any, next: any) {
  const origin = String(req.headers.origin || "");
  res.setHeader("Vary", "Origin");
  if (origin === PORTFOLIO_LEAD_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", PORTFOLIO_LEAD_ORIGIN);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (origin !== PORTFOLIO_LEAD_ORIGIN) {
    return res.status(403).json({ error: "Origin not allowed" });
  }
  return next();
}

function getClientIp(req: any) {
  return getRateLimitClientIp(req);
}

function rateLimit(options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
  key?: (req: any) => string;
}) {
  return async (req: any, res: any, next: any) => {
    // The test bypass must never run on a hosted deployment.
    if (process.env.E2E_TEST === "true" && !process.env.VERCEL && process.env.NODE_ENV !== "production") return next();

    const result = await abuseProtection.consume({
      keyPrefix: options.keyPrefix,
      identity: options.key ? String(options.key(req)) : getClientIp(req),
      windowMs: options.windowMs,
      max: options.max,
      sensitive: isSensitiveRateLimit(options.keyPrefix),
    });
    res.setHeader("X-RateLimit-Limit", String(options.max));
    res.setHeader("X-RateLimit-Remaining", String(result.remaining));
    if (result.status === "allowed") return next();

    res.setHeader("Retry-After", String(Math.max(1, Math.ceil(result.retryAfterMs / 1000))));
    res.setHeader("Cache-Control", "no-store");
    if (result.status === "unavailable") {
      return res.status(503).json({ error: "This action is temporarily unavailable. Please try again shortly." });
    }
    structuredLog("info", "abuse_rate_limit_exceeded", { scope: options.keyPrefix, source: result.source });
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  };
}

const googlePlacesApiKey = () =>
  String(process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "").trim();

const normalizeGooglePlace = (place: any) => ({
  id: String(place?.id || ""),
  placeId: String(place?.id || ""),
  displayName: String(place?.displayName?.text || place?.displayName || ""),
  formattedAddress: String(place?.formattedAddress || "") || null,
  rating: Number.isFinite(Number(place?.rating)) ? Number(place.rating) : null,
  userRatingCount: Number.isFinite(Number(place?.userRatingCount)) ? Number(place.userRatingCount) : null,
  googleMapsUri: String(place?.googleMapsUri || "") || null,
  reviews: Array.isArray(place?.reviews)
    ? place.reviews.slice(0, 5).map((review: any) => ({
        id: String(review?.name || review?.publishTime || crypto.randomUUID()),
        authorName: String(review?.authorAttribution?.displayName || "Google reviewer"),
        authorUri: String(review?.authorAttribution?.uri || "") || null,
        authorPhotoUri: String(review?.authorAttribution?.photoUri || "") || null,
        rating: Number.isFinite(Number(review?.rating)) ? Number(review.rating) : 0,
        text: String(review?.text?.text || review?.originalText?.text || "").trim(),
        relativeTime: String(review?.relativePublishTimeDescription || "") || null,
        publishTime: String(review?.publishTime || "") || null,
      }))
    : [],
});

async function fetchGooglePlaceDetails(placeId: string) {
  const apiKey = googlePlacesApiKey();
  if (!apiKey) throw new Error("GOOGLE_PLACES_NOT_CONFIGURED");
  const normalizedPlaceId = String(placeId || "").trim();
  if (!/^[A-Za-z0-9_\-:.]{10,300}$/.test(normalizedPlaceId)) {
    throw new Error("INVALID_GOOGLE_PLACE_ID");
  }

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(normalizedPlaceId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,rating,userRatingCount,reviews,googleMapsUri",
      },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    structuredLog("warn", "google_places_details_failed", { status: response.status });
    throw new Error("GOOGLE_PLACES_FETCH_FAILED");
  }
  return normalizeGooglePlace(await response.json());
}

async function searchGooglePlaces(textQuery: string) {
  const apiKey = googlePlacesApiKey();
  if (!apiKey) throw new Error("GOOGLE_PLACES_NOT_CONFIGURED");
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri",
    },
    body: JSON.stringify({ textQuery, maxResultCount: 5 }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    structuredLog("warn", "google_places_search_failed", { status: response.status });
    throw new Error("GOOGLE_PLACES_SEARCH_FAILED");
  }
  const payload = await response.json().catch(() => ({}));
  return Array.isArray(payload?.places)
    ? payload.places.slice(0, 5).map((place: any) => normalizeGooglePlace(place))
    : [];
}

async function verifyPreviewTurnstile(req: any, token?: string | null) {
  const secret = String(process.env.TURNSTILE_SECRET_KEY || "").trim();
  const required = String(process.env.PREVIEW_TURNSTILE_REQUIRED || "").toLowerCase() === "true";

  if (!secret) {
    if (required && (process.env.NODE_ENV === "production" || process.env.VERCEL)) {
      throw new Error("PREVIEW_PROTECTION_NOT_CONFIGURED");
    }
    return { success: true, skipped: true };
  }

  if (!token) throw new Error("PREVIEW_HUMAN_VERIFICATION_REQUIRED");

  const form = new URLSearchParams();
  form.set("secret", secret);
  form.set("response", token);
  const ip = getClientIp(req);
  if (ip && ip !== "unknown") form.set("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    signal: AbortSignal.timeout(8_000),
  });
  const result = await response.json().catch(() => null) as any;
  if (!response.ok || result?.success !== true) throw new Error("PREVIEW_HUMAN_VERIFICATION_FAILED");
  return { success: true, skipped: false };
}

function validateBody<T extends z.ZodTypeAny>(schema: T, req: any, res: any) {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: "Invalid request body",
      details: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return null;
  }
  return result.data as z.infer<T>;
}

const previewClaimSecret = () => String(
  process.env.PREVIEW_ORDER_CLAIM_SECRET
  || process.env.SUPABASE_SERVICE_ROLE_KEY
  || "",
).trim();

function createPreviewClaimToken(payload: {
  businessId: string;
  email: string;
  sessionId: string;
  previewId: string;
  exp: number;
}) {
  const secret = previewClaimSecret();
  if (!secret) throw new Error("PREVIEW_CLAIM_SECRET_MISSING");
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyPreviewClaimToken(token: string) {
  const secret = previewClaimSecret();
  if (!secret) throw new Error("PREVIEW_CLAIM_SECRET_MISSING");
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature) throw new Error("INVALID_PREVIEW_CLAIM");
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error("INVALID_PREVIEW_CLAIM");
  }
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (!payload?.businessId || !payload?.email || !payload?.sessionId || !payload?.previewId || Number(payload?.exp || 0) < Date.now()) {
    throw new Error("EXPIRED_PREVIEW_CLAIM");
  }
  return payload as { businessId: string; email: string; sessionId: string; previewId: string; exp: number };
}

function safeErrorMessage(error: any) {
  if (!error?.message) return "Unexpected server error";
  if (
    error.message.includes("SUPABASE_SERVICE_ROLE_KEY") ||
    error.message.includes("STRIPE_SECRET_KEY") ||
    error.message.includes("API key")
  ) {
    return "Server configuration error";
  }
  return error.message;
}

function isTestAccountEmail(email: unknown) {
  const normalized = String(email || "").trim().toLowerCase();
  return normalized.endsWith("@example.test") || normalized.includes("+e2e@");
}

function sanitizeFileName(value: string) {
  return (value || "customer")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "customer";
}

function escapeHtml(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildWebsiteHtmlSnapshot(website: any, business: any) {
  const pages = Array.isArray(website?.pages) ? website.pages : [];
  const primary = website?.theme?.primaryColor || "#4f46e5";
  const secondary = website?.theme?.secondaryColor || "#0f172a";
  const nav = pages
    .map((page: any) => `<a href="#page-${escapeHtml(page.slug || "home")}">${escapeHtml(page.title || "Page")}</a>`)
    .join("");
  const pageMarkup = pages
    .map((page: any) => {
      const sections = Array.isArray(page.sections) ? page.sections : [];
      const sectionMarkup = sections
        .filter((section: any) => section?.isVisible !== false)
        .map((section: any) => {
          const content = section?.content || {};
          const items = Array.isArray(content.items)
            ? `<div class="cards">${content.items
                .map((item: any) => `
                  <article>
                    <h3>${escapeHtml(item.title || item.name || item.question || "Item")}</h3>
                    <p>${escapeHtml(item.description || item.text || item.answer || item.role || "")}</p>
                  </article>
                `)
                .join("")}</div>`
            : "";

          return `
            <section class="section section-${escapeHtml(section.type || "content")}">
              <p class="eyebrow">${escapeHtml(section.type || "Section")}</p>
              <h2>${escapeHtml(content.headline || content.title || content.buttonText || section.type || "Section")}</h2>
              <p>${escapeHtml(content.subheadline || content.description || content.defaultMessage || "")}</p>
              ${items}
            </section>
          `;
        })
        .join("");

      return `
        <main id="page-${escapeHtml(page.slug || "home")}" class="page">
          <h1>${escapeHtml(page.title || business?.name || "Website")}</h1>
          ${sectionMarkup}
        </main>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(website?.seo?.title || business?.name || "Exported Website")}</title>
  <meta name="description" content="${escapeHtml(website?.seo?.description || "")}" />
  <style>
    :root { --primary: ${escapeHtml(primary)}; --secondary: ${escapeHtml(secondary)}; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; background: #f8fafc; line-height: 1.6; }
    header { padding: 24px; background: white; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10; }
    nav { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; }
    nav a { color: var(--primary); font-weight: 800; text-decoration: none; }
    .page { max-width: 1120px; margin: 0 auto; padding: 56px 20px; }
    h1 { font-size: clamp(2.5rem, 6vw, 5rem); line-height: .95; letter-spacing: -.04em; margin: 0 0 32px; }
    h2 { font-size: clamp(1.75rem, 4vw, 3.5rem); line-height: 1; letter-spacing: -.03em; margin: 8px 0 16px; }
    .section { padding: 32px; border: 1px solid #e2e8f0; border-radius: 28px; background: white; margin: 20px 0; box-shadow: 0 12px 30px rgba(15, 23, 42, .05); }
    .section-hero { background: var(--secondary); color: white; }
    .eyebrow { color: var(--primary); text-transform: uppercase; letter-spacing: .18em; font-size: 12px; font-weight: 900; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 24px; }
    article { padding: 18px; border-radius: 18px; background: #f8fafc; border: 1px solid #e2e8f0; }
    footer { padding: 40px 24px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <header>
    <strong>${escapeHtml(business?.name || "Exported Website")}</strong>
    <nav>${nav}</nav>
  </header>
  ${pageMarkup}
  <footer>Portable website handover exported from Bennie Studio.</footer>
</body>
</html>`;
}

/** Build a small, dependency-free tar.gz archive for customer handover exports. */
function buildTarGz(files: Array<{ name: string; content: string }>) {
  const blocks: Buffer[] = [];
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    if (name.length > 100) throw new Error("EXPORT_FILENAME_TOO_LONG");
    const content = Buffer.from(file.content, "utf8");
    const header = Buffer.alloc(512, 0);
    name.copy(header, 0);
    header.write("0000644\0", 100, 8, "ascii");
    header.write("0000000\0", 108, 8, "ascii");
    header.write("0000000\0", 116, 8, "ascii");
    header.write(`${content.length.toString(8).padStart(11, "0")}\0`, 124, 12, "ascii");
    header.write(`${Math.floor(Date.now() / 1000).toString(8).padStart(11, "0")}\0`, 136, 12, "ascii");
    header.fill(0x20, 148, 156);
    header.write("0", 156, 1, "ascii");
    Buffer.from("ustar\0", "ascii").copy(header, 257);
    Buffer.from("00", "ascii").copy(header, 263);
    const checksum = header.reduce((total, value) => total + value, 0);
    header.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, 8, "ascii");
    blocks.push(header, content);
    const padding = (512 - (content.length % 512)) % 512;
    if (padding) blocks.push(Buffer.alloc(padding));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks), { level: 6 });
}

function getStateSecret() {
  return (
    process.env.STRIPE_CONNECT_STATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.STRIPE_SECRET_KEY ||
    "development-state-secret"
  );
}

function signStatePayload(payload: Record<string, any>) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getStateSecret())
    .update(body)
    .digest("hex");
  return `${body}.${signature}`;
}

function verifyStatePayload(state: string) {
  const [body, signature] = state.split(".");
  if (!body || !signature) throw new Error("Invalid OAuth state");

  const expected = crypto
    .createHmac("sha256", getStateSecret())
    .update(body)
    .digest("hex");

  if (
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    throw new Error("Invalid OAuth state signature");
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString());
  if (!payload.createdAt || Date.now() - payload.createdAt > STATE_MAX_AGE_MS) {
    throw new Error("OAuth state expired");
  }
  return payload;
}

function generateIntegrationApiKey() {
  const prefix = `gros_${crypto.randomBytes(6).toString("hex")}`;
  const secret = crypto.randomBytes(24).toString("base64url");
  return `${prefix}.${secret}`;
}

const dnsPromises = dns.promises;

async function checkDomainDns(domain: string) {
  const isWww = domain.startsWith("www.");
  const records: Array<{
    type: string;
    name: string;
    value: string;
    expected: string;
    detected: boolean;
  }> = [];
  const expected = isWww ? getPrimaryVercelCname() : VERCEL_APEX_A;
  const acceptedCnames = getAcceptedVercelCnames();
  const isAcceptedCname = (record: string) => acceptedCnames.includes(record.replace(/\.$/, "").toLowerCase());
  let dnsDetected = false;
  let error = "";

  try {
    if (isWww) {
      const cnameRecords = await dnsPromises.resolveCname(domain).catch(() => []);
      const aRecords = await dnsPromises.resolve4(domain).catch(() => []);
      dnsDetected =
        cnameRecords.some(isAcceptedCname) ||
        aRecords.includes(VERCEL_APEX_A);
      records.push({
        type: "CNAME",
        name: "www",
        value: cnameRecords.join(", ") || "Not detected",
        expected,
        detected: cnameRecords.some(isAcceptedCname),
      });
      records.push({
        type: "A",
        name: "www",
        value: aRecords.join(", ") || "Not detected",
        expected: VERCEL_APEX_A,
        detected: aRecords.includes(VERCEL_APEX_A),
      });
    } else {
      const aRecords = await dnsPromises.resolve4(domain).catch(() => []);
      dnsDetected = aRecords.includes(VERCEL_APEX_A);
      records.push({
        type: "A",
        name: "@",
        value: aRecords.join(", ") || "Not detected",
        expected,
        detected: dnsDetected,
      });
      const wwwDomain = `www.${domain}`;
      const cnameRecords = await dnsPromises.resolveCname(wwwDomain).catch(() => []);
      records.push({
        type: "CNAME",
        name: "www",
        value: cnameRecords.join(", ") || "Optional",
        expected: getPrimaryVercelCname(),
        detected: cnameRecords.some(isAcceptedCname),
      });
    }
  } catch (err: any) {
    error = err?.message || "DNS lookup failed";
  }

  return { dnsDetected, records, error };
}

async function checkHttpsIssued(domain: string) {
  try {
    await axios.get(`https://${domain}`, {
      timeout: 6000,
      maxRedirects: 0,
      validateStatus: () => true,
    });
    return true;
  } catch {
    return false;
  }
}

async function startServer() {
  // Supabase Auth Middleware
  const authenticate = async (req: any, res: any, next: any) => {
    try {
      console.log(`[Auth] Authenticating request: ${req.method} ${req.path}`);
      const authHeader = req.headers.authorization;
      if (!authHeader)
        return res.status(401).json({ error: "Missing Authorization header" });

      const token = authHeader.split(" ")[1];
      if (!token || token === "undefined") {
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
      }

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res
          .status(401)
          .json({ error: "Unauthorized: Invalid or expired token" });
      }

      req.user = user;
      next();
    } catch (err) {
      console.error("Auth middleware error:", err);
      res
        .status(500)
        .json({ error: "Internal Server Error during authentication" });
    }
  };

  const claimPendingCustomerBusiness = async (userId: string, email: string) => {
    if (!userId || !email) return null;
    const normalizedEmail = String(email).trim().toLowerCase();
    const { data: pendingBusiness, error: pendingError } = await supabaseAdmin
      .from("businesses")
      .select("id,onboarding_steps")
      .is("owner_id", null)
      .eq("status", "pending")
      .contains("onboarding_steps", { customerContact: { email: normalizedEmail } })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pendingError) throw pendingError;
    if (!pendingBusiness) return null;
    const { data: claimedBusiness, error: claimError } = await supabaseAdmin
      .from("businesses")
      .update({ owner_id: userId, updated_at: new Date().toISOString() })
      .eq("id", pendingBusiness.id).is("owner_id", null).select("id").maybeSingle();
    if (claimError) throw claimError;
    if (!claimedBusiness) return null;
    const { data: claimedProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ business_id: pendingBusiness.id, role: "business_admin", status: "active", onboarding_completed: false })
      .eq("id", userId).is("business_id", null).select("*").single();
    if (profileError) throw profileError;
    return { businessId: pendingBusiness.id, profile: claimedProfile };
  };

  // Profile bootstrap is server-owned. Signup metadata may select only the
  // explicitly safe public account class (customer or affiliate); it can
  // never request staff, platform, or administrator privileges.
  app.post("/api/auth/ensure-profile", authenticate, async (req: any, res: any) => {
    const userId = String(req.user?.id || "");
    const email = String(req.user?.email || "").trim().toLowerCase();
    const signupKind = String(req.user?.user_metadata?.signup_kind || "").trim().toLowerCase();
    const initialRole = signupKind === "affiliate" ? "affiliate" : "business_admin";
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) {
        if (!existing.business_id && email && !["super_admin", "platform_staff", "affiliate"].includes(String(existing.role || ""))) {
          const claimed = await claimPendingCustomerBusiness(userId, email);
          if (claimed?.profile) return res.json({ profile: claimed.profile, created: false, customerBusinessClaimed: true });
        }
        return res.json({ profile: existing, created: false });
      }

      const { data: created, error: createError } = await supabaseAdmin
        .from("profiles")
        .insert({ id: userId, email, role: initialRole })
        .select("*")
        .single();
      if (createError) {
        // A concurrent auth callback may have won the insert race. Re-read
        // rather than retrying a second write or changing the existing role.
        const { data: raced } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle();
        if (raced) return res.json({ profile: raced, created: false });
        throw createError;
      }
      if (email && initialRole === "business_admin") {
        const claimed = await claimPendingCustomerBusiness(userId, email);
        if (claimed?.profile) return res.status(201).json({ profile: claimed.profile, created: true, customerBusinessClaimed: true });
      }
      return res.status(201).json({ profile: created, created: true });
    } catch (error) {
      console.error("Profile provisioning failed", error);
      return res.status(503).json({ error: "PROFILE_PROVISIONING_FAILED" });
    }
  });

  const getProfileForUser = async (userId: string) => {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, role, business_id, staff_permissions, status")
      .eq("id", userId)
      .single();
    if (error || !data) throw new Error("PROFILE_NOT_FOUND");
    if (["suspended", "terminated"].includes(String(data.status || "").toLowerCase())) {
      throw new Error("ACCOUNT_DISABLED");
    }
    return data;
  };

  const normalizeAffiliateReferralCode = (value: unknown) =>
    String(value || "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 120);

  const resolvePlatformAffiliateAttribution = async (value: unknown) => {
    const referralCode = normalizeAffiliateReferralCode(value);
    if (!referralCode) return null;
    const { data, error } = await supabaseAdmin
      .from("affiliates")
      .select("id,uid,referral_code,status,business_id")
      .eq("referral_code", referralCode)
      .is("business_id", null)
      .in("status", ["active", "approved"])
      .maybeSingle();
    if (error) throw error;
    return data || null;
  };

  const canManageLeadInbox = (profile: any) =>
    profile?.role === "super_admin" ||
    (profile?.role === "platform_staff" &&
      ["sales", "customer_health"].some((permission) =>
        Array.isArray(profile.staff_permissions) && profile.staff_permissions.includes(permission),
      ));

  const assertBusinessAccess = async (userId: string, businessId: string) => {
    if (!businessId) throw new Error("BUSINESS_ID_REQUIRED");

    const profile = await getProfileForUser(userId);
    if (profile.role === "super_admin" || profile.role === "platform_staff") return profile;

    const { data: business, error } = await supabaseAdmin
      .from("businesses")
      .select("id, owner_id")
      .eq("id", businessId)
      .single();

    if (error || !business) throw new Error("BUSINESS_NOT_FOUND");
    if (business.owner_id !== userId && profile.business_id !== businessId) {
      throw new Error("FORBIDDEN_BUSINESS_ACCESS");
    }
    return profile;
  };

  const assertBusinessRoleAccess = async (
    userId: string,
    businessId: string,
    options: {
      customerRoles?: string[];
      platformPermissions?: string[];
    } = {},
  ) => {
    const profile = await assertBusinessAccess(userId, businessId);
    if (profile.role === "super_admin") return profile;

    if (profile.role === "platform_staff") {
      const allowed = options.platformPermissions || [];
      const permissions = Array.isArray(profile.staff_permissions) ? profile.staff_permissions : [];
      if (allowed.some((permission) => permissions.includes(permission))) return profile;
      throw new Error("FORBIDDEN_BUSINESS_ACCESS");
    }

    const customerRoles = options.customerRoles || [];
    if (customerRoles.includes(profile.role) && profile.business_id === businessId) return profile;
    throw new Error("FORBIDDEN_BUSINESS_ACCESS");
  };

  const assertBusinessAdminAccess = (
    userId: string,
    businessId: string,
    platformPermissions: string[] = [],
  ) =>
    assertBusinessRoleAccess(userId, businessId, {
      customerRoles: ["business_admin"],
      platformPermissions,
    });

  const handleAccessError = (res: any, err: any) => {
    if (err?.message === "BUSINESS_ID_REQUIRED") {
      return res.status(400).json({ error: "Missing businessId" });
    }
    if (err?.message === "BUSINESS_NOT_FOUND") {
      return res.status(404).json({ error: "Business not found" });
    }
    if (err?.message === "PROFILE_NOT_FOUND") {
      return res.status(403).json({ error: "Profile not found" });
    }
    if (err?.message === "ACCOUNT_DISABLED") {
      return res.status(403).json({ error: "Account access is disabled" });
    }
    if (err?.message === "FORBIDDEN_BUSINESS_ACCESS") {
      return res.status(403).json({ error: "Forbidden: business access required" });
    }
     return res.status(500).json({ error: err?.message || "Access check failed" });
  };

  const superAdminOnly = async (req: any, res: any, next: any) => {
    try {
      // Use the user's token to query their own profile to satisfy RLS
      const authHeader = req.headers.authorization;
      const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: profile, error } = await userSupabase
        .from("profiles")
        .select("role,status")
        .eq("id", req.user.id)
        .single();

      if (
        error
        || profile?.role !== "super_admin"
        || ["suspended", "terminated"].includes(String(profile?.status || "").toLowerCase())
      ) {
        console.warn(
          `Admin access denied for ${req.user.email}. Role: ${profile?.role || "none"}`,
        );
        return res
          .status(403)
          .json({ error: "Forbidden: Super Admin access required" });
      }
      next();
    } catch (err) {
      console.error("Superadmin middleware error:", err);
      res
        .status(500)
        .json({ error: "Internal Server Error verifying admin status" });
    }
  };

  const financeAccess = async (req: any, res: any, next: any) => {
    try {
      const profile = await getProfileForUser(req.user.id);
      if (profile.role === "super_admin" || (profile.role === "platform_staff" && (profile.staff_permissions || []).includes("finance"))) return next();
      return res.status(403).json({ error: "Forbidden: Finance access required" });
    } catch (error) {
      return res.status(500).json({ error: "Unable to verify finance access" });
    }
  };

  app.get("/api/admin/finance/export.csv", authenticate, financeAccess, async (req: any, res: any) => {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return res.status(400).json({ error: "Invalid date range" });
    const { data, error } = await supabaseAdmin.from("finance_transactions").select("id,business_id,source_type,source_id,transaction_type,transaction_date,posted_date,description,counterparty,country,currency,amount,base_currency,base_currency_amount,exchange_rate,category,subcategory,tax_category,tax_amount,tax_jurisdiction,payment_processor,processor_fee,net_amount,status,reconciliation_status,document_status,review_status,notes").gte("transaction_date", from.toISOString()).lte("transaction_date", to.toISOString()).order("transaction_date", { ascending: true });
    if (error) return res.status(503).json({ error: "Finance export unavailable" });
    const columns = ["id","business_id","source_type","source_id","transaction_type","transaction_date","posted_date","description","counterparty","country","currency","amount","base_currency","base_currency_amount","exchange_rate","category","subcategory","tax_category","tax_amount","tax_jurisdiction","payment_processor","processor_fee","net_amount","status","reconciliation_status","document_status","review_status","notes"];
    const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csv = [columns.join(","), ...(data || []).map((row: any) => columns.map((column) => escape(row[column])).join(","))].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="finance-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.csv"`);
    return res.send(csv);
  });

  app.get("/api/admin/finance/summary", authenticate, financeAccess, async (req: any, res: any) => {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return res.status(400).json({ error: "Invalid date range" });
    const { data, error } = await supabaseAdmin.rpc("finance_period_summary", { p_from: from.toISOString(), p_to: to.toISOString() });
    if (error) return res.status(503).json({ error: "Finance summary unavailable" });
    return res.json({ period: { from: from.toISOString(), to: to.toISOString() }, summary: Array.isArray(data) ? (data[0] || null) : data });
  });

  app.post("/api/admin/finance/bank-import/preview", authenticate, financeAccess, async (req: any, res: any) => {
    const csv = String(req.body?.csv || "");
    if (!csv || csv.length > 500000) return res.status(400).json({ error: "CSV is required and must be under 500KB" });
    const lines = csv.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return res.status(400).json({ error: "CSV must include a header and at least one row" });
    const split = (line: string) => line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((value) => value.trim().replace(/^\"|\"$/g, "").replace(/\"\"/g, '\"'));
    const headers = split(lines[0]).map((header) => header.toLowerCase().replace(/[^a-z0-9]+/g, "_"));
    const find = (names: string[]) => headers.findIndex((header) => names.some((name) => header.includes(name)));
    const dateIndex = find(["date", "posted"]); const descriptionIndex = find(["description", "memo", "narrative", "payee"]); const amountIndex = find(["amount", "value", "total"]); const currencyIndex = find(["currency", "ccy"]); const referenceIndex = find(["reference", "ref", "id"]);
    if (dateIndex < 0 || descriptionIndex < 0 || amountIndex < 0) return res.status(400).json({ error: "CSV needs date, description, and amount columns" });
    const rows = lines.slice(1).map((line, index) => { const values = split(line); const amount = Number(String(values[amountIndex]).replace(/[^0-9.-]/g, "")); return { rowNumber: index + 2, date: values[dateIndex], description: values[descriptionIndex], amount, currency: (currencyIndex >= 0 ? values[currencyIndex] : "USD").toUpperCase(), reference: referenceIndex >= 0 ? values[referenceIndex] : null, valid: Boolean(values[dateIndex] && values[descriptionIndex] && Number.isFinite(amount)) }; });
    return res.json({ headers, rows, validRows: rows.filter((row) => row.valid).length, invalidRows: rows.filter((row) => !row.valid).length });
  });

  app.post("/api/admin/finance/bank-import/commit", authenticate, financeAccess, async (req: any, res: any) => {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length || rows.length > 2000) return res.status(400).json({ error: "Provide between 1 and 2,000 validated rows" });
    const payload = rows.filter((row: any) => row.valid !== false && row.date && !Number.isNaN(new Date(row.date).getTime()) && row.description && Number.isFinite(Number(row.amount))).map((row: any) => ({ source_type: "BANK_TRANSACTION", source_id: String(row.reference || `${row.date}:${row.description}:${row.amount}:${row.currency}`), transaction_type: "other", transaction_date: new Date(row.date).toISOString(), posted_date: new Date(row.date).toISOString(), description: String(row.description).slice(0, 500), currency: String(row.currency || "USD").toUpperCase(), amount: Math.abs(Number(row.amount)), status: "posted", reconciliation_status: "REVIEW_REQUIRED", document_status: "MISSING", review_status: "REVIEW_REQUIRED", category: null, metadata: { importedBy: req.user.id, importType: "bank_csv", bankSign: Number(row.amount) >= 0 ? "credit" : "debit", classificationRequired: true } }));
    const { data, error } = await supabaseAdmin.from("finance_transactions").upsert(payload, { onConflict: "source_type,source_id", ignoreDuplicates: true }).select("id");
    if (error) return res.status(400).json({ error: "Bank transactions could not be imported" });
    return res.json({ imported: data?.length || 0, skippedDuplicates: payload.length - (data?.length || 0) });
  });

  app.get("/api/admin/finance/accountant-pack", authenticate, financeAccess, async (req: any, res: any) => {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return res.status(400).json({ error: "Invalid date range" });
    const [transactions, attention, invoices, bills, close] = await Promise.all([
      supabaseAdmin.from("finance_transactions").select("*").gte("transaction_date", from.toISOString()).lte("transaction_date", to.toISOString()).order("transaction_date", { ascending: true }),
      supabaseAdmin.from("finance_needs_attention").select("*").eq("status", "OPEN"),
      supabaseAdmin.from("finance_invoices").select("*").gte("issue_date", from.toISOString().slice(0, 10)).lte("issue_date", to.toISOString().slice(0, 10)),
      supabaseAdmin.from("finance_vendor_bills").select("*").gte("invoice_date", from.toISOString().slice(0, 10)).lte("invoice_date", to.toISOString().slice(0, 10)),
      supabaseAdmin.from("finance_close_periods").select("*").eq("period_start", from.toISOString().slice(0, 10)).eq("period_end", to.toISOString().slice(0, 10)).maybeSingle(),
    ]);
    if (transactions.error || attention.error || invoices.error || bills.error) return res.status(503).json({ error: "Accountant package unavailable" });
    const rows = transactions.data || []; const safeAmount = (row: any) => row.base_currency_amount == null ? null : Number(row.base_currency_amount); const income = rows.filter((row: any) => row.transaction_type === "income").reduce((sum: number, row: any) => sum + (safeAmount(row) ?? 0), 0); const refunds = rows.filter((row: any) => row.transaction_type === "refund").reduce((sum: number, row: any) => sum + (safeAmount(row) ?? 0), 0); const expenses = rows.filter((row: any) => ["expense", "fee"].includes(row.transaction_type)).reduce((sum: number, row: any) => sum + (safeAmount(row) ?? 0), 0);
    return res.json({ packageVersion: "1.0", period: { from: from.toISOString(), to: to.toISOString() }, disclaimer: "Management records prepared for accountant review; not tax advice or a statutory filing.", summary: { income, refunds, expenses, operatingProfitEstimate: income - refunds - expenses, transactionCount: rows.length }, transactions: rows, invoices: invoices.data || [], vendorBills: bills.data || [], unresolvedItems: attention.data || [], closePeriod: close.data || null, questionsForAccountant: (attention.data || []).map((item: any) => item.title || item.issue_code) });
  });

  const aiAccessGuard = async (req: any, res: any, next: any) => {
    try {
      const profile = await getProfileForUser(req.user.id);
      const flags = await refreshLaunchFlags();
      const isStaff = ["super_admin", "platform_staff"].includes(String(profile.role));
      if (isStaff) {
        if (!flags.internal_ai_content_engine) return res.status(403).json({ error: "INTERNAL_AI_DISABLED", code: "INTERNAL_AI_DISABLED" });
        req.aiInternal = true;
        return next();
      }
      if (!flags.customer_ai_controls) return res.status(403).json({ error: "CUSTOMER_AI_DISABLED", code: "CUSTOMER_AI_DISABLED" });
      const { data: subscription } = await supabaseAdmin.from("user_subscriptions").select("plans(monthly_credit_limit,chatgpt_enabled)").eq("user_id", req.user.id).in("status", ["active", "trialing"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const plan = (subscription as any)?.plans;
      if (!plan || Number(plan.monthly_credit_limit || 0) <= 0) return res.status(403).json({ error: "CUSTOMER_AI_DISABLED", code: "CUSTOMER_AI_DISABLED" });
      req.aiInternal = false;
      return next();
    } catch (error) {
      console.error("AI access guard failed", error);
      return res.status(503).json({ error: "AI_ACCESS_CHECK_UNAVAILABLE" });
    }
  };

  app.get(
    "/api/admin/affiliates/unpaid-total",
    authenticate,
    superAdminOnly,
    async (_req: any, res: any) => {
      const { data, error } = await supabaseAdmin.rpc("sum_unpaid_earnings");
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ unpaidTotal: Number(data || 0) });
    },
  );

  // Customer self-service website handover. This export is scoped to the
  // authenticated user's business and contains no billing records or secrets.
  app.get("/api/account/website-export", authenticate, async (req: any, res: any) => {
    try {
      const profile = await getProfileForUser(req.user.id);
      if (!profile.business_id) return res.status(404).json({ error: "No business found for this account" });
      await assertBusinessAdminAccess(req.user.id, profile.business_id);

      const [
        { data: business, error: businessError },
        { data: websites, error: websitesError },
        { data: leads, error: leadsError },
        { data: appointments, error: appointmentsError },
        { data: posts, error: postsError },
        { data: products, error: productsError },
      ] = await Promise.all([
        supabaseAdmin.from("businesses").select("id,name,subdomain,custom_domain,custom_domain_status,site_url,seo_settings,handover_grace_until").eq("id", profile.business_id).single(),
        supabaseAdmin.from("websites").select("id,slug,status,pages,theme,seo,updated_at").eq("business_id", profile.business_id).eq("status", "published").order("updated_at", { ascending: false }),
        supabaseAdmin.from("leads").select("id,name,email,phone,message,status,source,score,notes,raw_fields,automation_score,automation_next_action,automation_temperature,last_follow_up_at,next_follow_up_at,first_response_at,response_channel,last_active_at,created_at").eq("business_id", profile.business_id).order("created_at", { ascending: true }),
        supabaseAdmin.from("appointments").select("id,customer_name,customer_email,service,date,time,status,created_at,updated_at").eq("business_id", profile.business_id).order("date", { ascending: true }).order("time", { ascending: true }),
        supabaseAdmin.from("posts").select("*").eq("business_id", profile.business_id).order("created_at", { ascending: true }),
        supabaseAdmin.from("products").select("*").eq("business_id", profile.business_id).order("created_at", { ascending: true }),
      ]);
      if (businessError || !business) return res.status(404).json({ error: "Business not found" });
      if (websitesError) throw websitesError;
      if (leadsError) throw leadsError;
      if (appointmentsError) throw appointmentsError;
      if (postsError) throw postsError;
      if (productsError) throw productsError;

      const publishedWebsites = websites || [];
      const exportedAt = new Date().toISOString();
      const files: Array<{ name: string; content: string }> = buildPortableWebsiteFiles({
        business,
        websites: publishedWebsites,
        posts: posts || [],
        products: products || [],
        exportedAt,
      });

      files.push({
        name: "bennie-studio-export.json",
        content: JSON.stringify({
          exportVersion: "2.0",
          exportedAt,
          business,
          websites: publishedWebsites,
          posts: posts || [],
          products: products || [],
          crm: { leads: leads || [], appointments: appointments || [] },
        }, null, 2),
      });
      files.push({ name: "crm/leads.json", content: JSON.stringify(leads || [], null, 2) });
      files.push({ name: "crm/appointments.json", content: JSON.stringify(appointments || [], null, 2) });
      files.push({
        name: "manifest.json",
        content: JSON.stringify({
          exportVersion: "2.0",
          exportedAt,
          businessId: business.id,
          websiteCount: publishedWebsites.length,
          leadCount: (leads || []).length,
          appointmentCount: (appointments || []).length,
          postCount: (posts || []).length,
          productCount: (products || []).length,
          handoverGraceUntil: business.handover_grace_until || null,
          files: [...files.map((file) => file.name), "manifest.json"],
          reconnectRequired: ["forms", "bookings", "analytics", "consent tooling", "Bennie Studio CRM", "managed automations"],
        }, null, 2),
      });

      const archive = buildTarGz(files);
      await supabaseAdmin
        .from("businesses")
        .update({ last_handover_export_at: exportedAt })
        .eq("id", business.id)
        .then(({ error }) => {
          if (error) console.warn("[Website Export] Could not record export timestamp:", error.message);
        });

      const filename = `${sanitizeFileName(business.name || "website")}-website-handover.tar.gz`;
      res.setHeader("Content-Type", "application/gzip");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Cache-Control", "private, no-store, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.status(200).send(archive);
    } catch (error: any) {
      console.error("[Website Export] Failed:", error);
      return res.status(500).json({ error: "Unable to prepare website handover" });
    }
  });

  app.get("/api/account/offboarding-status", authenticate, async (req: any, res: any) => {
    try {
      const profile = await getProfileForUser(req.user.id);
      if (!profile.business_id) return res.json({ business: null, subscription: null, canDeleteAccount: true });
      await assertBusinessAdminAccess(req.user.id, profile.business_id);
      const [{ data: business, error: businessError }, { data: subscription, error: subscriptionError }] = await Promise.all([
        supabaseAdmin
          .from("businesses")
          .select("id,name,subscription_status,managed_service_cancellation_requested_at,managed_service_cancellation_effective_at,handover_grace_until,last_handover_export_at")
          .eq("id", profile.business_id)
          .maybeSingle(),
        supabaseAdmin
          .from("user_subscriptions")
          .select("status,renewal_state,minimum_term_end_date,current_period_end,cancel_at_period_end,cancellation_requested_at,cancellation_scheduled_at,cancellation_effective_at")
          .eq("user_id", req.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (businessError) throw businessError;
      if (subscriptionError) throw subscriptionError;
      const billingStatus = subscription?.status || business?.subscription_status || null;
      return res.json({
        business: business || null,
        subscription: subscription || null,
        canDeleteAccount: subscriptionAllowsPermanentDeletion(billingStatus),
        handoverGraceDays: HANDOVER_GRACE_DAYS,
      });
    } catch (error: any) {
      console.error("[Offboarding Status] Failed:", error);
      return res.status(500).json({ error: "Unable to load offboarding status" });
    }
  });

  app.post("/api/account/cancel-managed-service", authenticate, async (req: any, res: any) => {
    try {
      const profile = await getProfileForUser(req.user.id);
      if (!profile.business_id) return res.status(404).json({ error: "No business found for this account" });
      await assertBusinessAdminAccess(req.user.id, profile.business_id);

      const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : null;
      const [{ data: business, error: businessError }, { data: subscription, error: subscriptionError }] = await Promise.all([
        supabaseAdmin
          .from("businesses")
          .select("id,name,subscription_status,stripe_subscription_id,handover_grace_until,managed_service_cancellation_requested_at")
          .eq("id", profile.business_id)
          .single(),
        supabaseAdmin
          .from("user_subscriptions")
          .select("id,status,renewal_state,minimum_term_end_date,cancel_at_period_end,stripe_subscription_id,current_period_end,cancellation_requested_at")
          .eq("user_id", req.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (businessError || !business) return res.status(404).json({ error: "Business not found" });
      if (subscriptionError) throw subscriptionError;

      if (String(business.subscription_status || "").toLowerCase() === "canceled") {
        return res.json({
          state: "cancelled",
          handoverGraceUntil: business.handover_grace_until || null,
          handoverGraceDays: HANDOVER_GRACE_DAYS,
        });
      }

      const stripeSubscriptionId = subscription?.stripe_subscription_id || business.stripe_subscription_id;
      if (!stripeSubscriptionId) {
        return res.status(409).json({ error: "No managed Stripe subscription is attached to this account. Please contact support before deleting the account." });
      }
      if (!subscription?.id) {
        return res.status(409).json({ error: "The billing record is incomplete. Please contact support so cancellation can be reconciled safely." });
      }

      const now = new Date();
      const nowIso = now.toISOString();
      const today = nowIso.slice(0, 10);
      const minimumTermEndDate = subscription?.minimum_term_end_date || null;
      const minimumTermMature = !minimumTermEndDate || minimumTermEndDate <= today;

      await supabaseAdmin
        .from("businesses")
        .update({ managed_service_cancellation_requested_at: nowIso })
        .eq("id", business.id);

      if (!minimumTermMature) {
        if (subscription?.id) {
          const { error } = await supabaseAdmin
            .from("user_subscriptions")
            .update({
              renewal_state: "cancellation_requested",
              cancellation_requested_at: nowIso,
              cancellation_reason: reason,
              cancel_at_period_end: false,
            })
            .eq("id", subscription.id);
          if (error) throw error;
        }
        await insertBillingLifecycleEvent({
          business_id: business.id,
          event_type: "cancellation_requested",
          status: "open",
          source: "customer",
          metadata: { minimumTermEndDate, reason: reason || null },
        });
        return res.json({
          state: "cancellation_requested",
          minimumTermEndDate,
          message: `Cancellation recorded. The subscription cannot end before ${minimumTermEndDate}.`,
        });
      }

      const stripe = await getStripe();
      const current = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      if (current.status === "canceled") {
        const graceUntil = handoverGraceUntil(now);
        await supabaseAdmin
          .from("businesses")
          .update({
            subscription_status: "canceled",
            status: "inactive",
            managed_service_cancellation_effective_at: nowIso,
            handover_grace_until: graceUntil,
          })
          .eq("id", business.id);
        if (subscription?.id) {
          await supabaseAdmin
            .from("user_subscriptions")
            .update({
              status: "canceled",
              renewal_state: "cancelled",
              cancel_at_period_end: true,
              cancellation_effective_at: nowIso,
              cancellation_reason: reason,
              last_stripe_sync_at: nowIso,
            })
            .eq("id", subscription.id);
        }
        return res.json({ state: "cancelled", handoverGraceUntil: graceUntil, handoverGraceDays: HANDOVER_GRACE_DAYS });
      }

      const scheduled: any = current.cancel_at_period_end
        ? current
        : await stripe.subscriptions.update(stripeSubscriptionId, { cancel_at_period_end: true });
      if (!scheduled.cancel_at_period_end) throw new Error("STRIPE_CANCELLATION_NOT_CONFIRMED");

      if (subscription?.id) {
        const { error } = await supabaseAdmin
          .from("user_subscriptions")
          .update({
            renewal_state: "cancellation_scheduled",
            cancel_at_period_end: true,
            cancellation_requested_at: subscription.cancellation_requested_at || nowIso,
            cancellation_scheduled_at: nowIso,
            cancellation_reason: reason,
            last_stripe_sync_at: nowIso,
          })
          .eq("id", subscription.id);
        if (error) throw error;
      }

      await insertBillingLifecycleEvent({
        business_id: business.id,
        event_type: "cancellation_scheduled",
        status: "resolved",
        source: "customer",
        metadata: {
          stripeSubscriptionId,
          currentPeriodEnd: stripeTimestampToIso(scheduled.current_period_end),
          reason: reason || null,
        },
        resolved_at: nowIso,
      });

      return res.json({
        state: "cancellation_scheduled",
        currentPeriodEnd: stripeTimestampToIso(scheduled.current_period_end),
        handoverGraceDays: HANDOVER_GRACE_DAYS,
        message: "Managed service will end at the close of the current eligible billing period. A 14-day website migration window begins when the subscription ends.",
      });
    } catch (error: any) {
      console.error("[Managed Service Cancellation] Failed:", error);
      return res.status(500).json({ error: safeErrorMessage(error) || "Unable to schedule managed-service cancellation" });
    }
  });

  app.delete("/api/account", authenticate, async (req: any, res: any) => {
    try {
      if (req.body?.confirmation !== "DELETE") {
        return res.status(400).json({ error: "Type DELETE to confirm permanent account deletion." });
      }
      const profile = await getProfileForUser(req.user.id);
      const businessId = profile.business_id || null;

      if (businessId) {
        const [{ data: business }, { data: subscription }] = await Promise.all([
          supabaseAdmin.from("businesses").select("id,owner_id,subscription_status").eq("id", businessId).maybeSingle(),
          supabaseAdmin
            .from("user_subscriptions")
            .select("status,renewal_state")
            .eq("user_id", req.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        // Deleting a member account must never delete the tenant. Only the
        // actual business owner can remove the business as part of self-delete.
        const ownsBusiness = Boolean(business?.owner_id && business.owner_id === req.user.id);
        if (ownsBusiness) {
          const subscriptionStatus = subscription?.status || null;
          const businessStatus = business?.subscription_status || null;
          if (!subscriptionAllowsPermanentDeletion(subscriptionStatus) || !subscriptionAllowsPermanentDeletion(businessStatus)) {
            return res.status(409).json({
              error: "Managed service is still active. Cancel the managed service first; permanent deletion is available after the subscription ends.",
              subscriptionStatus: subscriptionStatus || businessStatus,
              renewalState: subscription?.renewal_state || null,
            });
          }

          const { error: businessDeleteError } = await supabaseAdmin
            .from("businesses")
            .delete()
            .eq("id", businessId)
            .eq("owner_id", req.user.id);
          if (businessDeleteError) throw businessDeleteError;
        }
      }

      await supabaseAdmin.from("profiles").delete().eq("id", req.user.id);
      const { error: userDeleteError } = await supabaseAdmin.auth.admin.deleteUser(req.user.id);
      if (userDeleteError) throw userDeleteError;
      return res.status(204).send();
    } catch (error: any) {
      console.error("[Account Deletion] Failed:", error);
      return res.status(500).json({ error: safeErrorMessage(error) || "Unable to permanently delete account" });
    }
  });

  const DEFAULT_PLATFORM_STAFF_PERMISSIONS_SERVER = [
    "prospects",
    "sales",
    "delivery",
    "approvals",
    "support",
    "customer_health",
    "finance",
  ];

  const writeAdminUserAudit = async (
    req: any,
    actionType: string,
    target: { id: string; label?: string | null },
    metadata: Record<string, unknown> = {},
  ) => {
    const { error } = await supabaseAdmin
      .from("admin_action_audit_logs")
      .insert({
        actor_user_id: req.user.id,
        actor_email: req.user.email || null,
        action_type: actionType,
        target_type: "user",
        target_id: target.id,
        target_label: target.label || target.id,
        metadata,
      });
    if (error) {
      console.warn(`[Admin User Lifecycle] Audit log skipped for ${actionType}: ${error.message}`);
    }
  };

  app.patch(
    "/api/admin/users/:userId/status",
    authenticate,
    superAdminOnly,
    async (req: any, res: any) => {
      const userId = String(req.params.userId || "").trim();
      if (!UUID_SCHEMA.safeParse(userId).success) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      const body = validateBody(
        z.object({ status: z.enum(["active", "suspended"]) }).strict(),
        req,
        res,
      );
      if (!body) return;
      if (userId === req.user.id && body.status === "suspended") {
        return res.status(409).json({ error: "You cannot suspend your own super admin account." });
      }

      try {
        const { data: targetUser, error: targetError } = await supabaseAdmin
          .from("profiles")
          .select("id,email,full_name,role,status")
          .eq("id", userId)
          .maybeSingle();
        if (targetError) throw targetError;
        if (!targetUser) return res.status(404).json({ error: "User profile not found." });
        if (String(targetUser.status || "").toLowerCase() === "terminated") {
          return res.status(409).json({ error: "A terminated user cannot be restored or suspended. Permanently delete the user or leave the record terminated." });
        }

        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ status: body.status })
          .eq("id", userId)
          .select("id,status")
          .single();
        if (updateError) throw updateError;

        await writeAdminUserAudit(
          req,
          body.status === "suspended" ? "user.suspended" : "user.restored",
          { id: userId, label: targetUser.email || targetUser.full_name || userId },
          { previousStatus: targetUser.status || null, status: body.status },
        );

        return res.json({ success: true, user: updatedUser });
      } catch (error: any) {
        console.error("[Admin User Status] Failed:", error);
        return res.status(500).json({ error: safeErrorMessage(error) || "Unable to update user status" });
      }
    },
  );

  app.post(
    "/api/admin/users/bulk-suspend",
    authenticate,
    superAdminOnly,
    async (req: any, res: any) => {
      const body = validateBody(
        z.object({
          userIds: z.array(UUID_SCHEMA).min(1).max(100),
        }).strict(),
        req,
        res,
      );
      if (!body) return;

      const userIds = Array.from(new Set(body.userIds));
      if (userIds.includes(req.user.id)) {
        return res.status(409).json({ error: "Bulk suspend cannot include your own super admin account." });
      }

      try {
        const { data: targets, error: targetError } = await supabaseAdmin
          .from("profiles")
          .select("id,email,full_name,status")
          .in("id", userIds);
        if (targetError) throw targetError;

        const rows = targets || [];
        const terminatedIds = rows
          .filter((row: any) => String(row.status || "").toLowerCase() === "terminated")
          .map((row: any) => row.id);
        const eligibleIds = rows
          .filter((row: any) => String(row.status || "").toLowerCase() !== "terminated")
          .map((row: any) => row.id);

        if (!eligibleIds.length) {
          return res.status(409).json({
            error: "No selected users can be suspended.",
            skippedTerminatedIds: terminatedIds,
          });
        }

        const { data: updated, error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({ status: "suspended" })
          .in("id", eligibleIds)
          .select("id");
        if (updateError) throw updateError;

        const suspendedIds = (updated || []).map((row: any) => row.id);
        await writeAdminUserAudit(
          req,
          "users.bulk_suspended",
          { id: suspendedIds.join(","), label: `${suspendedIds.length} users` },
          {
            selectedUserIds: userIds,
            suspendedUserIds: suspendedIds,
            skippedTerminatedIds: terminatedIds,
          },
        );

        return res.json({
          success: true,
          suspendedIds,
          skippedTerminatedIds: terminatedIds,
        });
      } catch (error: any) {
        console.error("[Admin Bulk Suspend] Failed:", error);
        return res.status(500).json({ error: safeErrorMessage(error) || "Unable to suspend selected users" });
      }
    },
  );

  app.patch(
    "/api/admin/users/:userId/role",
    authenticate,
    superAdminOnly,
    async (req: any, res: any) => {
      const userId = String(req.params.userId || "").trim();
      if (!UUID_SCHEMA.safeParse(userId).success) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      const body = validateBody(
        z.object({
          role: z.enum(["super_admin", "platform_staff", "business_admin", "staff", "affiliate"]),
        }).strict(),
        req,
        res,
      );
      if (!body) return;
      if (userId === req.user.id) {
        return res.status(409).json({ error: "Change another super admin first; you cannot change your own role here." });
      }

      try {
        const { data: targetUser, error: targetError } = await supabaseAdmin
          .from("profiles")
          .select("id,email,full_name,role,status,staff_permissions,business_id,default_account_id")
          .eq("id", userId)
          .maybeSingle();
        if (targetError) throw targetError;
        if (!targetUser) return res.status(404).json({ error: "User profile not found." });
        if (String(targetUser.status || "").toLowerCase() === "terminated") {
          return res.status(409).json({ error: "A terminated user's role cannot be changed." });
        }

        const leavesTenantScope = ["platform_staff", "affiliate"].includes(body.role);
        if (leavesTenantScope) {
          const { count: ownedBusinessCount, error: ownershipError } = await supabaseAdmin
            .from("businesses")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", userId);
          if (ownershipError) throw ownershipError;
          if ((ownedBusinessCount || 0) > 0) {
            return res.status(409).json({
              error: "Transfer or remove this user's business ownership before moving them to a platform or affiliate role.",
              code: "BUSINESS_OWNERSHIP_TRANSFER_REQUIRED",
            });
          }

          const { count: ownedAccountCount, error: accountOwnershipError } = await supabaseAdmin
            .from("account_memberships")
            .select("account_id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("status", "active")
            .eq("role", "owner");
          if (accountOwnershipError) throw accountOwnershipError;
          if ((ownedAccountCount || 0) > 0) {
            return res.status(409).json({
              error: "Transfer this user's customer account ownership before moving them to a platform or affiliate role.",
              code: "ACCOUNT_OWNERSHIP_TRANSFER_REQUIRED",
            });
          }
        }

        const rolePatch = {
          role: body.role,
          staff_permissions:
            body.role === "platform_staff"
              ? DEFAULT_PLATFORM_STAFF_PERMISSIONS_SERVER
              : [],
          ...(leavesTenantScope
            ? { business_id: null, default_account_id: null }
            : {}),
        };

        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from("profiles")
          .update(rolePatch)
          .eq("id", userId)
          .select("id,role,staff_permissions,business_id,default_account_id")
          .single();
        if (updateError) throw updateError;

        await writeAdminUserAudit(
          req,
          "user.role_updated",
          { id: userId, label: targetUser.email || targetUser.full_name || userId },
          {
            previousRole: targetUser.role || null,
            role: body.role,
            previousStaffPermissions: targetUser.staff_permissions || [],
            staffPermissions: rolePatch.staff_permissions,
            previousBusinessId: targetUser.business_id || null,
            previousDefaultAccountId: targetUser.default_account_id || null,
            tenantScopeCleared: leavesTenantScope,
          },
        );

        return res.json({ success: true, user: updatedUser });
      } catch (error: any) {
        console.error("[Admin User Role] Failed:", error);
        return res.status(500).json({ error: safeErrorMessage(error) || "Unable to update user role" });
      }
    },
  );

  app.delete(
    "/api/admin/users/:userId",
    authenticate,
    superAdminOnly,
    async (req: any, res: any) => {
      const userId = String(req.params.userId || "").trim();
      if (!UUID_SCHEMA.safeParse(userId).success) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      if (userId === req.user.id) {
        return res.status(409).json({ error: "You cannot permanently delete your own super admin account." });
      }

      const body = validateBody(
        z.object({ confirmation: z.string().trim().min(1).max(320) }).strict(),
        req,
        res,
      );
      if (!body) return;

      try {
        const { data: targetUser, error: targetError } = await supabaseAdmin
          .from("profiles")
          .select("id,email,full_name,role,status")
          .eq("id", userId)
          .maybeSingle();
        if (targetError) throw targetError;
        if (!targetUser) return res.status(404).json({ error: "User profile not found." });

        if (String(targetUser.status || "").toLowerCase() !== "terminated") {
          return res.status(409).json({ error: "Terminate this user before permanently deleting the account." });
        }

        const requiredConfirmation = String(targetUser.email || userId).trim();
        if (body.confirmation !== requiredConfirmation) {
          return res.status(400).json({ error: "Type the exact user email to confirm permanent deletion." });
        }

        const [
          { data: subscriptions, error: subscriptionError },
          { data: ownedBusinesses, error: businessError },
          { data: apiKeys, error: apiKeyError },
        ] = await Promise.all([
          supabaseAdmin
            .from("user_subscriptions")
            .select("status,renewal_state,stripe_subscription_id")
            .eq("user_id", userId),
          supabaseAdmin
            .from("businesses")
            .select("id,name,status,subscription_status,stripe_subscription_id")
            .eq("owner_id", userId),
          supabaseAdmin
            .from("api_keys")
            .select("id")
            .eq("created_by", userId),
        ]);
        if (subscriptionError) throw subscriptionError;
        if (businessError) throw businessError;
        if (apiKeyError) throw apiKeyError;

        // Permanent deletion must never orphan a live external subscription. Internal
        // trial/test states without a Stripe subscription are safe to clean up after
        // the terminated auth user is removed.
        const protectedSubscription = (subscriptions || []).find(
          (subscription: any) =>
            !subscriptionAllowsPermanentDeletion(subscription.status)
            && Boolean(String(subscription.stripe_subscription_id || "").trim()),
        );
        if (protectedSubscription) {
          return res.status(409).json({
            error: "This user still has live Stripe billing. Cancel the managed service before permanent deletion.",
            subscriptionStatus: protectedSubscription.status || null,
            renewalState: protectedSubscription.renewal_state || null,
            requiresBillingCancellation: true,
          });
        }

        const isProtectedBusinessState = (business: any) => {
          const businessStatus = String(business.status || "").toLowerCase();
          return (
            ["active", "trial", "trialing"].includes(businessStatus)
            || !subscriptionAllowsPermanentDeletion(business.subscription_status)
          );
        };

        const protectedBusiness = (ownedBusinesses || []).find(
          (business: any) =>
            isProtectedBusinessState(business)
            && Boolean(String(business.stripe_subscription_id || "").trim()),
        );
        if (protectedBusiness) {
          return res.status(409).json({
            error: "This user still owns a business with live Stripe billing. Cancel or transfer that subscription before deleting the user.",
            businessId: protectedBusiness.id,
            businessName: protectedBusiness.name || null,
            businessStatus: protectedBusiness.status || null,
            subscriptionStatus: protectedBusiness.subscription_status || null,
            requiresBillingCancellation: true,
          });
        }

        const internalProtectedBusinessIds = (ownedBusinesses || [])
          .filter(
            (business: any) =>
              isProtectedBusinessState(business)
              && !Boolean(String(business.stripe_subscription_id || "").trim()),
          )
          .map((business: any) => business.id);

        const ownedBusinessIds = (ownedBusinesses || []).map((business: any) => business.id);
        const apiKeyIds = (apiKeys || []).map((key: any) => key.id);

        if (ownedBusinessIds.length) {
          const { error: detachBusinessError } = await supabaseAdmin
            .from("businesses")
            .update({ owner_id: null })
            .in("id", ownedBusinessIds);
          if (detachBusinessError) throw detachBusinessError;
        }

        if (apiKeyIds.length) {
          const { error: detachKeysError } = await supabaseAdmin
            .from("api_keys")
            .update({ created_by: null })
            .in("id", apiKeyIds);
          if (detachKeysError) {
            if (ownedBusinessIds.length) {
              await supabaseAdmin.from("businesses").update({ owner_id: userId }).in("id", ownedBusinessIds);
            }
            throw detachKeysError;
          }
        }

        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authDeleteError) {
          if (ownedBusinessIds.length) {
            await supabaseAdmin.from("businesses").update({ owner_id: userId }).in("id", ownedBusinessIds);
          }
          if (apiKeyIds.length) {
            await supabaseAdmin.from("api_keys").update({ created_by: userId }).in("id", apiKeyIds);
          }
          throw authDeleteError;
        }

        // A terminated test/trial user can leave an internally protected business
        // state behind even though there is no external subscription to cancel.
        // Reconcile those records only after auth deletion succeeds.
        if (internalProtectedBusinessIds.length) {
          const { error: reconcileBusinessError } = await supabaseAdmin
            .from("businesses")
            .update({ status: "inactive", subscription_status: "canceled" })
            .in("id", internalProtectedBusinessIds);
          if (reconcileBusinessError) {
            console.warn(
              `[Admin User Deletion] User deleted but internal business reconciliation failed: ${reconcileBusinessError.message}`,
            );
          }
        }

        await writeAdminUserAudit(
          req,
          "user.deleted",
          { id: userId, label: targetUser.email || targetUser.full_name || userId },
          {
            previousRole: targetUser.role || null,
            previousStatus: targetUser.status || null,
            detachedBusinessIds: ownedBusinessIds,
            detachedApiKeyIds: apiKeyIds,
            reconciledInternalBusinessIds: internalProtectedBusinessIds,
            authUserDeleted: true,
          },
        );

        return res.json({
          success: true,
          deletedUserId: userId,
          detachedBusinessIds: ownedBusinessIds,
          reconciledInternalBusinessIds: internalProtectedBusinessIds,
        });
      } catch (error: any) {
        console.error("[Admin User Deletion] Failed:", error);
        return res.status(500).json({
          error: safeErrorMessage(error) || "Unable to permanently delete user",
        });
      }
    },
  );

  app.post(
    "/api/admin/users/:userId/terminate",
    authenticate,
    superAdminOnly,
    async (req: any, res: any) => {
      try {
        const userId = String(req.params.userId || "").trim();
        if (!UUID_SCHEMA.safeParse(userId).success) {
          return res.status(400).json({ error: "Invalid user ID" });
        }
        if (userId === req.user.id) {
          return res.status(409).json({ error: "You cannot terminate your own super admin account." });
        }

        const { data: targetUser, error: targetError } = await supabaseAdmin
          .from("profiles")
          .select("id,email,full_name,role,business_id,status")
          .eq("id", userId)
          .maybeSingle();

        if (targetError) throw targetError;
        if (!targetUser) return res.status(404).json({ error: "User profile not found." });

        const associatedBusinessId = targetUser.business_id || null;
        const { data: updatedUser, error: updateError } = await supabaseAdmin
          .from("profiles")
          .update({
            status: "terminated",
            business_id: null,
          })
          .eq("id", userId)
          .select("id,status,business_id")
          .single();

        if (updateError) throw updateError;

        let businessDeactivated = false;
        if (associatedBusinessId) {
          const { error: businessError } = await supabaseAdmin
            .from("businesses")
            .update({ status: "inactive" })
            .eq("id", associatedBusinessId);
          if (businessError) {
            console.warn(
              `[Admin User Termination] User terminated but business deactivation failed for ${associatedBusinessId}: ${businessError.message}`,
            );
          } else {
            businessDeactivated = true;
          }
        }

        const { error: auditError } = await supabaseAdmin
          .from("admin_action_audit_logs")
          .insert({
            actor_user_id: req.user.id,
            actor_email: req.user.email || null,
            action_type: "user.terminated",
            target_type: "user",
            target_id: userId,
            target_label: targetUser.email || targetUser.full_name || userId,
            metadata: {
              associatedBusinessId,
              businessDeactivated,
              previousStatus: targetUser.status || null,
              previousRole: targetUser.role || null,
            },
          });
        if (auditError) {
          console.warn("[Admin User Termination] Audit log skipped:", auditError.message);
        }

        return res.json({
          success: true,
          user: updatedUser,
          associatedBusinessId,
          businessDeactivated,
        });
      } catch (error: any) {
        console.error("[Admin User Termination] Failed:", error);
     …144297 tokens truncated…dated_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (businessError) throw businessError;
      if (!business) return res.status(404).json({ error: "Business not found." });
      if (websiteError) throw websiteError;
      if (!website) return res.status(409).json({ error: "Create a website draft before requesting customer approval." });
      if (projectError) console.warn("Approval project lookup failed:", projectError.message);
      if (business.lifecycle_stage && !canTransitionLifecycle(business.lifecycle_stage, "customer_review")) {
        return res.status(409).json({ error: `The business cannot enter customer review from “${business.lifecycle_stage}”.` });
      }

      const now = new Date().toISOString();
      const previewUrl = `${publicAppUrl()}/w/${businessId}?draft=1&website=${website.id}`;
      const versionLabel = `Website review · ${new Date().toLocaleDateString("en-GB")}`;
      const { data: existing } = await supabaseAdmin
        .from("customer_approvals")
        .select("id")
        .eq("business_id", businessId)
        .eq("website_id", website.id)
        .eq("status", "pending")
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const approvalPayload = {
        business_id: businessId,
        project_id: project?.id || null,
        website_id: website.id,
        approval_type: "website_review",
        title: body.title || `Approve ${business.name} website`,
        description: body.description || "Review the current website version. Approve it for launch or send one consolidated change request.",
        version_label: versionLabel,
        preview_url: previewUrl,
        requested_by: req.user.id,
        requested_at: now,
        updated_at: now,
      };
      let approval: any;
      if (existing?.id) {
        const { data, error } = await supabaseAdmin
          .from("customer_approvals")
          .update(approvalPayload)
          .eq("id", existing.id)
          .select("*")
          .single();
        if (error) throw error;
        approval = data;
      } else {
        const { data, error } = await supabaseAdmin
          .from("customer_approvals")
          .insert(approvalPayload)
          .select("*")
          .single();
        if (error) throw error;
        approval = data;
      }

      if (project?.id) {
        await supabaseAdmin.from("projects").update({ status: "customer_review", updated_at: now }).eq("id", project.id);
      }
      await supabaseAdmin.from("businesses").update({
        lifecycle_stage: "customer_review",
        lifecycle_stage_changed_at: now,
        customer_review_started_at: now,
        customer_review_sent_at: now,
      }).eq("id", businessId);

      return res.json({ success: true, approval });
    } catch (error: any) {
      if (["BUSINESS_NOT_FOUND", "PROFILE_NOT_FOUND", "FORBIDDEN_BUSINESS_ACCESS"].includes(error?.message)) {
        return handleAccessError(res, error);
      }
      console.error("[Approval Request] Failed:", error?.message || error);
      return res.status(503).json({ error: "Customer approval request could not be created." });
    }
  });

  app.post("/api/customer/approvals/:approvalId/respond", authenticate, async (req: any, res: any) => {
    const approvalId = String(req.params.approvalId || "");
    if (!UUID_SCHEMA.safeParse(approvalId).success) {
      return res.status(400).json({ error: "Invalid approval reference." });
    }
    const body = validateBody(
      z.object({
        status: z.enum(["approved", "changes_requested"]),
        notes: z.string().trim().max(5000).optional().nullable(),
        items: z.array(z.object({
          page: z.string().trim().max(160).optional().nullable(),
          section: z.string().trim().max(160).optional().nullable(),
          request: z.string().trim().min(1).max(3000),
        }).strict()).max(25).optional(),
      }).superRefine((value, ctx) => {
        if (value.status === "changes_requested" && !String(value.notes || "").trim() && !(value.items || []).length) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Describe the changes you need.", path: ["notes"] });
        }
      }),
      req,
      res,
    );
    if (!body) return;
    try {
      const { data: approval, error: approvalError } = await supabaseAdmin
        .from("customer_approvals")
        .select("*")
        .eq("id", approvalId)
        .maybeSingle();
      if (approvalError) throw approvalError;
      if (!approval) return res.status(404).json({ error: "Approval request not found." });
      await assertBusinessRoleAccess(req.user.id, approval.business_id, {
        customerRoles: ["business_admin", "staff", "client"],
        platformPermissions: ["approvals"],
      });

      const nextLifecycleStage = body.status === "approved" ? "launch_ready" : "design_build";
      const { data: businessLifecycle, error: businessLifecycleError } = await supabaseAdmin
        .from("businesses")
        .select("lifecycle_stage")
        .eq("id", approval.business_id)
        .maybeSingle();
      if (businessLifecycleError) throw businessLifecycleError;
      if (businessLifecycle?.lifecycle_stage && !canTransitionLifecycle(businessLifecycle.lifecycle_stage, nextLifecycleStage)) {
        return res.status(409).json({ error: `The business cannot move from “${businessLifecycle.lifecycle_stage}” to “${nextLifecycleStage}”.` });
      }

      const now = new Date().toISOString();
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("customer_approvals")
        .update({
          status: body.status,
          customer_notes: body.notes || null,
          responded_by: req.user.id,
          responded_at: now,
          updated_at: now,
        })
        .eq("id", approvalId)
        .select("*")
        .single();
      if (updateError) throw updateError;

      if (approval.project_id) {
        await supabaseAdmin.from("projects").update({
          status: body.status === "approved" ? "approved" : "changes_requested",
          updated_at: now,
        }).eq("id", approval.project_id);
      }

      if (body.status === "changes_requested") {
        const changeItems = (body.items || []).length ? body.items || [] : [{ page: null, section: null, request: String(body.notes || "").trim() }];
        const changeRows = changeItems.map((item: any, index: number) => ({
          id: salesRecordId(`approval-change:${approvalId}:${index}`),
          business_id: approval.business_id, profile_id: req.user.id, website_id: approval.website_id || null,
          request_type: "website_approval_change", update_category: "website_approval", priority: "launch_blocker", status: "submitted",
          consumes_allowance: false,
          title: [item.page, item.section].filter(Boolean).length
            ? `Approval change · ${[item.page, item.section].filter(Boolean).join(" · ")}`
            : "Website approval change",
          details: item.request, client_request_id: `approval:${approvalId}:${index}`, submitted_at: now,
          customer_draft: { approvalId, websiteId: approval.website_id || null, projectId: approval.project_id || null, page: item.page || null, section: item.section || null, request: item.request },
          updated_at: now,
        }));
        const { error: changeError } = await supabaseAdmin.from("monthly_update_requests").upsert(changeRows, { onConflict: "id" });
        if (changeError) throw changeError;
      }

      if (body.status === "approved") {
        await supabaseAdmin.from("businesses").update({
          lifecycle_stage: "launch_ready",
          lifecycle_stage_changed_at: now,
          customer_approved_at: now,
          launch_ready_at: now,
        }).eq("id", approval.business_id);
      } else {
        await supabaseAdmin.from("businesses").update({
          lifecycle_stage: "design_build",
          lifecycle_stage_changed_at: now,
          customer_feedback_received_at: now,
        }).eq("id", approval.business_id);
      }

      return res.json({ success: true, approval: updated });
    } catch (error: any) {
      if (["BUSINESS_NOT_FOUND", "PROFILE_NOT_FOUND", "FORBIDDEN_BUSINESS_ACCESS"].includes(error?.message)) {
        return handleAccessError(res, error);
      }
      console.error("[Customer Approval Response] Failed:", error?.message || error);
      return res.status(503).json({ error: "Your approval response could not be saved." });
    }
  });

  app.get("/api/admin/businesses/:businessId/launch-readiness", authenticate, async (req: any, res: any) => {
    const businessId = String(req.params.businessId || "");
    const preflight = String(req.query.preflight || "").toLowerCase() === "true";
    if (!UUID_SCHEMA.safeParse(businessId).success) {
      return res.status(400).json({ error: "Invalid business reference." });
    }
    try {
      await assertBusinessRoleAccess(req.user.id, businessId, {
        customerRoles: [],
        platformPermissions: ["delivery", "customer_health", "approvals"],
      });

      const [businessResult, websiteResult, projectResult, approvalResult, onboardingResult] = await Promise.all([
        supabaseAdmin.from("businesses").select("id,name,custom_domain,custom_domain_status,ssl_status,lifecycle_stage,onboarding_completed_at,ga_measurement_id,meta_pixel_id,tracking_scripts_header,tracking_scripts_footer").eq("id", businessId).maybeSingle(),
        supabaseAdmin.from("websites").select("id,status,pages,theme,seo,button_health,validation_report,updated_at").eq("business_id", businessId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        supabaseAdmin.from("projects").select("id,status,launch_blocker,delivery_checklist,target_launch_date,updated_at").eq("business_id", businessId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        supabaseAdmin.from("customer_approvals").select("id,status,responded_at,updated_at").eq("business_id", businessId).order("requested_at", { ascending: false }).limit(1).maybeSingle(),
        supabaseAdmin.from("onboarding_sessions").select("id,status,progress,current_step,updated_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (businessResult.error) throw businessResult.error;
      if (!businessResult.data) return res.status(404).json({ error: "Business not found." });
      if (websiteResult.error) throw websiteResult.error;
      if (projectResult.error) console.warn("Launch project lookup failed:", projectResult.error.message);
      if (approvalResult.error) console.warn("Launch approval lookup failed:", approvalResult.error.message);
      if (onboardingResult.error) console.warn("Launch onboarding lookup failed:", onboardingResult.error.message);

      const business: any = businessResult.data;
      const website: any = websiteResult.data;
      const project: any = projectResult.data;
      const approval: any = approvalResult.data;
      const onboarding: any = onboardingResult.data;
      const pages = Array.isArray(website?.pages) ? website.pages : [];
      const visibleSections = pages.flatMap((page: any) =>
        Array.isArray(page?.sections) ? page.sections.filter((section: any) => section?.isVisible !== false) : [],
      );
      const seo = website?.seo && typeof website.seo === "object" ? website.seo : {};
      const storedButtonHealth =
        website?.button_health && typeof website.button_health === "object"
          ? website.button_health
          : seo.buttonHealth && typeof seo.buttonHealth === "object"
            ? seo.buttonHealth
            : {};
      const criticalBroken = Number(storedButtonHealth.criticalBroken ?? storedButtonHealth.critical ?? 0);
      const brokenButtons = Number(storedButtonHealth.broken ?? criticalBroken ?? 0);
      const hasEnquiryPath = visibleSections.some((section: any) =>
        ["contact", "appointment", "lead_form", "enquiry"].includes(String(section?.type || "")),
      );
      const serializedPages = JSON.stringify(pages);
      const hasWhatsapp = /wa\.me|whatsapp/i.test(serializedPages);
      const hasEmail = /mailto:|"email"\s*:/i.test(serializedPages);
      const hasBooking = /calendly|booking|appointment|book[-_ ]?(?:now|call|appointment)/i.test(serializedPages);
      const deliveryQuality = seo.deliveryQuality && typeof seo.deliveryQuality === "object" ? seo.deliveryQuality : {};
      const validationReport = website?.validation_report && typeof website.validation_report === "object" ? website.validation_report : {};
      const brokenImages = Number(validationReport.brokenImages ?? validationReport.broken_images ?? 0);
      const mobileQaRecorded = deliveryQuality.responsiveQaApproved === true || validationReport.mobileReady === true || validationReport.responsive === true;
      const faviconReady = Boolean(String(seo.favicon || seo.faviconUrl || website?.theme?.favicon || website?.theme?.faviconUrl || "").trim());
      const pageLabels = pages.map((page: any) => `${page?.title || ""} ${page?.slug || ""}`.toLowerCase());
      const hasPrivacyPage = pageLabels.some((label: string) => /privacy/.test(label));
      const hasTermsPage = pageLabels.some((label: string) => /terms|legal/.test(label));
      const analyticsReady = Boolean(String(business.ga_measurement_id || business.meta_pixel_id || business.tracking_scripts_header || business.tracking_scripts_footer || "").trim());
      const hasCustomDomain = Boolean(String(business.custom_domain || "").trim());
      const domainReady = !hasCustomDomain || (
        String(business.custom_domain_status || "").toLowerCase() === "connected"
        && String(business.ssl_status || "").toLowerCase() === "issued"
      );
      const onboardingReady =
        Boolean(business.onboarding_completed_at)
        || String(onboarding?.status || "").toLowerCase() === "completed"
        || Number(onboarding?.progress || 0) >= 100;

      const publicUrl = hasCustomDomain && String(business.custom_domain_status || "").toLowerCase() === "connected"
        ? `https://${normalizeDomainInput(String(business.custom_domain || ""))}`
        : `${publicAppUrl()}/w/${businessId}`;
      let reachable = false;
      let liveHtmlReady = false;
      let httpStatus: number | null = null;
      let latencyMs: number | null = null;
      if (!preflight) {
        const startedAt = Date.now();
        try {
          const response = await fetch(publicUrl, {
            method: "GET",
            redirect: "follow",
            signal: AbortSignal.timeout(6000),
            headers: { "user-agent": "BennieStudio-LaunchQA/1.0" },
          });
          httpStatus = response.status;
          reachable = response.status >= 200 && response.status < 400;
          liveHtmlReady = reachable && String(response.headers.get("content-type") || "").toLowerCase().includes("text/html");
          latencyMs = Date.now() - startedAt;
          await response.body?.cancel().catch(() => undefined);
        } catch {
          latencyMs = Date.now() - startedAt;
        }
      }

      const liveCrawler = await runFinalLaunchCrawler({
        pages,
        theme: website?.theme || {},
        seo,
        maxResources: 60,
        fetchResource: async (url, method) => {
          const { response, finalUrl } = await fetchAuditResource(url, method);
          const result = {
            status: response.status,
            contentType: response.headers.get("content-type"),
            finalUrl,
          };
          await response.body?.cancel().catch(() => undefined);
          return result;
        },
      });

      const checks = [
        { id: "onboarding", label: "Customer onboarding complete", pass: onboardingReady, severity: "blocker" },
        { id: "website", label: "Website draft exists", pass: Boolean(website?.id && pages.length), severity: "blocker" },
        { id: "mobile", label: "Mobile/responsive QA approved", pass: mobileQaRecorded, severity: "blocker" },
        { id: "seo", label: "SEO title and description present", pass: Boolean(String(seo.title || "").trim() && String(seo.description || "").trim()), severity: "blocker" },
        { id: "favicon", label: "Favicon configured", pass: faviconReady, severity: "warning" },
        { id: "forms", label: "Lead/contact form path exists", pass: hasEnquiryPath, severity: "blocker" },
        { id: "whatsapp", label: hasWhatsapp ? "WhatsApp CTA detected" : "WhatsApp CTA not configured", pass: hasWhatsapp, severity: "warning" },
        { id: "email", label: hasEmail ? "Email contact path detected" : "Email contact path not configured", pass: hasEmail, severity: "warning" },
        { id: "booking", label: hasBooking ? "Booking/appointment path detected" : "Booking link not configured", pass: hasBooking, severity: "warning" },
        { id: "buttons", label: "No broken website buttons/links", pass: brokenButtons === 0 && criticalBroken === 0 && liveCrawler.brokenLinks.length === 0, severity: "blocker" },
        { id: "images", label: "No broken images reported", pass: brokenImages === 0 && liveCrawler.brokenImages.length === 0, severity: "blocker" },
        { id: "fresh_crawl", label: `Fresh crawl: ${liveCrawler.pageCount} pages · ${liveCrawler.resourceCount} live targets checked`, pass: liveCrawler.pass, severity: "blocker" },
        { id: "crawler_complete", label: liveCrawler.truncated ? `Crawler limit reached: ${liveCrawler.resourceCount}/${liveCrawler.discoveredResourceCount} targets verified` : `All ${liveCrawler.discoveredResourceCount} discovered targets verified`, pass: !liveCrawler.truncated, severity: "blocker" },
        { id: "internal_navigation", label: liveCrawler.navigationIssues.length ? `${liveCrawler.navigationIssues.length} internal navigation target(s) are invalid` : "Internal page and section targets are valid", pass: liveCrawler.navigationIssues.length === 0, severity: "blocker" },
        { id: "crawler_review", label: liveCrawler.uncertainResources.length ? `${liveCrawler.uncertainResources.length} remote target(s) need manual review` : "All remote targets verified automatically", pass: liveCrawler.uncertainResources.length === 0, severity: "warning" },
        { id: "legal_privacy", label: "Privacy page present", pass: hasPrivacyPage, severity: "warning" },
        { id: "legal_terms", label: "Terms/legal page present", pass: hasTermsPage, severity: "warning" },
        { id: "analytics", label: "Analytics/tracking configured", pass: analyticsReady, severity: "warning" },
        { id: "approval", label: "Customer approved current version", pass: approval?.status === "approved", severity: "blocker" },
        { id: "project", label: "No delivery launch blocker", pass: !String(project?.launch_blocker || "").trim(), severity: "blocker" },
        { id: "domain", label: hasCustomDomain ? "DNS, custom domain and SSL ready" : "Bennie hosted URL available", pass: domainReady, severity: "blocker" },
        { id: "reachability", label: preflight ? "Live URL reachability check runs after publication" : "Public website returns a successful HTML page", pass: preflight || reachable && liveHtmlReady, severity: preflight ? "info" : "blocker" },
        { id: "publication", label: preflight ? "Ready for initial publication" : `Publication status: ${String(website?.status || "not_created")}`, pass: preflight || ["published", "active"].includes(String(website?.status || "").toLowerCase()), severity: "blocker" },
      ];
      const blockers = checks.filter((check) => !check.pass && check.severity === "blocker");
      const warnings = checks.filter((check) => !check.pass && check.severity === "warning");
      return res.json({
        businessId,
        mode: preflight ? "preflight" : "live",
        websiteId: website?.id || null,
        ready: blockers.length === 0,
        checks,
        blockers,
        warnings,
        publicUrl,
        reachable,
        liveHtmlReady,
        crawler: liveCrawler,
        httpStatus,
        latencyMs,
        project: project || null,
        approval: approval || null,
        onboarding: onboarding || null,
        checkedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      if (["BUSINESS_NOT_FOUND", "PROFILE_NOT_FOUND", "FORBIDDEN_BUSINESS_ACCESS"].includes(error?.message)) {
        return handleAccessError(res, error);
      }
      console.error("[Launch Readiness] Failed:", error?.message || error);
      return res.status(503).json({ error: "Launch readiness could not be checked." });
    }
  });

  app.get(
    "/api/website-health",
    authenticate,
    rateLimit({ windowMs: 60 * 1000, max: 30, keyPrefix: "website-health", key: (req) => req.user?.id || getClientIp(req) }),
    async (req: any, res) => {
      const businessId = String(req.query.businessId || "");
      if (!UUID_SCHEMA.safeParse(businessId).success) {
        return res.status(400).json({ error: "Invalid business reference." });
      }
      try {
        await assertBusinessRoleAccess(req.user.id, businessId, { customerRoles: ["business_admin", "staff"], platformPermissions: ["delivery", "customer_health"] });
        const [
          { data: business, error: businessError },
          { data: website, error: websiteError },
          { data: deliveryProject, error: deliveryError },
        ] = await Promise.all([
          supabaseAdmin
            .from("businesses")
            .select("id,name,custom_domain,custom_domain_status,subdomain")
            .eq("id", businessId)
            .single(),
          supabaseAdmin
            .from("websites")
            .select("id,status,seo,updated_at")
            .eq("business_id", businessId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabaseAdmin
            .from("projects")
            .select("id,status,priority,target_launch_date,updated_at")
            .eq("business_id", businessId)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
        if (businessError || !business) return res.status(404).json({ error: "Business not found." });
        if (websiteError) throw websiteError;
        if (deliveryError) console.warn("Website health delivery status unavailable:", deliveryError.message);

        const connectedDomain =
          String((business as any).custom_domain_status || "").toLowerCase() === "connected"
            ? normalizeDomainInput(String((business as any).custom_domain || ""))
            : "";
        const publicUrl = connectedDomain
          ? `https://${connectedDomain}`
          : `${publicAppUrl()}/w/${businessId}`;

        const startedAt = Date.now();
        let reachable = false;
        let httpStatus: number | null = null;
        let finalUrl = publicUrl;
        let fetchError: string | null = null;
        try {
          const response = await fetch(publicUrl, {
            method: "GET",
            redirect: "follow",
            signal: AbortSignal.timeout(8000),
            headers: { "user-agent": "BennieStudio-WebsiteHealth/1.0" },
          });
          httpStatus = response.status;
          finalUrl = response.url || publicUrl;
          reachable = response.status >= 200 && response.status < 500;
          await response.body?.cancel().catch(() => undefined);
        } catch (error: any) {
          fetchError = safeErrorMessage(error);
        }

        const seo: any = website?.seo || {};
        const buttonHealth = seo.buttonHealth || {};
        const release = seo.publishedVersion || null;
        return res.json({
          businessId,
          websiteId: website?.id || null,
          websiteStatus: website?.status || "not_created",
          url: publicUrl,
          finalUrl,
          reachable,
          httpStatus,
          latencyMs: Date.now() - startedAt,
          checkedAt: new Date().toISOString(),
          buttonHealth: {
            total: Number(buttonHealth.total || 0),
            broken: Number(buttonHealth.broken || 0),
            criticalBroken: Number(buttonHealth.criticalBroken ?? buttonHealth.critical ?? 0),
            checkedAt: buttonHealth.checkedAt || buttonHealth.updatedAt || null,
          },
          release,
          launchGateReady: seo.launchGate?.ready === true,
          deliveryStandardVersion: seo.deliveryStandardVersion || null,
          websiteUpdatedAt: website?.updated_at || null,
          delivery: deliveryProject
            ? {
                projectId: deliveryProject.id,
                status: deliveryProject.status || null,
                priority: deliveryProject.priority || null,
                targetLaunchDate: deliveryProject.target_launch_date || null,
                updatedAt: deliveryProject.updated_at || null,
              }
            : null,
          error: fetchError,
        });
      } catch (error: any) {
        if (["BUSINESS_NOT_FOUND", "PROFILE_NOT_FOUND", "FORBIDDEN_BUSINESS_ACCESS"].includes(error?.message)) {
          return handleAccessError(res, error);
        }
        console.error("Website health check failed:", error);
        return res.status(500).json({ error: "Website health could not be checked." });
      }
    },
  );

  app.post(
    "/api/onboarding/complete",
    authenticate,
    rateLimit({ windowMs: 60 * 1000, max: 10, keyPrefix: "onboarding-complete", key: (req) => req.user?.id || getClientIp(req) }),
    async (req: any, res) => {
      const body = validateBody(z.object({
        businessId: UUID_SCHEMA,
        websiteId: UUID_SCHEMA,
        planId: z.string().trim().min(1).max(80),
        proposalId: UUID_SCHEMA.optional().nullable(),
        previewIntent: z.record(z.string(), z.any()).optional(),
        deliveryStandardVersion: z.string().trim().max(40).optional(),
        deliveryContext: z.record(z.string(), z.any()).optional(),
      }), req, res);
      if (!body) return;
      try {
		        let effectivePlanId = "";
		        await assertBusinessAdminAccess(req.user.id, body.businessId);
		        let { data: business } = await supabaseAdmin
		          .from("businesses")
		          .select("id,name,plan,commercial_product_slug,subscription_status,stripe_customer_id,stripe_subscription_id")
		          .eq("id", body.businessId)
		          .single();
		        effectivePlanId = String((business as any)?.plan || "").trim();

            const { data: onboardingWebsite, error: onboardingWebsiteError } = await supabaseAdmin
              .from("websites")
              .select("id,business_id")
              .eq("id", body.websiteId)
              .eq("business_id", body.businessId)
              .maybeSingle();
            if (onboardingWebsiteError) throw onboardingWebsiteError;
            if (!onboardingWebsite) {
              return res.status(404).json({
                error: "The selected website does not belong to this business.",
                code: "WEBSITE_BUSINESS_MISMATCH",
              });
            }

	        if (body.proposalId) {
	          const { data: proposal } = await supabaseAdmin
	            .from("proposals")
	            .select("id,status,accepted_email,business_id,config,leads(email)")
	            .eq("id", body.proposalId)
	            .maybeSingle();
            if (proposal?.business_id && proposal.business_id !== body.businessId) {
              return res.status(403).json({ error: "This proposal belongs to another business.", code: "PROPOSAL_BUSINESS_MISMATCH" });
            }
	          const buyerEmail = String(proposal?.accepted_email || (proposal?.leads as any)?.email || "").trim().toLowerCase();
	          const signedInEmail = String(req.user?.email || "").trim().toLowerCase();
	          const payment = proposal?.config?.payment;
	          if (proposal?.status === "Accepted" && payment?.stripeSubscriptionId && buyerEmail && buyerEmail === signedInEmail) {
		            effectivePlanId = resolveOnboardingPlan({ storedPlan: (business as any)?.plan, verifiedProposalPlan: proposal.config?.planId || "website_growth_partner" });
	            await supabaseAdmin.from("businesses").update({
	              plan: effectivePlanId,
	              subscription_status: "active",
	              stripe_customer_id: payment.stripeCustomerId || null,
	              stripe_subscription_id: payment.stripeSubscriptionId,
	            }).eq("id", body.businessId);
	            await supabaseAdmin.from("proposals").update({ business_id: body.businessId, updated_at: new Date().toISOString() }).eq("id", proposal.id);
		            const refreshed = await supabaseAdmin.from("businesses").select("id,name,plan,commercial_product_slug,subscription_status,stripe_customer_id,stripe_subscription_id").eq("id", body.businessId).single();
		            business = refreshed.data;
		          }
		        }
		        try {
		          effectivePlanId = resolveOnboardingPlan({ storedPlan: effectivePlanId });
		        } catch {
		          return res.status(409).json({ error: "The paid product could not be resolved for onboarding.", code: "PRODUCT_NOT_RESOLVED" });
		        }
	        const subscriptionStatus = String((business as any)?.subscription_status || "").toLowerCase();
	        const billingConfirmed =
	          subscriptionStatus === "active" ||
	          (subscriptionStatus === "trialing" && Boolean((business as any)?.stripe_customer_id) && Boolean((business as any)?.stripe_subscription_id));
	        if (!billingConfirmed) {
	          return res.status(402).json({
	            error: "Payment must be confirmed before onboarding can start production handoff.",
	            code: "BILLING_CONFIRMATION_REQUIRED",
	          });
	        }
	        const publicPlanSlug = legacyPlanToPublicPlanSlug(business.commercial_product_slug || effectivePlanId);
        const deliveryStandard = PLAN_DELIVERY_STANDARDS[publicPlanSlug];
        const now = new Date();
        const firstDraftTarget = addBusinessDays(now, deliveryStandard.firstDraftBusinessDays);
        const targetLaunch = addBusinessDays(now, deliveryStandard.targetLaunchBusinessDays);
        const handoffSummary = {
          standardVersion: body.deliveryStandardVersion || DELIVERY_STANDARD_VERSION,
          publicPlanSlug,
          firstDraftTarget: firstDraftTarget.toISOString(),
          targetLaunch: targetLaunch.toISOString(),
          previewIntent: body.previewIntent || {},
          deliveryContext: body.deliveryContext || {},
        };
        const { data: projectStatus, error: handoffError } = await supabaseAdmin.rpc("accept_generated_handoff", {
          p_business: body.businessId,
          p_website: body.websiteId,
          p_payload: {
            title: `${business.name} Managed Website`,
            plan: effectivePlanId,
            slug: publicPlanSlug,
            launch: targetLaunch.toISOString().slice(0, 10),
            notes: `Delivery handoff ${JSON.stringify(handoffSummary)}`,
          },
        });
        if (handoffError) throw handoffError;
        const nextStep = projectStatus === "internal_review" ? "Draft ready for internal review" :
          projectStatus === "ready_for_build" ? "Draft requires production work" : "Production handoff recorded";

        await supabaseAdmin.from("tracking_events").insert({
          event_type: "sales_delivery_handoff",
          source_platform: "customer_dashboard",
          metadata: {
            businessId: body.businessId,
            websiteId: body.websiteId,
            ...handoffSummary,
          },
        }).then(({ error }) => {
          if (error) console.warn("Sales-to-delivery handoff tracking skipped:", error.message);
        });

        const { data: onboarding } = await supabaseAdmin.from("onboarding_sessions").select("id").eq("business_id", body.businessId).neq("status", "Completed").order("created_at", { ascending: false }).limit(1).maybeSingle();
        const onboardingPayload = { current_step: nextStep, status: "Completed", progress: 100, notes: "Customer onboarding submitted and website draft generated.", updated_at: new Date().toISOString() };
        if (onboarding) await supabaseAdmin.from("onboarding_sessions").update(onboardingPayload).eq("id", onboarding.id);
        else await supabaseAdmin.from("onboarding_sessions").insert({ business_id: body.businessId, ...onboardingPayload });

        const { data: admins } = await supabaseAdmin.from("profiles").select("id").in("role", ["super_admin", "platform_staff"]);
        if (admins?.length) await supabaseAdmin.from("notifications").insert(admins.map((admin: any) => ({ user_id: admin.id, business_id: body.businessId, title: "Customer onboarding completed", message: `${business.name} submitted onboarding. ${nextStep}. First reviewed draft target: ${firstDraftTarget.toISOString().slice(0, 10)}.`, type: "onboarding", metadata: { websiteId: body.websiteId, firstDraftTarget: firstDraftTarget.toISOString(), targetLaunch: targetLaunch.toISOString(), deliveryStandardVersion: body.deliveryStandardVersion || DELIVERY_STANDARD_VERSION } })))
          .then(({ error }) => { if (error) console.warn("Onboarding admin notification skipped:", error.message); });
        await supabaseAdmin.from("tracking_events").insert({ event_type: "onboarding_completed", source_platform: "customer_dashboard", metadata: { businessId: body.businessId, websiteId: body.websiteId, planId: effectivePlanId } })
          .then(({ error }) => { if (error) console.warn("Onboarding tracking skipped:", error.message); });
        return res.json({
          success: true,
          projectStatus,
          deliveryStandardVersion: body.deliveryStandardVersion || DELIVERY_STANDARD_VERSION,
          firstDraftTarget: firstDraftTarget.toISOString(),
          targetLaunch: targetLaunch.toISOString(),
        });
      } catch (error: any) {
        if (["BUSINESS_NOT_FOUND", "PROFILE_NOT_FOUND", "FORBIDDEN_BUSINESS_ACCESS"].includes(error?.message)) return handleAccessError(res, error);
        console.error("Onboarding handoff failed:", error);
        return res.status(500).json({ error: "Your website was saved, but the delivery handoff could not be completed. Please retry." });
      }
    },
  );

  app.post("/api/create-portal-session", authenticate, async (req, res) => {
    const { customerId } = req.body;

    try {
      // Verify customer ownership or admin status
      const { data: business } = await supabase
        .from("businesses")
        .select("id, owner_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", (req as any).user.id)
        .single();

      if (
        !business ||
        (business.owner_id !== (req as any).user.id &&
          profile?.role !== "super_admin")
      ) {
        return res.status(403).json({
          error:
            "Forbidden: You do not have permission to access this billing portal.",
        });
      }

      const stripe = await getStripe();
      const returnUrl = `${publicAppUrl()}/dashboard/settings`;
      // Keep cancellation inside Bennie Studio so minimum-term and handover
      // rules cannot be bypassed through a generic Stripe portal homepage.
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
        flow_data: {
          type: "payment_method_update",
          after_completion: {
            type: "redirect",
            redirect: { return_url: returnUrl },
          },
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating portal session:", error);
      if (error.message === "STRIPE_CONFIG_ERROR") {
        return res.status(400).json({
          error:
            "Stripe is not configured. Please provide a valid Stripe Secret Key (sk_test_...) in the application settings menu (top right).",
          code: "STRIPE_CONFIG_MISSING",
        });
      }
      if (error.message === "STRIPE_INVALID_KEY_FORMAT") {
        return res.status(400).json({
          error:
            'Invalid Stripe Secret Key format. Your key should start with "sk_" or "rk_". Please check your settings.',
          code: "STRIPE_INVALID_KEY",
        });
      }
      res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  app.get(
    "/api/platform/ai-usage",
    authenticate,
    superAdminOnly,
    async (req, res) => {
      try {
        const { data } = await supabaseAdmin
          .from("settings")
          .select("content")
          .eq("id", "ai_metrics")
          .maybeSingle();
        res.json({
          success: true,
          data: data?.content || { totalGenerations: 0, estimatedCost: 0 },
        });
      } catch (error: any) {
        res.status(500).json({ error: safeErrorMessage(error) });
      }
    },
  );

  app.get(
    "/api/platform/traffic-metrics",
    authenticate,
    superAdminOnly,
    async (req, res) => {
      try {
        const requestedDays = parseInt(req.query.days as string) || 30;
        const days = Math.min(90, Math.max(1, requestedDays));
        const since = new Date();
        since.setDate(since.getDate() - days);
        const sinceIso = since.toISOString();

        const fetchAllRows = async (buildQuery: (from: number, to: number) => any) => {
          const rows: any[] = [];
          const pageSize = 1000;
          for (let from = 0; ; from += pageSize) {
            const { data, error } = await buildQuery(from, from + pageSize - 1);
            if (error) throw error;
            const page = data || [];
            rows.push(...page);
            if (page.length < pageSize) break;
          }
          return rows;
        };

        const [
          pageViewsResult,
          trackingEventsResult,
          profilesResult,
          businessesResult,
          leadsResult,
        ] = await Promise.allSettled([
          fetchAllRows((from, to) => supabaseAdmin
            .from("page_views")
            .select("visitor_id, session_id, page_path, referrer, created_at")
            .gte("created_at", sinceIso)
            .order("created_at", { ascending: false })
            .range(from, to)),
          fetchAllRows((from, to) => supabaseAdmin
            .from("tracking_events")
            .select("event_type, source_platform, source_page, metadata, created_at")
            .gte("created_at", sinceIso)
            .order("created_at", { ascending: false })
            .range(from, to)),
          fetchAllRows((from, to) => supabaseAdmin
            .from("profiles")
            .select("id, created_at")
            .gte("created_at", sinceIso)
            .order("created_at", { ascending: false })
            .range(from, to)),
          fetchAllRows((from, to) => supabaseAdmin
            .from("businesses")
            .select("id, created_at")
            .gte("created_at", sinceIso)
            .order("created_at", { ascending: false })
            .range(from, to)),
          fetchAllRows((from, to) => supabaseAdmin
            .from("leads")
            .select("id, source, status, visitor_id, created_at")
            .gte("created_at", sinceIso)
            .order("created_at", { ascending: false })
            .range(from, to)),
        ]);

        const unwrapRows = <T = any>(result: PromiseSettledResult<any>): T[] => {
          if (result.status !== "fulfilled") return [];
          if (Array.isArray(result.value)) return result.value;
          if (result.value?.error) {
            console.warn("Traffic metric source unavailable:", result.value.error.message);
            return [];
          }
          return result.value?.data || [];
        };

        const pageViews = unwrapRows<any>(pageViewsResult);
        const trackingEvents = unwrapRows<any>(trackingEventsResult);
        const profiles = unwrapRows<any>(profilesResult);
        const businesses = unwrapRows<any>(businessesResult);
        const leads = unwrapRows<any>(leadsResult);
        const clickEventPattern = /(click|cta|whatsapp|call|email|booking|quote|checkout|form_submit|appointment)/i;
        const clickEvents = trackingEvents.filter((event) =>
          clickEventPattern.test(String(event.event_type || "")),
        );
        const actualPageViews = pageViews.filter((view) => !String(view.page_path || "").includes(":"));
        const aggregate = summarizePlatformTraffic({ pageViews: actualPageViews, trackingEvents, profiles, businesses, leads });

        const topPages = Object.entries(
          actualPageViews.reduce((acc: Record<string, number>, view) => {
            const path = String(view.page_path || "/");
            acc[path] = (acc[path] || 0) + 1;
            return acc;
          }, {}),
        )
          .map(([path, count]) => ({ path, count }))
          .sort((a, b) => Number(b.count) - Number(a.count));

        const utcToday = new Date();
        const utcMidnight = Date.UTC(utcToday.getUTCFullYear(), utcToday.getUTCMonth(), utcToday.getUTCDate());
        const dateKeys = Array.from({ length: days }, (_, index) =>
          new Date(utcMidnight - (days - 1 - index) * 86400000).toISOString().slice(0, 10),
        );
        const trend = dateKeys.map((date) => {
          const views = actualPageViews.filter((view) => String(view.created_at || "").startsWith(date));
          const dailyVisitors = new Set(views.map((view) => view.visitor_id).filter(Boolean));
          const clicks = clickEvents.filter((event) => String(event.created_at || "").startsWith(date)).length;
          const signups = profiles.filter((profile) => String(profile.created_at || "").startsWith(date)).length;
          return { date, views: views.length, uniques: dailyVisitors.size, clicks, registrations: signups };
        });

        const normalizeSource = (referrer?: string | null) => {
          if (!referrer) return "Direct / unknown";
          try {
            const host = new URL(referrer).hostname.replace(/^www\./, "");
            return host || "Direct / unknown";
          } catch {
            return String(referrer).slice(0, 60) || "Direct / unknown";
          }
        };
        const sources = Object.entries(
          actualPageViews.reduce((acc: Record<string, number>, view) => {
            const source = normalizeSource(view.referrer);
            acc[source] = (acc[source] || 0) + 1;
            return acc;
          }, {}),
        )
          .map(([source, count]) => ({ source, count }))
          .sort((a, b) => Number(b.count) - Number(a.count))
          .slice(0, 8);

        const recentEvents = trackingEvents.slice(0, 12).map((event) => ({
          eventType: event.event_type || "event",
          sourcePage: event.source_page || event.metadata?.pagePath || "/",
          label: event.metadata?.label || event.metadata?.buttonLabel || event.event_type || "Event",
          createdAt: event.created_at,
        }));

        res.json({
          success: true,
          aggregate,
          topPages,
          trend,
          sources,
          recentEvents,
        });
      } catch (error: any) {
        console.error("Traffic metrics error:", error);
        res.status(500).json({ error: safeErrorMessage(error) });
      }
    },
  );

  app.get(
    "/api/platform/mrr-metrics",
    authenticate,
    superAdminOnly,
    async (req, res) => {
      try {
        const stripe = await getStripe();

        // Fetch all active subscriptions
        // Note: For very large accounts, you'd need pagination
        const subscriptions = await stripe.subscriptions.list({
          status: "active",
          limit: 100,
          expand: ["data.customer"],
        });

        let mrr = 0;
        let activeCustomers = 0;
        let chartData: any[] = [];

        // Simplified MRR calculation: Sum of all active subscription items
        subscriptions.data.forEach((sub) => {
          sub.items.data.forEach((item) => {
            const amount = item.price.unit_amount || 0;
            const quantity = item.quantity || 1;
            const interval = item.price.recurring?.interval;
            const intervalCount = item.price.recurring?.interval_count || 1;

            let monthlyAmount = (amount * quantity) / 100; // to dollars

            if (interval === "year") {
              monthlyAmount = monthlyAmount / 12;
            } else if (interval === "week") {
              monthlyAmount = monthlyAmount * 4;
            } else if (interval === "month" && intervalCount > 1) {
              monthlyAmount = monthlyAmount / intervalCount;
            }

            mrr += monthlyAmount;
          });
          activeCustomers++;
        });

        chartData = [{ name: new Date().toLocaleString("en", { month: "short" }), mrr: Math.round(mrr), subscriptions: activeCustomers }];

        res.json({
          success: true,
          data: {
            mrr: Math.round(mrr),
            activeCustomers,
            averageRevenuePerUser:
              activeCustomers > 0 ? Math.round(mrr / activeCustomers) : 0,
            growthRate: null,
            hasGrowthData: false,
            chartData,
            isLive: true,
          },
        });
      } catch (error: any) {
        // Fallback: Calculate metrics from the actual business database when Stripe is not configured
        // CRITICAL: We use supabaseAdmin here to bypass RLS and get platform-wide metrics for the Super Admin
        try {
          const { data: activeBusinesses } = await supabaseAdmin
            .from("businesses")
            .select("plan, subscription_status, commercial_product_slug, commercial_market")
            .eq("status", "active");

          const { data: currentPrices } = await supabaseAdmin
            .from("commercial_market_prices")
            .select("product_id, market, monthly_price, commercial_products!inner(slug)")
            .eq("active", true);
          const currentPriceMap: Record<string, number> = {};
          (currentPrices || []).forEach((entry: any) => {
            const slug = entry.commercial_products?.slug;
            if (slug && entry.market && Number(entry.monthly_price) > 0) currentPriceMap[`${slug}:${entry.market}`] = Number(entry.monthly_price);
          });

          // Get plan pricing from settings or default constants
          const { data: plansData } = await supabaseAdmin
            .from("settings")
            .select("content")
            .eq("id", "plans")
            .maybeSingle();

          const planDefinitions = plansData?.content?.pricing || [];

          // Create a lookup for numeric prices
          const priceMap: Record<string, number> = {};
          planDefinitions.forEach((p: any) => {
            const numericPrice = parseInt(p.price.replace(/[^0-9]/g, "")) || 0;
            priceMap[p.id] = numericPrice;
          });

          let calculatedMrr = 0;
          let activeCustomersCount = 0;

          (activeBusinesses || []).forEach((biz) => {
            if (biz.subscription_status === "active") {
              calculatedMrr += biz.commercial_product_slug
                ? currentPriceMap[`${biz.commercial_product_slug}:${biz.commercial_market || "INTL"}`] || 0
                : priceMap[biz.plan] || 0;
              activeCustomersCount++;
            }
          });
          const chartData = [{ name: new Date().toLocaleString("en", { month: "short" }), mrr: calculatedMrr, subscriptions: activeCustomersCount }];

          res.json({
            success: true,
            data: {
              mrr: calculatedMrr,
              activeCustomers: activeCustomersCount,
              averageRevenuePerUser:
                activeCustomersCount > 0
                  ? Math.round(calculatedMrr / activeCustomersCount)
                  : 0,
              growthRate: 0,
              hasGrowthData: false,
              chartData,
              isLive: false,
              source: "database",
            },
          });
        } catch (fallbackError) {
          console.error("Final fallback failed:", fallbackError);
          res.json({
            success: true,
            data: {
              mrr: 0,
              activeCustomers: 0,
              averageRevenuePerUser: 0,
              growthRate: 0,
              chartData: [],
              isLive: false,
            },
          });
        }
      }
    },
  );

  app.post(
    "/api/leads/submit",
    rateLimit({ windowMs: 60 * 1000, max: 20, keyPrefix: "public-leads" }),
    async (req, res) => {
    const publicLeadBody = validateBody(
      z.object({
        businessId: UUID_SCHEMA,
        name: TEXT_SCHEMA,
        email: EMAIL_SCHEMA,
        phone: z.string().trim().max(80).optional().nullable(),
        service: z.string().trim().max(160).optional().nullable(),
        message: OPTIONAL_TEXT_SCHEMA,
        visitorId: z.string().trim().max(120).optional().nullable(),
        sessionId: z.string().trim().max(120).optional().nullable(),
        refCode: z.string().trim().max(120).optional().nullable(),
        source: z.string().trim().max(80).optional().nullable(),
        sourcePage: z.string().trim().max(500).optional().nullable(),
        formName: z.string().trim().max(120).optional().nullable(),
        consentText: z.string().trim().max(1000).optional().nullable(),
        consentTimestamp: z.string().trim().max(80).optional().nullable(),
        marketingConsent: z.boolean().optional().default(false),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
      req,
      res,
    );
    if (!publicLeadBody) return;

    const { businessId, name, email, phone, service, message, visitorId, sessionId, refCode, source, sourcePage, formName, consentText, consentTimestamp, marketingConsent, metadata } = publicLeadBody;

    try {
      const { data: websiteRecord } = await supabaseAdmin
        .from("websites")
        .select("id,status")
        .eq("business_id", businessId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!websiteRecord) {
        await supabaseAdmin.from("sync_logs").insert({
          business_id: businessId,
          direction: "website_lead",
          event_type: "contact_form_submission_failed",
          status: "failed",
          message: "Lead submitted before any website record existed",
          payload: { sourcePage, formName, metadata },
        }).then(({ error }) => {
          if (error) console.warn("Lead failure log failed:", error.message);
        });
        return res.status(404).json({ error: "Website preview not found" });
      }

      // 1. Insert lead using admin client to handle public submissions.
      // Use fallbacks so lead capture still works before optional metadata migrations are applied.
      const leadMessage = service ? `Service interested: ${service}\n\n${message || ""}`.trim() : message;
      const leadPayloads = [
        {
          business_id: businessId,
          website_id: websiteRecord.id,
          name,
          email,
          phone,
          message: leadMessage,
          visitor_id: visitorId,
          source: source || "organic",
          source_page: sourcePage || req.get("referer") || null,
          form_name: formName || "Website contact form",
          consent_text: consentText || null,
          consent_timestamp: consentTimestamp || new Date().toISOString(),
          marketing_consent: !!marketingConsent,
          form_version: metadata?.formVersion || "gdpr_form_v1",
          raw_fields: {
            service,
            websiteId: websiteRecord.id,
            consentText,
            consentTimestamp,
            marketingConsent,
            sourcePage: sourcePage || req.get("referer") || null,
            formVersion: metadata?.formVersion || "gdpr_form_v1",
            ...(metadata || {}),
          },
          status: "new",
        },
        {
          business_id: businessId,
          name,
          email,
          phone,
          message: leadMessage,
          visitor_id: visitorId,
          source: source || "organic",
          status: "new",
        },
        {
          business_id: businessId,
          name,
          email,
          phone,
          message: leadMessage,
          source: source || "organic",
          status: "new",
        },
      ];

      let lead: any = null;
      let leadError: any = null;
      for (const payload of leadPayloads) {
        const { data, error } = await supabaseAdmin
          .from("leads")
          .insert([payload])
          .select()
          .single();
        if (!error) {
          lead = data;
          leadError = null;
          break;
        }
        leadError = error;
        const isMissingColumn =
          error.code === "42703" ||
          String(error.message || "").includes("schema cache") ||
          String(error.message || "").includes("column");
        if (!isMissingColumn) break;
      }

      if (leadError) throw leadError;

      await supabaseAdmin
        .from("tracking_events")
        .insert({
          business_id: businessId,
          event_type: "lead_form_submit",
          source_platform: "website",
          source_page: sourcePage || req.get("referer") || null,
          metadata: {
            ...(metadata || {}),
            websiteId: websiteRecord.id,
            websiteStatus: websiteRecord.status,
            leadId: lead.id,
            visitorId,
            sessionId,
            formName: formName || "Website contact form",
            source: source || "website_form",
          },
        })
        .then(({ error }) => {
          if (error) console.warn("Lead form tracking event failed:", error.message);
        });

      if (visitorId || sourcePage) {
        await supabaseAdmin
          .from("page_views")
          .insert({
            business_id: businessId,
            visitor_id: visitorId || lead.id,
            session_id: sessionId || visitorId || lead.id,
            page_path: sourcePage || "/contact",
            referrer: req.get("referer") || null,
            user_agent: req.get("user-agent") || null,
          })
          .then(({ error }) => {
            if (error) console.warn("Lead form page view tracking failed:", error.message);
          });
      }

      // 2. Handle Referral Attribution
      if (refCode) {
        const { data: affiliate } = await supabaseAdmin
          .from("affiliates")
          .select("id")
          .eq("referral_code", normalizeAffiliateReferralCode(refCode))
          .eq("business_id", businessId)
          .in("status", ["active", "approved"])
          .maybeSingle();

        if (affiliate) {
          await supabaseAdmin.from("affiliate_referrals").insert({
            affiliate_id: affiliate.id,
            lead_id: lead.id,
            status: "pending"
          });
        }
      }

      // 3. Fetch Business & Owner info
      const { data: business } = await supabaseAdmin
        .from("businesses")
        .select("name, owner_id")
        .eq("id", businessId)
        .single();

      if (business) {
        const { data: owner } = await supabaseAdmin
          .from("profiles")
          .select("email, full_name")
          .eq("id", business.owner_id)
          .single();

        if (owner) {
          // 4. Create Notification
          await supabaseAdmin.from("notifications").insert({
            user_id: business.owner_id,
            business_id: businessId,
            title: "New Lead Capture!",
            message: `${name} just reached out. Check your Lead CRM for details.`,
            type: "lead",
            metadata: { leadId: lead.id }
          });

          // 5. Send Email via Resend
          try {
            await sendConfiguredEmail("transactional", {
              to: owner.email,
              subject: `New Lead: ${name} is interested!`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                  <h1 style="color: #4f46e5; border-bottom: 2px solid #f3f4f6; padding-bottom: 15px;">New Opportunity Captured!</h1>
                  <p>Hello ${owner.full_name || 'Business Owner'},</p>
                  <p>You have a new lead from <strong>${business.name}</strong>.</p>
                  <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
                    <p><strong>Message:</strong> ${message || 'No message provided.'}</p>
                  </div>
                  <a href="https://launchpad.bennietay.com/dashboard/leads" 
                     style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                    View in CRM
                  </a>
                  <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
	                    This is an automated notification from your Bennie Studio website service.
                  </p>
                </div>
              `
            });
          } catch (emailErr) {
            console.error("Failed to send lead email:", emailErr);
          }
        }
      }

      res.json({ success: true, leadId: lead.id });
    } catch (error: any) {
      console.error("Lead submission error:", error);
      res.status(500).json({ error: "Failed to submit lead" });
    }
  });

  app.post(
    "/api/leads/interaction",
    rateLimit({ windowMs: 60 * 1000, max: 120, keyPrefix: "public-lead-interactions" }),
    async (req, res) => {
      const interactionBody = validateBody(
        z.object({
          businessId: UUID_SCHEMA,
          visitorId: z.string().trim().max(120).optional().nullable(),
          sessionId: z.string().trim().max(120).optional().nullable(),
          eventType: z.string().trim().min(1).max(80),
          label: z.string().trim().max(240).optional().nullable(),
          target: z.string().trim().max(500).optional().nullable(),
          pagePath: z.string().trim().max(500).optional().nullable(),
          name: z.string().trim().max(500).optional().nullable(),
          email: z.string().email().max(254).optional().nullable(),
          phone: z.string().trim().max(80).optional().nullable(),
          message: OPTIONAL_TEXT_SCHEMA,
          metadata: z.record(z.string(), z.any()).optional(),
        }),
        req,
        res,
      );
      if (!interactionBody) return;

      const {
        businessId,
        visitorId,
        sessionId,
        eventType,
        label,
        target,
        pagePath,
        name,
        email,
        phone,
        message,
        metadata,
      } = interactionBody;

      try {
        const { data: publishedSite } = await supabaseAdmin
          .from("websites")
          .select("id")
          .eq("business_id", businessId)
          .eq("status", "published")
          .maybeSingle();

        if (!publishedSite) {
          return res.status(404).json({ error: "Published website not found" });
        }

        const normalizedVisitorId =
          visitorId ||
          crypto
            .createHash("sha256")
            .update(`${businessId}:${req.ip}:${req.headers["user-agent"] || "unknown"}`)
            .digest("hex")
            .slice(0, 32);
        const actionLabel = label || eventType.replace(/_/g, " ");
        const interactionMessage =
          message ||
          `Visitor action: ${actionLabel}${target ? ` (${target})` : ""}${pagePath ? ` on ${pagePath}` : ""}.`;
        const leadIntentEvents = new Set([
          "lead_form_submit",
          "whatsapp_click",
          "call_click",
          "email_click",
          "booking_click",
          "appointment_requested",
          "appointment_booked",
          "quote_button_click",
          "checkout_click",
        ]);
        const shouldCreateLead =
          leadIntentEvents.has(eventType) ||
          Boolean(metadata?.leadIntent) ||
          Boolean(name || email || phone);

        let leadId: string | null = null;

        if (shouldCreateLead) {
          const { data: existingLead } = await supabaseAdmin
            .from("leads")
            .select("id")
            .eq("business_id", businessId)
            .eq("visitor_id", normalizedVisitorId)
            .maybeSingle();

          leadId = existingLead?.id || null;

          if (!leadId) {
            const visitorHash = crypto
              .createHash("sha256")
              .update(normalizedVisitorId)
              .digest("hex")
              .slice(0, 16);

            const { data: lead, error: leadError } = await supabaseAdmin
              .from("leads")
              .insert({
                business_id: businessId,
                name: name || "Anonymous Website Visitor",
                email: email || `visitor-${visitorHash}@bennietay.local`,
                phone,
                message: interactionMessage,
                visitor_id: normalizedVisitorId,
                source: eventType,
                status: "new",
              })
              .select("id")
              .single();

            if (leadError) throw leadError;
            leadId = lead.id;
          }
        }

        await supabaseAdmin
          .from("page_views")
          .insert({
            business_id: businessId,
            visitor_id: normalizedVisitorId,
            session_id: sessionId || normalizedVisitorId,
            page_path: `${eventType}:${pagePath || "/"}`,
            referrer: target || req.get("referer") || null,
            user_agent: req.get("user-agent") || null,
          })
          .then(({ error }) => {
            if (error) console.warn("Interaction page view tracking failed:", error.message);
          });

        await supabaseAdmin
          .from("tracking_events")
          .insert({
            business_id: businessId,
            event_type: eventType,
            source_platform: "website",
            source_page: pagePath,
            metadata: {
              ...metadata,
              leadId,
              visitorId: normalizedVisitorId,
              label: actionLabel,
              target,
            },
          })
          .then(({ error }) => {
            if (error) console.warn("Interaction event tracking failed:", error.message);
          });

        res.json({ success: true, leadId });
      } catch (error: any) {
        console.error("Lead interaction error:", error);
        res.status(500).json({ error: "Failed to record interaction" });
      }
    },
  );

  app.get(["/api/health-check", "/api/health"], async (_req, res) => {
    res.set("Cache-Control", "no-store");
    const timestamp = new Date().toISOString();
    if (process.env.E2E_TEST === "true") {
      return res.status(200).json({ status: "ok", timestamp, dependencies: { supabase: "test-fixture" } });
    }
    if (serverSupabaseEnvironment.missing.length > 0) {
      return res.status(503).json({
        status: "degraded",
        code: "SUPABASE_CONFIGURATION_MISSING",
        missingEnvironment: serverSupabaseEnvironment.missing,
        timestamp,
      });
    }
    if (serverSupabaseEnvironment.invalid.length > 0) {
      return res.status(503).json({
        status: "degraded",
        code: "SUPABASE_CONFIGURATION_INVALID",
        invalidEnvironment: serverSupabaseEnvironment.invalid,
        timestamp,
      });
    }

    try {
      const { error } = await supabaseAdmin
        .from("settings")
        .select("id")
        .limit(1)
        .abortSignal(AbortSignal.timeout(4000));
      if (error) throw error;
      return res.status(200).json({ status: "ok", timestamp, dependencies: { supabase: "ok" } });
    } catch (error: any) {
      const safeErrorMessage = String(error?.message || "").toLowerCase();
      const credentialsRejected = [401, 403].includes(Number(error?.status || error?.statusCode)) ||
        /invalid api key|invalid jwt|invalid token/.test(safeErrorMessage);
      structuredLog("error", "health_check_supabase_not_ready", {
        dependency: "supabase",
        errorCode: typeof error?.code === "string" ? error.code : "unknown",
        status: Number.isInteger(error?.status) ? error.status : undefined,
      });
      return res.status(503).json({
        status: "degraded",
        code: credentialsRejected ? "SUPABASE_CREDENTIALS_REJECTED" : "SUPABASE_UNAVAILABLE",
        dependency: "supabase",
        timestamp,
      });
    }
  });

  app.get("/api/system/status", authenticate, async (req: any, res) => {
    try {
      const requiredSchemaVersion = "202606250001_operational_readiness";
      const env = {
        supabaseUrl: Boolean(process.env.VITE_SUPABASE_URL),
        supabaseServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        stripe: Boolean(process.env.STRIPE_SECRET_KEY),
        deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
        openai: Boolean(process.env.OPENAI_API_KEY),
        upstash: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
      };

      const { error: dbError } = await supabaseAdmin.from("settings").select("id").limit(1);
      const { data: schemaVersion, error: schemaError } = await supabaseAdmin
        .from("platform_schema_versions")
        .select("version, applied_at, description")
        .eq("version", requiredSchemaVersion)
        .maybeSingle();
      const schemaOk = Boolean(schemaVersion) && !schemaError;

      res.json({
        status: dbError || !schemaOk ? "degraded" : "ok",
        timestamp: new Date().toISOString(),
        database: dbError ? { ok: false, message: dbError.message } : { ok: true },
        schema: schemaOk
          ? {
              ok: true,
              requiredVersion: requiredSchemaVersion,
              appliedAt: schemaVersion?.applied_at,
            }
          : {
              ok: false,
              requiredVersion: requiredSchemaVersion,
              message:
                schemaError?.message ||
                "Required schema migration has not been recorded yet.",
            },
        env,
      });
    } catch (error: any) {
      res.status(500).json({ status: "error", error: safeErrorMessage(error) });
    }
  });

  app.get("/api/dashboard/summary/:businessId", authenticate, async (req: any, res) => {
    const { businessId } = req.params;
    console.log(`[API] Dashboard summary for business: ${businessId}`);
    console.log(`[Dashboard] Summary request for business: ${businessId} from user: ${req.user.id}`);

    // Validate businessId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(businessId)) {
      console.warn(`[Dashboard] Invalid businessId format: ${businessId}`);
      return res.status(400).json({ error: "Invalid business ID format" });
    }

    try {
      // Security check: Ensure user belongs to this business or is super_admin
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("business_id, role")
        .eq("id", req.user.id)
        .single();
      
      if (profileError) {
        console.error("[Dashboard] Profile check error:", profileError);
        return res.status(500).json({ error: "Failed to verify user profile" });
      }

      if (!userProfile || (userProfile.business_id !== businessId && userProfile.role !== 'super_admin')) {
        console.warn(`[Dashboard] Unauthorized access attempt: User ${req.user.id} (Biz: ${userProfile?.business_id}) requested ${businessId}`);
        return res.status(403).json({ error: "Unauthorized access to business data" });
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [
        { count: leadsCount },
        { count: websitesCount },
        { count: appointmentsCount },
        { count: leadsThisMonth },
        { count: appointmentsThisMonth },
        { count: apiKeysCount },
        { data: leadsData },
        { data: leadsTrendData },
        { data: appointmentsData },
        { data: businessData },
        { data: analyticsData },
        { data: trackingData },
        aiCreditRes,
      ] = await Promise.all([
        supabaseAdmin
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabaseAdmin
          .from("websites")
          .select("*", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabaseAdmin
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabaseAdmin
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .gte("created_at", monthStart.toISOString()),
        supabaseAdmin
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .gte("created_at", monthStart.toISOString()),
        supabaseAdmin
          .from("api_keys")
          .select("*", { count: "exact", head: true })
          .eq("business_id", businessId),
        supabaseAdmin
          .from("leads")
          .select("*")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false })
          .limit(6),
        supabaseAdmin
          .from("leads")
          .select("created_at")
          .eq("business_id", businessId)
          .gte("created_at", sevenDaysAgo.toISOString()),
        supabaseAdmin
          .from("appointments")
          .select("*")
          .eq("business_id", businessId)
          .order("date", { ascending: false })
          .limit(4),
        supabaseAdmin.from("businesses").select("*").eq("id", businessId).maybeSingle(),
        supabaseAdmin
          .from("page_views")
          .select("created_at,page_path")
          .eq("business_id", businessId)
          .gte("created_at", monthStart.toISOString()),
        supabaseAdmin
          .from("tracking_events")
          .select("event_type, source_page, metadata, created_at")
          .eq("business_id", businessId)
          .gte("created_at", monthStart.toISOString())
          .order("created_at", { ascending: false })
          .limit(500),
        supabaseAdmin
          .from("ai_credit_balances")
          .select("*")
          .eq("user_id", req.user.id)
          .maybeSingle(),
      ]);

      const balance = aiCreditRes?.data || {
        monthly_credit_limit: 200,
        credits_used: 0,
        credits_remaining: 200
      };

      // Process analytics data to group by date
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split("T")[0];
      });

      const processedAnalytics = last7Days.map(date => {
        const count = (analyticsData || []).filter(pv => pv.created_at.startsWith(date)).length;
        const dayLeads = (leadsTrendData || []).filter((lead: any) => lead.created_at.startsWith(date)).length;
        
        return {
          name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          fullDate: date,
          visits: count,
          leads: dayLeads
        };
      });

      const trackedEvents = trackingData || [];
      const countEvents = (types: string[]) =>
        trackedEvents.filter((event: any) => types.includes(event.event_type)).length;
      const conversionActions = [
        { label: "WhatsApp clicks", value: countEvents(["whatsapp_click"]) },
        { label: "Call clicks", value: countEvents(["call_click"]) },
        { label: "Email clicks", value: countEvents(["email_click"]) },
        { label: "Form submissions", value: countEvents(["lead_form_submit"]) || leadsThisMonth || 0 },
        { label: "Booking clicks", value: countEvents(["booking_click", "appointment_requested", "appointment_booked"]) || appointmentsThisMonth || 0 },
        { label: "Quote button clicks", value: countEvents(["quote_button_click", "pricing_cta_click", "checkout_click"]) },
      ];
      const topAction = conversionActions.reduce(
        (best, action) => (action.value > best.value ? action : best),
        conversionActions[0],
      );
      const enquiryEventTypes = new Set(["whatsapp_click", "call_click", "email_click", "lead_form_submit", "booking_click", "appointment_requested", "appointment_booked", "quote_button_click"]);
      const pageConversionCounts = trackedEvents.filter((event: any) => enquiryEventTypes.has(event.event_type)).reduce((acc: Record<string, number>, event: any) => {
        const page = event.source_page || "/";
        acc[page] = (acc[page] || 0) + 1;
        return acc;
      }, {});
      const topEnquiryPage =
        Object.keys(pageConversionCounts).length > 0
          ? Object.entries(pageConversionCounts).sort((a, b) => b[1] - a[1])[0][0]
          : null;
      const pageViewCounts = (analyticsData || []).reduce((acc: Record<string, number>, view: any) => {
        const page = view.page_path || "/";
        acc[page] = (acc[page] || 0) + 1;
        return acc;
      }, {});
      const observedOpportunity = Object.entries(pageViewCounts)
        .filter(([, views]) => views >= 10)
        .sort((a, b) => b[1] - a[1])
        .find(([page]) => !pageConversionCounts[page]);
      const totalEnquiries = conversionActions.reduce((sum, action) => sum + Number(action.value || 0), 0);

      res.json({
        stats: {
          leads: leadsCount || 0,
          websites: websitesCount || 0,
          appointments: appointmentsCount || 0,
          apiKeys: apiKeysCount || 0,
          // Customer AI credits/top-ups are paused for the launch catalogue.
          // Keep the response shape for older clients, but never advertise a
          // spendable balance in the customer dashboard.
          aiCredits: 0,
          aiUsed: 0
        },
        recentLeads: leadsData || [],
        recentAppointments: appointmentsData || [],
        business: businessData,
        analytics: processedAnalytics,
        conversionInsights: {
          totalEnquiries,
          actions: conversionActions,
          topCta: topAction?.value > 0 ? topAction.label : "Pending tracking",
          weakestPage: null,
          topEnquiryPage,
          pageViews: (analyticsData || []).length,
          opportunity: observedOpportunity
            ? `The page ${observedOpportunity[0]} received ${observedOpportunity[1]} measured views this month without a tracked enquiry action.`
            : null,
          recommendedImprovement:
            totalEnquiries > 0
              ? "Double down on the top CTA and add a clearer fallback form on weaker pages."
              : "Add a visible WhatsApp, call, or quote CTA above the fold to start collecting conversion data.",
        },
        measuredResults: {
          enquiries: leadsThisMonth || 0,
          whatsAppClicks: countEvents(["whatsapp_click"]),
          callClicks: countEvents(["call_click"]),
          bookings: appointmentsThisMonth || countEvents(["appointment_requested", "appointment_booked"]),
          pageViews: (analyticsData || []).length,
          topEnquiryPage,
          mostUsedEnquiryPath: topAction?.value > 0 ? topAction.label : null,
          opportunity: observedOpportunity
            ? `The page ${observedOpportunity[0]} received ${observedOpportunity[1]} measured views this month without a tracked enquiry action.`
            : null,
        },
      });
    } catch (error: any) {
      console.error("Error fetching consolidated dashboard data:", error);
      res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  // Affiliate Endpoints
  app.post("/api/affiliate/track-click", async (req, res) => {
    try {
      const referralCode = String(req.body?.referralCode || "").trim();
      const visitorId = String(req.body?.visitorId || "").trim();
      const sourceUrl = String(req.body?.sourceUrl || "").slice(0, 1000);

      if (!referralCode) {
        return res.status(400).json({ error: "Referral code is required" });
      }

      const affiliate = await resolvePlatformAffiliateAttribution(referralCode);

      if (!affiliate) {
        return res.status(404).json({ error: "Affiliate code not found" });
      }

      if (visitorId) {
        const { data: existingClick } = await supabaseAdmin
          .from("affiliate_referrals")
          .select("id")
          .eq("affiliate_id", affiliate.id)
          .eq("event_type", "click")
          .eq("visitor_id", visitorId)
          .maybeSingle();

        if (existingClick) {
          return res.json({ success: true, deduped: true });
        }
      }

      await supabaseAdmin.from("affiliate_referrals").insert({
        affiliate_id: affiliate.id,
        status: "pending",
        event_type: "click",
        source_url: sourceUrl || null,
        visitor_id: visitorId || null,
        commission_status: "pending",
        metadata: {
          userAgent: req.headers["user-agent"] || null,
          referer: req.headers.referer || null,
        },
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  app.post(
    "/api/affiliate/request-payout",
    authenticate,
    async (req: any, res) => {
      const parsed = z.object({ affiliateId: UUID_SCHEMA.optional() }).strict().safeParse(req.body || {});
      if (!parsed.success) return res.status(400).json({ error: "Invalid payout request." });
      try {
        let affiliateQuery = supabaseAdmin
          .from("affiliates")
          .select("id,uid,business_id,status")
          .eq("uid", req.user.id);
        affiliateQuery = parsed.data.affiliateId
          ? affiliateQuery.eq("id", parsed.data.affiliateId)
          : affiliateQuery.is("business_id", null);

        const { data: affiliate, error: affiliateError } = await affiliateQuery.maybeSingle();
        if (affiliateError) throw affiliateError;
        if (!affiliate) return res.status(404).json({ error: "Affiliate record not found" });

        const { data, error } = await supabaseAdmin.rpc("request_affiliate_payout", {
          p_affiliate_id: affiliate.id,
          p_user_id: req.user.id,
        });
        if (error) {
          const message = String(error.message || "");
          if (message.includes("AFFILIATE_NOT_ACTIVE")) return res.status(403).json({ error: "Affiliate account is not active." });
          if (message.includes("PAYOUT_METHOD_REQUIRED")) return res.status(409).json({ error: "Add a payout method before requesting payment." });
          if (message.includes("PAYOUT_ALREADY_PENDING")) return res.status(409).json({ error: "A payout request is already pending." });
          if (message.includes("PAYOUT_MINIMUM_NOT_MET")) return res.status(400).json({ error: "Your available earnings have not reached the payout minimum." });
          throw error;
        }

        const payout = Array.isArray(data) ? data[0] : data;
        return res.json({
          success: true,
          payoutId: payout?.payout_id || null,
          amount: Number(payout?.amount || 0),
        });
      } catch (error: any) {
        console.error("Affiliate payout request failed:", error?.message || error);
        return res.status(500).json({ error: "Payout request could not be completed." });
      }
    },
  );

  // STRIPE CONNECT ROUTES (Single Click Integration)
  app.get(
    "/api/stripe/connect/:businessId",
    authenticate,
    async (req: any, res) => {
      const { businessId } = req.params;
      const clientId =
        (platformSettings?.stripeConnectClientId?.trim() || "") ||
        (process.env.STRIPE_CONNECT_CLIENT_ID?.trim() || "");

      if (!clientId || clientId.startsWith("TODO") || clientId === "") {
        return res.status(400).json({
          error: "Stripe Connect is not configured on this platform. Super Admins must set the 'Connect Client ID' in Platform Settings.",
          isConfigError: true
        });
      }

      const platformSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!platformSecretKey || !platformSecretKey.startsWith("sk_")) {
         return res.status(400).json({
          error: "Platform Stripe Secret Key is not configured. Connect integration requires a valid platform secret key.",
          isConfigError: true
        });
      }

      try {
        await assertBusinessAdminAccess(req.user.id, businessId);
      } catch (err: any) {
        return handleAccessError(res, err);
      }

      const state = signStatePayload({
        businessId,
        userId: req.user.id,
        createdAt: Date.now(),
      });
      const redirectUri = `${publicAppUrl()}/api/stripe/callback`;

      const stripeUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&state=${state}&redirect_uri=${redirectUri}`;

      res.json({ url: stripeUrl });
    },
  );

  app.get("/api/stripe/callback", async (req: any, res) => {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect("/dashboard/settings?error=missing_parameters");
    }

    try {
      const decodedState = verifyStatePayload(state as string);
      const { businessId, userId } = decodedState;
      await assertBusinessAdminAccess(userId, businessId);

      const stripe = await getStripe();
      const response = await stripe.oauth.token({
        grant_type: "authorization_code",
        code: code as string,
      });

      const connectedAccountId = response.stripe_user_id;

      if (connectedAccountId) {
        // Use supabaseAdmin to bypass RLS for this update
        await supabaseAdmin
          .from("businesses")
          .update({
            stripe_connected_account_id: connectedAccountId,
            // Clear manual keys if they exist to prefer Connect
            stripe_secret_key: null,
            stripe_publishable_key: null,
          })
          .eq("id", businessId);

        res.redirect("/dashboard/settings?success=stripe_connected");
      } else {
        res.redirect("/dashboard/settings?error=connection_failed");
      }
    } catch (error: any) {
      console.error("Stripe Connect error:", error);
      res.redirect(
        `/dashboard/settings?error=${encodeURIComponent(error.message)}`,
      );
    }
  });

  // LEAD WEBHOOK: Receives leads from approved external sources
  app.post(
    "/api/webhooks/leads",
    rateLimit({ windowMs: 60 * 1000, max: 120, keyPrefix: "lead-webhook" }),
    async (req: any, res) => {
    const apiKey = req.headers["x-api-key"] as string;
    
    if (!apiKey) {
      return res.status(401).json({ error: "Missing X-API-Key header" });
    }

    try {
      const webhookLeadBody = validateBody(
        z.object({
          name: TEXT_SCHEMA,
          email: EMAIL_SCHEMA,
          phone: z.string().trim().max(80).optional().nullable(),
          message: OPTIONAL_TEXT_SCHEMA,
          source: z.string().trim().max(80).optional().nullable(),
          metadata: z.record(z.string(), z.any()).optional(),
        }),
        req,
        res,
      );
      if (!webhookLeadBody) return;

      const { name, email, phone, message, source, metadata } = webhookLeadBody;

      const prefix = apiKey.split('.')[0];
      
      const { data: keyRecord, error: keyError } = await supabaseAdmin
        .from("api_keys")
        .select("business_id, key_hash, is_active")
        .eq("key_prefix", prefix)
        .eq("is_active", true)
        .single();
      
      if (keyError || !keyRecord) {
        return res.status(401).json({ error: "Invalid or inactive API key" });
      }

      const incomingHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      if (keyRecord.key_hash !== incomingHash) {
         return res.status(401).json({ error: "Integrity check failed" });
      }

      const businessId = keyRecord.business_id;

      // 2. Insert Lead
      const { data: lead, error: leadError } = await supabaseAdmin
        .from("leads")
        .insert({
          business_id: businessId,
          full_name: name,
          email: email,
          phone_number: phone || null,
          message: message || "Lead from external integration",
          source: source || "External Webhook",
          status: "new",
          metadata: {
            ...(metadata || {}),
            webhook_received_at: new Date().toISOString(),
            user_agent: req.headers['user-agent']
          }
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // Update last used timestamp
      await supabaseAdmin
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("key_prefix", prefix);

      res.status(201).json({ 
        success: true, 
        message: "Lead synchronized successfully",
        lead_id: lead.id
      });

    } catch (error: any) {
      console.error("Lead Webhook Error:", error);
      res.status(500).json({ error: "Failed to process lead synchronization" });
    }
  });

  app.get("/api/custom-domain/resolve", async (req: any, res) => {
    try {
      const host = normalizeDomainInput(String(req.query.host || req.headers.host || ""));
      const tenant = classifyTenantHost(host);
      if (tenant.kind === "platform" || host.endsWith(".vercel.app")) {
        return res.status(404).json({ error: "Domain not found.", code: "DOMAIN_NOT_FOUND" });
      }

      if (tenant.kind === "custom_domain" && !isValidCustomDomain(host)) {
        return res.status(404).json({ error: "Domain not found.", code: "DOMAIN_NOT_FOUND" });
      }

      const businessSelect = "id, name, subdomain, custom_domain, custom_domain_status, custom_domain_verified_at, custom_domain_suspended, custom_domain_permission_confirmed, ssl_status, status, subscription_status, subscription_grace_until, trial_ends_at";
      const query = supabaseAdmin.from("businesses").select(businessSelect);
      const { data: businesses, error: businessError } =
        tenant.kind === "subdomain"
          ? await query.eq("subdomain", tenant.subdomain).limit(1)
          : await query.in("custom_domain", tenant.candidates).limit(3);

      if (businessError) throw businessError;

      const business =
        tenant.kind === "custom_domain"
          ? (businesses || []).find((item: any) => tenant.candidates.includes(normalizeDomainInput(item.custom_domain || "")))
          : businesses?.[0];

      if (!business) {
        return res.status(404).json({ error: "Domain not found.", code: "DOMAIN_NOT_FOUND" });
      }

      const publicDomainFailure = (status: number, code: string, publicMessage: string, diagnostics: Record<string, any> = {}) => {
        console.warn("Custom domain resolve blocked:", {
          code,
          host,
          tenantKind: tenant.kind,
          businessId: business.id,
          customDomainStatus: business.custom_domain_status,
          sslStatus: business.ssl_status,
          businessStatus: business.status,
          subscriptionStatus: business.subscription_status,
          ...diagnostics,
        });
        return res.status(status).json({ error: publicMessage, code });
      };

      if (business.status !== "active") {
        return publicDomainFailure(403, business.status === "suspended" ? "BUSINESS_SUSPENDED" : "BUSINESS_INACTIVE", "This website is not available.");
      }

      const subscriptionStatus = String(business.subscription_status || "").toLowerCase();
      const graceUntil = business.subscription_grace_until ? new Date(business.subscription_grace_until).getTime() : 0;
      const trialEnd = business.trial_ends_at ? new Date(business.trial_ends_at).getTime() : 0;
      const trialActive = subscriptionStatus === "trialing" && trialEnd > Date.now();
      const subscriptionAllowed = subscriptionStatus === "active" || trialActive || (graceUntil > Date.now() && ["past_due", "trialing", "grace"].includes(subscriptionStatus));
      if (!subscriptionAllowed) {
        return publicDomainFailure(402, "SUBSCRIPTION_INACTIVE", "This website is not available.");
      }

      if (tenant.kind === "custom_domain") {
        if (business.custom_domain_suspended) {
          return publicDomainFailure(403, "DOMAIN_SUSPENDED", "This domain is not available.");
        }

        if (!business.custom_domain_permission_confirmed) {
          return publicDomainFailure(403, "DOMAIN_PERMISSION_REQUIRED", "This domain is not available.");
        }

        if (business.custom_domain_status !== "connected" || !business.custom_domain_verified_at) {
          return publicDomainFailure(409, "DOMAIN_NOT_VERIFIED", "This domain is not verified yet.");
        }

        if (business.ssl_status !== "issued") {
          return publicDomainFailure(409, "SSL_PENDING", "SSL is still being prepared for this domain.");
        }
      }

      const { data: website, error: websiteError } = await supabaseAdmin
        .from("websites")
        .select("id, business_id, status")
        .eq("business_id", business.id)
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (websiteError) throw websiteError;
      if (!website) {
        return publicDomainFailure(404, "WEBSITE_NOT_PUBLISHED", "This domain is not connected to a published website yet.");
      }
      if (website.business_id !== business.id) {
        return publicDomainFailure(409, "WEBSITE_BUSINESS_MISMATCH", "This domain is not available.");
      }

      res.json({
        businessId: business.id,
        businessName: business.name,
        websiteId: website.id,
        tenantKind: tenant.kind,
        status: business.custom_domain_status || "connected",
      });
    } catch (error: any) {
      console.error("Custom domain resolve error:", error);
      res.status(500).json({ error: "Failed to resolve custom domain" });
    }
  });

  app.post("/api/custom-domain/verify", authenticate, async (req: any, res) => {
    const body = validateBody(
      z.object({
        businessId: z.string().uuid(),
        domain: z.string().trim().min(4).max(253),
      }),
      req,
      res,
    );
    if (!body) return;

    const domain = normalizeDomainInput(body.domain);
    if (!isValidCustomDomain(domain)) {
      return res.status(400).json({
        error: "Enter a valid custom domain, such as example.com or www.example.com.",
      });
    }

    try {
      await assertBusinessAdminAccess(req.user.id, body.businessId, ["delivery"]);

      const candidates = getDomainLookupCandidates(domain);
      const { data: existingBusinesses, error: existingError } = await supabaseAdmin
        .from("businesses")
        .select("id, custom_domain")
        .in("custom_domain", candidates);

      if (existingError) throw existingError;

      const conflict = (existingBusinesses || []).find(
        (item: any) => item.id !== body.businessId && candidates.includes(normalizeDomainInput(item.custom_domain || "")),
      );
      if (conflict) {
        return res.status(409).json({
          error: "This domain is already connected to another business.",
        });
      }

      const vercelDomain = await ensureVercelProjectDomain(domain).catch((error: any) => ({
        configured: isVercelDomainsConfigured(),
        error: error?.message || "Vercel domain sync failed",
        status: error?.status || 500,
        instructions: getVercelDnsInstructions(domain),
      }));
      const dnsResult = await checkDomainDns(domain);
      const sslIssued = dnsResult.dnsDetected ? await checkHttpsIssued(domain) : false;
      const customDomainStatus = !dnsResult.dnsDetected
        ? "dns_pending"
        : sslIssued
          ? "connected"
          : "ssl_pending";
      const sslStatus = !dnsResult.dnsDetected ? "not_connected" : sslIssued ? "issued" : "pending";
      const now = new Date().toISOString();
      const customDomainError =
        (vercelDomain as any)?.error ||
        dnsResult.error ||
        (!dnsResult.dnsDetected
          ? "DNS record not detected yet. Update your DNS records and check again."
          : !sslIssued
            ? "DNS was detected. SSL may still be issuing or the domain may need hosting approval."
            : null);

      const { data: updatedBusiness, error: updateError } = await supabaseAdmin
        .from("businesses")
        .update({
          custom_domain: domain,
          custom_domain_status: customDomainStatus,
          custom_domain_permission_confirmed: true,
          custom_domain_suspended: false,
          custom_domain_verified_at: customDomainStatus === "connected" ? now : null,
          custom_domain_last_checked_at: now,
          custom_domain_error: customDomainError,
          ssl_status: sslStatus,
          ssl_checked_at: now,
          domain_dns_records: dnsResult.records,
        })
        .eq("id", body.businessId)
        .select("custom_domain, custom_domain_status, custom_domain_verified_at, custom_domain_last_checked_at, custom_domain_error, ssl_status, ssl_checked_at, domain_dns_records")
        .single();

      if (updateError) throw updateError;

      res.json({
        success: true,
        customDomain: updatedBusiness.custom_domain,
        customDomainStatus: updatedBusiness.custom_domain_status,
        customDomainVerifiedAt: updatedBusiness.custom_domain_verified_at,
        customDomainLastCheckedAt: updatedBusiness.custom_domain_last_checked_at,
        customDomainError: updatedBusiness.custom_domain_error,
        sslStatus: updatedBusiness.ssl_status,
        sslCheckedAt: updatedBusiness.ssl_checked_at,
        domainDnsRecords: updatedBusiness.domain_dns_records || [],
        vercelDomain,
      });
    } catch (error: any) {
      console.error("Custom domain verify error:", error);
      if (
        error?.message === "BUSINESS_ID_REQUIRED" ||
        error?.message === "BUSINESS_NOT_FOUND" ||
        error?.message === "PROFILE_NOT_FOUND" ||
        error?.message === "FORBIDDEN_BUSINESS_ACCESS"
      ) {
        return handleAccessError(res, error);
      }
      res.status(500).json({
        error:
          error?.message?.includes("custom_domain_status") ||
          error?.message?.includes("domain_dns_records")
            ? "Apply the latest Supabase migration before using custom domain checks."
            : safeErrorMessage(error),
      });
    }
  });

  app.delete("/api/custom-domain/vercel", authenticate, async (req: any, res) => {
    const body = validateBody(
      z.object({
        businessId: z.string().uuid(),
        domain: z.string().trim().min(4).max(253),
      }),
      req,
      res,
    );
    if (!body) return;

    const domain = normalizeDomainInput(body.domain);
    if (!isValidCustomDomain(domain)) {
      return res.status(400).json({ error: "Enter a valid custom domain." });
    }

    try {
      await assertBusinessAdminAccess(req.user.id, body.businessId, ["delivery"]);
      if (isVercelDomainsConfigured()) {
        await removeVercelProjectDomain(domain).catch((error: any) => {
          if (Number(error?.status) !== 404) throw error;
        });
      }
      const { error: updateError } = await supabaseAdmin
        .from("businesses")
        .update({
          custom_domain: null,
          custom_domain_status: "not_connected",
          custom_domain_permission_confirmed: false,
          custom_domain_verified_at: null,
          custom_domain_last_checked_at: new Date().toISOString(),
          custom_domain_error: null,
          ssl_status: "not_connected",
          ssl_checked_at: new Date().toISOString(),
          domain_dns_records: [],
        })
        .eq("id", body.businessId);
      if (updateError) throw updateError;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Custom domain Vercel removal error:", error);
      if (
        error?.message === "BUSINESS_ID_REQUIRED" ||
        error?.message === "BUSINESS_NOT_FOUND" ||
        error?.message === "PROFILE_NOT_FOUND" ||
        error?.message === "FORBIDDEN_BUSINESS_ACCESS"
      ) {
        return handleAccessError(res, error);
      }
      res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  // API 404 Catch-all (to prevent HTML responses for API errors)
  app.all("/api/*", (req, res, next) => {
    // If we've reached here, no other /api route matched
    res.status(404).json({
      error: "API endpoint not found",
      method: req.method,
      path: req.path,
    });
  });

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    captureServerError(err, {
      requestId: req.requestId || "unknown",
      method: req.method,
      path: req.originalUrl?.split("?")[0] || req.path,
      statusCode: err.status || err.statusCode || 500,
    });

    // If headers already sent, delegate to default express error handler
    if (res.headersSent) {
      return next(err);
    }

    const status = err.status || err.statusCode || 500;
    const isPortfolioLead = req.path === "/api/portfolio-leads";
    if (isPortfolioLead && (err.type === "entity.parse.failed" || status === 413)) {
      return res.status(status === 413 ? 400 : 400).json({ error: status === 413 ? "Request body is too large" : "Malformed JSON body" });
    }
    res.status(status).json({
      error: status >= 500 ? "Internal Server Error" : err.name || "Request Error",
      message: process.env.NODE_ENV === "development" ? err.message || "An unexpected error occurred on the server." : status >= 500 ? "The request could not be completed. Please retry or contact support with the request ID." : safeErrorMessage(err),
      requestId: req.requestId || null,
      ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // On Vercel, static files are handled by the platform via rewrites in vercel.json
    // But we keep this for other production environments (like Cloud Run)
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Only listen if not on Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, HOST, () => {
      const displayHost = HOST === "0.0.0.0" ? "localhost" : HOST;
      structuredLog("info", "server_started", { host: displayHost, port: PORT });
    });
  }
}

// Initial start logic
startServer().catch(err => {
  captureServerError(err, { phase: "server_start" });
  process.exit(1);
});

// Export for Vercel
export default app;


// Vercel must leave webhook request streams untouched for signature verification.
export const config = { api: { bodyParser: false } };
