"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const STORAGE_KEY = "nahda_cookie_consent";

export type CookieConsentValue = "accepted" | "rejected";

function readConsent(): CookieConsentValue | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "accepted" || value === "rejected") return value;
  } catch {
    /* private mode / blocked storage */
  }
  return null;
}

function writeConsent(value: CookieConsentValue) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
  // Lightweight first-party cookie so the choice survives across sessions
  // even when some browsers clear localStorage less often than cookies.
  const maxAge = 60 * 60 * 24 * 365; // 1 year
  document.cookie = `${STORAGE_KEY}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
}

export function CookieConsent() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (pathname.startsWith("/admin")) {
      setVisible(false);
      return;
    }
    // Only decide after mount so SSR HTML always matches the first client paint.
    setVisible(readConsent() == null);
  }, [mounted, pathname]);

  function decide(value: CookieConsentValue) {
    writeConsent(value);
    setVisible(false);
  }

  if (!mounted || !visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_-8px_40px_rgba(11,31,51,0.14)] sm:flex-row sm:items-end sm:gap-5 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            Cookies
          </p>
          <h2
            id="cookie-consent-title"
            className="mt-1 font-[family-name:var(--font-display)] text-lg text-[var(--ink)] sm:text-xl"
          >
            We use cookies
          </h2>
          <p
            id="cookie-consent-desc"
            className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]"
          >
            We use essential cookies to keep you signed in and optional cookies
            to improve your experience on Nahda Publications. You can accept all
            cookies or reject non-essential ones.{" "}
            <Link
              href="/help"
              className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
            >
              Learn more
            </Link>
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => decide("rejected")}
            className="btn-secondary w-full sm:w-auto"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="btn-primary w-full sm:w-auto"
          >
            Accept cookies
          </button>
        </div>
      </div>
    </div>
  );
}
