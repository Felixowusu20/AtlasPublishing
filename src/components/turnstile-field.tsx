"use client";

/**
 * Cloudflare Turnstile widget — DISABLED for now.
 * To re-enable: set TURNSTILE_ACTIVE = true in turnstile-public.ts and
 * turnstile.ts, uncomment keys in .env, and restore the implementation below.
 */
type Props = {
  onToken: (token: string | null) => void;
};

export function TurnstileField({ onToken }: Props) {
  void onToken;
  return null;
}

/*
import { useEffect, useRef } from "react";
import { turnstileSiteKey } from "@/lib/turnstile-public";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export function TurnstileFieldEnabled({ onToken }: Props) {
  const siteKey = turnstileSiteKey();
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    let loadHandler: (() => void) | null = null;

    function mount() {
      if (cancelled || !hostRef.current || !window.turnstile) return;
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
      hostRef.current.innerHTML = "";
      widgetIdRef.current = window.turnstile.render(hostRef.current, {
        sitekey: siteKey!,
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => onTokenRef.current(null),
        theme: "light",
      });
    }

    const existing = document.querySelector(
      'script[data-nahda-turnstile="1"]',
    ) as HTMLScriptElement | null;

    if (window.turnstile) {
      mount();
    } else if (existing) {
      loadHandler = () => mount();
      existing.addEventListener("load", loadHandler);
      if (existing.dataset.loaded === "1" || window.turnstile) mount();
    } else {
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.dataset.nahdaTurnstile = "1";
      loadHandler = () => {
        script.dataset.loaded = "1";
        mount();
      };
      script.addEventListener("load", loadHandler);
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (loadHandler && existing) {
        existing.removeEventListener("load", loadHandler);
      }
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
      onTokenRef.current(null);
    };
  }, [siteKey]);

  if (!siteKey) return null;

  return (
    <div className="pt-1">
      <div ref={hostRef} className="cf-turnstile min-h-[65px]" />
      <p className="mt-1.5 text-[11px] text-[var(--muted)]">
        Human verification protects accounts — article pages stay open for Google
        Scholar and research crawlers.
      </p>
    </div>
  );
}
*/
