"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  SearchSuggestionList,
  suggestionKeydown,
} from "@/components/search-suggest";
import {
  applySuggestion,
  suggestMatches,
  wordsFromText,
  type SearchSuggestion,
} from "@/lib/page-search";

type Props = {
  variant?: "header" | "mobile" | "bar";
};

function collectPageIndex() {
  const root = document.querySelector("main") ?? document.body;
  const text = root.textContent ?? "";
  const phrases = [
    ...root.querySelectorAll("h1, h2, h3, a, [data-search-phrase]"),
  ]
    .map((el) => (el.textContent ?? "").replace(/\s+/g, " ").trim())
    .filter((value) => value.length >= 3 && value.length <= 120);
  return {
    words: wordsFromText(text),
    phrases: [...new Set(phrases)],
  };
}

export function NavbarSearch({ variant = "header" }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isHome = pathname === "/";
  const isSearchPage = pathname === "/search";
  const [q, setQ] = useState(
    isHome || isSearchPage ? (searchParams.get("q") ?? "") : "",
  );
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pageWords, setPageWords] = useState<string[]>([]);
  const [pagePhrases, setPagePhrases] = useState<string[]>([]);
  const timer = useRef<number | null>(null);
  const listId = variant === "header" ? "nav-search-suggest" : `nav-search-suggest-${variant}`;

  useEffect(() => {
    if (!isHome && !isSearchPage) return;
    setQ(searchParams.get("q") ?? "");
  }, [isHome, isSearchPage, searchParams]);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (!isHome) {
      setPageWords([]);
      setPagePhrases([]);
      return;
    }
    const scan = () => {
      const index = collectPageIndex();
      setPageWords(index.words);
      setPagePhrases(index.phrases);
    };
    scan();
    const later = window.setTimeout(scan, 900);
    return () => window.clearTimeout(later);
  }, [isHome, searchParams]);

  const suggestions = useMemo(
    () => (isHome ? suggestMatches(q, pageWords, pagePhrases) : []),
    [isHome, q, pageWords, pagePhrases],
  );

  function applyQuery(next: string, replace: boolean) {
    const trimmed = next.trim();
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    params.set("type", "articles");
    const qs = params.toString();
    const href = isHome
      ? trimmed
        ? `/?q=${encodeURIComponent(trimmed)}`
        : "/"
      : qs
        ? `/search?${qs}`
        : "/search";
    if (replace) router.replace(href, { scroll: false });
    else router.push(href, { scroll: false });
  }

  function onQueryChange(value: string) {
    setQ(value);
    setOpen(true);
    setActiveIndex(-1);
    if (!isHome && !isSearchPage) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => applyQuery(value, true), 220);
  }

  function pickSuggestion(item: SearchSuggestion) {
    const next = applySuggestion(q, item);
    setQ(next);
    setOpen(false);
    setActiveIndex(-1);
    if (timer.current) window.clearTimeout(timer.current);
    applyQuery(next, true);
  }

  function runSearch(e?: FormEvent) {
    e?.preventDefault();
    if (timer.current) window.clearTimeout(timer.current);
    setOpen(false);
    applyQuery(q, isHome || isSearchPage);
    if (isHome) {
      requestAnimationFrame(() => {
        document
          .getElementById("home-results")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  const suggestOpen = open && suggestions.length > 0;

  const field = (
    <form
      onSubmit={runSearch}
      className={
        variant === "header"
          ? "relative flex min-w-0 flex-1 items-stretch"
          : "relative flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[var(--muted)]"
      }
      role="search"
    >
      {variant === "header" ? (
        <>
          <span className="inline-flex h-9 items-center rounded-l-lg border border-r-0 border-[var(--line)] bg-white px-2.5 text-[var(--muted)]">
            <SearchIcon />
          </span>
          <div className="relative min-w-0 flex-1">
            <input
              type="search"
              className="h-9 min-w-0 w-full border border-[var(--line)] bg-white px-2.5 text-sm outline-none focus:border-[var(--accent)]"
              value={q}
              onChange={(e) => onQueryChange(e.target.value)}
              onFocus={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 120)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setOpen(false);
                  setActiveIndex(-1);
                  return;
                }
                suggestionKeydown(
                  event,
                  suggestions,
                  activeIndex,
                  setActiveIndex,
                  pickSuggestion,
                );
              }}
              placeholder={isHome ? "Search this page…" : "Search papers…"}
              aria-label={isHome ? "Search this page" : "Search papers"}
              aria-autocomplete="list"
              aria-controls={listId}
              aria-expanded={suggestOpen}
              enterKeyHint="search"
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
            />
            {suggestOpen ? (
              <SearchSuggestionList
                id={listId}
                items={suggestions}
                activeIndex={activeIndex}
                onPick={pickSuggestion}
                onHover={setActiveIndex}
              />
            ) : null}
          </div>
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
          <div className="relative min-w-0 flex-1">
            <input
              type="search"
              className="min-w-0 w-full bg-transparent text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
              value={q}
              onChange={(e) => onQueryChange(e.target.value)}
              onFocus={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 120)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setOpen(false);
                  setActiveIndex(-1);
                  return;
                }
                suggestionKeydown(
                  event,
                  suggestions,
                  activeIndex,
                  setActiveIndex,
                  pickSuggestion,
                );
              }}
              placeholder="Search…"
              aria-label={isHome ? "Search this page" : "Search papers"}
              aria-autocomplete="list"
              aria-controls={listId}
              aria-expanded={suggestOpen}
              enterKeyHint="search"
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
            />
            {suggestOpen ? (
              <SearchSuggestionList
                id={listId}
                items={suggestions}
                activeIndex={activeIndex}
                onPick={pickSuggestion}
                onHover={setActiveIndex}
              />
            ) : null}
          </div>
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
