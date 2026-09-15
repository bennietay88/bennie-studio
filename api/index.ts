import express from "express";
import compression from "compression";
import cors from "cors";
import path from "path";
import { existsSync, readFileSync } from "node:fs";
import dns from "node:dns";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { gzipSync } from "node:zlib";
import Stripe from "stripe";
import dotenv from "dotenv";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { z } from "zod";
import { Redis } from "@upstash/redis";
import { callDeepSeek, callOpenAI, callGemini } from "../src/lib/ai-providers.js";
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
import { canManageSalesOperations, isSalesSuppressed, normalizeSalesEmail, recordSalesDeliveryEvent, recordSalesReply, runSalesDelivery, salesRecordId, saveManualOutreach, saveSalesCallOutcome, suppressSalesRecipient } from "../server/salesOperations.js";
import { parseProspectCsv } from "../src/lib/prospectImport.js";
import { COMMERCIAL_DEFAULT_COMMITMENT_MONTHS, COMMERCIAL_RECURRING_COMMITMENT_MONTHS } from "../src/lib/commercialPricing.js";
import { DEFAULT_LAUNCH_FLAGS, normalizeLaunchFlags, type LaunchFlags } from "../src/lib/launchFlags.js";
import { buildInternalContentPrompt, INTERNAL_CONTENT_SYSTEM_PROMPT, InternalContentBriefSchema, parseInternalContentDraft, buildHumaniseContentPrompt, HUMANISE_CONTENT_SYSTEM_PROMPT, parseHumaniseContentDraft } from "../src/lib/internalAiContentEngine.js";
import { buildDesignDirectionPrompt, DESIGN_DIRECTOR_SYSTEM_PROMPT, parseDesignDirection } from "../src/lib/designDirector.js";
import { isMarketingRoute, renderMarketingDocument } from "../server/marketingSsr.js";

dotenv.config();
initServerObservability();

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

function resolveMarketingClientScript() {
  try {
    const builtIndex = path.join(distPath, "index.html");
    if (existsSync(builtIndex)) {
      const html = readFileSync(builtIndex, "utf8");
      const match = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/i);
      if (match?.[1]) return match[1];
    }
  } catch {
    // Fall back to the Vite entry during local development.
  }
  return "/src/main.tsx";
}

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
    process.env.STRIPE_TEST_DYNAMIC_PRICES === "true" && process.env.STRIPE_TEST_SECRET_KEY
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

// WordPress Integration Helpers
function generateApiKey() {
  return crypto.randomBytes(32).toString("hex");
}

