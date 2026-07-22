type PinterestEventName = "pagevisit" | "lead" | "signup" | "checkout" | "custom";

type PinterestEventData = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    pintrk?: {
      (...args: any[]): void;
      queue?: any[];
      version?: string;
    };
  }
}

const DEFAULT_PINTEREST_TAG_ID = "2613283617571";
const PINTEREST_TAG_ID =
  import.meta.env.VITE_PINTEREST_TAG_ID || DEFAULT_PINTEREST_TAG_ID;

const TRACKED_HOSTS = new Set([
  "bennietay.com",
  "www.bennietay.com",
  "app.bennietay.com",
  "launchpad.bennietay.com",
  "localhost",
  "127.0.0.1",
]);

let pinterestInitialized = false;
let lastPageVisitKey = "";

function canTrackPinterest() {
  if (typeof window === "undefined" || !PINTEREST_TAG_ID) return false;
  return TRACKED_HOSTS.has(window.location.hostname.toLowerCase());
}

function initPinterestTag() {
  if (!canTrackPinterest()) return false;
  if (pinterestInitialized && window.pintrk) return true;

  if (!window.pintrk) {
    window.pintrk = function pintrk() {
      window.pintrk!.queue?.push(Array.prototype.slice.call(arguments));
    };
    window.pintrk.queue = [];
    window.pintrk.version = "3.0";

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://s.pinimg.com/ct/core.js";
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript?.parentNode?.insertBefore(script, firstScript);
  }

  window.pintrk("load", PINTEREST_TAG_ID);
  pinterestInitialized = true;
  return true;
}

function trackPinterestEvent(eventName: PinterestEventName, data: PinterestEventData = {}) {
  if (!initPinterestTag() || !window.pintrk) return;
  window.pintrk("track", eventName, {
    event_id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    ...data,
  });
}

export function trackPinterestPageVisit(path = window.location.pathname + window.location.search) {
  const pageKey = `${window.location.hostname}${path}`;
  if (lastPageVisitKey === pageKey) return;
  lastPageVisitKey = pageKey;
  trackPinterestEvent("pagevisit", {
    page_path: path,
    referrer: document.referrer || null,
  });
}

export function trackPinterestLead(label: string, data: PinterestEventData = {}) {
  trackPinterestEvent("lead", {
    lead_type: label,
    ...data,
  });
}

export function trackPinterestSignup(label = "account_signup", data: PinterestEventData = {}) {
  trackPinterestEvent("signup", {
    signup_type: label,
    ...data,
  });
}

export function trackPinterestCheckout(label: string, data: PinterestEventData = {}) {
  trackPinterestEvent("checkout", {
    checkout_type: label,
    ...data,
  });
}
