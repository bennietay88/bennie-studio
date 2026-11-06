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
import { z } from "zod";
import { Redis } from "@upstash/redis";
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
import { buildInboundLeadSnapshot } from "../server/leadGeneration.js";
import { buildPublicPreviewProfile, extractPreviewEvidenceUrls } from "../server/publicPreview.js";
import { attestImportedProspectConsent, canManageSalesOperations, isSalesSuppressed, normalizeSalesEmail, recordSalesDeliveryEvent, recordSalesReply, runSalesDelivery, salesRecordId, saveManualOutreach, saveSalesCallOutcome, sendDirectProspectOutreach, suppressSalesRecipient } from "../server/salesOperations.js";
import { buildProspectFollowUpPlan, bulkManageProspectFollowUps, scheduleProspectFollowUpPlan, syncProspectNextFollowUp } from "../server/prospectFollowUps.js";
import { attachUploaderOutreachDeclaration, parseProspectCsv } from "../src/lib/prospectImport.js";
import { hasDocumentedMarketingConsent } from "../src/lib/salesAutomation.js";
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
import { processDueFunnelWorkflowRuns, runFunnelAutomations } from "../server/funnelAutomation.js";
import { runFinalLaunchCrawler } from "../server/finalLaunchQa.js";
import { isNewIntroOfferCustomer } from "./introOfferEligibility.js";
import { resolveStripeCommercialPlan } from "../src/lib/stripeCommercialPlanMapping.js";

dotenv.config();
initServerObservability();

const COMMERCIAL_TERMS_VERSION = "2026.09.27";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const requiredEnv = {
  VITE_SUPABASE_URL: supabaseUrl,
  VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
  SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey,
};
const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value || value.includes("TODO"))
  .map(([key]) => key);

if (missingEnv.length > 0) {
  structuredLog("warn", "missing_required_server_env", { missingEnv });
}

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

if (!redis) {
  structuredLog("warn", "redis_rate_limit_unavailable", {
    message: "UPSTASH_REDIS_REST_URL/TOKEN not set; using in-memory rate limits.",
  });
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Admin client for server-side operations that should bypass RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
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
      if (resendKeyChanged) resendInstance = null;
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

let resendInstance: Resend | null = null;
function getResend() {
  // Production credentials belong in the deployment environment, never in CMS data.
  const key = process.env.RESEND_API_KEY;
  if (!key || key.trim() === "" || key.includes("TODO")) {
    throw new Error("RESEND_CONFIG_ERROR");
  }
  if (!resendInstance) {
    resendInstance = new Resend(key.trim());
  }
  return resendInstance;
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

type RateBucket = { count: number; resetAt: number };
const rateBuckets = new Map<string, RateBucket>();
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
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function rateLimit(options: {
  windowMs: number;
  max: number;
  keyPrefix: string;
  key?: (req: any) => string;
}) {
  return async (req: any, res: any, next: any) => {
    if (process.env.E2E_TEST === "true") return next();
    const now = Date.now();
    const key = `${options.keyPrefix}:${options.key ? options.key(req) : getClientIp(req)}`;
    const ttlSeconds = Math.ceil(options.windowMs / 1000);

    if (redis) {
      try {
        const redisKey = `rate:${key}`;
        const count = await redis.incr(redisKey);
        if (count === 1) {
          await redis.expire(redisKey, ttlSeconds);
        }

        if (count > options.max) {
          res.setHeader("Retry-After", ttlSeconds.toString());
          return res.status(429).json({ error: "Too many requests. Please try again later." });
        }

        return next();
      } catch (err) {
        console.error("[RateLimit] Redis error, falling back to memory:", err);
      }
    }

    const bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    bucket.count += 1;
    if (bucket.count > options.max) {
      res.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000).toString());
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }

    return next();
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
        return res.status(500).json({
          error: safeErrorMessage(error) || "Unable to terminate user",
        });
      }
    },
  );

  app.delete(
    "/api/admin/businesses/:businessId",
    authenticate,
    superAdminOnly,
    async (req: any, res: any) => {
      try {
        const businessId = String(req.params.businessId || "").trim();
        if (!businessId) return res.status(400).json({ error: "Business ID is required." });

        const { data: business, error: businessError } = await supabaseAdmin
          .from("businesses")
          .select("id,name,status,subscription_status")
          .eq("id", businessId)
          .maybeSingle();

        if (businessError) throw businessError;
        if (!business) return res.status(404).json({ error: "Business not found." });

        const confirmation = String(req.body?.confirmation || "").trim();
        if (!confirmation || confirmation !== String(business.name || "").trim()) {
          return res.status(400).json({ error: "Type the exact business name to confirm permanent deletion." });
        }

        const businessStatus = String(business.status || "").toLowerCase();
        const subscriptionStatus = String(business.subscription_status || "").toLowerCase();
        if (
          ["active", "trial", "trialing"].includes(businessStatus)
          || !subscriptionAllowsPermanentDeletion(subscriptionStatus)
        ) {
          return res.status(409).json({
            error: "This business still has an active or protected managed-service state. Deactivate/cancel it before permanent deletion.",
            businessStatus: business.status || null,
            subscriptionStatus: business.subscription_status || null,
          });
        }

        const { data: attachedProfiles, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("business_id", businessId);
        if (profileError) throw profileError;

        const profileIds = (attachedProfiles || []).map((profile: any) => profile.id).filter(Boolean);
        if (profileIds.length) {
          const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
            .from("user_subscriptions")
            .select("user_id,status,renewal_state")
            .in("user_id", profileIds);
          if (subscriptionsError) throw subscriptionsError;

          const protectedSubscription = (subscriptions || []).find(
            (subscription: any) => !subscriptionAllowsPermanentDeletion(subscription.status),
          );
          if (protectedSubscription) {
            return res.status(409).json({
              error: "A user attached to this business still has an active subscription. End that subscription before deleting the business.",
              subscriptionStatus: protectedSubscription.status || null,
              renewalState: protectedSubscription.renewal_state || null,
            });
          }

          const { error: detachError } = await supabaseAdmin
            .from("profiles")
            .update({ business_id: null })
            .eq("business_id", businessId);
          if (detachError) throw detachError;
        }

        const { error: deleteError } = await supabaseAdmin
          .from("businesses")
          .delete()
          .eq("id", businessId);
        if (deleteError) throw deleteError;

        const { error: auditError } = await supabaseAdmin
          .from("admin_action_audit_logs")
          .insert({
            actor_user_id: req.user.id,
            actor_email: req.user.email || null,
            action_type: "business.deleted",
            target_type: "business",
            target_id: businessId,
            target_label: business.name,
            metadata: {
              previousStatus: business.status || null,
              previousSubscriptionStatus: business.subscription_status || null,
              detachedProfiles: profileIds.length,
            },
          });
        if (auditError) console.warn("Business deletion audit log skipped:", auditError.message);

        return res.status(200).json({
          deleted: true,
          businessId,
          detachedProfiles: profileIds.length,
        });
      } catch (error: any) {
        console.error("[Admin Business Deletion] Failed:", error);
        return res.status(500).json({ error: safeErrorMessage(error) || "Unable to delete business" });
      }
    },
  );

  const stripeTimestampToIso = (value?: number | null) =>
    value ? new Date(value * 1000).toISOString() : null;

  const billingGraceUntil = (preferredUnix?: number | null) =>
    stripeTimestampToIso(preferredUnix) ||
    new Date(Date.now() + BILLING_GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const resolveBusinessForStripe = async (input: { subscriptionId?: string | null; customerId?: string | null }) => {
    const filters = [
      input.subscriptionId ? `stripe_subscription_id.eq.${input.subscriptionId}` : "",
      input.customerId ? `stripe_customer_id.eq.${input.customerId}` : "",
    ].filter(Boolean);
    if (!filters.length) return null;
    const { data, error } = await supabaseAdmin
      .from("businesses")
      .select("id, owner_id")
      .or(filters.join(","))
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as { id: string; owner_id?: string | null } | null;
  };

  const syncUserSubscriptionByStripe = async (input: {
    subscriptionId?: string | null;
    customerId?: string | null;
    status: string;
    planId?: string | null;
    commercialProductSlug?: string | null;
    commercialMarket?: string | null;
    contractStartDate?: string | null;
    minimumTermMonths?: number | null;
    renewalState?: string | null;
    lastPaymentStatus?: string | null;
    lastWebhookEventId?: string | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
  }) => {
    const filters = [
      input.subscriptionId ? `stripe_subscription_id.eq.${input.subscriptionId}` : "",
      input.customerId ? `stripe_customer_id.eq.${input.customerId}` : "",
    ].filter(Boolean);
    if (!filters.length) return null;

    const payload: Record<string, any> = { status: input.status };
    if (input.planId !== undefined) payload.plan_id = input.planId;
    if (input.currentPeriodStart) payload.current_period_start = input.currentPeriodStart;
    if (input.currentPeriodEnd) payload.current_period_end = input.currentPeriodEnd;
    if (input.commercialProductSlug !== undefined) payload.commercial_product_slug = input.commercialProductSlug;
    if (input.commercialMarket !== undefined) payload.commercial_market = input.commercialMarket;
    if (input.contractStartDate !== undefined) payload.contract_start_date = input.contractStartDate;
    if (input.minimumTermMonths !== undefined) {
      payload.minimum_term_months = input.minimumTermMonths;
      if (input.contractStartDate && input.minimumTermMonths) {
        const end = new Date(input.contractStartDate);
        end.setUTCMonth(end.getUTCMonth() + input.minimumTermMonths);
        payload.minimum_term_end_date = end.toISOString().slice(0, 10);
      }
    }
    if (input.renewalState !== undefined) payload.renewal_state = input.renewalState;
    if (input.lastPaymentStatus !== undefined) payload.last_payment_status = input.lastPaymentStatus;
    if (input.lastWebhookEventId !== undefined) payload.last_webhook_event_id = input.lastWebhookEventId;

    const { data, error } = await supabaseAdmin
      .from("user_subscriptions")
      .update(payload)
      .or(filters.join(","))
      .select("user_id");
    if (error) throw error;
    return (data?.[0] || null) as { user_id: string } | null;
  };

  const insertBillingLifecycleEvent = async (payload: Record<string, any>) => {
    const { error } = await supabaseAdmin.from("billing_lifecycle_events").insert(payload);
    if (error) console.warn("Billing lifecycle event skipped:", error.message);
  };

  const insertFinanceTransaction = async (payload: Record<string, any>) => {
    const { data: settings } = await supabaseAdmin.from("finance_settings").select("base_currency").eq("id", "platform").maybeSingle();
    const currency = String(payload.currency || "USD").toUpperCase();
    const baseCurrency = String(settings?.base_currency || "MYR").toUpperCase();
    const sameCurrency = currency === baseCurrency;
    const suppliedBaseAmount = payload.base_currency_amount == null ? null : Number(payload.base_currency_amount);
    const baseAmount = sameCurrency ? Number(payload.amount) : (Number.isFinite(suppliedBaseAmount) ? suppliedBaseAmount : null);
    const sourceType = String(payload.source_type || "");
    const sourceId = String(payload.source_id || "");
    if (sourceType && sourceId) {
      const { data: existing, error: lookupError } = await supabaseAdmin
        .from("finance_transactions")
        .select("id")
        .eq("source_type", sourceType)
        .eq("source_id", sourceId)
        .limit(1)
        .maybeSingle();
      if (lookupError) {
        console.warn("Finance transaction duplicate check skipped:", lookupError.message);
        return;
      }
      if (existing) return;
    }
    const { error } = await supabaseAdmin.from("finance_transactions").insert({
      ...payload,
      currency,
      base_currency: baseAmount == null ? null : baseCurrency,
      base_currency_amount: baseAmount,
      reconciliation_status: baseAmount == null ? "REVIEW_REQUIRED" : (payload.reconciliation_status || "UNRECONCILED"),
      review_status: baseAmount == null ? "REVIEW_REQUIRED" : (payload.review_status || "NOT_REVIEWED"),
      document_status: payload.document_status || "MISSING",
    });
    if (error) console.warn("Finance transaction skipped:", error.message);
  };

  // Reconciles cancellation requests that were made during the minimum term.
  // This is deliberately idempotent: every run re-reads Stripe before writing
  // the local state and treats an already-scheduled/cancelled subscription as
  // successfully reconciled.
  const processPendingCancellations = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const startedAt = new Date().toISOString();
    const { data: workerRun } = await supabaseAdmin.from("billing_worker_runs").insert({
      worker_name: "pending-cancellations", started_at: startedAt, status: "running",
    }).select("id").single();
    const { data: pending, error } = await supabaseAdmin
      .from("user_subscriptions")
      .select("id,user_id,status,minimum_term_end_date,renewal_state,cancel_at_period_end,stripe_subscription_id")
      .eq("renewal_state", "cancellation_requested")
      .lte("minimum_term_end_date", today)
      .in("status", ["active", "trialing", "past_due"])
      .not("stripe_subscription_id", "is", null)
      .limit(200);
    if (error) {
      if (workerRun?.id) await supabaseAdmin.from("billing_worker_runs").update({ status: "failed", completed_at: new Date().toISOString(), error_summary: error.message }).eq("id", workerRun.id);
      throw error;
    }

    const results: Array<Record<string, unknown>> = [];
    for (const subscription of pending || []) {
      try {
        const stripe = await getStripe();
        const current = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
        const now = new Date().toISOString();
        if (current.status === "canceled") {
          await supabaseAdmin.from("user_subscriptions").update({
            status: "canceled", renewal_state: "cancelled", cancel_at_period_end: true,
            cancellation_effective_at: now, last_stripe_sync_at: now,
          }).eq("id", subscription.id);
          try {
            const cancelledProfile = await getProfileForUser(subscription.user_id);
            if (cancelledProfile?.business_id) {
              await supabaseAdmin.from("businesses").update({
                subscription_status: "canceled",
                status: "inactive",
                managed_service_cancellation_effective_at: now,
                handover_grace_until: handoverGraceUntil(now),
              }).eq("id", cancelledProfile.business_id);
            }
          } catch (handoverError: any) {
            console.warn("Cancellation reconciliation could not update handover grace", {
              userId: subscription.user_id,
              error: handoverError?.message || handoverError,
            });
          }
          results.push({ id: subscription.id, state: "cancelled", reconciled: true });
          continue;
        }
        const scheduled = current.cancel_at_period_end
          ? current
          : await stripe.subscriptions.update(subscription.stripe_subscription_id, { cancel_at_period_end: true });
        if (!scheduled.cancel_at_period_end) throw new Error("STRIPE_CANCELLATION_NOT_CONFIRMED");
        await supabaseAdmin.from("user_subscriptions").update({
          renewal_state: "cancellation_scheduled", cancel_at_period_end: true,
          cancellation_scheduled_at: now, last_stripe_sync_at: now,
        }).eq("id", subscription.id);
        await insertBillingLifecycleEvent({
          business_id: null, event_type: "cancellation_scheduled", status: "resolved", source: "system",
          metadata: { subscriptionId: subscription.id, stripeSubscriptionId: subscription.stripe_subscription_id },
          resolved_at: now,
        });
        results.push({ id: subscription.id, state: "cancellation_scheduled" });
      } catch (workerError: any) {
        console.error("Pending cancellation reconciliation failed", { subscriptionId: subscription.id, error: workerError?.message });
        results.push({ id: subscription.id, state: "failed", error: "RETRYABLE_STRIPE_RECONCILIATION_FAILURE" });
      }
    }
    const failed = results.filter((result) => result.state === "failed").length;
    if (workerRun?.id) await supabaseAdmin.from("billing_worker_runs").update({
      status: failed ? "failed" : "completed", completed_at: new Date().toISOString(),
      scanned_count: pending?.length || 0, processed_count: results.length - failed, failed_count: failed,
      error_summary: failed ? "One or more subscriptions require retry" : null,
    }).eq("id", workerRun.id);
    return { processed: results.length, failed, results, workerRunId: workerRun?.id || null };
  };

  // Stripe Webhook - MUST be before express.json()
  app.post(
    "/api/webhook",
    express.raw({ type: "application/json" }),
    async (req: any, res: any) => {
      await refreshPlatformSettings();
      const sig = req.headers["stripe-signature"];
      const businessIdParam = req.query.businessId as string;

      // Keep live and sandbox signing secrets separate. The live/platform
      // secret remains the default; an explicitly configured test secret is
      // only tried as a fallback so sandbox events can be verified in an
      // isolated environment without weakening live webhook verification.
      const webhookSecrets = [
        platformSettings?.stripeWebhookSecret,
        process.env.STRIPE_WEBHOOK_SECRET,
        process.env.STRIPE_TEST_WEBHOOK_SECRET,
      ].filter((secret): secret is string => Boolean(secret));

      if (businessIdParam) {
        const { data: biz } = await supabaseAdmin
          .from("businesses")
          .select("stripe_webhook_secret")
          .eq("id", businessIdParam)
          .single();
        if (biz?.stripe_webhook_secret) {
          webhookSecrets.unshift(biz.stripe_webhook_secret);
        }
      }

      if (!sig || webhookSecrets.length === 0) {
        return res
          .status(400)
          .send("Webhook Error: Missing signature or secret");
      }

      let event;
      let verificationError: unknown = null;

      const stripe = await getStripe(businessIdParam);
      for (const secret of webhookSecrets) {
        try {
          event = stripe.webhooks.constructEvent(req.body, sig, secret);
          verificationError = null;
          break;
        } catch (err: any) {
          verificationError = err;
        }
      }

      if (!event) {
        const message = verificationError instanceof Error ? verificationError.message : "Invalid webhook signature";
        console.error(`[Stripe Webhook] Verification Failed: ${message}`);
        return res
          .status(400)
          .send(`Webhook Verification Error: ${message}`);
      }

      console.log(
        `[Stripe Webhook] Received event: ${event.type} (${event.id})`,
      );
      // Ownership is claimed in one database transaction. This prevents two
      // concurrent Stripe deliveries from both applying side effects.
      const { data: claimRows, error: claimError } = await supabaseAdmin.rpc("claim_stripe_webhook_event", {
        p_stripe_event_id: event.id,
        p_event_type: event.type,
        p_stale_after_seconds: 10 * 60,
      });
      const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows;
      if (claimError || !claim) {
        console.error("Stripe webhook idempotency claim failed", claimError);
        return res.status(503).json({ error: "Webhook processing temporarily unavailable" });
      }
      if (!claim.claimed) return res.json({ received: true, duplicate: true, reason: claim.reason });
      try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const businessId = session.metadata?.businessId;
          const proposalId = session.metadata?.proposalId;
          const type = session.metadata?.type;
          const publicOrder = session.metadata?.publicOrder === "1";
          const publicOrderId = session.metadata?.orderId;
          const publicLeadId = session.metadata?.leadId;
          const publicPreviewId = session.metadata?.previewId;

          if (publicOrder) {
            const paidAt = new Date().toISOString();
            if (publicOrderId && UUID_SCHEMA.safeParse(publicOrderId).success) {
              await supabaseAdmin.from("orders").update({
                status: "paid",
                stripe_session_id: session.id,
                customer_name: session.customer_details?.name || undefined,
                customer_email: session.customer_details?.email || session.customer_email || undefined,
                updated_at: paidAt,
              }).eq("id", publicOrderId);
            }
            if (publicLeadId && UUID_SCHEMA.safeParse(publicLeadId).success) {
              const { data: paidLead } = await supabaseAdmin
                .from("leads")
                .select("raw_fields")
                .eq("id", publicLeadId)
                .maybeSingle();
              await supabaseAdmin.from("leads").update({
                status: "won",
                automation_next_action: "Payment received — activate customer account and begin onboarding",
                next_follow_up_at: paidAt,
                raw_fields: {
                  ...(paidLead?.raw_fields || {}),
                  payment: {
                    stripeSessionId: session.id,
                    stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
                    stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
                    paidAt,
                    previewId: publicPreviewId || null,
                    orderId: publicOrderId || null,
                  },
                },
              }).eq("id", publicLeadId);
              await supabaseAdmin.from("sales_tasks").insert({
                lead_id: publicLeadId,
                title: "Activate paid preview customer",
                task_type: "onboarding",
                priority: "high",
                due_at: paidAt,
                metadata: {
                  businessId: businessId || null,
                  previewId: publicPreviewId || null,
                  orderId: publicOrderId || null,
                  stripeSessionId: session.id,
                },
              }).then(({ error }) => {
                if (error) console.warn("Paid preview onboarding task skipped:", error.message);
              });
            }
          }

          if (proposalId && UUID_SCHEMA.safeParse(proposalId).success) {
            const paidAt = new Date().toISOString();
            const { data: currentProposal } = await supabaseAdmin.from("proposals").select("config").eq("id", proposalId).maybeSingle();
            const payment = {
              stripeSessionId: session.id,
              stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
              stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
              paidAt,
            };
            const { data: paidProposal } = await supabaseAdmin.from("proposals").update({
              status: "Accepted",
              accepted_at: paidAt,
              accepted_email: session.customer_details?.email || session.customer_email || undefined,
              updated_at: paidAt,
              config: { ...(currentProposal?.config || {}), payment },
            }).eq("id", proposalId).select("id,lead_id,business_id,config").maybeSingle();
            if (paidProposal?.business_id) {
              await supabaseAdmin.from("businesses").update({
                plan: paidProposal.config?.planId || "website_growth_partner",
                subscription_status: "active",
                stripe_customer_id: payment.stripeCustomerId,
                stripe_subscription_id: payment.stripeSubscriptionId,
              }).eq("id", paidProposal.business_id);
            }
            if (paidProposal?.lead_id) await supabaseAdmin.from("leads").update({ status: "won", automation_next_action: "Begin onboarding and collect website content", next_follow_up_at: paidAt }).eq("id", paidProposal.lead_id);
            await supabaseAdmin.from("proposal_events").insert({ proposal_id: proposalId, event_type: "paid", session_id: session.id, metadata: { amountTotal: session.amount_total, currency: session.currency } });
            await supabaseAdmin.from("sales_tasks").insert({ lead_id: paidProposal?.lead_id || null, proposal_id: proposalId, title: "Start onboarding for paid proposal", task_type: "onboarding", priority: "high", due_at: paidAt, metadata: { stripeSessionId: session.id } });
          }

          if (businessId) {
            console.log(
              `Processing successful checkout for business: ${businessId} (Type: ${type || "subscription"})`,
            );

            let stripePaymentFacts: any = {};
            try {
              const paymentStripe = await getStripe(businessId);
              const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
              if (paymentIntentId) {
                const paymentIntent = await paymentStripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge.balance_transaction"] });
                const latestCharge: any = typeof paymentIntent.latest_charge === "object" ? paymentIntent.latest_charge : null;
                const balanceTransaction: any = latestCharge && typeof latestCharge.balance_transaction === "object" ? latestCharge.balance_transaction : null;
                stripePaymentFacts = {
                  stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
                  stripePaymentIntentId: paymentIntent.id,
                  stripeChargeId: latestCharge?.id || null,
                  stripeBalanceTransactionId: balanceTransaction?.id || null,
                  stripeFeeAmount: balanceTransaction?.fee != null ? Number(balanceTransaction.fee) / 100 : null,
                  stripeFeeCurrency: balanceTransaction?.fee_currency || balanceTransaction?.currency || null,
                  stripeExchangeRate: balanceTransaction?.exchange_rate || null,
                  settlementCurrency: balanceTransaction?.currency || null,
                  netAmount: balanceTransaction?.net != null ? Number(balanceTransaction.net) / 100 : Number(session.amount_total || 0) / 100,
                };
              }
            } catch (paymentLookupError) {
              console.warn("Stripe settlement detail lookup failed:", paymentLookupError);
            }

            await insertFinanceTransaction({
              business_id: businessId,
              source_type: "STRIPE_PAYMENT",
              source_id: session.id,
              source_event_id: event.id,
              stripe_customer_id: stripePaymentFacts.stripeCustomerId || (typeof session.customer === "string" ? session.customer : null),
              stripe_payment_intent_id: stripePaymentFacts.stripePaymentIntentId || (typeof session.payment_intent === "string" ? session.payment_intent : null),
              stripe_charge_id: stripePaymentFacts.stripeChargeId || null,
              stripe_balance_transaction_id: stripePaymentFacts.stripeBalanceTransactionId || null,
              stripe_fee_amount: stripePaymentFacts.stripeFeeAmount,
              stripe_fee_currency: stripePaymentFacts.stripeFeeCurrency,
              stripe_exchange_rate: stripePaymentFacts.stripeExchangeRate,
              settlement_currency: stripePaymentFacts.settlementCurrency,
              transaction_type: "income",
              transaction_date: new Date((session.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
              posted_date: new Date().toISOString(),
              description: `Stripe checkout ${type || "subscription"}`,
              counterparty: session.customer_details?.email || session.customer_email || null,
              country: session.customer_details?.address?.country || null,
              currency: session.currency || "USD",
              amount: Number(session.amount_total || 0) / 100,
              payment_method: "stripe_checkout",
              payment_processor: "stripe",
              net_amount: stripePaymentFacts.netAmount ?? Number(session.amount_total || 0) / 100,
              status: "posted",
              category: type === "one_time_package" ? "Website services" : type === "funnel_sale" ? "Funnel revenue" : "Subscription revenue",
              metadata: { stripeSessionId: session.id, checkoutType: type || "subscription" },
            });

            try {
              const stripe = ["product_sale", "funnel_sale"].includes(type || "") ? await getStripe(businessId) : await getStripe();

              if (type === "funnel_sale") {
                const funnelId = session.metadata?.funnelId;
                const funnelStepId = session.metadata?.funnelStepId;
                const funnelSessionId = session.metadata?.funnelSessionId;
                const offerId = session.metadata?.offerId;
                let funnelLeadId = session.metadata?.leadId || null;
                if (funnelSessionId && UUID_SCHEMA.safeParse(funnelSessionId).success) {
                  const { data: funnelSession } = await supabaseAdmin
                    .from("funnel_sessions")
                    .select("lead_id")
                    .eq("id", funnelSessionId)
                    .maybeSingle();
                  funnelLeadId = funnelLeadId || funnelSession?.lead_id || null;
                }
                if (funnelId && UUID_SCHEMA.safeParse(funnelId).success) {
                  await supabaseAdmin.from("funnel_events").insert({
                    business_id: businessId,
                    funnel_id: funnelId,
                    step_id: funnelStepId && UUID_SCHEMA.safeParse(funnelStepId).success ? funnelStepId : null,
                    session_id: funnelSessionId && UUID_SCHEMA.safeParse(funnelSessionId).success ? funnelSessionId : null,
                    lead_id: funnelLeadId && UUID_SCHEMA.safeParse(funnelLeadId).success ? funnelLeadId : null,
                    event_type: "purchase_completed",
                    revenue: Number(session.amount_total || 0) / 100,
                    currency: String(session.currency || "usd").toUpperCase(),
                    metadata: { stripeSessionId: session.id, offerId: offerId || null },
                  });
                  if (funnelLeadId && UUID_SCHEMA.safeParse(funnelLeadId).success) {
                    await supabaseAdmin.from("leads").update({
                      status: "won",
                      automation_next_action: "Funnel purchase completed — deliver the purchased offer",
                      next_follow_up_at: new Date().toISOString(),
                    }).eq("id", funnelLeadId);
                  }
                  void runFunnelAutomations({
                    db: supabaseAdmin,
                    sendEmail: sendFunnelEmail,
                    businessId,
                    funnelId,
                    triggerEvent: "purchase_completed",
                    leadId: funnelLeadId && UUID_SCHEMA.safeParse(funnelLeadId).success ? funnelLeadId : null,
                    sessionId: funnelSessionId && UUID_SCHEMA.safeParse(funnelSessionId).success ? funnelSessionId : null,
                    context: {
                      email: session.customer_details?.email || session.customer_email || null,
                      amount: Number(session.amount_total || 0) / 100,
                      currency: String(session.currency || "usd").toUpperCase(),
                      offerId: offerId || null,
                    },
                  }).catch((automationError) => console.warn("Purchase funnel automation failed:", safeErrorMessage(automationError)));
                }
              } else if (type === "product_sale") {
                const orderId = session.metadata?.orderId;
                if (orderId) {
                  await supabaseAdmin
                    .from("orders")
                    .update({
                      status: "paid",
                      stripe_session_id: session.id,
                      customer_name:
                        session.customer_details?.name || "Customer",
                      customer_email: session.customer_details?.email || "",
                    })
                    .eq("id", orderId);
                  console.log(`Order ${orderId} marked as paid`);
                }
              } else if (type === "one_time_package") {
                // One-time website packages activate the customer's entitlement
                // without attempting to retrieve a subscription that does not exist.
                const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
                const priceId = lineItems.data[0]?.price?.id;
                const { data: paidPrice } = await supabaseAdmin
                  .from("commercial_market_prices")
                  .select("product_id,market,currency,monthly_price,billing_interval,stripe_one_time_price_id")
                  .eq("stripe_one_time_price_id", priceId)
                  .maybeSingle();
                const { data: paidProduct } = paidPrice?.product_id
                  ? await supabaseAdmin.from("commercial_products").select("slug,entitlement_plan_slug").eq("id", paidPrice.product_id).maybeSingle()
                  : { data: null };
                const packageSlug = paidProduct?.entitlement_plan_slug || paidProduct?.slug || session.metadata?.productSlug || "managed-website";
                await supabaseAdmin.from("businesses").update({
                  plan: packageSlug,
                  subscription_status: "active",
                  stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
                  stripe_subscription_id: null,
                }).eq("id", businessId);
                await supabaseAdmin.from("billing_history").insert({
                  business_id: businessId,
                  amount: (session.amount_total || 0) / 100,
                  currency: session.currency || "myr",
                  description: `${paidProduct?.slug || "Website"} one-time package`,
                  status: "paid",
                  stripe_invoice_id: session.id,
                });
              } else if (type === "credits") {
                // Handle one-time credit purchase
                const lineItems = await stripe.checkout.sessions.listLineItems(
                  session.id,
                );
                const priceId = lineItems.data[0]?.price?.id;

                // We'll search for credit pack definitions in metadata or price description
                // But for robustness, we'll check the platform settings for bundle mappings
                const { data: creditBundlesData } = await supabase
                  .from("settings")
                  .select("content")
                  .eq("id", "credit_bundles")
                  .maybeSingle();
                const bundles = creditBundlesData?.content?.bundles || [];
                const bundle = bundles.find((b: any) => b.priceId === priceId);

                const creditsToAdd =
                  bundle?.amount || parseInt(session.metadata?.credits || "0");

                if (creditsToAdd > 0) {
                  // Fetch current credits
                  const { data: biz } = await supabase
                    .from("businesses")
                    .select("ai_credits")
                    .eq("id", businessId)
                    .single();
                  await supabase
                    .from("businesses")
                    .update({
                      ai_credits: (biz?.ai_credits || 0) + creditsToAdd,
                    })
                    .eq("id", businessId);

                  console.log(
                    `Successfully added ${creditsToAdd} credits to business ${businessId}`,
                  );

                  // Track in billing history
                  await supabase.from("billing_history").insert({
                    business_id: businessId,
                    amount: session.amount_total! / 100,
                    currency: session.currency || "usd",
                    description: `Credit Top-up: ${creditsToAdd} Credits`,
                    status: "paid",
                    stripe_invoice_id: session.id, // This is a session but we use it as ref
                  });
                }
              } else {
                // Existing Subscription logic
                const { data: plansData } = await supabaseAdmin
                  .from("plans")
                  .select("*");
                const plans = plansData || [];

                const lineItems = await stripe.checkout.sessions.listLineItems(
                  session.id,
                );
                const priceId = lineItems.data[0]?.price?.id;
                
                const requestedPlanSlug = String(session.metadata?.planId || "").toLowerCase();
                const requestedProductSlug = String(session.metadata?.productSlug || "").toLowerCase();
                const { data: priceMatch } = await supabaseAdmin
                  .from("commercial_market_prices")
                  .select("product_id,market,currency,monthly_price,annual_price")
                  .or(`stripe_monthly_price_id.eq.${priceId},stripe_annual_price_id.eq.${priceId},recurring_stripe_monthly_price_id.eq.${priceId},recurring_stripe_annual_price_id.eq.${priceId},recurring_stripe_setup_price_id.eq.${priceId}`)
                  .maybeSingle();
                let currentProduct: any = null;
                if (priceMatch?.product_id) {
                  const { data } = await supabaseAdmin
                    .from("commercial_products")
                    .select("id,slug,entitlement_plan_slug")
                    .eq("id", priceMatch.product_id)
                    .eq("active", true)
                    .maybeSingle();
                  currentProduct = data;
                } else if (requestedProductSlug) {
                  // New commercial checkouts use inline Stripe prices, so their
                  // price IDs are not present in commercial_market_prices.
                  // productSlug is set by this server when creating the session.
                  const { data } = await supabaseAdmin
                    .from("commercial_products")
                    .select("id,slug,entitlement_plan_slug")
                    .eq("slug", requestedProductSlug)
                    .eq("active", true)
                    .maybeSingle();
                  currentProduct = data;
                }
                let currentPrice: any = priceMatch;
                if (!currentPrice && currentProduct?.id && session.metadata?.market) {
                  const { data } = await supabaseAdmin
                    .from("commercial_market_prices")
                    .select("product_id,market,currency,monthly_price,annual_price")
                    .eq("product_id", currentProduct.id)
                    .eq("market", session.metadata.market)
                    .maybeSingle();
                  currentPrice = data;
                }
                const plan = resolveStripeCommercialPlan(
                  plans,
                  priceId,
                  requestedPlanSlug,
                  currentProduct?.entitlement_plan_slug,
                );
                const planSlug = currentProduct?.entitlement_plan_slug || plan?.slug || requestedPlanSlug;
                const planId = plan?.id;

                if (!planSlug || (!plan && !currentProduct)) {
                  throw new Error(`Unable to map paid Stripe price ${priceId || "unknown"} to an active plan`);
                }

                const subscription = (await stripe.subscriptions.retrieve(
                  session.subscription as string,
                )) as any;

                // Keep the commercial funnel observable from the server-side
                // confirmation point. New products are paid from day one;
                // legacy trial subscriptions are still recorded accurately.
                await supabaseAdmin.from("tracking_events").insert({
                  event_type: subscription.status === "trialing" ? "trial_started" : "paid",
                  source_platform: "stripe",
                  source_page: "/checkout/success",
                  metadata: {
                    businessId,
                    productSlug: currentProduct?.slug || requestedProductSlug || null,
                    subscriptionStatus: subscription.status,
                    stripeSessionId: session.id,
                  },
                });

                // 1. Activate the pending business created by public checkout.
                // A checkout can outlive its pending row (for example, after an
                // account cleanup). Verify the update matched a row; restore it
                // from server-owned Stripe metadata before creating FK children.
                const activatedAt = new Date().toISOString();
                const businessActivation = {
                  stripe_customer_id: session.customer as string,
                  stripe_subscription_id: session.subscription as string,
                  subscription_status: subscription.status,
                  status: "active",
                  plan: planSlug,
                  commercial_product_slug: currentProduct?.slug || requestedProductSlug || null,
                  commercial_market: currentPrice?.market || session.metadata?.market || null,
                  commercial_currency: currentPrice?.currency || session.metadata?.currency || null,
                  commercial_term_months: session.metadata?.termMonths ? Number(session.metadata.termMonths) : null,
                  commercial_started_at: activatedAt,
                  ai_credits: plan?.monthly_credit_limit || 300
                };
                const { data: activatedBusiness, error: activationError } = await supabaseAdmin
                  .from("businesses")
                  .update(businessActivation)
                  .eq("id", businessId)
                  .select("id")
                  .maybeSingle();
                if (activationError) throw activationError;
                if (!activatedBusiness) {
                  const { error: restoreBusinessError } = await supabaseAdmin
                    .from("businesses")
                    .insert({
                      id: businessId,
                      name: "New Bennie Studio customer",
                      owner_id: null,
                      status: "active",
                      subscription_status: subscription.status,
                      plan: planSlug,
                      industry: "Professional Services",
                      business_nature: "Managed website customer awaiting account activation",
                      business_type: "local_service",
                      lifecycle_stage: "checkout",
                      lifecycle_stage_changed_at: activatedAt,
                      commercial_product_slug: currentProduct?.slug || requestedProductSlug || null,
                      commercial_market: currentPrice?.market || session.metadata?.market || null,
                      commercial_currency: currentPrice?.currency || session.metadata?.currency || null,
                      commercial_term_months: session.metadata?.termMonths ? Number(session.metadata.termMonths) : null,
                      stripe_customer_id: session.customer as string,
                      stripe_subscription_id: session.subscription as string,
                      commercial_started_at: activatedAt,
                      ai_credits: plan?.monthly_credit_limit || 300,
                      admin_notes: `Restored from confirmed Stripe checkout ${session.id}.`,
                    });
                  if (restoreBusinessError) throw restoreBusinessError;
                  console.warn(`Restored missing business ${businessId} from confirmed Stripe checkout`);
                }

                // Payment is the handoff boundary: create the first delivery
                // project exactly once so fulfilment can begin without a
                // manual database edit. The creation key makes webhook
                // retries safe even when Stripe delivers the event twice.
                const creationKey = `paid:${businessId}:${session.id}`;
                const { data: existingDeliveryProject } = await supabaseAdmin
                  .from("projects")
                  .select("id")
                  .eq("creation_key", creationKey)
                  .maybeSingle();
                if (!existingDeliveryProject) {
                  const { error: projectError } = await supabaseAdmin.from("projects").insert({
                    business_id: businessId,
                    type: "waas",
                    title: `${currentProduct?.slug || requestedProductSlug || "Managed Website"} delivery`,
                    package_name: planSlug,
                    status: "pending",
                    priority: "high",
                    creation_key: creationKey,
                    admin_notes: "Created automatically after confirmed Stripe checkout. Complete onboarding before build.",
                  });
                  if (projectError && projectError.code !== "23505") throw projectError;
                }
                await supabaseAdmin.from("businesses").update({
                  lifecycle_stage: "onboarding",
                  lifecycle_stage_changed_at: new Date().toISOString(),
                  onboarding_started_at: new Date().toISOString(),
                }).eq("id", businessId).is("onboarding_started_at", null);
                await supabaseAdmin.from("business_lifecycle_events").insert({
                  business_id: businessId,
                  to_stage: "onboarding",
                  from_stage: "checkout",
                  reason: "Stripe checkout confirmed",
                  metadata: { stripeSessionId: session.id, productSlug: currentProduct?.slug || requestedProductSlug || null },
                }).then(({ error: lifecycleError }) => {
                  if (lifecycleError) console.warn("Lifecycle event skipped:", lifecycleError.message);
                });

                if (session.metadata?.promotionId) {
                  const { data: promotionUsage } = await supabaseAdmin.from("commercial_promotions").select("usage_count").eq("id", session.metadata.promotionId).maybeSingle();
                  if (promotionUsage) await supabaseAdmin.from("commercial_promotions").update({ usage_count: Number(promotionUsage.usage_count || 0) + 1, updated_at: new Date().toISOString() }).eq("id", session.metadata.promotionId);
                }

                // 2. Sync New User Subscriptions Table
                const { data: businessInfo } = await supabaseAdmin
                  .from("businesses")
                  .select("owner_id")
                  .eq("id", businessId)
                  .single();

                if (businessInfo?.owner_id) {
                  const ownerId = businessInfo.owner_id;
                  
                  // Update or Insert Subscription
                  await supabaseAdmin
                    .from("user_subscriptions")
                    .upsert({
                      user_id: ownerId,
                      plan_id: planId,
                      stripe_customer_id: session.customer as string,
                      stripe_subscription_id: session.subscription as string,
                      status: subscription.status,
                      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                      commercial_product_slug: currentProduct?.slug || requestedProductSlug || null,
                      commercial_market: currentPrice?.market || session.metadata?.market || null,
                      contract_start_date: new Date().toISOString().slice(0, 10),
                      minimum_term_months: Number(session.metadata?.termMonths || COMMERCIAL_DEFAULT_COMMITMENT_MONTHS),
                      minimum_term_end_date: (() => { const d = new Date(); d.setUTCMonth(d.getUTCMonth() + Number(session.metadata?.termMonths || COMMERCIAL_DEFAULT_COMMITMENT_MONTHS)); return d.toISOString().slice(0, 10); })(),
                      renewal_state: "active",
                      last_payment_status: "paid",
                      last_webhook_event_id: event.id,
                    }, { onConflict: 'user_id' });

                  // 3. Initialize/Reset Credit Balance
                  const creditLimit = plan?.monthly_credit_limit || 300;
                  const { data: currentBalance } = await supabaseAdmin
                    .from("ai_credit_balances")
                    .select("*")
                    .eq("user_id", ownerId)
                    .maybeSingle();

                  if (currentBalance) {
                     // On new subscription, we might want to "top up" or reset
                     await supabaseAdmin
                      .from("ai_credit_balances")
                      .update({
                        monthly_credit_limit: creditLimit,
                        credits_remaining: creditLimit, // Reset for new plan
                        credits_used: 0,
                        reset_date: new Date(subscription.current_period_end * 1000).toISOString()
                      })
                      .eq("user_id", ownerId);
                  } else {
                    await supabaseAdmin
                      .from("ai_credit_balances")
                      .insert({
                        user_id: ownerId,
                        monthly_credit_limit: creditLimit,
                        credits_remaining: creditLimit,
                        credits_used: 0,
                        reset_date: new Date(subscription.current_period_end * 1000).toISOString()
                      });
                  }
                }

                console.log(
                  `Successfully updated business ${businessId} and user subscription to plan ${planSlug}`,
                );

                // Affiliate commission is resolved from server-owned attribution and
                // recorded atomically so webhook retries cannot double-credit.
                const { data: business } = await supabaseAdmin
                  .from("businesses")
                  .select("referred_by_affiliate_id,owner_id")
                  .eq("id", businessId)
                  .single();
                if (business?.referred_by_affiliate_id && session.amount_total) {
                  const { data: affiliate } = await supabaseAdmin
                    .from("affiliates")
                    .select("*")
                    .eq("id", business.referred_by_affiliate_id)
                    .in("status", ["active", "approved"])
                    .maybeSingle();

                  if (affiliate && affiliate.uid !== business.owner_id) {
                    const [{ data: affiliateProfile }, { data: program }] = await Promise.all([
                      supabaseAdmin.from("profiles").select("email").eq("id", affiliate.uid).maybeSingle(),
                      affiliate.business_id
                        ? supabaseAdmin.from("affiliate_programs").select("*,commission_tiers(*)").eq("business_id", affiliate.business_id).eq("is_enabled", true).maybeSingle()
                        : supabaseAdmin.from("affiliate_programs").select("*,commission_tiers(*)").eq("is_platform_program", true).eq("is_enabled", true).maybeSingle(),
                    ]);
                    const buyerEmail = String(session.customer_details?.email || session.customer_email || "").trim().toLowerCase();
                    const affiliateEmail = String(affiliateProfile?.email || "").trim().toLowerCase();
                    const isSelfReferral = Boolean(buyerEmail && affiliateEmail && buyerEmail === affiliateEmail);

                    if (program && !isSelfReferral) {
                      const tiers = [...(program.commission_tiers || [])].sort(
                        (a: any, b: any) =>
                          Number(b.requirement_value || 0) - Number(a.requirement_value || 0),
                      );
                      const activeTier =
                        tiers.find((tier: any) => {
                          const requirement = Number(tier.requirement_value || 0);
                          if (tier.requirement_type === "revenue_generated") {
                            return Number(affiliate.total_earnings || 0) >= requirement;
                          }
                          return Number(affiliate.total_referrals || 0) >= requirement;
                        }) || null;
                      const amountPaid = session.amount_total / 100;
                      const commissionType = activeTier?.commission_type || program.commission_type || "percentage";
                      const rate = Number(activeTier?.commission_rate ?? program.base_commission_rate ?? 0);
                      const commission =
                        commissionType === "fixed"
                          ? Number(activeTier?.fixed_commission_amount || program.fixed_commission_amount || 0)
                          : amountPaid * rate;

                      if (commission > 0) {
                        const { data: commissionResult, error: commissionError } = await supabaseAdmin.rpc("record_affiliate_commission", {
                          p_affiliate_id: affiliate.id,
                          p_amount: commission,
                          p_sale_amount: amountPaid,
                          p_referred_user_id: business.owner_id || null,
                          p_plan_slug: planSlug,
                          p_business_id: businessId,
                          p_stripe_session_id: session.id,
                          p_stripe_subscription_id: String(session.subscription || ""),
                          p_tier_name: activeTier?.name || "Default",
                          p_idempotency_key: `stripe-checkout:${session.id}`,
                        });
                        if (commissionError) throw commissionError;
                        const recorded = Array.isArray(commissionResult) ? commissionResult[0]?.recorded : commissionResult?.recorded;
                        if (recorded) {
                          console.log(`Rewarded affiliate ${affiliate.id} with ${commission.toFixed(2)}`);
                        }
                      }
                    } else if (isSelfReferral) {
                      console.warn(`Skipped self-referral commission for affiliate ${affiliate.id}`);
                    }
                  }
                }
              }
            } catch (err) {
              console.error(`Error updating business after checkout:`, err);
              // Leave the Stripe event retryable when activation or fulfilment
              // fails; acknowledging it here would permanently lose the order.
              throw err;
            }
          }
        }
          break;
        case "customer.subscription.updated": {
          const subscription = event.data.object as any;
          console.log(
            `Subscription updated: ${subscription.id} (Status: ${subscription.status})`,
          );

          try {
            const { data: plansData } = await supabaseAdmin
              .from("plans")
              .select("*");
            const plans = plansData || [];
            
            const priceId = subscription.items?.data?.[0]?.price?.id;
            const plan = plans.find((p: any) => p.stripe_price_id === priceId || p.yearly_stripe_price_id === priceId);
            const planSlug = plan?.slug || "starter";
            const planId = plan?.id;
            const currentPeriodStart = stripeTimestampToIso(subscription.current_period_start);
            const currentPeriodEnd = stripeTimestampToIso(subscription.current_period_end);
            const isActiveAccess = ["active", "trialing"].includes(subscription.status);
            const isPastDue = subscription.status === "past_due";
            const isTerminal = ["canceled", "cancelled", "unpaid", "incomplete_expired"].includes(subscription.status);
            const graceUntil = isPastDue ? billingGraceUntil(subscription.current_period_end) : null;

            const updateData: any = {
              subscription_status: subscription.status,
              status: isActiveAccess || isPastDue ? "active" : "inactive",
              subscription_grace_until: graceUntil,
            };
            if (isTerminal) {
              updateData.handover_grace_until = handoverGraceUntil(new Date());
              updateData.managed_service_cancellation_effective_at = new Date().toISOString();
            } else if (isActiveAccess) {
              updateData.handover_grace_until = null;
              updateData.managed_service_cancellation_effective_at = null;
              updateData.managed_service_cancellation_requested_at = null;
            }

            if (plan) {
              updateData.plan = planSlug;
              updateData.ai_credits = plan.monthly_credit_limit;
            }

            // Update Business
            await supabaseAdmin
              .from("businesses")
              .update(updateData)
              .eq("stripe_subscription_id", subscription.id);

            const subInfo = await syncUserSubscriptionByStripe({
              subscriptionId: subscription.id,
              customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
              status: subscription.status,
              planId,
              currentPeriodStart,
              currentPeriodEnd,
              renewalState: isTerminal ? "cancelled" : isPastDue ? "past_due" : "active",
              lastPaymentStatus: isPastDue ? "past_due" : isTerminal ? "cancelled" : "paid",
              lastWebhookEventId: event.id,
            });

            if (subInfo?.user_id) {
              const userId = subInfo.user_id;

              if (plan) {
                const creditPayload: Record<string, any> = {
                  monthly_credit_limit: plan.monthly_credit_limit,
                  reset_date: currentPeriodEnd,
                };
                if (isTerminal) creditPayload.credits_remaining = 0;
                await supabaseAdmin
                  .from("ai_credit_balances")
                  .update(creditPayload)
                  .eq("user_id", userId);
              }
            }

          } catch (err) {
            console.error(`Error handling subscription update:`, err);
          }
          break;
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object as any;
          console.log(`Subscription deleted: ${subscription.id}`);

          try {
            const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
            const cancelledAt = new Date().toISOString();
            const migrationGraceUntil = handoverGraceUntil(cancelledAt);
            const { data: cancelledBusiness } = await supabaseAdmin
              .from("businesses")
              .update({
                subscription_status: "canceled",
                status: "inactive",
                subscription_grace_until: null,
                managed_service_cancellation_effective_at: cancelledAt,
                handover_grace_until: migrationGraceUntil,
              })
              .eq("stripe_subscription_id", subscription.id)
              .select("id, owner_id")
              .maybeSingle();

            const subInfo = await syncUserSubscriptionByStripe({
              subscriptionId: subscription.id,
              customerId,
              status: "canceled",
              currentPeriodStart: stripeTimestampToIso(subscription.current_period_start),
              currentPeriodEnd: stripeTimestampToIso(subscription.current_period_end),
              renewalState: "cancelled",
              lastPaymentStatus: "cancelled",
              lastWebhookEventId: event.id,
            });

            const userId = subInfo?.user_id || cancelledBusiness?.owner_id;
            if (userId) {
              await supabaseAdmin
                .from("ai_credit_balances")
                .update({ credits_remaining: 0, monthly_credit_limit: 0 })
                .eq("user_id", userId);
            }

            if (cancelledBusiness) {
              await insertBillingLifecycleEvent({
                business_id: cancelledBusiness.id,
                event_type: "subscription_cancelled",
                status: "open",
                source: "stripe",
                metadata: { stripeEventId: event.id, stripeSubscriptionId: subscription.id, handoverGraceUntil: migrationGraceUntil },
              });
            }
          } catch (err) {
            console.error(`Error handling subscription deletion:`, err);
          }
          break;
        }
        case "charge.refunded": {
          const charge = event.data.object as any;
          const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
          const business = await resolveBusinessForStripe({ customerId });
          if (business && Number(charge.amount_refunded || 0) > 0) {
            let refunds = Array.isArray(charge.refunds?.data) ? charge.refunds.data : [];
            if (!refunds.length) {
              try {
                const expandedCharge = await stripe.charges.retrieve(charge.id, { expand: ["refunds.data"] });
                refunds = Array.isArray(expandedCharge.refunds?.data) ? expandedCharge.refunds.data : [];
              } catch (refundLookupError) {
                console.warn("Stripe refund detail lookup failed:", refundLookupError);
              }
            }
            if (!refunds.length) refunds = [{ id: `event_${event.id}`, amount: Number(charge.amount_refunded || 0), created: charge.created, currency: charge.currency, metadata: {} }];
            for (const refund of refunds) {
              await insertFinanceTransaction({
                business_id: business.id,
                source_type: "STRIPE_REFUND",
                source_id: String(refund.id),
                source_event_id: event.id,
                stripe_charge_id: charge.id,
                stripe_payment_intent_id: typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id || null,
                transaction_type: "refund",
                transaction_date: stripeTimestampToIso(refund.created || charge.created) || new Date().toISOString(),
                posted_date: new Date().toISOString(),
                description: `Stripe refund ${refund.id}`,
                counterparty: customerId,
                currency: String(refund.currency || charge.currency || "USD").toUpperCase(),
                amount: Number(refund.amount || 0) / 100,
                payment_method: "stripe",
                payment_processor: "stripe",
                net_amount: -Number(refund.amount || 0) / 100,
                status: "posted",
                category: "Refunds",
                metadata: { stripeEventId: event.id, chargeId: charge.id, refundId: refund.id, paymentIntentId: charge.payment_intent || null, reason: refund.reason || null },
              });
            }
          }
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object as any;
          const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
          const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
          const business = await resolveBusinessForStripe({ subscriptionId, customerId });
          if (business) {
            const dueAt = stripeTimestampToIso(invoice.next_payment_attempt);
            const graceUntil = billingGraceUntil(invoice.next_payment_attempt);
            await supabaseAdmin
              .from("businesses")
              .update({
                subscription_status: "past_due",
                status: "active",
                subscription_grace_until: graceUntil,
              })
              .eq("id", business.id);
            await syncUserSubscriptionByStripe({ subscriptionId, customerId, status: "past_due", renewalState: "past_due", lastPaymentStatus: "failed", lastWebhookEventId: event.id });
            await insertBillingLifecycleEvent({
              business_id: business.id,
              event_type: "payment_failed",
              status: "open",
              source: "stripe",
              amount: Number(invoice.amount_due || 0) / 100,
              currency: invoice.currency || "usd",
              due_at: dueAt || graceUntil,
              metadata: { stripeEventId: event.id, invoiceId: invoice.id, stripeSubscriptionId: subscriptionId, graceUntil },
            });
          }
          break;
        }
        case "invoice.paid": {
          const invoice = event.data.object as any;
          const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
          const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
          const business = await resolveBusinessForStripe({ subscriptionId, customerId });
          if (business) {
            await supabaseAdmin.from("businesses").update({ subscription_status: "active", status: "active", subscription_grace_until: null }).eq("id", business.id);
            await syncUserSubscriptionByStripe({ subscriptionId, customerId, status: "active", renewalState: "active", lastPaymentStatus: "paid", lastWebhookEventId: event.id });
            await supabaseAdmin.from("billing_lifecycle_events").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("business_id", business.id).eq("event_type", "payment_failed").eq("status", "open");
            await insertBillingLifecycleEvent({ business_id: business.id, event_type: "payment_recovered", status: "resolved", source: "stripe", amount: Number(invoice.amount_paid || 0) / 100, currency: invoice.currency || "usd", resolved_at: new Date().toISOString(), metadata: { stripeEventId: event.id, invoiceId: invoice.id, stripeSubscriptionId: subscriptionId } });
            if (invoice.billing_reason !== "subscription_create") {
              await insertFinanceTransaction({
                business_id: business.id,
                source_type: "SUBSCRIPTION",
                source_id: invoice.id,
                transaction_type: "income",
                transaction_date: stripeTimestampToIso(invoice.status_transitions?.paid_at || invoice.created) || new Date().toISOString(),
                posted_date: new Date().toISOString(),
                description: `Stripe invoice ${invoice.number || invoice.id}`,
                counterparty: customerId,
                currency: invoice.currency || "USD",
                amount: Number(invoice.amount_paid || 0) / 100,
                payment_method: "stripe_invoice",
                payment_processor: "stripe",
                net_amount: Number(invoice.amount_paid || 0) / 100,
                status: "posted",
                category: "Subscription revenue",
                metadata: { stripeEventId: event.id, invoiceId: invoice.id, billingReason: invoice.billing_reason || null },
              });
            }
          }
          break;
        }
      default:
          console.log(`Unhandled event type ${event.type}`);
      }

      await supabaseAdmin.from("tracking_events").insert({
        event_type: "stripe_webhook_completed",
        source_platform: "stripe",
        metadata: { stripeEventId: event.id, stripeEventType: event.type },
      }).then(({ error }) => {
        if (error) console.warn("Stripe webhook completion log skipped:", error.message);
      });
      await supabaseAdmin.from("stripe_webhook_events").update({ status: "completed", completed_at: new Date().toISOString(), processing_started_at: null, error_message: null, failed_at: null }).eq("stripe_event_id", event.id).eq("status", "processing");

      res.json({ received: true });
      } catch (processingError: any) {
        const message = String(processingError?.message || "WEBHOOK_PROCESSING_FAILED").slice(0, 500);
        await supabaseAdmin.from("stripe_webhook_events").update({
          status: "failed", failed_at: new Date().toISOString(), processing_started_at: null, error_message: message,
        }).eq("stripe_event_id", event.id).eq("status", "processing");
        console.error("Stripe webhook processing failed", { eventId: event.id, type: event.type, error: message });
        return res.status(500).json({ error: "Webhook processing failed; Stripe may retry this event." });
      }
    },
  );

  app.use(async (_req, _res, next) => {
    await refreshPlatformSettings();
    next();
  });
  app.use(cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      try {
        const hostname = new URL(origin).hostname.toLowerCase();
        const configuredHosts = getPlatformHosts();
        const vercelHosts = [
          process.env.VERCEL_URL,
          process.env.VERCEL_BRANCH_URL,
          process.env.VERCEL_PROJECT_PRODUCTION_URL,
        ].filter(Boolean).map((host) => String(host).toLowerCase());
        const localDevelopment = process.env.NODE_ENV !== "production" && !process.env.VERCEL;
        const allowed = configuredHosts.has(hostname)
          || vercelHosts.includes(hostname)
          || (localDevelopment && ["localhost", "127.0.0.1"].includes(hostname));
        return callback(null, allowed);
      } catch {
        return callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key", "X-Request-ID", "X-API-Key"],
    maxAge: 600,
  }));

  const publicAppUrl = () => String(process.env.APP_PUBLIC_URL || process.env.PUBLIC_APP_URL || "https://app.bennietay.com").replace(/\/+$/, "");
  const customerOnboardingUrl = (email: string, hasAccount: boolean) =>
    publicAppUrl() + "/" + (hasAccount ? "login" : "signup")
    + "?redirectTo=" + encodeURIComponent("/dashboard/onboarding")
    + "&email=" + encodeURIComponent(email);

  const deliverCustomerOnboardingInvite = async (input: {
    businessId: string;
    businessName: string;
    email: string;
    contactName?: string | null;
    hasAccount: boolean;
    requestId: string;
  }) => {
    await refreshPlatformSettings();
    const onboardingUrl = customerOnboardingUrl(input.email, input.hasAccount);
    const greeting = input.contactName ? " " + escapeHtml(input.contactName) : "";
    const inviteHtml = "<div style=\"font-family:Arial,sans-serif;line-height:1.65;color:#172033\">"
      + "<p>Hi" + greeting + ",</p><p>Your Bennie Studio customer workspace for <strong>" + escapeHtml(input.businessName) + "</strong> is ready.</p>"
      + "<p><a href=\"" + onboardingUrl + "\" style=\"display:inline-block;padding:12px 18px;border-radius:10px;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700\">Start onboarding</a></p>"
      + "<p style=\"color:#64748b;font-size:13px\">Use " + escapeHtml(input.email) + " when signing in or creating your account. Your workspace will attach automatically.</p></div>";
    const inviteText = "Your Bennie Studio customer workspace for " + input.businessName
      + " is ready. Start onboarding: " + onboardingUrl
      + "\n\nUse " + input.email + " when signing in or creating your account. Your workspace will attach automatically.";
    const { data, error } = await getResend().emails.send({
      from: process.env.RESEND_FROM_EMAIL || platformSettings?.emailFrom || "Bennie Studio <onboarding@resend.dev>",
      to: input.email,
      subject: "Your Bennie Studio onboarding is ready",
      html: inviteHtml,
      text: inviteText,
      replyTo: process.env.SALES_REPLY_TO || platformSettings?.supportEmail || undefined,
    }, { idempotencyKey: "customer-onboarding-" + input.businessId + "-" + input.requestId });
    if (error || !data?.id) throw new Error("CUSTOMER_INVITE_DELIVERY_FAILED");
    return {
      status: input.hasAccount ? "existing_user_notified" : "invite_sent",
      email: input.email,
      sentAt: new Date().toISOString(),
      providerMessageId: data.id,
      onboardingUrl,
    };
  };


  const processDueSalesMessages = (limit = 40) => runSalesDelivery({
    db: supabaseAdmin,
    limit,
    send: async (message) => {
      const unsubscribeUrl = `${publicAppUrl()}/api/public/unsubscribe/${message.unsubscribe_token}`;
      // Approved text is authoritative; a previous HTML draft must not override edits.
      const html = `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#172033">${escapeHtml(message.body_text).replace(/\n/g, "<br>")}<p style="margin-top:24px;font-size:12px;color:#64748b"><a href="${unsubscribeUrl}">Stop receiving these emails</a></p></div>`;
      const { data, error } = await getResend().emails.send({
        from: process.env.RESEND_FROM_EMAIL || platformSettings?.emailFrom || "Bennie Studio <onboarding@resend.dev>",
        to: message.recipient,
        subject: message.subject || "A note from Bennie Studio",
        html,
        text: `${message.body_text}\n\nStop receiving these emails: ${unsubscribeUrl}`,
        replyTo: process.env.SALES_REPLY_TO || platformSettings?.supportEmail || undefined,
        bcc: process.env.SALES_ARCHIVE_EMAIL || undefined,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        tags: [{ name: "sales_message_id", value: message.id }],
      }, { idempotencyKey: message.idempotency_key });
      if (error || !data?.id) throw new Error("EMAIL_DELIVERY_FAILED");
      return { id: data.id };
    },
  });

  const sendDirectSalesEmail = async (message: any) => {
    const target = normalizeSalesEmail(message.recipient);
    if (!target || await isSalesSuppressed(supabaseAdmin, target)) throw new Error("CONTACT_SUPPRESSED");
    await refreshPlatformSettings();
    const unsubscribeUrl = `${publicAppUrl()}/api/public/unsubscribe/${message.unsubscribe_token}`;
    const html = `<div style="font-family:Arial,sans-serif;line-height:1.65;color:#172033">${escapeHtml(message.body_text).replace(/\n/g, "<br>")}<p style="margin-top:24px;font-size:12px;color:#64748b"><a href="${unsubscribeUrl}">Stop receiving these emails</a></p></div>`;
    const { data, error } = await getResend().emails.send({
      from:
        process.env.RESEND_FROM_EMAIL
        || platformSettings?.emailFrom
        || "Bennie Studio <onboarding@resend.dev>",
      to: message.recipient,
      subject: message.subject || "A note from Bennie Studio",
      html,
      text: `${message.body_text}\n\nStop receiving these emails: ${unsubscribeUrl}`,
      replyTo:
        process.env.SALES_REPLY_TO
        || platformSettings?.supportEmail
        || undefined,
      bcc: process.env.SALES_ARCHIVE_EMAIL || undefined,
      headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        tags: [{ name: "sales_message_id", value: message.id }],
    }, { idempotencyKey: message.idempotency_key });
    if (error || !data?.id) throw new Error("EMAIL_DELIVERY_FAILED");
    return { id: data.id };
  };

  const isPrivateAddress = (address: string) => {
    const normalized = address.replace(/^::ffff:/, "").toLowerCase();
    return normalized === "::1" || normalized === "0.0.0.0" || normalized === "127.0.0.1"
      || /^10\./.test(normalized) || /^192\.168\./.test(normalized)
      || /^169\.254\./.test(normalized) || /^172\.(1[6-9]|2\d|3[01])\./.test(normalized)
      || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
  };

  const assertPublicAuditUrl = async (value: string) => {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
      throw new Error("INVALID_AUDIT_URL");
    }
    if (["localhost", "0.0.0.0"].includes(parsed.hostname.toLowerCase())) throw new Error("PRIVATE_AUDIT_URL");
    const addresses = await dns.promises.lookup(parsed.hostname, { all: true });
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("PRIVATE_AUDIT_URL");
    return parsed;
  };

  const fetchAuditResource = async (initialUrl: string, method: "GET" | "HEAD" = "GET") => {
    let current = initialUrl;
    for (let redirect = 0; redirect <= 4; redirect += 1) {
      await assertPublicAuditUrl(current);
      const response = await fetch(current, {
        method,
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
        headers: { "user-agent": "BennieStudioWebsiteAudit/1.0", accept: "text/html,application/xhtml+xml" },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error("INVALID_REDIRECT");
        current = new URL(location, current).toString();
        continue;
      }
      return { response, finalUrl: current };
    }
    throw new Error("TOO_MANY_REDIRECTS");
  };

  const runWebsiteAudit = async (payload: {
    url: string;
    businessName?: string | null;
    industry?: string | null;
    leadId?: string | null;
    leadEmail?: string | null;
    requestId: string;
  }) => {
    const startedAt = Date.now();
    const { response, finalUrl } = await fetchAuditResource(payload.url);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      const error = new Error("The submitted URL did not return a website page.");
      (error as any).statusCode = 422;
      throw error;
    }
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > 2_000_000) {
      const error = new Error("The website page is too large to analyse safely.");
      (error as any).statusCode = 422;
      throw error;
    }
    const html = await response.text();
    if (!html.trim() || new TextEncoder().encode(html).length > 2_000_000) {
      const error = new Error("The website returned no analysable HTML or exceeded the audit limit.");
      (error as any).statusCode = 422;
      throw error;
    }
    if (!response.ok) {
      const error = new Error(`The website returned HTTP ${response.status} and could not be analysed.`);
      (error as any).statusCode = 422;
      throw error;
    }

    const origin = new URL(finalUrl).origin;
    const safeStatus = async (resourceUrl: string) => {
      try {
        const result = await fetchAuditResource(resourceUrl, "HEAD");
        return result.response.status >= 200 && result.response.status < 400;
      } catch { return false; }
    };
    const anchorTargets = [...html.matchAll(/<a\b[^>]+href=["']([^"'#]+)["']/gi)]
      .map((match) => { try { return new URL(match[1], finalUrl); } catch { return null; } })
      .filter((target): target is URL => Boolean(target && target.origin === origin && ["http:", "https:"].includes(target.protocol)))
      .filter((target, index, list) => list.findIndex((item) => item.href === target.href) === index)
      .slice(0, 8);
    const [robotsFound, sitemapFound, linkResults] = await Promise.all([
      safeStatus(`${origin}/robots.txt`),
      safeStatus(`${origin}/sitemap.xml`),
      Promise.all(anchorTargets.map(async (target) => ({ target: target.href, ok: await safeStatus(target.href) }))),
    ]);
    const report = analyzeWebsiteHtml({
      url: finalUrl,
      html,
      statusCode: response.status,
      responseTimeMs: Date.now() - startedAt,
      businessName: payload.businessName || undefined,
      industry: payload.industry || undefined,
      robotsFound,
      sitemapFound,
      checkedLinks: linkResults.length,
      brokenLinks: linkResults.filter((item) => !item.ok).map((item) => item.target),
    });
    if (payload.leadId && payload.leadEmail) {
      const { data: lead } = await supabaseAdmin.from("leads").select("id,raw_fields").eq("id", payload.leadId).eq("email", payload.leadEmail).maybeSingle();
      if (lead) {
        await supabaseAdmin.from("leads").update({
          raw_fields: { ...(lead.raw_fields || {}), websiteAudit: report, auditCompletedAt: report.analyzedAt },
        }).eq("id", lead.id).then(({ error }) => {
          if (error) console.warn(`[WebsiteAudit:${payload.requestId}] Report persistence failed:`, error.message);
        });
      }
    }
    return report;
  };

  const buildPreviewProfileFromWebsite = async (input: {
    websiteUrl: string;
    businessName?: string | null;
    location?: string | null;
    mainService?: string | null;
  }) => {
    const { response, finalUrl } = await fetchAuditResource(input.websiteUrl);
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml"))) {
      throw new Error("PREVIEW_NOT_HTML");
    }
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > 1_500_000) throw new Error("PREVIEW_TOO_LARGE");
    const homeHtml = await response.text();
    if (!homeHtml.trim() || new TextEncoder().encode(homeHtml).length > 1_500_000) {
      throw new Error("PREVIEW_EMPTY");
    }

    const evidenceHtml: string[] = [homeHtml];
    const evidenceUrls = extractPreviewEvidenceUrls(homeHtml, finalUrl, 6);
    const evidencePages = await Promise.all(evidenceUrls.map(async (url) => {
      try {
        const result = await fetchAuditResource(url);
        const type = result.response.headers.get("content-type") || "";
        if (!result.response.ok || (!type.includes("text/html") && !type.includes("application/xhtml+xml"))) return "";
        const page = await result.response.text();
        return page && new TextEncoder().encode(page).length <= 750_000 ? page : "";
      } catch {
        // A secondary evidence page must never block the preview.
        return "";
      }
    }));
    evidenceHtml.push(...evidencePages.filter(Boolean));

    return buildPublicPreviewProfile({
      html: evidenceHtml.join("\n<!-- preview-evidence-page -->\n"),
      finalUrl,
      fallbackBusinessName: input.businessName,
      fallbackLocation: input.location,
      fallbackMainService: input.mainService,
    });
  };

  app.post(
    "/api/public/preview-intake",
    // Preview regeneration is an interactive design workflow, not a one-shot
    // lead form. Rate-limit bursts by IP and sustained use by the verified lead
    // instead of blocking the same email after only a few legitimate rebuilds.
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      keyPrefix: "preview-intake-burst-v3",
    }),
    rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 500,
      keyPrefix: "preview-intake-lead-v3",
      key: (req) => String(req.body?.leadId || req.body?.previewId || getClientIp(req)).trim().toLowerCase(),
    }),
    async (req: any, res: any) => {
      const body = validateBody(z.object({
        mode: z.enum(["website", "business"]),
        previewId: z.string().trim().min(8).max(160),
        leadId: UUID_SCHEMA,
        leadEmail: EMAIL_SCHEMA,
        websiteUrl: PUBLIC_URL_SCHEMA.optional().nullable(),
        businessName: z.string().trim().max(160).optional().nullable(),
        industry: z.string().trim().max(160).optional().nullable(),
        businessTypeId: z.string().trim().max(160).optional().nullable(),
        templateId: z.string().trim().max(160).optional().nullable(),
        location: z.string().trim().max(160).optional().nullable(),
        mainService: z.string().trim().max(300).optional().nullable(),
      }), req, res);
      if (!body) return;

      const { data: lead, error: leadError } = await supabaseAdmin
        .from("leads")
        .select("id,email,preview_id,raw_fields")
        .eq("id", body.leadId)
        .ilike("email", body.leadEmail)
        .maybeSingle();

      if (leadError) return res.status(503).json({ error: "Preview verification is temporarily unavailable." });
      if (!lead || lead.preview_id !== body.previewId) return res.status(403).json({ error: "Preview verification failed." });

      const PREVIEW_PROFILE_VERSION = 11;
      const cached = lead.raw_fields?.previewProfile;
      const cachedVersion = Number(lead.raw_fields?.previewProfileVersion || 0);
      const cachedAt = Date.parse(String(lead.raw_fields?.previewProfileCapturedAt || ""));
      const websiteCacheFresh = Number.isFinite(cachedAt) && Date.now() - cachedAt < 15 * 60 * 1000;
      const canUseCachedProfile =
        Boolean(cached)
        && cachedVersion === PREVIEW_PROFILE_VERSION
        && lead.raw_fields?.previewMode === body.mode
        && String(lead.raw_fields?.businessTypeId || "") === String(body.businessTypeId || "")
        && String(lead.raw_fields?.templateId || "") === String(body.templateId || "")
        && (
          body.mode !== "website"
          || (websiteCacheFresh && cached.sourceUrl === body.websiteUrl)
        );

      if (canUseCachedProfile) {
        return res.json({ success: true, profile: cached, cached: true, aiUsed: false, estimatedAiCostUsd: 0 });
      }

      try {
        let profile: any;
        if (body.mode === "website") {
          if (!body.websiteUrl) return res.status(400).json({ error: "A website URL is required." });
          profile = await buildPreviewProfileFromWebsite({
            websiteUrl: body.websiteUrl,
            businessName: body.businessName,
            location: body.location,
            mainService: body.mainService,
          });
        } else {
          profile = {
            sourceUrl: "",
            businessName: body.businessName || "",
            description: "",
            location: body.location || "",
            contactEmail: "",
            contactPhone: "",
            services: body.mainService
              ? body.mainService.split(/[,/\n]+/).map((item) => item.trim()).filter(Boolean).slice(0, 8)
              : [],
            heroImage: "",
            sourceTitle: "",
            aiUsed: false,
            estimatedAiCostUsd: 0,
          };
        }

        const nextRawFields = {
          ...(lead.raw_fields || {}),
          previewMode: body.mode,
          industry: body.industry || null,
          businessTypeId: body.businessTypeId || null,
          templateId: body.templateId || null,
          previewProfile: profile,
          previewProfileVersion: PREVIEW_PROFILE_VERSION,
          previewProfileCapturedAt: new Date().toISOString(),
          previewGenerationMethod: "deterministic",
          previewAiCostUsd: 0,
        };
        await supabaseAdmin.from("leads").update({ raw_fields: nextRawFields }).eq("id", lead.id);

        return res.json({
          success: true,
          profile,
          cached: false,
          aiUsed: false,
          estimatedAiCostUsd: 0,
        });
      } catch (error: any) {
        const code = String(error?.message || "");
        if (code === "PRIVATE_AUDIT_URL") return res.status(422).json({ error: "Private or local URLs cannot be previewed." });
        if (code === "INVALID_AUDIT_URL") return res.status(422).json({ error: "Enter a valid public website URL." });
        console.warn("[PublicPreviewIntake]", code || error);
        return res.status(422).json({
          error: "We could not read that website. You can still build a preview from business details.",
          fallbackMode: "business",
        });
      }
    },
  );

  app.post(
    "/api/admin/sales-preview-intake",
    authenticate,
    async (req: any, res: any) => {
      const caller = await getProfileForUser(req.user.id);
      if (!caller || !["super_admin", "platform_staff"].includes(String(caller.role))) {
        return res.status(403).json({ error: "Bennie Studio staff access required." });
      }
      const body = validateBody(z.object({
        mode: z.enum(["website", "business"]),
        previewId: z.string().trim().min(8).max(160),
        prospectId: UUID_SCHEMA.optional(),
        websiteUrl: PUBLIC_URL_SCHEMA.optional().nullable(),
        businessName: z.string().trim().max(160).optional().nullable(),
        industry: z.string().trim().max(160).optional().nullable(),
        businessTypeId: z.string().trim().max(160).optional().nullable(),
        templateId: z.string().trim().max(160).optional().nullable(),
        location: z.string().trim().max(160).optional().nullable(),
        mainService: z.string().trim().max(300).optional().nullable(),
      }), req, res);
      if (!body) return;

      try {
        // Linking a prepared concept to an outbound prospect requires sales privileges.
        if (body.prospectId) {
          if (!canManageSalesOperations(caller)) return res.status(403).json({ error: "Sales permission required to link prospect previews." });
          const { data: prospect, error: prospectError } = await supabaseAdmin.from("prospects")
            .select("id,name,domain,website_status,outreach_exhausted_at")
            .eq("id", body.prospectId).maybeSingle();
          if (prospectError) throw prospectError;
          if (!prospect || prospect.outreach_exhausted_at) return res.status(409).json({ error: "This prospect is unavailable for a new preview." });
          if (body.mode === "website") {
            const sourceHost = new URL(body.websiteUrl || "").hostname.toLowerCase().replace(/^www\./, "");
            const prospectHost = String(prospect.domain || "").replace(/^https?:\/\//i, "").split("/")[0].toLowerCase().replace(/^www\./, "");
            if (!prospectHost || sourceHost !== prospectHost) return res.status(422).json({ error: "The source website must match the prospect's verified domain." });
          }
        }
        const profile = body.mode === "website"
          ? await buildPreviewProfileFromWebsite({
              websiteUrl: body.websiteUrl || "",
              businessName: body.businessName,
              location: body.location,
              mainService: body.mainService,
            })
          : {
              sourceUrl: "",
              businessName: body.businessName || "",
              description: "",
              location: body.location || "",
              contactEmail: "",
              contactPhone: "",
              services: body.mainService ? body.mainService.split(/[,/\n]+/).map((item) => item.trim()).filter(Boolean).slice(0, 8) : [],
              heroImage: "",
              sourceTitle: "",
              aiUsed: false,
              estimatedAiCostUsd: 0,
            };

        const rawFields = {
          businessName: profile.businessName || body.businessName || null,
          industry: body.industry || null,
          businessTypeId: body.businessTypeId || null,
          templateId: body.templateId || null,
          location: profile.location || body.location || null,
          mainService: body.mainService || profile.services?.[0] || null,
          previewMode: body.mode,
          previewProfile: profile,
          previewProfileVersion: 11,
          previewProfileCapturedAt: new Date().toISOString(),
          previewGenerationMethod: "deterministic",
          previewAiCostUsd: 0,
          internalSalesPreview: true,
          prospectId: body.prospectId || null,
          createdBy: req.user.id,
        };
        const { data: existingLead } = await supabaseAdmin
          .from("leads")
          .select("id,email,raw_fields")
          .eq("preview_id", body.previewId)
          .eq("source", "sales_preview")
          .maybeSingle();

        const internalEmail = String(existingLead?.email || `sales-preview+${crypto.randomUUID()}@bennietay.com`);
        let leadId = existingLead?.id || "";
        if (existingLead?.id) {
          const { error: updateError } = await supabaseAdmin.from("leads").update({
            name: profile.businessName || body.businessName || "Sales preview prospect",
            message: `Internal Bennie Studio sales preview for ${profile.sourceUrl || body.businessName || "prospect"}`,
            raw_fields: { ...(existingLead.raw_fields || {}), ...rawFields },
          }).eq("id", existingLead.id);
          if (updateError) throw updateError;
        } else {
          const { data: lead, error } = await supabaseAdmin.from("leads").insert({
            name: profile.businessName || body.businessName || "Sales preview prospect",
            email: internalEmail,
            message: `Internal Bennie Studio sales preview for ${profile.sourceUrl || body.businessName || "prospect"}`,
            source: "sales_preview",
            source_page: "/generate-preview?sales=1",
            form_name: "Internal sales preview",
            status: "new",
            preview_id: body.previewId,
            raw_fields: rawFields,
          }).select("id").single();
          if (error || !lead) throw error || new Error("SALES_PREVIEW_LEAD_CREATE_FAILED");
          leadId = lead.id;
        }

        return res.json({
          success: true,
          leadId,
          leadEmail: internalEmail,
          previewId: body.previewId,
          profile,
          internal: true,
        });
      } catch (error: any) {
        const code = String(error?.message || "");
        if (code === "PRIVATE_AUDIT_URL" || code === "INVALID_AUDIT_URL") return res.status(422).json({ error: "Enter a valid public website URL." });
        if (code === "PREVIEW_NOT_HTML") return res.status(422).json({ error: "That URL did not return a public website page." });
        console.error("Sales preview intake failed", code || error);
        return res.status(422).json({ error: "The sales preview could not be prepared." });
      }
    },
  );

  app.post(
    "/api/admin/sales-preview-site",
    authenticate,
    async (req: any, res: any) => {
      const caller = await getProfileForUser(req.user.id);
      if (!caller || !["super_admin", "platform_staff"].includes(String(caller.role))) {
        return res.status(403).json({ error: "Bennie Studio staff access required." });
      }
      const body = validateBody(z.object({
        previewId: z.string().trim().min(8).max(160),
        leadId: UUID_SCHEMA,
        summary: z.object({
          headline: z.string().trim().min(1).max(220),
          opportunitySummary: z.string().trim().min(1).max(700),
          proposedStructure: z.array(z.string().trim().min(1).max(120)).min(1).max(5),
          proofSignals: z.array(z.string().trim().min(1).max(160)).max(8),
          primaryConversionPath: z.string().trim().min(1).max(160),
          recommendedProduct: z.object({
            slug: z.enum(["personal-profile", "managed-website", "website-growth", "growth-partner", "custom-website"]),
            label: z.string().trim().min(1).max(120),
            reason: z.string().trim().min(1).max(400),
            salesMotion: z.enum(["self_serve", "review"]),
          }),
        }),
        website: z.object({
          theme: z.record(z.string(), z.any()),
          pages: z.array(z.any()).min(1).max(5),
          seo: z.record(z.string(), z.any()),
        }),
      }), req, res);
      if (!body) return;

      const serialized = JSON.stringify(body.website);
      if (Buffer.byteLength(serialized, "utf8") > 400_000) {
        return res.status(413).json({ error: "Preview payload is too large." });
      }

      try {
        const { data: lead, error: leadError } = await supabaseAdmin
          .from("leads")
          .select("id,name,email,business_id,preview_id,raw_fields,source")
          .eq("id", body.leadId)
          .eq("preview_id", body.previewId)
          .eq("source", "sales_preview")
          .maybeSingle();
        if (leadError) throw leadError;
        if (!lead) return res.status(403).json({ error: "This sales preview could not be verified." });

        const raw = lead.raw_fields && typeof lead.raw_fields === "object" ? lead.raw_fields : {};
        const profile = raw.previewProfile && typeof raw.previewProfile === "object" ? raw.previewProfile : {};
        const businessName = String(profile.businessName || raw.businessName || lead.name || "Website preview").trim().slice(0, 160);
        const industry = String(raw.industry || raw.service || "Professional Services").trim().slice(0, 160);
        const location = String(profile.location || raw.location || "").trim().slice(0, 160);

        let businessId = lead.business_id as string | null;
        if (businessId) {
          const { data: existingBusiness } = await supabaseAdmin
            .from("businesses")
            .select("id,owner_id")
            .eq("id", businessId)
            .maybeSingle();
          if (!existingBusiness || existingBusiness.owner_id) businessId = null;
        }
        if (!businessId) {
          const { data: business, error: businessError } = await supabaseAdmin
            .from("businesses")
            .insert({
              name: businessName,
              owner_id: null,
              plan: "business",
              status: "pending",
              subscription_status: "incomplete",
              industry,
              location: location || null,
              business_nature: String(profile.description || raw.mainService || industry).slice(0, 500),
              business_type: "local_service",
              lifecycle_stage: "prospect",
              lifecycle_stage_changed_at: new Date().toISOString(),
              admin_notes: `Internal sales preview ${body.previewId}. No domain attached.`,
            })
            .select("id")
            .single();
          if (businessError || !business) throw businessError || new Error("BUSINESS_CREATE_FAILED");
          businessId = business.id;
        }

        const { data: currentWebsite, error: currentWebsiteError } = await supabaseAdmin
          .from("websites")
          .select("id")
          .eq("business_id", businessId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (currentWebsiteError) throw currentWebsiteError;

        const websitePayload = {
          business_id: businessId,
          theme: body.website.theme,
          pages: body.website.pages,
          seo: body.website.seo,
          status: "published",
          slug: `prospect-${body.previewId.replace(/[^a-zA-Z0-9_-]/g, "").slice(-48)}`,
          generation_status: "complete",
          preview_status: "ready",
          design_profile: String(body.website.theme?.designProfile || "modern").slice(0, 120),
          design_profile_version: "1",
          template_version: "1",
          renderer_version: "1",
          content_schema_version: "1",
          updated_at: new Date().toISOString(),
        };

        let websiteId: string;
        if (currentWebsite?.id) {
          const { data: updated, error: updateError } = await supabaseAdmin
            .from("websites")
            .update(websitePayload)
            .eq("id", currentWebsite.id)
            .select("id")
            .single();
          if (updateError || !updated) throw updateError || new Error("WEBSITE_UPDATE_FAILED");
          websiteId = updated.id;
        } else {
          const { data: created, error: createError } = await supabaseAdmin
            .from("websites")
            .insert(websitePayload)
            .select("id")
            .single();
          if (createError || !created) throw createError || new Error("WEBSITE_CREATE_FAILED");
          websiteId = created.id;
        }

        const shareUrl = `${publicAppUrl()}/preview/prospect/${encodeURIComponent(body.previewId)}`;
        const { error: leadUpdateError } = await supabaseAdmin.from("leads").update({
          business_id: businessId,
          raw_fields: {
            ...raw,
            salesPreviewSummary: body.summary,
            previewBusinessId: businessId,
            previewWebsiteId: websiteId,
            shareablePreviewUrl: shareUrl,
            previewPublishedAt: new Date().toISOString(),
          },
        }).eq("id", lead.id);
        if (leadUpdateError) throw leadUpdateError;
        if (raw.prospectId) {
          // Only persisted, quality-checked internal previews become outreach assets.
          const { error: prospectLinkError } = await supabaseAdmin.from("prospects").update({
            design_preview_url: shareUrl,
            preview_generated_at: new Date().toISOString(),
          }).eq("id", raw.prospectId).is("outreach_exhausted_at", null);
          if (prospectLinkError) throw prospectLinkError;
        }

        return res.json({ success: true, businessId, websiteId, shareUrl, noindex: true });
      } catch (error: any) {
        console.error("Sales preview persistence failed", error?.message || error);
        return res.status(500).json({ error: "The prospect preview could not be saved." });
      }
    },
  );

  app.get(
    "/api/public/prospect-preview/:previewId",
    rateLimit({ windowMs: 60 * 60 * 1000, max: 120, keyPrefix: "prospect-preview-read" }),
    async (req: any, res: any) => {
      const previewId = String(req.params.previewId || "").trim();
      if (previewId.length < 8 || previewId.length > 160) return res.status(404).json({ error: "Preview not found." });
      try {
        const { data: lead, error: leadError } = await supabaseAdmin
          .from("leads")
          .select("id,name,business_id,preview_id,raw_fields,source")
          .eq("preview_id", previewId)
          .eq("source", "sales_preview")
          .maybeSingle();
        if (leadError) throw leadError;
        if (!lead?.business_id) return res.status(404).json({ error: "Preview not found." });

        const raw = lead.raw_fields && typeof lead.raw_fields === "object" ? lead.raw_fields : {};
        const summary = raw.salesPreviewSummary && typeof raw.salesPreviewSummary === "object" ? raw.salesPreviewSummary : null;
        if (!summary) return res.status(404).json({ error: "Preview not found." });

        let websiteQuery = supabaseAdmin
          .from("websites")
          .select("id,business_id,theme,pages,seo,status,updated_at")
          .eq("business_id", lead.business_id);
        if (raw.previewWebsiteId) websiteQuery = websiteQuery.eq("id", raw.previewWebsiteId);
        const { data: website, error: websiteError } = await websiteQuery
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (websiteError) throw websiteError;
        if (!website) return res.status(404).json({ error: "Preview not found." });

        return res.json({
          preview: {
            previewId,
            businessName: String(raw.previewProfile?.businessName || raw.businessName || lead.name || "Your business").slice(0, 160),
            businessType: String(raw.industry || raw.businessTypeId || "").slice(0, 160),
            sourceUrl: String(raw.previewProfile?.sourceUrl || raw.websiteUrl || "").slice(0, 500),
            websiteOnlyUrl: `${publicAppUrl()}/w/${lead.business_id}`,
            headline: String(summary.headline || "").slice(0, 220),
            opportunitySummary: String(summary.opportunitySummary || "").slice(0, 700),
            proposedStructure: Array.isArray(summary.proposedStructure) ? summary.proposedStructure.slice(0, 5) : [],
            proofSignals: Array.isArray(summary.proofSignals) ? summary.proofSignals.slice(0, 8) : [],
            primaryConversionPath: String(summary.primaryConversionPath || "").slice(0, 160),
            recommendedProduct: summary.recommendedProduct || null,
            website: {
              id: website.id,
              businessId: website.business_id,
              theme: website.theme || {},
              pages: Array.isArray(website.pages) ? website.pages.slice(0, 5) : [],
              seo: website.seo || {},
              status: website.status || "draft",
              updatedAt: website.updated_at ? new Date(website.updated_at).getTime() : Date.now(),
            },
          },
        });
      } catch (error: any) {
        console.error("Prospect preview read failed", error?.message || error);
        return res.status(500).json({ error: "Preview could not be loaded." });
      }
    },
  );

  app.post(
    "/api/public/preview-site",
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      keyPrefix: "preview-site-burst-v3",
    }),
    rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 500,
      keyPrefix: "preview-site-lead-v3",
      key: (req) => String(req.body?.leadId || req.body?.previewId || getClientIp(req)).trim().toLowerCase(),
    }),
    async (req: any, res: any) => {
      const body = validateBody(z.object({
        previewId: z.string().trim().min(8).max(160),
        leadId: UUID_SCHEMA,
        email: EMAIL_SCHEMA,
        website: z.object({
          theme: z.record(z.string(), z.any()),
          pages: z.array(z.any()).min(1).max(5),
          seo: z.record(z.string(), z.any()),
        }),
      }), req, res);
      if (!body) return;

      const serialized = JSON.stringify(body.website);
      if (Buffer.byteLength(serialized, "utf8") > 400_000) {
        return res.status(413).json({ error: "Preview payload is too large." });
      }

      try {
        const { data: lead, error: leadError } = await supabaseAdmin
          .from("leads")
          .select("id,name,email,phone,business_id,preview_id,raw_fields")
          .eq("id", body.leadId)
          .ilike("email", body.email)
          .maybeSingle();
        if (leadError) throw leadError;
        if (!lead || lead.preview_id !== body.previewId) {
          return res.status(403).json({ error: "This preview could not be verified." });
        }

        const raw = lead.raw_fields && typeof lead.raw_fields === "object" ? lead.raw_fields : {};
        const profile = raw.previewProfile && typeof raw.previewProfile === "object" ? raw.previewProfile : {};
        const businessName = String(profile.businessName || raw.businessName || lead.name || "Website preview").trim().slice(0, 160);
        const industry = String(raw.industry || raw.service || "Professional Services").trim().slice(0, 160);
        const location = String(profile.location || raw.location || "").trim().slice(0, 160);

        let businessId = lead.business_id as string | null;
        if (businessId) {
          const { data: existingBusiness } = await supabaseAdmin
            .from("businesses")
            .select("id,owner_id")
            .eq("id", businessId)
            .maybeSingle();
          if (!existingBusiness || existingBusiness.owner_id) businessId = null;
        }

        if (!businessId) {
          const { data: business, error: businessError } = await supabaseAdmin
            .from("businesses")
            .insert({
              name: businessName,
              owner_id: null,
              plan: "business",
              status: "pending",
              subscription_status: "incomplete",
              industry,
              location: location || null,
              business_nature: String(profile.description || raw.mainService || industry).slice(0, 500),
              business_type: "local_service",
              lifecycle_stage: "prospect",
              lifecycle_stage_changed_at: new Date().toISOString(),
              admin_notes: `Shareable public preview generated from lead preview ${body.previewId}. No domain attached.`,
            })
            .select("id")
            .single();
          if (businessError || !business) throw businessError || new Error("BUSINESS_CREATE_FAILED");
          businessId = business.id;
          const { error: linkError } = await supabaseAdmin
            .from("leads")
            .update({ business_id: businessId })
            .eq("id", lead.id);
          if (linkError) throw linkError;
        }

        const { data: currentWebsite, error: currentWebsiteError } = await supabaseAdmin
          .from("websites")
          .select("id")
          .eq("business_id", businessId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (currentWebsiteError) throw currentWebsiteError;

        const websitePayload = {
          business_id: businessId,
          theme: body.website.theme,
          pages: body.website.pages,
          seo: body.website.seo,
          status: "published",
          slug: `preview-${body.previewId.replace(/[^a-zA-Z0-9_-]/g, "").slice(-48)}`,
          generation_status: "complete",
          preview_status: "ready",
          design_profile: String(body.website.theme?.designProfile || "modern").slice(0, 120),
          design_profile_version: "1",
          template_version: "1",
          renderer_version: "1",
          content_schema_version: "1",
          updated_at: new Date().toISOString(),
        };

        let websiteId: string;
        if (currentWebsite?.id) {
          const { data: updated, error: updateError } = await supabaseAdmin
            .from("websites")
            .update(websitePayload)
            .eq("id", currentWebsite.id)
            .select("id")
            .single();
          if (updateError || !updated) throw updateError || new Error("WEBSITE_UPDATE_FAILED");
          websiteId = updated.id;
        } else {
          const { data: created, error: createError } = await supabaseAdmin
            .from("websites")
            .insert(websitePayload)
            .select("id")
            .single();
          if (createError || !created) throw createError || new Error("WEBSITE_CREATE_FAILED");
          websiteId = created.id;
        }

        const shareUrl = `${publicAppUrl()}/w/${businessId}`;
        await supabaseAdmin.from("leads").update({
          raw_fields: {
            ...raw,
            previewBusinessId: businessId,
            previewWebsiteId: websiteId,
            shareablePreviewUrl: shareUrl,
            previewPublishedAt: new Date().toISOString(),
          },
        }).eq("id", lead.id);

        return res.json({
          success: true,
          businessId,
          websiteId,
          shareUrl,
          noindex: true,
        });
      } catch (error: any) {
        console.error("Shareable preview persistence failed", error?.message || error);
        return res.status(500).json({ error: "The preview was generated, but the shareable link could not be saved yet." });
      }
    },
  );

  const runSeoAudit = async (payload: {
    auditRunId: string;
    projectId: string;
    businessId: string;
    url?: string | null;
    requestId: string;
  }) => {
    const [{ data: project, error: projectError }, { data: business, error: businessError }] = await Promise.all([
      supabaseAdmin
        .from("seo_projects")
        .select("id,business_id,website_id,domain,status,adapter_type")
        .eq("id", payload.projectId)
        .eq("business_id", payload.businessId)
        .single(),
      supabaseAdmin
        .from("businesses")
        .select("id,name,custom_domain")
        .eq("id", payload.businessId)
        .single(),
    ]);
    if (projectError || !project) throw projectError || new Error("SEO_PROJECT_NOT_FOUND");
    if (businessError || !business) throw businessError || new Error("BUSINESS_NOT_FOUND");
    if (project.status !== "active") throw new Error("SEO_PROJECT_NOT_ACTIVE");

    const configuredDomain = String(payload.url || project.domain || business.custom_domain || "").trim();
    const platformBase = String(process.env.APP_PUBLIC_URL || process.env.PUBLIC_APP_URL || "https://app.bennietay.com").replace(/\/+$/, "");
    const sourceUrl = configuredDomain
      ? (/^https?:\/\//i.test(configuredDomain) ? configuredDomain : `https://${configuredDomain}`)
      : `${platformBase}/w/${payload.businessId}`;

    await supabaseAdmin.from("seo_audit_runs").update({
      status: "running",
      source_url: sourceUrl,
      started_at: new Date().toISOString(),
      error_message: null,
    }).eq("id", payload.auditRunId).eq("project_id", payload.projectId);

    const startedAt = Date.now();
    const { response, finalUrl } = await fetchAuditResource(sourceUrl);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new Error("The SEO project URL did not return an HTML page.");
    }
    const html = await response.text();
    if (!html.trim() || new TextEncoder().encode(html).length > 2_000_000) {
      throw new Error("The SEO project page returned no analysable HTML or exceeded the audit limit.");
    }

    const origin = new URL(finalUrl).origin;
    const safeStatus = async (resourceUrl: string) => {
      try {
        const result = await fetchAuditResource(resourceUrl, "HEAD");
        return result.response.status >= 200 && result.response.status < 400;
      } catch {
        return false;
      }
    };
    const internalTargets = [...html.matchAll(/<a\b[^>]+href=["']([^"'#]+)["']/gi)]
      .map((match) => { try { return new URL(match[1], finalUrl); } catch { return null; } })
      .filter((target): target is URL => Boolean(target && target.origin === origin && ["http:", "https:"].includes(target.protocol)))
      .filter((target, index, list) => list.findIndex((item) => item.href === target.href) === index)
      .slice(0, 8);
    const [robotsFound, sitemapFound, linkResults, moduleConfig] = await Promise.all([
      safeStatus(`${origin}/robots.txt`),
      safeStatus(`${origin}/sitemap.xml`),
      Promise.all(internalTargets.map(async (target) => ({ target: target.href, ok: await safeStatus(target.href) }))),
      supabaseAdmin.from("seo_module_definitions").select("default_config").eq("module_key", "technical").maybeSingle(),
    ]);
    const technicalResult = analyzeTechnicalSeo({
      url: finalUrl,
      html,
      statusCode: response.status,
      responseTimeMs: Date.now() - startedAt,
      robotsFound,
      sitemapFound,
      checkedLinks: linkResults.length,
      brokenLinks: linkResults.filter((item) => !item.ok).map((item) => item.target),
      weights: moduleConfig.data?.default_config?.healthWeights,
    });

    const { data: previousIssues, error: previousIssuesError } = await supabaseAdmin
      .from("seo_issues")
      .select("id,issue_key,status")
      .eq("project_id", payload.projectId);
    if (previousIssuesError) throw previousIssuesError;
    const detectedKeys = new Set(technicalResult.findings.map((finding) => finding.issueKey));
    const issueRows = technicalResult.findings.map((finding) => ({
      business_id: payload.businessId,
      project_id: payload.projectId,
      audit_run_id: payload.auditRunId,
      issue_key: finding.issueKey,
      module_key: finding.moduleKey,
      severity: finding.severity,
      title: finding.title,
      what_we_found: finding.whatWeFound,
      why_it_matters: finding.whyItMatters,
      recommended_action: finding.recommendedAction,
      evidence: finding.evidence,
      affected_urls: finding.affectedUrls,
      status: "open",
      last_detected_at: new Date().toISOString(),
      resolved_at: null,
      validated_at: null,
    }));
    const { data: savedIssues, error: saveIssuesError } = issueRows.length
      ? await supabaseAdmin.from("seo_issues").upsert(issueRows, { onConflict: "project_id,issue_key" }).select("*")
      : { data: [], error: null };
    if (saveIssuesError) throw saveIssuesError;

    const resolvedIssues = (previousIssues || []).filter((issue: any) =>
      !detectedKeys.has(issue.issue_key) && !["validated", "dismissed"].includes(issue.status),
    );
    if (resolvedIssues.length > 0) {
      await Promise.all(resolvedIssues.map((issue: any) =>
        supabaseAdmin.from("seo_issues").update({
          status: "validated",
          resolved_at: new Date().toISOString(),
          validated_at: new Date().toISOString(),
          audit_run_id: payload.auditRunId,
        }).eq("id", issue.id),
      ));
    }

    const issueIds = (savedIssues || []).map((issue: any) => issue.id);
    const { data: existingOpportunities, error: opportunityReadError } = issueIds.length
      ? await supabaseAdmin.from("seo_opportunities").select("id,source_issue_id,status").in("source_issue_id", issueIds)
      : { data: [], error: null };
    if (opportunityReadError) throw opportunityReadError;
    const existingByIssue = new Map((existingOpportunities || []).map((item: any) => [item.source_issue_id, item]));
    for (const issue of savedIssues || []) {
      const existing = existingByIssue.get(issue.id) as any;
      const priority = issue.severity === "critical" || issue.severity === "high" ? "high" : issue.severity === "medium" ? "medium" : "low";
      const opportunityPayload = {
        business_id: payload.businessId,
        project_id: payload.projectId,
        source_issue_id: issue.id,
        module_key: issue.module_key,
        title: issue.title,
        what_we_found: issue.what_we_found,
        why_it_matters: issue.why_it_matters,
        recommended_action: issue.recommended_action,
        expected_impact: "Remove the confirmed technical obstacle, then validate the page and monitor connected search data for any measured change.",
        effort: technicalResult.findings.find((finding) => finding.issueKey === issue.issue_key)?.effort || "medium",
        priority,
        evidence: issue.evidence,
        automation_available: project.adapter_type === "waas",
        status: existing?.status && existing.status !== "completed" ? existing.status : "detected",
      };
      if (existing?.id) {
        const { error } = await supabaseAdmin.from("seo_opportunities").update(opportunityPayload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin.from("seo_opportunities").insert(opportunityPayload);
        if (error) throw error;
      }
    }

    const completedAt = new Date().toISOString();
    const [{ error: runUpdateError }, { error: projectUpdateError }] = await Promise.all([
      supabaseAdmin.from("seo_audit_runs").update({
        status: "completed",
        source_url: finalUrl,
        pages_crawled: 1,
        health_score: technicalResult.score,
        health_explanation: technicalResult.scoreExplanation,
        summary: technicalResult.summary,
        metrics: technicalResult.metrics,
        completed_at: completedAt,
      }).eq("id", payload.auditRunId),
      supabaseAdmin.from("seo_projects").update({ last_audited_at: completedAt }).eq("id", payload.projectId),
    ]);
    if (runUpdateError) throw runUpdateError;
    if (projectUpdateError) throw projectUpdateError;

    const { data: usageRow } = await supabaseAdmin.from("seo_usage")
      .select("id,quantity")
      .eq("business_id", payload.businessId)
      .eq("project_id", payload.projectId)
      .eq("usage_date", new Date().toISOString().slice(0, 10))
      .eq("metric_key", "pages_crawled")
      .maybeSingle();
    await supabaseAdmin.from("seo_usage").upsert({
      ...(usageRow?.id ? { id: usageRow.id } : {}),
      business_id: payload.businessId,
      project_id: payload.projectId,
      usage_date: new Date().toISOString().slice(0, 10),
      metric_key: "pages_crawled",
      quantity: Number(usageRow?.quantity || 0) + 1,
      metadata: { auditRunId: payload.auditRunId },
    }, { onConflict: "business_id,project_id,usage_date,metric_key" });
    await supabaseAdmin.from("seo_activity_logs").insert({
      business_id: payload.businessId,
      project_id: payload.projectId,
      event_type: "seo_audit_completed",
      object_type: "seo_audit_run",
      object_id: payload.auditRunId,
      description: technicalResult.summary,
      metadata: { healthScore: technicalResult.score, findingCount: technicalResult.findings.length },
    });

    return {
      auditRunId: payload.auditRunId,
      projectId: payload.projectId,
      summary: technicalResult.summary,
      healthScore: technicalResult.score,
      findingCount: technicalResult.findings.length,
      completedAt,
    };
  };

  const runAsyncJob = async (job: AsyncJobRecord) => {
    if (job.job_type === "website_audit") {
      const report = await runWebsiteAudit({
        url: String(job.payload?.url || ""),
        businessName: job.payload?.businessName || null,
        industry: job.payload?.industry || null,
        leadId: job.payload?.leadId || null,
        leadEmail: job.payload?.leadEmail || null,
        requestId: job.id,
      });

      // Deliver the completed report without asking the prospect to stay on the page.
      // This is a transactional response to an explicitly requested free audit.
      // Failure to deliver email must not turn a completed, saved audit into a failed job.
      const reportUrl = `${publicAppUrl()}/website-audit?report=${encodeURIComponent(job.id)}&key=${encodeURIComponent(String(job.payload?.reportAccessKey || ""))}`;
      let delivery: "sent" | "not_configured" | "failed" | "skipped" = "skipped";
      if (job.payload?.leadEmail && job.payload?.leadId && job.payload?.reportAccessKey) {
        if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
          delivery = "not_configured";
        } else {
          try {
            const safeWebsite = escapeHtml(String(job.payload?.businessName || report.analyzedUrl || "your website").slice(0, 160));
            const findings = (report.findings || []).slice(0, 3);
            const findingHtml = findings.map((finding: any) => `<li><strong>${escapeHtml(String(finding.title || "").slice(0, 140))}</strong>: ${escapeHtml(String(finding.recommendation || "").slice(0, 280))}</li>`).join("");
            const linkHtml = escapeHtml(reportUrl);
            const emailHtml = `<div style="font-family:Arial,sans-serif;color:#182034;line-height:1.7;max-width:640px;margin:auto"><p style="color:#5746e8;font-weight:700">Bennie Studio · Free website review</p><h1>Your website review is ready</h1><p>We completed an automated review of <strong>${safeWebsite}</strong> based on publicly accessible page evidence. Findings may need human validation, especially on JavaScript-heavy websites.</p><h2>Recommended improvements</h2><ul>${findingHtml}</ul><p style="margin:28px 0"><a href="${linkHtml}" style="background:#5746e8;color:white;text-decoration:none;padding:14px 20px;border-radius:7px">Open your private review</a></p><p>Prefer to discuss your website with a person? <a href="${publicAppUrl()}/book-demo">Request a website consultation</a>.</p><p style="font-size:12px;color:#64748b">This is a requested review, not a guarantee of traffic, rankings, conversions or sales. The private link can be opened by anyone who possesses it.</p></div>`;
            const textBody = [
              "Your Bennie Studio website review is ready.",
              `Website: ${report.analyzedUrl}`,
              "Top recommendations:",
              ...findings.map((finding: any, i: number) => `${i + 1}. ${finding.title}: ${finding.recommendation}`),
              `Open the review: ${reportUrl}`,
              `Discuss with the studio: ${publicAppUrl()}/book-demo`,
              "This automated review is based on accessible page evidence. It is not a guarantee of rankings or revenue.",
            ].join("\n\n");
            const { data, error } = await getResend().emails.send({
              from: process.env.RESEND_FROM_EMAIL,
              to: String(job.payload.leadEmail),
              replyTo: process.env.SALES_REPLY_TO || undefined,
              subject: "Your Bennie Studio website review is ready",
              html: emailHtml,
              text: textBody,
            }, { idempotencyKey: `requested-website-audit-${job.id}` });
            if (error || !data?.id) throw new Error("AUDIT_EMAIL_NOT_ACCEPTED");
            delivery = "sent";
          } catch (emailError: any) {
            delivery = "failed";
            console.warn(`[WebsiteAudit:${job.id}] Report email was not delivered:`, emailError?.message || emailError);
          }
        }
      }
      if (job.payload?.leadId && job.payload?.leadEmail) {
        const { data: lead } = await supabaseAdmin.from("leads")
          .select("id,raw_fields")
          .eq("id", job.payload.leadId)
          .eq("email", job.payload.leadEmail)
          .maybeSingle();
        if (lead) {
          await supabaseAdmin.from("leads").update({
            raw_fields: { ...(lead.raw_fields || {}), auditDeliveryStatus: delivery, auditJobId: job.id, auditReportReadyAt: new Date().toISOString() },
          }).eq("id", lead.id).then(({error}) => { if (error) console.warn("Audit delivery status update failed", error.message); });
        }
        // Update the existing open lead-response task with real audit outcome.
        // Preserve its original due date and do not create duplicate tasks.
        await supabaseAdmin.from("sales_tasks").update({
          title: "Follow up on completed website review",
          priority: "high",
          notes: `The automated website review has completed for ${String(report.analyzedUrl || "").slice(0,250)}. Transactional report email status: ${delivery}. Review the stored report on the linked lead before contacting the prospect. Discuss verified findings and suitability; never promise rankings or enquiries.`,
        }).eq("lead_id", job.payload.leadId).eq("task_type", "new_lead_response").eq("status", "open")
          .then(({ error }) => { if (error) console.warn("Audit follow-up update failed", error.message); });
        // Do not create duplicate sales tasks or mark leads as converted.
      }
      // Prospect imports are internal research; never send outreach emails automatically.
      // Record the result against the imported prospect and expose the shareable
      // review only after the audit actually completes.
      if (job.payload?.prospectId && !job.payload?.leadId) {
        const prospectId = String(job.payload.prospectId);
        const completedAt = new Date().toISOString();
        const opportunityLevel = report.findings.some((finding: any) => finding.priority === "high") ? "high" : "medium";
        const { error: reportError } = await supabaseAdmin.from("audit_reports").insert({
          prospect_id: prospectId, score: null, report_data: report,
        });
        if (reportError) console.warn(`[ProspectAudit:${job.id}] Audit history insert failed:`, reportError.message);
        const { error: prospectUpdateError } = await supabaseAdmin.from("prospects").update({
          preview_url: reportUrl,
          preview_generated_at: completedAt,
          last_audit_at: completedAt,
          opportunity_level: opportunityLevel,
        }).eq("id", prospectId);
        if (prospectUpdateError) throw prospectUpdateError;
      }
      return { success: true, report, deliveryStatus: delivery, completedAt: new Date().toISOString() };
    }

    if (job.job_type === "seo_audit") {
      const result = await runSeoAudit({
        auditRunId: String(job.payload?.auditRunId || ""),
        projectId: String(job.payload?.projectId || ""),
        businessId: String(job.business_id || job.payload?.businessId || ""),
        url: job.payload?.url || null,
        requestId: job.id,
      });
      return { success: true, ...result };
    }

    if (job.job_type === "ai_generation" || job.job_type === "local_seo_audit") {
      throw new Error(`${job.job_type} worker is registered but not yet wired to a handler.`);
    }

    throw new Error(`Unsupported job type: ${job.job_type}`);
  };

  const processQueuedJob = async (jobId?: string) => {
    const workerId = `api-worker-${process.pid}-${Date.now()}`;
    const job = await claimAsyncJob(supabaseAdmin, jobId, workerId);
    if (!job) return { processed: false, job: null };

    try {
      const result = await runAsyncJob(job);
      await completeAsyncJob(supabaseAdmin, job.id, result);
      return { processed: true, job: { ...job, status: "completed" as const }, result };
    } catch (error: any) {
      const message = safeErrorMessage(error);
      captureServerError(error, {
        requestId: job.id,
        jobId: job.id,
        jobType: job.job_type,
        attempts: job.attempts,
      });
      if (job.job_type === "seo_audit" && job.payload?.auditRunId) {
        const willRetry = job.attempts < job.max_attempts;
        await supabaseAdmin.from("seo_audit_runs").update({
          status: willRetry ? "queued" : "failed",
          error_message: message,
          completed_at: willRetry ? null : new Date().toISOString(),
        }).eq("id", job.payload.auditRunId);
      }
      await failAsyncJob(supabaseAdmin, job, message);
      return { processed: true, job: { ...job, status: "failed" as const }, error: message };
    }
  };

  app.post(
    "/api/jobs/process",
    rateLimit({ windowMs: 60 * 1000, max: 60, keyPrefix: "jobs-process" }),
    async (req, res) => {
      const workerSecret = getJobWorkerSecret();
      const provided = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      if (!workerSecret || provided !== workerSecret) {
        return res.status(401).json({ error: "Unauthorized job worker request" });
      }

      const body = validateBody(z.object({ jobId: UUID_SCHEMA.optional() }), req, res);
      if (!body) return;

      try {
        const outcome = await processQueuedJob(body.jobId);
        return res.json(outcome);
      } catch (error: any) {
        console.error("[AsyncJobs] Worker failed:", error);
        return res.status(500).json({ error: safeErrorMessage(error) });
      }
    },
  );

  app.get("/api/jobs/:jobId", authenticate, async (req: any, res: any) => {
    if (!UUID_SCHEMA.safeParse(req.params.jobId).success) {
      return res.status(400).json({ error: "Invalid job ID" });
    }
    try {
      const job = await getAsyncJob(supabaseAdmin, req.params.jobId);
      if (!job) return res.status(404).json({ error: "Job not found" });
      const profile = await getProfileForUser(req.user.id);
      const canRead =
        profile.role === "super_admin" ||
        profile.role === "platform_staff" ||
        job.user_id === req.user.id ||
        Boolean(job.business_id && profile.business_id === job.business_id);
      if (!canRead) return res.status(403).json({ error: "Forbidden" });

      return res.json({
        id: job.id,
        jobType: job.job_type,
        status: job.status,
        attempts: job.attempts,
        maxAttempts: job.max_attempts,
        result: job.status === "completed" ? job.result : null,
        error: job.status === "failed" ? job.last_error : null,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        completedAt: job.completed_at,
      });
    } catch (error: any) {
      return res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  app.get("/api/seo/workspace/:businessId", authenticate, async (req: any, res: any) => {
    if (!UUID_SCHEMA.safeParse(req.params.businessId).success) {
      return res.status(400).json({ error: "Invalid business ID" });
    }
    try {
      await assertBusinessRoleAccess(req.user.id, req.params.businessId, { customerRoles: ["business_admin", "staff"], platformPermissions: ["delivery"] });
      const workspace = await loadSeoWorkspace(supabaseAdmin, { businessId: req.params.businessId });
      return res.json(workspace);
    } catch (error: any) {
      if (["BUSINESS_ID_REQUIRED", "BUSINESS_NOT_FOUND", "PROFILE_NOT_FOUND", "FORBIDDEN_BUSINESS_ACCESS"].includes(error?.message)) {
        return handleAccessError(res, error);
      }
      return res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  app.post(
    "/api/seo/projects/:projectId/audit",
    authenticate,
    rateLimit({ windowMs: 60 * 1000, max: 6, keyPrefix: "seo-audit" }),
    async (req: any, res: any) => {
      if (!UUID_SCHEMA.safeParse(req.params.projectId).success) {
        return res.status(400).json({ error: "Invalid SEO project ID" });
      }
      try {
        const { data: project, error: projectError } = await supabaseAdmin
          .from("seo_projects")
          .select("id,business_id,website_id,domain,status")
          .eq("id", req.params.projectId)
          .single();
        if (projectError || !project) return res.status(404).json({ error: "SEO project not found" });
        await assertBusinessRoleAccess(req.user.id, project.business_id, { customerRoles: ["business_admin", "staff"], platformPermissions: ["delivery"] });
        const { data: business, error: businessError } = await supabaseAdmin
          .from("businesses")
          .select("plan")
          .eq("id", project.business_id)
          .single();
        if (businessError || !business) throw businessError || new Error("BUSINESS_NOT_FOUND");
        const access = await resolveSeoAccess(supabaseAdmin, {
          businessId: project.business_id,
          websiteId: project.website_id,
          planKey: String(business.plan || "starter"),
        });
        const auditModules = access.modules.filter((module) =>
          ["audit", "technical"].includes(module.module_key) && module.enabled,
        );
        const auditEnabled = auditModules.length > 0;
        if (!access.activated || !auditEnabled) {
          return res.status(403).json({ error: access.reason || "SEO auditing is not enabled for this website." });
        }
        if (access.emergencyStop) {
          return res.status(503).json({ error: "SEO processing is temporarily paused." });
        }

        const monthlyAuditLimit = auditModules.reduce((current, module) => {
          const configured = Number(module.limits?.auditsPerMonth || 0);
          return configured > 0 && (current === 0 || configured < current) ? configured : current;
        }, 0);
        if (monthlyAuditLimit > 0) {
          const monthStartedAt = new Date();
          monthStartedAt.setUTCDate(1);
          monthStartedAt.setUTCHours(0, 0, 0, 0);
          const { count, error: usageError } = await supabaseAdmin
            .from("seo_audit_runs")
            .select("id", { count: "exact", head: true })
            .eq("project_id", project.id)
            .gte("created_at", monthStartedAt.toISOString());
          if (usageError) throw usageError;
          if (Number(count || 0) >= monthlyAuditLimit) {
            return res.status(429).json({
              error: `This website has used its ${monthlyAuditLimit} scheduled SEO audits for the current month.`,
              limit: monthlyAuditLimit,
            });
          }
        }

        const { data: runningAudit } = await supabaseAdmin
          .from("seo_audit_runs")
          .select("id,status,created_at")
          .eq("project_id", project.id)
          .in("status", ["queued", "running"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (runningAudit) {
          return res.status(409).json({ error: "An SEO audit is already in progress.", auditRun: runningAudit });
        }

        const { data: auditRun, error: auditError } = await supabaseAdmin.from("seo_audit_runs").insert({
          business_id: project.business_id,
          project_id: project.id,
          run_type: "technical",
          status: "queued",
          source_url: project.domain,
          requested_by: req.user.id,
        }).select("*").single();
        if (auditError) throw auditError;

        await supabaseAdmin.from("seo_activity_logs").insert({
          business_id: project.business_id,
          project_id: project.id,
          user_id: req.user.id,
          event_type: "seo_audit_started",
          object_type: "seo_audit_run",
          object_id: auditRun.id,
          description: "A technical SEO audit was requested.",
          metadata: { sourceUrl: project.domain, monthlyAuditLimit: monthlyAuditLimit || null },
        });

        const { job } = await createAsyncJob(supabaseAdmin, {
          jobType: "seo_audit",
          businessId: project.business_id,
          userId: req.user.id,
          payload: {
            auditRunId: auditRun.id,
            projectId: project.id,
            businessId: project.business_id,
            url: project.domain,
          },
          idempotencyKey: `seo_audit:${project.id}:${auditRun.id}`,
          maxAttempts: 3,
        });
        await supabaseAdmin.from("seo_audit_runs").update({ job_id: job.id }).eq("id", auditRun.id);
        const dispatch = await publishJobToQstash(job.id).catch((error) => {
          console.warn(`[SEO:${job.id}] QStash dispatch skipped:`, error?.message || error);
          return { published: false, reason: "QStash dispatch failed" };
        });
        if (!dispatch.published) {
          await processQueuedJob(job.id);
        }
        const { data: refreshedRun } = await supabaseAdmin.from("seo_audit_runs").select("*").eq("id", auditRun.id).single();
        return res.status(dispatch.published ? 202 : 200).json({ auditRun: refreshedRun || auditRun, job, dispatch });
      } catch (error: any) {
        if (["BUSINESS_ID_REQUIRED", "BUSINESS_NOT_FOUND", "PROFILE_NOT_FOUND", "FORBIDDEN_BUSINESS_ACCESS"].includes(error?.message)) {
          return handleAccessError(res, error);
        }
        return res.status(500).json({ error: safeErrorMessage(error) });
      }
    },
  );

  app.post("/api/seo/opportunities/:opportunityId/tasks", authenticate, async (req: any, res: any) => {
    if (!UUID_SCHEMA.safeParse(req.params.opportunityId).success) {
      return res.status(400).json({ error: "Invalid opportunity ID" });
    }
    try {
      const { data: opportunity, error } = await supabaseAdmin
        .from("seo_opportunities")
        .select("*")
        .eq("id", req.params.opportunityId)
        .single();
      if (error || !opportunity) return res.status(404).json({ error: "SEO opportunity not found" });
      await assertBusinessRoleAccess(req.user.id, opportunity.business_id, { customerRoles: ["business_admin", "staff"], platformPermissions: ["delivery"] });
      const { data: existingTask } = await supabaseAdmin.from("seo_tasks")
        .select("*")
        .eq("opportunity_id", opportunity.id)
        .not("status", "in", "(completed,cancelled)")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingTask) return res.json({ task: existingTask, existing: true });

      const { data: project } = await supabaseAdmin.from("seo_projects").select("approval_level").eq("id", opportunity.project_id).single();
      const { data: task, error: taskError } = await supabaseAdmin.from("seo_tasks").insert({
        business_id: opportunity.business_id,
        project_id: opportunity.project_id,
        opportunity_id: opportunity.id,
        issue_id: opportunity.source_issue_id,
        module_key: opportunity.module_key,
        task_type: "recommended_improvement",
        priority: opportunity.priority,
        title: opportunity.title,
        description: opportunity.why_it_matters,
        recommended_action: opportunity.recommended_action,
        fulfillment_type: opportunity.automation_available ? "hybrid" : "human",
        status: "planned",
        approval_state: project?.approval_level === "automatic" ? "not_required" : "pending",
        created_by: req.user.id,
      }).select("*").single();
      if (taskError) throw taskError;
      await supabaseAdmin.from("seo_opportunities").update({ status: "planned" }).eq("id", opportunity.id);
      await supabaseAdmin.from("seo_activity_logs").insert({
        business_id: opportunity.business_id,
        project_id: opportunity.project_id,
        user_id: req.user.id,
        event_type: "seo_improvement_requested",
        object_type: "seo_task",
        object_id: task.id,
        description: `Improvement requested: ${opportunity.title}`,
        metadata: { opportunityId: opportunity.id, moduleKey: opportunity.module_key },
      });
      return res.status(201).json({ task });
    } catch (error: any) {
      if (["BUSINESS_ID_REQUIRED", "BUSINESS_NOT_FOUND", "PROFILE_NOT_FOUND", "FORBIDDEN_BUSINESS_ACCESS"].includes(error?.message)) {
        return handleAccessError(res, error);
      }
      return res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  app.get("/api/seo/admin", authenticate, superAdminOnly, async (_req: any, res: any) => {
    try {
      const [config, modules, entitlements, businesses, websites, businessAccess, projects, jobs, usage] = await Promise.all([
        supabaseAdmin.from("seo_product_config").select("*").eq("id", "default").single(),
        supabaseAdmin.from("seo_module_definitions").select("*").order("sort_order"),
        supabaseAdmin.from("seo_plan_entitlements").select("*").order("plan_key").order("module_key"),
        supabaseAdmin.from("businesses").select("id,name,plan,status,subscription_status,created_at").order("created_at", { ascending: false }),
        supabaseAdmin.from("websites").select("id,business_id,status,updated_at").order("updated_at", { ascending: false }),
        supabaseAdmin.from("seo_business_entitlements").select("*"),
        supabaseAdmin.from("seo_projects").select("*"),
        supabaseAdmin.from("async_jobs").select("id,job_type,status,attempts,max_attempts,business_id,last_error,created_at,updated_at,completed_at").like("job_type", "seo_%").order("created_at", { ascending: false }).limit(100),
        supabaseAdmin.from("seo_usage").select("*").order("usage_date", { ascending: false }).limit(500),
      ]);
      const firstError = [config.error, modules.error, entitlements.error, businesses.error, websites.error, businessAccess.error, projects.error, jobs.error, usage.error].find(Boolean);
      if (firstError) throw firstError;
      const accessByBusiness = new Map((businessAccess.data || []).map((item: any) => [item.business_id, item]));
      const projectByBusiness = new Map((projects.data || []).map((item: any) => [item.business_id, item]));
      const websiteByBusiness = new Map<string, any>();
      for (const website of websites.data || []) {
        if (!websiteByBusiness.has(website.business_id)) websiteByBusiness.set(website.business_id, website);
      }
      const customers = (businesses.data || []).map((business: any) => ({
        ...business,
        website: websiteByBusiness.get(business.id) || null,
        seoEntitlement: accessByBusiness.get(business.id) || null,
        seoProject: projectByBusiness.get(business.id) || null,
      }));
      return res.json({
        productConfig: config.data,
        modules: modules.data || [],
        entitlements: entitlements.data || [],
        customers,
        jobs: jobs.data || [],
        usage: usage.data || [],
      });
    } catch (error: any) {
      return res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  app.patch("/api/seo/admin/config", authenticate, superAdminOnly, async (req: any, res: any) => {
    const body = validateBody(z.object({
      is_enabled: z.boolean().optional(),
      emergency_stop: z.boolean().optional(),
      product_name: z.string().trim().min(1).max(80).optional(),
      addon_prices: z.record(z.string(), z.object({ amount: z.number().nonnegative(), currency: z.string().trim().min(3).max(3) })).optional(),
      included_plan_keys: z.array(z.string().trim().min(1).max(80)).optional(),
      default_limits: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional(),
    }).strict(), req, res);
    if (!body) return;
    try {
      const { data, error } = await supabaseAdmin.from("seo_product_config").update({
        ...body,
        updated_by: req.user.id,
      }).eq("id", "default").select("*").single();
      if (error) throw error;
      await supabaseAdmin.from("seo_activity_logs").insert({
        user_id: req.user.id,
        event_type: "seo_product_config_updated",
        object_type: "seo_product_config",
        description: "SEO product configuration was updated.",
        metadata: { changedFields: Object.keys(body) },
      });
      return res.json({ productConfig: data });
    } catch (error: any) {
      return res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  app.patch("/api/seo/admin/modules/:moduleKey", authenticate, superAdminOnly, async (req: any, res: any) => {
    const moduleKey = String(req.params.moduleKey || "");
    if (!/^[a-z][a-z0-9_]{1,60}$/.test(moduleKey)) return res.status(400).json({ error: "Invalid module key" });
    const body = validateBody(z.object({
      is_enabled: z.boolean().optional(),
      customer_visible: z.boolean().optional(),
      default_approval_level: z.enum(["automatic", "ai_human", "manual_only"]).optional(),
      default_config: z.record(z.string(), z.any()).optional(),
      description: z.string().trim().max(500).optional(),
    }).strict(), req, res);
    if (!body) return;
    try {
      const { data, error } = await supabaseAdmin.from("seo_module_definitions").update(body).eq("module_key", moduleKey).select("*").single();
      if (error) throw error;
      return res.json({ module: data });
    } catch (error: any) {
      return res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  app.put("/api/seo/admin/entitlements/:planKey/:moduleKey", authenticate, superAdminOnly, async (req: any, res: any) => {
    const planKey = String(req.params.planKey || "");
    const moduleKey = String(req.params.moduleKey || "");
    if (!/^[a-z][a-z0-9_]{1,80}$/.test(planKey) || !/^[a-z][a-z0-9_]{1,60}$/.test(moduleKey)) {
      return res.status(400).json({ error: "Invalid plan or module key" });
    }
    const body = validateBody(z.object({
      access_mode: z.enum(["included", "addon", "unavailable"]),
      limits: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional(),
      configuration: z.record(z.string(), z.any()).optional(),
    }).strict(), req, res);
    if (!body) return;
    try {
      const { data, error } = await supabaseAdmin.from("seo_plan_entitlements").upsert({
        plan_key: planKey,
        module_key: moduleKey,
        access_mode: body.access_mode,
        limits: body.limits || {},
        configuration: body.configuration || {},
      }, { onConflict: "plan_key,module_key" }).select("*").single();
      if (error) throw error;
      return res.json({ entitlement: data });
    } catch (error: any) {
      return res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  app.post("/api/seo/admin/projects/activate", authenticate, superAdminOnly, async (req: any, res: any) => {
    const body = validateBody(z.object({
      businessId: UUID_SCHEMA,
      websiteId: UUID_SCHEMA,
      accessMode: z.enum(["included", "addon", "trial", "custom"]),
    }), req, res);
    if (!body) return;
    try {
      const [{ data: business, error: businessError }, { data: website, error: websiteError }] = await Promise.all([
        supabaseAdmin.from("businesses").select("id,name,custom_domain").eq("id", body.businessId).single(),
        supabaseAdmin.from("websites").select("id,business_id").eq("id", body.websiteId).eq("business_id", body.businessId).single(),
      ]);
      if (businessError || !business) return res.status(404).json({ error: "Business not found" });
      if (websiteError || !website) return res.status(404).json({ error: "Website not found for this business" });
      const { error: accessError } = await supabaseAdmin.from("seo_business_entitlements").upsert({
        business_id: body.businessId,
        status: "active",
        access_mode: body.accessMode,
        updated_by: req.user.id,
      }, { onConflict: "business_id" });
      if (accessError) throw accessError;
      const { data: project, error: projectError } = await supabaseAdmin.from("seo_projects").upsert({
        business_id: body.businessId,
        website_id: body.websiteId,
        name: `${business.name} SEO`,
        domain: business.custom_domain || null,
        adapter_type: "waas",
        status: "active",
        created_by: req.user.id,
      }, { onConflict: "website_id" }).select("*").single();
      if (projectError) throw projectError;
      await supabaseAdmin.from("seo_activity_logs").insert({
        business_id: body.businessId,
        project_id: project.id,
        user_id: req.user.id,
        event_type: "seo_project_activated",
        object_type: "seo_project",
        object_id: project.id,
        description: `SEO Growth was activated with ${body.accessMode} access.`,
      });
      return res.status(201).json({ project });
    } catch (error: any) {
      return res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  app.patch("/api/seo/admin/customers/:businessId", authenticate, superAdminOnly, async (req: any, res: any) => {
    if (!UUID_SCHEMA.safeParse(req.params.businessId).success) return res.status(400).json({ error: "Invalid business ID" });
    const body = validateBody(z.object({
      status: z.enum(["active", "disabled", "trial", "expired"]).optional(),
      access_mode: z.enum(["included", "addon", "trial", "custom"]).optional(),
      enabled_modules: z.array(z.string().trim().min(1).max(60)).nullable().optional(),
      limit_overrides: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional(),
      expires_at: z.string().datetime().nullable().optional(),
      notes: z.string().trim().max(2000).nullable().optional(),
    }).strict(), req, res);
    if (!body) return;
    try {
      const { data, error } = await supabaseAdmin.from("seo_business_entitlements").upsert({
        business_id: req.params.businessId,
        ...body,
        updated_by: req.user.id,
      }, { onConflict: "business_id" }).select("*").single();
      if (error) throw error;
      if (body.status === "disabled" || body.status === "expired") {
        await supabaseAdmin.from("seo_projects").update({ status: "disabled" }).eq("business_id", req.params.businessId);
      } else if (body.status === "active" || body.status === "trial") {
        await supabaseAdmin.from("seo_projects").update({ status: "active" }).eq("business_id", req.params.businessId);
      }
      return res.json({ entitlement: data });
    } catch (error: any) {
      return res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  app.post("/api/seo/admin/jobs/:jobId/retry", authenticate, superAdminOnly, async (req: any, res: any) => {
    if (!UUID_SCHEMA.safeParse(req.params.jobId).success) return res.status(400).json({ error: "Invalid job ID" });
    try {
      const { data: job, error: jobError } = await supabaseAdmin
        .from("async_jobs")
        .select("id,job_type,status,attempts,max_attempts,business_id,payload")
        .eq("id", req.params.jobId)
        .single();
      if (jobError || !job) return res.status(404).json({ error: "SEO job not found" });
      if (!String(job.job_type || "").startsWith("seo_")) return res.status(400).json({ error: "Only SEO jobs can be retried here" });
      if (job.status !== "failed") return res.status(409).json({ error: "Only failed SEO jobs can be retried" });
      const { data: queued, error: updateError } = await supabaseAdmin
        .from("async_jobs")
        .update({ status: "queued", attempts: 0, last_error: null, completed_at: null, updated_at: new Date().toISOString() })
        .eq("id", job.id)
        .select("id,job_type,status,attempts,max_attempts,business_id,created_at,updated_at,completed_at,last_error")
        .single();
      if (updateError) throw updateError;
      const dispatch = await publishJobToQstash(job.id).catch(() => ({ published: false }));
      if (!dispatch.published) await processQueuedJob(job.id);
      return res.json({ job: queued, dispatch });
    } catch (error: any) {
      return res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  // Recovery path when a browser disconnects or serverless execution stops
  // before an inline audit finishes. Reuse the existing authenticated Vercel
  // cron rather than relying on an in-browser polling session.
  app.get("/api/cron/website-audits", async (req: any, res: any) => {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: "Unauthorized" });
    try {
      const staleBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: stale, error: staleError } = await supabaseAdmin.from("async_jobs")
        .update({ status: "queued", locked_at: null, locked_by: null, run_after: new Date().toISOString() })
        .eq("job_type", "website_audit").eq("status", "processing").lt("locked_at", staleBefore)
        .select("id").limit(5);
      if (staleError) throw staleError;
      const { data: queued, error: pendingError } = await supabaseAdmin.from("async_jobs")
        .select("id").eq("job_type", "website_audit").eq("status", "queued")
        .lte("run_after", new Date().toISOString()).order("created_at", { ascending: true }).limit(4);
      if (pendingError) throw pendingError;
      const completed: string[] = [];
      const failures: string[] = [];
      await Promise.all((queued || []).map(async (job: any) => {
        const outcome = await processQueuedJob(job.id);
        if (outcome.processed && outcome.job?.status === "completed") completed.push(job.id);
        else if (outcome.processed) failures.push(job.id);
      }));
      res.setHeader("Cache-Control", "no-store");
      return res.json({ recoveredStaleJobs: stale?.length || 0, processed: (queued || []).length, completed: completed.length, failedAttempts: failures.length });
    } catch (err: any) {
      console.error("[WebsiteAuditCron] Retry failed", err?.message || err);
      return res.status(503).json({ error: "Website audit recovery temporarily unavailable." });
    }
  });

  app.get("/api/public/website-audit/jobs/:jobId",
    rateLimit({ windowMs: 60 * 1000, max: 30, keyPrefix: "public-website-audit-status" }),
    async (req: any, res: any) => {
    if (!UUID_SCHEMA.safeParse(req.params.jobId).success) {
      return res.status(400).json({ error: "Invalid job ID" });
    }
    const accessKey = String(req.query.key || "");
    const leadId = String(req.query.leadId || "");
    const leadEmail = String(req.query.leadEmail || "");
    if (!accessKey && (!UUID_SCHEMA.safeParse(leadId).success || !EMAIL_SCHEMA.safeParse(leadEmail).success)) {
      return res.status(400).json({ error: "Valid report access is required." });
    }

    try {
      const job = await getAsyncJob(supabaseAdmin, req.params.jobId);
      if (!job || job.job_type !== "website_audit") return res.status(404).json({ error: "Audit job not found" });
      const jobKey = String(job.payload?.reportAccessKey || "");
      const secureKeyMatch = accessKey.length === jobKey.length && accessKey.length >= 48 &&
        crypto.timingSafeEqual(Buffer.from(accessKey), Buffer.from(jobKey));
      const legacyMatch = !accessKey && job.payload?.leadId === leadId && job.payload?.leadEmail === leadEmail;
      if (!secureKeyMatch && !legacyMatch) return res.status(403).json({ error: "Report link is invalid." });

      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Referrer-Policy", "no-referrer");
      return res.json({
        id: job.id,
        businessName: job.payload?.businessName || "",
        status: job.status,
        deliveryStatus: job.status === "completed" ? job.result?.deliveryStatus || "unknown" : "pending",
        report: job.status === "completed" && job.result?.report
          ? normalizeWebsiteAuditResult(job.result.report)
          : null,
        error: job.status === "failed" ? job.last_error : null,
        updatedAt: job.updated_at,
        completedAt: job.completed_at,
      });
    } catch (error: any) {
      return res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  app.post(
    "/api/admin/website-audit",
    authenticate,
    rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 120,
      keyPrefix: "admin-website-audit",
      key: (req) => req.user?.id || getClientIp(req),
    }),
    async (req: any, res: any) => {
      const requestId = crypto.randomUUID();
      const body = validateBody(z.object({
        url: PUBLIC_URL_SCHEMA,
        businessName: z.string().trim().max(160).optional().nullable(),
        industry: z.string().trim().max(160).optional().nullable(),
      }), req, res);
      if (!body) return;

      try {
        const profile = await getProfileForUser(req.user.id);
        if (!canManageSalesOperations(profile)) {
          return res.status(403).json({ error: "Sales access required" });
        }

        const report = await runWebsiteAudit({
          url: body.url,
          businessName: body.businessName,
          industry: body.industry,
          requestId,
        });

        return res.json({ success: true, report, requestId });
      } catch (error: any) {
        console.warn(`[AdminWebsiteAudit:${requestId}]`, error?.message || error);
        const userMessage = error?.message === "PRIVATE_AUDIT_URL"
          ? "Private or local network URLs cannot be analysed."
          : error?.message === "INVALID_AUDIT_URL"
            ? "Enter a valid public website URL."
            : "The website could not be reached or analysed. Check the URL and try again.";
        return res.status(422).json({ error: userMessage, requestId });
      }
    },
  );

  app.post(
    "/api/public/website-audit",
    rateLimit({ windowMs: 60 * 60 * 1000, max: 8, keyPrefix: "website-audit" }),
    async (req, res) => {
      const requestId = crypto.randomUUID();
      const body = validateBody(z.object({
        url: PUBLIC_URL_SCHEMA,
        businessName: z.string().trim().max(160).optional().nullable(),
        industry: z.string().trim().max(160).optional().nullable(),
        leadId: UUID_SCHEMA.optional().nullable(),
        leadEmail: EMAIL_SCHEMA.optional().nullable(),
        async: z.boolean().optional(),
      }), req, res);
      if (!body) return;
      try {
        if (body.async) {
          await assertPublicAuditUrl(body.url);
          // Only send a report for an actual saved enquiry. A caller must not be
          // able to trigger unsolicited reports to arbitrary email addresses.
          if (!body.leadId || !body.leadEmail) return res.status(400).json({ error: "Save your review enquiry first." });
          const { data: matchingLead, error: leadLookupError } = await supabaseAdmin.from("leads")
            .select("id")
            .eq("id", body.leadId).eq("email", body.leadEmail).maybeSingle();
          if (leadLookupError) throw leadLookupError;
          if (!matchingLead) return res.status(403).json({ error: "The website review request could not be verified." });
          const { job, existing } = await createAsyncJob(supabaseAdmin, {
            jobType: "website_audit",
            payload: {
              url: body.url,
              businessName: body.businessName || null,
              industry: body.industry || null,
              leadId: body.leadId,
              leadEmail: body.leadEmail,
              reportAccessKey: crypto.randomBytes(32).toString("hex"),
            },
            idempotencyKey: `website_audit:${crypto.createHash("sha256").update(`${body.url}:${body.leadId || ""}:${body.leadEmail || ""}`).digest("hex")}`,
          });
          const dispatch = await publishJobToQstash(job.id).catch((error) => {
            console.warn(`[AsyncJobs:${job.id}] QStash dispatch skipped:`, error?.message || error);
            return { published: false, reason: "QStash dispatch failed" };
          });

          let status = job.status;
          let report: any = null;
          let jobError: string | null = null;

          // QStash is an acceleration path, not a hard dependency. If it is
          // unavailable, process the supported audit job in the current
          // request so public website reviews never remain queued forever.
          if (!dispatch.published) {
            const outcome = await processQueuedJob(job.id);
            const outcomeError = "error" in outcome ? outcome.error : null;
            const refreshedJob = await getAsyncJob(supabaseAdmin, job.id);
            status = refreshedJob?.status || outcome.job?.status || job.status;
            report =
              status === "completed" && refreshedJob?.result?.report
                ? normalizeWebsiteAuditResult(refreshedJob.result.report)
                : null;
            jobError =
              status === "failed"
                ? refreshedJob?.last_error || outcomeError || "Website audit failed."
                : null;
          }

          return res.status(dispatch.published && !existing ? 202 : 200).json({
            success: true,
            queued: status !== "completed",
            jobId: job.id,
            status,
            report,
            // The token belongs to this verified submitter; it is also emailed
            // on completion. No customer contact data is placed in the URL.
            reportUrl: `/website-audit?report=${encodeURIComponent(job.id)}&key=${encodeURIComponent(String(job.payload?.reportAccessKey || ""))}`,
            deliveryStatus: status === "completed" ? (await getAsyncJob(supabaseAdmin, job.id))?.result?.deliveryStatus || "unknown" : "pending",
            error: jobError,
            dispatch,
            requestId,
          });
        }

        const report = await runWebsiteAudit({
          url: body.url,
          businessName: body.businessName,
          industry: body.industry,
          leadId: body.leadId,
          leadEmail: body.leadEmail,
          requestId,
        });
        return res.json({ success: true, report, requestId });
      } catch (error: any) {
        console.warn(`[WebsiteAudit:${requestId}]`, error?.message || error);
        const userMessage = error?.message === "PRIVATE_AUDIT_URL" ? "Private or local network URLs cannot be analysed."
          : error?.message === "INVALID_AUDIT_URL" ? "Enter a valid public website URL."
          : "The website could not be reached or analysed. Check the URL and try again.";
        return res.status(422).json({ error: userMessage, requestId });
      }
    },
  );

  app.post(
    "/api/admin/prospects/:prospectId/website-review",
    authenticate,
    rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 60,
      keyPrefix: "admin-prospect-website-review",
      key: (req) => req.user?.id || getClientIp(req),
    }),
    async (req: any, res: any) => {
      if (!UUID_SCHEMA.safeParse(req.params.prospectId).success) {
        return res.status(400).json({ error: "Invalid prospect ID" });
      }

      const requestId = crypto.randomUUID();
      try {
        const profile = await getProfileForUser(req.user.id);
        if (!canManageSalesOperations(profile)) {
          return res.status(403).json({ error: "Sales access required" });
        }

        const { data: prospect, error: prospectError } = await supabaseAdmin
          .from("prospects")
          .select("id,name,domain,industry,location")
          .eq("id", req.params.prospectId)
          .maybeSingle();
        if (prospectError) throw prospectError;
        if (!prospect) return res.status(404).json({ error: "Prospect not found" });
        if (!prospect.domain) return res.status(422).json({ error: "Add a public website domain before preparing a review." });

        const rawUrl = /^https?:\/\//i.test(String(prospect.domain)) ? String(prospect.domain) : `https://${prospect.domain}`;
        const parsedUrl = PUBLIC_URL_SCHEMA.safeParse(rawUrl);
        if (!parsedUrl.success) return res.status(422).json({ error: "Enter a valid public website URL." });

        const report = await runWebsiteAudit({
          url: parsedUrl.data,
          businessName: prospect.name,
          industry: prospect.industry,
          requestId,
        });
        const reportAccessKey = crypto.randomBytes(32).toString("hex");
        const { job } = await createAsyncJob(supabaseAdmin, {
          jobType: "website_audit",
          payload: {
            url: parsedUrl.data,
            businessName: prospect.name || null,
            industry: prospect.industry || null,
            reportAccessKey,
            prospectId: prospect.id,
          },
        });
        await completeAsyncJob(supabaseAdmin, job.id, { report, deliveryStatus: "skipped" });

        const reportUrl = `${publicAppUrl()}/website-audit?report=${encodeURIComponent(job.id)}&key=${encodeURIComponent(reportAccessKey)}`;
        const preparedAt = new Date().toISOString();
        const { error: updateError } = await supabaseAdmin.from("prospects").update({
          preview_url: reportUrl,
          audit_report_url: reportUrl,
          preview_generated_at: preparedAt,
          last_audit_at: preparedAt,
          opportunity_level: report.findings.some((finding: any) => finding.priority === "high") ? "high" : "medium",
        }).eq("id", prospect.id);
        if (updateError) throw updateError;

        res.setHeader("Cache-Control", "private, no-store");
        return res.json({ success: true, report, reportUrl, preparedAt, findingCount: report.findings.length });
      } catch (error: any) {
        console.warn(`[AdminProspectWebsiteReview:${requestId}]`, error?.message || error);
        const userMessage = error?.message === "PRIVATE_AUDIT_URL"
          ? "Private or local network URLs cannot be analysed."
          : error?.message === "INVALID_AUDIT_URL"
            ? "Enter a valid public website URL."
            : "The website could not be reached or analysed. Check the URL and try again.";
        return res.status(422).json({ error: userMessage, requestId });
      }
    },
  );

  app.post(
    "/api/admin/ai-credit-balances/sync",
    authenticate,
    superAdminOnly,
    async (req: any, res: any) => {
      const payloadSchema = z.object({
        businessId: z.string().uuid(),
        userId: z.string().uuid(),
        monthlyCreditLimit: z.coerce.number().int().min(0).max(1_000_000),
        creditsUsed: z.coerce.number().int().min(0).max(1_000_000).optional(),
      });

      try {
        const payload = payloadSchema.parse(req.body || {});
        const creditsUsed = payload.creditsUsed ?? 0;
        const creditsRemaining = Math.max(payload.monthlyCreditLimit - creditsUsed, 0);

        const { data: existing, error: existingError } = await supabaseAdmin
          .from("ai_credit_balances")
          .select("id")
          .eq("user_id", payload.userId)
          .maybeSingle();

        if (existingError) throw existingError;

        const balancePayload = {
          user_id: payload.userId,
          business_id: payload.businessId,
          monthly_credit_limit: payload.monthlyCreditLimit,
          credits_used: creditsUsed,
          credits_remaining: creditsRemaining,
          updated_at: new Date().toISOString(),
        };

        const writeBalance = async (record: Record<string, any>) =>
          existing
            ? await supabaseAdmin
                .from("ai_credit_balances")
                .update(record)
                .eq("id", existing.id)
            : await supabaseAdmin
                .from("ai_credit_balances")
                .insert({
                  ...record,
                  created_at: new Date().toISOString(),
                });

        let result = await writeBalance(balancePayload);
        if (
          result.error &&
          (result.error.code === "42703" ||
            /business_id/i.test(result.error.message || ""))
        ) {
          const legacyBalancePayload = { ...balancePayload };
          delete (legacyBalancePayload as any).business_id;
          result = await writeBalance(legacyBalancePayload);
        }

        if (result.error) throw result.error;

        res.json({ success: true, creditsRemaining });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            error: "Invalid request body",
            details: error.issues.map((issue) => issue.message),
          });
        }
        console.error("AI credit balance sync failed:", error);
        res.status(500).json({
          error: error?.message || "Failed to sync AI credit balance",
        });
      }
    },
  );

  app.post(
    "/api/admin/businesses/:businessId/termination-export",
    authenticate,
    superAdminOnly,
    async (req: any, res: any) => {
      const businessId = req.params.businessId;
      if (!UUID_SCHEMA.safeParse(businessId).success) {
        return res.status(400).json({ error: "Invalid business ID" });
      }

      try {
        const { data: business, error: businessError } = await supabaseAdmin
          .from("businesses")
          .select("*")
          .eq("id", businessId)
          .maybeSingle();

        if (businessError) throw businessError;
        if (!business) return res.status(404).json({ error: "Business not found" });

        const readTableByBusiness = async (table: string) => {
          const { data, error } = await supabaseAdmin
            .from(table)
            .select("*")
            .eq("business_id", businessId);
          if (error) {
            console.warn(`[Termination Export] Skipping ${table}: ${error.message}`);
            return { rows: [], error: error.message };
          }
          return { rows: data || [], error: null };
        };

        const readNamedTable = async (key: string, table: string) => {
          const result = await readTableByBusiness(table);
          return [key, result] as const;
        };

        const ownerProfilePromise = business.owner_id
          ? supabaseAdmin
              .from("profiles")
              .select("*")
              .eq("id", business.owner_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null } as any);

        const businessProfilesPromise = supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("business_id", businessId);

        const [
          ownerProfileRes,
          businessProfilesRes,
          websitesResult,
          leadsResult,
          eventsResult,
          trackingResult,
          appointmentsResult,
          appointmentSettingsResult,
          postsResult,
          productsResult,
          ordersResult,
          localSeoResult,
          updateRequestsResult,
          supportResult,
          syncLogsResult,
          notificationsResult,
          campaignsResult,
          projectsResult,
          apiKeysResult,
        ] = await Promise.all([
          ownerProfilePromise,
          businessProfilesPromise,
          readNamedTable("websites", "websites"),
          readNamedTable("leads", "leads"),
          readNamedTable("analytics_events", "analytics_events"),
          readNamedTable("tracking_events", "tracking_events"),
          readNamedTable("appointments", "appointments"),
          readNamedTable("appointment_settings", "appointment_settings"),
          readNamedTable("posts", "posts"),
          readNamedTable("products", "products"),
          readNamedTable("orders", "orders"),
          readNamedTable("local_seo_pages", "local_seo_pages"),
          readNamedTable("monthly_update_requests", "monthly_update_requests"),
          readNamedTable("support_messages", "support_messages"),
          readNamedTable("sync_logs", "sync_logs"),
          readNamedTable("notifications", "notifications"),
          readNamedTable("campaigns", "campaigns"),
          readNamedTable("projects", "projects"),
          readNamedTable("api_keys", "api_keys"),
        ]);

        const tableResults = Object.fromEntries([
          websitesResult,
          leadsResult,
          eventsResult,
          trackingResult,
          appointmentsResult,
          appointmentSettingsResult,
          postsResult,
          productsResult,
          ordersResult,
          localSeoResult,
          updateRequestsResult,
          supportResult,
          syncLogsResult,
          notificationsResult,
          campaignsResult,
          projectsResult,
          apiKeysResult,
        ]);

        const ownerAuthUser =
          business.owner_id
            ? await supabaseAdmin.auth.admin
                .getUserById(business.owner_id)
                .then(({ data, error }) =>
                  error
                    ? { error: error.message, user: null }
                    : {
                        error: null,
                        user: data.user
                          ? {
                              id: data.user.id,
                              email: data.user.email,
                              created_at: data.user.created_at,
                              last_sign_in_at: data.user.last_sign_in_at,
                              app_metadata: data.user.app_metadata,
                              user_metadata: data.user.user_metadata,
                            }
                          : null,
                      },
                )
                .catch((error: any) => ({ error: error.message, user: null }))
            : { error: null, user: null };

        const websites = tableResults.websites?.rows || [];
        const websiteSnapshots = websites.map((website: any) => ({
          websiteId: website.id,
          status: website.status,
          fileName: `${sanitizeFileName(business.name)}-${sanitizeFileName(website.slug || website.id)}.html`,
          html: buildWebsiteHtmlSnapshot(website, business),
        }));

        const exportedAt = new Date().toISOString();
        const exportPackage = {
          exportMeta: {
            type: "paid_service_termination_export",
            exportedAt,
            exportedByUserId: req.user.id,
            exportedByEmail: req.user.email,
            businessId,
            businessName: business.name,
            version: "2026-06-21",
            notes: [
              "Generated by superadmin only.",
              "Use for paid service termination handover.",
              "Secrets such as API key hashes are included only as stored records; raw secret values cannot be recovered.",
              "Review personal data and legal obligations before sharing this package externally.",
            ],
          },
          business,
          owner: {
            profile: ownerProfileRes.data || null,
            authUser: ownerAuthUser,
          },
          profiles: {
            ownerProfileError: ownerProfileRes.error?.message || null,
            businessProfiles: businessProfilesRes.data || [],
            businessProfilesError: businessProfilesRes.error?.message || null,
          },
          data: Object.fromEntries(
            Object.entries(tableResults).map(([key, result]: any) => [
              key,
              result.rows,
            ]),
          ),
          readWarnings: Object.fromEntries(
            Object.entries(tableResults)
              .filter(([, result]: any) => result.error)
              .map(([key, result]: any) => [key, result.error]),
          ),
          websiteSnapshots,
          deployment: {
            subdomain: business.subdomain || null,
            customDomain: business.custom_domain || null,
            customDomainStatus: business.custom_domain_status || null,
            sslStatus: business.ssl_status || null,
            siteUrl: business.site_url || null,
          },
        };

        await supabaseAdmin
          .from("sync_logs")
          .insert({
            business_id: businessId,
            direction: "export",
            event_type: "termination_export_generated",
            status: "completed",
            message: `Termination export generated by ${req.user.email || req.user.id}`,
            payload: {
              exportedAt,
              exportedByUserId: req.user.id,
              dataSections: Object.keys(exportPackage.data),
              websiteCount: websites.length,
            },
          })
          .then(({ error }) => {
            if (error) console.warn("[Termination Export] Audit log skipped:", error.message);
          });

        const filename = `${sanitizeFileName(business.name)}-termination-export-${exportedAt.slice(0, 10)}.json`;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.status(200).send(JSON.stringify(exportPackage, null, 2));
      } catch (error: any) {
        console.error("[Termination Export] Failed:", error);
        return res.status(500).json({ error: safeErrorMessage(error) });
      }
    },
  );

  // Fallback Synthesis Generator for when AI fails (Permanent Fix)
  function getFallbackSynthesis(context: any) {
    const { businessName, industry, location, template } = context || {};
    const bName = businessName || "Your Business";
    const ind = industry || "Excellence";
    const loc = location || "Global";
    
    return {
      pages: [
        {
          title: "Home",
          slug: "index",
          sections: [
            {
              type: "Hero",
              content: {
                title: `${bName}: Leader in ${ind}`,
                subtitle: `High-performance ${ind} solutions tailored for ${loc}. Experience the next level of service and quality.`,
                cta: "Book a Consultation"
              }
            },
            {
              type: "Proof",
              content: {
                title: "Why Trust Us",
                stats: [
                  { label: "Successful Projects", value: "250+" },
                  { label: "Client Satisfaction", value: "99%" },
                  { label: "Expert Certifications", value: "15+" }
                ]
              }
            },
            {
              type: "Services",
              content: {
                title: "Our Core Offerings",
                items: [
                  { title: `${ind} Strategic Planning`, description: "A comprehensive roadmap designed to align with your objectives and drive measurable growth." },
                  { title: "Bespoke Implementation", description: "Precision execution of high-impact strategies tailored to your unique market positioning." },
                  { title: "24/7 Digital Support", description: "Around-the-clock assistance and monitoring to ensure your operations remain seamless and secure." }
                ]
              }
            },
            {
              type: "Benefits",
              content: {
                title: "The Competitive Edge",
                items: [
                  { title: "Innovation First", description: "We leverage the latest technology to keep you ahead of the curve." },
                  { title: "ROI Focused", description: "Every action we take is measured against your bottom line." },
                  { title: "Strategic Partnerships", description: "Access a global network of industry leaders through our ecosystem." }
                ]
              }
            },
            {
              type: "Process",
              content: {
                title: "How We Work",
                steps: [
                  { title: "Discovery", description: "Deep dive into your challenges and goals." },
                  { title: "Strategy", description: "Crafting a bespoke roadmap for success." },
                  { title: "Execution", description: "Precise implementation with agile feedback loops." }
                ]
              }
            },
            {
              type: "FAQ",
              content: {
                title: "Frequently Asked Questions",
                items: [
                  { question: "How long does a typical project take?", answer: "Most projects are completed within 4-6 weeks depending on complexity." },
                  { question: "Do you offer post-deployment support?", answer: "Yes, we provide 24/7 technical assistance and optimization services." }
                ]
              }
            },
            {
              type: "CTA",
              content: {
                title: "Transform Your Vision into Reality",
                description: "Contact us today to receive a customized proposal and strategy session.",
                buttonText: "Join the Network"
              }
            }
          ]
        }
      ],
      seo: { 
        title: `${bName} | ${ind} Solutions ${loc}`, 
        description: `Premium ${ind} services by ${bName}. Dedicated to excellence and innovation in ${loc}.`, 
        keywords: [bName, ind, loc, "services", "solutions"] 
      }
    };
  }

  // Internal content drafting route. This is intentionally separate from the
  // customer AI route: only platform staff can use it and every result stays a
  // draft until a human approves it.
  app.post(
    "/api/admin/ai/content-draft",
    authenticate,
    rateLimit({ windowMs: 60 * 1000, max: 20, keyPrefix: "internal-ai-content" }),
    async (req: any, res: any) => {
      const profile = await getProfileForUser(req.user.id).catch(() => null);
      if (!profile || !["super_admin", "platform_staff"].includes(profile.role)) {
        return res.status(403).json({ error: "Internal content drafting is restricted to platform staff" });
      }
      const flags = await refreshLaunchFlags();
      if (!flags.internal_ai_content_engine) {
        return res.status(404).json({ error: "Internal content engine is not enabled" });
      }
      const body = validateBody(z.object({
        brief: z.unknown(),
        businessId: UUID_SCHEMA.optional().nullable(),
      }), req, res);
      if (!body) return;
      const brief = InternalContentBriefSchema.safeParse(body.brief);
      if (!brief.success) return res.status(400).json({ error: "A complete verified content brief is required" });

      const usableKey = (value: unknown) => typeof value === "string" && value.trim().length >= 10 && !/TODO|PLACEHOLDER|YOUR_|^MY_|^GEMINI_/i.test(value.trim());
      const providers: Array<{ name: "openai" | "deepseek"; key: string }> = [
        { name: "openai", key: usableKey(process.env.OPENAI_API_KEY) ? String(process.env.OPENAI_API_KEY).trim() : "" },
        { name: "deepseek", key: usableKey(process.env.DEEPSEEK_API_KEY) ? String(process.env.DEEPSEEK_API_KEY).trim() : "" },
      ].filter((item): item is { name: "openai" | "deepseek"; key: string } => Boolean(item.key));
      if (!providers.length) return res.status(503).json({ error: "No internal AI provider is configured" });
      const provider = providers[0];
      const request = { prompt: buildInternalContentPrompt(brief.data), systemMessage: INTERNAL_CONTENT_SYSTEM_PROMPT, temperature: 0.2, maxTokens: 1800, isJson: true };
      try {
        const response = provider.name === "openai"
          ? await callOpenAI(provider.key, request, "gpt-5.6-luna")
          : await callDeepSeek(provider.key, request, "deepseek-chat");
        const draft = parseInternalContentDraft(response.text);
        const { data: log, error: logError } = await supabaseAdmin.from("ai_generation_logs").insert({
          user_id: req.user.id,
          project_id: body.businessId || null,
          feature_key: "internal_content_engine",
          provider: provider.name,
          model: provider.name === "openai" ? "gpt-5.6-luna" : "deepseek-chat",
          prompt_tokens: response.usage.promptTokens,
          output_tokens: response.usage.completionTokens,
          status: "completed",
          review_status: "draft",
          provenance: { verifiedFacts: brief.data.verifiedFacts, businessId: body.businessId || null, generatedBy: req.user.id },
        }).select("id,created_at,review_status").maybeSingle();
        if (logError) console.warn("Internal AI provenance log skipped:", logError.message);
        return res.status(201).json({ draft, generationId: log?.id || null, reviewStatus: "draft", provider: provider.name });
      } catch (error: any) {
        captureServerError(error, { requestId: req.requestId, phase: "internal_ai_content_draft" });
        return res.status(502).json({ error: "Internal content draft failed. No customer content was changed." });
      }
    },
  );

  app.get("/api/admin/ai/content-drafts", authenticate, superAdminOnly, async (req: any, res: any) => {
    const status = String(req.query.status || "draft");
    if (!["draft", "approved", "rejected", "published", "all"].includes(status)) {
      return res.status(400).json({ error: "Invalid review status" });
    }
    let query = supabaseAdmin.from("ai_generation_logs")
      .select("id,user_id,project_id,feature_key,provider,model,status,review_status,provenance,created_at")
      .in("feature_key", ["internal_content_engine", "internal_humanise_content", "internal_design_direction"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (status !== "all") query = query.eq("review_status", status);
    const { data, error } = await query;
    if (error) return res.status(503).json({ error: "Content drafts are temporarily unavailable" });
    return res.json({ drafts: data || [] });
  });

  app.post(
    "/api/admin/ai/humanise-content",
    authenticate,
    rateLimit({ windowMs: 60 * 1000, max: 20, keyPrefix: "internal-ai-humanise" }),
    async (req: any, res: any) => {
      const profile = await getProfileForUser(req.user.id).catch(() => null);
      if (!profile || !["super_admin", "platform_staff"].includes(profile.role)) {
        return res.status(403).json({ error: "Humanise Content is restricted to platform staff" });
      }
      const flags = await refreshLaunchFlags();
      if (!flags.internal_ai_content_engine) {
        return res.status(404).json({ error: "Internal content engine is not enabled" });
      }
      const body = validateBody(z.object({
        businessId: UUID_SCHEMA.optional().nullable(),
        input: z.object({
          businessName: z.string().trim().min(1).max(160),
          industry: z.string().trim().min(1).max(120),
          verifiedFacts: z.array(z.string().trim().min(1).max(300)).max(30).default([]),
          headline: z.string().trim().max(180).optional(),
          body: z.string().trim().max(4000).optional(),
          cta: z.string().trim().max(80).optional(),
        }),
      }), req, res);
      if (!body) return;
      const usableKey = (value: unknown) => typeof value === "string" && value.trim().length >= 10 && !/TODO|PLACEHOLDER|YOUR_|^MY_|^GEMINI_/i.test(value.trim());
      const providers: Array<{ name: "openai" | "deepseek"; key: string }> = [
        { name: "openai", key: usableKey(process.env.OPENAI_API_KEY) ? String(process.env.OPENAI_API_KEY).trim() : "" },
        { name: "deepseek", key: usableKey(process.env.DEEPSEEK_API_KEY) ? String(process.env.DEEPSEEK_API_KEY).trim() : "" },
      ].filter((item): item is { name: "openai" | "deepseek"; key: string } => Boolean(item.key));
      if (!providers.length) return res.status(503).json({ error: "No internal AI provider is configured" });
      const provider = providers[0];
      try {
        const request = { prompt: buildHumaniseContentPrompt(body.input), systemMessage: HUMANISE_CONTENT_SYSTEM_PROMPT, temperature: 0.15, maxTokens: 1400, isJson: true };
        const response = provider.name === "openai"
          ? await callOpenAI(provider.key, request, "gpt-5.6-luna")
          : await callDeepSeek(provider.key, request, "deepseek-chat");
        const draft = parseHumaniseContentDraft(response.text);
        const { data: log } = await supabaseAdmin.from("ai_generation_logs").insert({
          user_id: req.user.id,
          project_id: body.businessId || null,
          feature_key: "internal_humanise_content",
          provider: provider.name,
          model: provider.name === "openai" ? "gpt-5.6-luna" : "deepseek-chat",
          prompt_tokens: response.usage.promptTokens,
          output_tokens: response.usage.completionTokens,
          status: "completed",
          review_status: "draft",
          provenance: { verifiedFacts: body.input.verifiedFacts, businessId: body.businessId || null, generatedBy: req.user.id, action: "humanise_content" },
        }).select("id,created_at,review_status").maybeSingle();
        return res.status(201).json({ draft, generationId: log?.id || null, reviewStatus: "draft", provider: provider.name });
      } catch (error: any) {
        captureServerError(error, { requestId: req.requestId, phase: "internal_ai_humanise_content" });
        return res.status(502).json({ error: "Humanise Content draft failed. No customer content was changed." });
      }
    },
  );

  app.post(
    "/api/admin/ai/design-direction",
    authenticate,
    rateLimit({ windowMs: 60 * 1000, max: 20, keyPrefix: "internal-ai-design-direction" }),
    async (req: any, res: any) => {
      const profile = await getProfileForUser(req.user.id).catch(() => null);
      if (!profile || !["super_admin", "platform_staff"].includes(profile.role)) {
        return res.status(403).json({ error: "Design direction is restricted to platform staff" });
      }
      const flags = await refreshLaunchFlags();
      if (!flags.internal_ai_content_engine) return res.status(404).json({ error: "Internal AI engine is not enabled" });
      const body = validateBody(z.object({
        businessId: UUID_SCHEMA.optional().nullable(),
        input: z.object({
          industry: z.string().trim().min(1).max(120),
          businessName: z.string().trim().min(1).max(160),
          targetCustomer: z.string().trim().max(200).optional(),
          services: z.array(z.string().trim().min(1).max(120)).max(20).optional().default([]),
          photographyAvailable: z.boolean().optional().default(false),
          goal: z.string().trim().max(160).optional(),
        }),
      }), req, res);
      if (!body) return;
      const usableKey = (value: unknown) => typeof value === "string" && value.trim().length >= 10 && !/TODO|PLACEHOLDER|YOUR_|^MY_|^GEMINI_/i.test(value.trim());
      const providers: Array<{ name: "openai" | "deepseek"; key: string }> = [
        { name: "openai", key: usableKey(process.env.OPENAI_API_KEY) ? String(process.env.OPENAI_API_KEY).trim() : "" },
        { name: "deepseek", key: usableKey(process.env.DEEPSEEK_API_KEY) ? String(process.env.DEEPSEEK_API_KEY).trim() : "" },
      ].filter((item): item is { name: "openai" | "deepseek"; key: string } => Boolean(item.key));
      if (!providers.length) return res.status(503).json({ error: "No internal AI provider is configured" });
      const provider = providers[0];
      try {
        const request = { prompt: buildDesignDirectionPrompt(body.input), systemMessage: DESIGN_DIRECTOR_SYSTEM_PROMPT, temperature: 0.1, maxTokens: 1200, isJson: true };
        const response = provider.name === "openai"
          ? await callOpenAI(provider.key, request, "gpt-5.6-luna")
          : await callDeepSeek(provider.key, request, "deepseek-chat");
        const direction = parseDesignDirection(response.text);
        const { data: log } = await supabaseAdmin.from("ai_generation_logs").insert({
          user_id: req.user.id,
          project_id: body.businessId || null,
          feature_key: "internal_design_direction",
          provider: provider.name,
          model: provider.name === "openai" ? "gpt-5.6-luna" : "deepseek-chat",
          prompt_tokens: response.usage.promptTokens,
          output_tokens: response.usage.completionTokens,
          status: "completed",
          review_status: "draft",
          provenance: { businessId: body.businessId || null, generatedBy: req.user.id, action: "design_direction" },
        }).select("id,created_at,review_status").maybeSingle();
        return res.status(201).json({ direction, generationId: log?.id || null, reviewStatus: "draft", provider: provider.name });
      } catch (error: any) {
        captureServerError(error, { requestId: req.requestId, phase: "internal_ai_design_direction" });
        return res.status(502).json({ error: "Design direction draft failed. No website configuration was changed." });
      }
    },
  );

  app.patch("/api/admin/ai/content-drafts/:id", authenticate, superAdminOnly, async (req: any, res: any) => {
    const id = String(req.params.id || "");
    if (!UUID_SCHEMA.safeParse(id).success) return res.status(400).json({ error: "Invalid draft" });
    const body = validateBody(z.object({ reviewStatus: z.enum(["draft", "approved", "rejected", "published"]) }), req, res);
    if (!body) return;
    if (body.reviewStatus === "published") {
      const { data: draft } = await supabaseAdmin.from("ai_generation_logs").select("provenance,review_status").eq("id", id).in("feature_key", ["internal_content_engine", "internal_humanise_content", "internal_design_direction"]).maybeSingle();
      if (!draft || draft.review_status !== "approved") return res.status(409).json({ error: "Only an approved internal draft can be published" });
    }
    const { data, error } = await supabaseAdmin.from("ai_generation_logs").update({ review_status: body.reviewStatus }).eq("id", id).in("feature_key", ["internal_content_engine", "internal_humanise_content", "internal_design_direction"]).select("id,review_status,created_at").maybeSingle();
    if (error || !data) return res.status(404).json({ error: "Draft not found" });
    return res.json({ draft: data });
  });

  app.post("/api/subscription/cancellation-request", authenticate, async (req: any, res: any) => {
    const body = validateBody(z.object({ businessId: UUID_SCHEMA, reason: z.string().trim().min(3).max(1000) }), req, res);
    if (!body) return;
    try {
      await assertBusinessAdminAccess(req.user.id, body.businessId);
      const { data: businessOwner } = await supabaseAdmin.from("businesses").select("owner_id").eq("id", body.businessId).maybeSingle();
      const subscriptionUserId = businessOwner?.owner_id || req.user.id;
      const { data: subscription, error } = await supabaseAdmin.from("user_subscriptions")
        .select("id,status,minimum_term_end_date,renewal_state,cancel_at_period_end,cancellation_requested_at,cancellation_reason,stripe_subscription_id")
        .eq("user_id", subscriptionUserId)
        .in("status", ["active", "trialing", "past_due"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !subscription) return res.status(404).json({ error: "Active subscription not found" });
      const today = new Date();
      const termEnd = subscription.minimum_term_end_date ? new Date(`${subscription.minimum_term_end_date}T00:00:00Z`) : null;
      const beforeMinimumTerm = Boolean(termEnd && termEnd.getTime() > today.getTime());
      const alreadyRequested = subscription.renewal_state === "cancellation_requested" || subscription.renewal_state === "cancellation_scheduled" || subscription.renewal_state === "cancelled";
      if (alreadyRequested) {
        return res.status(200).json({
          request: { id: subscription.id, renewal_state: subscription.renewal_state, cancellation_requested_at: subscription.cancellation_requested_at, cancellation_reason: subscription.cancellation_reason, cancel_at_period_end: subscription.cancel_at_period_end, minimum_term_end_date: subscription.minimum_term_end_date },
          beforeMinimumTerm: Boolean(termEnd && termEnd.getTime() > today.getTime()),
          idempotent: true,
          message: subscription.renewal_state === "cancellation_scheduled" || subscription.renewal_state === "cancelled" ? "Your cancellation is already scheduled." : "Your cancellation request is already recorded.",
        });
      }
      if (!beforeMinimumTerm && !subscription.stripe_subscription_id && !alreadyRequested) {
        return res.status(409).json({ error: "Subscription is missing its Stripe subscription reference", code: "STRIPE_SUBSCRIPTION_REFERENCE_MISSING" });
      }
      if (!beforeMinimumTerm && subscription.stripe_subscription_id && !alreadyRequested) {
        try {
          const stripe = await getStripe();
          const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
          if (stripeSubscription.status === "canceled") {
            await supabaseAdmin.from("user_subscriptions").update({ status: "canceled", renewal_state: "cancelled", cancel_at_period_end: true, cancellation_requested_at: today.toISOString(), cancellation_reason: body.reason }).eq("id", subscription.id);
            return res.status(200).json({ beforeMinimumTerm: false, message: "Your subscription is already canceled." });
          }
          const updatedStripe = await stripe.subscriptions.update(subscription.stripe_subscription_id, { cancel_at_period_end: true });
          if (!updatedStripe.cancel_at_period_end) return res.status(502).json({ error: "Stripe did not confirm cancellation at period end", code: "STRIPE_CANCELLATION_NOT_CONFIRMED" });
        } catch (stripeError: any) {
          console.error("Stripe cancellation request failed", stripeError);
          return res.status(502).json({ error: "Cancellation could not be confirmed with Stripe", code: "STRIPE_CANCELLATION_FAILED" });
        }
      }
      const { data: updated, error: updateError } = await supabaseAdmin.from("user_subscriptions").update({
        renewal_state: "cancellation_requested",
        cancellation_requested_at: today.toISOString(),
        cancel_at_period_end: !beforeMinimumTerm,
        cancellation_reason: body.reason,
      }).eq("id", subscription.id).select("id,renewal_state,cancellation_requested_at,cancel_at_period_end,minimum_term_end_date").single();
      if (updateError) return res.status(503).json({ error: "Cancellation request could not be saved" });
      await supabaseAdmin.from("billing_lifecycle_events").insert({ business_id: body.businessId, event_type: "cancellation_requested", status: "open", source: "customer", metadata: { reason: body.reason, beforeMinimumTerm } });
      return res.status(alreadyRequested ? 200 : 202).json({ request: updated, beforeMinimumTerm, message: beforeMinimumTerm ? "Your request is recorded and will be reviewed against the minimum term." : "Your subscription will end at the current billing period." });
    } catch (error: any) {
      return handleAccessError(res, error);
    }
  });

  // Unified AI Generation Route
  app.post(
    "/api/ai/generate",
    authenticate,
    aiAccessGuard,
    rateLimit({
      windowMs: 60 * 1000,
      max: 30,
      keyPrefix: "ai-generate",
      key: (req) => req.user?.id || getClientIp(req),
    }),
    async (req: any, res: any) => {
    const aiGenerateBody = validateBody(
      z.object({
        project_id: UUID_SCHEMA.optional().nullable(),
        feature_key: z.string().trim().min(1).max(80),
        input: z.any(),
      }),
      req,
      res,
    );
    if (!aiGenerateBody) return;

    const { project_id, feature_key, input } = aiGenerateBody;
    const userId = req.user.id;

    // Helper to determine if we should fallback (Permanent Fix for missing keys or limits)
    const isSynthesis = feature_key === "website_draft" || feature_key === "synthesis" || feature_key === "generate_website";
    const shouldFallback = isSynthesis || feature_key === "copy" || feature_key === "rewrite_section";

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[Config Error] SUPABASE_SERVICE_ROLE_KEY is missing");
      return res.status(500).json({ 
        error: "Server configuration error", 
        details: "Supabase Service Role Key is missing. Please add SUPABASE_SERVICE_ROLE_KEY to your environment variables." 
      });
    }

    try {
      // 1. Get Feature Config
      const { data: feature, error: featureError } = await supabaseAdmin
        .from("ai_feature_costs")
        .select("*")
        .eq("feature_key", feature_key)
        .eq("is_active", true)
        .single();

      if (featureError || !feature) {
        return res.status(400).json({ error: "Feature not found or inactive" });
      }

      if (project_id) {
        try {
          await assertBusinessAccess(userId, project_id);
        } catch (accessError) {
          return handleAccessError(res, accessError);
        }
      }

      const { data: subscription, error: subError } = await supabaseAdmin
        .from("user_subscriptions")
        .select("plans(slug)")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (subError) {
        return res.status(503).json({ error: "Failed to verify subscription status" });
      }

      const planSlug = (subscription as any)?.plans?.slug || "starter";
      const { data: route, error: routeError } = await supabaseAdmin
        .from("ai_model_routes")
        .select("*")
        .eq("feature_key", feature_key)
        .eq("plan_slug", planSlug)
        .eq("is_active", true)
        .maybeSingle();

      if (routeError) {
        return res.status(503).json({ error: "Failed to resolve AI model route" });
      }

      const isUsableKey = (value: unknown) => {
        if (typeof value !== "string") return false;
        const key = value.trim();
        const upper = key.toUpperCase();
        return key.length >= 10
          && !["UNDEFINED", "NULL", "YOUR_API_KEY", "PLACEHOLDER"].includes(upper)
          && !/TODO|EXAMPLE|PLACEHOLDER|YOUR_|^MY_|^GEMINI_/.test(upper);
      };
      const firstUsableKey = (...values: unknown[]) =>
        values.find(isUsableKey)?.toString().trim() || "";

      const providerKeys: Record<string, string> = {
        openai: firstUsableKey(process.env.OPENAI_API_KEY),
      };
      const fallbackModels: Record<string, string> = {
        openai: "gpt-5.6-luna",
      };

      // Bennie Studio uses OpenAI for authenticated AI work. Public free previews
      // deliberately do not call any paid model.
      const selectedProvider = "openai";
      let selectedModel = String(route?.provider || "").toLowerCase() === "openai" && route?.model
        ? route.model
        : String(feature.default_provider || "").toLowerCase() === "openai" && feature.default_model
          ? feature.default_model
          : fallbackModels.openai;
      const apiKey = providerKeys.openai || "";

      if (!apiKey) {
        if (shouldFallback) {
          return res.json({
            output: isSynthesis
              ? getFallbackSynthesis(input?.context)
              : (feature_key === "copy"
                ? (input?.prompt?.substring(0, 50) + "..." || "High-quality professional content.")
                : "Alternative professional content generated."),
            fallback: true,
            warning: "AI_PROVIDER_UNAVAILABLE",
          });
        }
        return res.status(503).json({ error: "AI provider is not configured. No credits were charged." });
      }

      const temperature = route?.temperature ?? 0.2;
      const maxTokens = route?.max_output_tokens ?? 4096;
      const isChatGPTRequired = selectedProvider === "openai";

      // Validate and deduct atomically only after a usable provider has been resolved.
      
      let deductionResult: any = null;
      if (req.aiInternal) {
        deductionResult = { success: true, credits_charged: 0, internal: true };
      }
      const { data: rpcResult, error: deductionError } = req.aiInternal ? { data: null, error: null } : await supabaseAdmin.rpc("validate_and_deduct_credits", {
        p_user_id: userId,
        p_feature_key: feature_key,
        p_is_chatgpt: isChatGPTRequired
      });

      if (deductionError) {
        captureServerError(deductionError, {
          requestId: req.requestId,
          userId,
          featureKey: feature_key,
          phase: "ai_credit_deduction",
        });
        return res.status(503).json({
          error: "AI_CREDIT_CHECK_UNAVAILABLE",
          message: "AI-assisted editing could not be verified right now. No allowance was used. Please retry shortly.",
        });
      }

      if (!req.aiInternal) deductionResult = rpcResult;
      if (!deductionResult) {
        captureServerError(new Error("AI credit deduction returned no result"), {
          requestId: req.requestId,
          userId,
          featureKey: feature_key,
        });
        return res.status(503).json({
          error: "AI_CREDIT_CHECK_INVALID",
          message: "AI usage could not be verified right now. No credits were charged. Please retry shortly.",
        });
      }

      if (!deductionResult.internal && deductionResult.success === true && Number(deductionResult.credits_charged || 0) <= 0) {
        captureServerError(new Error("AI credit deduction returned no charge"), {
          requestId: req.requestId,
          userId,
          featureKey: feature_key,
          deductionResult,
        });
        return res.status(503).json({
          error: "AI_CREDIT_CHECK_INVALID",
          message: "AI usage could not be verified right now. No credits were charged. Please retry shortly.",
        });
      }

      if (!deductionResult?.success) {
        // Fallback for specific features if limit reached or premium restricted
        if (shouldFallback) {
          console.warn(`[AI] Restriction reached for ${feature_key} (Error: ${deductionResult.error}), serving fallback for user ${userId}`);
          return res.json({ 
            output: isSynthesis ? getFallbackSynthesis(input?.context) : (feature_key === "copy" ? (input?.prompt?.substring(0, 50) + "..." || "High-quality professional content.") : "Alternative professional content generated."),
            fallback: true,
            warning: deductionResult.error
          });
        }

        return res.status(402).json({ 
          error: deductionResult.error,
          message: deductionResult.error === "INSUFFICIENT_CREDITS" 
            ? "This plan's AI-assisted editing allowance has been reached. Use a managed update request or try again after it resets."
            : deductionResult.error === "DAILY_LIMIT_EXCEEDED"
            ? "Today's AI-assisted editing allowance has been reached. Try again tomorrow or use a managed update request."
            : deductionResult.error === "CHATGPT_NOT_ALLOWED"
            ? "This editing action is not included in the current plan. Use a managed update request or contact support."
            : "Action blocked by usage limits."
        });
      }

      const refundDeduction = async () => {
        if (deductionResult.internal) return true;
        const { data: refundResult, error: refundError } = await supabaseAdmin.rpc("refund_ai_credits", {
          p_user_id: userId,
          p_feature_key: feature_key,
          p_is_chatgpt: isChatGPTRequired,
        });
        if (refundError || !refundResult?.success) {
          captureServerError(refundError || new Error("AI refund returned no result"), {
            requestId: req.requestId,
            userId,
            featureKey: feature_key,
            phase: "ai_credit_refund",
          });
          return false;
        }
        deductionResult.credits_remaining = refundResult.credits_remaining;
        return true;
      };

      // Execute the resolved AI request.
      let aiResponse;
      try {
        const aiRequest = {
          prompt: typeof input === "string" ? input : (input?.prompt || JSON.stringify(input)),
          systemMessage: (typeof input === "object" ? input?.systemMessage : null) || feature.system_message || "You are a helpful AI assistant.",
          temperature,
          maxTokens,
          isJson: input?.isJson ?? true
        };

        if (selectedProvider === "openai") {
          aiResponse = await callOpenAI(apiKey, aiRequest, selectedModel);
        } else {
          aiResponse = await callDeepSeek(apiKey, aiRequest, selectedModel);
        }
      } catch (aiError: any) {
        const refunded = await refundDeduction();
        await supabaseAdmin.from("ai_generation_logs").insert({
          user_id: userId,
          project_id,
          feature_key,
          provider: selectedProvider,
          model: selectedModel,
          credits_charged: refunded ? 0 : deductionResult.credits_charged,
          status: "failed",
          error_message: String(aiError?.message || "AI provider failure").slice(0, 1000),
        });
        if (shouldFallback) {
          return res.json({ 
            output: feature_key === "copy" ? (input?.prompt?.substring(0, 50) + "..." || "High-quality professional content.") : getFallbackSynthesis(input?.context),
            fallback: true,
            credits_refunded: refunded,
          });
        }
        captureServerError(aiError, {
          requestId: req.requestId,
          userId,
          featureKey: feature_key,
          provider: selectedProvider,
          model: selectedModel,
        });
        return res.status(502).json({
          error: refunded
            ? "AI generation failed. Credits were refunded."
            : "AI generation failed and the automatic refund needs attention.",
        });
      }

      if (project_id) {
        const { error: usageSyncError } = await supabaseAdmin.rpc("increment_ai_usage", {
          biz_id: project_id,
          amount: deductionResult.credits_charged,
          use_case_name: feature_key,
          model_name: selectedModel,
        });
        if (usageSyncError) {
          captureServerError(usageSyncError, {
            requestId: req.requestId,
            userId,
            projectId: project_id,
            phase: "business_ai_usage_sync",
          });
        }
      }

      await supabaseAdmin.from("ai_generation_logs").insert({
        user_id: userId,
        project_id,
        feature_key,
        provider: selectedProvider,
        model: selectedModel,
        prompt_tokens: aiResponse.usage.promptTokens,
        output_tokens: aiResponse.usage.completionTokens,
        estimated_cost_usd:
          selectedProvider === "openai" && selectedModel === "gpt-5.6-luna"
            ? ((aiResponse.usage.promptTokens * 0.20) + (aiResponse.usage.completionTokens * 1.20)) / 1_000_000
            : null,
        credits_charged: deductionResult.credits_charged,
        status: "success"
      });

      res.json({
        success: true,
        provider: selectedProvider,
        model: selectedModel,
        feature_key,
        credits_charged: deductionResult.credits_charged,
        credits_remaining: deductionResult.credits_remaining,
        output: aiResponse.text
      });

    } catch (err: any) {
      console.error("AI generate route error:", err);
      res.status(500).json({ 
        error: "Internal server error during AI generation", 
        details: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined
      });
    }
  });

  app.options("/api/portfolio-leads", portfolioLeadCors, (_req, res) => res.status(204).end());
  app.post(
    "/api/portfolio-leads",
    portfolioLeadCors,
    rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 8,
      keyPrefix: "portfolio-leads",
      key: (req) => `${getClientIp(req)}:${String(req.headers.origin || "")}`,
    }),
    async (req, res) => {
      const contentType = String(req.headers["content-type"] || "").toLowerCase();
      const declaredLength = Number(req.headers["content-length"] || 0);
      if (!contentType.startsWith("application/json")) {
        return res.status(400).json({ error: "Content-Type must be application/json" });
      }
      const rawBodyLength = Buffer.isBuffer((req as any).rawBody) ? (req as any).rawBody.length : 0;
      if (declaredLength > PORTFOLIO_LEAD_MAX_BODY_BYTES || rawBodyLength > PORTFOLIO_LEAD_MAX_BODY_BYTES) {
        return res.status(400).json({ error: "Request body is too large" });
      }

      let leadBody;
      try {
        leadBody = normalizePortfolioLead(req.body);
      } catch {
        return res.status(400).json({ error: "Please check the enquiry details." });
      }
      if (leadBody.honeypot) {
        return res.status(400).json({ error: "Please check the enquiry details." });
      }

      const referrer = String(req.get("referer") || "").slice(0, 500) || null;
      const sourcePage = leadBody.sourcePage || referrer || "/";
      const automationSnapshot = buildInboundLeadSnapshot({
        message: leadBody.message,
        leadType: "portfolio_enquiry",
        source: "portfolio",
      });
      const notificationState = { status: "pending", attemptedAt: null as string | null };
      const rawFields = {
        industry: leadBody.industry || null,
        consent: true,
        consentGiven: true,
        consentTimestamp: leadBody.consentTimestamp,
        privacyPolicyVersion: leadBody.privacyPolicyVersion,
        utmSource: leadBody.utmSource || null,
        utmMedium: leadBody.utmMedium || null,
        utmCampaign: leadBody.utmCampaign || null,
        utmContent: leadBody.utmContent || null,
        utmTerm: leadBody.utmTerm || null,
        referrer,
        landingPage: sourcePage,
        notification: notificationState,
      };

      try {
        const payloads = [
          {
            name: leadBody.name,
            email: leadBody.email,
            message: leadBody.message,
            source: "portfolio",
            source_platform: "portfolio",
            source_page: sourcePage,
            form_name: "Portfolio enquiry",
            raw_fields: rawFields,
            consent_given: true,
            consent_timestamp: leadBody.consentTimestamp,
            referrer,
            campaign: leadBody.utmCampaign || null,
            status: "new",
            ...automationSnapshot,
          },
          {
            name: leadBody.name,
            email: leadBody.email,
            message: leadBody.message,
            source: "portfolio",
            source_page: sourcePage,
            form_name: "Portfolio enquiry",
            raw_fields: rawFields,
            status: "new",
          },
          {
            name: leadBody.name,
            email: leadBody.email,
            message: leadBody.message,
            source: "portfolio",
            status: "new",
          },
        ];
        let lead: any = null;
        let lastError: any = null;
        for (const payload of payloads) {
          const result = await supabaseAdmin.from("leads").insert(payload).select("id").single();
          if (!result.error) {
            lead = result.data;
            lastError = null;
            break;
          }
          lastError = result.error;
          const missingOptionalColumn = result.error.code === "42703" || /column|schema cache/i.test(String(result.error.message || ""));
          if (!missingOptionalColumn) break;
        }
        if (lastError || !lead?.id) throw lastError || new Error("LEAD_INSERT_FAILED");

        await supabaseAdmin.from("tracking_events").insert({
          event_type: "portfolio_lead_submitted",
          source_platform: "portfolio",
          source_page: sourcePage,
          metadata: { leadId: lead.id, industry: leadBody.industry || null, utmSource: leadBody.utmSource || null, utmMedium: leadBody.utmMedium || null, utmCampaign: leadBody.utmCampaign || null },
        }).then(({ error }) => {
          if (error) console.warn("Portfolio lead tracking skipped:", error.message);
        });

        const notificationAttemptedAt = new Date().toISOString();
        let notificationStatus = "sent";
        try {
          const recipient = process.env.SALES_REPLY_TO || platformSettings?.supportEmail || "support@bennietay.com";
          const resend = getResend();
          const safeName = escapePortfolioHtml(leadBody.name);
          const safeEmail = escapePortfolioHtml(leadBody.email);
          const safeIndustry = escapePortfolioHtml(leadBody.industry || "Not specified");
          const safeMessage = escapePortfolioHtml(leadBody.message).replace(/\n/g, "<br />");
          const { error: emailError } = await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || platformSettings?.emailFrom || "Bennie Studio <onboarding@resend.dev>",
            to: recipient,
            replyTo: leadBody.email,
            subject: `New portfolio enquiry from ${safeName}`,
            html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h2>New portfolio enquiry</h2><p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><p><strong>Industry:</strong> ${safeIndustry}</p><p><strong>Message:</strong><br />${safeMessage}</p><p style="font-size:12px;color:#64748b">Source: portfolio · ${escapePortfolioHtml(sourcePage)}</p></div>`,
          });
          if (emailError) throw new Error("EMAIL_SEND_FAILED");
        } catch (emailError) {
          notificationStatus = "failed";
          console.warn("Portfolio lead notification failed:", emailError instanceof Error ? emailError.message : "unknown error");
        }
        notificationState.status = notificationStatus;
        notificationState.attemptedAt = notificationAttemptedAt;
        await supabaseAdmin.from("leads").update({ raw_fields: { ...rawFields, notification: notificationState } }).eq("id", lead.id);
        await supabaseAdmin.from("sales_tasks").insert({
          lead_id: lead.id,
          title: "Respond to new portfolio enquiry",
          task_type: "new_lead_response",
          priority: automationSnapshot.automation_temperature === "Hot" ? "high" : "medium",
          due_at: automationSnapshot.next_follow_up_at,
          notes: automationSnapshot.automation_next_action,
        }).then(({ error }) => {
          if (error) console.warn("Portfolio lead sales task skipped:", error.message);
        });

        return res.status(201).json({ success: true, submissionId: `lead_${lead.id}`, message: "Enquiry received." });
      } catch (error) {
        console.error("Portfolio lead submission failed:", error instanceof Error ? error.message : "unknown error");
        return res.status(500).json({ error: "We could not receive your enquiry. Please try again." });
      }
    },
  );
  app.all("/api/portfolio-leads", portfolioLeadCors, (_req, res) => res.status(405).json({ error: "Method not allowed" }));

  app.post(
    "/api/platform-leads",
    rateLimit({ windowMs: 60 * 1000, max: 120, keyPrefix: "platform-leads-burst-v3" }),
    rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 200,
      keyPrefix: "platform-leads-identity-v3",
      key: (req) => String(
        req.body?.previewId
        || req.body?.email
        || getClientIp(req)
      ).trim().toLowerCase(),
    }),
    async (req, res) => {
      const leadBody = validateBody(
        z.object({
          name: TEXT_SCHEMA,
          email: EMAIL_SCHEMA,
          phone: z.string().trim().max(80).optional().nullable(),
          businessName: z.string().trim().max(160).optional().nullable(),
          industry: z.string().trim().max(160).optional().nullable(),
          websiteUrl: z.string().trim().max(500).optional().nullable(),
          message: OPTIONAL_TEXT_SCHEMA,
          sourcePage: z.string().trim().max(500).optional().nullable(),
          formName: z.string().trim().max(120).optional().nullable(),
          referralCode: z.string().trim().max(120).optional().nullable(),
          leadType: z.string().trim().max(80).optional().nullable(),
          country: z.string().trim().max(80).optional().nullable(),
          pageTitle: z.string().trim().max(180).optional().nullable(),
          utmSource: z.string().trim().max(120).optional().nullable(),
          utmMedium: z.string().trim().max(120).optional().nullable(),
          utmCampaign: z.string().trim().max(160).optional().nullable(),
          campaign: z.string().trim().max(160).optional().nullable(),
          referrer: z.string().trim().max(500).optional().nullable(),
          previewId: z.string().trim().max(160).optional().nullable(),
          market: z.string().trim().max(20).optional().nullable(),
          currency: z.string().trim().max(10).optional().nullable(),
          landingPage: z.string().trim().max(500).optional().nullable(),
          service: z.string().trim().max(160).optional().nullable(),
          selectedProduct: z.string().trim().max(80).optional().nullable(),
          turnstileToken: z.string().trim().max(4096).optional().nullable(),
          website: z.string().trim().max(200).optional().nullable(),
          marketingConsent: z.boolean().optional().default(false),
          firstTouch: z.record(z.string(), z.any()).optional(),
          lastTouch: z.record(z.string(), z.any()).optional(),
        }),
        req,
        res,
      );
      if (!leadBody) return;

      const {
        name,
        email,
        phone,
        businessName,
        industry,
        websiteUrl,
        message,
        sourcePage,
        formName,
        referralCode,
        leadType,
        country,
        pageTitle,
        utmSource,
        utmMedium,
        utmCampaign,
        campaign,
        referrer,
        previewId,
        market,
        currency,
        landingPage,
        service,
        selectedProduct,
        turnstileToken,
        website: honeypot,
        marketingConsent,
        firstTouch,
        lastTouch,
      } = leadBody;

      if (honeypot) {
        // Honeypot submissions are acknowledged but deliberately discarded.
        return res.status(200).json({ success: true, filtered: true });
      }

      if ((leadType || "").includes("preview")) {
        try {
          await verifyPreviewTurnstile(req, turnstileToken);
        } catch (verificationError: any) {
          const code = String(verificationError?.message || "");
          const status = code === "PREVIEW_PROTECTION_NOT_CONFIGURED" ? 503 : 403;
          return res.status(status).json({
            success: false,
            message: status === 503
              ? "Preview protection is temporarily unavailable."
              : "Please complete the human verification and try again.",
          });
        }
      }

      const automationSnapshot = buildInboundLeadSnapshot({ message, leadType, source: sourcePage, phone });

      const salesMessage = [
        leadType ? `Lead type: ${leadType}` : null,
        businessName ? `Business: ${businessName}` : null,
        industry ? `Industry: ${industry}` : null,
        country ? `Country/market: ${country}` : null,
        websiteUrl ? `Website URL: ${websiteUrl}` : null,
        referralCode ? `Referral code: ${referralCode}` : null,
        message ? `Message: ${message}` : null,
      ].filter(Boolean).join("\n");

      if (previewId) {
        const { data: existingLead, error: duplicateLookupError } = await supabaseAdmin
          .from("leads")
          .select("id")
          .eq("preview_id", previewId)
          .ilike("email", email)
          .maybeSingle();
        if (duplicateLookupError) return res.status(503).json({ success: false, message: "Lead intake is temporarily unavailable" });
        if (existingLead?.id) {
          // Re-submitting an already verified preview must not manufacture consent.
          // Only an explicitly checked optional box can add the marketing permission.
          if (marketingConsent) {
            const optedInAt = new Date().toISOString();
            const { data: previous } = await supabaseAdmin.from("leads").select("raw_fields").eq("id", existingLead.id).maybeSingle();
            const { error: consentError } = await supabaseAdmin.from("leads").update({
              marketing_consent: true,
              consent_timestamp: optedInAt,
              consent_text: "Optional checkbox: send me occasional website-improvement tips and relevant Bennie Studio offers; unsubscribe at any time.",
              raw_fields: { ...(previous?.raw_fields || {}), marketingConsentEmail: email.trim().toLowerCase(), marketingConsentSource: "Optional unchecked-by-default preview form checkbox", marketingConsent: true, marketingConsentAt: optedInAt },
            }).eq("id", existingLead.id);
            if (consentError) return res.status(503).json({ success: false, message: "Could not record consent. Please retry." });
          }
          return res.status(200).json({ success: true, leadId: existingLead.id, reused: true });
        }
      }

      const optedInAt = marketingConsent ? new Date().toISOString() : null;
      const explicitConsent = {
        marketing_consent: marketingConsent === true,
        consent_timestamp: optedInAt,
        consent_text: marketingConsent ? "Optional checkbox: send me occasional website-improvement tips and relevant Bennie Studio offers; unsubscribe at any time." : null,
      };
      const payloads: Record<string, any>[] = [
        {
          name,
          email,
          ...explicitConsent,
          phone,
          message: salesMessage || "Free website preview requested from landing page.",
          source_platform: "bennie_studio",
          source_page: sourcePage || req.get("referer") || "/",
          form_name: formName || "Website preview request",
          raw_fields: {
            businessName,
            industry,
            websiteUrl,
            referralCode,
            leadType: leadType || "free_website_preview",
            country,
            pageTitle,
            utmSource,
            utmMedium,
            utmCampaign,
            campaign,
            referrer,
            previewId,
            market,
            currency,
            landingPage,
            service,
            selectedProduct,
            firstTouch,
            lastTouch,
            intent: leadType || "free_website_preview",
            marketingConsent: marketingConsent === true,
            marketingConsentEmail: marketingConsent ? email.trim().toLowerCase() : null,
            marketingConsentSource: marketingConsent ? "Optional unchecked-by-default preview form checkbox" : null,
            marketingConsentAt: optedInAt,
          },
          status: "new",
          ...automationSnapshot,
          first_touch_source: firstTouch?.sourcePage || firstTouch?.utmSource || null,
          last_touch_source: lastTouch?.sourcePage || lastTouch?.utmSource || null,
          referrer: referrer || null,
          preview_id: previewId || null,
          market: market || null,
          currency: currency || null,
          campaign: campaign || utmCampaign || null,
        },
        {
          name,
          email,
          phone,
          message: salesMessage || "Free website preview requested from landing page.",
          source_page: sourcePage || req.get("referer") || "/",
          form_name: formName || "Website preview request",
          ...explicitConsent,
          status: "new",
        },
        {
          name,
          email,
          phone,
          message: salesMessage || "Free website preview requested from landing page.",
          ...explicitConsent,
          status: "new",
        },
      ];

      try {
        let lead: any = null;
        let lastError: any = null;

        for (const payload of payloads) {
          const { data, error } = await supabaseAdmin
            .from("leads")
            .insert(payload)
            .select("id")
            .single();

          if (!error) {
            lead = data;
            lastError = null;
            break;
          }

          lastError = error;
        }

        if (lastError) throw lastError;

        await supabaseAdmin.from("tracking_events").insert({
          event_type: "platform_lead_submitted",
          source_platform: "bennie_studio_public",
          source_page: sourcePage || req.get("referer") || "/",
          metadata: {
            leadId: lead?.id,
            businessName,
            industry,
            referralCode,
            leadType: leadType || "free_website_preview",
            country,
            pageTitle,
            utmSource,
            utmMedium,
            utmCampaign,
            firstTouch,
            lastTouch,
          },
        }).then(({ error }) => {
          if (error) console.warn("Platform lead tracking log failed:", error.message);
        });

        await supabaseAdmin.from("analytics_events").insert({
          event_type: "platform_preview_request",
          page_path: sourcePage || req.get("referer") || "/",
          metadata: {
            leadId: lead?.id,
            businessName,
            industry,
            referralCode,
            leadType: leadType || "free_website_preview",
            country,
            pageTitle,
            utmSource,
            utmMedium,
            utmCampaign,
          },
        }).then(({ error }) => {
          if (error) console.warn("Platform lead analytics log failed:", error.message);
        });

        await supabaseAdmin.from("sales_tasks").insert({
          lead_id: lead?.id,
          title: "Respond to new website enquiry",
          task_type: "new_lead_response",
          priority: automationSnapshot.automation_temperature === "Hot" ? "high" : "medium",
          due_at: automationSnapshot.next_follow_up_at,
          notes: automationSnapshot.automation_next_action,
        }).then(({ error }) => {
          if (error) console.warn("Platform lead sales task skipped:", error.message);
        });

        res.status(201).json({ success: true, leadId: lead?.id });
      } catch (err: any) {
        console.error("Platform lead submission error:", err);
        res.status(500).json({ success: false, message: "Failed to submit preview request" });
      }
    },
  );

  // Commercial data integrity is read-only. Never recreate historical leads from
  // anonymous tracking events: those events do not contain a verified enquiry.
  app.get(
    "/api/admin/revenue-health",
    authenticate,
    superAdminOnly,
    rateLimit({ windowMs: 60 * 1000, max: 30, keyPrefix: "admin-revenue-health", key: (req) => req.user?.id || getClientIp(req) }),
    async (_req: any, res: any) => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      try {
        const [
          leads, trackedLeads, previewEvents, checkoutEvents, salesTasks,
          prospects, messages, calls, proposals, customerServices, checkouts
        ] = await Promise.all([
          supabaseAdmin.from("leads").select("id,status,created_at,first_response_at,next_follow_up_at").order("created_at", { ascending: false }).limit(1000),
          supabaseAdmin.from("tracking_events").select("metadata").eq("event_type", "platform_lead_submitted").gte("created_at", since).limit(1000),
          supabaseAdmin.from("tracking_events").select("event_type,metadata").in("event_type", ["preview_generated", "preview_lead_captured"]).gte("created_at", since).limit(1000),
          supabaseAdmin.from("tracking_events").select("event_type,metadata").eq("event_type", "checkout_started").gte("created_at", since).limit(1000),
          supabaseAdmin.from("sales_tasks").select("id,lead_id,prospect_id,status,due_at,task_type").limit(2000),
          supabaseAdmin.from("prospects").select("id,outreach_status,converted_at").limit(2000),
          supabaseAdmin.from("sales_messages").select("direction,status,channel").gte("created_at", since).limit(2000),
          supabaseAdmin.from("sales_call_bookings").select("id,status,created_at").limit(1000),
          supabaseAdmin.from("proposals").select("id,status,created_at").limit(1000),
          supabaseAdmin.from("customer_services").select("id,status,stripe_subscription_id,product_slug").limit(1000),
          supabaseAdmin.from("stripe_webhook_events").select("event_type,status").gte("created_at", since).limit(1000),
        ]);
        const queries = [leads, trackedLeads, previewEvents, checkoutEvents, salesTasks, prospects, messages, calls, proposals, customerServices, checkouts];
        const failed = queries.find((response) => response.error);
        if (failed?.error) throw failed.error;
        const leadRows = leads.data || [];
        const taskRows = salesTasks.data || [];
        const leadIds = new Set(leadRows.map((row: any) => row.id));
        const trackedIds = Array.from(new Set((trackedLeads.data || []).map((event: any) => String(event.metadata?.leadId || "")).filter(Boolean)));
        const taskLeadIds = new Set(taskRows.filter((task: any) => task.status === "open" || task.status === "completed").map((task: any) => task.lead_id).filter(Boolean));
        const now = Date.now();
        const openTasks = taskRows.filter((task: any) => task.status === "open");
        const recentLeads = leadRows.filter((lead: any) => lead.created_at >= since);
        const completedCheckoutWebhooks = (checkouts.data || []).filter((event: any) => event.event_type === "checkout.session.completed" && event.status === "completed").length;
        res.setHeader("Cache-Control", "no-store");
        return res.json({
          periodDays: 30,
          generatedAt: new Date().toISOString(),
          counts: {
            actualLeads30d: recentLeads.length,
            trackedLeadEvents30d: (trackedLeads.data || []).length,
            trackedLeadIdsNotInActiveCRM: trackedIds.filter((id) => !leadIds.has(id)).length,
            newLeadsWithoutFollowUpTask: recentLeads.filter((lead: any) => lead.status === "new" && !taskLeadIds.has(lead.id)).length,
            pendingLeadResponses: leadRows.filter((lead: any) => lead.status === "new" && !lead.first_response_at).length,
            previewsGenerated30d: (previewEvents.data || []).filter((event: any) => event.event_type === "preview_generated").length,
            checkoutStartedEvents30d: (checkoutEvents.data || []).length,
            overdueOpenTasks: openTasks.filter((task: any) => task.due_at && Date.parse(task.due_at) <= now).length,
            openSalesTasks: openTasks.length,
            deliveredOutreach30d: (messages.data || []).filter((message: any) => message.direction === "outbound" && message.status === "delivered").length,
            bouncedOutreach30d: (messages.data || []).filter((message: any) => message.direction === "outbound" && message.status === "bounced").length,
            recordedInboundReplies30d: (messages.data || []).filter((message: any) => message.direction === "inbound").length,
            bookedCalls: (calls.data || []).filter((call: any) => !["cancelled", "declined"].includes(call.status)).length,
            proposals: (proposals.data || []).length,
            convertedProspects: (prospects.data || []).filter((prospect: any) => Boolean(prospect.converted_at)).length,
            activeStripeLinkedServices: (customerServices.data || []).filter((service: any) => service.status === "active" && Boolean(service.stripe_subscription_id)).length,
            checkoutCompletedWebhookEvents30d: completedCheckoutWebhooks,
          },
          notes: [
            "Tracking events are not proof of a saved or qualified lead.",
            "A checkout webhook is not proof of a currently paying customer; test transactions can be recorded.",
            "Missing lead references may be test records that were deleted. Do not recreate them from events.",
            "Counts represent records in the connected studio database, not external email or payments.",
          ],
        });
      } catch (error: any) {
        console.error("Revenue health overview failed:", error?.message || error);
        return res.status(503).json({ error: "Revenue integrity checks temporarily unavailable" });
      }
    },
  );

  // Operator-invoked, idempotent repair for real saved enquiries only.
  // Missing tracking event IDs are deliberately never turned into CRM leads.
  app.post(
    "/api/admin/revenue-health/repair-follow-ups",
    authenticate,
    superAdminOnly,
    rateLimit({ windowMs: 60 * 60 * 1000, max: 3, keyPrefix: "repair-sales-followups", key: (req) => req.user?.id || getClientIp(req) }),
    async (_req: any, res: any) => {
      try {
        const [leads, tasks] = await Promise.all([
          supabaseAdmin.from("leads").select("id,status,next_follow_up_at,automation_next_action,created_at").eq("status","new").limit(1000),
          supabaseAdmin.from("sales_tasks").select("lead_id,status,task_type").not("lead_id","is",null).limit(2000),
        ]);
        if (leads.error || tasks.error) throw leads.error || tasks.error;
        const tasked = new Set((tasks.data || []).filter((task: any) =>
          ["open", "completed"].includes(String(task.status)) && task.task_type === "new_lead_response"
        ).map((task: any) => task.lead_id));
        const missing = (leads.data || []).filter((lead: any) => !tasked.has(lead.id));
        let created = 0;
        const failed: string[] = [];
        for (const lead of missing) {
          const { error } = await supabaseAdmin.from("sales_tasks").insert({
            lead_id: lead.id,
            title: "Respond to saved website enquiry",
            task_type: "new_lead_response",
            status: "open",
            priority: "high",
            due_at: lead.next_follow_up_at || new Date().toISOString(),
            notes: lead.automation_next_action || "Review this saved enquiry and respond personally. Task recovered by revenue integrity check.",
          });
          if (error) failed.push(lead.id);
          else created++;
        }
        res.setHeader("Cache-Control", "no-store");
        return res.json({ reviewedNewLeads: (leads.data || []).length, created, failedCount: failed.length, success: failed.length === 0 });
      } catch (error: any) {
        console.error("Lead follow-up recovery failed:", error?.message || error);
        return res.status(503).json({ error: "Could not repair follow-up tasks. No lead records were modified." });
      }
    },
  );

  app.get(
    "/api/admin/leads",
    authenticate,
    rateLimit({ windowMs: 60 * 1000, max: 120, keyPrefix: "admin-leads", key: (req) => req.user?.id || getClientIp(req) }),
    async (req: any, res) => {
      try {
        const profile = await getProfileForUser(req.user.id);
        if (!canManageLeadInbox(profile)) {
          return res.status(403).json({ error: "Forbidden: sales access required" });
        }

        const { data, error } = await supabaseAdmin
          .from("leads")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(250);

        if (error) throw error;
        return res.json({ leads: data || [] });
      } catch (error: any) {
        if (error?.message === "PROFILE_NOT_FOUND") {
          return res.status(403).json({ error: "Profile not found" });
        }
        console.error("Admin lead inbox load failed:", error);
        return res.status(500).json({ error: "Failed to load enquiries" });
      }
    },
  );

  app.get(
    "/api/admin/appointments",
    authenticate,
    rateLimit({ windowMs: 60 * 1000, max: 120, keyPrefix: "admin-appointments", key: (req) => req.user?.id || getClientIp(req) }),
    async (req: any, res) => {
      try {
        const profile = await getProfileForUser(req.user.id);
        if (!canManageLeadInbox(profile)) return res.status(403).json({ error: "Forbidden: operations access required" });
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        const from = String(req.query.from || new Date().toISOString().slice(0, 10));
        const to = String(req.query.to || from);
        if (!datePattern.test(from) || !datePattern.test(to)) return res.status(400).json({ error: "Invalid appointment date range" });
        const { data, error } = await supabaseAdmin.from("appointments").select("id,customer_name,customer_email,service,date,time,status,business_id").gte("date", from).lte("date", to).order("date", { ascending: true }).order("time", { ascending: true }).limit(100);
        if (error) throw error;
        return res.json({ appointments: data || [], from, to });
      } catch (error: any) {
        if (error?.message === "PROFILE_NOT_FOUND") return res.status(403).json({ error: "Profile not found" });
        console.error("Admin appointments load failed:", error);
        return res.status(500).json({ error: "Failed to load appointments" });
      }
    },
  );

  app.post("/api/admin/proposals/:proposalId/create-checkout", authenticate, async (req: any, res) => {
    if (!UUID_SCHEMA.safeParse(req.params.proposalId).success) return res.status(400).json({ error: "Invalid proposal ID" });
    try {
      const profile = await getProfileForUser(req.user.id);
      if (!canManageLeadInbox(profile)) return res.status(403).json({ error: "Sales access required" });
      const { data: proposal, error } = await supabaseAdmin.from("proposals").select("*").eq("id", req.params.proposalId).single();
      if (error || !proposal) return res.status(404).json({ error: "Proposal not found" });
      if (proposal.checkout_url) return res.json({ checkoutUrl: proposal.checkout_url, reused: true });
      const market = String(proposal.config?.market || "US").toUpperCase();
      const currencyByMarket: Record<string, string> = { MY: "myr", SG: "sgd", GB: "gbp", UK: "gbp", US: "usd" };
      // Keep historical proposal amounts in their originally agreed currency; new proposals are explicitly USD.
      const currency = String(proposal.config?.currency || currencyByMarket[market] || "usd").toLowerCase();
      const monthlyAmount = Math.round(Number(proposal.value || proposal.amount || 0) * 100);
      const setupAmount = Math.round(Number(proposal.setup_fee || 0) * 100);
      if (!monthlyAmount) return res.status(400).json({ error: "Proposal monthly value is missing" });
      const stripe = await getStripe();
      const product = await stripe.products.create({ name: proposal.package_name || proposal.title || "Bennie Studio managed website", metadata: { proposalId: proposal.id } });
      const monthlyPrice = await stripe.prices.create({ product: product.id, currency, unit_amount: monthlyAmount, recurring: { interval: "month" }, metadata: { proposalId: proposal.id, chargeType: "monthly" } });
      const lineItems: Stripe.PaymentLinkCreateParams.LineItem[] = [{ price: monthlyPrice.id, quantity: 1 }];
      if (setupAmount > 0) {
        const setupPrice = await stripe.prices.create({ product: product.id, currency, unit_amount: setupAmount, metadata: { proposalId: proposal.id, chargeType: "setup" } });
        lineItems.push({ price: setupPrice.id, quantity: 1 });
      }
      const proposalTermMonths = getMinimumTermMonths({ minimumTermMonths: proposal.config?.commitmentMonths });
      const paymentLink = await stripe.paymentLinks.create({
        line_items: lineItems,
        billing_address_collection: "required",
        tax_id_collection: { enabled: true },
        after_completion: {
          type: "redirect",
          redirect: {
            url: `${publicAppUrl()}/signup?redirect=${encodeURIComponent(`/dashboard/onboarding?proposal=${proposal.id}`)}`,
          },
        },
        metadata: { proposalId: proposal.id, leadId: proposal.lead_id || "", businessId: proposal.business_id || "", planId: proposal.config?.planId || "website_growth_partner", market, termMonths: String(proposalTermMonths), termsVersion: COMMERCIAL_TERMS_VERSION, type: "proposal_subscription" },
        subscription_data: { metadata: { proposalId: proposal.id, leadId: proposal.lead_id || "", businessId: proposal.business_id || "", planId: proposal.config?.planId || "website_growth_partner", market, termMonths: String(proposalTermMonths), termsVersion: COMMERCIAL_TERMS_VERSION } },
      });
      await supabaseAdmin.from("proposals").update({ checkout_url: paymentLink.url, updated_at: new Date().toISOString() }).eq("id", proposal.id);
      await supabaseAdmin.from("proposal_events").insert({ proposal_id: proposal.id, event_type: "checkout_started", metadata: { paymentLinkId: paymentLink.id, createdBy: req.user.id } });
      return res.json({ checkoutUrl: paymentLink.url });
    } catch (error: any) {
      console.error("Proposal checkout creation failed:", error);
      return res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  app.get(
    "/api/public/proposals/:token",
    rateLimit({ windowMs: 60 * 1000, max: 60, keyPrefix: "public-proposal" }),
    async (req, res) => {
      if (!UUID_SCHEMA.safeParse(req.params.token).success) return res.status(400).json({ error: "Invalid proposal link" });
      try {
        const { data, error } = await supabaseAdmin
          .from("proposals")
          .select("id,title,package_name,value,setup_fee,status,expires_at,scope,outcome,config,checkout_url,proposal_token,view_count,first_viewed_at,last_viewed_at,businesses(name),leads(name,raw_fields)")
          .eq("proposal_token", req.params.token)
          .maybeSingle();
        if (error) throw error;
        if (!data) return res.status(404).json({ error: "Proposal not found" });
        const viewedAt = new Date().toISOString();
        const visitorKey = crypto.createHash("sha256").update(`${req.params.token}:${getClientIp(req)}:${req.get("user-agent") || ""}`).digest("hex").slice(0, 24);
        const dedupeAfter = new Date(Date.now() - 30 * 60000).toISOString();
        const { data: recentView } = await supabaseAdmin.from("proposal_events").select("id").eq("proposal_id", data.id).eq("event_type", "viewed").gte("created_at", dedupeAfter).contains("metadata", { visitorKey }).limit(1).maybeSingle();
        const viewCount = Number(data.view_count || 0) + (recentView ? 0 : 1);
        if (!recentView) {
          await supabaseAdmin.from("proposals").update({ first_viewed_at: data.first_viewed_at || viewedAt, last_viewed_at: viewedAt, view_count: viewCount }).eq("id", data.id);
          await supabaseAdmin.from("proposal_events").insert({ proposal_id: data.id, event_type: "viewed", metadata: { visitorKey } });
        }
        return res.json({ proposal: { ...data, view_count: viewCount, first_viewed_at: data.first_viewed_at || viewedAt, last_viewed_at: viewedAt } });
      } catch (error) {
        console.error("Public proposal load failed:", error);
        return res.status(500).json({ error: "Proposal could not be loaded" });
      }
    },
  );

  app.post(
    "/api/public/proposals/:token/accept",
    rateLimit({ windowMs: 60 * 1000, max: 12, keyPrefix: "public-proposal-accept" }),
    async (req, res) => {
      if (!UUID_SCHEMA.safeParse(req.params.token).success) return res.status(400).json({ error: "Invalid proposal link" });
      const body = validateBody(z.object({ email: EMAIL_SCHEMA, termsAccepted: z.literal(true) }), req, res);
      if (!body) return;
      try {
        const { data: proposal, error } = await supabaseAdmin
          .from("proposals")
          .select("id,lead_id,status,expires_at,checkout_url,config,leads(email)")
          .eq("proposal_token", req.params.token)
          .maybeSingle();
        if (error) throw error;
        if (!proposal) return res.status(404).json({ error: "Proposal not found" });
        if (proposal.expires_at && new Date(`${proposal.expires_at}T23:59:59Z`) < new Date()) return res.status(410).json({ error: "This proposal has expired. Please request an updated version." });
        const leadEmail = String((proposal as any).leads?.email || "").toLowerCase();
        if (leadEmail && leadEmail !== body.email.toLowerCase()) return res.status(403).json({ error: "Use the email address that received this proposal." });
        const acceptedAt = new Date().toISOString();
        const acceptance = { termsAcceptedAt: acceptedAt, termsVersion: COMMERCIAL_TERMS_VERSION };
        const { error: updateError } = await supabaseAdmin.from("proposals").update({
          status: "Accepted",
          accepted_at: acceptedAt,
          accepted_email: body.email.toLowerCase(),
          updated_at: acceptedAt,
          config: { ...((proposal as any).config || {}), acceptance },
        }).eq("id", proposal.id);
        if (updateError) throw updateError;
        if (proposal.lead_id) await supabaseAdmin.from("leads").update({ status: "won", automation_next_action: "Send secure checkout and onboarding link", next_follow_up_at: acceptedAt }).eq("id", proposal.lead_id);
        await supabaseAdmin.from("proposal_events").insert({ proposal_id: proposal.id, event_type: "accepted", metadata: { leadId: proposal.lead_id || null, ...acceptance } });
        await supabaseAdmin.from("tracking_events").insert({ event_type: "proposal_accepted", source_platform: "bennie_studio_public", source_page: `/proposal/${req.params.token}`, metadata: { proposalId: proposal.id, leadId: proposal.lead_id || null } }).then(({ error: trackingError }) => {
          if (trackingError) console.warn("Proposal acceptance tracking skipped:", trackingError.message);
        });
        return res.json({ success: true, checkoutUrl: proposal.checkout_url || null });
      } catch (error) {
        console.error("Proposal acceptance failed:", error);
        return res.status(500).json({ error: "Proposal could not be accepted" });
      }
    },
  );

  app.patch(
    "/api/admin/leads/:leadId/status",
    authenticate,
    rateLimit({ windowMs: 60 * 1000, max: 120, keyPrefix: "admin-lead-status", key: (req) => req.user?.id || getClientIp(req) }),
    async (req: any, res) => {
      if (!UUID_SCHEMA.safeParse(req.params.leadId).success) {
        return res.status(400).json({ error: "Invalid lead ID" });
      }

      const body = validateBody(
        z.object({
          status: z.enum(["new", "contacted", "qualified", "meeting", "proposal", "won", "lost", "closed"]).optional(),
          nextAction: z.string().trim().max(500).optional().nullable(),
          nextFollowUpAt: z.string().datetime().optional().nullable(),
          channel: z.enum(["email", "whatsapp", "phone", "manual"]).optional(),
          note: z.string().trim().max(1000).optional().nullable(),
          lossReason: z.string().trim().min(2).max(500).optional(),
        })
          .refine((value) => Object.values(value).some((item) => item !== undefined), { message: "At least one lead update is required" })
          .refine((value) => value.status !== "lost" || Boolean(value.lossReason), { message: "A lost reason is required", path: ["lossReason"] }),
        req,
        res,
      );
      if (!body) return;

      try {
        const profile = await getProfileForUser(req.user.id);
        if (!canManageLeadInbox(profile)) {
          return res.status(403).json({ error: "Forbidden: sales access required" });
        }

        const { data: existingLead, error: existingLeadError } = body.channel || body.lossReason
          ? await supabaseAdmin.from("leads").select("first_response_at,raw_fields").eq("id", req.params.leadId).maybeSingle()
          : { data: null, error: null };
        if (existingLeadError) throw existingLeadError;
        const updatePayload: Record<string, any> = {};
        if (body.status !== undefined) updatePayload.status = body.status;
        if (body.nextAction !== undefined) updatePayload.automation_next_action = body.nextAction;
        if (body.nextFollowUpAt !== undefined) updatePayload.next_follow_up_at = body.nextFollowUpAt;
        if (body.lossReason) updatePayload.raw_fields = { ...(existingLead?.raw_fields || {}), lossReason: body.lossReason };
        if (body.channel) {
          const respondedAt = new Date().toISOString();
          updatePayload.last_follow_up_at = respondedAt;
          if (!existingLead?.first_response_at) updatePayload.first_response_at = respondedAt;
          updatePayload.response_channel = body.channel;
          updatePayload.response_owner = req.user.id;
        }

        const { data, error } = await supabaseAdmin
          .from("leads")
          .update(updatePayload)
          .eq("id", req.params.leadId)
          .select("*")
          .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: "Lead not found" });
        if (body.channel) {
          const { error: taskError } = await supabaseAdmin.from("sales_tasks").update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("lead_id", data.id).eq("task_type", "new_lead_response").eq("status", "open");
          if (taskError) throw taskError;
        }
        const followUpTaskId = salesRecordId(`lead-follow-up:${data.id}`);
        if (["won", "lost", "closed"].includes(data.status) || body.nextFollowUpAt === null) {
          const { error: taskError } = await supabaseAdmin.from("sales_tasks").update({ status: "dismissed", updated_at: new Date().toISOString() })
            .eq("id", followUpTaskId).eq("status", "open");
          if (taskError) throw taskError;
        } else if (body.nextFollowUpAt !== undefined && body.nextFollowUpAt) {
          const { error: taskError } = await supabaseAdmin.from("sales_tasks").upsert({
            id: followUpTaskId, lead_id: data.id, title: data.automation_next_action || "Follow up with the lead",
            task_type: "follow_up", priority: "medium", due_at: body.nextFollowUpAt,
            status: "open", updated_at: new Date().toISOString(), metadata: { actorId: req.user.id },
          }, { onConflict: "id" });
          if (taskError) throw taskError;
        }
        if (body.channel || body.note) {
          await supabaseAdmin.from("tracking_events").insert({
            event_type: body.channel ? "sales_follow_up_logged" : "sales_note_added",
            source_platform: "bennie_studio_admin",
            source_page: "/admin/inbound_leads",
            metadata: {
              leadId: req.params.leadId,
              channel: body.channel || "manual",
              note: body.note || null,
              nextAction: body.nextAction || null,
              nextFollowUpAt: body.nextFollowUpAt || null,
              actorId: req.user.id,
              lossReason: body.lossReason || null,
            },
          }).then(({ error: trackingError }) => {
            if (trackingError) console.warn("Sales activity tracking skipped:", trackingError.message);
          });
        }
        return res.json({ lead: data });
      } catch (error: any) {
        if (error?.message === "PROFILE_NOT_FOUND") {
          return res.status(403).json({ error: "Profile not found" });
        }
        console.error("Admin lead status update failed:", error);
        return res.status(500).json({ error: "Failed to update lead status" });
      }
    },
  );

  app.delete(
    "/api/admin/leads/:leadId",
    authenticate,
    rateLimit({ windowMs: 60 * 1000, max: 30, keyPrefix: "admin-lead-delete", key: (req) => req.user?.id || getClientIp(req) }),
    async (req: any, res) => {
      if (!UUID_SCHEMA.safeParse(req.params.leadId).success) {
        return res.status(400).json({ error: "Invalid lead ID" });
      }

      try {
        const profile = await getProfileForUser(req.user.id);
        if (!canManageLeadInbox(profile)) {
          return res.status(403).json({ error: "Forbidden: sales access required" });
        }

        const { data: existingLead, error: lookupError } = await supabaseAdmin
          .from("leads")
          .select("id")
          .eq("id", req.params.leadId)
          .maybeSingle();
        if (lookupError) throw lookupError;
        if (!existingLead) return res.status(404).json({ error: "Lead not found" });

        const { error } = await supabaseAdmin.from("leads").delete().eq("id", req.params.leadId);
        if (error) throw error;
        return res.json({ success: true });
      } catch (error: any) {
        if (error?.message === "PROFILE_NOT_FOUND") {
          return res.status(403).json({ error: "Profile not found" });
        }
        console.error("Admin lead deletion failed:", error);
        return res.status(500).json({ error: "Failed to delete enquiry" });
      }
    },
  );

  app.post(
    "/api/platform-events",
    rateLimit({ windowMs: 60 * 1000, max: 120, keyPrefix: "platform-events" }),
    async (req, res) => {
      const eventBody = validateBody(
        z.object({
          eventType: z.string().trim().min(1).max(120),
          sourcePage: z.string().trim().max(500).optional().nullable(),
          label: z.string().trim().max(180).optional().nullable(),
          target: z.string().trim().max(500).optional().nullable(),
          visitorId: z.string().trim().max(120).optional().nullable(),
          sessionId: z.string().trim().max(120).optional().nullable(),
          metadata: z.record(z.string(), z.any()).optional().nullable(),
        }),
        req,
        res,
      );
      if (!eventBody) return;

      try {
        await supabaseAdmin.from("tracking_events").insert({
          event_type: eventBody.eventType,
          source_platform: "bennie_studio_public",
          source_page: eventBody.sourcePage || req.get("referer") || "/",
          metadata: {
            ...(eventBody.metadata || {}),
            label: eventBody.label || null,
            target: eventBody.target || null,
            visitorId: eventBody.visitorId || null,
            sessionId: eventBody.sessionId || null,
          },
        }).then(({ error }) => {
          if (error) throw error;
        });

        res.json({ success: true });
      } catch (err: any) {
        console.warn("Platform event tracking failed:", err?.message || err);
        res.status(202).json({ success: false, message: "Tracking event was not stored" });
      }
    },
  );

  // AI Usage Status Route
  app.get("/api/ai/usage", authenticate, aiAccessGuard, async (req: any, res: any) => {
    const userId = req.user.id;
    try {
      const { data: balance, error: balanceError } = await supabaseAdmin
        .from("ai_credit_balances")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      const { data: subscription } = await supabaseAdmin
        .from("user_subscriptions")
        .select("plans(*)")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      // Virtual balance if none exists yet
      const defaultBalance = {
        monthly_credit_limit: (subscription as any)?.plans?.monthly_credit_limit || 200,
        credits_used: 0,
        credits_remaining: (subscription as any)?.plans?.monthly_credit_limit || 200,
        reset_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
      };

      const { data: daily } = await supabaseAdmin
        .from("ai_daily_usage")
        .select("*")
        .eq("user_id", userId)
        .eq("usage_date", new Date().toISOString().split("T")[0])
        .maybeSingle();

      const { data: logs } = await supabaseAdmin
        .from("ai_generation_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      res.json({
        topupsEnabled: (await refreshLaunchFlags()).ai_credit_topups_enabled,
        balance: balance || defaultBalance,
        plan: (subscription as any)?.plans || null,
        dailyUsage: daily || { request_count: 0, credits_used: 0, chatgpt_action_count: 0 },
        recentLogs: logs || []
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch usage data" });
    }
  });

  // DeepSeek AI Proxy (Retained for backward compatibility if needed, but updated)
  app.post(
    "/api/ai/deepseek",
    authenticate,
    aiAccessGuard,
    rateLimit({
      windowMs: 60 * 1000,
      max: 20,
      keyPrefix: "deepseek",
      key: (req) => req.user?.id || getClientIp(req),
    }),
    async (req, res) => {
    const envKey = process.env.DEEPSEEK_API_KEY;
    
    const isValid = (k: any) => {
      if (!k || typeof k !== "string") return false;
      const ck = k.trim();
      return ck !== "" && ck !== "undefined" && !ck.includes("YOUR_") && !ck.includes("PLACEHOLDER") && ck !== "null";
    };

    const apiKey = isValid(envKey) ? envKey!.trim() : null;

    if (!apiKey) {
      return res.status(400).json({
        error: "DEEPSEEK_CONFIG_ERROR",
        message:
          "DeepSeek API Key is not configured or is a placeholder. Please add it to your environment or settings.",
      });
    }

    try {
      const deepSeekBody = validateBody(
        z.object({
          model: z.string().trim().max(120).optional(),
          messages: z.array(
            z.object({
              role: z.enum(["system", "user", "assistant"]),
              content: z.string().min(1).max(30_000),
            }),
          ).min(1).max(40),
          max_tokens: z.coerce.number().int().min(1).max(4096).optional(),
          response_format: z.object({ type: z.enum(["text", "json_object"]) }).optional(),
        }),
        req,
        res,
      );
      if (!deepSeekBody) return;

      const { model, messages, max_tokens, response_format } = deepSeekBody;

      const response = await axios.post(
        "https://api.deepseek.com/v1/chat/completions",
        {
          model: model || "deepseek-chat",
          messages,
          max_tokens: max_tokens || 4096,
          response_format: response_format || { type: "text" },
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            "Content-Type": "application/json",
          },
        },
      );

      res.json(response.data);
    } catch (error: any) {
      console.error(
        "DeepSeek Proxy Error:",
        error.response?.data || error.message,
      );
      res
        .status(error.response?.status || 500)
        .json(error.response?.data || { error: "Internal AI synthesis error" });
    }
  });

  app.get("/api/businesses/:businessId/api-keys", authenticate, async (req: any, res) => {
    const { businessId } = req.params;
    try {
      await assertBusinessAdminAccess(req.user.id, businessId);
      const { data, error } = await supabaseAdmin
        .from("api_keys")
        .select("id, business_id, key_prefix, name, last_used_at, expires_at, created_at, is_active")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      res.json(data || []);
    } catch (err: any) {
      if (
        [
          "BUSINESS_ID_REQUIRED",
          "BUSINESS_NOT_FOUND",
          "PROFILE_NOT_FOUND",
          "FORBIDDEN_BUSINESS_ACCESS",
        ].includes(err?.message)
      ) {
        return handleAccessError(res, err);
      }
      res.status(500).json({ error: safeErrorMessage(err) });
    }
  });

  app.post("/api/businesses/:businessId/api-keys", authenticate, async (req: any, res) => {
    const { businessId } = req.params;
    const { name, expiresAt } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "API key name is required" });
    }

    try {
      await assertBusinessAdminAccess(req.user.id, businessId);
      const rawKey = generateIntegrationApiKey();
      const prefix = rawKey.split(".")[0];

      const { data, error } = await supabaseAdmin
        .from("api_keys")
        .insert({
          business_id: businessId,
          name: name.trim(),
          key_prefix: prefix,
          key_hash: hashApiKey(rawKey),
          created_by: req.user.id,
          expires_at: expiresAt || null,
          is_active: true,
        })
        .select("id, business_id, key_prefix, name, last_used_at, expires_at, created_at, is_active")
        .single();

      if (error) throw error;
      res.status(201).json({ ...data, rawApiKey: rawKey });
    } catch (err: any) {
      if (
        [
          "BUSINESS_ID_REQUIRED",
          "BUSINESS_NOT_FOUND",
          "PROFILE_NOT_FOUND",
          "FORBIDDEN_BUSINESS_ACCESS",
        ].includes(err?.message)
      ) {
        return handleAccessError(res, err);
      }
      res.status(500).json({ error: safeErrorMessage(err) });
    }
  });

  app.delete("/api/businesses/:businessId/api-keys/:keyId", authenticate, async (req: any, res) => {
    const { businessId, keyId } = req.params;
    try {
      await assertBusinessAdminAccess(req.user.id, businessId);
      const { error } = await supabaseAdmin
        .from("api_keys")
        .update({ is_active: false })
        .eq("id", keyId)
        .eq("business_id", businessId);

      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      if (
        [
          "BUSINESS_ID_REQUIRED",
          "BUSINESS_NOT_FOUND",
          "PROFILE_NOT_FOUND",
          "FORBIDDEN_BUSINESS_ACCESS",
        ].includes(err?.message)
      ) {
        return handleAccessError(res, err);
      }
      res.status(500).json({ error: safeErrorMessage(err) });
    }
  });

  // Approval-first sales automation. Cron and manual runs share conditional
  // database claims and provider idempotency keys; uncertain sends need review.
  app.post("/api/admin/prospects/import", authenticate, async (req: any, res) => {
    try {
      const profile = await getProfileForUser(req.user.id);
      if (!canManageSalesOperations(profile)) return res.status(403).json({ error: "Sales access required" });
      const body = validateBody(z.object({ csv: z.string().min(1).max(500000) }), req, res);
      if (!body) return;
      let parsed;
      try { parsed = parseProspectCsv(body.csv); }
      catch (error: any) { return res.status(400).json({ error: error.message }); }
      const domains = new Set<string>(); const emails = new Set<string>(); const names = new Set<string>();
      const domainKey = (value: string) => String(value || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
      // Read every page rather than silently checking only PostgREST's first 1,000 records.
      for (let offset = 0; ; offset += 1000) {
        if (offset >= 20000) return res.status(409).json({ error: "Large-list import needs a dedicated duplicate review before adding more prospects." });
        const { data, error } = await supabaseAdmin.from("prospects").select("id,name,location,domain,contact_email").order("id").range(offset, offset + 999);
        if (error) throw error;
        for (const row of data || []) {
          if (row.domain) domains.add(domainKey(row.domain));
          if (row.contact_email) emails.add(row.contact_email.trim().toLowerCase());
          names.add(`${String(row.name || "").trim().toLowerCase()}|${String(row.location || "").trim().toLowerCase()}`);
        }
        if ((data || []).length < 1000) break;
      }
      const skippedReasons = { withinFile: parsed.duplicates, existingEmail: 0, existingDomain: 0, existingBusiness: 0 };
      const rows = parsed.prospects.filter((row) => {
        const businessKey = `${row.name.toLowerCase()}|${(row.location || "").toLowerCase()}`;
        if (row.contact_email && emails.has(row.contact_email)) { skippedReasons.existingEmail++; return false; }
        if (row.domain && domains.has(row.domain)) { skippedReasons.existingDomain++; return false; }
        if (names.has(businessKey)) { skippedReasons.existingBusiness++; return false; }
        if (row.domain) domains.add(row.domain);
        if (row.contact_email) emails.add(row.contact_email);
        names.add(businessKey);
        return true;
      });
      const duplicates = Object.values(skippedReasons).reduce((total, n) => total + n, 0);
      if (!rows.length) return res.json({ prospects: [], imported: 0, duplicates, skippedReasons, submitted: parsed.prospects.length + parsed.duplicates });
      // CSV upload is the operator's declaration of authority for manual outreach.
      // Preserve provenance without inventing a recipient opt-in or overriding suppression.
      const importedAt = new Date().toISOString();
      const { data, error } = await supabaseAdmin.from("prospects").insert(
        rows.map((row) => ({ ...attachUploaderOutreachDeclaration(row, importedAt), created_by: req.user.id })),
      ).select("*");
      if (error) throw error;
      // Importing prospects schedules evidence-based website checks without
      // blocking the CSV response or triggering any unsolicited emails.
      const importBatchId = crypto.randomUUID();
      const imported = data || [];
      const auditCandidates: Array<{ prospect: any; url: string }> = [];
      const auditSkipped: Array<{ prospectId: string; name: string; domain: string; status: string; reason: string }> = [];
      for (const prospect of imported) {
        const domain = String(prospect.domain || "").trim();
        if (!domain) {
          auditSkipped.push({ prospectId: prospect.id, name: prospect.name, domain: "", status: "no_website", reason: "No website URL supplied" });
          continue;
        }
        const url = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
        const parsedUrl = PUBLIC_URL_SCHEMA.safeParse(url);
        if (!parsedUrl.success || new URL(url).username || new URL(url).password) {
          auditSkipped.push({ prospectId: prospect.id, name: prospect.name, domain, status: "invalid_url", reason: "Invalid public website URL" });
          continue;
        }
        auditCandidates.push({ prospect, url: parsedUrl.data });
      }
      let auditJobs: any[] = [];
      let auditQueueError: string | null = null;
      if (auditCandidates.length) {
        const jobs = auditCandidates.map(({ prospect, url }) => ({
          job_type: "website_audit",
          status: "queued",
          user_id: req.user.id,
          priority: 80,
          max_attempts: 3,
          idempotency_key: `prospect-import-website-audit:${prospect.id}`,
          payload: {
            importBatchId, prospectId: prospect.id, url,
            businessName: String(prospect.name || "").slice(0, 160),
            industry: String(prospect.industry || "").slice(0, 160),
            reportAccessKey: crypto.randomBytes(32).toString("hex"),
          },
        }));
        const created = await supabaseAdmin.from("async_jobs").insert(jobs).select("id,status,payload");
        if (created.error) {
          auditQueueError = "Audit queue could not be created. The prospects were imported but their audits need retry.";
          console.warn("[ProspectImportAudits] Queue failed:", created.error.message);
        } else {
          auditJobs = created.data || [];
          // Dispatch jobs after responding. QStash runs the existing hardened audit
          // worker. The recurring cron independently recovers undelivered jobs.
          const dispatchJobs = async () => {
            let next = 0;
            const workers = Array.from({ length: Math.min(12, auditJobs.length) }, async () => {
              while (next < auditJobs.length) {
                const job = auditJobs[next++];
                try { await publishJobToQstash(job.id); }
                catch (dispatchError: any) { console.warn("[ProspectImportAudits] Dispatch deferred to recovery:", job.id, dispatchError?.message); }
              }
            });
            await Promise.all(workers);
          };
          const background = process.env.QSTASH_TOKEN && getJobWorkerSecret()
            ? dispatchJobs()
            : Promise.all(auditJobs.slice(0, 4).map(async (job: any) => {
                // Accelerate the first few audits even without an external queue.
                // All remaining jobs persist for authenticated batch processing
                // and scheduled recovery, independent of the uploader's browser.
                try { await processQueuedJob(job.id); }
                catch (error: any) { console.warn("[ProspectImportAudits] Initial processing deferred:", job.id, error?.message); }
              }));
          if (process.env.VERCEL === "1") waitUntil(background);
          else void background;
        }
      }
      res.setHeader("Cache-Control", "private, no-store");
      return res.status(201).json({
        prospects: imported, imported: imported.length, duplicates, skippedReasons,
        submitted: parsed.prospects.length + parsed.duplicates, importBatchId,
        auditsQueued: auditJobs.length, auditSkipped, auditQueueError,
      });
    } catch {
      return res.status(503).json({ error: "Prospect import could not be completed. Please retry; existing records will be checked again." });
    }
  });

  app.get("/api/admin/prospects/import-audits/:batchId", authenticate, async (req: any, res: any) => {
    if (!UUID_SCHEMA.safeParse(req.params.batchId).success) return res.status(400).json({ error: "Invalid import batch" });
    try {
      const profile = await getProfileForUser(req.user.id);
      if (!canManageSalesOperations(profile)) return res.status(403).json({ error: "Sales access required" });
      const { data, error } = await supabaseAdmin.from("async_jobs")
        .select("id,status,payload,result,last_error,created_at,updated_at,completed_at")
        .eq("job_type", "website_audit")
        .eq("user_id", req.user.id)
        .contains("payload", { importBatchId: req.params.batchId })
        .order("created_at", { ascending: true }).limit(500);
      if (error) throw error;
      const audits = (data || []).map((job: any) => {
        const report = job.status === "completed" ? job.result?.report : null;
        const findings = Array.isArray(report?.findings) ? report.findings : [];
        const reportKey = String(job.payload?.reportAccessKey || "");
        return {
          id: job.id,
          prospectId: job.payload?.prospectId || null,
          name: job.payload?.businessName || "Prospect",
          domain: job.payload?.url || "",
          status: job.status,
          findingsCount: report ? findings.length : null,
          highPriorityCount: report ? findings.filter((finding: any) => finding.priority === "high").length : null,
          summary: report ? String(report.summary || "") : null,
          topFinding: findings[0]?.title || null,
          reportUrl: report && reportKey ? `${publicAppUrl()}/website-audit?report=${encodeURIComponent(job.id)}&key=${encodeURIComponent(reportKey)}` : null,
          error: job.status === "failed" ? String(job.last_error || "The audit could not be completed.") : null,
          completedAt: job.completed_at,
        };
      });
      res.setHeader("Cache-Control", "private, no-store");
      return res.json({ importBatchId: req.params.batchId, audits });
    } catch (error: any) {
      return res.status(503).json({ error: "Import audit results are temporarily unavailable." });
    }
  });

  app.post("/api/admin/prospects/import-audits/:batchId/process", authenticate,
    rateLimit({ windowMs: 60 * 1000, max: 6, keyPrefix: "admin-import-audit-process", key: (req) => req.user?.id || getClientIp(req) }),
    async (req: any, res: any) => {
      if (!UUID_SCHEMA.safeParse(req.params.batchId).success) return res.status(400).json({ error: "Invalid import batch" });
      try {
        const profile = await getProfileForUser(req.user.id);
        if (!canManageSalesOperations(profile)) return res.status(403).json({ error: "Sales access required" });
        const { data, error } = await supabaseAdmin.from("async_jobs")
          .select("id").eq("job_type", "website_audit").eq("user_id", req.user.id)
          .contains("payload", { importBatchId: req.params.batchId })
          .eq("status", "queued").lte("run_after", new Date().toISOString())
          .order("created_at", { ascending: true }).limit(4);
        if (error) throw error;
        const results = await Promise.all((data || []).map((job: any) => processQueuedJob(job.id)));
        res.setHeader("Cache-Control", "private, no-store");
        return res.json({
          processed: results.filter((item) => item.processed).length,
          completed: results.filter((item) => item.job?.status === "completed").length,
          queuedForRetry: results.filter((item) => item.job?.status === "failed").length,
        });
      } catch (error: any) {
        console.warn("[ProspectImportAudits] Batch processing failed:", error?.message || error);
        return res.status(503).json({ error: "Automatic audit processing is temporarily unavailable." });
      }
    },
  );

  app.get("/api/admin/sales-inbox", authenticate, async (req: any, res: any) => {
    try {
      const profile = await getProfileForUser(req.user.id);
      if (!canManageSalesOperations(profile)) return res.status(403).json({ error: "Sales access required" });
      const { data: inbound, error: inboundError } = await supabaseAdmin
        .from("sales_messages")
        .select("id,prospect_id,direction,channel,recipient,subject,body_text,status,sent_at,created_at,classification,reply_to_message_id,provider_message_id")
        .eq("direction", "inbound").not("prospect_id", "is", null)
        .order("created_at", { ascending: false }).limit(200);
      if (inboundError) throw inboundError;
      const prospectIds = Array.from(new Set((inbound || []).map((message: any) => message.prospect_id).filter(Boolean)));
      if (!prospectIds.length) {
        res.setHeader("Cache-Control", "no-store");
        return res.json({ conversations: [] });
      }
      const [prospectsResult, tasksResult, outboundResult] = await Promise.all([
        supabaseAdmin.from("prospects").select("id,name,contact_email,outreach_status,next_follow_up_at,preview_url").in("id", prospectIds),
        supabaseAdmin.from("sales_tasks").select("id,prospect_id,task_type,status,due_at,metadata").in("prospect_id", prospectIds).eq("status", "open"),
        supabaseAdmin.from("sales_messages").select("id,prospect_id,status,subject,sent_at,created_at").in("prospect_id", prospectIds).eq("direction", "outbound").order("created_at", { ascending: false }).limit(500),
      ]);
      if (prospectsResult.error) throw prospectsResult.error;
      if (tasksResult.error) throw tasksResult.error;
      if (outboundResult.error) throw outboundResult.error;
      const prospectById = new Map((prospectsResult.data || []).map((prospect: any) => [prospect.id, prospect]));
      const tasksByProspect = new Map<string, any[]>();
      for (const task of tasksResult.data || []) {
        const rows = tasksByProspect.get(task.prospect_id) || [];
        rows.push(task);
        tasksByProspect.set(task.prospect_id, rows);
      }
      const latestOutboundByProspect = new Map<string, any>();
      for (const message of outboundResult.data || []) if (!latestOutboundByProspect.has(message.prospect_id)) latestOutboundByProspect.set(message.prospect_id, message);
      const latestInboundByProspect = new Map<string, any>();
      for (const message of inbound || []) if (!latestInboundByProspect.has(message.prospect_id)) latestInboundByProspect.set(message.prospect_id, message);
      const conversations = Array.from(latestInboundByProspect.values()).map((message: any) => {
        const openTasks = tasksByProspect.get(message.prospect_id) || [];
        const replyTask = openTasks.find((task: any) => task.task_type === "reply" && (!task.metadata?.messageId || task.metadata.messageId === message.provider_message_id));
        return {
          prospect: prospectById.get(message.prospect_id) || null,
          latestReply: { ...message, preview: String(message.body_text || "").replace(/\s+/g, " ").trim().slice(0, 180) },
          latestOutbound: latestOutboundByProspect.get(message.prospect_id) || null,
          unread: Boolean(replyTask),
          replyTaskId: replyTask?.id || null,
          openTasks,
        };
      });
      res.setHeader("Cache-Control", "no-store");
      return res.json({ conversations });
    } catch (error: any) {
      console.error("[Sales Inbox] Failed:", error?.message || error);
      return res.status(503).json({ error: "Sales inbox could not be loaded." });
    }
  });

  app.get("/api/admin/prospects/:prospectId/engagement", authenticate, async (req: any, res: any) => {
    const prospectId = String(req.params.prospectId || "");
    if (!UUID_SCHEMA.safeParse(prospectId).success) {
      return res.status(400).json({ error: "Invalid prospect ID" });
    }
    try {
      const profile = await getProfileForUser(req.user.id);
      if (!canManageSalesOperations(profile)) {
        return res.status(403).json({ error: "Sales access required" });
      }
      const [prospectResult, messagesResult, tasksResult, eventsResult] = await Promise.all([
        supabaseAdmin.from("prospects").select("*").eq("id", prospectId).maybeSingle(),
        supabaseAdmin.from("sales_messages").select("id,prospect_id,direction,channel,recipient,subject,body_text,status,sent_at,created_at,classification,reply_to_message_id,provider_message_id").eq("prospect_id", prospectId).order("created_at", { ascending: true }).limit(100),
        supabaseAdmin.from("sales_tasks").select("id,prospect_id,title,task_type,status,priority,due_at,notes,metadata,created_at,updated_at").eq("prospect_id", prospectId).order("created_at", { ascending: false }).limit(50),
        supabaseAdmin.from("deal_stage_events").select("id,from_stage,to_stage,event_type,metadata,created_at").eq("prospect_id", prospectId).order("created_at", { ascending: false }).limit(30),
      ]);
      if (prospectResult.error) throw prospectResult.error;
      if (!prospectResult.data) return res.status(404).json({ error: "Prospect not found" });
      if (messagesResult.error) throw messagesResult.error;
      if (tasksResult.error) throw tasksResult.error;
      if (eventsResult.error) console.warn("Prospect stage events unavailable:", eventsResult.error.message);
      res.setHeader("Cache-Control", "no-store");
      return res.json({
        prospect: prospectResult.data,
        messages: messagesResult.data || [],
        tasks: tasksResult.data || [],
        events: eventsResult.data || [],
      });
    } catch (error: any) {
      console.error("[Prospect Engagement] Failed:", error?.message || error);
      return res.status(503).json({ error: "Prospect conversation could not be loaded." });
    }
  });

  // Scheduled CRM reminders are distinct from marketing emails. Existing email
  // sequences still require documented consent and operator approval.
  app.post("/api/admin/prospects/:prospectId/follow-up-plan", authenticate, async (req: any, res: any) => {
    const id = String(req.params.prospectId || "");
    if (!UUID_SCHEMA.safeParse(id).success) return res.status(400).json({ error: "Invalid prospect ID" });
    const body = validateBody(z.object({
      days: z.array(z.number().int().min(1).max(365)).min(1).max(12),
      startAt: z.string().datetime({ offset: true }),
    }).strict(), req, res);
    if (!body) return;
    try {
      const profile = await getProfileForUser(req.user.id);
      if (!canManageSalesOperations(profile)) return res.status(403).json({ error: "Sales access required" });
      const { data: prospect, error } = await supabaseAdmin.from("prospects")
        .select("id,name,contact_email,status,outreach_status,converted_business_id").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!prospect) return res.status(404).json({ error: "Prospect not found" });
      if (prospect.converted_business_id || ["won", "lost"].includes(prospect.outreach_status)
        || ["lost", "converted"].includes(prospect.status)) {
        return res.status(409).json({ error: "Closed or converted prospects cannot receive a new follow-up plan." });
      }
      if (prospect.contact_email && await isSalesSuppressed(supabaseAdmin, normalizeSalesEmail(prospect.contact_email))) {
        return res.status(409).json({ error: "Recipient is suppressed. Follow-up scheduling is blocked." });
      }
      buildProspectFollowUpPlan(body.startAt, body.days);
      const result = await scheduleProspectFollowUpPlan(supabaseAdmin, prospect, req.user.id, body.startAt, body.days);
      return res.json(result);
    } catch (error: any) {
      if (/follow-up date|follow-ups|start date|future/i.test(String(error?.message || ""))) {
        return res.status(400).json({ error: error.message });
      }
      console.error("[Prospect Follow-up Plan] Failed:", error?.message || error);
      return res.status(503).json({ error: "Follow-up plan could not be saved." });
    }
  });

  app.post("/api/admin/prospects/bulk", authenticate, async (req: any, res: any) => {
    const body = validateBody(z.object({
      ids: z.array(UUID_SCHEMA).min(1).max(100),
      action: z.enum(["stop_follow_up", "delete"]),
    }).strict(), req, res);
    if (!body) return;
    try {
      const profile = await getProfileForUser(req.user.id);
      if (!canManageSalesOperations(profile)) return res.status(403).json({ error: "Sales access required" });
      return res.json(await bulkManageProspectFollowUps(supabaseAdmin, body.ids, body.action));
    } catch (error: any) {
      const message = String(error?.message || "");
      if (/Some selected prospects|Converted customer|currently sending|Some prospects|Select 1 to 100/.test(message)) {
        return res.status(409).json({ error: message });
      }
      console.error("[Prospect Bulk Action] Failed:", message);
      return res.status(503).json({ error: "Bulk action could not be completed. Refresh the list before retrying." });
    }
  });

  app.post("/api/admin/prospects/:prospectId/follow-up", authenticate, async (req: any, res: any) => {
    const prospectId = String(req.params.prospectId || "");
    if (!UUID_SCHEMA.safeParse(prospectId).success) return res.status(400).json({ error: "Invalid prospect ID" });
    const body = validateBody(z.object({
      dueAt: z.string().datetime({ offset: true }).nullable(),
      note: z.string().trim().max(1000).optional().nullable(),
    }).strict(), req, res);
    if (!body) return;
    try {
      const profile = await getProfileForUser(req.user.id);
      if (!canManageSalesOperations(profile)) return res.status(403).json({ error: "Sales access required" });
      const { data: prospect, error: prospectError } = await supabaseAdmin.from("prospects").select("id,name").eq("id", prospectId).maybeSingle();
      if (prospectError) throw prospectError;
      if (!prospect) return res.status(404).json({ error: "Prospect not found" });
      const now = new Date().toISOString();
      await supabaseAdmin.from("sales_tasks").update({ status: "dismissed", updated_at: now })
        .eq("prospect_id", prospectId).eq("task_type", "follow_up").eq("status", "open");
      let task: any = null;
      if (body.dueAt) {
        const taskId = salesRecordId(`manual-follow-up:${prospectId}:${body.dueAt.slice(0, 10)}`);
        const { data, error } = await supabaseAdmin.from("sales_tasks").upsert({
          id: taskId, prospect_id: prospectId, title: `Follow up with ${prospect.name}`, task_type: "follow_up",
          status: "open", priority: "medium", due_at: body.dueAt, notes: body.note || null,
          metadata: { source: "prospect_explorer", actorId: req.user.id }, updated_at: now,
        }, { onConflict: "id" }).select("*").single();
        if (error) throw error;
        task = data;
      }
      const { data: updatedProspect, error: updateError } = await supabaseAdmin.from("prospects")
        .update({ next_follow_up_at: body.dueAt, updated_at: now }).eq("id", prospectId).select("*").single();
      if (updateError) throw updateError;
      return res.json({ prospect: updatedProspect, task });
    } catch (error: any) {
      console.error("[Prospect Follow-up] Failed:", error?.message || error);
      return res.status(503).json({ error: "Follow-up could not be saved." });
    }
  });

  app.patch("/api/admin/sales-tasks/:taskId", authenticate, async (req: any, res: any) => {
    const taskId = String(req.params.taskId || "");
    if (!UUID_SCHEMA.safeParse(taskId).success) {
      return res.status(400).json({ error: "Invalid task ID" });
    }
    const body = validateBody(
      z.object({ status: z.enum(["open", "completed", "dismissed"]) }).strict(),
      req,
      res,
    );
    if (!body) return;
    try {
      const profile = await getProfileForUser(req.user.id);
      if (!canManageSalesOperations(profile)) {
        return res.status(403).json({ error: "Sales access required" });
      }
      const { data, error } = await supabaseAdmin
        .from("sales_tasks")
        .update({ status: body.status, updated_at: new Date().toISOString() })
        .eq("id", taskId)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: "Sales task not found" });
      if (data.prospect_id && data.task_type === "follow_up") {
        await syncProspectNextFollowUp(supabaseAdmin, data.prospect_id);
      }
      return res.json({ task: data });
    } catch (error: any) {
      console.error("[Sales Task Update] Failed:", error?.message || error);
      return res.status(503).json({ error: "Sales task could not be updated." });
    }
  });

  app.post("/api/admin/prospects/:prospectId/convert", authenticate, async (req: any, res: any) => {
    const prospectId = String(req.params.prospectId || "");
    if (!UUID_SCHEMA.safeParse(prospectId).success) {
      return res.status(400).json({ error: "Invalid prospect ID" });
    }
    const body = validateBody(
      z.object({
        productSlug: z.enum(["personal-profile", "managed-website", "website-growth", "growth-partner", "custom-website"]).default("managed-website"),
        market: z.enum(["MY", "SG", "GB", "INTL"]).default("INTL"),
        termMonths: z.number().int().min(1).max(120).optional(),
        setupFee: z.number().finite().min(0).max(1000000).default(0),
        recurringFee: z.number().finite().min(0).max(1000000).default(0),
        customerName: z.string().trim().min(1).max(160).optional(),
        contactName: z.string().trim().max(160).optional().nullable(),
        contactEmail: z.string().trim().email().max(320).optional().nullable(),
        contactPhone: z.string().trim().max(60).optional().nullable(),
        contactWhatsapp: z.string().trim().max(60).optional().nullable(),
      }).strict(),
      req,
      res,
    );
    if (!body) return;

    try {
      const profile = await getProfileForUser(req.user.id);
      if (!canManageSalesOperations(profile)) {
        return res.status(403).json({ error: "Sales access required" });
      }

      const { data: prospect, error: prospectError } = await supabaseAdmin
        .from("prospects")
        .select("*")
        .eq("id", prospectId)
        .maybeSingle();
      if (prospectError) throw prospectError;
      if (!prospect) return res.status(404).json({ error: "Prospect not found" });

      const now = new Date().toISOString();
      const businessId = prospect.converted_business_id || salesRecordId(`prospect-business:${prospectId}`);
      const projectId = salesRecordId(`prospect-project:${prospectId}`);
      const onboardingId = salesRecordId(`prospect-onboarding:${prospectId}`);
      const currencyByMarket: Record<string, string> = { MY: "MYR", SG: "SGD", GB: "GBP", INTL: "USD" };
      const plan = ["website-growth", "growth-partner"].includes(body.productSlug) ? "growth" : "business";
      let effectiveTermMonths = body.termMonths || COMMERCIAL_DEFAULT_COMMITMENT_MONTHS;
      if (body.productSlug !== "custom-website" && body.termMonths === undefined) {
        const { data: catalogueProduct } = await supabaseAdmin
          .from("commercial_products")
          .select("id,commercial_market_prices!inner(market,minimum_term_months,active)")
          .eq("slug", body.productSlug)
          .eq("commercial_market_prices.market", body.market)
          .eq("commercial_market_prices.active", true)
          .maybeSingle();
        const cataloguePrice = catalogueProduct && (Array.isArray((catalogueProduct as any).commercial_market_prices)
          ? (catalogueProduct as any).commercial_market_prices[0]
          : (catalogueProduct as any).commercial_market_prices);
        effectiveTermMonths = getMinimumTermMonths({ minimumTermMonths: cataloguePrice?.minimum_term_months });
      }

      let ownerId: string | null = null;
      const prospectEmail = normalizeSalesEmail(body.contactEmail || prospect.contact_email);
      const customerName = String(body.customerName || prospect.name || "New customer").trim().slice(0, 160);
      const commercialAgreement = {
        productSlug: body.productSlug, market: body.market, currency: currencyByMarket[body.market],
        setupFee: body.setupFee, recurringFee: body.recurringFee, termMonths: effectiveTermMonths,
        agreedAt: now, sourceProspectId: prospectId,
      };
      const customerContact = {
        name: body.contactName || null, email: prospectEmail || null,
        phone: body.contactPhone || prospect.contact_phone || null,
        whatsapp: body.contactWhatsapp || prospect.contact_whatsapp || null,
      };
      if (prospectEmail) {
        const { data: existingProfile } = await supabaseAdmin
          .from("profiles")
          .select("id,business_id,role")
          .ilike("email", prospectEmail)
          .maybeSingle();
        if (
          existingProfile &&
          !existingProfile.business_id &&
          !["super_admin", "platform_staff"].includes(existingProfile.role)
        ) {
          ownerId = existingProfile.id;
        }
      }

      const { data: existingBusiness, error: existingBusinessError } = await supabaseAdmin
        .from("businesses")
        .select("id,owner_id,onboarding_steps")
        .eq("id", businessId)
        .maybeSingle();
      if (existingBusinessError) throw existingBusinessError;

      if (!existingBusiness) {
        const { error: businessError } = await supabaseAdmin.from("businesses").insert({
          id: businessId,
          name: customerName,
          owner_id: ownerId,
          plan,
          status: "pending",
          subscription_status: "incomplete",
          industry: prospect.industry || null,
          location: prospect.location || null,
          business_nature: prospect.notes ? String(prospect.notes).slice(0, 500) : prospect.industry || null,
          lifecycle_stage: "onboarding",
          lifecycle_stage_changed_at: now,
          onboarding_started_at: now,
          commercial_product_slug: body.productSlug,
          commercial_market: body.market,
          commercial_currency: currencyByMarket[body.market],
          commercial_term_months: effectiveTermMonths,
          onboarding_steps: {
            commercialAgreement,
            customerContact,
            sourceProspect: { id: prospectId, previewUrl: prospect.preview_url || null, website: prospect.domain || null },
          },
          admin_notes: `Converted from prospect ${prospectId}. Agreed ${currencyByMarket[body.market]} ${body.setupFee} setup + ${body.recurringFee} recurring; ${effectiveTermMonths}-month initial commitment. Customer account/payment may still need to be attached.`,
        });
        if (businessError) throw businessError;
      } else if (ownerId && !existingBusiness.owner_id) {
        const { error: ownerError } = await supabaseAdmin
          .from("businesses")
          .update({ owner_id: ownerId })
          .eq("id", businessId)
          .is("owner_id", null);
        if (ownerError) throw ownerError;
      }

      if (ownerId) {
        const { error: profileUpdateError } = await supabaseAdmin
          .from("profiles")
          .update({ business_id: businessId, role: "business_admin", status: "active", onboarding_completed: false })
          .eq("id", ownerId).is("business_id", null);
        if (profileUpdateError) throw profileUpdateError;
      }

      let customerAccess: Record<string, any> = prospectEmail
        ? { status: ownerId ? "existing_user_attached" : "invite_pending", email: prospectEmail }
        : { status: "missing_customer_email" };
      if (prospectEmail) {
        try {
          customerAccess = await deliverCustomerOnboardingInvite({
            businessId,
            businessName: customerName,
            email: prospectEmail,
            contactName: customerContact.name,
            hasAccount: Boolean(ownerId),
            requestId: "conversion-v1",
          });
        } catch (inviteError: any) {
          console.warn("[Prospect Conversion] Customer onboarding invite could not be delivered:", inviteError?.message || inviteError);
          customerAccess = {
            status: ownerId ? "existing_user_attached" : "invite_delivery_pending",
            email: prospectEmail,
            onboardingUrl: customerOnboardingUrl(prospectEmail, Boolean(ownerId)),
            error: "Invite delivery pending",
          };
        }
      }
      const onboardingSteps = {
        commercialAgreement, customerContact,
        sourceProspect: { id: prospectId, previewUrl: prospect.preview_url || null, website: prospect.domain || null },
        customerAccess,
      };
      const { error: handoffUpdateError } = await supabaseAdmin.from("businesses").update({
        commercial_product_slug: body.productSlug, commercial_market: body.market,
        commercial_currency: currencyByMarket[body.market], commercial_term_months: effectiveTermMonths,
        onboarding_steps: onboardingSteps, updated_at: now,
      }).eq("id", businessId);
      if (handoffUpdateError) throw handoffUpdateError;

      const { error: onboardingError } = await supabaseAdmin.from("onboarding_sessions").upsert({
        id: onboardingId,
        business_id: businessId,
        current_step: "Awaiting customer onboarding",
        progress: 5,
        status: "In Progress",
        notes: prospectEmail
          ? "Prospect converted. Collect the complete customer brief before production."
          : "Prospect converted without an email address. Attach a customer account before onboarding.",
        updated_at: now,
      }, { onConflict: "id" });
      if (onboardingError) throw onboardingError;

      const { error: projectError } = await supabaseAdmin.from("projects").upsert({
        id: projectId,
        business_id: businessId,
        type: "waas",
        package_name: body.productSlug,
        title: `${prospect.name} Managed Website`,
        status: "awaiting_onboarding",
        priority: prospect.opportunity_level === "high" ? "high" : "medium",
        delivery_checklist: [],
        creation_key: `prospect-conversion:${prospectId}`,
        updated_at: now,
      }, { onConflict: "id" });
      if (projectError) throw projectError;

      const { data: convertedProspect, error: updateError } = await supabaseAdmin
        .from("prospects")
        .update({
          converted_business_id: businessId,
          converted_at: prospect.converted_at || now,
          outreach_status: "won",
          status: "converted",
          next_follow_up_at: null,
          updated_at: now,
        })
        .eq("id", prospectId)
        .select("*")
        .single();
      if (updateError) throw updateError;

      await supabaseAdmin
        .from("sales_tasks")
        .update({ status: "completed", updated_at: now })
        .eq("prospect_id", prospectId)
        .eq("status", "open");

      if (!prospect.converted_business_id) {
        await supabaseAdmin.from("deal_stage_events").insert({
          prospect_id: prospectId,
          from_stage: prospect.outreach_status || prospect.status || null,
          to_stage: "won",
          event_type: "prospect_converted",
          metadata: {
            businessId,
            projectId,
            onboardingId,
            productSlug: body.productSlug,
            market: body.market,
            currency: currencyByMarket[body.market],
            setupFee: body.setupFee,
            recurringFee: body.recurringFee,
            termMonths: effectiveTermMonths,
            customerName,
            customerContact,
            actorId: req.user.id,
          },
        });
      }

      return res.json({
        success: true,
        alreadyConverted: Boolean(prospect.converted_business_id),
        prospect: convertedProspect,
        business: {
          id: businessId,
          ownerId,
          accountStatus: customerAccess.status,
          onboardingPath: "/dashboard/onboarding",
          customerAccess,
        },
        project: { id: projectId, status: "awaiting_onboarding" },
        onboarding: { id: onboardingId, progress: 5 },
        commercial: commercialAgreement,
        contact: customerContact,
      });
    } catch (error: any) {
      console.error("[Prospect Conversion] Failed:", error?.message || error);
      return res.status(503).json({ error: "Prospect could not be converted. No duplicate customer should be created on retry." });
    }
  });

  app.post("/api/admin/businesses/:businessId/onboarding-invite", authenticate, async (req: any, res: any) => {
    const businessId = String(req.params.businessId || "");
    if (!UUID_SCHEMA.safeParse(businessId).success) return res.status(400).json({ error: "Invalid business reference." });
    const body = validateBody(z.object({ requestId: UUID_SCHEMA }).strict(), req, res);
    if (!body) return;
    try {
      await assertBusinessRoleAccess(req.user.id, businessId, {
        customerRoles: [],
        platformPermissions: ["sales", "delivery", "customer_health"],
      });
      const { data: business, error } = await supabaseAdmin
        .from("businesses")
        .select("id,name,owner_id,onboarding_steps")
        .eq("id", businessId)
        .maybeSingle();
      if (error) throw error;
      if (!business) return res.status(404).json({ error: "Business not found." });

      const onboardingSteps =
        business.onboarding_steps && typeof business.onboarding_steps === "object"
          ? business.onboarding_steps
          : {};
      const customerContact =
        onboardingSteps.customerContact && typeof onboardingSteps.customerContact === "object"
          ? onboardingSteps.customerContact
          : {};
      const email = normalizeSalesEmail(customerContact.email);
      if (!email) return res.status(400).json({ error: "Add the customer email before sending onboarding access." });

      try {
        const customerAccess = await deliverCustomerOnboardingInvite({
          businessId,
          businessName: String(business.name || "Customer"),
          email,
          contactName: customerContact.name || null,
          hasAccount: Boolean(business.owner_id),
          requestId: body.requestId,
        });
        const { error: updateError } = await supabaseAdmin.from("businesses").update({
          onboarding_steps: { ...onboardingSteps, customerAccess },
          updated_at: new Date().toISOString(),
        }).eq("id", businessId);
        if (updateError) throw updateError;
        return res.json({ success: true, customerAccess });
      } catch (inviteError: any) {
        const customerAccess = {
          status: business.owner_id ? "existing_user_attached" : "invite_delivery_pending",
          email,
          onboardingUrl: customerOnboardingUrl(email, Boolean(business.owner_id)),
          error: "Invite delivery pending",
          lastAttemptAt: new Date().toISOString(),
        };
        await supabaseAdmin.from("businesses").update({
          onboarding_steps: { ...onboardingSteps, customerAccess },
          updated_at: new Date().toISOString(),
        }).eq("id", businessId);
        return res.status(503).json({
          error: "Onboarding invitation could not be delivered.",
          customerAccess,
        });
      }
    } catch (error: any) {
      if (["BUSINESS_NOT_FOUND", "PROFILE_NOT_FOUND", "FORBIDDEN_BUSINESS_ACCESS"].includes(error?.message)) {
        return handleAccessError(res, error);
      }
      console.error("[Customer Onboarding Invite] Failed:", error?.message || error);
      return res.status(503).json({ error: "Onboarding invitation could not be sent." });
    }
  });

  app.post("/api/admin/prospects/attest-imported-consent", authenticate, async (req: any, res) => {
    try {
      const profile = await getProfileForUser(req.user.id);
      if (!canManageSalesOperations(profile)) return res.status(403).json({ error: "Sales access required" });
      const body = validateBody(z.object({ confirmed: z.literal(true) }).strict(), req, res);
      if (!body) return;
      const now = new Date().toISOString();
      const result = await attestImportedProspectConsent(supabaseAdmin, now);
      const { error: auditError } = await supabaseAdmin.from("admin_action_audit_logs").insert({
        actor_user_id: req.user.id,
        actor_email: req.user.email || null,
        action_type: "prospect.imported_consent_attested",
        target_type: "prospect_import_batch",
        target_id: null,
        target_label: "CSV uploaded prospects",
        metadata: {
          matched: result.matched,
          updated: result.updated.length,
          optInDateRule: "prospect.created_at",
          attestedAt: now,
          source: "Admin attested consent records are held by Bennie Studio",
        },
      });
      if (auditError) console.error("[Prospect Consent Attestation] Audit event could not be saved:", auditError.message);
      return res.json({ success: true, matched: result.matched, updated: result.updated.length, prospects: result.updated });
    } catch (error: any) {
      if (error?.message === "CONSENT_IMPORT_BATCH_TOO_LARGE") return res.status(409).json({ error: "Imported prospect list exceeds the 20,000 row limit. Narrow the list before attesting consent." });
      console.error("[Prospect Consent Attestation] Could not update imported prospects:", error?.message || error);
      return res.status(503).json({ error: "Consent attestation failed. No emails were sent." });
    }
  });

  app.post("/api/admin/prospects/:prospectId/outreach", authenticate, async (req: any, res) => {
    if (!UUID_SCHEMA.safeParse(req.params.prospectId).success) {
      return res.status(400).json({ error: "Invalid prospect ID" });
    }

    try {
      const profile = await getProfileForUser(req.user.id);
      if (!canManageSalesOperations(profile)) {
        return res.status(403).json({ error: "Sales access required" });
      }

      const body = validateBody(
        z.object({
          action: z.enum(["prepare", "contacted", "send"]),
          channel: z.enum(["email", "whatsapp"]),
          observation: z.string().trim().max(1000).optional(),
          templateId: z.string().trim().max(80).regex(/^[a-z][a-z0-9-]*$/i).optional(),
          subject: z.string().trim().max(160).optional(),
          bodyText: z.string().trim().min(1).max(10000),
          reviewUrl: z.string().trim().url().max(2000).nullable().optional(),
          replyToMessageId: UUID_SCHEMA.optional().nullable(),
          requestId: UUID_SCHEMA,
        }),
        req,
        res,
      );
      if (!body) return;

      if (body.action === "send") {
        if (body.channel !== "email") {
          return res.status(400).json({
            error: "Direct WhatsApp is not enabled. Use the WhatsApp button to open wa.me.",
          });
        }
        const result = await sendDirectProspectOutreach(
          supabaseAdmin,
          {
            ...body,
            channel: "email",
            prospectId: req.params.prospectId,
            actorId: req.user.id,
            deliver: sendDirectSalesEmail,
          },
          new Date().toISOString(),
        );
        return res.json({ success: true, ...result });
      }

      if (!body.observation || body.observation.length < 10) {
        return res.status(400).json({
          error: "Add a short outreach observation before saving manual outreach.",
        });
      }

      return res.json(
        await saveManualOutreach(
          supabaseAdmin,
          {
            action: body.action,
            channel: body.channel,
            observation: body.observation,
            bodyText: body.bodyText,
            requestId: body.requestId,
            prospectId: req.params.prospectId,
            actorId: req.user.id,
          },
          new Date().toISOString(),
        ),
      );
    } catch (error: any) {
      const errors: Record<string, { status: number; message: string }> = {
        CONTACT_NOT_FOUND: { status: 404, message: "Prospect not found" },
        CONTACT_CLOSED: {
          status: 409,
          message: "This prospect is closed; do not restart outreach automatically.",
        },
        CONTACT_SUPPRESSED: {
          status: 409,
          message: "This contact has opted out or is suppressed.",
        },
        CONTACT_CHANNEL_MISSING: {
          status: 409,
          message: "Add a valid contact for this channel.",
        },
        OUTREACH_OBSERVATION_REQUIRED: {
          status: 400,
          message: "Prepare a website review or add one specific verified observation before sending this follow-up.",
        },
        OUTREACH_PLACEHOLDER_UNRESOLVED: {
          status: 400,
          message: "Complete every bracketed detail before sending.",
        },
        OUTREACH_CONSENT_REQUIRED: {
          status: 409,
          message: "Email blocked: this prospect has no verified marketing opt-in. Resend is for permissioned outreach or replying to a genuine inbound enquiry.",
        },
        OUTREACH_REQUEST_CONFLICT: {
          status: 409,
          message: "This outreach request belongs to another prospect.",
        },
        OUTREACH_REPLY_CONFLICT: {
          status: 409,
          message: "The selected reply no longer belongs to this prospect.",
        },
        OUTREACH_TOO_SOON: {
          status: 409,
          message: "This address was contacted within 72 hours. Wait before sending another cold email.",
        },
        OUTREACH_SEND_IN_PROGRESS: {
          status: 409,
          message: "This message is already being sent. Wait before retrying.",
        },
        OUTREACH_SEND_UNCERTAIN: {
          status: 409,
          message: "The previous delivery attempt is uncertain. Close and reopen the composer before sending again.",
        },
        RESEND_CONFIG_ERROR: {
          status: 503,
          message: "Direct email is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL in Vercel.",
        },
        EMAIL_DELIVERY_FAILED: {
          status: 502,
          message: "The email provider rejected the message. Check the verified sender/domain and try again.",
        },
      };
      const known = errors[error?.message];
      if (known) return res.status(known.status).json({ error: known.message });

      console.error("[Direct Prospect Outreach] Failed:", error);
      return res.status(503).json({
        error: "Outreach could not be sent. No successful delivery was recorded.",
      });
    }
  });

  app.patch("/api/admin/sales-automation/bookings/:bookingId", authenticate, async (req: any, res) => {
    if (!UUID_SCHEMA.safeParse(req.params.bookingId).success) return res.status(400).json({ error: "Invalid booking ID" });
    try {
      const profile = await getProfileForUser(req.user.id);
      if (!canManageSalesOperations(profile)) return res.status(403).json({ error: "Sales access required" });
      const body = validateBody(z.object({
        status: z.enum(["booked", "completed", "no_show", "cancelled"]).optional(),
        outcome: z.string().trim().max(5000).optional(), nextAction: z.string().trim().max(1000).optional(),
      }).refine((value) => Object.values(value).some((item) => item !== undefined)), req, res);
      if (!body) return;
      return res.json({ booking: await saveSalesCallOutcome(supabaseAdmin, req.params.bookingId, body, new Date().toISOString()) });
    } catch (error: any) {
      return res.status(error?.message === "BOOKING_NOT_FOUND" ? 404 : 503).json({ error: "Call outcome could not be saved. Please retry." });
    }
  });

  app.get("/api/cron/sales-automation", async (req, res) => {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) return res.status(401).json({ error: "Unauthorized" });
    try {
      const sales = await processDueSalesMessages();
      const funnelRuns = await processDueFunnelWorkflowRuns({ db: supabaseAdmin, sendEmail: sendFunnelEmail, limit: 50 });

      // Reuse the existing daily cron invocation for lightweight customer-site health
      // monitoring instead of adding another Vercel cron/deployment cost. Keep the
      // batch deliberately small; a later run will cover additional published sites.
      const { data: publishedSites, error: sitesError } = await supabaseAdmin
        .from("websites")
        .select("id,business_id")
        .eq("status", "published")
        .order("updated_at", { ascending: false })
        .limit(20);
      if (sitesError) throw sitesError;

      const businessIds = Array.from(new Set((publishedSites || []).map((site: any) => site.business_id).filter(Boolean)));
      const { data: healthBusinesses, error: businessError } = businessIds.length
        ? await supabaseAdmin
            .from("businesses")
            .select("id,custom_domain,custom_domain_status")
            .in("id", businessIds)
        : { data: [], error: null };
      if (businessError) throw businessError;

      const businessById = new Map((healthBusinesses || []).map((business: any) => [business.id, business]));
      const healthResults = await Promise.all((publishedSites || []).map(async (site: any) => {
        const business: any = businessById.get(site.business_id);
        if (!business) return null;
        const connectedDomain =
          String(business.custom_domain_status || "").toLowerCase() === "connected"
            ? normalizeDomainInput(String(business.custom_domain || ""))
            : "";
        const publicUrl = connectedDomain
          ? `https://${connectedDomain}`
          : `${publicAppUrl()}/w/${site.business_id}`;

        const startedAt = Date.now();
        let reachable = false;
        let httpStatus: number | null = null;
        let issue = "";
        try {
          const response = await fetch(publicUrl, {
            method: "GET",
            redirect: "follow",
            signal: AbortSignal.timeout(6000),
            headers: { "user-agent": "BennieStudio-HealthMonitor/1.0" },
          });
          httpStatus = response.status;
          reachable = response.status >= 200 && response.status < 500;
          if (!reachable) issue = `Public website returned HTTP ${response.status}`;
          await response.body?.cancel().catch(() => undefined);
        } catch {
          issue = "Public website could not be reached";
        }

        const latencyMs = Date.now() - startedAt;
        const healthStatus =
          !reachable || (httpStatus !== null && httpStatus >= 500)
            ? "critical"
            : httpStatus !== null && httpStatus >= 400
              ? "warning"
              : "healthy";

        const { error: healthInsertError } = await supabaseAdmin
          .from("website_health_checks")
          .insert({
            website_id: site.id,
            business_id: site.business_id,
            health_status: healthStatus,
            issues: issue ? [issue] : [],
            checks: {
              reachable,
              httpStatus,
              latencyMs,
              publicUrl,
              source: "daily_cron",
            },
          });
        if (healthInsertError) {
          structuredLog("warn", "website_health_check_store_failed", {
            businessId: site.business_id,
            websiteId: site.id,
          });
        }

        return { businessId: site.business_id, websiteId: site.id, healthStatus, reachable, httpStatus, latencyMs };
      }));

      const completedHealth = healthResults.filter(Boolean);
      return res.json({
        success: true,
        ...sales,
        funnelWorkflowRuns: funnelRuns.length,
        websiteHealthChecks: {
          checked: completedHealth.length,
          critical: completedHealth.filter((item: any) => item.healthStatus === "critical").length,
          warning: completedHealth.filter((item: any) => item.healthStatus === "warning").length,
        },
      });
    } catch (error) {
      console.error("Sales/funnel/health automation cron failed:", error);
      return res.status(500).json({ error: "Automation run failed" });
    }
  });

  app.post("/api/internal/billing/process-cancellations", async (req, res) => {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) return res.status(401).json({ error: "Unauthorized" });
    try {
      return res.json({ success: true, ...(await processPendingCancellations()) });
    } catch (error: any) {
      console.error("Billing cancellation worker failed", { error: error?.message || error });
      return res.status(500).json({ error: "Billing cancellation worker failed; retry scheduled." });
    }
  });
  // Vercel Cron invokes GET; keep the POST variant for manual/internal runners.
  app.get("/api/internal/billing/process-cancellations", async (req, res) => {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) return res.status(401).json({ error: "Unauthorized" });
    try {
      return res.json({ success: true, ...(await processPendingCancellations()) });
    } catch (error: any) {
      console.error("Billing cancellation worker failed", { error: error?.message || error });
      return res.status(500).json({ error: "Billing cancellation worker failed; retry scheduled." });
    }
  });
  app.get("/api/internal/billing/cancellation-status", async (req, res) => {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) return res.status(401).json({ error: "Unauthorized" });
    const { data, error } = await supabaseAdmin.from("billing_worker_runs")
      .select("id,worker_name,started_at,completed_at,status,scanned_count,processed_count,failed_count,error_summary,metadata")
      .eq("worker_name", "pending-cancellations").order("started_at", { ascending: false }).limit(10);
    if (error) return res.status(503).json({ error: "Worker status unavailable" });
    return res.json({ runs: data || [] });
  });

  app.post("/api/admin/sales-automation/run", authenticate, async (req: any, res) => {
    try {
      const profile = await getProfileForUser(req.user.id);
      if (!canManageSalesOperations(profile)) return res.status(403).json({ error: "Sales access required" });
      return res.json({ success: true, ...(await processDueSalesMessages()) });
    } catch (error) {
      return res.status(503).json({ error: "Sales operation could not be completed. Please retry." });
    }
  });

  app.post("/api/admin/sales-automation/messages/:messageId/approve", authenticate, async (req: any, res) => {
    if (!UUID_SCHEMA.safeParse(req.params.messageId).success) return res.status(400).json({ error: "Invalid message ID" });
    try {
      const profile = await getProfileForUser(req.user.id);
      if (!canManageSalesOperations(profile)) return res.status(403).json({ error: "Sales access required" });
      const body = validateBody(z.object({ subject: z.string().trim().max(160).optional(), bodyText: z.string().trim().min(1).max(10000).optional(), sendNow: z.boolean().optional() }), req, res);
      if (!body) return;
      const updates: Record<string, any> = { status: "approved", updated_at: new Date().toISOString() };
      if (body.subject !== undefined) updates.subject = body.subject;
      if (body.bodyText !== undefined) updates.body_text = body.bodyText;
      const { data: candidate, error: candidateError } = await supabaseAdmin.from("sales_messages").select("recipient,subject,body_text,status,scheduled_at,provider_payload,prospect_id,reply_to_message_id").eq("id", req.params.messageId).maybeSingle();
      if (candidateError) throw candidateError;
      if (!candidate || candidate.status !== "draft") return res.status(409).json({ error: "Only draft messages can be approved" });
      const finalText = `${updates.subject ?? candidate.subject ?? ""}\n${updates.body_text ?? candidate.body_text ?? ""}`;
      if (/\[[^\]\n]{3,}\]|\{\{[^}]+\}\}/.test(finalText)) return res.status(422).json({ error: "Resolve all email placeholders before approval." });
      if (await isSalesSuppressed(supabaseAdmin, normalizeSalesEmail(candidate.recipient))) return res.status(409).json({ error: "This recipient has opted out or bounced. Approval blocked." });
      if (candidate.prospect_id && !candidate.reply_to_message_id) {
        const { data: prospect, error: prospectError } = await supabaseAdmin.from("prospects").select("*").eq("id", candidate.prospect_id).maybeSingle();
        if (prospectError) throw prospectError;
        if (!hasDocumentedMarketingConsent(prospect)) return res.status(409).json({ error: "Approval blocked. This prospect has no documented opt-in." });
      }
      const futureAuditFollowUp = candidate.provider_payload?.directAuditFollowUp && candidate.scheduled_at && new Date(candidate.scheduled_at) > new Date();
      if (body.sendNow && !futureAuditFollowUp) updates.scheduled_at = new Date().toISOString();
      const { data, error } = await supabaseAdmin.from("sales_messages").update(updates).eq("id", req.params.messageId).eq("status", "draft").select("*").maybeSingle();
      if (error) throw error;
      if (!data) return res.status(409).json({ error: "Only draft messages can be approved" });
      return res.json({ message: data });
    } catch (error) {
      return res.status(503).json({ error: "Sales operation could not be completed. Please retry." });
    }
  });

  app.post("/api/admin/sales-automation/enroll", authenticate, async (req: any, res) => {
    try {
      const profile = await getProfileForUser(req.user.id);
      if (!canManageSalesOperations(profile)) return res.status(403).json({ error: "Sales access required" });
      const body = validateBody(z.object({
        sequenceId: UUID_SCHEMA,
        leadId: UUID_SCHEMA.optional(),
        prospectId: UUID_SCHEMA.optional(),
        observation: z.string().trim().max(1000).optional(),
        recommendation: z.string().trim().min(10).max(500).optional(),
      }).refine((value) => Boolean(value.leadId) !== Boolean(value.prospectId), { message: "Choose one lead or prospect" }), req, res);
      if (!body) return;
      const { data: sequence, error: sequenceError } = await supabaseAdmin.from("outreach_sequences").select("*, outreach_sequence_steps(*)").eq("id", body.sequenceId).single();
      if (sequenceError || !sequence) return res.status(404).json({ error: "Sequence not found" });
      if (sequence.status !== "active") return res.status(409).json({ error: "Activate the sequence before enrolling contacts" });
      const enrollmentFilter = body.leadId ? { lead_id: body.leadId } : { prospect_id: body.prospectId };
      const { data: existingEnrollment, error: existingEnrollmentError } = await supabaseAdmin.from("outreach_enrollments").select("id,sequence_id").match(enrollmentFilter).in("status", ["pending", "active", "paused"]).limit(1).maybeSingle();
      if (existingEnrollmentError) throw existingEnrollmentError;
      if (existingEnrollment) return res.status(409).json({ error: "This contact already has an active outreach sequence" });
      const table = body.leadId ? "leads" : "prospects";
      const entityId = body.leadId || body.prospectId;
      const { data: entity, error: entityError } = await supabaseAdmin.from(table).select("*").eq("id", entityId).single();
      if (entityError || !entity) return res.status(404).json({ error: "Contact not found" });
      const recipient = normalizeSalesEmail(entity.email || entity.contact_email);
      if (!EMAIL_SCHEMA.safeParse(recipient).success) return res.status(400).json({ error: "Contact has no valid email" });
      if (await isSalesSuppressed(supabaseAdmin, recipient)) return res.status(409).json({ error: "This contact is suppressed" });
      if (!["inbound", "proposal"].includes(String(sequence.audience_type || "cold")) && !hasDocumentedMarketingConsent(entity)) {
        return res.status(409).json({ error: "Record verified email marketing opt-in before enrolling this contact." });
      }
      if (entity.outreach_exhausted_at || [entity.status, entity.outreach_status].some((status) => ["won", "lost", "closed", "converted", "paid", "meeting", "call_booked", "appointment_booked", "replied"].includes(String(status).toLowerCase()))) {
        return res.status(409).json({ error: "This contact has replied, is closed or has a booked call. Use a personal follow-up." });
      }
      const steps = [...(sequence.outreach_sequence_steps || [])].sort((a: any, b: any) => a.step_order - b.step_order);
      if (!steps.length || steps.some((step: any) => step.channel !== "email" || !String(step.body_template || "").trim())) {
        return res.status(409).json({ error: "The sequence needs valid email steps before enrolment. WhatsApp remains manual." });
      }
      if (steps.some((step: any) => String(step.body_template || "").includes("{{observation}}")) && String(body.observation || "").trim().length < 10) {
        return res.status(400).json({ error: "Add one specific verified observation for this sequence." });
      }
      if (sequence.name === "Permissioned website review" &&
        (steps.length !== 4 || steps.some((step: any, i: number) =>
          step.step_order !== i + 1 || Number(step.delay_hours) !== [0,72,120,168][i]))) {
        return res.status(409).json({ error: "The prospect follow-up sequence must contain intro + day 3/8/15 steps." });
      }
      const startAt = new Date();
      const { data: enrollment, error: enrollmentError } = await supabaseAdmin.from("outreach_enrollments").insert({ sequence_id: sequence.id, lead_id: body.leadId || null, prospect_id: body.prospectId || null, status: "pending", current_step: 0, next_run_at: startAt.toISOString(), metadata: { observation: body.observation || null, createdBy: req.user.id } }).select("*").single();
      if (enrollmentError?.code === "23505") return res.status(409).json({ error: "Contact already has an active or pending sequence." });
      if (enrollmentError) throw enrollmentError;
      const rawFields = entity.raw_fields || {};
      const businessName = entity.business_name || entity.company_name || rawFields.businessName || rawFields.companyName || entity.name || "your business";
      const firstName = String(entity.contact_first_name || entity.contact_name || rawFields.contactFirstName || rawFields.contactName || "").trim().split(/\s+/)[0] || `${businessName} team`;
      const savedReview = String(entity.audit_report_url || (
        typeof entity.preview_url === "string" && /\/website-audit\?/.test(entity.preview_url)
          ? entity.preview_url : "")).trim();
      let safeSavedReview = "";
      try {
        const reviewUrl = new URL(savedReview, publicAppUrl());
        if (reviewUrl.origin === new URL(publicAppUrl()).origin && reviewUrl.pathname === "/website-audit" &&
          reviewUrl.searchParams.get("report") && reviewUrl.searchParams.get("key")) safeSavedReview = reviewUrl.toString();
      } catch { /* Keep invalid or external report links out of scheduled email. */ }
      if (steps.some((step: any) => String(step.body_template || "").includes("{{review_url}}")) && !safeSavedReview) {
        return res.status(409).json({ error: "Prepare the recipient's website review before enrolling them in this sequence." });
      }
      const values: Record<string, string> = {
        business_name: businessName, first_name: firstName, observation: body.observation || "",
        recommendation: body.recommendation || "Place a clear quote or contact action beside the relevant service and make it easy to use on mobile",
        review_url: safeSavedReview,
      };
      let elapsedHours = 0;
      const rows = steps.map((step: any, index: number) => {
        elapsedHours += Number(step.delay_hours || 0);
        const render = (template: string) => template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_m: string, key: string) => values[key] || "");
        return {
          enrollment_id: enrollment.id,
          lead_id: body.leadId || null,
          prospect_id: body.prospectId || null,
          recipient,
          channel: step.channel,
          subject: render(step.subject_template || "A note from Bennie Studio"),
          body_text: render(step.body_template),
          status: step.requires_approval || index === 0 ? "draft" : "queued",
          scheduled_at: new Date(startAt.getTime() + elapsedHours * 3600000).toISOString(),
          provider_payload: { sequenceId: sequence.id, stepId: step.id, stepOrder: step.step_order, delayHours: step.delay_hours,
            stopOnReply: true, templateId: `${sequence.name} / Step ${step.step_order}`,
            followUpStage: sequence.name === "Permissioned website review" ? (index === 0 ? "INTRO" : `FOLLOW_UP_${index}_OF_3`) : null,
            observation: body.observation || null, reviewUrl: safeSavedReview || null },
        };
      });
      const { data: messages, error: messageError } = await supabaseAdmin.from("sales_messages").insert(rows).select("*");
      if (messageError) {
        await supabaseAdmin.from("outreach_enrollments").update({ status: "stopped", stop_reason: "Draft creation failed; safe to enrol again", next_run_at: null }).eq("id", enrollment.id).eq("status", "pending");
        throw messageError;
      }
      const { error: activationError } = await supabaseAdmin.from("outreach_enrollments").update({ status: "active" }).eq("id", enrollment.id).eq("status", "pending");
      if (activationError) throw activationError;
      await supabaseAdmin.from("deal_stage_events").insert({ lead_id: body.leadId || null, prospect_id: body.prospectId || null, to_stage: "sequence_enrolled", event_type: "automation_enrolled", metadata: { sequenceId: sequence.id } });
      return res.json({ enrollment: { ...enrollment, status: "active" }, messages: messages || [] });
    } catch (error) {
      return res.status(503).json({ error: "Sales operation could not be completed. Please retry." });
    }
  });

  // Email security scanners prefetch GET links. GET must never unsubscribe.
  app.get("/api/public/unsubscribe/:token", async (req, res) => {
    if (!UUID_SCHEMA.safeParse(req.params.token).success) return res.status(400).send("Invalid unsubscribe link");
    res.setHeader("Cache-Control", "no-store");
    return res.type("html").send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title><body style="font-family:system-ui;background:#f8fafc;color:#0f172a;padding:48px"><main style="max-width:520px;margin:auto;background:white;padding:36px;border-radius:20px"><h1>Stop Bennie Studio sales emails?</h1><p>Confirm below to opt out of future sales outreach.</p><form method="post" action="/api/public/unsubscribe/${req.params.token}"><button style="cursor:pointer;padding:12px 20px;background:#0f172a;color:white;border:0;border-radius:10px">Unsubscribe</button></form></main></body></html>`);
  });
  app.post("/api/public/unsubscribe/:token", async (req, res) => {
    if (!UUID_SCHEMA.safeParse(req.params.token).success) return res.status(400).send("Invalid unsubscribe link");
    try {
      const { data: message, error } = await supabaseAdmin.from("sales_messages").select("recipient").eq("unsubscribe_token", req.params.token).maybeSingle();
      if (error) throw error;
      if (message?.recipient) await suppressSalesRecipient(supabaseAdmin, message.recipient, "opt_out", "email_unsubscribe", new Date().toISOString());
      res.setHeader("Cache-Control", "no-store");
      return res.type("html").send("<!doctype html><html><body style='font-family:system-ui;padding:60px'><main style='max-width:560px;margin:auto'><h1>You have been unsubscribed.</h1><p>Bennie Studio will not send further sales follow-ups to this address.</p></main></body></html>");
    } catch {
      return res.status(503).type("text").send("We could not save your request. Please retry.");
    }
  });


  // Hostinger is the actual reply mailbox. Its webhook is separate from Resend's
  // provider-delivery webhook, which does not observe mail delivered to Hostinger.
  app.post("/api/webhooks/hostinger-mail", async (req: any, res: any) => {
    const configuredSecret = String(process.env.HOSTINGER_MAIL_WEBHOOK_SECRET || "");
    if (!configuredSecret) return res.status(503).json({ error: "Mail webhook is not configured" });
    const suppliedToken = String(req.headers.authorization || "").replace(/^Bearer\\s+/i, "");
    const provided = Buffer.from(suppliedToken);
    const configured = Buffer.from(configuredSecret);
    if (!suppliedToken || provided.length !== configured.length || !crypto.timingSafeEqual(provided, configured)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const payload = req.body && typeof req.body === "object" ? req.body : {};
      const eventType = String(payload.event || payload.type || payload.data?.event || "");
      if (eventType !== "message.received") return res.json({ received: true, ignored: true });
      const detail = payload.message || payload.data?.message || payload.data || {};
      const fromValue = detail.from || payload.from || "";
      const sender = typeof fromValue === "string" ? fromValue : String(fromValue?.address || "");
      if (!normalizeSalesEmail(sender)) return res.json({ received: true, ignored: true });
      const eventId = detail.uid || detail.messageId || detail.message_id || detail.id || payload.id
        || crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
      const event = {
        type: "email.received",
        created_at: detail.date || detail.timestamp || payload.timestamp || new Date().toISOString(),
        data: {
          email_id: `hostinger:${String(eventId).slice(0, 128)}`,
          from: sender,
          subject: String(detail.subject || payload.subject || "Email reply").slice(0, 500),
          in_reply_to: detail.inReplyTo || detail.in_reply_to || "",
        },
      };
      // Hostinger's webhook provides a preview, not necessarily the complete body.
      // Never present this as a full message or fabricate a reply.
      const snippet = String(detail.preview || detail.snippet || detail.text || "").slice(0, 1000);
      await recordSalesReply(supabaseAdmin, event, async () =>
        `[Hostinger email received; open the hello@bennietay.com mailbox to read and reply to the full message.${snippet ? ` Provider preview: ${snippet}` : ""}]`,
        new Date().toISOString(),
      );
      return res.json({ received: true });
    } catch (error: any) {
      structuredLog("warn", "hostinger_sales_reply_sync_failed", { reason: String(error?.message || "unknown").slice(0, 100) });
      return res.status(503).json({ error: "Reply sync unavailable; retry delivery" });
    }
  });

  app.post("/api/webhooks/resend", express.raw({ type: "application/json", limit: "1mb" }), async (req: any, res) => {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(503).json({ error: "Webhook is not configured" });
    let event: any;
    try {
      event = getResend().webhooks.verify({
        payload: Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "",
        headers: {
          id: String(req.headers["svix-id"] || req.headers["webhook-id"] || ""),
          timestamp: String(req.headers["svix-timestamp"] || req.headers["webhook-timestamp"] || ""),
          signature: String(req.headers["svix-signature"] || req.headers["webhook-signature"] || ""),
        },
        webhookSecret,
      });
    } catch {
      return res.status(400).json({ error: "Invalid webhook" });
    }
    try {
      const now = new Date().toISOString();
      if (event.type === "email.received") {
        await recordSalesReply(supabaseAdmin, event, async () => {
          // Keep the optional receiving credential server-side. Permission failures
          // are recorded as a manual-review task instead of failing delivery.
          const receiver = process.env.RESEND_RECEIVING_API_KEY ? new Resend(process.env.RESEND_RECEIVING_API_KEY) : getResend();
          const received = await receiver.emails.receiving.get(event.data.email_id);
          if (received.error || !received.data) {
            const statusCode = Number((received.error as any)?.statusCode || (received.error as any)?.status || 0);
            if (statusCode === 401 || statusCode === 403) {
              // Preserve the reply and stop its sequence even when this key cannot
              // read inbound content. The original remains available in Resend.
              structuredLog("warn", "sales_reply_body_unavailable", {
                reason: "receiving_api_key_required",
              });
              return `[Reply body unavailable. Add a receiving-capable RESEND_RECEIVING_API_KEY and review this email in Resend (email ID: ${event.data.email_id}).]`;
            }
            throw new Error("REPLY_RETRIEVAL_UNAVAILABLE");
          }
          return received.data.text || received.data.html?.replace(/<[^>]+>/g, " ") || "";
        }, now);
      } else {
        await recordSalesDeliveryEvent(supabaseAdmin, event, now);
      }
      return res.json({ received: true });
    } catch {
      // A valid event whose storage/read failed must be retried by the provider.
      structuredLog("warn", "sales_webhook_processing_failed", { type: event.type });
      return res.status(503).json({ error: "Email event could not be processed. Please retry." });
    }
  });

  app.post(
    "/api/admin/google-places/search",
    authenticate,
    rateLimit({
      windowMs: 60 * 1000,
      max: 30,
      keyPrefix: "admin-google-places-search",
      key: (req) => req.user?.id || getClientIp(req),
    }),
    async (req: any, res: any) => {
      const body = validateBody(
        z.object({ query: z.string().trim().min(3).max(200) }),
        req,
        res,
      );
      if (!body) return;
      try {
        const places = await searchGooglePlaces(body.query);
        res.setHeader("Cache-Control", "no-store");
        return res.json({ places });
      } catch (error: any) {
        const message = error?.message === "GOOGLE_PLACES_NOT_CONFIGURED"
          ? "Google Reviews is not configured yet. Add GOOGLE_PLACES_API_KEY in Vercel."
          : "Google Business search is temporarily unavailable.";
        return res.status(error?.message === "GOOGLE_PLACES_NOT_CONFIGURED" ? 503 : 502).json({ error: message });
      }
    },
  );

  app.get(
    "/api/admin/google-places/details",
    authenticate,
    rateLimit({
      windowMs: 60 * 1000,
      max: 60,
      keyPrefix: "admin-google-places-details",
      key: (req) => req.user?.id || getClientIp(req),
    }),
    async (req: any, res: any) => {
      try {
        const placeId = String(req.query.placeId || "").trim();
        const place = await fetchGooglePlaceDetails(placeId);
        res.setHeader("Cache-Control", "no-store");
        return res.json({ place });
      } catch (error: any) {
        const message = error?.message === "GOOGLE_PLACES_NOT_CONFIGURED"
          ? "Google Reviews is not configured yet. Add GOOGLE_PLACES_API_KEY in Vercel."
          : error?.message === "INVALID_GOOGLE_PLACE_ID"
            ? "Choose a valid Google Business location."
            : "Google reviews are temporarily unavailable.";
        const status = error?.message === "GOOGLE_PLACES_NOT_CONFIGURED" ? 503
          : error?.message === "INVALID_GOOGLE_PLACE_ID" ? 400
          : 502;
        return res.status(status).json({ error: message });
      }
    },
  );

  app.get(
    "/api/public/google-reviews",
    rateLimit({ windowMs: 60 * 1000, max: 60, keyPrefix: "public-google-reviews" }),
    async (req: any, res: any) => {
      const websiteId = String(req.query.websiteId || "");
      const sectionId = String(req.query.sectionId || "");
      if (!UUID_SCHEMA.safeParse(websiteId).success || !UUID_SCHEMA.safeParse(sectionId).success) {
        return res.status(400).json({ error: "Invalid Google Reviews section." });
      }

      try {
        const { data: website, error } = await supabaseAdmin
          .from("websites")
          .select("id,status,pages")
          .eq("id", websiteId)
          .eq("status", "published")
          .maybeSingle();
        if (error) throw error;
        if (!website) return res.status(404).json({ error: "Published website not found." });

        const pages = Array.isArray(website.pages) ? website.pages : [];
        const section = pages
          .flatMap((page: any) => Array.isArray(page?.sections) ? page.sections : [])
          .find((candidate: any) => candidate?.id === sectionId && candidate?.type === "google_reviews");

        const placeId = String(section?.content?.placeId || "").trim();
        if (!section || section?.isVisible === false || section?.content?.enabled === false || !placeId) {
          return res.status(404).json({ error: "Google Reviews is not enabled for this website." });
        }

        const place = await fetchGooglePlaceDetails(placeId);
        res.setHeader("Cache-Control", "no-store");
        return res.json({ place });
      } catch (error: any) {
        if (error?.message === "GOOGLE_PLACES_NOT_CONFIGURED") {
          return res.status(503).json({ error: "Google Reviews is temporarily unavailable." });
        }
        structuredLog("warn", "public_google_reviews_failed", { websiteId, sectionId });
        return res.status(502).json({ error: "Google reviews are temporarily unavailable." });
      }
    },
  );

  app.get("/api/public/call-availability", rateLimit({ windowMs: 60 * 1000, max: 60, keyPrefix: "call-availability" }), async (_req, res) => {
    const now = new Date();
    const end = new Date(now.getTime() + 15 * 86400000);
    const { data: existing, error } = await supabaseAdmin.from("sales_call_bookings").select("start_at").eq("status", "booked").gte("start_at", now.toISOString()).lte("start_at", end.toISOString());
    if (error) return res.status(503).json({ error: "Call availability is temporarily unavailable" });
    const slots = buildAvailableSalesCallSlots(now, (existing || []).map((item) => item.start_at));
    res.setHeader("Cache-Control", "no-store");
    return res.json({ slots, timezone: SALES_CALL_TIMEZONE, durationMinutes: SALES_CALL_DURATION_MINUTES });
  });

  app.get("/api/admin/otc-waivers", authenticate, superAdminOnly, async (_req:any,res:any)=>{
    const [waivers,businesses]=await Promise.all([
      supabaseAdmin.from("commercial_otc_waivers").select("scope,business_id,waived,reason,updated_at").order("updated_at",{ascending:false}),
      supabaseAdmin.from("businesses").select("id,name,commercial_market").order("name").limit(500),
    ]);
    if(waivers.error || businesses.error)return res.status(503).json({error:"OTC waiver controls unavailable"});
    return res.json({waivers:waivers.data||[],businesses:businesses.data||[]});
  });
  app.patch("/api/admin/otc-waivers/global", authenticate, superAdminOnly, async (req:any,res:any)=>{
    const body=validateBody(z.object({waived:z.boolean(),reason:z.string().trim().max(500)}).strict(),req,res);
    if(!body)return;
    if(body.waived&&!body.reason)return res.status(400).json({error:"Enter a reason for enabling the global waiver."});
    const old=await supabaseAdmin.from("commercial_otc_waivers").select("waived").eq("scope","global").single();
    if(old.error)return res.status(503).json({error:"Unable to load global waiver"});
    const update=await supabaseAdmin.from("commercial_otc_waivers")
      .update({waived:body.waived,reason:body.reason,updated_by:req.user.id,updated_at:new Date().toISOString()})
      .eq("scope","global").select("scope,waived,reason,updated_at").single();
    if(update.error)return res.status(503).json({error:"Unable to save global waiver"});
    const audit=await supabaseAdmin.from("admin_action_audit_logs").insert({
      actor_user_id:req.user.id,actor_email:req.user.email||null,
      action_type:"otc_global_waiver_changed",target_type:"catalogue",target_id:"global",
      target_label:"Global OTC waiver",metadata:{from:old.data.waived,to:body.waived,reason:body.reason},
    });
    if(audit.error)console.error("OTC global waiver audit failed:",audit.error.message);
    return res.json({waiver:update.data});
  });
  app.patch("/api/admin/otc-waivers/customers/:businessId", authenticate, superAdminOnly, async (req:any,res:any)=>{
    const id=String(req.params.businessId||"");
    if(!UUID_SCHEMA.safeParse(id).success)return res.status(400).json({error:"Invalid customer ID"});
    const body=validateBody(z.object({waived:z.boolean(),reason:z.string().trim().max(500)}).strict(),req,res);
    if(!body)return;
    if(body.waived&&!body.reason)return res.status(400).json({error:"Enter a reason for the customer waiver."});
    const business=await supabaseAdmin.from("businesses").select("id,name").eq("id",id).maybeSingle();
    if(business.error)return res.status(503).json({error:"Unable to check customer"});
    if(!business.data)return res.status(404).json({error:"Customer not found"});
    const old=await supabaseAdmin.from("commercial_otc_waivers").select("waived").eq("scope","customer").eq("business_id",id).maybeSingle();
    if(old.error)return res.status(503).json({error:"Unable to check previous waiver"});
    const update=await supabaseAdmin.from("commercial_otc_waivers").upsert({
      scope:"customer",business_id:id,waived:body.waived,reason:body.reason,
      updated_by:req.user.id,updated_at:new Date().toISOString(),
    },{onConflict:"business_id"}).select("scope,business_id,waived,reason,updated_at").single();
    if(update.error)return res.status(503).json({error:"Unable to save customer waiver"});
    const audit=await supabaseAdmin.from("admin_action_audit_logs").insert({
      actor_user_id:req.user.id,actor_email:req.user.email||null,
      action_type:"otc_customer_waiver_changed",target_type:"business",target_id:id,target_label:business.data.name,
      metadata:{from:old.data?.waived||false,to:body.waived,reason:body.reason},
    });
    if(audit.error)console.error("OTC customer waiver audit failed:",audit.error.message);
    return res.json({waiver:update.data});
  });
  app.get("/api/account/otc-waiver", authenticate, async (req:any,res:any)=>{
    const id=String(req.query.businessId||"");
    if(!UUID_SCHEMA.safeParse(id).success)return res.status(400).json({error:"Invalid customer ID"});
    try {
      await assertBusinessAdminAccess(req.user.id,id);
      const source=await resolveOtcWaiver(id);
      return res.json({waived:Boolean(source),source});
    }catch(error){return res.status(403).json({error:"Could not verify customer waiver"});}
  });
  app.get("/api/public/pricing", rateLimit({ windowMs: 60 * 1000, max: 60, keyPrefix: "public-pricing" }), async (req, res) => {
    // All published offer prices come from the verified international USD catalogue.
    const market = "INTL" as const;
    if (process.env.E2E_TEST === "true") {
      return res.json({ market, currency: "USD", products: [] });
    }
    await refreshLaunchFlags();
    let globalWaiver: "global" | "customer" | null;
    try { globalWaiver=await resolveOtcWaiver(); }
    catch { return res.status(503).json({error:"Current setup fee could not be verified."}); }
    const { data, error } = await supabaseAdmin
      .from("commercial_products")
      .select("id,slug,name,description,product_type,sales_motion,includes_product_slug,commercial_market_prices!inner(market,currency,monthly_price,setup_fee,annual_price,billing_interval,active,stripe_monthly_price_id,stripe_annual_price_id,stripe_setup_price_id,stripe_one_time_price_id,recurring_monthly_price,recurring_setup_fee,recurring_annual_price,minimum_term_months,recurring_config_status,recurring_stripe_monthly_price_id,recurring_stripe_annual_price_id,recurring_stripe_setup_price_id)")
      .eq("active", true)
      // Custom Website is quote-led but still belongs in the public catalogue
      // so acquisition pages can route visitors to the correct consultation path.
      .in("slug", ["personal-profile", "managed-website", "website-growth", "growth-partner", "custom-website"])
      .eq("commercial_market_prices.market", market)
      .eq("commercial_market_prices.active", true)
      .order("sort_order", { ascending: true });
    if (error) return res.status(503).json({ error: "Commercial pricing is temporarily unavailable" });
    const products = (data || []).map((product: any) => {
      const price = Array.isArray(product.commercial_market_prices) ? product.commercial_market_prices[0] : product.commercial_market_prices;
      const dynamicCheckoutAvailable = price?.recurring_config_status === "live" && Number(price?.recurring_monthly_price || 0) > 0;
      // Keep draft markets consultation-led even though the catalogue stores
      // one product-level sales motion. Malaysia is the only market currently
      // allowed to expose a self-service recurring checkout.
      const publicSalesMotion = product.sales_motion === "quote"
        ? "quote"
        : dynamicCheckoutAvailable
          ? product.sales_motion
          : "proposal";
      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        productType: product.product_type,
        salesMotion: publicSalesMotion,
        includesProductSlug: product.includes_product_slug,
        price: price ? {
          market,
          currency: price.currency,
          // Public catalogue is recurring-only. Legacy one-time values remain in
          // the database for historical customers, but are never rendered or
          // selected for a new public checkout.
          monthlyPrice: price.recurring_monthly_price === null || price.recurring_monthly_price === undefined ? null : Number(price.recurring_monthly_price),
          standardSetupFee: Number(price.recurring_setup_fee || 0),
          otcWaiver: globalWaiver,
          setupFee: globalWaiver ? 0 : Number(price.recurring_setup_fee || 0),
          annualPrice: price.recurring_annual_price === null || price.recurring_annual_price === undefined ? null : Number(price.recurring_annual_price),
          billingInterval: "month",
          minimumTermMonths: getMinimumTermMonths({ minimumTermMonths: price.minimum_term_months }),
          catalogueMode: "otc_mrc",
          recurringConfigStatus: price.recurring_config_status || "draft",
          recurringConfigured: Boolean(dynamicCheckoutAvailable || (
            price.recurring_config_status === "live" &&
            price.recurring_stripe_monthly_price_id &&
            price.recurring_stripe_setup_price_id
          )),
          oneTimeConfigured: Boolean(price.stripe_one_time_price_id),
          monthlyConfigured: Boolean(dynamicCheckoutAvailable || (price.recurring_config_status === "live" && price.recurring_stripe_monthly_price_id)),
          dynamicCheckoutAvailable: Boolean(dynamicCheckoutAvailable),
          annualConfigured: Boolean(price.recurring_config_status === "live" && price.recurring_stripe_annual_price_id),
        } : null,
      };
    });
    res.setHeader("Cache-Control", "no-store");
    return res.json({ market, currency: commercialCurrencyForMarket(market), products });
  });

  app.get("/api/admin/commercial-catalogue", authenticate, superAdminOnly, async (_req: any, res: any) => {
    const [products, prices, promotions, legacyPlans] = await Promise.all([
      supabaseAdmin.from("commercial_products").select("*").order("sort_order", { ascending: true }),
      supabaseAdmin.from("commercial_market_prices").select("*").order("market", { ascending: true }),
      supabaseAdmin.from("commercial_promotions").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("plans").select("id,name,slug,is_active,sales_motion,price_usd,setup_fee,commitment_months").order("sort_order", { ascending: true }),
    ]);
    if (products.error || prices.error || legacyPlans.error) return res.status(500).json({ error: "Commercial catalogue unavailable" });
    return res.json({ products: products.data || [], prices: prices.data || [], promotions: promotions.data || [], legacyPlans: legacyPlans.data || [] });
  });

  app.get("/api/admin/launch-flags", authenticate, superAdminOnly, async (_req: any, res: any) => {
    const flags = await refreshLaunchFlags(true);
    return res.json({ flags });
  });

  app.patch("/api/admin/launch-flags", authenticate, superAdminOnly, async (req: any, res: any) => {
    const body = validateBody(z.object({
      otcMrcCatalogue: z.boolean().optional(),
      internalAiContentEngine: z.boolean().optional(),
      analyticsV2: z.boolean().optional(),
      customerAiControls: z.boolean().optional(),
      aiCreditTopupsEnabled: z.boolean().optional(),
    }), req, res);
    if (!body) return;
    const current = await refreshLaunchFlags(true);
    const next = normalizeLaunchFlags({
      otc_mrc_catalogue: body.otcMrcCatalogue ?? current.otc_mrc_catalogue,
      internal_ai_content_engine: body.internalAiContentEngine ?? current.internal_ai_content_engine,
      analytics_v2: body.analyticsV2 ?? current.analytics_v2,
      customer_ai_controls: body.customerAiControls ?? current.customer_ai_controls,
      ai_credit_topups_enabled: body.aiCreditTopupsEnabled ?? current.ai_credit_topups_enabled,
    });
    const { error } = await supabaseAdmin.from("settings").upsert({ id: "launch_flags", content: next, updated_at: new Date().toISOString() });
    if (error) return res.status(400).json({ error: "Launch flags could not be saved" });
    launchFlags = next;
    launchFlagsLoadedAt = Date.now();
    return res.json({ flags: next });
  });

  app.get("/api/admin/contracts/renewals", authenticate, superAdminOnly, async (req: any, res: any) => {
    const horizonDays = Math.min(Math.max(Number(req.query.horizonDays || 60), 1), 365);
    const horizon = new Date(Date.now() + horizonDays * 86400000).toISOString().slice(0, 10);
    const { data, error } = await supabaseAdmin.from("user_subscriptions")
      .select("id,user_id,commercial_product_slug,commercial_market,status,renewal_state,minimum_term_end_date,cancel_at_period_end,last_payment_status,payment_failure_count")
      .lte("minimum_term_end_date", horizon)
      .not("renewal_state", "eq", "cancelled")
      .order("minimum_term_end_date", { ascending: true })
      .limit(200);
    if (error) return res.status(503).json({ error: "Contract renewals are temporarily unavailable" });
    return res.json({ horizonDays, renewals: data || [] });
  });

  // Customer-specific commitment override. The commercial catalogue remains
  // the default source of truth; a super admin may set a negotiated term for
  // a specific customer. Null restores the current catalogue term.
  app.patch("/api/admin/businesses/:businessId/contract-term", authenticate, superAdminOnly, async (req: any, res: any) => {
    const businessId = String(req.params.businessId || "");
    if (!UUID_SCHEMA.safeParse(businessId).success) return res.status(400).json({ error: "Invalid business ID" });
    const body = validateBody(z.object({ termMonths: z.number().int().min(1).max(120).nullable() }).strict(), req, res);
    if (!body) return;
    const { data: current, error: readError } = await supabaseAdmin.from("businesses").select("id,name,commercial_term_months,commercial_product_slug,commercial_market").eq("id", businessId).maybeSingle();
    if (readError) return res.status(503).json({ error: "Business could not be loaded" });
    if (!current) return res.status(404).json({ error: "Business not found" });
    let effectiveTermMonths = body.termMonths;
    if (effectiveTermMonths === null && current.commercial_product_slug && current.commercial_market) {
      const { data: catalogueProduct } = await supabaseAdmin
        .from("commercial_products")
        .select("id,commercial_market_prices!inner(market,minimum_term_months,active)")
        .eq("slug", current.commercial_product_slug)
        .eq("commercial_market_prices.market", current.commercial_market)
        .eq("commercial_market_prices.active", true)
        .maybeSingle();
      const cataloguePrice = catalogueProduct && (Array.isArray((catalogueProduct as any).commercial_market_prices)
        ? (catalogueProduct as any).commercial_market_prices[0]
        : (catalogueProduct as any).commercial_market_prices);
      effectiveTermMonths = getMinimumTermMonths({ minimumTermMonths: cataloguePrice?.minimum_term_months });
    }
    const { data, error } = await supabaseAdmin.from("businesses").update({ commercial_term_months: effectiveTermMonths }).eq("id", businessId).select("id,name,commercial_term_months").single();
    if (error) return res.status(400).json({ error: "Contract term could not be updated" });
    await supabaseAdmin.from("admin_action_audit_logs").insert({
      actor_user_id: req.user.id,
      action_type: "business.contract_term_updated",
      target_type: "business",
      target_id: businessId,
      target_label: current.name || businessId,
      metadata: { previousTermMonths: current.commercial_term_months, requestedTermMonths: body.termMonths, effectiveTermMonths },
    });
    return res.json({ business: data, effectiveTermMonths });
  });

  app.patch("/api/admin/commercial-catalogue/prices/:id", authenticate, superAdminOnly, async (req: any, res: any) => {
    const id = String(req.params.id || "");
    if (!UUID_SCHEMA.safeParse(id).success) return res.status(400).json({ error: "Invalid price record" });
    const body = validateBody(z.object({
      monthlyPrice: z.number().finite().min(0).nullable().optional(),
      setupFee: z.number().finite().min(0).optional(),
      annualPrice: z.number().finite().min(0).nullable().optional(),
      stripeMonthlyPriceId: z.string().regex(/^price_[A-Za-z0-9_]+$/).nullable().optional(),
      stripeAnnualPriceId: z.string().regex(/^price_[A-Za-z0-9_]+$/).nullable().optional(),
      stripeSetupPriceId: z.string().regex(/^price_[A-Za-z0-9_]+$/).nullable().optional(),
      recurringMonthlyPrice: z.number().finite().min(0).nullable().optional(),
      recurringSetupFee: z.number().finite().min(0).nullable().optional(),
      recurringAnnualPrice: z.number().finite().min(0).nullable().optional(),
      minimumTermMonths: z.number().int().min(1).max(120).optional(),
      recurringStripeMonthlyPriceId: z.string().regex(/^price_[A-Za-z0-9_]+$/).nullable().optional(),
      recurringStripeAnnualPriceId: z.string().regex(/^price_[A-Za-z0-9_]+$/).nullable().optional(),
      recurringStripeSetupPriceId: z.string().regex(/^price_[A-Za-z0-9_]+$/).nullable().optional(),
      recurringConfigStatus: z.enum(["draft", "preview", "live", "disabled"]).optional(),
      active: z.boolean().optional(),
    }), req, res);
    if (!body) return;
    const patch: Record<string, unknown> = {};
    if (body.monthlyPrice !== undefined) patch.monthly_price = body.monthlyPrice;
    if (body.setupFee !== undefined) patch.setup_fee = body.setupFee;
    if (body.annualPrice !== undefined) patch.annual_price = body.annualPrice;
    if (body.stripeMonthlyPriceId !== undefined) patch.stripe_monthly_price_id = body.stripeMonthlyPriceId;
    if (body.stripeAnnualPriceId !== undefined) patch.stripe_annual_price_id = body.stripeAnnualPriceId;
    if (body.stripeSetupPriceId !== undefined) patch.stripe_setup_price_id = body.stripeSetupPriceId;
    if (body.recurringMonthlyPrice !== undefined) patch.recurring_monthly_price = body.recurringMonthlyPrice;
    if (body.recurringSetupFee !== undefined) patch.recurring_setup_fee = body.recurringSetupFee;
    if (body.recurringAnnualPrice !== undefined) patch.recurring_annual_price = body.recurringAnnualPrice;
    if (body.minimumTermMonths !== undefined) patch.minimum_term_months = body.minimumTermMonths;
    if (body.recurringStripeMonthlyPriceId !== undefined) patch.recurring_stripe_monthly_price_id = body.recurringStripeMonthlyPriceId;
    if (body.recurringStripeAnnualPriceId !== undefined) patch.recurring_stripe_annual_price_id = body.recurringStripeAnnualPriceId;
    if (body.recurringStripeSetupPriceId !== undefined) patch.recurring_stripe_setup_price_id = body.recurringStripeSetupPriceId;
    if (body.recurringConfigStatus !== undefined) patch.recurring_config_status = body.recurringConfigStatus;
    if (body.active !== undefined) patch.active = body.active;
    patch.updated_at = new Date().toISOString();
    const { data, error } = await supabaseAdmin.from("commercial_market_prices").update(patch).eq("id", id).select("*").single();
    if (error) return res.status(400).json({ error: "Price record could not be updated" });
    return res.json({ price: data });
  });

  app.post("/api/admin/commercial-catalogue/promotions", authenticate, superAdminOnly, async (req: any, res: any) => {
    const body = validateBody(z.object({
      name: z.string().trim().min(2).max(160), code: z.string().trim().max(80).nullable().optional(), market: z.enum(["MY", "SG", "GB", "INTL"]).nullable().optional(), productId: UUID_SCHEMA.nullable().optional(),
      promotionalMonthlyPrice: z.number().finite().min(0).nullable().optional(), promotionalSetupFee: z.number().finite().min(0).nullable().optional(), startsAt: z.string().datetime().nullable().optional(), endsAt: z.string().datetime().nullable().optional(), usageLimit: z.number().int().positive().nullable().optional(), commitmentMonths: z.number().int().positive().nullable().optional(), stripeMonthlyPriceId: z.string().regex(/^price_[A-Za-z0-9_]+$/).nullable().optional(), stripeSetupPriceId: z.string().regex(/^price_[A-Za-z0-9_]+$/).nullable().optional(), active: z.boolean().optional().default(false),
    }), req, res);
    if (!body) return;
    const { data, error } = await supabaseAdmin.from("commercial_promotions").insert({ code: body.code || null, name: body.name, market: body.market || null, product_id: body.productId || null, promotional_monthly_price: body.promotionalMonthlyPrice ?? null, promotional_setup_fee: body.promotionalSetupFee ?? null, starts_at: body.startsAt || null, ends_at: body.endsAt || null, usage_limit: body.usageLimit ?? null, commitment_months: body.commitmentMonths ?? null, stripe_monthly_price_id: body.stripeMonthlyPriceId || null, stripe_setup_price_id: body.stripeSetupPriceId || null, active: body.active }).select("*").single();
    if (error) return res.status(400).json({ error: "Promotion could not be created" });
    return res.status(201).json({ promotion: data });
  });

  app.patch("/api/admin/commercial-catalogue/promotions/:id", authenticate, superAdminOnly, async (req: any, res: any) => {
    const id = String(req.params.id || "");
    if (!UUID_SCHEMA.safeParse(id).success) return res.status(400).json({ error: "Invalid promotion" });
    const body = validateBody(z.object({ active: z.boolean().optional(), usageLimit: z.number().int().positive().nullable().optional(), endsAt: z.string().datetime().nullable().optional() }), req, res);
    if (!body) return;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.active !== undefined) patch.active = body.active;
    if (body.usageLimit !== undefined) patch.usage_limit = body.usageLimit;
    if (body.endsAt !== undefined) patch.ends_at = body.endsAt;
    const { data, error } = await supabaseAdmin.from("commercial_promotions").update(patch).eq("id", id).select("*").single();
    if (error) return res.status(400).json({ error: "Promotion could not be updated" });
    return res.json({ promotion: data });
  });

  app.get("/api/public/studio-showcases", rateLimit({ windowMs: 60 * 1000, max: 90, keyPrefix: "public-studio-showcases" }), async (_req, res) => {
    if (process.env.E2E_TEST === "true") return res.json({ showcases: {} });
    const { data, error } = await supabaseAdmin.from("settings").select("content").eq("id", "platform_studio_showcases").maybeSingle();
    if (error) return res.status(500).json({ error: "Studio showcase content is unavailable" });
    const showcases = data?.content?.showcases && typeof data.content.showcases === "object" ? data.content.showcases : {};
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
    return res.json({ showcases });
  });

  app.get("/api/admin/studio-showcases", authenticate, superAdminOnly, async (_req: any, res: any) => {
    const { data, error } = await supabaseAdmin.from("settings").select("content,updated_at").eq("id", "platform_studio_showcases").maybeSingle();
    if (error) return res.status(500).json({ error: "Studio showcase CMS could not be loaded" });
    return res.json({ showcases: data?.content?.showcases || {}, updatedAt: data?.updated_at || null });
  });

  app.put("/api/admin/studio-showcases", authenticate, superAdminOnly, async (req: any, res: any) => {
    const body = validateBody(z.object({
      showcases: z.record(z.string(), z.unknown()).refine((value) => Object.keys(value).length <= 20, "Too many showcase entries"),
    }), req, res);
    if (!body) return;
    const allowedSlugs = new Set(["dental-clinic", "renovation-contractor", "professional-advisory", "tuition-centre", "beauty-wellness", "accounting-firm"]);
    if (Object.keys(body.showcases).some((slug) => !allowedSlugs.has(slug))) return res.status(400).json({ error: "Unknown studio showcase slug" });
    if (Buffer.byteLength(JSON.stringify(body.showcases), "utf8") > 400_000) return res.status(413).json({ error: "Showcase content exceeds the 400 KB limit" });
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("settings").upsert({
      id: "platform_studio_showcases",
      content: { showcases: body.showcases },
      updated_at: now,
    }, { onConflict: "id" });
    if (error) {
      console.error("Studio showcase CMS save failed", error.message);
      return res.status(500).json({ error: "Studio showcase changes could not be saved" });
    }
    return res.json({ success: true, updatedAt: now });
  });

  const validatePlatformSiteCms = (content: Record<string, unknown>) => {
    const allowedPaths = new Set(["/", "/services", "/about", "/resources", "/contact", "/templates", "/pricing", "/how-it-works", "/case-studies", "/website-audit", "/generate-preview", "/dental-clinics", "/clinic-website-design", "/renovation-contractor-website-design", "/beauty-salon-website-design", "/tuition-centre-website-design", "/consultant-website-design", "/professional-services-website-design", "/accounting-firm-website-design", "/local-service-website-design", "/pay-monthly-websites", "/website-subscription-service"]);
    const replaceablePaths = new Set(["/services", "/about", "/resources", "/templates", "/how-it-works", "/case-studies", "/dental-clinics", "/clinic-website-design", "/renovation-contractor-website-design", "/beauty-salon-website-design", "/tuition-centre-website-design", "/consultant-website-design", "/professional-services-website-design", "/accounting-firm-website-design", "/local-service-website-design"]);
    const pages = content.pages && typeof content.pages === "object" ? Object.entries(content.pages as Record<string, unknown>) : [];
    if (pages.some(([path]) => !allowedPaths.has(path))) return "The site CMS contains an unsupported page path";
    const header = content.header && typeof content.header === "object" ? content.header as any : {};
    const navigation = header.navigation;
    if (!Array.isArray(navigation) || navigation.length > 12 || navigation.some((item) => typeof item?.label !== "string" || typeof item?.href !== "string" || (!item.href.startsWith("/") && !/^https?:\/\//i.test(item.href)) || item.href.startsWith("//"))) return "Navigation links must have a label and a safe site or HTTPS destination";
    if (header.primaryCtaHref && typeof header.primaryCtaHref === "string" && ((!header.primaryCtaHref.startsWith("/") || header.primaryCtaHref.startsWith("//")) && !/^https?:\/\//i.test(header.primaryCtaHref))) return "The header button must link to a site page or a secure HTTPS address";
    for (const [path, pageValue] of pages) {
      const page = pageValue && typeof pageValue === "object" ? pageValue as any : {};
      if (page.replacePageContent !== undefined && typeof page.replacePageContent !== "boolean") return "The page layout mode must be on or off";
      if (page.replacePageContent === true && !replaceablePaths.has(path)) return "CMS-built page mode is not available for this page";
      if (page.noIndex !== undefined && typeof page.noIndex !== "boolean") return "Search indexing must be either enabled or disabled";
      if (page.canonicalUrl && (typeof page.canonicalUrl !== "string" || ((!page.canonicalUrl.startsWith("/") || page.canonicalUrl.startsWith("//")) && !/^https?:\/\//i.test(page.canonicalUrl)))) return "Canonical URLs must use a site path or HTTPS";
      if (page.ogImage && (typeof page.ogImage !== "string" || ((!page.ogImage.startsWith("/") || page.ogImage.startsWith("//")) && !/^https?:\/\//i.test(page.ogImage)))) return "Social images must use a site path or HTTPS";
      const pageHrefs = [page.primaryCtaHref, ...((Array.isArray(page.sections) ? page.sections : []).map((section: any) => section?.ctaHref))].filter(Boolean);
      if (pageHrefs.some((href) => typeof href !== "string" || !href.startsWith("/") || href.startsWith("//"))) return "Page buttons must link to a safe site page";
      if (Array.isArray(page.sections) && page.sections.length > 30) return "Each page can contain up to 30 CMS sections";
      if (Array.isArray(page.sections) && page.sections.some((section: any) => !["rich_text", "feature_grid", "faq", "image_text", "cta"].includes(section?.type) || (Array.isArray(section?.items) && section.items.length > 16))) return "The page contains an unsupported section type or too many section items";
    }
    const footerGroups = (content.footer as any)?.groups;
    if (Array.isArray(footerGroups) && footerGroups.some((group: any) => Array.isArray(group?.links) && group.links.some((link: any) => typeof link?.label !== "string" || typeof link?.href !== "string" || (!link.href.startsWith("/") && !/^https?:\/\//i.test(link.href)) || link.href.startsWith("//")))) return "Footer links must have a label and a safe site or HTTPS destination";
    if (Buffer.byteLength(JSON.stringify(content), "utf8") > 500_000) return "Site CMS content exceeds the 500 KB limit";
    return null;
  };

  app.get("/api/public/platform-site-cms", rateLimit({ windowMs: 60 * 1000, max: 90, keyPrefix: "public-platform-site-cms" }), async (_req, res) => {
    if (process.env.E2E_TEST === "true") return res.json({ content: null });
    const { data, error } = await supabaseAdmin.from("settings").select("content").eq("id", "platform_site_cms").maybeSingle();
    if (error) return res.status(500).json({ error: "Public site content is unavailable" });
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
    return res.json({ content: data?.content?.published || null });
  });

  app.get("/api/admin/platform-site-cms", authenticate, superAdminOnly, async (_req: any, res: any) => {
    const { data, error } = await supabaseAdmin.from("settings").select("content,updated_at").eq("id", "platform_site_cms").maybeSingle();
    if (error) return res.status(500).json({ error: "Site CMS could not be loaded" });
    const envelope = data?.content || {};
    return res.json({ content: { draft: envelope.draft || null, published: envelope.published || null, revisions: envelope.revisions || [], updatedAt: data?.updated_at || null, publishedAt: envelope.publishedAt || null } });
  });

  app.get("/api/admin/websites/:websiteId/revisions", authenticate, async (req: any, res: any) => {
    const websiteId = String(req.params.websiteId || "");
    if (!UUID_SCHEMA.safeParse(websiteId).success) return res.status(400).json({ error: "Invalid website reference" });
    try {
      const { data: website, error: websiteError } = await supabaseAdmin.from("websites").select("id,business_id").eq("id", websiteId).maybeSingle();
      if (websiteError) throw websiteError;
      if (!website) return res.status(404).json({ error: "Website not found" });
      await assertBusinessAccess(req.user.id, website.business_id);
      const { data, error } = await supabaseAdmin.from("settings").select("content").eq("id", `website_revisions_${websiteId}`).maybeSingle();
      if (error) throw error;
      res.setHeader("Cache-Control", "private, no-store");
      return res.json({ revisions: Array.isArray(data?.content?.revisions) ? data.content.revisions : [] });
    } catch (error: any) {
      if (error?.message === "BUSINESS_NOT_FOUND" || error?.message === "FORBIDDEN_BUSINESS_ACCESS" || error?.message === "PROFILE_NOT_FOUND") return handleAccessError(res, error);
      console.error("Website revision history load failed:", error?.message || error);
      return res.status(500).json({ error: "Website history could not be loaded" });
    }
  });

  app.post("/api/admin/websites/:websiteId/revisions", authenticate, async (req: any, res: any) => {
    const websiteId = String(req.params.websiteId || "");
    if (!UUID_SCHEMA.safeParse(websiteId).success) return res.status(400).json({ error: "Invalid website reference" });
    try {
      const { data: website, error: websiteError } = await supabaseAdmin.from("websites").select("id,business_id,status,pages,theme,seo,updated_at").eq("id", websiteId).maybeSingle();
      if (websiteError) throw websiteError;
      if (!website) return res.status(404).json({ error: "Website not found" });
      await assertBusinessAccess(req.user.id, website.business_id);
      const content = {
        pages: Array.isArray(website.pages) ? website.pages : [],
        theme: website.theme && typeof website.theme === "object" ? website.theme : {},
        seo: Object.fromEntries(["title", "description", "keywords", "favicon", "ogImage", "canonicalUrl", "region", "placename", "latitude", "longitude", "businessType", "address", "phone", "openingHours", "priceRange", "ratingValue", "reviewCount", "brandVoice", "targetAudience", "coreValueProposition", "knowledgeBaseSummary"].filter((key) => website.seo?.[key] !== undefined).map((key) => [key, website.seo[key]])),
      };
      const serialized = JSON.stringify(content);
      if (Buffer.byteLength(serialized, "utf8") > 800_000) return res.status(413).json({ error: "This website is too large to add to version history" });
      const { data: existing, error: readError } = await supabaseAdmin.from("settings").select("content").eq("id", `website_revisions_${websiteId}`).maybeSingle();
      if (readError) throw readError;
      const revisions = Array.isArray(existing?.content?.revisions) ? existing.content.revisions : [];
      if (JSON.stringify(revisions[0]?.content) !== serialized) {
        const revision = { id: `revision_${Date.now()}`, savedAt: new Date().toISOString(), status: website.status || "draft", sourceUpdatedAt: website.updated_at || null, content };
        const nextRevisions = [revision, ...revisions].slice(0, 5);
        const { error } = await supabaseAdmin.from("settings").upsert({ id: `website_revisions_${websiteId}`, content: { revisions: nextRevisions }, updated_at: revision.savedAt }, { onConflict: "id" });
        if (error) throw error;
        res.setHeader("Cache-Control", "private, no-store");
        return res.json({ success: true, revisions: nextRevisions });
      }
      res.setHeader("Cache-Control", "private, no-store");
      return res.json({ success: true, revisions });
    } catch (error: any) {
      if (error?.message === "BUSINESS_NOT_FOUND" || error?.message === "FORBIDDEN_BUSINESS_ACCESS" || error?.message === "PROFILE_NOT_FOUND") return handleAccessError(res, error);
      console.error("Website revision snapshot failed:", error?.message || error);
      return res.status(500).json({ error: "Website version could not be saved" });
    }
  });

  app.put("/api/admin/platform-site-cms", authenticate, superAdminOnly, async (req: any, res: any) => {
    const body = validateBody(z.object({ content: z.record(z.string(), z.unknown()) }), req, res);
    if (!body) return;
    const validationError = validatePlatformSiteCms(body.content);
    if (validationError) return res.status(validationError.includes("500 KB") ? 413 : 400).json({ error: validationError });
    const { data: existing, error: readError } = await supabaseAdmin.from("settings").select("content").eq("id", "platform_site_cms").maybeSingle();
    if (readError) return res.status(500).json({ error: "Current CMS content could not be read" });
    const now = new Date().toISOString();
    const nextEnvelope = { ...(existing?.content || {}), draft: body.content };
    const { error } = await supabaseAdmin.from("settings").upsert({ id: "platform_site_cms", content: nextEnvelope, updated_at: now }, { onConflict: "id" });
    if (error) {
      console.error("Platform site CMS save failed", error.message);
      return res.status(500).json({ error: "Site content could not be saved" });
    }
    return res.json({ success: true, content: { ...nextEnvelope, updatedAt: now } });
  });

  app.post("/api/admin/platform-site-cms/publish", authenticate, superAdminOnly, async (req: any, res: any) => {
    const body = validateBody(z.object({ content: z.record(z.string(), z.unknown()) }), req, res);
    if (!body) return;
    const validationError = validatePlatformSiteCms(body.content);
    if (validationError) return res.status(validationError.includes("500 KB") ? 413 : 400).json({ error: validationError });
    const pageEntries = body.content.pages && typeof body.content.pages === "object" ? Object.entries(body.content.pages as Record<string, any>) : [];
    if (pageEntries.some(([, page]) => page?.replacePageContent === true && (!Array.isArray(page.sections) || page.sections.length === 0))) return res.status(400).json({ error: "Add at least one section to every CMS-built page before publishing" });
    const { data: existing, error: readError } = await supabaseAdmin.from("settings").select("content").eq("id", "platform_site_cms").maybeSingle();
    if (readError) return res.status(500).json({ error: "Current CMS content could not be read" });
    const now = new Date().toISOString();
    const oldPublished = existing?.content?.published;
    const revisions = Array.isArray(existing?.content?.revisions) ? existing.content.revisions : [];
    const nextEnvelope = { ...(existing?.content || {}), draft: body.content, published: body.content, publishedAt: now, revisions: oldPublished ? [{ publishedAt: existing.content.publishedAt || now, content: oldPublished }, ...revisions].slice(0, 10) : revisions };
    const { error } = await supabaseAdmin.from("settings").upsert({ id: "platform_site_cms", content: nextEnvelope, updated_at: now }, { onConflict: "id" });
    if (error) {
      console.error("Platform site CMS publish failed", error.message);
      return res.status(500).json({ error: "Site content could not be published" });
    }
    return res.json({ success: true, content: { ...nextEnvelope, updatedAt: now } });
  });

  app.get("/api/public/site-config", rateLimit({ windowMs: 60 * 1000, max: 60, keyPrefix: "public-site-config" }), async (_req, res) => {
    if (process.env.E2E_TEST === "true") {
      return res.json({ platform: {}, landingPage: null, policies: [], posts: [] });
    }
    const [
      { data: settingsRows, error: settingsError },
      { data: postRows, error: postsError },
    ] = await Promise.all([
      supabaseAdmin.from("settings").select("id,content").in("id", ["platform", "platform_policies", "landing_page"]),
      supabaseAdmin.from("posts").select("*").eq("is_platform_post", true).eq("status", "published").order("created_at", { ascending: false }).limit(3),
    ]);
    if (settingsError) return res.status(500).json({ error: "Public site settings are unavailable" });

    const settings = new Map((settingsRows || []).map((row: any) => [row.id, row.content || {}]));
    const platform = settings.get("platform") || {};
    const publicPlatformKeys = [
      "name", "salesPageTitle", "maintenanceMode", "maintenanceMessage", "maintenanceTitle", "estimatedDowntime",
      "supportEmail", "supportPhone", "companyName", "companyRegistrationNumber", "businessAddress", "gaMeasurementId", "metaPixelId", "salesWhatsappAriaLabel", "salesWhatsappEnabled",
      "salesWhatsappLink", "salesWhatsappMessage", "salesCookieBannerEnabled", "trackingScriptsHeader", "trackingScriptsFooter",
      "publicProofTestimonialIds",
    ];
    const publicPlatform: Record<string, unknown> = Object.fromEntries(
      publicPlatformKeys.filter((key) => platform[key] !== undefined).map((key) => [key, platform[key]]),
    );
    const landingSettings = settings.get("landing_page") || {};
    if (
      publicPlatform.publicProofTestimonialIds === undefined &&
      Array.isArray(landingSettings.publicProofTestimonialIds)
    ) {
      publicPlatform.publicProofTestimonialIds = landingSettings.publicProofTestimonialIds;
    }
    const policies = Array.isArray(settings.get("platform_policies")?.policies)
      ? settings.get("platform_policies").policies.filter((policy: any) => policy?.status === "published")
      : [];

    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return res.json({
      platform: publicPlatform,
      landingPage: settings.get("landing_page") || null,
      policies,
      posts: !postsError && Array.isArray(postRows) ? postRows : [],
    });
  });

  app.get("/api/public/geo-pricing", rateLimit({ windowMs: 60 * 1000, max: 60, keyPrefix: "public-geo-pricing" }), async (req, res) => {
    const countryCode = String(req.headers["x-vercel-ip-country"] || "US").toUpperCase().slice(0, 2);
    const market = "INTL" as const;
    let detectedCountryName = countryCode === "US" ? "Global" : countryCode;
    try {
      detectedCountryName = new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) || detectedCountryName;
    } catch {
      // A readable fallback is already set.
    }
    const { data } = await supabaseAdmin
      .from("geo_pricing")
      .select("discount_percentage,country_name,stripe_coupon_id")
      .eq("country_code", countryCode)
      .eq("is_enabled", true)
      .maybeSingle();
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.json({
      countryCode,
      market,
      currency: commercialCurrencyForMarket(market),
      countryName: data?.country_name || detectedCountryName,
      discountPercentage: Number(data?.discount_percentage || 0),
      couponId: data?.stripe_coupon_id || null,
    });
  });

  app.post("/api/public/call-bookings", rateLimit({ windowMs: 60 * 1000, max: 8, keyPrefix: "call-bookings" }), async (req, res) => {
    const body = validateBody(z.object({ leadId: UUID_SCHEMA.optional(), name: TEXT_SCHEMA, email: EMAIL_SCHEMA, phone: z.string().max(80).optional(), businessName: TEXT_SCHEMA, market: z.enum(["MY", "SG", "GB", "US"]).optional(), industry: z.string().max(160).optional(), websiteUrl: z.string().url().max(500).optional(), startAt: z.string().datetime(), timezone: z.literal(SALES_CALL_TIMEZONE).default(SALES_CALL_TIMEZONE), goals: z.string().max(2000).optional(), previewId: z.string().trim().max(160).optional(), selectedProduct: z.enum(["personal-profile", "managed-website", "website-growth", "growth-partner"]).optional(), sourcePage: z.string().trim().max(500).optional() }), req, res);
    if (!body) return;
    const startAt = new Date(body.startAt);
    if (startAt <= new Date() || startAt > new Date(Date.now() + 15 * 86400000)) return res.status(400).json({ error: "Choose an available time in the next 14 days" });
    if (!isAllowedSalesCallSlot(startAt)) return res.status(400).json({ error: "Choose one of the published call times" });
    if (body.leadId) {
      const { data: lead, error: leadError } = await supabaseAdmin.from("leads").select("id,email").eq("id", body.leadId).maybeSingle();
      if (leadError || !lead || String(lead.email || "").toLowerCase() !== body.email.toLowerCase()) return res.status(400).json({ error: "The lead reference is not valid for this booking" });
    }
    const endAt = new Date(startAt.getTime() + SALES_CALL_DURATION_MINUTES * 60000);
    const { data: conflict } = await supabaseAdmin.from("sales_call_bookings").select("id").eq("status", "booked").lt("start_at", endAt.toISOString()).gt("end_at", startAt.toISOString()).maybeSingle();
    if (conflict) return res.status(409).json({ error: "That time was just booked. Please choose another." });
    const { data: booking, error } = await supabaseAdmin.from("sales_call_bookings").insert({ lead_id: body.leadId || null, name: body.name, email: body.email, phone: body.phone || null, business_name: body.businessName, market: body.market || null, industry: body.industry || null, website_url: body.websiteUrl || null, start_at: startAt.toISOString(), end_at: endAt.toISOString(), timezone: body.timezone, goals: body.goals || null, metadata: { previewId: body.previewId || null, selectedProduct: body.selectedProduct || "managed-website", sourcePage: body.sourcePage || "/book-demo" } }).select("*").single();
    if (error?.code === "23505") return res.status(409).json({ error: "That time was just booked. Please choose another." });
    if (error) return res.status(500).json({ error: "Booking could not be saved" });
    if (body.leadId) await supabaseAdmin.from("leads").update({ status: "meeting", automation_next_action: "Prepare for confirmed growth call", next_follow_up_at: startAt.toISOString() }).eq("id", body.leadId);
    await supabaseAdmin.from("sales_tasks").insert({ lead_id: body.leadId || null, title: `Prepare for call with ${body.businessName}`, task_type: "call_prep", priority: "high", due_at: new Date(startAt.getTime() - 24 * 3600000).toISOString(), metadata: { bookingId: booking.id } });
    const formattedSlot = new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short", timeZone: body.timezone }).format(startAt);
    const reminderLeadTime = startAt.getTime() - Date.now() > 26 * 3600000 ? 24 * 3600000 : 2 * 3600000;
    await supabaseAdmin.from("sales_messages").insert([
      { lead_id: body.leadId || null, recipient: body.email.toLowerCase(), channel: "email", subject: `Confirmed: Bennie Studio website review`, body_text: `Hi ${body.name.split(/\s+/)[0]},\n\nYour 30-minute managed website review for ${body.businessName} is confirmed for ${formattedSlot} (${body.timezone}).\n\nI will review the context you shared before the call. If your priorities change, reply to this email so I can prepare around the right goal.\n\nReschedule or cancel: ${publicAppUrl()}/manage-call/${booking.confirmation_token}\n\nBennie`, status: "queued", scheduled_at: new Date().toISOString(), provider_payload: { bookingId: booking.id, messageType: "booking_confirmation" } },
      { lead_id: body.leadId || null, recipient: body.email.toLowerCase(), channel: "email", subject: `Reminder: upcoming website review`, body_text: `Hi ${body.name.split(/\s+/)[0]},\n\nA quick reminder that our managed website review for ${body.businessName} is scheduled for ${formattedSlot} (${body.timezone}).\n\nPlease reply if there is a specific service, offer, or enquiry problem you want me to prioritise.\n\nBennie`, status: "queued", scheduled_at: new Date(startAt.getTime() - reminderLeadTime).toISOString(), provider_payload: { bookingId: booking.id, messageType: "booking_reminder" } },
    ]);
    void processDueSalesMessages(10).catch((sendError) => console.warn("Booking confirmation will retry on cron:", safeErrorMessage(sendError)));
    return res.status(201).json({ booking, manageUrl: `${publicAppUrl()}/manage-call/${booking.confirmation_token}` });
  });

  app.get("/api/public/call-bookings/:token", rateLimit({ windowMs: 60 * 1000, max: 30, keyPrefix: "call-booking-manage" }), async (req, res) => {
    if (!UUID_SCHEMA.safeParse(req.params.token).success) return res.status(400).json({ error: "Invalid booking link" });
    const { data, error } = await supabaseAdmin.from("sales_call_bookings").select("id,name,business_name,start_at,end_at,timezone,status,confirmation_token").eq("confirmation_token", req.params.token).maybeSingle();
    if (error || !data) return res.status(404).json({ error: "Booking not found" });
    return res.json({ booking: data });
  });

  app.post("/api/public/call-bookings/:token/reschedule", rateLimit({ windowMs: 60 * 1000, max: 6, keyPrefix: "call-booking-reschedule" }), async (req, res) => {
    if (!UUID_SCHEMA.safeParse(req.params.token).success) return res.status(400).json({ error: "Invalid booking link" });
    const body = validateBody(z.object({ startAt: z.string().datetime() }), req, res);
    if (!body) return;
    const startAt = new Date(body.startAt);
    const endAt = new Date(startAt.getTime() + 30 * 60000);
    if (startAt <= new Date() || startAt > new Date(Date.now() + 15 * 86400000)) return res.status(400).json({ error: "Choose an available time in the next 14 days" });
    if (!isAllowedSalesCallSlot(startAt)) return res.status(400).json({ error: "Choose one of the published call times" });
    const { data: booking } = await supabaseAdmin.from("sales_call_bookings").select("*").eq("confirmation_token", req.params.token).maybeSingle();
    if (!booking || booking.status === "cancelled") return res.status(404).json({ error: "Active booking not found" });
    const { data: conflict } = await supabaseAdmin.from("sales_call_bookings").select("id").neq("id", booking.id).eq("status", "booked").lt("start_at", endAt.toISOString()).gt("end_at", startAt.toISOString()).maybeSingle();
    if (conflict) return res.status(409).json({ error: "That time was just booked. Please choose another." });
    const { data: updated, error } = await supabaseAdmin.from("sales_call_bookings").update({ start_at: startAt.toISOString(), end_at: endAt.toISOString(), status: "booked", updated_at: new Date().toISOString() }).eq("id", booking.id).select("*").single();
    if (error?.code === "23505") return res.status(409).json({ error: "That time was just booked. Please choose another." });
    if (error) return res.status(500).json({ error: "Booking could not be rescheduled" });
    await supabaseAdmin.from("sales_messages").update({ status: "cancelled", updated_at: new Date().toISOString() }).contains("provider_payload", { bookingId: booking.id }).in("status", ["queued", "approved"]);
    const formattedSlot = new Intl.DateTimeFormat("en", { dateStyle: "full", timeStyle: "short", timeZone: booking.timezone }).format(startAt);
    const reminderLeadTime = startAt.getTime() - Date.now() > 26 * 3600000 ? 24 * 3600000 : 2 * 3600000;
    await supabaseAdmin.from("sales_messages").insert([
      { lead_id: booking.lead_id || null, recipient: booking.email.toLowerCase(), channel: "email", subject: "Updated: Bennie Studio website review", body_text: `Hi ${booking.name.split(/\s+/)[0]},\n\nYour managed website review for ${booking.business_name} has been moved to ${formattedSlot} (${booking.timezone}).\n\nBennie`, status: "queued", scheduled_at: new Date().toISOString(), provider_payload: { bookingId: booking.id, messageType: "reschedule_confirmation" } },
      { lead_id: booking.lead_id || null, recipient: booking.email.toLowerCase(), channel: "email", subject: "Reminder: upcoming website review", body_text: `Hi ${booking.name.split(/\s+/)[0]},\n\nA quick reminder that our managed website review for ${booking.business_name} is scheduled for ${formattedSlot} (${booking.timezone}).\n\nPlease reply if there is a specific service, offer, or enquiry problem you want me to prioritise.\n\nBennie`, status: "queued", scheduled_at: new Date(startAt.getTime() - reminderLeadTime).toISOString(), provider_payload: { bookingId: booking.id, messageType: "booking_reminder" } },
    ]);
    if (booking.lead_id) await supabaseAdmin.from("leads").update({ status: "meeting", next_follow_up_at: startAt.toISOString(), automation_next_action: "Prepare for rescheduled growth call" }).eq("id", booking.lead_id);
    void processDueSalesMessages(10).catch(() => undefined);
    return res.json({ booking: updated });
  });

  app.post("/api/public/call-bookings/:token/cancel", rateLimit({ windowMs: 60 * 1000, max: 6, keyPrefix: "call-booking-cancel" }), async (req, res) => {
    if (!UUID_SCHEMA.safeParse(req.params.token).success) return res.status(400).json({ error: "Invalid booking link" });
    const { data: booking, error } = await supabaseAdmin.from("sales_call_bookings").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("confirmation_token", req.params.token).neq("status", "cancelled").select("id,lead_id").maybeSingle();
    if (error || !booking) return res.status(404).json({ error: "Active booking not found" });
    await supabaseAdmin.from("sales_messages").update({ status: "cancelled", updated_at: new Date().toISOString() }).contains("provider_payload", { bookingId: booking.id }).in("status", ["queued", "approved"]);
    if (booking.lead_id) await supabaseAdmin.from("leads").update({ status: "qualified", automation_next_action: "Ask whether a different call time would help", next_follow_up_at: null }).eq("id", booking.lead_id);
    return res.json({ success: true });
  });

  // Resend Email API
  app.post(
    "/api/send-email",
    authenticate,
    rateLimit({
      windowMs: 60 * 1000,
      max: 20,
      keyPrefix: "send-email",
      key: (req) => req.user?.id || getClientIp(req),
    }),
    async (req: any, res) => {
    try {
      const emailBody = validateBody(
        z.object({
          to: z.union([EMAIL_SCHEMA, z.array(EMAIL_SCHEMA).min(1).max(10)]),
          subject: z.string().trim().min(1).max(160),
          html: z.string().min(1).max(100_000),
        }),
        req,
        res,
      );
      if (!emailBody) return;

      const profile = await getProfileForUser(req.user.id);
      if (!["business_admin", "super_admin", "staff"].includes(profile.role)) {
        return res.status(403).json({ error: "Forbidden: email sending is restricted" });
      }

      const { to, subject, html } = emailBody;
      console.log(`[Email] Sending to ${to} subject: ${subject}`);
      const resend = getResend();
      const { data, error } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || platformSettings?.emailFrom || "onboarding@resend.dev",
        to,
        subject,
        html,
      });

      if (error) {
        console.error("Resend API Error:", error);
        // Provider responses can contain account, domain and request details.
        // Keep those in server logs only; clients receive a stable generic error.
        return res.status(502).json({
          error: "EMAIL_PROVIDER_ERROR",
          message: "Email could not be sent. Please try again.",
        });
      }

      res.json(data);
    } catch (error: any) {
      console.error("Email Sending Logic Error:", error);
      if (error.message === "RESEND_CONFIG_ERROR") {
        return res.status(503).json({
          error: "Email service not configured",
          message: "RESEND_API_KEY is missing from environment or settings.",
        });
      }
      res.status(500).json({ 
        error: "Failed to send email",
        message: "Email could not be sent. Please try again."
      });
    }
  });




  // Sales Funnel Engine public boundary. Public visitors never write directly to
  // tenant tables; the server validates published state and records events with
  // the service role.
  const sendFunnelEmail = async ({ to, subject, html }: { to: string; subject: string; html: string }) => {
    const recipient = normalizeSalesEmail(to);
    if (!recipient || await isSalesSuppressed(supabaseAdmin, recipient)) throw new Error("CONTACT_SUPPRESSED");
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || platformSettings?.emailFrom || "onboarding@resend.dev",
      to,
      subject,
      html,
    });
    if (error) throw new Error("EMAIL_PROVIDER_ERROR");
  };

  const getOrCreateFunnelSession = async ({
    funnel,
    sessionKey,
    stepId,
    leadId,
    source,
    medium,
    campaign,
    referrer,
    device,
    metadata = {},
  }: any) => {
    const { data: existing } = await supabaseAdmin
      .from("funnel_sessions")
      .select("*")
      .eq("public_session_key", sessionKey)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabaseAdmin
        .from("funnel_sessions")
        .update({
          current_step_id: stepId || existing.current_step_id,
          lead_id: leadId || existing.lead_id,
          last_source: source || existing.last_source,
          last_medium: medium || existing.last_medium,
          last_campaign: campaign || existing.last_campaign,
          referrer: referrer || existing.referrer,
          device: device || existing.device,
          last_seen_at: new Date().toISOString(),
          metadata: { ...(existing.metadata || {}), ...(metadata || {}) },
        })
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabaseAdmin
      .from("funnel_sessions")
      .insert({
        public_session_key: sessionKey,
        business_id: funnel.business_id,
        funnel_id: funnel.id,
        lead_id: leadId || null,
        first_step_id: stepId || null,
        current_step_id: stepId || null,
        first_source: source || null,
        first_medium: medium || null,
        first_campaign: campaign || null,
        last_source: source || null,
        last_medium: medium || null,
        last_campaign: campaign || null,
        referrer: referrer || null,
        device: device || null,
        metadata,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  };

  app.get(
    "/api/public/funnels/:businessId/:funnelSlug",
    rateLimit({ windowMs: 60 * 1000, max: 120, keyPrefix: "public-funnel-read" }),
    async (req: any, res: any) => {
      const businessId = String(req.params.businessId || "");
      const funnelSlug = String(req.params.funnelSlug || "").trim().toLowerCase();
      if (!UUID_SCHEMA.safeParse(businessId).success || !/^[a-z0-9-]{1,80}$/.test(funnelSlug)) {
        return res.status(400).json({ error: "Invalid funnel route." });
      }
      try {
        const { data: funnel, error } = await supabaseAdmin
          .from("funnels")
          .select("*")
          .eq("business_id", businessId)
          .eq("slug", funnelSlug)
          .eq("status", "published")
          .maybeSingle();
        if (error) throw error;
        if (!funnel) return res.status(404).json({ error: "This funnel is not published." });

        const [{ data: business }, { data: steps }, { data: connections }, { data: variants }, { data: offers }] = await Promise.all([
          supabaseAdmin.from("businesses").select("id,name,industry,location").eq("id", businessId).maybeSingle(),
          supabaseAdmin.from("funnel_steps").select("*").eq("funnel_id", funnel.id).eq("status", "published").order("sort_order"),
          supabaseAdmin.from("funnel_connections").select("*").eq("funnel_id", funnel.id).order("priority"),
          supabaseAdmin.from("funnel_variants").select("id,step_id,name,weight,status,page_content").eq("funnel_id", funnel.id).eq("status", "active"),
          supabaseAdmin.from("funnel_offers").select("id,step_id,offer_type,name,description,amount,currency,active,settings").eq("funnel_id", funnel.id).eq("active", true),
        ]);

        return res.json({
          funnel,
          business,
          steps: steps || [],
          connections: connections || [],
          variants: variants || [],
          offers: offers || [],
        });
      } catch (error: any) {
        console.error("Public funnel load failed:", error?.message || error);
        return res.status(503).json({ error: "This funnel is temporarily unavailable." });
      }
    },
  );

  app.post(
    "/api/public/funnels/:funnelId/events",
    rateLimit({ windowMs: 60 * 1000, max: 180, keyPrefix: "public-funnel-event" }),
    async (req: any, res: any) => {
      const funnelId = String(req.params.funnelId || "");
      if (!UUID_SCHEMA.safeParse(funnelId).success) return res.status(400).json({ error: "Invalid funnel." });
      const body = validateBody(z.object({
        sessionKey: z.string().uuid(),
        stepId: UUID_SCHEMA.optional().nullable(),
        variantId: UUID_SCHEMA.optional().nullable(),
        eventType: z.string().trim().min(1).max(80),
        source: z.string().trim().max(120).optional(),
        medium: z.string().trim().max(120).optional(),
        campaign: z.string().trim().max(180).optional(),
        content: z.string().trim().max(180).optional(),
        term: z.string().trim().max(180).optional(),
        referrer: z.string().trim().max(1000).optional(),
        device: z.string().trim().max(40).optional(),
        revenue: z.coerce.number().min(0).max(100000000).optional(),
        currency: z.string().trim().min(3).max(3).optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      }), req, res);
      if (!body) return;
      try {
        const { data: funnel } = await supabaseAdmin.from("funnels").select("id,business_id,status").eq("id", funnelId).maybeSingle();
        if (!funnel || funnel.status !== "published") return res.status(404).json({ error: "Funnel not found." });
        if (body.stepId) {
          const { data: step } = await supabaseAdmin.from("funnel_steps").select("id").eq("id", body.stepId).eq("funnel_id", funnelId).maybeSingle();
          if (!step) return res.status(400).json({ error: "Invalid funnel step." });
        }
        const session = await getOrCreateFunnelSession({ funnel, ...body });
        const { error } = await supabaseAdmin.from("funnel_events").insert({
          business_id: funnel.business_id,
          funnel_id: funnel.id,
          step_id: body.stepId || null,
          variant_id: body.variantId || null,
          session_id: session.id,
          lead_id: session.lead_id || null,
          event_type: body.eventType,
          source: body.source || session.last_source || null,
          medium: body.medium || session.last_medium || null,
          campaign: body.campaign || session.last_campaign || null,
          content: body.content || null,
          term: body.term || null,
          referrer: body.referrer || session.referrer || null,
          device: body.device || session.device || null,
          revenue: body.revenue ?? null,
          currency: body.currency || null,
          metadata: body.metadata || {},
        });
        if (error) throw error;
        return res.status(201).json({ success: true, sessionId: session.id });
      } catch (error: any) {
        console.error("Funnel event failed:", error?.message || error);
        return res.status(503).json({ error: "Event could not be recorded." });
      }
    },
  );

  app.post(
    "/api/public/funnels/:funnelId/submit",
    rateLimit({ windowMs: 60 * 60 * 1000, max: 30, keyPrefix: "public-funnel-submit" }),
    async (req: any, res: any) => {
      const funnelId = String(req.params.funnelId || "");
      if (!UUID_SCHEMA.safeParse(funnelId).success) return res.status(400).json({ error: "Invalid funnel." });
      const body = validateBody(z.object({
        sessionKey: z.string().uuid(),
        stepId: UUID_SCHEMA,
        variantId: UUID_SCHEMA.optional().nullable(),
        data: z.record(z.string(), z.any()),
        source: z.string().trim().max(120).optional(),
        medium: z.string().trim().max(120).optional(),
        campaign: z.string().trim().max(180).optional(),
        referrer: z.string().trim().max(1000).optional(),
        device: z.string().trim().max(40).optional(),
      }), req, res);
      if (!body) return;
      const entries = Object.entries(body.data || {});
      if (entries.length > 40) return res.status(400).json({ error: "Too many form fields." });

      const cleaned = Object.fromEntries(entries.map(([key, value]) => {
        const safeKey = String(key).replace(/[^a-zA-Z0-9_\-]/g, "").slice(0, 80);
        if (Array.isArray(value)) return [safeKey, value.slice(0, 20).map((item) => String(item).slice(0, 500))];
        if (typeof value === "number" || typeof value === "boolean") return [safeKey, value];
        return [safeKey, String(value ?? "").slice(0, 3000)];
      }).filter(([key]) => Boolean(key)));

      try {
        const { data: funnel } = await supabaseAdmin.from("funnels").select("*").eq("id", funnelId).eq("status", "published").maybeSingle();
        if (!funnel) return res.status(404).json({ error: "Funnel not found." });
        const { data: step } = await supabaseAdmin.from("funnel_steps").select("*").eq("id", body.stepId).eq("funnel_id", funnel.id).eq("status", "published").maybeSingle();
        if (!step) return res.status(400).json({ error: "Invalid funnel step." });

        let session = await getOrCreateFunnelSession({ funnel, ...body, stepId: step.id });
        const emailValue = String((cleaned as any).email || "").trim().toLowerCase();
        const email = EMAIL_SCHEMA.safeParse(emailValue).success ? emailValue : null;
        let lead: any = null;

        if (email) {
          const { data: existing } = await supabaseAdmin.from("leads").select("*").eq("business_id", funnel.business_id).eq("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();
          const rawFields = {
            ...(existing?.raw_fields || {}),
            ...cleaned,
            funnel: {
              funnelId: funnel.id,
              funnelName: funnel.name,
              funnelStepId: step.id,
              funnelStepName: step.name,
              sessionKey: body.sessionKey,
              source: body.source || session.last_source || null,
              medium: body.medium || session.last_medium || null,
              campaign: body.campaign || session.last_campaign || null,
            },
          };
          if (existing) {
            const { data: updated, error } = await supabaseAdmin.from("leads").update({
              name: String((cleaned as any).name || existing.name || email.split("@")[0]).slice(0, 200),
              phone: String((cleaned as any).phone || existing.phone || "").slice(0, 100) || null,
              message: String((cleaned as any).message || existing.message || `Funnel submission: ${step.name}`).slice(0, 5000),
              source_platform: "funnel",
              source_page: step.slug,
              form_name: step.name,
              raw_fields: rawFields,
              last_touch_source: body.source || session.last_source || existing.last_touch_source || "funnel",
              referrer: body.referrer || existing.referrer || null,
              campaign: body.campaign || session.last_campaign || existing.campaign || null,
            }).eq("id", existing.id).select("*").single();
            if (error) throw error;
            lead = updated;
          } else {
            const { data: created, error } = await supabaseAdmin.from("leads").insert({
              business_id: funnel.business_id,
              name: String((cleaned as any).name || email.split("@")[0]).slice(0, 200),
              email,
              phone: String((cleaned as any).phone || "").slice(0, 100) || null,
              message: String((cleaned as any).message || `Funnel submission: ${step.name}`).slice(0, 5000),
              status: "new",
              source_platform: "funnel",
              source_page: step.slug,
              form_name: step.name,
              raw_fields: rawFields,
              visitor_id: body.sessionKey,
              first_touch_source: body.source || session.first_source || "funnel",
              last_touch_source: body.source || session.last_source || "funnel",
              referrer: body.referrer || null,
              campaign: body.campaign || session.last_campaign || null,
            }).select("*").single();
            if (error) throw error;
            lead = created;
          }
          session = await getOrCreateFunnelSession({ funnel, ...body, stepId: step.id, leadId: lead.id });
        }

        const submissionType = step.step_type === "survey" ? "survey" : step.step_type === "appointment" ? "appointment" : step.step_type === "application" ? "application" : "form";
        const { data: submission, error: submissionError } = await supabaseAdmin.from("funnel_submissions").insert({
          business_id: funnel.business_id,
          funnel_id: funnel.id,
          step_id: step.id,
          session_id: session.id,
          lead_id: lead?.id || null,
          submission_type: submissionType,
          data: cleaned,
        }).select("id").single();
        if (submissionError) throw submissionError;

        let triggerEvent = step.step_type === "survey" ? "survey_completed" : "form_submitted";
        if (step.step_type === "appointment" && lead && (cleaned as any).date && (cleaned as any).time) {
          const { error: appointmentError } = await supabaseAdmin.from("appointments").insert({
            business_id: funnel.business_id,
            customer_name: String((cleaned as any).name || lead.name || "Funnel lead").slice(0, 200),
            customer_email: lead.email,
            service: String((cleaned as any).service || funnel.name).slice(0, 200),
            date: String((cleaned as any).date),
            time: String((cleaned as any).time),
            status: "pending",
          });
          if (appointmentError) throw appointmentError;
          triggerEvent = "appointment_booked";
        }

        const { data: edges } = await supabaseAdmin.from("funnel_connections").select("*").eq("funnel_id", funnel.id).order("priority");
        const nextStepId = nextStepForSubmission(edges || [], step.id, cleaned, Number(lead?.automation_score || 0));
        const nextStep = nextStepId ? (await supabaseAdmin.from("funnel_steps").select("id,slug").eq("id", nextStepId).maybeSingle()).data : null;

        await supabaseAdmin.from("funnel_events").insert({
          business_id: funnel.business_id,
          funnel_id: funnel.id,
          step_id: step.id,
          variant_id: body.variantId || null,
          session_id: session.id,
          lead_id: lead?.id || null,
          event_type: triggerEvent,
          source: body.source || session.last_source || null,
          medium: body.medium || session.last_medium || null,
          campaign: body.campaign || session.last_campaign || null,
          referrer: body.referrer || session.referrer || null,
          device: body.device || session.device || null,
          metadata: { submissionId: submission.id, nextStepId: nextStep?.id || null },
        });

        void runFunnelAutomations({
          db: supabaseAdmin,
          sendEmail: sendFunnelEmail,
          businessId: funnel.business_id,
          funnelId: funnel.id,
          triggerEvent,
          leadId: lead?.id || null,
          sessionId: session.id,
          context: { ...cleaned, email: lead?.email || email || null, submissionId: submission.id, stepId: step.id },
        }).catch((automationError) => console.warn("Funnel automation start failed:", safeErrorMessage(automationError)));

        return res.status(201).json({ success: true, leadId: lead?.id || null, submissionId: submission.id, nextStepId: nextStep?.id || null, nextSlug: nextStep?.slug || null });
      } catch (error: any) {
        console.error("Funnel submission failed:", error?.message || error);
        return res.status(503).json({ error: "Your information could not be submitted. Please try again." });
      }
    },
  );

  app.post(
    "/api/public/funnels/:funnelId/checkout",
    rateLimit({ windowMs: 60 * 60 * 1000, max: 8, keyPrefix: "public-funnel-checkout" }),
    async (req: any, res: any) => {
      const funnelId = String(req.params.funnelId || "");
      if (!UUID_SCHEMA.safeParse(funnelId).success) return res.status(400).json({ error: "Invalid funnel." });
      const body = validateBody(z.object({
        sessionKey: z.string().uuid(),
        stepId: UUID_SCHEMA,
        offerId: UUID_SCHEMA,
      }), req, res);
      if (!body) return;

      try {
        const { data: funnel } = await supabaseAdmin.from("funnels").select("*").eq("id", funnelId).eq("status", "published").maybeSingle();
        if (!funnel) return res.status(404).json({ error: "Funnel not found." });
        const { data: step } = await supabaseAdmin.from("funnel_steps").select("id,slug").eq("id", body.stepId).eq("funnel_id", funnel.id).maybeSingle();
        if (!step) return res.status(400).json({ error: "Invalid checkout step." });
        const { data: offer } = await supabaseAdmin.from("funnel_offers").select("*").eq("id", body.offerId).eq("funnel_id", funnel.id).eq("active", true).maybeSingle();
        if (!offer) return res.status(409).json({ error: "This funnel offer is not active." });
        if (Number(offer.amount || 0) <= 0 && !offer.stripe_price_id) return res.status(409).json({ error: "This offer does not have a valid payment amount." });

        const sessionRecord = await getOrCreateFunnelSession({ funnel, sessionKey: body.sessionKey, stepId: step.id });
        const { data: edges } = await supabaseAdmin.from("funnel_connections").select("*").eq("funnel_id", funnel.id).eq("source_step_id", step.id).order("priority");
        const nextEdge =
          (edges || []).find((edge: any) => edge.condition_type === "purchased")
          || (edges || []).find((edge: any) => edge.condition_type === "always")
          || (edges || [])[0];
        const nextStep = nextEdge ? (await supabaseAdmin.from("funnel_steps").select("slug").eq("id", nextEdge.target_step_id).maybeSingle()).data : null;
        const successSlug = nextStep?.slug || step.slug;

        const stripe = await getStripe(funnel.business_id);
        const mode = offer.settings?.mode === "subscription" ? "subscription" : "payment";
        let lineItem: any;
        if (offer.stripe_price_id) {
          lineItem = { price: offer.stripe_price_id, quantity: 1 };
        } else {
          lineItem = {
            quantity: 1,
            price_data: {
              currency: String(offer.currency || "USD").toLowerCase(),
              unit_amount: Math.round(Number(offer.amount || 0) * 100),
              product_data: { name: offer.name, description: offer.description || undefined },
              ...(mode === "subscription" ? { recurring: { interval: "month" } } : {}),
            },
          };
        }

        const session = await stripe.checkout.sessions.create({
          mode,
          payment_method_types: ["card"],
          line_items: [lineItem],
          success_url: `${publicAppUrl()}/f/${funnel.business_id}/${funnel.slug}/${successSlug}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${publicAppUrl()}/f/${funnel.business_id}/${funnel.slug}/${step.slug}?checkout_cancelled=1`,
          metadata: {
            type: "funnel_sale",
            businessId: funnel.business_id,
            funnelId: funnel.id,
            funnelStepId: step.id,
            funnelSessionId: sessionRecord.id,
            offerId: offer.id,
            leadId: sessionRecord.lead_id || "",
          },
          ...(sessionRecord.lead_id ? {} : {}),
        });

        await supabaseAdmin.from("funnel_events").insert({
          business_id: funnel.business_id,
          funnel_id: funnel.id,
          step_id: step.id,
          session_id: sessionRecord.id,
          lead_id: sessionRecord.lead_id || null,
          event_type: "checkout_started",
          currency: offer.currency || "USD",
          metadata: { offerId: offer.id, stripeSessionId: session.id },
        });
        return res.json({ url: session.url, id: session.id });
      } catch (error: any) {
        console.error("Funnel checkout failed:", error?.message || error);
        if (["STRIPE_CONFIG_ERROR","STRIPE_SECRET_KEY_REQUIRED_BUT_GOT_PUBLISHABLE","STRIPE_INVALID_KEY_FORMAT"].includes(error?.message)) {
          return res.status(409).json({ error: "Stripe is not configured for this customer yet." });
        }
        return res.status(503).json({ error: "Secure checkout could not be started." });
      }
    },
  );


  app.post(
    "/api/funnels/strategy",
    authenticate,
    rateLimit({ windowMs: 60 * 60 * 1000, max: 20, keyPrefix: "funnel-strategy" }),
    async (req: any, res: any) => {
      const body = validateBody(z.object({
        businessId: UUID_SCHEMA,
        offer: z.string().trim().min(2).max(500),
        audience: z.string().trim().min(2).max(700),
        trafficSource: z.string().trim().min(2).max(120),
        objective: z.enum(["lead","appointment","quote","application","sale","subscription"]),
        knownObjections: z.string().trim().max(1500).optional(),
      }), req, res);
      if (!body) return;

      try {
        const [caller, businessResult] = await Promise.all([
          getProfileForUser(req.user.id),
          supabaseAdmin
            .from("businesses")
            .select("id,name,industry,location,business_type,business_nature,custom_enabled_features,sales_funnels_access_mode")
            .eq("id", body.businessId)
            .maybeSingle(),
        ]);
        const business = businessResult.data;
        if (!business) return res.status(404).json({ error: "Business not found." });

        const features = Array.isArray(business.custom_enabled_features) ? business.custom_enabled_features : [];
        const internalAllowed =
          caller?.role === "super_admin"
          || (caller?.role === "platform_staff" && (caller?.staff_permissions || []).includes("delivery"));
        const customerAllowed =
          caller?.role === "business_admin"
          && caller?.business_id === body.businessId
          && features.includes("sales_funnels")
          && business.sales_funnels_access_mode !== "managed";

        if (!internalAllowed && !customerAllowed) {
          return res.status(403).json({ error: "Funnel strategy access is not enabled for this account." });
        }

        const usableKey = (value: unknown) =>
          typeof value === "string"
          && value.trim().length >= 10
          && !/TODO|PLACEHOLDER|YOUR_|^MY_|^GEMINI_/i.test(value.trim());
        const providers: Array<{ name: "openai" | "deepseek"; key: string }> = [
          { name: "openai", key: usableKey(process.env.OPENAI_API_KEY) ? String(process.env.OPENAI_API_KEY).trim() : "" },
          { name: "deepseek", key: usableKey(process.env.DEEPSEEK_API_KEY) ? String(process.env.DEEPSEEK_API_KEY).trim() : "" },
        ].filter((item): item is { name: "openai" | "deepseek"; key: string } => Boolean(item.key));
        if (!providers.length) return res.status(503).json({ error: "No AI provider is configured for funnel strategy." });

        const StepType = z.enum(["landing","sales","lead_form","survey","application","appointment","checkout","order_bump","upsell","downsell","confirmation","thank_you","custom"]);
        const StrategySchema = z.object({
          name: z.string().trim().min(2).max(140),
          objective: z.enum(["lead","appointment","quote","application","sale","subscription"]),
          rationale: z.string().trim().min(10).max(1600),
          steps: z.array(z.object({
            type: StepType,
            name: z.string().trim().min(2).max(120),
            headline: z.string().trim().min(2).max(220),
            subheadline: z.string().trim().max(500).optional(),
            ctaLabel: z.string().trim().max(80).optional(),
            rationale: z.string().trim().max(700).optional(),
          })).min(2).max(10),
          cautions: z.array(z.string().trim().min(2).max(300)).max(8).optional().default([]),
        });

        const verifiedContext = {
          businessName: business.name,
          industry: business.industry || null,
          location: business.location || null,
          businessType: business.business_type || null,
          businessNature: business.business_nature || null,
          offer: body.offer,
          audience: body.audience,
          trafficSource: body.trafficSource,
          objective: body.objective,
          knownObjections: body.knownObjections || null,
        };
        const systemMessage = [
          "You are the Bennie Studio funnel strategist.",
          "Design a concise conversion journey using only the verified context supplied.",
          "You may propose structure and draft generic conversion copy.",
          "Never invent prices, discounts, availability, guarantees, testimonials, customers, credentials, performance claims, health claims, quantified results, or business facts.",
          "If a fact would be useful but is not provided, put it in cautions instead of inventing it.",
          "Use appointment steps as requests unless verified live availability is explicitly supplied.",
          "Return JSON only matching the requested schema.",
        ].join(" ");
        const prompt = [
          "VERIFIED CONTEXT:",
          JSON.stringify(verifiedContext, null, 2),
          "",
          "Create a practical sales funnel with 2-10 steps.",
          "Match the primary objective. Lead/appointment funnels should not force checkout.",
          "Sale/subscription funnels may use checkout, order bump, upsell or downsell only where commercially coherent.",
          "End in confirmation or thank_you.",
          "Return keys: name, objective, rationale, steps[{type,name,headline,subheadline,ctaLabel,rationale}], cautions[].",
        ].join("\n");

        const provider = providers[0];
        const request = { prompt, systemMessage, temperature: 0.2, maxTokens: 2200, isJson: true };
        const response = provider.name === "openai"
          ? await callOpenAI(provider.key, request, "gpt-5.6-luna")
          : await callDeepSeek(provider.key, request, "deepseek-chat");

        let parsedJson: unknown;
        try {
          parsedJson = JSON.parse(String(response.text || "").trim());
        } catch {
          return res.status(502).json({ error: "AI returned an invalid funnel strategy. Try again." });
        }
        const strategy = StrategySchema.safeParse(parsedJson);
        if (!strategy.success) {
          return res.status(502).json({ error: "AI returned an incomplete funnel strategy. Try again." });
        }

        await supabaseAdmin.from("ai_generation_logs").insert({
          user_id: req.user.id,
          project_id: body.businessId,
          feature_key: "funnel_strategy",
          provider: provider.name,
          model: provider.name === "openai" ? "gpt-5.6-luna" : "deepseek-chat",
          prompt_tokens: response.usage.promptTokens,
          output_tokens: response.usage.completionTokens,
          status: "completed",
          review_status: "draft",
          provenance: { verifiedContext, generatedBy: req.user.id },
        }).then(({ error }) => {
          if (error) console.warn("Funnel AI provenance log skipped:", error.message);
        });

        return res.status(201).json({
          strategy: strategy.data,
          reviewStatus: "draft",
          provider: provider.name,
        });
      } catch (error: any) {
        captureServerError(error, { requestId: req.requestId, phase: "funnel_strategy" });
        return res.status(502).json({ error: "Funnel strategy could not be generated. No funnel was changed." });
      }
    },
  );

  // Admin Member Routes
  app.post("/api/admin/create-member", authenticate, async (req, res) => {
    const body = validateBody(z.object({
      email: EMAIL_SCHEMA,
      password: z.string().min(12).max(200),
      role: z.enum(["business_admin", "staff"]),
      businessId: UUID_SCHEMA,
    }), req, res);
    if (!body) return;
    const { email, password, role, businessId } = body;
    const userId = (req as any).user.id;

    try {
      // 1. Verify caller is a business admin for this business OR super admin
      const profile = await assertBusinessAccess(userId, businessId);

      if (
        !profile ||
        (profile.role !== "business_admin" && profile.role !== "super_admin")
      ) {
        return res
          .status(403)
          .json({ error: "Only business admins can add team members" });
      }

      if (profile.role !== "super_admin" && profile.business_id !== businessId) {
        return res
          .status(403)
          .json({ error: "Forbidden: You can only add members to your own business" });
      }

      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseServiceKey) {
        return res.status(500).json({
          error: "Server configuration error: Service role key missing",
        });
      }

      const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // 2. Create user in Auth
      const { data: authUser, error: authError } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { role, business_id: businessId },
        });

      if (authError) throw authError;

      // 3. Profiles table
      const { error: profileError } = await adminClient
        .from("profiles")
        .upsert({
          id: authUser.user.id,
          email: email.toLowerCase(),
          role: role,
          business_id: businessId,
          onboarding_completed: true,
        });

      if (profileError) throw profileError;

      res.status(200).json({
        success: true,
        message: "Member created successfully",
        userId: authUser.user.id,
      });
    } catch (err: any) {
      if (
        [
          "BUSINESS_ID_REQUIRED",
          "BUSINESS_NOT_FOUND",
          "PROFILE_NOT_FOUND",
          "FORBIDDEN_BUSINESS_ACCESS",
        ].includes(err?.message)
      ) {
        return handleAccessError(res, err);
      }
      console.error("Error creating team member:", err);
      res.status(500).json({ error: safeErrorMessage(err) });
    }
  });

  app.patch("/api/admin/team-members/:memberId", authenticate, async (req: any, res) => {
    const memberId = String(req.params.memberId || "");
    const body = validateBody(z.object({ role: z.enum(["business_admin", "staff"]), businessId: UUID_SCHEMA }), req, res);
    if (!body || !UUID_SCHEMA.safeParse(memberId).success) return;
    try {
      const caller = await assertBusinessAccess(req.user.id, body.businessId);
      if (!caller || !["business_admin", "super_admin"].includes(caller.role) || (caller.role !== "super_admin" && caller.business_id !== body.businessId)) return res.status(403).json({ error: "Team management access required" });
      if (memberId === req.user.id) return res.status(400).json({ error: "You cannot change your own role" });
      const { data: member } = await supabaseAdmin.from("profiles").select("id,business_id,role").eq("id", memberId).maybeSingle();
      if (!member || member.business_id !== body.businessId) return res.status(404).json({ error: "Team member not found" });
      if (member.role === "business_admin" && body.role !== "business_admin") {
        const { count, error: countError } = await supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("business_id", body.businessId)
          .eq("role", "business_admin");
        if (countError) throw countError;
        if ((count || 0) <= 1) return res.status(409).json({ error: "The final business admin cannot be demoted" });
      }
      const { error } = await supabaseAdmin.from("profiles").update({ role: body.role }).eq("id", memberId).eq("business_id", body.businessId);
      if (error) throw error;
      await supabaseAdmin.from("admin_action_audit_logs").insert({
        actor_user_id: req.user.id,
        actor_email: req.user.email || null,
        action_type: "team_member_role_changed",
        target_type: "profile",
        target_id: memberId,
        metadata: { businessId: body.businessId, fromRole: member.role, toRole: body.role },
      });
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Team role update failed", error?.message || error);
      return res.status(503).json({ error: "Team role could not be updated" });
    }
  });

  app.delete("/api/admin/team-members/:memberId", authenticate, async (req: any, res) => {
    const memberId = String(req.params.memberId || "");
    const businessId = String(req.body?.businessId || req.query.businessId || "");
    if (!UUID_SCHEMA.safeParse(memberId).success || !UUID_SCHEMA.safeParse(businessId).success) return res.status(400).json({ error: "Valid member and business IDs are required" });
    try {
      const caller = await assertBusinessAccess(req.user.id, businessId);
      if (!caller || !["business_admin", "super_admin"].includes(caller.role) || (caller.role !== "super_admin" && caller.business_id !== businessId)) return res.status(403).json({ error: "Team management access required" });
      if (memberId === req.user.id) return res.status(400).json({ error: "You cannot remove yourself" });
      const { data: member } = await supabaseAdmin.from("profiles").select("id,role").eq("id", memberId).eq("business_id", businessId).maybeSingle();
      if (!member) return res.status(404).json({ error: "Team member not found" });
      if (member.role === "business_admin") {
        const { count, error: countError } = await supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("role", "business_admin");
        if (countError) throw countError;
        if ((count || 0) <= 1) return res.status(409).json({ error: "The final business admin cannot be removed" });
      }
      const { error } = await supabaseAdmin.from("profiles").update({ business_id: null, role: "client" }).eq("id", memberId).eq("business_id", businessId);
      if (error) throw error;
      await supabaseAdmin.from("admin_action_audit_logs").insert({
        actor_user_id: req.user.id,
        actor_email: req.user.email || null,
        action_type: "team_member_removed",
        target_type: "profile",
        target_id: memberId,
        metadata: { businessId, previousRole: member.role },
      });
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Team member removal failed", error?.message || error);
      return res.status(503).json({ error: "Team member could not be removed" });
    }
  });
  app.patch("/api/admin/platform-staff/:memberId/permissions", authenticate, async (req: any, res) => {
    const memberId = String(req.params.memberId || "");
    const body = validateBody(z.object({ permissions: z.array(z.string().trim().min(1).max(80)).max(50) }), req, res);
    if (!body || !UUID_SCHEMA.safeParse(memberId).success) return;
    const caller = await getProfileForUser(req.user.id);
    if (caller?.role !== "super_admin") return res.status(403).json({ error: "Super admin access required" });
    const { data: member } = await supabaseAdmin.from("profiles").select("id,role").eq("id", memberId).maybeSingle();
    if (!member || member.role !== "platform_staff") return res.status(404).json({ error: "Platform staff member not found" });
    const { error } = await supabaseAdmin.from("profiles").update({ staff_permissions: body.permissions }).eq("id", memberId);
    if (error) return res.status(503).json({ error: "Staff permissions could not be updated" });
    return res.json({ success: true, permissions: body.permissions });
  });

  // Optional acquisition offer for NEW customers only. A one-time fixed-value
  // coupon offsets the first monthly charge, not future recurring invoices.
  // This preserves immediate setup payment and normal paid-subscription activation.
  const INTRO_OFFER_CODE = "FIRST_MONTH_FREE_12M";
  const INTRO_OFFER_TERM_MONTHS = 12;
  async function createIntroOfferCoupon(stripe: any, amount: number, currency: string, reference: string) {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("INTRO_OFFER_INVALID_AMOUNT");
    return stripe.coupons.create({
      amount_off: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      duration: "once",
      max_redemptions: 1,
      name: "First managed-service month free — 12-month commitment",
      metadata: { offerCode: INTRO_OFFER_CODE, checkoutReference: reference },
    }, { idempotencyKey: `bt-firstmonth12-${crypto.createHash("sha256").update(`${reference}:${currency}:${amount}`).digest("hex")}` });
  }

  app.post(
    "/api/public/plan-checkout",
    rateLimit({ windowMs: 60 * 60 * 1000, max: 5, keyPrefix: "public-plan-checkout" }),
    async (req: any, res: any) => {
      const body = validateBody(z.object({
        productSlug: z.enum(["personal-profile", "managed-website", "website-growth", "growth-partner"]),
        billingCycle: z.literal("monthly").optional().default("monthly"),
        currency: z.literal("USD").optional().default("USD"),
        customerEmail: EMAIL_SCHEMA.optional().nullable(),
        referralCode: z.string().trim().max(120).optional().nullable(),
        introOffer: z.literal("FIRST_MONTH_FREE_12M").optional(),
        termsAccepted: z.literal(true),
      }), req, res);
      if (!body) return;

      const market = commercialMarketForCurrency(body.currency);
      try {
        const { data: product, error: productError } = await supabaseAdmin
          .from("commercial_products")
          .select("id,slug,name,description,sales_motion,entitlement_plan_slug,active,commercial_market_prices!inner(market,currency,recurring_monthly_price,recurring_setup_fee,minimum_term_months,recurring_stripe_monthly_price_id,recurring_stripe_setup_price_id,recurring_config_status,active)")
          .eq("slug", body.productSlug)
          .eq("active", true)
          .eq("commercial_market_prices.market", market)
          .eq("commercial_market_prices.active", true)
          .maybeSingle();
        if (productError) throw productError;

        const price = product && (Array.isArray(product.commercial_market_prices)
          ? product.commercial_market_prices[0]
          : product.commercial_market_prices);
        if (!product || !price || product.sales_motion !== "self_serve") {
          return res.status(409).json({ error: "This plan is not available for self-serve checkout." });
        }
        if (
          price.recurring_config_status !== "live"
          || Number(price.recurring_monthly_price || 0) <= 0
        ) {
          return res.status(409).json({
            error: "Secure checkout for this plan is not active yet.",
            code: "PLAN_CHECKOUT_NOT_LIVE",
          });
        }

        const monthly = Number(price.recurring_monthly_price || 0);
        const otcWaiver=await resolveOtcWaiver();
        const originalSetup=Number(price.recurring_setup_fee || 0);
        const setup=otcWaiver ? 0 : originalSetup;
        const isIntroOffer = body.introOffer === INTRO_OFFER_CODE;
        if (isIntroOffer && !body.customerEmail) {
          return res.status(400).json({ error: "Enter your email to check introductory offer eligibility." });
        }
        const termMonths = isIntroOffer ? INTRO_OFFER_TERM_MONTHS : getMinimumTermMonths({ minimumTermMonths: price.minimum_term_months }, COMMERCIAL_RECURRING_COMMITMENT_MONTHS);
        const termsAcceptedAt = new Date().toISOString();
        const checkoutRef = crypto.randomUUID();
        const stripe = await getStripe();
        if (isIntroOffer && !(await isNewIntroOfferCustomer(body.customerEmail, stripe, supabaseAdmin))) {
          return res.status(409).json({ error: "This offer is available to new Bennie Studio customers only." });
        }
        // Test-mode QA cannot use live-mode Price IDs from the commercial
        // catalogue. Build equivalent inline prices only when the deployment
        // is explicitly configured with the Stripe test key and test flag.
        const useInlinePrices = true;
        const lineItems: any[] = useInlinePrices
          ? [
              {
                price_data: {
                  currency: String(price.currency || commercialCurrencyForMarket(market)).toLowerCase(),
                  product_data: { name: product.name, description: product.description || undefined },
                  unit_amount: Math.round(monthly * 100),
                  recurring: { interval: "month" },
                },
                quantity: 1,
              },
              ...(setup > 0
                ? [{
                    price_data: {
                      currency: String(price.currency || commercialCurrencyForMarket(market)).toLowerCase(),
                      product_data: { name: `${product.name} setup`, description: "One-time website setup" },
                      unit_amount: Math.round(setup * 100),
                    },
                    quantity: 1,
                  }]
                : []),
            ]
          : [{ price: price.recurring_stripe_monthly_price_id, quantity: 1 }];
        if (!useInlinePrices && setup > 0) {
          if (!price.recurring_stripe_setup_price_id) {
            return res.status(409).json({
              error: "The setup fee is not configured for secure checkout yet.",
              code: "SETUP_PRICE_NOT_CONFIGURED",
            });
          }
          lineItems.push({ price: price.recurring_stripe_setup_price_id, quantity: 1 });
        }

        // Validate the live Stripe catalogue before creating any pending
        // Bennie Studio record. Failed configuration checks must not leave junk.
        const verifyStripePrice = async (priceId: string, expectedAmount: number, recurring: boolean) => {
          const live = await syncCommercialStripeProductLabel(stripe, priceId, product.name, product.description);
          if (live.active === false || String(live.currency || "").toUpperCase() !== String(price.currency || commercialCurrencyForMarket(market)).toUpperCase()) {
            throw new Error("STRIPE_CATALOG_MISMATCH");
          }
          if (Number(live.unit_amount || 0) !== Math.round(expectedAmount * 100)) {
            throw new Error("STRIPE_CATALOG_MISMATCH");
          }
          if (recurring && (!live.recurring || live.recurring.interval !== "month" || live.recurring.interval_count !== 1)) {
            throw new Error("STRIPE_CATALOG_MISMATCH");
          }
          if (!recurring && live.recurring) throw new Error("STRIPE_CATALOG_MISMATCH");
        };
        if (!useInlinePrices) {
          await verifyStripePrice(price.recurring_stripe_monthly_price_id, monthly, true);
          if (setup > 0) await verifyStripePrice(price.recurring_stripe_setup_price_id, setup, false);
        }

        const introCoupon = isIntroOffer ? await createIntroOfferCoupon(stripe, monthly, String(price.currency || commercialCurrencyForMarket(market)), checkoutRef) : null;
        const affiliateAttribution = await resolvePlatformAffiliateAttribution(body.referralCode);

        const { data: business, error: businessError } = await supabaseAdmin
          .from("businesses")
          .insert({
            name: "New Bennie Studio customer",
            owner_id: null,
            plan: product.entitlement_plan_slug || product.slug,
            status: "pending",
            subscription_status: "incomplete",
            industry: "Professional Services",
            business_nature: "Managed website customer awaiting checkout completion",
            business_type: "local_service",
            lifecycle_stage: "checkout",
            lifecycle_stage_changed_at: new Date().toISOString(),
            commercial_product_slug: product.slug,
            commercial_market: market,
            commercial_currency: price.currency || commercialCurrencyForMarket(market),
            commercial_term_months: termMonths,
            referred_by_affiliate_id: affiliateAttribution?.id || null,
            admin_notes: `Created from public pricing checkout ${checkoutRef}. Awaiting payment/account activation.`,
          })
          .select("id")
          .single();
        if (businessError || !business) throw businessError || new Error("BUSINESS_CREATE_FAILED");

        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          payment_method_types: ["card"],
          payment_method_collection: "always",
          billing_address_collection: "required",
          tax_id_collection: { enabled: true },
          ...(body.customerEmail ? { customer_email: body.customerEmail } : {}),
          line_items: lineItems,
          ...(introCoupon ? { discounts: [{ coupon: introCoupon.id }] } : {}),
          success_url: `${publicAppUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}&public_order=1&preview_id=${encodeURIComponent(checkoutRef)}&direct_checkout=1`,
          cancel_url: `${publicAppUrl()}/pricing?product=${encodeURIComponent(product.slug)}&cancelled=1`,
          metadata: {
            businessId: business.id,
            productSlug: product.slug,
            market,
            currency: price.currency || commercialCurrencyForMarket(market),
            termMonths: String(termMonths),
            introOffer: isIntroOffer ? INTRO_OFFER_CODE : "",
            introOfferDiscount: isIntroOffer ? String(monthly) : "0",
            otcWaiver: otcWaiver || "", waivedSetupAmount: otcWaiver ? String(originalSetup) : "0",
            previewId: checkoutRef,
            publicOrder: "1",
            directCheckout: "1",
            affiliateId: affiliateAttribution?.id || "",
            type: "subscription",
            termsVersion: COMMERCIAL_TERMS_VERSION,
            termsAcceptedAt,
          },
          subscription_data: {
            metadata: {
              businessId: business.id,
              productSlug: product.slug,
              previewId: checkoutRef,
              publicOrder: "1",
              directCheckout: "1",
              affiliateId: affiliateAttribution?.id || "",
              termMonths: String(termMonths),
              introOffer: isIntroOffer ? INTRO_OFFER_CODE : "",
              termsVersion: COMMERCIAL_TERMS_VERSION,
              termsAcceptedAt,
            },
          },
        });

        await supabaseAdmin.from("businesses").update({
          admin_notes: `Public pricing checkout ${checkoutRef}; Stripe session ${session.id}. Awaiting payment/account activation.`,
          updated_at: new Date().toISOString(),
        }).eq("id", business.id);

        return res.json({
          success: true,
          url: session.url,
          checkoutRef,
          businessId: business.id,
          dueToday: setup + (isIntroOffer ? 0 : monthly),
          introOfferDiscount: isIntroOffer ? monthly : 0,
          introOffer: isIntroOffer ? INTRO_OFFER_CODE : null,
          monthly,
          setup,
          currency: price.currency || commercialCurrencyForMarket(market),
          termMonths,
        });
      } catch (error: any) {
        console.error("Public plan checkout failed", error?.message || error);
        if (error?.message === "STRIPE_CATALOG_MISMATCH") {
          return res.status(503).json({
            error: "Secure checkout pricing is being verified. Please try again later.",
            code: "STRIPE_CATALOG_MISMATCH",
          });
        }
        return res.status(500).json({ error: "Secure checkout could not be started." });
      }
    },
  );

  app.post(
    "/api/public/preview-checkout",
    rateLimit({ windowMs: 60 * 60 * 1000, max: 3, keyPrefix: "preview-checkout" }),
    rateLimit({
      windowMs: 24 * 60 * 60 * 1000,
      max: 2,
      keyPrefix: "preview-checkout-email",
      key: (req) => String(req.body?.email || getClientIp(req)).trim().toLowerCase(),
    }),
    async (req: any, res: any) => {
      const body = validateBody(z.object({
        previewId: z.string().trim().min(8).max(160),
        leadId: UUID_SCHEMA,
        email: EMAIL_SCHEMA,
        productSlug: z.enum(["personal-profile", "managed-website", "website-growth", "growth-partner"]),
        currency: z.literal("USD").optional().default("USD"),
        referralCode: z.string().trim().max(120).optional().nullable(),
        introOffer: z.literal("FIRST_MONTH_FREE_12M").optional(),
        termsAccepted: z.literal(true),
      }), req, res);
      if (!body) return;

      try {
        const { data: lead, error: leadError } = await supabaseAdmin
          .from("leads")
          .select("id,name,email,phone,business_id,preview_id,raw_fields,status")
          .eq("id", body.leadId)
          .ilike("email", body.email)
          .maybeSingle();
        if (leadError) throw leadError;
        if (!lead || lead.preview_id !== body.previewId) {
          return res.status(403).json({ error: "This preview could not be verified." });
        }

        const previewProfile = lead.raw_fields?.previewProfile || {};
        const businessName = String(
          previewProfile.businessName
          || lead.raw_fields?.businessName
          || lead.name
          || "Website customer",
        ).trim().slice(0, 160);
        const industry = String(
          lead.raw_fields?.industry
          || lead.raw_fields?.service
          || "Professional Services",
        ).trim().slice(0, 160);
        const location = String(previewProfile.location || "").trim().slice(0, 160);

        const market = commercialMarketForCurrency(body.currency);
        const { data: product, error: productError } = await supabaseAdmin
          .from("commercial_products")
          .select("id,slug,name,description,sales_motion,entitlement_plan_slug,active,commercial_market_prices!inner(market,currency,recurring_monthly_price,recurring_setup_fee,minimum_term_months,recurring_stripe_monthly_price_id,recurring_stripe_setup_price_id,recurring_config_status,active)")
          .eq("slug", body.productSlug)
          .eq("active", true)
          .eq("commercial_market_prices.market", market)
          .eq("commercial_market_prices.active", true)
          .maybeSingle();
        if (productError) throw productError;
        const price = product && (Array.isArray(product.commercial_market_prices)
          ? product.commercial_market_prices[0]
          : product.commercial_market_prices);
        if (!product || !price || product.sales_motion !== "self_serve") {
          return res.status(409).json({ error: "This plan is not available for self-serve checkout." });
        }
        if (
          price.recurring_config_status !== "live"
          || Number(price.recurring_monthly_price || 0) <= 0
        ) {
          return res.status(409).json({
            error: "Secure checkout for this plan is not active yet. Your preview and lead details are saved.",
            code: "PREVIEW_CHECKOUT_NOT_LIVE",
          });
        }

        const monthly = Number(price.recurring_monthly_price || 0);
        const otcWaiver=await resolveOtcWaiver(lead.business_id || null);
        const originalSetup=Number(price.recurring_setup_fee || 0);
        const setup=otcWaiver ? 0 : originalSetup;
        const isIntroOffer = body.introOffer === INTRO_OFFER_CODE;
        const stripe = await getStripe();
        if (isIntroOffer && !(await isNewIntroOfferCustomer(body.email, stripe, supabaseAdmin))) {
          return res.status(409).json({ error: "This offer is available to new Bennie Studio customers only." });
        }
        const termMonths = isIntroOffer ? INTRO_OFFER_TERM_MONTHS : getMinimumTermMonths({ minimumTermMonths: price.minimum_term_months }, COMMERCIAL_DEFAULT_COMMITMENT_MONTHS);
        const termsAcceptedAt = new Date().toISOString();
        const dueToday = setup + (isIntroOffer ? 0 : monthly);
        const referralCode =
          body.referralCode
          || lead.raw_fields?.referralCode
          || lead.raw_fields?.attribution?.referralCode
          || null;
        const affiliateAttribution = await resolvePlatformAffiliateAttribution(referralCode);

        let businessId = lead.business_id || null;
        if (businessId) {
          const { data: existingBusiness } = await supabaseAdmin
            .from("businesses")
            .select("id,owner_id,lifecycle_stage")
            .eq("id", businessId)
            .maybeSingle();
          if (!existingBusiness || existingBusiness.owner_id) businessId = null;
        }

        if (!businessId) {
          const { data: business, error: businessError } = await supabaseAdmin
            .from("businesses")
            .insert({
              name: businessName,
              owner_id: null,
              plan: product.entitlement_plan_slug || product.slug,
              status: "pending",
              subscription_status: "incomplete",
              industry,
              location: location || null,
              business_nature: String(previewProfile.description || industry).slice(0, 500),
              business_type: "local_service",
              lifecycle_stage: "checkout",
              lifecycle_stage_changed_at: new Date().toISOString(),
              commercial_product_slug: product.slug,
              commercial_market: market,
              commercial_currency: price.currency || "USD",
              commercial_term_months: termMonths,
              referred_by_affiliate_id: affiliateAttribution?.id || null,
              admin_notes: `Created from public preview ${body.previewId}. Awaiting payment/account activation.`,
            })
            .select("id")
            .single();
          if (businessError || !business) throw businessError || new Error("BUSINESS_CREATE_FAILED");
          businessId = business.id;
          await supabaseAdmin.from("leads").update({
            business_id: businessId,
            automation_next_action: "Checkout started from website preview",
          }).eq("id", lead.id);
        } else {
          await supabaseAdmin.from("businesses").update({
            plan: product.entitlement_plan_slug || product.slug,
            status: "pending",
            subscription_status: "incomplete",
            lifecycle_stage: "checkout",
            lifecycle_stage_changed_at: new Date().toISOString(),
            commercial_product_slug: product.slug,
            commercial_market: market,
            commercial_currency: price.currency || "USD",
            commercial_term_months: termMonths,
          }).eq("id", businessId);
        }

        if (affiliateAttribution?.id) {
          await supabaseAdmin
            .from("businesses")
            .update({ referred_by_affiliate_id: affiliateAttribution.id })
            .eq("id", businessId)
            .is("referred_by_affiliate_id", null);
        }

        const { data: existingOrder } = await supabaseAdmin
          .from("orders")
          .select("id,status,stripe_session_id,items")
          .eq("business_id", businessId)
          .eq("customer_email", body.email)
          .eq("status", "pending")
          .contains("items", [{ previewId: body.previewId }])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const orderItems = [{
          type: "managed_website_subscription",
          previewId: body.previewId,
          leadId: lead.id,
          productSlug: product.slug,
          productName: product.name,
          setupFee: setup,
          monthlyPrice: monthly,
          currency: price.currency || "USD",
          minimumTermMonths: termMonths,
          introOffer: isIntroOffer ? INTRO_OFFER_CODE : null,
          discountAmount: isIntroOffer ? monthly : 0,
        }];

        // Do not reuse an order created under different price/commitment terms.
        let orderId = existingOrder?.items?.[0]?.introOffer === (isIntroOffer ? INTRO_OFFER_CODE : null)
          && Number(existingOrder?.items?.[0]?.minimumTermMonths || 0) === termMonths
          ? existingOrder?.id || null : null;
        if (!orderId) {
          const { data: order, error: orderError } = await supabaseAdmin
            .from("orders")
            .insert({
              business_id: businessId,
              customer_name: lead.name || businessName,
              customer_email: body.email,
              total_amount: dueToday,
              status: "pending",
              items: orderItems,
            })
            .select("id")
            .single();
          if (orderError || !order) throw orderError || new Error("ORDER_CREATE_FAILED");
          orderId = order.id;
        }

        // Catalogue amounts are server-side; inline Checkout prices avoid stale immutable Price IDs.
        const lineItems: any[] = [{ price_data: {
          currency: String(price.currency || commercialCurrencyForMarket(market)).toLowerCase(),
          product_data: { name: product.name, description: product.description || undefined },
          unit_amount: Math.round(monthly * 100), recurring: { interval: "month" },
        }, quantity: 1 }];
        if (setup > 0) lineItems.push({ price_data: {
          currency: String(price.currency || commercialCurrencyForMarket(market)).toLowerCase(),
          product_data: { name: `${product.name} setup` },
          unit_amount: Math.round(setup * 100),
        }, quantity: 1 });
        const introCoupon = isIntroOffer ? await createIntroOfferCoupon(stripe, monthly, String(price.currency || "USD"), body.previewId) : null;

        const session = await stripe.checkout.sessions.create({
          mode: "subscription",
          payment_method_types: ["card"],
          payment_method_collection: "always",
          billing_address_collection: "required",
          tax_id_collection: { enabled: true },
          customer_email: body.email,
          line_items: lineItems,
          ...(introCoupon ? { discounts: [{ coupon: introCoupon.id }] } : {}),
          success_url: `${publicAppUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}&public_order=1&preview_id=${encodeURIComponent(body.previewId)}`,
          cancel_url: `${publicAppUrl()}/preview-order?cancelled=1`,
          metadata: {
            businessId,
            productSlug: product.slug,
            market,
            currency: price.currency || "USD",
            termMonths: String(termMonths),
            introOffer: isIntroOffer ? INTRO_OFFER_CODE : "",
            introOfferDiscount: isIntroOffer ? String(monthly) : "0",
            otcWaiver: otcWaiver || "", waivedSetupAmount: otcWaiver ? String(originalSetup) : "0",
            orderId,
            leadId: lead.id,
            previewId: body.previewId,
            publicOrder: "1",
            affiliateId: affiliateAttribution?.id || "",
            type: "subscription",
            termsVersion: COMMERCIAL_TERMS_VERSION,
            termsAcceptedAt,
          },
          subscription_data: {
            metadata: {
              businessId,
              productSlug: product.slug,
              orderId,
              leadId: lead.id,
              previewId: body.previewId,
              publicOrder: "1",
              affiliateId: affiliateAttribution?.id || "",
              termMonths: String(termMonths),
              introOffer: isIntroOffer ? INTRO_OFFER_CODE : "",
              termsVersion: COMMERCIAL_TERMS_VERSION,
              termsAcceptedAt,
            },
          },
        });

        await supabaseAdmin.from("orders").update({
          stripe_session_id: session.id,
          updated_at: new Date().toISOString(),
        }).eq("id", orderId);
        await supabaseAdmin.from("leads").update({
          status: lead.status === "won" ? "won" : "qualified",
          automation_next_action: "Complete secure checkout",
          next_follow_up_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          raw_fields: {
            ...(lead.raw_fields || {}),
            introOffer: isIntroOffer ? INTRO_OFFER_CODE : null,
            selectedProduct: product.slug,
            checkoutOrderId: orderId,
            checkoutStartedAt: new Date().toISOString(),
          },
        }).eq("id", lead.id);

        return res.json({
          success: true,
          url: session.url,
          orderId,
          dueToday,
          monthly,
          setup,
          currency: price.currency || "USD",
          termMonths,
        });
      } catch (error: any) {
        console.error("Public preview checkout failed", error?.message || error);
        if (error?.message === "STRIPE_CATALOG_MISMATCH") {
          return res.status(503).json({
            error: "Secure checkout pricing is being verified. Please try again later.",
            code: "STRIPE_CATALOG_MISMATCH",
          });
        }
        return res.status(500).json({ error: "Secure checkout could not be started." });
      }
    },
  );

  app.get(
    "/api/public/preview-checkout/status",
    rateLimit({ windowMs: 60 * 60 * 1000, max: 20, keyPrefix: "preview-checkout-status" }),
    async (req: any, res: any) => {
      const sessionId = String(req.query.session_id || "");
      const previewId = String(req.query.preview_id || "");
      if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId) || previewId.length < 8 || previewId.length > 160) {
        return res.status(400).json({ error: "Invalid checkout confirmation." });
      }
      try {
        const stripe = await getStripe();
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.metadata?.publicOrder !== "1" || session.metadata?.previewId !== previewId) {
          return res.status(403).json({ error: "Checkout confirmation does not match this preview." });
        }
        const paid = ["paid", "no_payment_required"].includes(String(session.payment_status || ""));
        const complete = session.status === "complete" && paid;
        if (!complete) {
          return res.json({ status: session.status || "open", paymentStatus: session.payment_status || "unpaid", complete: false });
        }
        const email = String(session.customer_details?.email || session.customer_email || "").trim().toLowerCase();
        const businessId = String(session.metadata?.businessId || "");
        const orderId = String(session.metadata?.orderId || "");
        if (!EMAIL_SCHEMA.safeParse(email).success || !UUID_SCHEMA.safeParse(businessId).success) {
          return res.status(409).json({ error: "Checkout completed but account activation details are incomplete." });
        }
        const claimToken = createPreviewClaimToken({
          businessId,
          email,
          sessionId,
          previewId,
          exp: Date.now() + 24 * 60 * 60 * 1000,
        });
        return res.json({
          status: "complete",
          paymentStatus: session.payment_status,
          complete: true,
          email,
          businessId,
          orderId: UUID_SCHEMA.safeParse(orderId).success ? orderId : null,
          productSlug: session.metadata?.productSlug || null,
          claimToken,
        });
      } catch (error: any) {
        console.error("Public preview checkout status failed", error?.message || error);
        return res.status(502).json({ error: "Checkout confirmation is temporarily unavailable." });
      }
    },
  );

  app.post(
    "/api/preview-checkout/claim",
    authenticate,
    rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 6,
      keyPrefix: "preview-checkout-claim",
      key: (req: any) => req.user?.id || getClientIp(req),
    }),
    async (req: any, res: any) => {
      const body = validateBody(z.object({ claimToken: z.string().trim().min(40).max(4096) }), req, res);
      if (!body) return;
      try {
        const claim = verifyPreviewClaimToken(body.claimToken);
        const userEmail = String(req.user?.email || "").trim().toLowerCase();
        if (!userEmail || userEmail !== String(claim.email).trim().toLowerCase()) {
          return res.status(403).json({ error: "Sign in with the same email used at checkout." });
        }

        const stripe = await getStripe();
        const session = await stripe.checkout.sessions.retrieve(claim.sessionId);
        if (
          session.status !== "complete"
          || !["paid", "no_payment_required"].includes(String(session.payment_status || ""))
          || session.metadata?.businessId !== claim.businessId
          || session.metadata?.previewId !== claim.previewId
          || session.metadata?.publicOrder !== "1"
        ) {
          return res.status(409).json({ error: "This paid order could not be verified." });
        }

        const { data: business, error: businessError } = await supabaseAdmin
          .from("businesses")
          .select("id,owner_id,plan,commercial_product_slug,commercial_market,commercial_term_months,stripe_customer_id,stripe_subscription_id,status")
          .eq("id", claim.businessId)
          .maybeSingle();
        if (businessError || !business) return res.status(404).json({ error: "Paid website order not found." });
        if (business.owner_id && business.owner_id !== req.user.id) {
          return res.status(409).json({ error: "This paid website has already been activated by another account." });
        }

        const now = new Date().toISOString();
        const { error: businessUpdateError } = await supabaseAdmin.from("businesses").update({
          owner_id: req.user.id,
          status: "active",
          lifecycle_stage: "onboarding",
          lifecycle_stage_changed_at: now,
          onboarding_started_at: now,
        }).eq("id", business.id);
        if (businessUpdateError) throw businessUpdateError;

        const { error: profileError } = await supabaseAdmin.from("profiles").update({
          business_id: business.id,
          role: "business_admin",
          status: "active",
        }).eq("id", req.user.id);
        if (profileError) throw profileError;

        if (business.stripe_subscription_id) {
          const subscription = await stripe.subscriptions.retrieve(business.stripe_subscription_id) as any;
          const { data: plan } = await supabaseAdmin
            .from("plans")
            .select("id,monthly_credit_limit")
            .eq("slug", business.plan)
            .maybeSingle();
          const termMonths = Number(business.commercial_term_months || COMMERCIAL_DEFAULT_COMMITMENT_MONTHS);
          const startDate = new Date().toISOString().slice(0, 10);
          const minimumEnd = new Date();
          minimumEnd.setUTCMonth(minimumEnd.getUTCMonth() + termMonths);
          const subscriptionRecord = {
            user_id: req.user.id,
            plan_id: plan?.id || null,
            stripe_customer_id: business.stripe_customer_id,
            stripe_subscription_id: business.stripe_subscription_id,
            status: subscription.status || "active",
            current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : now,
            current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : now,
            commercial_product_slug: business.commercial_product_slug,
            commercial_market: business.commercial_market || "INTL",
            contract_start_date: startDate,
            minimum_term_months: termMonths,
            minimum_term_end_date: minimumEnd.toISOString().slice(0, 10),
            renewal_state: "active",
            last_payment_status: "paid",
            updated_at: now,
          };
          const { data: existingSubscription } = await supabaseAdmin
            .from("user_subscriptions")
            .select("id")
            .eq("user_id", req.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (existingSubscription?.id) {
            await supabaseAdmin.from("user_subscriptions").update(subscriptionRecord).eq("id", existingSubscription.id);
          } else {
            await supabaseAdmin.from("user_subscriptions").insert(subscriptionRecord);
          }

          const creditLimit = Number(plan?.monthly_credit_limit || 300);
          const creditRecord = {
            user_id: req.user.id,
            monthly_credit_limit: creditLimit,
            credits_remaining: creditLimit,
            credits_used: 0,
            reset_date: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
            updated_at: now,
          };
          const { data: existingCredits } = await supabaseAdmin
            .from("ai_credit_balances")
            .select("id")
            .eq("user_id", req.user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (existingCredits?.id) {
            await supabaseAdmin.from("ai_credit_balances").update(creditRecord).eq("id", existingCredits.id);
          } else {
            await supabaseAdmin.from("ai_credit_balances").insert(creditRecord);
          }
        }

        await supabaseAdmin.from("business_lifecycle_events").insert({
          business_id: business.id,
          from_stage: "onboarding",
          to_stage: "onboarding",
          reason: "Paid preview order claimed by authenticated customer",
          metadata: { userId: req.user.id, stripeSessionId: claim.sessionId, previewId: claim.previewId },
        }).then(({ error }) => {
          if (error) console.warn("Preview claim lifecycle event skipped:", error.message);
        });

        return res.json({ success: true, businessId: business.id, redirectTo: "/dashboard/onboarding" });
      } catch (error: any) {
        console.error("Preview order claim failed", error?.message || error);
        const code = String(error?.message || "");
        if (["INVALID_PREVIEW_CLAIM", "EXPIRED_PREVIEW_CLAIM"].includes(code)) {
          return res.status(403).json({ error: "This account activation link has expired or is invalid." });
        }
        return res.status(500).json({ error: "Account activation could not be completed." });
      }
    },
  );

  app.post(
    "/api/create-checkout-session",
    authenticate,
    rateLimit({
      windowMs: 60 * 1000,
      max: 20,
      keyPrefix: "checkout-session",
      key: (req) => req.user?.id || getClientIp(req),
    }),
    async (req: any, res) => {
    const checkoutBody = validateBody(
      z.object({
        priceId: z.string().regex(/^price_[A-Za-z0-9_]+$/).optional().nullable(),
        businessId: UUID_SCHEMA,
        customerEmail: EMAIL_SCHEMA.optional().nullable(),
        couponId: z.string().trim().max(120).optional().nullable(),
        type: z.enum(["credits", "subscription"]).optional(),
        planId: z.string().trim().min(1).max(80).optional().nullable(),
        productSlug: z.enum(["personal-profile", "managed-website", "website-growth", "growth-partner", "custom-website"]).optional().nullable(),
        billingCycle: z.enum(["monthly", "yearly"]).optional().default("monthly"),
        market: z.enum(["MY", "SG", "GB", "US", "INTL"]).optional().default("INTL"),
        promotionCode: z.string().trim().max(120).optional().nullable(),
        upgradeFrom: z.string().trim().max(80).optional().nullable(),
        termsAccepted: z.boolean().optional(),
      }),
      req,
      res,
    );
    if (!checkoutBody) return;

    const { businessId, customerEmail, couponId, planId, productSlug, billingCycle } = checkoutBody;
    // Never allow an isolated test fixture to create a live Stripe Checkout
    // session. Production must use a Preview/test deployment for payment QA.
    if (process.env.NODE_ENV === "production" && isTestAccountEmail(customerEmail || req.user?.email)) {
      return res.status(409).json({
        error: "TEST_CHECKOUT_REQUIRES_PREVIEW",
        message: "Test accounts cannot start checkout on production. Use the Preview environment with Stripe test keys.",
      });
    }
    // New catalogue subscriptions are USD, independently of an existing customer\'s historic billing market.
    const market = productSlug ? "INTL" : normalizeCommercialMarket(checkoutBody.market);
    const legacyMarket = checkoutBody.market === "US" ? "US" : market;
    let priceId = checkoutBody.priceId || "";
    let resolvedProductSlug = productSlug || null;
    let resolvedPromotionId: string | null = null;
    let testDynamicMonthlyAmount: number | null = null;
    let testDynamicSetupAmount: number | null = null;
    let useDynamicCatalogPrices = false;
    let commercialPriceExpectation: { currency: string; monthlyAmount: number; setupAmount: number; minimumTermMonths: number } | null = null;

    try {
      await assertBusinessAdminAccess(req.user.id, businessId);
      const { data: checkoutBusiness } = await supabaseAdmin
        .from("businesses")
        .select("id,commercial_term_months,commercial_market")
        .eq("id", businessId)
        .maybeSingle();
      const businessMarket = checkoutBusiness?.commercial_market
        ? normalizeCommercialMarket(checkoutBusiness.commercial_market)
        : null;
      if (businessMarket && businessMarket !== market && market !== "INTL") {
        return res.status(409).json({
          error: "CHECKOUT_MARKET_MISMATCH",
          message: `This account is configured for ${businessMarket}. Refresh pricing for that market before checkout.`,
          market: businessMarket,
        });
      }
      const customerOtcWaiver=productSlug ? await resolveOtcWaiver(businessId) : null;
      const customerTermOverride = checkoutBusiness?.commercial_term_months == null ? null : Number(checkoutBusiness.commercial_term_months);
      if (customerTermOverride !== null && (!Number.isInteger(customerTermOverride) || customerTermOverride < 1 || customerTermOverride > 120)) {
        return res.status(409).json({ error: "This customer's contract term is invalid. Clear the override before checkout." });
      }
      const launchFlags = await refreshLaunchFlags();
      if (checkoutBody.type === "credits" && !launchFlags.ai_credit_topups_enabled) {
        return res.status(403).json({ error: "AI_CREDIT_TOPUPS_DISABLED", code: "AI_CREDIT_TOPUPS_DISABLED" });
      }
      let configuredSetupPriceId: string | null = null;
      let isOneTimeCheckout = false;
      let minimumTermMonths = COMMERCIAL_DEFAULT_COMMITMENT_MONTHS;

      // Current-product checkout never trusts a browser-supplied Stripe coupon.
      // A promotion is valid only when an admin activated it and mapped Stripe prices.
      if (productSlug && couponId) return res.status(400).json({ error: "Use a configured promotion code instead of a Stripe coupon ID." });

      if (checkoutBody.type !== "credits") {
        if (productSlug) {
          const { data: currentProduct } = await supabaseAdmin
            .from("commercial_products")
            .select("id,slug,name,sales_motion,entitlement_plan_slug,commercial_market_prices!inner(market,currency,monthly_price,setup_fee,annual_price,billing_interval,stripe_monthly_price_id,stripe_annual_price_id,stripe_setup_price_id,stripe_one_time_price_id,recurring_monthly_price,recurring_setup_fee,recurring_annual_price,recurring_stripe_monthly_price_id,recurring_stripe_annual_price_id,recurring_stripe_setup_price_id,minimum_term_months,recurring_config_status,active)")
            .eq("slug", productSlug)
            .eq("active", true)
            .eq("commercial_market_prices.market", market)
            .eq("commercial_market_prices.active", true)
            .maybeSingle();
          const currentPrice = currentProduct && (Array.isArray(currentProduct.commercial_market_prices) ? currentProduct.commercial_market_prices[0] : currentProduct.commercial_market_prices);
          if (!currentProduct || !currentPrice) return res.status(400).json({ error: "This product is unavailable in the selected market." });
          testDynamicMonthlyAmount = Number(currentPrice.recurring_monthly_price || currentPrice.monthly_price || 0);
          testDynamicSetupAmount = customerOtcWaiver ? 0 : Number(currentPrice.recurring_setup_fee || currentPrice.setup_fee || 0);
          if (currentProduct.sales_motion !== "self_serve") return res.status(400).json({ error: "This product is available by consultation, not self-serve checkout." });
          if (String(billingCycle) === "yearly") return res.status(400).json({ error: "Annual billing is not enabled for launch products. Choose monthly billing." });
          // New public checkout is recurring-only. Legacy one-time prices are
          // retained for historical records but can never be selected here.
          const recurringMode = currentPrice.recurring_config_status === "live";
          // Customer checkout is available only for markets with an activated
          // recurring Stripe configuration. Draft international markets are
          // consultation-only until an operator activates their price IDs.
          useDynamicCatalogPrices = recurringMode && !checkoutBody.promotionCode;
          if (!recurringMode && !useDynamicCatalogPrices) return res.status(400).json({ error: "Recurring checkout is not enabled for this product and market yet." });
          if (useDynamicCatalogPrices && billingCycle === "yearly" && !currentPrice.recurring_annual_price) {
            return res.status(400).json({ error: "Annual billing is not configured for this market yet. Choose monthly billing or book a consultation." });
          }
          isOneTimeCheckout = false;
          // Customer-specific overrides take precedence; otherwise the
          // administrator-configured product/market minimum term is authoritative.
          minimumTermMonths = customerTermOverride || getMinimumTermMonths({ minimumTermMonths: currentPrice.minimum_term_months }, COMMERCIAL_RECURRING_COMMITMENT_MONTHS);
          commercialPriceExpectation = {
            currency: commercialCurrencyForMarket(market),
            monthlyAmount: Number(testDynamicMonthlyAmount || 0),
            setupAmount: Number(testDynamicSetupAmount || 0),
            minimumTermMonths,
          };
          priceId = useDynamicCatalogPrices ? "" : billingCycle === "yearly"
            ? (currentPrice.recurring_stripe_annual_price_id || "")
            : (currentPrice.recurring_stripe_monthly_price_id || "");
          if (!priceId && !useDynamicCatalogPrices) return res.status(400).json({ error: `${billingCycle === "yearly" ? "Annual" : "Monthly"} recurring checkout is not configured for this market yet.` });
          // A Growth upgrade does not repeat the Managed Website setup fee.
          const isUpgrade = productSlug === "website-growth" && checkoutBody.upgradeFrom === "managed-website";
          configuredSetupPriceId = (isUpgrade || customerOtcWaiver) ? null : (currentPrice.recurring_stripe_setup_price_id || null);
          if (checkoutBody.promotionCode) {
            const now = new Date().toISOString();
            const { data: promotion } = await supabaseAdmin.from("commercial_promotions").select("id,market,product_id,promotional_monthly_price,promotional_setup_fee,starts_at,ends_at,usage_limit,usage_count,stripe_monthly_price_id,stripe_setup_price_id,active").eq("code", checkoutBody.promotionCode).eq("active", true).or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gte.${now}`).maybeSingle();
            const promotionMatches = promotion && (!promotion.market || promotion.market === market) && (!promotion.product_id || promotion.product_id === currentProduct.id) && (!promotion.usage_limit || promotion.usage_count < promotion.usage_limit) && promotion.stripe_monthly_price_id;
            if (!promotionMatches) return res.status(400).json({ error: "This promotion is unavailable for the selected product or market." });
            resolvedPromotionId = promotion.id;
            priceId = billingCycle === "yearly" ? priceId : promotion.stripe_monthly_price_id;
            configuredSetupPriceId = (isUpgrade || customerOtcWaiver) ? null : (promotion.stripe_setup_price_id || configuredSetupPriceId);
          }
          if (Number(currentPrice.recurring_setup_fee || 0) > 0 && !configuredSetupPriceId && !isUpgrade && !customerOtcWaiver && !useDynamicCatalogPrices) {
            return res.status(400).json({ error: `${market} setup-fee checkout is not configured for this product.` });
          }
          resolvedProductSlug = currentProduct.slug;
        } else {
          if (!planId || !priceId) return res.status(400).json({ error: "Select a valid plan before checkout." });
        const { data: legacyBusiness } = await supabaseAdmin
          .from("businesses")
          .select("plan,commercial_product_slug,stripe_subscription_id,created_at")
          .eq("id", businessId)
          .maybeSingle();
        const legacyPlanSlugs = new Set(["launch", "business", "growth", "scale", "starter", "pro", "agency"]);
        const isHistoricalLegacyCustomer = Boolean(
          legacyBusiness &&
          legacyPlanSlugs.has(String(legacyBusiness.plan || "").toLowerCase()) &&
          !legacyBusiness.commercial_product_slug &&
          (legacyBusiness.stripe_subscription_id || legacyBusiness.created_at),
        );
        if (!isHistoricalLegacyCustomer) {
          return res.status(400).json({ error: "Legacy plans are no longer available for new customers. Select Managed Website or Website Growth." });
        }
        const { data: configuredPlan } = await supabaseAdmin
          .from("plans")
          .select("slug,is_active,sales_motion,setup_fee,stripe_price_id,yearly_stripe_price_id,market_price_ids")
          .eq("slug", String(planId).toLowerCase())
          .maybeSingle();
        if (!configuredPlan) return res.status(400).json({ error: "This plan is unavailable or inactive." });
        if (configuredPlan.is_active === false || configuredPlan.sales_motion !== "self_serve") {
          return res.status(400).json({ error: "This plan is available by proposal, not self-serve checkout." });
        }
        const marketPriceIds = configuredPlan.market_price_ids && typeof configuredPlan.market_price_ids === "object"
          ? configuredPlan.market_price_ids[legacyMarket]
          : null;
        const configuredPriceId = billingCycle === "yearly"
          ? marketPriceIds?.yearly || configuredPlan.yearly_stripe_price_id
          : marketPriceIds?.monthly || configuredPlan.stripe_price_id;
        configuredSetupPriceId = marketPriceIds?.setup || null;
        if (!configuredPriceId || configuredPriceId !== priceId) {
          return res.status(400).json({ error: `${billingCycle === "yearly" ? "Yearly" : "Monthly"} checkout is not configured for this plan.` });
        }
        if (Number(configuredPlan.setup_fee || 0) > 0 && !configuredSetupPriceId) {
          return res.status(400).json({ error: `${market} setup-fee checkout is not configured for this plan.` });
        }
        if (configuredSetupPriceId && !/^price_[A-Za-z0-9_]+$/.test(configuredSetupPriceId)) {
          return res.status(400).json({ error: "The setup-fee Stripe Price ID is invalid." });
        }
        }
      }

      if ((!priceId && !useDynamicCatalogPrices) || /price_(starter|business|growth|launch|premium|pro|elite|.*_id)$/i.test(priceId)) {
        return res.status(400).json({
          error:
            "This plan still uses a placeholder Stripe Price ID. Add the real price_... value from Stripe in Super Admin > Billing Plans.",
        });
      }
      if (resolvedProductSlug && checkoutBody.type !== "credits" && checkoutBody.termsAccepted !== true) {
        return res.status(400).json({ error: "Confirm the current scope and Terms of Service before checkout." });
      }

      const stripe = await getStripe();

      // Fail closed if the configured catalogue no longer matches the live
      // Stripe objects. This prevents a stale/mis-currency price from being
      // exposed by checkout after an admin or Stripe-side catalogue change.
      if (resolvedProductSlug && commercialPriceExpectation && !useDynamicCatalogPrices && !resolvedPromotionId) {
        const assertStripePrice = async (configuredId: string, expected: { amount: number; recurring: boolean }) => {
          const livePrice: any = await stripe.prices.retrieve(configuredId, { expand: ["product"] });
          const expectedCurrency = commercialPriceExpectation!.currency.toLowerCase();
          if (!livePrice.active || livePrice.currency !== expectedCurrency || livePrice.unit_amount !== Math.round(expected.amount * 100)) {
            throw new Error("STRIPE_CATALOG_MISMATCH");
          }
          if (expected.recurring) {
            if (!livePrice.recurring || livePrice.recurring.interval !== "month" || livePrice.recurring.interval_count !== 1) {
              throw new Error("STRIPE_CATALOG_MISMATCH");
            }
          } else if (livePrice.recurring) {
            throw new Error("STRIPE_CATALOG_MISMATCH");
          }
          const product = livePrice.product && typeof livePrice.product === "object" ? livePrice.product : null;
          if (!product || product.active === false) throw new Error("STRIPE_CATALOG_MISMATCH");
          if (resolvedProductSlug) {
            const expectedName = resolvedProductSlug === "managed-website"
              ? "Managed Website"
              : resolvedProductSlug === "growth-partner"
                ? "Growth Partner"
                : "Website Growth";
            if (String(product.name || "").trim() !== expectedName) {
              await stripe.products.update(product.id, { name: expectedName });
            }
          }
        };
        await assertStripePrice(priceId, { amount: commercialPriceExpectation.monthlyAmount, recurring: true });
        if (configuredSetupPriceId && commercialPriceExpectation.setupAmount > 0) {
          await assertStripePrice(configuredSetupPriceId, { amount: commercialPriceExpectation.setupAmount, recurring: false });
        }
      }

      // Check if business already has a stripe_customer_id and trial info
      const { data: business } = await supabase
        .from("businesses")
        .select("stripe_customer_id, stripe_subscription_id, trial_ends_at, commercial_term_months")
        .eq("id", businessId)
        .single();

	      const termsAcceptedAt = checkoutBody.termsAccepted === true ? new Date().toISOString() : "";
	      const sessionOptions: any = {
	        payment_method_types: ["card"],
        billing_address_collection: resolvedProductSlug ? "required" : "auto",
        ...(resolvedProductSlug ? { tax_id_collection: { enabled: true } } : {}),
        line_items: (useDynamicCatalogPrices || (process.env.NODE_ENV !== "production" && process.env.STRIPE_TEST_DYNAMIC_PRICES === "true")) && resolvedProductSlug && testDynamicMonthlyAmount
          ? [
              { price_data: { currency: commercialCurrencyForMarket(market).toLowerCase(), product_data: { name: resolvedProductSlug === "personal-profile" ? "Personal Profile" : resolvedProductSlug === "managed-website" ? "Managed Website" : resolvedProductSlug === "growth-partner" ? "Growth Partner" : "Website Growth" }, unit_amount: Math.round(testDynamicMonthlyAmount * 100), recurring: { interval: billingCycle === "yearly" ? "year" : "month" } }, quantity: 1 },
              ...(testDynamicSetupAmount && !isOneTimeCheckout && !checkoutBody.upgradeFrom ? [{ price_data: { currency: commercialCurrencyForMarket(market).toLowerCase(), product_data: { name: "Website setup" }, unit_amount: Math.round(testDynamicSetupAmount * 100) }, quantity: 1 }] : []),
            ]
          : [
              { price: priceId, quantity: 1 },
              ...(configuredSetupPriceId ? [{ price: configuredSetupPriceId, quantity: 1 }] : []),
            ],
        mode: isOneTimeCheckout || priceId.includes("credits") || checkoutBody.type === "credits" ? "payment" : "subscription",
        success_url: `${publicAppUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${publicAppUrl()}/checkout/cancel?plan=${encodeURIComponent(resolvedProductSlug || planId || "")}&billing=${billingCycle}`,
        metadata: {
          businessId,
          planId: planId || "",
          productSlug: resolvedProductSlug || "",
          billingCycle,
          market,
          currency: commercialCurrencyForMarket(market),
          termMonths: resolvedProductSlug && !isOneTimeCheckout ? String(minimumTermMonths) : "",
          promotionId: resolvedPromotionId || "",
          otcWaiver: customerOtcWaiver || "",
          termsVersion: resolvedProductSlug ? COMMERCIAL_TERMS_VERSION : "",
          termsAcceptedAt,
          type:
            isOneTimeCheckout
              ? "one_time_package"
              : priceId.includes("credits") || checkoutBody.type === "credits"
                ? "credits"
              : "subscription",
	        },
	      };

	      if (sessionOptions.mode === "subscription") {
	        sessionOptions.payment_method_collection = "always";
          sessionOptions.subscription_data = {
            ...(sessionOptions.subscription_data || {}),
            metadata: {
              ...(sessionOptions.subscription_data?.metadata || {}),
              businessId,
              productSlug: resolvedProductSlug || "",
              market,
              termMonths: resolvedProductSlug ? String(minimumTermMonths) : "",
              termsVersion: resolvedProductSlug ? COMMERCIAL_TERMS_VERSION : "",
              termsAcceptedAt,
            },
          };
	      }

      if (couponId) {
        sessionOptions.discounts = [{ coupon: couponId }];
      }

      if (business?.stripe_customer_id) {
        sessionOptions.customer = business.stripe_customer_id;
      } else {
        sessionOptions.customer_email = customerEmail;
      }

      // Handle Trial Period
      const now = Math.floor(Date.now() / 1000);
      let trialEnd: number | null = null;

      if (business?.trial_ends_at) {
        const dbTrialEnd = Math.floor(
          new Date(business.trial_ends_at).getTime() / 1000,
        );
        // Only use if it's at least 48 hours in the future (Stripe requirement for trial_end usually)
        // Actually Stripe requires at least 1 second in the future, but let's be safe.
        if (dbTrialEnd > now + 60) {
          trialEnd = dbTrialEnd;
        }
      }

      // Current commercial products are paid from day one. Keep legacy trial
      // handling for historical plan checkouts only; new Managed Website and
      // Website Growth customers must not receive the retired public trial.
      if (!business?.stripe_subscription_id && !resolvedProductSlug) {
        if (trialEnd) {
          sessionOptions.subscription_data = {
            trial_end: trialEnd,
          };
        } else if (platformSettings?.defaultTrialDays > 0) {
          sessionOptions.subscription_data = {
            trial_period_days: platformSettings.defaultTrialDays,
          };
        }
      }

      const session = await stripe.checkout.sessions.create(sessionOptions);

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);

      if (error.type === "StripeAuthenticationError") {
        return res.status(401).json({
          error:
            "Invalid Stripe API Key. Please check your Stripe Secret Key in the Super Admin settings.",
          code: "STRIPE_INVALID_KEY",
        });
      }

      if (error.message === "STRIPE_CONFIG_ERROR") {
        return res.status(400).json({
          error:
            "Stripe is not configured. Please provide a valid Stripe Secret Key (sk_test_...) in the Super Admin settings.",
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
      if (error.message === "STRIPE_CATALOG_MISMATCH") {
        return res.status(503).json({ error: "The selected market pricing is temporarily unavailable. Please try again later or book a consultation.", code: "STRIPE_CATALOG_MISMATCH" });
      }
      res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  app.post(
    "/api/create-product-checkout",
    authenticate,
    rateLimit({ windowMs: 60 * 1000, max: 30, keyPrefix: "product-checkout" }),
    async (req: any, res: any) => {
    const productCheckoutBody = validateBody(
      z.object({
        productId: UUID_SCHEMA,
        quantity: z.coerce.number().int().min(1).max(99).default(1),
        businessId: UUID_SCHEMA,
        customerEmail: EMAIL_SCHEMA.optional().nullable(),
      }),
      req,
      res,
    );
    if (!productCheckoutBody) return;

    const { productId, quantity, businessId, customerEmail } = productCheckoutBody;

    try {
      await assertBusinessAccess(req.user.id, businessId);
      const orderEmail = customerEmail || req.user.email;
      if (!orderEmail) return res.status(400).json({ error: "A customer email is required" });
      // 1. Fetch product details from Supabase (to ensure valid price)
      const { data: product, error: productError } = await supabaseAdmin
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("business_id", businessId)
        .single();

      if (productError || !product) {
        if (
          productError?.code === "PGRST204" ||
          productError?.message.includes("schema cache")
        ) {
          return res.status(400).json({
            error:
              "The product catalog is still initializing. Please wait a moment and try again.",
            code: "TABLE_NOT_FOUND",
          });
        }
        return res.status(404).json({ error: "Product not found" });
      }

      // 2. Create a placeholder order record
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          business_id: businessId,
          total_amount: product.price * quantity,
          status: "pending",
          customer_email: orderEmail,
          items: [
            {
              productId: product.id,
              name: product.name,
              quantity,
              price: product.price,
            },
          ],
        })
        .select()
        .single();

      if (orderError) {
        if (
          orderError.code === "PGRST204" ||
          orderError.message.includes("schema cache") ||
          orderError.message.includes("not found")
        ) {
          return res.status(400).json({
            error:
              "The e-commerce system is still initializing (missing orders table). Please wait a moment and try again.",
            code: "TABLE_NOT_FOUND",
          });
        }
        throw orderError;
      }

      const stripe = await getStripe(businessId);

      const sessionOptions: any = {
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: product.name,
                description: product.description,
                images: product.image_url ? [product.image_url] : [],
              },
              unit_amount: Math.round(product.price * 100),
            },
            quantity,
          },
        ],
        mode: "payment",
        success_url: `${publicAppUrl()}/?success=true&order_id=${order.id}`,
        cancel_url: `${publicAppUrl()}/?canceled=true`,
        metadata: {
          businessId,
          productId,
          orderId: order.id,
          type: "product_sale",
        },
      };

      if (customerEmail) {
        sessionOptions.customer_email = customerEmail;
      }

      const session = await stripe.checkout.sessions.create(sessionOptions);
      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error("Error creating product checkout:", error);
      res.status(500).json({ error: safeErrorMessage(error) });
    }
  });

  app.post(
    "/api/platform/test-stripe",
    authenticate,
    superAdminOnly,
    async (req, res) => {
      try {
        const { secretKey } = req.body;

        let stripe;
        if (secretKey && secretKey.trim()) {
          const trimmedKey = secretKey.trim();

          if (trimmedKey.startsWith("pk_")) {
            return res.status(400).json({
              error:
                "You provided a Publishable Key (pk_...) instead of a Secret Key (sk_...). Please use your Stripe Secret Key.",
            });
          }

          if (!trimmedKey.startsWith("sk_") && !trimmedKey.startsWith("rk_")) {
            return res.status(400).json({
              error:
                'Invalid Stripe Secret Key format. It should start with "sk_" or "rk_".',
            });
          }

          // Test with provided key
          stripe = new Stripe(trimmedKey, {
            apiVersion: "2025-01-27.acacia" as any,
          });
        } else {
          // Fallback to saved/local key
          try {
            stripe = await getStripe();
          } catch (err: any) {
            if (
              err.message === "STRIPE_CONFIG_ERROR" ||
              err.message === "STRIPE_INVALID_KEY_FORMAT"
            ) {
              return res.status(400).json({
                error:
                  'No valid Stripe Secret Key found. Please enter a key starting with "sk_".',
              });
            }
            throw err;
          }
        }

        // Simple call to verify key
        await stripe.balance.retrieve();
        res.json({ success: true, message: "Stripe connection successful!" });
      } catch (error: any) {
        console.error("Stripe test failed:", error);
        let message = "Stripe connection failed";
        let code = "STRIPE_ERROR";

        const errorMsg = error.message || String(error);

        if (error.type === "StripeAuthenticationError") {
          message = "Invalid Stripe API Key. Please check your secret key.";
          code = "STRIPE_INVALID_KEY";
        } else if (
          errorMsg.includes("STRIPE_SECRET_KEY_REQUIRED_BUT_GOT_PUBLISHABLE")
        ) {
          message =
            "You provided a Publishable Key (pk_...) instead of a Secret Key (sk_...). Please use your Stripe Secret Key.";
          code = "STRIPE_INVALID_KEY";
        } else if (errorMsg.includes("STRIPE_INVALID_KEY_FORMAT")) {
          message =
            'Invalid Stripe Secret Key format. Your key should start with "sk_" or "rk_".';
          code = "STRIPE_INVALID_KEY";
        } else if (errorMsg.includes("STRIPE_CONFIG_ERROR")) {
          message = "Stripe is not configured.";
          code = "STRIPE_CONFIG_MISSING";
        }

        res.status(400).json({
          error: message,
          code,
          details: errorMsg,
        });
      }
    },
  );

  app.get(
    "/api/checkout-session/status",
    authenticate,
    rateLimit({ windowMs: 60 * 1000, max: 30, keyPrefix: "checkout-status", key: (req) => req.user?.id || getClientIp(req) }),
    async (req: any, res) => {
      const sessionId = String(req.query.session_id || "");
      if (!/^cs_(?:test_|live_)?[A-Za-z0-9]+$/.test(sessionId)) return res.status(400).json({ error: "Invalid checkout confirmation reference." });
      try {
        const stripe = await getStripe();
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const businessId = session.metadata?.businessId;
        if (!businessId) return res.status(404).json({ error: "Checkout business reference is missing." });
        await assertBusinessAdminAccess(req.user.id, businessId);
        return res.json({
          success: true,
          status: session.status,
          paymentStatus: session.payment_status,
          planId: session.metadata?.planId || null,
          billingCycle: session.metadata?.billingCycle || null,
        });
      } catch (error: any) {
        if (["BUSINESS_NOT_FOUND", "PROFILE_NOT_FOUND", "FORBIDDEN_BUSINESS_ACCESS"].includes(error?.message)) return handleAccessError(res, error);
        console.warn("Checkout status verification failed:", error?.message || error);
        return res.status(422).json({ error: "Checkout confirmation could not be verified yet. Please retry shortly." });
      }
    },
  );

  app.post("/api/admin/businesses/:businessId/approval-request", authenticate, async (req: any, res: any) => {
    const businessId = String(req.params.businessId || "");
    if (!UUID_SCHEMA.safeParse(businessId).success) {
      return res.status(400).json({ error: "Invalid business reference." });
    }
    const body = validateBody(
      z.object({
        title: z.string().trim().min(1).max(180).optional(),
        description: z.string().trim().max(1000).optional(),
      }).strict(),
      req,
      res,
    );
    if (!body) return;
    try {
      await assertBusinessRoleAccess(req.user.id, businessId, {
        customerRoles: [],
        platformPermissions: ["delivery", "approvals"],
      });
      const [{ data: business, error: businessError }, { data: website, error: websiteError }, { data: project, error: projectError }] = await Promise.all([
        supabaseAdmin.from("businesses").select("id,name").eq("id", businessId).maybeSingle(),
        supabaseAdmin.from("websites").select("id,status,updated_at").eq("business_id", businessId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        supabaseAdmin.from("projects").select("id,status").eq("business_id", businessId).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (businessError) throw businessError;
      if (!business) return res.status(404).json({ error: "Business not found." });
      if (websiteError) throw websiteError;
      if (!website) return res.status(409).json({ error: "Create a website draft before requesting customer approval." });
      if (projectError) console.warn("Approval project lookup failed:", projectError.message);

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
        { id: "reachability", label: "Public website returns a successful HTML page", pass: reachable && liveHtmlReady, severity: "blocker" },
        { id: "publication", label: `Publication status: ${String(website?.status || "not_created")}`, pass: ["published", "active"].includes(String(website?.status || "").toLowerCase()), severity: "blocker" },
      ];
      const blockers = checks.filter((check) => !check.pass && check.severity === "blocker");
      const warnings = checks.filter((check) => !check.pass && check.severity === "warning");
      return res.json({
        businessId,
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
		          .select("id,name,plan,subscription_status,stripe_customer_id,stripe_subscription_id")
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
		            const refreshed = await supabaseAdmin.from("businesses").select("id,name,plan,subscription_status,stripe_customer_id,stripe_subscription_id").eq("id", body.businessId).single();
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
	        const { data: existingProject } = await supabaseAdmin
          .from("projects")
          .select("id")
          .eq("business_id", body.businessId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const publicPlanSlug = legacyPlanToPublicPlanSlug(effectivePlanId);
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
        const projectPayload = {
          website_id: body.websiteId,
          title: `${business.name} Managed Website`,
          package_name: effectivePlanId,
          status: "ready_for_build",
          target_launch_date: targetLaunch.toISOString().slice(0, 10),
          admin_notes: `Delivery handoff ${JSON.stringify(handoffSummary)}`,
          updated_at: new Date().toISOString(),
        };
        if (existingProject) {
          await supabaseAdmin.from("projects").update(projectPayload).eq("id", existingProject.id);
        } else {
          await supabaseAdmin.from("projects").insert({
            business_id: body.businessId,
            type: "waas",
            priority: "medium",
            ...projectPayload,
          });
        }

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
        const onboardingPayload = { current_step: "Ready for build", status: "Completed", progress: 100, notes: "Customer onboarding submitted and website draft generated.", updated_at: new Date().toISOString() };
        if (onboarding) await supabaseAdmin.from("onboarding_sessions").update(onboardingPayload).eq("id", onboarding.id);
        else await supabaseAdmin.from("onboarding_sessions").insert({ business_id: body.businessId, ...onboardingPayload });

        const { data: admins } = await supabaseAdmin.from("profiles").select("id").in("role", ["super_admin", "platform_staff"]);
        if (admins?.length) await supabaseAdmin.from("notifications").insert(admins.map((admin: any) => ({ user_id: admin.id, business_id: body.businessId, title: "Customer onboarding completed", message: `${business.name} submitted onboarding and is ready for production. First reviewed draft target: ${firstDraftTarget.toISOString().slice(0, 10)}.`, type: "onboarding", metadata: { websiteId: body.websiteId, firstDraftTarget: firstDraftTarget.toISOString(), targetLaunch: targetLaunch.toISOString(), deliveryStandardVersion: body.deliveryStandardVersion || DELIVERY_STANDARD_VERSION } })))
          .then(({ error }) => { if (error) console.warn("Onboarding admin notification skipped:", error.message); });
        await supabaseAdmin.from("tracking_events").insert({ event_type: "onboarding_completed", source_platform: "customer_dashboard", metadata: { businessId: body.businessId, websiteId: body.websiteId, planId: effectivePlanId } })
          .then(({ error }) => { if (error) console.warn("Onboarding tracking skipped:", error.message); });
        return res.json({
          success: true,
          projectStatus: "ready_for_build",
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
          supabaseAdmin
            .from("profiles")
            .select("id, created_at")
            .gte("created_at", sinceIso)
            .limit(5000),
          supabaseAdmin
            .from("businesses")
            .select("id, created_at")
            .gte("created_at", sinceIso)
            .limit(5000),
          supabaseAdmin
            .from("leads")
            .select("id, source, created_at")
            .gte("created_at", sinceIso)
            .limit(5000),
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
        const actualPageViews = pageViews.filter((view) => !String(view.page_path || "").includes(":"));
        const visitorIds = new Set(actualPageViews.map((view) => view.visitor_id).filter(Boolean));
        const clickEventPattern = /(click|cta|whatsapp|call|email|booking|quote|checkout|form_submit|appointment)/i;
        const signupEventPattern = /(signup|register|registration|account_created)/i;
        const clickEvents = trackingEvents.filter((event) =>
          clickEventPattern.test(String(event.event_type || "")),
        );
        const signupEvents = trackingEvents.filter((event) =>
          signupEventPattern.test(String(event.event_type || "")),
        );
        const registrations = Math.max(profiles.length, businesses.length, signupEvents.length);
        const totalViews = actualPageViews.length;
        const uniqueVisitors = visitorIds.size;

        const aggregate = {
          totalViews,
          uniqueVisitors,
          avgViewsPerVisitor: uniqueVisitors ? totalViews / uniqueVisitors : 0,
          totalClicks: clickEvents.length,
          registrations,
          totalLeads: leads.length,
          totalEvents: trackingEvents.length,
          conversionRate: uniqueVisitors ? ((registrations + leads.length) / uniqueVisitors) * 100 : 0,
        };

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
            const resend = getResend();
            await resend.emails.send({
              from: "Bennie Studio Support <support@bennietay.com>",
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

  app.get("/api/health-check", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
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

      const businessSelect = "id, name, subdomain, custom_domain, custom_domain_status, custom_domain_verified_at, custom_domain_suspended, custom_domain_permission_confirmed, ssl_status, status, subscription_status, subscription_grace_until";
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
      const subscriptionAllowed = subscriptionStatus === "active" || (graceUntil > Date.now() && ["past_due", "trialing", "grace"].includes(subscriptionStatus));
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
