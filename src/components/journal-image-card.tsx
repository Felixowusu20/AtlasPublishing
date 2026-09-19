import Link from "next/link";
import { journalCardColor } from "@/lib/journal-colors";

export type JournalImageCardData = {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  openAccess: boolean;
  coverImageUrl?: string | null;
  coverColor?: string | null;
  subjects?: string[];
};

type Props = {
  journal: JournalImageCardData;
  index?: number;
  /** Visual variant for light or dark page backgrounds */
  tone?: "light" | "dark";
  aosDelay?: number;
};

/**
 * Full-bleed cover-style journal card — image first, minimal text.
 */
export function JournalImageCard({
  journal,
  index = 0,
  tone = "light",
  aosDelay = 0,
}: Props) {
  const color = journalCardColor(journal.coverColor ?? "", index);
  const dark = tone === "dark";

  return (
    <Link
      href={`/journals/${journal.slug}`}
      className={`group relative flex aspect-[3/4] flex-col overflow-hidden rounded-xl shadow-sm ring-1 transition hover:-translate-y-1 hover:shadow-lg sm:rounded-2xl ${
        dark
          ? "ring-white/15 hover:ring-emerald-200/40"
          : "bg-white ring-[var(--line)] hover:ring-[var(--accent)]/35"
      }`}
      data-aos="fade-up"
      data-aos-delay={aosDelay || undefined}
      data-aos-duration="750"
      aria-label={journal.title}
    >
      <div
        className="absolute inset-0"
        style={
          journal.coverImageUrl
            ? { background: "#f3f5f8" }
            : { background: color }
        }
      >
        {journal.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={journal.coverImageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-start justify-between p-3 sm:p-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75 sm:text-xs">
              Nahda
            </span>
            <span className="rounded bg-black/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white sm:px-2 sm:text-[10px]">
              {journal.shortTitle}
            </span>
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-3 pt-14 sm:p-4 sm:pt-20">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-200 sm:text-[11px]">
          {journal.openAccess ? "Open access" : "Subscription"}
        </p>
        <h3 className="mt-0.5 line-clamp-3 font-[family-name:var(--font-display)] text-sm font-semibold leading-snug text-white sm:mt-1 sm:text-lg">
          {journal.title}
        </h3>
        {journal.subjects && journal.subjects.length > 0 ? (
          <p className="mt-0.5 hidden line-clamp-1 text-xs text-white/70 sm:mt-1 sm:block">
            {journal.subjects.slice(0, 3).join(" · ")}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
