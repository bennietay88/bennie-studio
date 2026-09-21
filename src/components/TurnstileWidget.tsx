import React from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, any>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

type Props = {
  siteKey?: string;
  onToken: (token: string) => void;
  onExpire?: () => void;
};

export function TurnstileWidget({ siteKey, onToken, onExpire }: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const widgetIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;
    const scriptId = "cf-turnstile-script";
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => onToken(token),
        "expired-callback": () => {
          onToken("");
          onExpire?.();
        },
        "error-callback": () => onToken(""),
        theme: "auto",
        size: "flexible",
      });
    };

    if (existing) {
      if (window.turnstile) renderWidget();
      else existing.addEventListener("load", renderWidget, { once: true });
    } else {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", renderWidget, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* widget cleanup is best effort */ }
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, onExpire, onToken]);

  if (!siteKey) return null;
  return <div ref={containerRef} className="min-h-[65px] w-full" aria-label="Human verification" />;
}

export default TurnstileWidget;
