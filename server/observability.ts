import type { NextFunction, Request, Response } from "express";
import * as Sentry from "@sentry/node";

type LogLevel = "debug" | "info" | "warn" | "error";

let sentryInitialized = false;

const redactKeys = new Set([
  "authorization",
  "cookie",
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "stripe_secret_key",
  "supabase_service_role_key",
]);

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 3) return "[truncated]";
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: process.env.NODE_ENV === "development" ? value.stack : undefined,
    };
  }
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, depth + 1));

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 60)
      .map(([key, item]) => [
        key,
        redactKeys.has(key) || /token|secret|password|authorization|cookie/i.test(key)
          ? "[redacted]"
          : sanitize(item, depth + 1),
      ]),
  );
}

export function initServerObservability() {
  if (sentryInitialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || "0.05"),
  });
  sentryInitialized = true;
}

export function structuredLog(
  level: LogLevel,
  message: string,
  context: Record<string, unknown> = {},
) {
  const payload = {
    level,
    message,
    service: "bennie-tay-studio-api",
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    ...(sanitize(context) as Record<string, unknown>),
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function captureServerError(error: unknown, context: Record<string, unknown> = {}) {
  structuredLog("error", error instanceof Error ? error.message : "Server error", {
    error,
    ...context,
  });

  if (!sentryInitialized) return;
  Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(sanitize(context) as Record<string, unknown>)) {
      scope.setContext(key, typeof value === "object" && value !== null ? value as Record<string, unknown> : { value });
    }
    Sentry.captureException(error);
  });
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  const requestId = String((req as any).requestId || req.headers["x-request-id"] || "");
  const path = req.originalUrl?.split("?")[0] || req.path;
  const isApi = path.startsWith("/api");

  if (isApi) {
    structuredLog("info", "request_started", {
      requestId,
      method: req.method,
      path,
      vercelId: req.headers["x-vercel-id"] || null,
    });
  }

  res.on("finish", () => {
    if (!isApi) return;
    const durationMs = Date.now() - startedAt;
    const level: LogLevel = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    structuredLog(level, "request_completed", {
      requestId,
      method: req.method,
      path,
      statusCode: res.statusCode,
      durationMs,
      contentLength: res.getHeader("content-length") || null,
      vercelId: req.headers["x-vercel-id"] || null,
    });
  });

  next();
}
