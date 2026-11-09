import { generateId } from "./utils";

type PublicEventInput = {
  eventType: string;
  label?: string;
  target?: string;
  metadata?: Record<string, unknown>;
};

const getOrCreateStorageValue = (
  storage: Storage,
  key: string,
): string | null => {
  try {
    let value = storage.getItem(key);
    if (!value) {
      value = generateId();
      storage.setItem(key, value);
    }
    return value;
  } catch {
    return null;
  }
};

export function trackPublicEvent(input: PublicEventInput) {
  if (typeof window === "undefined") return;

  const payload = {
    eventType: input.eventType,
    sourcePage: `${window.location.pathname}${window.location.search}`,
    label: input.label || null,
    target: input.target || null,
    visitorId: getOrCreateStorageValue(window.localStorage, "bt_visitor_id"),
    sessionId: getOrCreateStorageValue(window.sessionStorage, "bt_session_id"),
    metadata: {
      title: document.title,
      ...input.metadata,
    },
  };

  const body = JSON.stringify(payload);

  const gtag = (window as any).gtag;
  if (typeof gtag === "function") {
    const leadEvent = input.eventType === "website_audit_requested" ||
      input.eventType === "consultation_request_saved";
    const eventName = leadEvent ? "generate_lead" : input.eventType;
    const eventParams: Record<string, string> = {
      event_category: leadEvent ? "lead_generation" : "public_engagement",
      source_event: input.eventType,
      page_path: window.location.pathname,
    };
    if (input.target) {
      try {
        eventParams.target_path = new URL(input.target, window.location.origin).pathname;
      } catch {
        // Ignore malformed targets; the internal event record remains available.
      }
    }
    gtag("event", eventName, eventParams);
  }

  try {
    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(
        "/api/platform-events",
        new Blob([body], { type: "application/json" }),
      );
      if (sent) return;
    }
  } catch {
    // Fall back to fetch below.
  }

  fetch("/api/platform-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Never block the sales page because tracking failed.
  });
}
