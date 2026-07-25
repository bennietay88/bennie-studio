import * as Sentry from "@sentry/react";

let initialized = false;

export function initClientObservability() {
  if (initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_VERCEL_ENV || import.meta.env.MODE,
    release: import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || "0.05"),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });

  window.addEventListener("unhandledrejection", (event) => {
    captureClientError(event.reason, { source: "unhandledrejection" });
  });

  window.addEventListener("error", (event) => {
    captureClientError(event.error || event.message, { source: "window.error", filename: event.filename });
  });

  initialized = true;
}

export function captureClientError(error: unknown, context: Record<string, unknown> = {}) {
  if (!initialized) return;
  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => {
      scope.setContext(key, typeof value === "object" && value !== null ? value as Record<string, unknown> : { value });
    });
    Sentry.captureException(error);
  });
}
