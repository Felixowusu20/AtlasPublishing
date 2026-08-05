import type { Metadata } from "next";
import Link from "next/link";
import { CmsProse } from "@/components/cms-prose";
import { getCmsPage, parseCmsBody } from "@/lib/cms";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Nahda Publications — peer-reviewed journals, editorial workflow, and scholarly publishing.",
};

const PLACEHOLDERS = [
  {
    label: "Editorial excellence",
    hint: "Peer review & production",
    tone: "from-[#1e6847]/90 to-[#0b1f33]",
  },
  {
    label: "Global authors",
    hint: "Researchers worldwide",
    tone: "from-[#0b1f33] to-[#2a7f9e]",
  },
  {
    label: "Open discovery",
    hint: "DOI-backed articles",
    tone: "from-[#d65c33]/90 to-[#1e6847]",
  },
] as const;

export default async function AboutPage() {
  const page = await getCmsPage("about");
  if (!page || !page.isActive) {
    return (
      <div className="page-wrap">
        <h1 className="page-title">About Nahda</h1>
        <p className="mt-4 text-sm text-[var(--muted)]">
          This page is temporarily unavailable.
        </p>
      </div>
    );
  }

  const blocks = parseCmsBody(page.body);
  const gallery = page.images;
  const slots = Math.max(3, gallery.length);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--ink)] text-white">
        <div className="absolute inset-0">
          {page.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={page.heroImageUrl}
              alt=""
              className="h-full w-full object-cover opacity-55"
            />
          ) : (
            <div
              className="h-full w-full bg-[radial-gradient(ellipse_at_top_right,_#1e6847_0%,_transparent_55%),linear-gradient(135deg,#0b1f33_0%,#143d2a_55%,#0b1f33_100%)]"
              aria-hidden
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)] via-[var(--ink)]/55 to-transparent" />
        </div>

        <div className="page-wrap relative py-16 sm:py-20">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-200/90">
            Nahda Publications
          </p>
          <h1 className="mt-3 max-w-3xl font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight sm:text-5xl">
            {page.title}
          </h1>
          {page.subtitle && (
            <p className="mt-4 max-w-2xl text-base text-white/75 sm:text-lg">
              {page.subtitle}
            </p>
          )}
        </div>
      </section>

      <div className="page-wrap py-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <CmsProse blocks={blocks} />

          <aside className="space-y-4">
            <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
              <h2 className="font-semibold text-[var(--ink)]">Get in touch</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Questions about journals, submissions, or payments?
              </p>
              <a
                href="mailto:nahdapublications@gmail.com"
                className="mt-3 inline-block break-all text-sm font-semibold text-[var(--accent)] hover:underline"
              >
                nahdapublications@gmail.com
              </a>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/journals" className="btn-primary text-xs">
                  Browse journals
                </Link>
                <Link href="/help" className="btn-secondary text-xs">
                  Help & FAQ
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--accent-soft)] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                Trust & payments
              </p>
              <p className="mt-2 text-sm text-[var(--ink)]">
                Card payments are processed securely by Paystack. Official
                receipts are issued by Nahda Publications in USD.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                <Link href="/privacy" className="text-[var(--accent)] hover:underline">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-[var(--accent)] hover:underline">
                  Terms & Conditions
                </Link>
              </div>
            </div>
          </aside>
        </div>

        <div className="mt-12">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--ink)]">
            Life at Nahda
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Editorial craft, research communities, and open scholarly discovery.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {Array.from({ length: slots }).map((_, i) => {
              const img = gallery[i];
              const ph = PLACEHOLDERS[i % PLACEHOLDERS.length]!;
              if (img) {
                return (
                  <figure
                    key={img.id}
                    className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.imageUrl}
                      alt={img.alt || img.caption || "Nahda Publications"}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    {(img.caption || img.alt) && (
                      <figcaption className="px-3 py-2 text-xs text-[var(--muted)]">
                        {img.caption || img.alt}
                      </figcaption>
                    )}
                  </figure>
                );
              }
              return (
                <div
                  key={`ph-${i}`}
                  className={`relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br ${ph.tone} p-5 text-white shadow-sm`}
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-30"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at 80% 70%, rgba(214,92,51,0.35), transparent 40%)",
                    }}
                  />
                  <div className="relative flex h-full flex-col justify-end">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                      Image placeholder
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">
                      {ph.label}
                    </p>
                    <p className="mt-1 text-sm text-white/75">{ph.hint}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
