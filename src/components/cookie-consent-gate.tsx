"use client";

import dynamic from "next/dynamic";

const CookieConsent = dynamic(
  () =>
    import("@/components/cookie-consent").then((m) => m.CookieConsent),
  { ssr: false },
);

/** Client-only gate so root layout can stay a Server Component. */
export function CookieConsentGate() {
  return <CookieConsent />;
}