function hashApiKey(apiKey: string) {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

function verifyApiKey(providedKey: string, storedHash: string) {
  try {
    const providedHash = hashApiKey(providedKey);
    return crypto.timingSafeEqual(
      Buffer.from(providedHash),
      Buffer.from(storedHash),
    );
  } catch (err) {
    return false;
  }
}

function createHmacSignature(secret: string, data: string) {
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

async function logSyncEvent(data: {
  business_id: string;
  integration_id?: string;
  direction: "wordpress_to_waas" | "waas_to_wordpress";
  event_type: string;
  status: string;
  message: string;
  payload?: any;
}) {
  await supabaseAdmin.from("sync_logs").insert(data);
}

const app = express();

const normalizeCommercialMarket = (value: unknown) => {
  const market = String(value || "").toUpperCase();
  if (market === "MY") return "MY";
  if (market === "SG") return "SG";
  if (market === "GB" || market === "UK") return "GB";
  return "INTL";
};
const commercialCurrencyForMarket = (market: string) => ({ MY: "MYR", SG: "SGD", GB: "GBP", INTL: "USD" } as Record<string, string>)[market] || "USD";
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
      `script-src 'self'${localDevelopment ? " 'unsafe-inline'" : ""} https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://s.pinimg.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      `connect-src 'self'${localDevelopment ? " ws://127.0.0.1:* ws://localhost:*" : ""} https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://api.deepseek.com https://generativelanguage.googleapis.com https://api.openai.com https://api.resend.com https://ct.pinterest.com https://*.sentry.io https://*.ingest.sentry.io`,
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://ct.pinterest.com",
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

  // Customer profile bootstrap is intentionally server-owned. This endpoint
  // ignores mutable signup metadata and only creates the least-privileged
  // customer role when a profile is genuinely absent.
  app.post("/api/auth/ensure-profile", authenticate, async (req: any, res: any) => {
    const userId = String(req.user?.id || "");
    const email = String(req.user?.email || "").trim().toLowerCase();
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    try {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) return res.json({ profile: existing, created: false });

      const { data: created, error: createError } = await supabaseAdmin
        .from("profiles")
        .insert({ id: userId, email, role: "business_admin" })
        .select("*")
        .single();
      if (createError) {
        // A concurrent auth callback may have won the insert race. Re-read
        // rather than retrying a second write or changing the existing role.
        const { data: raced } = await supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle();
        if (raced) return res.json({ profile: raced, created: false });
        throw createError;
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
      .select("id, role, business_id, staff_permissions")
      .eq("id", userId)
      .single();
    if (error || !data) throw new Error("PROFILE_NOT_FOUND");
    return data;
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
        .select("role")
        .eq("id", req.user.id)
        .single();

      if (error || profile?.role !== "super_admin") {
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
      await assertBusinessAccess(req.user.id, profile.business_id);

      const [
        { data: business, error: businessError },
        { data: websites, error: websitesError },
        { data: leads, error: leadsError },
        { data: appointments, error: appointmentsError },
      ] = await Promise.all([
        supabaseAdmin.from("businesses").select("id,name,subdomain,custom_domain,custom_domain_status,site_url,seo_settings").eq("id", profile.business_id).single(),
        supabaseAdmin.from("websites").select("id,slug,status,pages,theme,seo,updated_at").eq("business_id", profile.business_id).eq("status", "published"),
        supabaseAdmin.from("leads").select("id,name,email,phone,message,status,source,score,notes,raw_fields,automation_score,automation_next_action,automation_temperature,last_follow_up_at,next_follow_up_at,first_response_at,response_channel,last_active_at,created_at").eq("business_id", profile.business_id).order("created_at", { ascending: true }),
        supabaseAdmin.from("appointments").select("id,customer_name,customer_email,service,date,time,status,created_at,updated_at").eq("business_id", profile.business_id).order("date", { ascending: true }).order("time", { ascending: true }),
      ]);
      if (businessError || !business) return res.status(404).json({ error: "Business not found" });
      if (websitesError) throw websitesError;
      if (leadsError) throw leadsError;
      if (appointmentsError) throw appointmentsError;

      const publishedWebsites = websites || [];
      const exportedAt = new Date().toISOString();
      const files: Array<{ name: string; content: string }> = [];
      publishedWebsites.forEach((website: any, index: number) => {
        const filename = index === 0 ? "index.html" : `pages/${sanitizeFileName(website.slug || website.id)}.html`;
        files.push({ name: filename, content: buildWebsiteHtmlSnapshot(website, business) });
      });
      if (files.length === 0) files.push({ name: "index.html", content: buildWebsiteHtmlSnapshot({ pages: [] }, business) });
      files.push({
        name: "bennie-studio-export.json",
        content: JSON.stringify({ exportVersion: "1.2", exportedAt, business, websites: publishedWebsites, crm: { leads: leads || [], appointments: appointments || [] } }, null, 2),
      });
      files.push({ name: "crm/leads.json", content: JSON.stringify(leads || [], null, 2) });
      files.push({ name: "crm/appointments.json", content: JSON.stringify(appointments || [], null, 2) });
      files.push({
        name: "README.md",
        content: `# ${business.name || "Website"}\n\nThis is a static handover export from Bennie Studio. Upload index.html and the pages/ folder to any static host (for example Netlify, Vercel, GitHub Pages, or your own server).\n\n## Before going live\n\n1. Connect forms and booking actions to services you control.\n2. Confirm WhatsApp, phone, email, map, image, and external links.\n3. Reconnect analytics and consent tooling.\n4. Point your domain only after the independent host is verified.\n5. Keep the original archive as a dated backup.\n\nCRM data is included in crm/leads.json and crm/appointments.json for your records or migration. The exported pages do not include Bennie Studio-hosted CRM submission endpoints, private credentials, billing data, API keys, or third-party service configuration.\n`,
      });
      files.push({
        name: "manifest.json",
        content: JSON.stringify({
          exportVersion: "1.2",
          exportedAt,
          businessId: business.id,
          websiteCount: publishedWebsites.length,
          leadCount: (leads || []).length,
          appointmentCount: (appointments || []).length,
          files: [...files.map((file) => file.name), "manifest.json"],
          reconnectRequired: ["forms", "bookings", "analytics", "consent tooling", "hosted integrations"],
        }, null, 2),
      });

      const archive = buildTarGz(files);
      const filename = `${sanitizeFileName(business.name || "website")}-website-export.tar.gz`;
      res.setHeader("Content-Type", "application/gzip");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Cache-Control", "private, no-store, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("X-Content-Type-Options", "nosniff");
      return res.status(200).send(archive);
    } catch (error: any) {
      console.error("[Website Export] Failed:", error);
      return res.status(500).json({ error: "Unable to prepare website export" });
    }
  });

  app.patch(
    "/api/admin/businesses/:businessId/platform-type",
    authenticate,
    superAdminOnly,
    async (req: any, res: any) => {
      const { platformType } = req.body || {};
      if (!platformType) return res.status(400).json({ error: "Platform type is required" });
      const { error } = await supabaseAdmin.rpc("set_handover_platform_type", {
        p_business_id: req.params.businessId,
        p_platform_type: platformType,
      });
      if (error) return res.status(400).json({ error: error.message });
      return res.status(204).send();
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

      let webhookSecret =
        platformSettings?.stripeWebhookSecret ||
        process.env.STRIPE_WEBHOOK_SECRET;

      if (businessIdParam) {
        const { data: biz } = await supabaseAdmin
          .from("businesses")
          .select("stripe_webhook_secret")
          .eq("id", businessIdParam)
          .single();
        if (biz?.stripe_webhook_secret) {
          webhookSecret = biz.stripe_webhook_secret;
        }
      }

      if (!sig || !webhookSecret) {
        return res
          .status(400)
          .send("Webhook Error: Missing signature or secret");
      }

      let event;

      try {
        const stripe = await getStripe(businessIdParam);
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error(`[Stripe Webhook] Verification Failed: ${err.message}`);
        return res
          .status(400)
          .send(`Webhook Verification Error: ${err.message}`);
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

            try {
              const stripe = type === "product_sale" ? await getStripe(businessId) : await getStripe();

              if (type === "product_sale") {
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
                const { data: currentPrice } = await supabaseAdmin
                  .from("commercial_market_prices")
                  .select("product_id,market,currency,monthly_price,annual_price")
                  .or(`stripe_monthly_price_id.eq.${priceId},stripe_annual_price_id.eq.${priceId}`)
                  .maybeSingle();
                const { data: currentProduct } = currentPrice?.product_id
                  ? await supabaseAdmin.from("commercial_products").select("slug,entitlement_plan_slug").eq("id", currentPrice.product_id).maybeSingle()
                  : { data: null };
                const plan = plans.find((p: any) => p.stripe_price_id === priceId || p.yearly_stripe_price_id === priceId || (requestedPlanSlug && p.slug === requestedPlanSlug));
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

                // 1. Update Legacy Business Table
                await supabaseAdmin
                  .from("businesses")
                  .update({
                    stripe_customer_id: session.customer as string,
                    stripe_subscription_id: session.subscription as string,
                    subscription_status: subscription.status,
                    status: "active",
                    plan: planSlug,
                    commercial_product_slug: currentProduct?.slug || requestedProductSlug || null,
                    commercial_market: currentPrice?.market || session.metadata?.market || null,
                    commercial_currency: currentPrice?.currency || session.metadata?.currency || null,
                    commercial_term_months: session.metadata?.termMonths ? Number(session.metadata.termMonths) : null,
                    commercial_started_at: new Date().toISOString(),
                    ai_credits: plan?.monthly_credit_limit || 300
                  })
                  .eq("id", businessId);

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

                // Platform affiliate commission logic. Commission is only created
                // after a valid referred business becomes a paying customer.
                const { data: business } = await supabaseAdmin
                  .from("businesses")
                  .select("referred_by_affiliate_id, owner_id")
                  .eq("id", businessId)
                  .single();
                if (
                  business?.referred_by_affiliate_id &&
                  session.amount_total
                ) {
                  const { data: affiliate } = await supabaseAdmin
                    .from("affiliates")
                    .select("*")
                    .eq("id", business.referred_by_affiliate_id)
                    .in("status", ["active", "approved"])
                    .maybeSingle();

                  if (affiliate && affiliate.uid !== business.owner_id) {
                    const { data: existingCommission } = await supabaseAdmin
                      .from("affiliate_referrals")
                      .select("id")
                      .eq("affiliate_id", affiliate.id)
                      .eq("event_type", "paid_subscription")
                      .contains("metadata", { stripeSessionId: session.id })
                      .maybeSingle();

                    if (!existingCommission) {
                      const { data: program } = await supabaseAdmin
                        .from("affiliate_programs")
                        .select("*, commission_tiers(*)")
                        .eq(affiliate.business_id ? "business_id" : "is_platform_program", affiliate.business_id || true)
                        .maybeSingle();

                      const tiers = [...(program?.commission_tiers || [])].sort(
                        (a: any, b: any) =>
                          Number(b.requirement_value || 0) -
                          Number(a.requirement_value || 0),
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
                      const commissionType =
                        activeTier?.commission_type ||
                        program?.commission_type ||
                        "percentage";
                      const rate = Number(
                        activeTier?.commission_rate ??
                          program?.base_commission_rate ??
                          0.1,
                      );
                      const commission =
                        commissionType === "fixed"
                          ? Number(activeTier?.fixed_commission_amount || program?.fixed_commission_amount || 0)
                          : amountPaid * rate;

                      await supabaseAdmin
                        .from("affiliates")
                        .update({
                          total_earnings: Number(affiliate.total_earnings || 0) + commission,
                          unpaid_earnings: Number(affiliate.unpaid_earnings || 0) + commission,
                          total_referrals: Number(affiliate.total_referrals || 0) + 1,
                        })
                        .eq("id", affiliate.id);

                      await supabaseAdmin.from("affiliate_referrals").insert({
                        affiliate_id: affiliate.id,
                        referred_user_id: business.owner_id,
                        status: "converted",
                        event_type: "paid_subscription",
                        commission_amount: commission,
                        sale_amount: amountPaid,
                        plan_slug: planSlug,
                        converted_at: new Date().toISOString(),
                        commission_status: "approved",
                        metadata: {
                          businessId,
                          stripeSessionId: session.id,
                          stripeSubscriptionId: session.subscription,
                          tierName: activeTier?.name || "Default",
                        },
                      });

                      console.log(
                        `Rewarded affiliate ${affiliate.id} with $${commission.toFixed(2)}`,
                      );
                    }
                  }
                }
              }
            } catch (err) {
              console.error(`Error updating business after checkout:`, err);
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
            const { data: cancelledBusiness } = await supabaseAdmin
              .from("businesses")
              .update({
                subscription_status: "canceled",
                status: "inactive",
                subscription_grace_until: null,
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
                metadata: { stripeEventId: event.id, stripeSubscriptionId: subscription.id },
              });
            }
          } catch (err) {
            console.error(`Error handling subscription deletion:`, err);
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
  app.use(express.json({
    limit: "1mb",
    verify: (req: any, _res, buffer) => {
      req.rawBody = buffer;
    },
  }));

  const publicAppUrl = () => String(process.env.APP_PUBLIC_URL || process.env.PUBLIC_APP_URL || "https://app.bennietay.com").replace(/\/+$/, "");

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
        tags: [{ name: "sales_message_id", value: message.id }],
      }, { idempotencyKey: message.idempotency_key });
      if (error || !data?.id) throw new Error("EMAIL_DELIVERY_FAILED");
      return { id: data.id };
    },
  });

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
      return { success: true, report, completedAt: new Date().toISOString() };
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
      await assertBusinessAccess(req.user.id, req.params.businessId);
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
        await assertBusinessAccess(req.user.id, project.business_id);
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
      await assertBusinessAccess(req.user.id, opportunity.business_id);
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
        supabaseAdmin.from("businesses").select("id,name,custom_domain,platform_type").eq("id", body.businessId).single(),
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
        adapter_type: business.platform_type === "wordpress" ? "wordpress" : "waas",
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

  app.get("/api/public/website-audit/jobs/:jobId", async (req: any, res: any) => {
    if (!UUID_SCHEMA.safeParse(req.params.jobId).success) {
      return res.status(400).json({ error: "Invalid job ID" });
    }
    const leadId = String(req.query.leadId || "");
    const leadEmail = String(req.query.leadEmail || "");
    if (!UUID_SCHEMA.safeParse(leadId).success || !EMAIL_SCHEMA.safeParse(leadEmail).success) {
      return res.status(400).json({ error: "Lead verification is required." });
    }

    try {
      const job = await getAsyncJob(supabaseAdmin, req.params.jobId);
      if (!job || job.job_type !== "website_audit") return res.status(404).json({ error: "Audit job not found" });
      if (job.payload?.leadId !== leadId || job.payload?.leadEmail !== leadEmail) {
        return res.status(403).json({ error: "Forbidden" });
      }

      return res.json({
        id: job.id,
        status: job.status,
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
          const { job, existing } = await createAsyncJob(supabaseAdmin, {
            jobType: "website_audit",
            payload: {
              url: body.url,
              businessName: body.businessName || null,
              industry: body.industry || null,
              leadId: body.leadId || null,
              leadEmail: body.leadEmail || null,
            },
            idempotencyKey: `website_audit:${crypto.createHash("sha256").update(`${body.url}:${body.leadId || ""}:${body.leadEmail || ""}`).digest("hex")}`,
          });
          const dispatch = await publishJobToQstash(job.id).catch((error) => {
            console.warn(`[AsyncJobs:${job.id}] QStash dispatch skipped:`, error?.message || error);
            return { published: false, reason: "QStash dispatch failed" };
          });
          return res.status(existing ? 200 : 202).json({
            success: true,
            queued: true,
            jobId: job.id,
            status: job.status,
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
          wordpressResult,
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
          readNamedTable("wordpress_integrations", "wordpress_integrations"),
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
          wordpressResult,
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
            platformType: business.platform_type || "waas",
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
      const providers: Array<{ name: "openai" | "google" | "deepseek"; key: string }> = [
        { name: "openai", key: usableKey(process.env.OPENAI_API_KEY) ? String(process.env.OPENAI_API_KEY).trim() : "" },
        { name: "google", key: usableKey(process.env.GEMINI_API_KEY) ? String(process.env.GEMINI_API_KEY).trim() : "" },
        { name: "deepseek", key: usableKey(process.env.DEEPSEEK_API_KEY) ? String(process.env.DEEPSEEK_API_KEY).trim() : "" },
      ].filter((item): item is { name: "openai" | "google" | "deepseek"; key: string } => Boolean(item.key));
      if (!providers.length) return res.status(503).json({ error: "No internal AI provider is configured" });
      const provider = providers[0];
      const request = { prompt: buildInternalContentPrompt(brief.data), systemMessage: INTERNAL_CONTENT_SYSTEM_PROMPT, temperature: 0.2, maxTokens: 1800, isJson: true };
      try {
        const response = provider.name === "openai"
          ? await callOpenAI(provider.key, request, "gpt-4o-mini")
          : provider.name === "google"
            ? await callGemini(provider.key, request, "gemini-1.5-flash")
            : await callDeepSeek(provider.key, request, "deepseek-chat");
        const draft = parseInternalContentDraft(response.text);
        const { data: log, error: logError } = await supabaseAdmin.from("ai_generation_logs").insert({
          user_id: req.user.id,
          project_id: body.businessId || null,
          feature_key: "internal_content_engine",
          provider: provider.name,
          model: provider.name === "openai" ? "gpt-4o-mini" : provider.name === "google" ? "gemini-1.5-flash" : "deepseek-chat",
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
      const providers: Array<{ name: "openai" | "google" | "deepseek"; key: string }> = [
        { name: "openai", key: usableKey(process.env.OPENAI_API_KEY) ? String(process.env.OPENAI_API_KEY).trim() : "" },
        { name: "google", key: usableKey(process.env.GEMINI_API_KEY) ? String(process.env.GEMINI_API_KEY).trim() : "" },
        { name: "deepseek", key: usableKey(process.env.DEEPSEEK_API_KEY) ? String(process.env.DEEPSEEK_API_KEY).trim() : "" },
      ].filter((item): item is { name: "openai" | "google" | "deepseek"; key: string } => Boolean(item.key));
      if (!providers.length) return res.status(503).json({ error: "No internal AI provider is configured" });
      const provider = providers[0];
      try {
        const request = { prompt: buildHumaniseContentPrompt(body.input), systemMessage: HUMANISE_CONTENT_SYSTEM_PROMPT, temperature: 0.15, maxTokens: 1400, isJson: true };
        const response = provider.name === "openai"
          ? await callOpenAI(provider.key, request, "gpt-4o-mini")
          : provider.name === "google"
            ? await callGemini(provider.key, request, "gemini-1.5-flash")
            : await callDeepSeek(provider.key, request, "deepseek-chat");
        const draft = parseHumaniseContentDraft(response.text);
        const { data: log } = await supabaseAdmin.from("ai_generation_logs").insert({
          user_id: req.user.id,
          project_id: body.businessId || null,
          feature_key: "internal_humanise_content",
          provider: provider.name,
          model: provider.name === "openai" ? "gpt-4o-mini" : provider.name === "google" ? "gemini-1.5-flash" : "deepseek-chat",
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
      const providers: Array<{ name: "openai" | "google" | "deepseek"; key: string }> = [
        { name: "openai", key: usableKey(process.env.OPENAI_API_KEY) ? String(process.env.OPENAI_API_KEY).trim() : "" },
        { name: "google", key: usableKey(process.env.GEMINI_API_KEY) ? String(process.env.GEMINI_API_KEY).trim() : "" },
        { name: "deepseek", key: usableKey(process.env.DEEPSEEK_API_KEY) ? String(process.env.DEEPSEEK_API_KEY).trim() : "" },
      ].filter((item): item is { name: "openai" | "google" | "deepseek"; key: string } => Boolean(item.key));
      if (!providers.length) return res.status(503).json({ error: "No internal AI provider is configured" });
      const provider = providers[0];
      try {
        const request = { prompt: buildDesignDirectionPrompt(body.input), systemMessage: DESIGN_DIRECTOR_SYSTEM_PROMPT, temperature: 0.1, maxTokens: 1200, isJson: true };
        const response = provider.name === "openai"
          ? await callOpenAI(provider.key, request, "gpt-4o-mini")
          : provider.name === "google"
            ? await callGemini(provider.key, request, "gemini-1.5-flash")
            : await callDeepSeek(provider.key, request, "deepseek-chat");
        const direction = parseDesignDirection(response.text);
        const { data: log } = await supabaseAdmin.from("ai_generation_logs").insert({
          user_id: req.user.id,
          project_id: body.businessId || null,
          feature_key: "internal_design_direction",
          provider: provider.name,
          model: provider.name === "openai" ? "gpt-4o-mini" : provider.name === "google" ? "gemini-1.5-flash" : "deepseek-chat",
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
      await assertBusinessAccess(req.user.id, body.businessId);
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
        google: firstUsableKey(process.env.GEMINI_API_KEY),
        openai: firstUsableKey(process.env.OPENAI_API_KEY),
        deepseek: firstUsableKey(process.env.DEEPSEEK_API_KEY),
      };
      const fallbackModels: Record<string, string> = {
        google: "gemini-1.5-flash",
        openai: "gpt-4o-mini",
        deepseek: "deepseek-chat",
      };

      let selectedProvider = String(route?.provider || feature.default_provider || "google").toLowerCase();
      let selectedModel = route?.model || feature.default_model || fallbackModels[selectedProvider];
      let apiKey = providerKeys[selectedProvider] || "";

      if (!apiKey) {
        const availableProvider = ["google", "openai", "deepseek"].find((name) => providerKeys[name]);
        if (availableProvider) {
          selectedProvider = availableProvider;
          selectedModel = fallbackModels[availableProvider];
          apiKey = providerKeys[availableProvider];
        }
      }

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
        } else if (selectedProvider === "google") {
          aiResponse = await callGemini(apiKey, aiRequest, selectedModel);
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
        estimated_cost_usd: (aiResponse.usage.totalTokens * 0.000002), // Rough estimate
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

  // WordPress Integration Middleware
  const verifyWordPressAuth = async (req: any, res: any, next: any) => {
    const clientId = req.headers["x-growthos-client-id"];
    const apiKey = req.headers["x-growthos-api-key"];
    const siteUrl = req.headers["x-growthos-site-url"];

    if (!clientId || !apiKey) {
      return res.status(401).json({ success: false, message: "Missing Client ID or API Key" });
    }

    try {
      const { data: integration, error } = await supabaseAdmin
        .from("wordpress_integrations")
        .select("*")
        .eq("business_id", clientId)
        .maybeSingle();

      if (error || !integration) {
        return res.status(401).json({ success: false, message: "Invalid credentials or integration not found" });
      }

      if (integration.status === "disabled") {
        return res.status(403).json({ success: false, message: "Integration is disabled" });
      }

      if (!verifyApiKey(apiKey, integration.api_key_hash)) {
        // Log auth failure
        await logSyncEvent({
          business_id: clientId,
          integration_id: integration.id,
          direction: "wordpress_to_waas",
          event_type: "auth_failed",
          status: "error",
          message: "Invalid API key attempt",
          payload: { siteUrl, ip: req.ip }
        });
        return res.status(401).json({ success: false, message: "Invalid API Key" });
      }

      req.integration = integration;
      next();
    } catch (err) {
      console.error("WP Auth Error:", err);
      res.status(500).json({ success: false, message: "Server error during authentication" });
    }
  };

  // 1. WordPress Health Check
  app.get("/api/integrations/wordpress/health", verifyWordPressAuth, async (req: any, res: any) => {
    const integration = req.integration;
    const siteUrl = req.headers["x-growthos-site-url"];

    try {
      await supabaseAdmin
        .from("wordpress_integrations")
        .update({
          status: "connected",
          last_connected_at: new Date().toISOString(),
          site_url: siteUrl || integration.site_url // Update site URL if provided and not set
        })
        .eq("id", integration.id);

      await logSyncEvent({
        business_id: integration.business_id,
        integration_id: integration.id,
        direction: "wordpress_to_waas",
        event_type: "health_check",
        status: "success",
        message: "Health check successful"
      });

      res.json({
        success: true,
        status: "connected",
        clientId: integration.business_id,
        siteUrl: siteUrl || integration.site_url
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: "WordPress health check failed" });
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
    rateLimit({ windowMs: 60 * 1000, max: 20, keyPrefix: "platform-leads" }),
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
        firstTouch,
        lastTouch,
      } = leadBody;
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
        if (existingLead?.id) return res.status(200).json({ success: true, leadId: existingLead.id, reused: true });
      }

      const payloads: Record<string, any>[] = [
        {
          name,
          email,
          phone,
          message: salesMessage || "Free website preview requested from landing page.",
          source: "sales_landing_page",
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
          source: "sales_landing_page",
          source_page: sourcePage || req.get("referer") || "/",
          form_name: formName || "Website preview request",
          status: "new",
        },
        {
          name,
          email,
          phone,
          message: salesMessage || "Free website preview requested from landing page.",
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
      const currency = currencyByMarket[market] || String(proposal.config?.currency || "usd").toLowerCase();
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
      const paymentLink = await stripe.paymentLinks.create({
        line_items: lineItems,
        after_completion: {
          type: "redirect",
          redirect: {
            url: `${publicAppUrl()}/signup?redirect=${encodeURIComponent(`/dashboard/onboarding?proposal=${proposal.id}`)}`,
          },
        },
        metadata: { proposalId: proposal.id, leadId: proposal.lead_id || "", businessId: proposal.business_id || "", planId: proposal.config?.planId || "website_growth_partner", market, type: "proposal_subscription" },
        subscription_data: { metadata: { proposalId: proposal.id, leadId: proposal.lead_id || "", businessId: proposal.business_id || "", planId: proposal.config?.planId || "website_growth_partner", market } },
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
      const body = validateBody(z.object({ email: EMAIL_SCHEMA }), req, res);
      if (!body) return;
      try {
        const { data: proposal, error } = await supabaseAdmin
          .from("proposals")
          .select("id,lead_id,status,expires_at,checkout_url,leads(email)")
          .eq("proposal_token", req.params.token)
          .maybeSingle();
        if (error) throw error;
        if (!proposal) return res.status(404).json({ error: "Proposal not found" });
        if (proposal.expires_at && new Date(`${proposal.expires_at}T23:59:59Z`) < new Date()) return res.status(410).json({ error: "This proposal has expired. Please request an updated version." });
        const leadEmail = String((proposal as any).leads?.email || "").toLowerCase();
        if (leadEmail && leadEmail !== body.email.toLowerCase()) return res.status(403).json({ error: "Use the email address that received this proposal." });
        const acceptedAt = new Date().toISOString();
        const { error: updateError } = await supabaseAdmin.from("proposals").update({ status: "Accepted", accepted_at: acceptedAt, accepted_email: body.email.toLowerCase(), updated_at: acceptedAt }).eq("id", proposal.id);
        if (updateError) throw updateError;
        if (proposal.lead_id) await supabaseAdmin.from("leads").update({ status: "won", automation_next_action: "Send secure checkout and onboarding link", next_follow_up_at: acceptedAt }).eq("id", proposal.lead_id);
        await supabaseAdmin.from("proposal_events").insert({ proposal_id: proposal.id, event_type: "accepted", metadata: { leadId: proposal.lead_id || null } });
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
    "/api/wordpress-project-leads",
    rateLimit({ windowMs: 60 * 1000, max: 12, keyPrefix: "wordpress-project-leads" }),
    async (req, res) => {
      const wordpressLeadBody = validateBody(
        z.object({
          contactName: TEXT_SCHEMA,
          businessName: TEXT_SCHEMA,
          email: EMAIL_SCHEMA,
          phone: z.string().trim().min(3).max(80),
          websiteUrl: z.string().trim().max(500).optional().nullable(),
          businessType: TEXT_SCHEMA,
          requiredPages: TEXT_SCHEMA,
          requiredFunctionality: TEXT_SCHEMA,
          pageCount: z.string().trim().max(40).optional().nullable(),
          needsEcommerce: z.enum(["yes", "no"]).optional().default("no"),
          needsBooking: z.enum(["yes", "no"]).optional().default("no"),
          needsMembership: z.enum(["yes", "no"]).optional().default("no"),
          needsMultilingual: z.enum(["yes", "no"]).optional().default("no"),
          integrations: OPTIONAL_TEXT_SCHEMA,
          contentReadiness: z.string().trim().max(80).optional().nullable(),
          preferredLaunchDate: z.string().trim().max(40).optional().nullable(),
          indicativeBudget: z.string().trim().min(1).max(120),
          additionalDetails: OPTIONAL_TEXT_SCHEMA,
          packageName: z.string().trim().max(160).optional().nullable(),
          pipelineStatus: z.string().trim().max(80).optional().default("new_enquiry"),
          sourcePage: z.string().trim().max(500).optional().nullable(),
          estimatedQuoteRange: z.record(z.string(), z.any()).optional(),
        }),
        req,
        res,
      );
      if (!wordpressLeadBody) return;

      const rawFields = {
        ...wordpressLeadBody,
        submittedAt: new Date().toISOString(),
        sourceIp: getClientIp(req),
      };

      try {
        const { data: lead, error } = await supabaseAdmin
          .from("wordpress_project_leads")
          .insert({
            contact_name: wordpressLeadBody.contactName,
            company_name: wordpressLeadBody.businessName,
            email: wordpressLeadBody.email,
            phone: wordpressLeadBody.phone,
            existing_website: wordpressLeadBody.websiteUrl || null,
            business_type: wordpressLeadBody.businessType,
            required_pages: wordpressLeadBody.requiredPages,
            required_functionality: wordpressLeadBody.requiredFunctionality,
            page_count: wordpressLeadBody.pageCount || null,
            ecommerce_requirement: wordpressLeadBody.needsEcommerce === "yes",
            booking_requirement: wordpressLeadBody.needsBooking === "yes",
            membership_requirement: wordpressLeadBody.needsMembership === "yes",
            multilingual_requirement: wordpressLeadBody.needsMultilingual === "yes",
            integrations: wordpressLeadBody.integrations || null,
            content_readiness: wordpressLeadBody.contentReadiness || null,
            preferred_launch_date: wordpressLeadBody.preferredLaunchDate || null,
            indicative_budget: wordpressLeadBody.indicativeBudget,
            additional_details: wordpressLeadBody.additionalDetails || null,
            package_name: wordpressLeadBody.packageName || "Custom WordPress Website",
            pipeline_status: "new_enquiry",
            source_page: wordpressLeadBody.sourcePage || req.get("referer") || "/apply-custom",
            estimated_quote_range: wordpressLeadBody.estimatedQuoteRange || {},
            raw_fields: rawFields,
          })
          .select("id")
          .single();

        if (error) throw error;

        await supabaseAdmin.from("tracking_events").insert({
          event_type: "wordpress_project_lead_submitted",
          source_platform: "bennie_studio_public",
          source_page: wordpressLeadBody.sourcePage || req.get("referer") || "/apply-custom",
          metadata: { leadId: lead?.id, companyName: wordpressLeadBody.businessName },
        }).then(({ error: trackingError }) => {
          if (trackingError) console.warn("WordPress lead tracking skipped:", trackingError.message);
        });

        const { data: admins } = await supabaseAdmin.from("profiles").select("id").in("role", ["super_admin", "platform_staff"]);
        if (admins?.length) {
          await supabaseAdmin.from("notifications").insert(admins.map((admin: any) => ({
            user_id: admin.id,
            title: "New WordPress quotation request",
            message: `${wordpressLeadBody.businessName} submitted a custom WordPress website scope.`,
            type: "system",
            metadata: { leadId: lead?.id, pipelineStatus: "new_enquiry" },
          }))).then(({ error: notificationError }) => {
            if (notificationError) console.warn("WordPress lead notification skipped:", notificationError.message);
          });
        }

        return res.json({ success: true, leadId: lead?.id });
      } catch (error: any) {
        console.error("WordPress project lead submission failed:", error);
        return res.status(500).json({ error: "Unable to submit the WordPress quotation request right now." });
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

  // 2. Receive Leads from WordPress
  app.post(
    "/api/leads",
    rateLimit({ windowMs: 60 * 1000, max: 60, keyPrefix: "wp-leads" }),
    async (req: any, res: any) => {
    const clientId = req.headers["x-growthos-client-id"];
    const apiKey = req.headers["x-growthos-api-key"];
    
    let businessId = "";
    let integrationId = null;

    if (!clientId || !apiKey) {
      return res.status(401).json({ success: false, message: "Unauthorized integration" });
    }

    const { data: integration } = await supabaseAdmin
      .from("wordpress_integrations")
      .select("*")
      .eq("business_id", clientId)
      .maybeSingle();

    if (integration && verifyApiKey(apiKey, integration.api_key_hash)) {
      businessId = clientId as string;
      integrationId = integration.id;
    } else {
      return res.status(401).json({ success: false, message: "Unauthorized integration" });
    }

    if (!businessId) {
      return res.status(400).json({ success: false, message: "Missing businessId" });
    }

    try {
      const leadBody = validateBody(
        z.object({
          name: TEXT_SCHEMA.optional(),
          email: EMAIL_SCHEMA.optional(),
          phone: z.string().trim().max(80).optional().nullable(),
          message: OPTIONAL_TEXT_SCHEMA,
          sourcePlatform: z.string().trim().max(80).optional(),
          sourcePage: z.string().trim().max(500).optional().nullable(),
          formName: z.string().trim().max(120).optional().nullable(),
          rawFields: z.record(z.string(), z.any()).optional(),
        }),
        req,
        res,
      );
      if (!leadBody) return;

      const { name, email, phone, message, sourcePlatform, sourcePage, formName, rawFields } = leadBody;

      const { data: lead, error } = await supabaseAdmin
        .from("leads")
        .insert({
          business_id: businessId,
          integration_id: integrationId,
          name: name || "Unknown",
          email: email || "unknown@example.com",
          phone,
          message,
          source: sourcePlatform || "wordpress",
          source_platform: sourcePlatform || "wordpress",
          source_page: sourcePage,
          form_name: formName,
          raw_fields: rawFields,
          status: "new"
        })
        .select()
        .single();

      if (error) throw error;

      if (integrationId) {
        await supabaseAdmin
          .from("wordpress_integrations")
          .update({ last_lead_received_at: new Date().toISOString() })
          .eq("id", integrationId);

        await logSyncEvent({
          business_id: businessId,
          integration_id: integrationId,
          direction: "wordpress_to_waas",
          event_type: "lead_received",
          status: "success",
          message: `Lead received from ${formName || "form" }`,
          payload: { leadId: lead.id }
        });
      }

      res.json({ success: true, leadId: lead.id });
    } catch (err: any) {
      console.error("Lead submission error:", err);
      res.status(500).json({ success: false, message: "Failed to submit lead" });
    }
  });

  // 3. Receive Events from WordPress
  app.post("/api/events", async (req: any, res: any) => {
    const clientId = req.headers["x-growthos-client-id"];
    const apiKey = req.headers["x-growthos-api-key"];

    if (!clientId || !apiKey) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
      const { data: integration } = await supabaseAdmin
        .from("wordpress_integrations")
        .select("*")
        .eq("business_id", clientId)
        .maybeSingle();

      if (!integration || !verifyApiKey(apiKey, integration.api_key_hash)) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      const { eventType, sourcePlatform, sourcePage, metadata } = req.body;

      await supabaseAdmin.from("tracking_events").insert({
        business_id: clientId,
        integration_id: integration.id,
        event_type: eventType,
        source_platform: sourcePlatform || "wordpress",
        source_page: sourcePage,
        metadata
      });

      await supabaseAdmin
        .from("wordpress_integrations")
        .update({ last_event_received_at: new Date().toISOString() })
        .eq("id", integration.id);

      await logSyncEvent({
        business_id: clientId,
        integration_id: integration.id,
        direction: "wordpress_to_waas",
        event_type: "event_received",
        status: "success",
        message: `Event received: ${eventType}`
      });

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: "Failed to record event" });
    }
  });

  // 4. Push Page to WordPress
  app.post("/api/integrations/wordpress/push-page", authenticate, async (req: any, res: any) => {
    const pushPageBody = validateBody(
      z.object({
        businessId: UUID_SCHEMA,
        generatedPageId: UUID_SCHEMA,
        apiKey: z.string().trim().min(32).max(256),
      }),
      req,
      res,
    );
    if (!pushPageBody) return;

    const { businessId, generatedPageId, apiKey: rawApiKey } = pushPageBody;

    try {
      await assertBusinessAccess(req.user.id, businessId);

      const { data: integration } = await supabaseAdmin
        .from("wordpress_integrations")
        .select("*")
        .eq("business_id", businessId)
        .single();

      if (!integration || integration.status === "disabled") {
        return res.status(404).json({ error: "No active WordPress integration found" });
      }

      const { data: page } = await supabaseAdmin
        .from("generated_pages")
        .select("*")
        .eq("id", generatedPageId)
        .eq("business_id", businessId)
        .single();

      if (!page) {
        return res.status(404).json({ error: "Generated page not found" });
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const payload = {
        clientId: businessId,
        pageTitle: page.page_title,
        pageSlug: page.page_slug,
        status: "draft",
        seoTitle: page.seo_title,
        seoMetaDescription: page.seo_meta_description,
        sections: page.sections
      };

      const bodyString = JSON.stringify(payload);
      const signature = createHmacSignature(rawApiKey, `${timestamp}.${bodyString}`);

      const wpApiUrl = `${integration.site_url.replace(/\/$/, "")}/wp-json/growthos/v1/pages`;
      
      try {
        const response = await axios.post(wpApiUrl, payload, {
          headers: {
            "X-GrowthOS-Client-ID": businessId,
            "X-GrowthOS-Timestamp": timestamp,
            "X-GrowthOS-Signature": signature,
            "Content-Type": "application/json"
          },
          timeout: 15000
        });

        if (response.data.success) {
          const { postId, editUrl, previewUrl } = response.data;
          await supabaseAdmin
            .from("generated_pages")
            .update({
              wordpress_post_id: postId?.toString(),
              wordpress_edit_url: editUrl,
              wordpress_preview_url: previewUrl,
              push_status: "pushed_to_wordpress",
              updated_at: new Date().toISOString()
            })
            .eq("id", generatedPageId);

          await supabaseAdmin
            .from("wordpress_integrations")
            .update({ last_page_pushed_at: new Date().toISOString() })
            .eq("id", integration.id);

          await logSyncEvent({
            business_id: businessId,
            integration_id: integration.id,
            direction: "waas_to_wordpress",
            event_type: "page_pushed",
            status: "success",
            message: `Page "${page.page_title}" pushed to WordPress`,
            payload: { postId, editUrl }
          });

          res.json({ success: true, postId, editUrl, previewUrl });
        } else {
          throw new Error(response.data.message || "WordPress rejected the page");
        }
      } catch (axiosError: any) {
        console.error("WP Push Axios Error:", axiosError.response?.data || axiosError.message);
        
        await supabaseAdmin
          .from("generated_pages")
          .update({ push_status: "failed" })
          .eq("id", generatedPageId);

        await logSyncEvent({
          business_id: businessId,
          integration_id: integration.id,
          direction: "waas_to_wordpress",
          event_type: "error",
          status: "error",
          message: `Failed to push page: ${axiosError.message}`,
          payload: axiosError.response?.data
        });

        res.status(500).json({ error: "Failed to connect to WordPress plugin" });
      }
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
  
  // 5. Test Remote WordPress Connection
  app.post("/api/integrations/wordpress/test-remote", authenticate, async (req: any, res: any) => {
    const testRemoteBody = validateBody(
      z.object({
        integrationId: UUID_SCHEMA,
      }),
      req,
      res,
    );
    if (!testRemoteBody) return;

    const { integrationId } = testRemoteBody;
    
    try {
      const { data: integration } = await supabaseAdmin
        .from("wordpress_integrations")
        .select("*")
        .eq("id", integrationId)
        .single();
        
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      await assertBusinessAccess(req.user.id, integration.business_id);
      
      const wpApiUrl = `${integration.site_url.replace(/\/$/, "")}/wp-json/growthos/v1/health`;
      
      try {
        const response = await axios.get(wpApiUrl, {
          headers: {
            "X-GrowthOS-Client-ID": integration.business_id,
          },
          timeout: 5000
        });
        
        if (response.status === 200) {
          await supabaseAdmin
            .from("wordpress_integrations")
            .update({ 
               status: "connected",
               last_connected_at: new Date().toISOString() 
            })
            .eq("id", integrationId);
            
          res.json({ success: true, message: "Remote site responded" });
        } else {
          throw new Error(`Remote site returned status ${response.status}`);
        }
      } catch (axiosError: any) {
        await supabaseAdmin
          .from("wordpress_integrations")
          .update({ status: "error" })
          .eq("id", integrationId);
          
        res.status(500).json({ 
          success: false, 
          error: "Remote WordPress health check failed"
        });
      }
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
      res.status(500).json({ success: false, error: safeErrorMessage(err) });
    }
  });

  // Admin Integrations Management
  app.get("/api/integrations/wordpress", authenticate, async (req: any, res: any) => {
    try {
      const profile = await getProfileForUser(req.user.id);
      let query = supabaseAdmin
        .from("wordpress_integrations")
        .select("*, businesses(name)")
        .order("created_at", { ascending: false });

      if (profile.role !== "super_admin") {
        if (!profile.business_id) {
          return res.json([]);
        }
        query = query.eq("business_id", profile.business_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      res.json(data);
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

  app.get("/api/integrations/wordpress/:id", authenticate, async (req: any, res: any) => {
    try {
      const { data, error } = await supabaseAdmin
        .from("wordpress_integrations")
        .select("*, sync_logs(*)")
        .eq("id", req.params.id)
        .single();

      if (error) throw error;
      await assertBusinessAccess(req.user.id, data.business_id);
      res.json(data);
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

  app.post("/api/integrations/wordpress", authenticate, async (req: any, res: any) => {
    const integrationBody = validateBody(
      z.object({
        businessId: UUID_SCHEMA,
        siteUrl: PUBLIC_URL_SCHEMA,
      }),
      req,
      res,
    );
    if (!integrationBody) return;

    const { businessId, siteUrl } = integrationBody;
    
    try {
      await assertBusinessAccess(req.user.id, businessId);
      const apiKey = generateApiKey();
      const apiKeyHash = hashApiKey(apiKey);
      const apiKeyPreview = `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;

      const { data, error } = await supabaseAdmin
        .from("wordpress_integrations")
        .insert({
          business_id: businessId,
          site_url: siteUrl,
          api_key_hash: apiKeyHash,
          api_key_preview: apiKeyPreview,
          status: "not_connected"
        })
        .select()
        .single();

      if (error) throw error;

      res.json({
        ...data,
        rawApiKey: apiKey // Only sent once!
      });
    } catch (err: any) {
      res.status(500).json({ error: safeErrorMessage(err) });
    }
  });

  app.post("/api/integrations/wordpress/:id/regenerate-key", authenticate, async (req: any, res: any) => {
    try {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("wordpress_integrations")
        .select("business_id")
        .eq("id", req.params.id)
        .single();

      if (existingError || !existing) {
        return res.status(404).json({ error: "Integration not found" });
      }

      await assertBusinessAccess(req.user.id, existing.business_id);

      const apiKey = generateApiKey();
      const apiKeyHash = hashApiKey(apiKey);
      const apiKeyPreview = `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;

      const { data, error } = await supabaseAdmin
        .from("wordpress_integrations")
        .update({
          api_key_hash: apiKeyHash,
          api_key_preview: apiKeyPreview,
          status: "not_connected",
          updated_at: new Date().toISOString()
        })
        .eq("id", req.params.id)
        .select()
        .single();

      if (error) throw error;

      res.json({
        ...data,
        rawApiKey: apiKey
      });
    } catch (err: any) {
      res.status(500).json({ error: safeErrorMessage(err) });
    }
  });

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
      await assertBusinessAccess(req.user.id, businessId);
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
      await assertBusinessAccess(req.user.id, businessId);
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
      await assertBusinessAccess(req.user.id, businessId);
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
      const rows = parsed.prospects.filter((row) => !(row.domain && domains.has(row.domain)) && !(row.contact_email && emails.has(row.contact_email))
        && !names.has(`${row.name.toLowerCase()}|${(row.location || "").toLowerCase()}`));
      if (!rows.length) return res.json({ prospects: [], imported: 0, duplicates: parsed.duplicates + parsed.prospects.length });
      const { data, error } = await supabaseAdmin.from("prospects").insert(rows.map((row) => ({ ...row, created_by: req.user.id }))).select("*");
      if (error) throw error;
      return res.status(201).json({ prospects: data || [], imported: data?.length || 0, duplicates: parsed.duplicates + parsed.prospects.length - rows.length });
    } catch {
      return res.status(503).json({ error: "Prospect import could not be completed. Please retry; existing records will be checked again." });
    }
  });

  app.post("/api/admin/prospects/:prospectId/outreach", authenticate, async (req: any, res) => {
    if (!UUID_SCHEMA.safeParse(req.params.prospectId).success) return res.status(400).json({ error: "Invalid prospect ID" });
    try {
      const profile = await getProfileForUser(req.user.id);
      if (!canManageSalesOperations(profile)) return res.status(403).json({ error: "Sales access required" });
      const body = validateBody(z.object({
        action: z.enum(["prepare", "contacted"]), channel: z.enum(["email", "whatsapp"]),
        observation: z.string().trim().min(10).max(1000), bodyText: z.string().trim().min(1).max(10000), requestId: UUID_SCHEMA,
      }), req, res);
      if (!body) return;
      return res.json(await saveManualOutreach(supabaseAdmin, { ...body, prospectId: req.params.prospectId, actorId: req.user.id }, new Date().toISOString()));
    } catch (error: any) {
      const errors: Record<string, string> = {
        CONTACT_NOT_FOUND: "Prospect not found", CONTACT_CLOSED: "This prospect is closed; do not restart outreach automatically.",
        CONTACT_SUPPRESSED: "This contact has opted out or is suppressed.", CONTACT_CHANNEL_MISSING: "Add a valid contact for this channel.",
        OUTREACH_REQUEST_CONFLICT: "This outreach confirmation belongs to another prospect.",
      };
      return res.status(errors[error?.message] ? 409 : 503).json({ error: errors[error?.message] || "Outreach could not be saved. No message was sent by the app." });
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
      return res.json({ success: true, ...(await processDueSalesMessages()) });
    } catch (error) {
      console.error("Sales automation cron failed:", error);
      return res.status(500).json({ error: "Sales automation run failed" });
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
      if (body.sendNow) updates.scheduled_at = new Date().toISOString();
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
        observation: z.string().trim().min(10, "Add a specific verified observation").max(1000),
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
      if ([entity.status, entity.outreach_status].some((status) => ["won", "lost", "closed", "converted", "paid", "meeting", "call_booked", "appointment_booked", "replied"].includes(String(status).toLowerCase()))) {
        return res.status(409).json({ error: "This contact has replied, is closed or has a booked call. Use a personal follow-up." });
      }
      const steps = [...(sequence.outreach_sequence_steps || [])].sort((a: any, b: any) => a.step_order - b.step_order);
      if (!steps.length || steps.some((step: any) => step.channel !== "email" || !String(step.body_template || "").trim())) {
        return res.status(409).json({ error: "The sequence needs valid email steps before enrolment. WhatsApp remains manual." });
      }
      const startAt = new Date();
      const { data: enrollment, error: enrollmentError } = await supabaseAdmin.from("outreach_enrollments").insert({ sequence_id: sequence.id, lead_id: body.leadId || null, prospect_id: body.prospectId || null, status: "pending", current_step: 0, next_run_at: startAt.toISOString(), metadata: { observation: body.observation, createdBy: req.user.id } }).select("*").single();
      if (enrollmentError) throw enrollmentError;
      const rawFields = entity.raw_fields || {};
      const businessName = entity.business_name || entity.company_name || rawFields.businessName || rawFields.companyName || entity.name || "your business";
      const firstName = String(entity.name || "there").trim().split(/\s+/)[0];
      const values: Record<string, string> = { business_name: businessName, first_name: firstName, observation: body.observation };
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
          provider_payload: { sequenceId: sequence.id, stepId: step.id, stepOrder: step.step_order, delayHours: step.delay_hours, stopOnReply: true },
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

  app.get("/api/public/unsubscribe/:token", async (req, res) => {
    if (!UUID_SCHEMA.safeParse(req.params.token).success) return res.status(400).send("Invalid unsubscribe link");
    try {
      const { data: message, error } = await supabaseAdmin.from("sales_messages").select("recipient").eq("unsubscribe_token", req.params.token).maybeSingle();
      if (error) throw error;
      if (message?.recipient) await suppressSalesRecipient(supabaseAdmin, message.recipient, "opt_out", "email_unsubscribe", new Date().toISOString());
      return res.type("html").send("<!doctype html><html><body style='font-family:system-ui;background:#f8fafc;color:#0f172a;padding:60px'><main style='max-width:560px;margin:auto;background:white;padding:40px;border-radius:24px'><h1>You have been unsubscribed.</h1><p>Bennie Studio will not send further sales follow-ups to this address.</p></main></body></html>");
    } catch {
      return res.status(503).type("text").send("We could not save your request. Please retry this link.");
    }
  });

  app.post("/api/webhooks/resend", async (req: any, res) => {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(503).json({ error: "Webhook is not configured" });
    let event: any;
    try {
      event = getResend().webhooks.verify({
        payload: req.rawBody?.toString("utf8") || JSON.stringify(req.body),
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
          // Sending-only keys cannot read incoming email. Keep the optional receiving
          // credential server-side; never silently replace a failed read with fake text.
          const receiver = process.env.RESEND_RECEIVING_API_KEY ? new Resend(process.env.RESEND_RECEIVING_API_KEY) : getResend();
          const received = await receiver.emails.receiving.get(event.data.email_id);
          if (received.error || !received.data) throw new Error("REPLY_RETRIEVAL_UNAVAILABLE");
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

  app.get("/api/public/call-availability", rateLimit({ windowMs: 60 * 1000, max: 60, keyPrefix: "call-availability" }), async (_req, res) => {
    const now = new Date();
    const end = new Date(now.getTime() + 15 * 86400000);
    const { data: existing, error } = await supabaseAdmin.from("sales_call_bookings").select("start_at").eq("status", "booked").gte("start_at", now.toISOString()).lte("start_at", end.toISOString());
    if (error) return res.status(503).json({ error: "Call availability is temporarily unavailable" });
    const slots = buildAvailableSalesCallSlots(now, (existing || []).map((item) => item.start_at));
    res.setHeader("Cache-Control", "no-store");
    return res.json({ slots, timezone: SALES_CALL_TIMEZONE, durationMinutes: SALES_CALL_DURATION_MINUTES });
  });

  app.get("/api/public/pricing", rateLimit({ windowMs: 60 * 1000, max: 60, keyPrefix: "public-pricing" }), async (req, res) => {
    const market = normalizeCommercialMarket(req.query.market);
    if (process.env.E2E_TEST === "true") {
      return res.json({ market, currency: market === "MY" ? "MYR" : "USD", products: [] });
    }
    await refreshLaunchFlags();
    const { data, error } = await supabaseAdmin
      .from("commercial_products")
      .select("id,slug,name,description,product_type,sales_motion,includes_product_slug,commercial_market_prices!inner(market,currency,monthly_price,setup_fee,annual_price,billing_interval,active,stripe_monthly_price_id,stripe_annual_price_id,stripe_setup_price_id,stripe_one_time_price_id,recurring_monthly_price,recurring_setup_fee,recurring_annual_price,minimum_term_months,recurring_config_status,recurring_stripe_monthly_price_id,recurring_stripe_annual_price_id,recurring_stripe_setup_price_id)")
      .eq("active", true)
      // Custom Website is quote-led but still belongs in the public catalogue
      // so acquisition pages can route visitors to the correct consultation path.
      .in("slug", ["managed-website", "website-growth", "growth-partner", "custom-website"])
      .eq("commercial_market_prices.market", market)
      .eq("commercial_market_prices.active", true)
      .order("sort_order", { ascending: true });
    if (error) return res.status(503).json({ error: "Commercial pricing is temporarily unavailable" });
    const products = (data || []).map((product: any) => {
      const price = Array.isArray(product.commercial_market_prices) ? product.commercial_market_prices[0] : product.commercial_market_prices;
      const dynamicCheckoutAvailable = false;
      // Keep draft markets consultation-led even though the catalogue stores
      // one product-level sales motion. Malaysia is the only market currently
      // allowed to expose a self-service recurring checkout.
      const publicSalesMotion = product.sales_motion === "quote"
        ? "quote"
        : price?.recurring_config_status === "live" && price?.recurring_stripe_monthly_price_id
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
          setupFee: price.recurring_setup_fee === null || price.recurring_setup_fee === undefined ? 0 : Number(price.recurring_setup_fee),
          annualPrice: price.recurring_annual_price === null || price.recurring_annual_price === undefined ? null : Number(price.recurring_annual_price),
          billingInterval: "month",
          minimumTermMonths: Number(price.minimum_term_months || COMMERCIAL_RECURRING_COMMITMENT_MONTHS),
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
      "supportEmail", "gaMeasurementId", "metaPixelId", "salesWhatsappAriaLabel", "salesWhatsappEnabled",
      "salesWhatsappLink", "salesWhatsappMessage", "salesCookieBannerEnabled", "trackingScriptsHeader", "trackingScriptsFooter",
    ];
    const publicPlatform = Object.fromEntries(publicPlatformKeys.filter((key) => platform[key] !== undefined).map((key) => [key, platform[key]]));
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
    const market = normalizeCommercialMarket(countryCode);
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
    const body = validateBody(z.object({ leadId: UUID_SCHEMA.optional(), name: TEXT_SCHEMA, email: EMAIL_SCHEMA, phone: z.string().max(80).optional(), businessName: TEXT_SCHEMA, market: z.enum(["MY", "SG", "GB", "US"]).optional(), industry: z.string().max(160).optional(), websiteUrl: z.string().url().max(500).optional(), startAt: z.string().datetime(), timezone: z.literal(SALES_CALL_TIMEZONE).default(SALES_CALL_TIMEZONE), goals: z.string().max(2000).optional(), previewId: z.string().trim().max(160).optional(), selectedProduct: z.enum(["managed-website", "website-growth", "growth-partner"]).optional(), sourcePage: z.string().trim().max(500).optional() }), req, res);
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
        productSlug: z.enum(["managed-website", "website-growth", "growth-partner", "custom-website"]).optional().nullable(),
        billingCycle: z.enum(["monthly", "yearly"]).optional().default("monthly"),
        market: z.enum(["MY", "SG", "GB", "US", "INTL"]).optional().default("INTL"),
        promotionCode: z.string().trim().max(120).optional().nullable(),
        upgradeFrom: z.string().trim().max(80).optional().nullable(),
      }),
      req,
      res,
    );
    if (!checkoutBody) return;

    const { businessId, customerEmail, couponId, planId, productSlug, billingCycle } = checkoutBody;
    const market = normalizeCommercialMarket(checkoutBody.market);
    const legacyMarket = checkoutBody.market === "US" ? "US" : market;
    let priceId = checkoutBody.priceId || "";
    let resolvedProductSlug = productSlug || null;
    let resolvedPromotionId: string | null = null;
    let testDynamicMonthlyAmount: number | null = null;
    let testDynamicSetupAmount: number | null = null;
    let useDynamicCatalogPrices = false;

    try {
      await assertBusinessAccess(req.user.id, businessId);
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
          testDynamicSetupAmount = Number(currentPrice.recurring_setup_fee || currentPrice.setup_fee || 0);
          if (currentProduct.sales_motion !== "self_serve") return res.status(400).json({ error: "This product is available by consultation, not self-serve checkout." });
          // New public checkout is recurring-only. Legacy one-time prices are
          // retained for historical records but can never be selected here.
          const recurringMode = currentPrice.recurring_config_status === "live";
          // Customer checkout is available only for markets with an activated
          // recurring Stripe configuration. Draft international markets are
          // consultation-only until an operator activates their price IDs.
          useDynamicCatalogPrices = false;
          if (!recurringMode && !useDynamicCatalogPrices) return res.status(400).json({ error: "Recurring checkout is not enabled for this product and market yet." });
          if (useDynamicCatalogPrices && billingCycle === "yearly" && !currentPrice.recurring_annual_price) {
            return res.status(400).json({ error: "Annual billing is not configured for this market yet. Choose monthly billing or book a consultation." });
          }
          isOneTimeCheckout = false;
          minimumTermMonths = Number(currentPrice.minimum_term_months || COMMERCIAL_RECURRING_COMMITMENT_MONTHS);
          priceId = useDynamicCatalogPrices ? "" : billingCycle === "yearly"
            ? (currentPrice.recurring_stripe_annual_price_id || "")
            : (currentPrice.recurring_stripe_monthly_price_id || "");
          if (!priceId && !useDynamicCatalogPrices) return res.status(400).json({ error: `${billingCycle === "yearly" ? "Annual" : "Monthly"} recurring checkout is not configured for this market yet.` });
          // A Growth upgrade does not repeat the Managed Website setup fee.
          const isUpgrade = productSlug === "website-growth" && checkoutBody.upgradeFrom === "managed-website";
          configuredSetupPriceId = isUpgrade ? null : (currentPrice.recurring_stripe_setup_price_id || null);
          if (checkoutBody.promotionCode) {
            const now = new Date().toISOString();
            const { data: promotion } = await supabaseAdmin.from("commercial_promotions").select("id,market,product_id,promotional_monthly_price,promotional_setup_fee,starts_at,ends_at,usage_limit,usage_count,stripe_monthly_price_id,stripe_setup_price_id,active").eq("code", checkoutBody.promotionCode).eq("active", true).or(`starts_at.is.null,starts_at.lte.${now}`).or(`ends_at.is.null,ends_at.gte.${now}`).maybeSingle();
            const promotionMatches = promotion && (!promotion.market || promotion.market === market) && (!promotion.product_id || promotion.product_id === currentProduct.id) && (!promotion.usage_limit || promotion.usage_count < promotion.usage_limit) && promotion.stripe_monthly_price_id;
            if (!promotionMatches) return res.status(400).json({ error: "This promotion is unavailable for the selected product or market." });
            resolvedPromotionId = promotion.id;
            priceId = billingCycle === "yearly" ? priceId : promotion.stripe_monthly_price_id;
            configuredSetupPriceId = isUpgrade ? null : (promotion.stripe_setup_price_id || configuredSetupPriceId);
          }
          if (Number(currentPrice.recurring_setup_fee || 0) > 0 && !configuredSetupPriceId && !isUpgrade) {
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

      const stripe = await getStripe();

      // Check if business already has a stripe_customer_id and trial info
      const { data: business } = await supabase
        .from("businesses")
        .select("stripe_customer_id, stripe_subscription_id, trial_ends_at")
        .eq("id", businessId)
        .single();

	      const sessionOptions: any = {
	        payment_method_types: ["card"],
	        line_items: (useDynamicCatalogPrices || process.env.STRIPE_TEST_DYNAMIC_PRICES === "true") && resolvedProductSlug && testDynamicMonthlyAmount
          ? [
              { price_data: { currency: commercialCurrencyForMarket(market).toLowerCase(), product_data: { name: resolvedProductSlug === "managed-website" ? "Managed Website" : resolvedProductSlug === "growth-partner" ? "Growth Partner" : "Website Growth" }, unit_amount: Math.round(testDynamicMonthlyAmount * 100), recurring: { interval: billingCycle === "yearly" ? "year" : "month" } }, quantity: 1 },
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
        await assertBusinessAccess(req.user.id, businessId);
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

  app.post(
    "/api/onboarding/complete",
    authenticate,
    rateLimit({ windowMs: 60 * 1000, max: 10, keyPrefix: "onboarding-complete", key: (req) => req.user?.id || getClientIp(req) }),
    async (req: any, res) => {
      const body = validateBody(z.object({ businessId: UUID_SCHEMA, websiteId: UUID_SCHEMA, planId: z.string().trim().min(1).max(80), proposalId: UUID_SCHEMA.optional().nullable() }), req, res);
      if (!body) return;
      try {
		        let effectivePlanId = "";
		        await assertBusinessAccess(req.user.id, body.businessId);
		        let { data: business } = await supabaseAdmin
		          .from("businesses")
		          .select("id,name,plan,subscription_status,stripe_customer_id,stripe_subscription_id")
		          .eq("id", body.businessId)
		          .single();
		        effectivePlanId = String((business as any)?.plan || "").trim();
	        if (body.proposalId) {
	          const { data: proposal } = await supabaseAdmin
	            .from("proposals")
	            .select("id,status,accepted_email,business_id,config,leads(email)")
	            .eq("id", body.proposalId)
	            .maybeSingle();
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
	        const { data: existingProject } = await supabaseAdmin.from("projects").select("id").eq("business_id", body.businessId).order("created_at", { ascending: false }).limit(1).maybeSingle();
        const projectPayload = { website_id: body.websiteId, title: `${business.name} Managed Website`, package_name: effectivePlanId, status: "ready_for_build", updated_at: new Date().toISOString() };
        if (existingProject) await supabaseAdmin.from("projects").update(projectPayload).eq("id", existingProject.id);
        else await supabaseAdmin.from("projects").insert({ business_id: body.businessId, type: "waas", priority: "medium", ...projectPayload });

        const { data: onboarding } = await supabaseAdmin.from("onboarding_sessions").select("id").eq("business_id", body.businessId).neq("status", "Completed").order("created_at", { ascending: false }).limit(1).maybeSingle();
        const onboardingPayload = { current_step: "Ready for build", status: "Completed", progress: 100, notes: "Customer onboarding submitted and website draft generated.", updated_at: new Date().toISOString() };
        if (onboarding) await supabaseAdmin.from("onboarding_sessions").update(onboardingPayload).eq("id", onboarding.id);
        else await supabaseAdmin.from("onboarding_sessions").insert({ business_id: body.businessId, ...onboardingPayload });

        const { data: admins } = await supabaseAdmin.from("profiles").select("id").in("role", ["super_admin", "platform_staff"]);
        if (admins?.length) await supabaseAdmin.from("notifications").insert(admins.map((admin: any) => ({ user_id: admin.id, business_id: body.businessId, title: "Customer onboarding completed", message: `${business.name} submitted onboarding and is ready for production.`, type: "onboarding", metadata: { websiteId: body.websiteId } })))
          .then(({ error }) => { if (error) console.warn("Onboarding admin notification skipped:", error.message); });
        await supabaseAdmin.from("tracking_events").insert({ event_type: "onboarding_completed", source_platform: "customer_dashboard", metadata: { businessId: body.businessId, websiteId: body.websiteId, planId: effectivePlanId } })
          .then(({ error }) => { if (error) console.warn("Onboarding tracking skipped:", error.message); });
        return res.json({ success: true, projectStatus: "ready_for_build" });
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
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${publicAppUrl()}/dashboard/settings`,
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
        const days = parseInt(req.query.days as string) || 30;
        const since = new Date();
        since.setDate(since.getDate() - days);
        const sinceIso = since.toISOString();

        const [
          pageViewsResult,
          trackingEventsResult,
          profilesResult,
          businessesResult,
          leadsResult,
        ] = await Promise.allSettled([
          supabaseAdmin
            .from("page_views")
            .select("visitor_id, session_id, page_path, referrer, created_at")
            .gte("created_at", sinceIso)
            .order("created_at", { ascending: false })
            .limit(5000),
          supabaseAdmin
            .from("tracking_events")
            .select("event_type, source_platform, source_page, metadata, created_at")
            .gte("created_at", sinceIso)
            .order("created_at", { ascending: false })
            .limit(5000),
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

        const unwrapRows = <T = any>(result: PromiseSettledResult<{ data: T[] | null; error: any }>) => {
          if (result.status !== "fulfilled") return [];
          if (result.value.error) {
            console.warn("Traffic metric source unavailable:", result.value.error.message);
            return [];
          }
          return result.value.data || [];
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

        const dateKeys = Array.from({ length: days }, (_, index) => {
          const date = new Date();
          date.setDate(date.getDate() - (days - 1 - index));
          return date.toISOString().slice(0, 10);
        });
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
          .eq("referral_code", refCode)
          .eq("business_id", businessId)
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
        gemini: Boolean(process.env.GEMINI_API_KEY),
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

      const { data: affiliate } = await supabaseAdmin
        .from("affiliates")
        .select("id, uid, status, business_id")
        .eq("referral_code", referralCode)
        .in("status", ["active", "approved"])
        .maybeSingle();

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
      try {
        const { data: affiliate } = await supabase
          .from("affiliates")
          .select("*")
          .eq("uid", req.user.id)
          .is("business_id", null)
          .single();

        if (!affiliate)
          return res.status(404).json({ error: "Affiliate record not found" });
        if (affiliate.status !== "active")
          return res
            .status(403)
            .json({ error: "Affiliate account is not active" });

        const amount = Number(affiliate.unpaid_earnings);
        // Fetch program minimum if possible
        const programQuery = supabase
          .from("affiliate_programs")
          .select("payout_minimum");
        const { data: program } = affiliate.business_id
          ? await programQuery.eq("business_id", affiliate.business_id).maybeSingle()
          : await programQuery.eq("is_platform_program", true).maybeSingle();
        const minimum = program?.payout_minimum || 50;

        if (amount < minimum)
          return res
            .status(400)
            .json({ error: `Minimum payout is $${minimum}` });

        // Atomic push to payouts and clear unpaid_earnings
        const { error: payoutError } = await supabase
          .from("affiliate_payouts")
          .insert({
            affiliate_id: affiliate.id,
            amount: amount,
            status: "pending",
          });

        if (payoutError) throw payoutError;

        const { error: updateError } = await supabase
          .from("affiliates")
          .update({ unpaid_earnings: 0 })
          .eq("id", affiliate.id);

        if (updateError) throw updateError;

        res.json({ success: true, amount });
      } catch (error: any) {
        res.status(500).json({ error: safeErrorMessage(error) });
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
        await assertBusinessAccess(req.user.id, businessId);
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
      await assertBusinessAccess(userId, businessId);

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

  // LEAD WEBHOOK: Receives leads from external sources (WordPress, etc.)
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
      await assertBusinessAccess(req.user.id, body.businessId);

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
      await assertBusinessAccess(req.user.id, body.businessId);
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

  // Server-render the three public marketing entry points so crawlers and
  // link unfurlers receive meaningful copy without executing JavaScript.
  // Authenticated dashboards intentionally remain client-side rendered.
  app.get("/api/marketing", (req, res) => {
    const requestedPath = String(req.query.path || "/").split("?")[0];
    if (!isMarketingRoute(requestedPath)) {
      return res.status(404).json({ error: "Marketing route not found" });
    }
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    return res.type("html").send(renderMarketingDocument(requestedPath, resolveMarketingClientScript(), String(req.query.market || "")));
  });

  // Vercel mounts this single function at /api. Public marketing rewrites
  // target that mount directly, so keep the route explicit instead of
  // allowing the SPA fallback to serve the generic shell.
  app.get("/api", (req, res, next) => {
    const requestedPath = String(req.query.path || "").split("?")[0];
    if (!isMarketingRoute(requestedPath)) return next();
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    return res.type("html").send(renderMarketingDocument(requestedPath, resolveMarketingClientScript(), String(req.query.market || "")));
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
