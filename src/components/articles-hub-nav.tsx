import Link from "next/link";

type HubId = "all" | "oa" | "current" | "past";

const items: { id: HubId; href: string; label: string }[] = [
  { id: "all", href: "/articles", label: "All articles" },
  { id: "oa", href: "/articles?access=oa", label: "Open access" },
  { id: "current", href: "/articles/current-issues", label: "Current issues" },
  { id: "past", href: "/articles/past-issues", label: "Past issues" },
];

export function ArticlesHubNav({ active }: { active: HubId }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const on = item.id === active;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
              on
                ? "bg-[var(--accent)] text-white"
                : "border border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--accent)]/40"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/search"
        className="rounded-lg border border-[var(--line)] bg-white px-3.5 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)]/40"
      >
        Search by NID
      </Link>
    </div>
  );
}
