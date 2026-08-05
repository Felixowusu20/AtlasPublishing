import type { Metadata } from "next";
import Link from "next/link";
import { CmsProse } from "@/components/cms-prose";
import { getCmsPage, parseCmsBody } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "Terms & Conditions for Nahda Publications websites, manuscript submissions, and payments.",
};

export default async function TermsPage() {
  const page = await getCmsPage("terms");
  if (!page || !page.isActive) {
    return (
      <div className="page-wrap">
        <h1 className="page-title">Terms & Conditions</h1>
        <p className="mt-4 text-sm text-[var(--muted)]">
          This page is temporarily unavailable.
        </p>
      </div>
    );
  }

  return (
    <div className="page-wrap max-w-3xl">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        Legal
      </p>
      <h1 className="page-title mt-2">{page.title}</h1>
      {page.subtitle && (
        <p className="mt-3 text-base text-[var(--muted)]">{page.subtitle}</p>
      )}
      <div className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-6 sm:p-8">
        <CmsProse blocks={parseCmsBody(page.body)} />
      </div>
      <p className="mt-6 text-sm text-[var(--muted)]">
        Also see our{" "}
        <Link href="/privacy" className="font-semibold text-[var(--accent)] hover:underline">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/help" className="font-semibold text-[var(--accent)] hover:underline">
          Help & FAQ
        </Link>
        .
      </p>
    </div>
  );
}
