import Image from "next/image";
import Link from "next/link";
import {
  DEFAULT_INDEXED_PLATFORMS,
  DEFAULT_INDEXED_SECTION,
} from "@/lib/home-cms-defaults";

export type IndexedPlatformCard = {
  id?: string;
  name: string;
  blurb: string;
  href: string;
  logoUrl: string;
};

export type IndexedSection = {
  eyebrow?: string | null;
  title: string;
  body?: string | null;
};

type Props = {
  platforms?: IndexedPlatformCard[];
  section?: IndexedSection | null;
};

/**
 * Trust strip: Nahda papers are discoverable on major scholarly networks.
 */
export function HomeIndexedPlatforms({
  platforms: platformsProp,
  section,
}: Props) {
  const platforms =
    platformsProp && platformsProp.length > 0
      ? platformsProp
      : DEFAULT_INDEXED_PLATFORMS.map((p, i) => ({
          id: `default-${i}`,
          name: p.name,
          blurb: p.blurb,
          href: p.href,
          logoUrl: p.logoUrl,
        }));
  const heading = section ?? DEFAULT_INDEXED_SECTION;

  return (
    <section
      className="border-b border-[var(--line)] bg-white"
      aria-label="Where Nahda publications appear"
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
        <div
          className="mx-auto max-w-2xl text-center"
          data-aos="fade-up"
          data-aos-duration="700"
        >
          {heading.eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)] sm:text-xs">
              {heading.eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--ink)] sm:mt-2 sm:text-4xl">
            {heading.title}
          </h2>
          {heading.body ? (
            <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
              {heading.body}
            </p>
          ) : null}
        </div>

        <ul className="mt-6 grid gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-5">
          {platforms.map((platform, index) => (
            <li
              key={platform.id ?? `${platform.name}-${index}`}
              data-aos="fade-up"
              data-aos-delay={String(80 + index * 100)}
              data-aos-duration="750"
            >
              <Link
                href={platform.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-row items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/60 p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-[var(--accent)]/30 hover:bg-white hover:shadow-[0_18px_36px_-20px_rgba(30,104,71,0.35)] sm:flex-col sm:items-center sm:gap-0 sm:rounded-3xl sm:p-7 sm:text-center"
              >
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-sm ring-1 ring-[var(--line)] transition group-hover:scale-[1.02] sm:min-h-[6rem] sm:w-full sm:rounded-2xl sm:px-5 sm:py-5">
                  <Image
                    src={platform.logoUrl}
                    alt={`${platform.name} logo`}
                    width={220}
                    height={120}
                    className="h-10 w-auto max-w-full object-contain sm:h-[4.5rem]"
                    unoptimized
                  />
                </span>
                <div className="min-w-0 flex-1 sm:flex sm:flex-col sm:items-center">
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--ink)] group-hover:text-[var(--accent)] sm:mt-5 sm:text-xl">
                    {platform.name}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--muted)] sm:mt-2 sm:flex-1 sm:text-base">
                    {platform.blurb}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] sm:mt-5 sm:text-base">
                    Visit platform
                    <span aria-hidden>→</span>
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
