import type { Metadata } from "next";
import Link from "next/link";
import { listFaqs } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Help & FAQ",
  description:
    "Help centre and frequently asked questions for Nahda Publications authors and readers.",
};

export default async function HelpPage() {
  const faqs = await listFaqs(true);

  return (
    <div className="page-wrap">
      <h1 className="page-title">Help centre</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Quick answers for authors and readers. Content is managed in the Site
        pages CMS.
      </p>

      <div className="mt-8 space-y-3">
        {faqs.map((faq) => (
          <details key={faq.id} className="card group open:shadow-md">
            <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-medium text-[var(--ink)] sm:px-5 sm:py-4 sm:text-base">
              {faq.question}
            </summary>
            <p className="border-t border-[var(--line)] px-4 py-3.5 text-sm text-[var(--muted)] sm:px-5 sm:py-4">
              {faq.answer}
            </p>
          </details>
        ))}
        {faqs.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            FAQs will appear here once published.
          </p>
        )}
      </div>

      <div id="contact" className="card mt-10 p-6">
        <h2 className="font-semibold text-[var(--ink)]">Contact support</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Email{" "}
          <a
            href="mailto:nahdapublications@gmail.com"
            className="break-all font-medium text-[var(--accent)] hover:underline"
          >
            nahdapublications@gmail.com
          </a>
          . Typical response within 1 to 2 business days.
        </p>
        <p className="mt-3 text-sm text-[var(--muted)]">
          For payments and data protection, see{" "}
          <Link href="/terms" className="font-semibold text-[var(--accent)] hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-semibold text-[var(--accent)] hover:underline">
            Privacy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
