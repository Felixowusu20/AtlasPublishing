"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  variant?: "header" | "mobile" | "bar";
};

export function NavbarSearch({ variant = "header" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isHome = pathname === "/";
  const isSearchPage = pathname === "/search";
  const [q, setQ] = useState(
    isHome || isSearchPage ? (searchParams.get("q") ?? "") : "",
  );
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!isHome && !isSearchPage) return;
    setQ(searchParams.get("q") ?? "");
  }, [isHome, isSearchPage, searchParams]);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  function applyQuery(next: string, replace: boolean) {
    const trimmed = next.trim();
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    params.set("type", "articles");
    const qs = params.toString();
    const href = isHome ? (trimmed ? `/?q=${encodeURIComponent(trimmed)}` : "/") : qs ? `/search?${qs}` : "/search";
    if (replace) router.replace(href, { scroll: false });
    else router.push(href);
  }

  function onQueryChange(value: string) {
    setQ(value);
    if (!isHome && !isSearchPage) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => applyQuery(value, true), 220);
  }

  function runSearch(e?: FormEvent) {
    e?.preventDefault();
    if (timer.current) window.clearTimeout(timer.current);
    applyQuery(q, isHome || isSearchPage);
  }

  const field = (
    <form
      onSubmit={runSearch}
      className={
        variant === "header"
          ? "flex min-w-0 flex-1 items-stretch"
          : "flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[var(--muted)]"
      }
      role="search"
    >
      {variant === "header" ? (
        <>
          <span className="inline-flex h-9 items-center rounded-l-lg border border-r-0 border-[var(--line)] bg-white px-2.5 text-[var(--muted)]">
            <SearchIcon />
          </span>
          <input
            type="search"
            className="h-9 min-w-0 flex-1 border border-[var(--line)] bg-white px-2.5 text-sm outline-none focus:border-[var(--accent)]"
            value={q}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search papers…"
            aria-label="Search papers"
            enterKeyHint="search"
            autoCapitalize="off"
            autoCorrect="off"
          />
          <button
            type="submit"
            className="h-9 shrink-0 rounded-r-lg bg-[var(--accent)] px-4 text-xs font-semibold text-white hover:bg-[#0c5756]"
          >
            Search
          </button>
        </>
      ) : (
        <>
          <SearchIcon />
          <input
            type="search"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
            value={q}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search…"
            aria-label="Search papers"
            enterKeyHint="search"
            autoCapitalize="off"
            autoCorrect="off"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-white"
          >
            Go
          </button>
        </>
      )}
    </form>
  );

  if (variant === "mobile") return field;
  return field;
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" />
    </svg>
  );
}
