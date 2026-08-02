"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function cleanDoi(input: string) {
  return input
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .toLowerCase();
}

type JournalOption = {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
};

type Props = {
  variant?: "header" | "mobile";
};

export function NavbarSearch({ variant = "header" }: Props) {
  const router = useRouter();
  const [journals, setJournals] = useState<JournalOption[]>([]);
  const [journal, setJournal] = useState("");
  const [q, setQ] = useState("");
  const [doi, setDoi] = useState("");
  const [mobileTab, setMobileTab] = useState<"search" | "doi">("search");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/cms/journals");
        const data = await res.json();
        if (cancelled) return;
        const list = ((data.journals ?? []) as JournalOption[]).map((j) => ({
          id: j.id,
          slug: j.slug,
          title: j.title,
          shortTitle: j.shortTitle,
        }));
        setJournals(list);
      } catch {
        if (!cancelled) setJournals([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function runSearch(e?: FormEvent) {
    e?.preventDefault();
    const query = q.trim();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (journal) params.set("journal", journal);
    params.set("type", "articles");
    const qs = params.toString();
    router.push(qs ? `/search?${qs}` : "/search");
  }

  function runDoi(e?: FormEvent) {
    e?.preventDefault();
    const raw = doi.trim();
    if (!raw) return;
    const cleaned = cleanDoi(raw);
    if (!cleaned) return;
    router.push(`/doi/${cleaned}`);
  }

  const journalOptions = (
    <>
      <option value="">All journals</option>
      {journals.map((j) => (
        <option key={j.id} value={j.slug}>
          {j.shortTitle || j.title}
        </option>
      ))}
    </>
  );

  /** Mobile / narrow: tabbed stacked card */
  const mobilePanel = (
    <div className="w-full">
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]/80 shadow-sm">
        <div className="grid grid-cols-2 gap-1 p-1">
          <button
            type="button"
            onClick={() => setMobileTab("search")}
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
              mobileTab === "search"
                ? "bg-white text-[var(--ink)] shadow-sm"
                : "text-[var(--muted)]"
            }`}
          >
            Search papers
          </button>
          <button
            type="button"
            onClick={() => setMobileTab("doi")}
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
              mobileTab === "doi"
                ? "bg-white text-[var(--ink)] shadow-sm"
                : "text-[var(--muted)]"
            }`}
          >
            Open DOI
          </button>
        </div>

        {mobileTab === "search" ? (
          <form onSubmit={runSearch} className="space-y-2.5 bg-white p-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Journal
              </span>
              <select
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                value={journal}
                onChange={(e) => setJournal(e.target.value)}
                aria-label="Filter by journal"
              >
                {journalOptions}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Keywords
              </span>
              <input
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Title, author, or keyword"
                aria-label="Search articles"
                enterKeyHint="search"
              />
            </label>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-white"
            >
              <SearchIcon />
              Search articles
            </button>
          </form>
        ) : (
          <form onSubmit={runDoi} className="space-y-2.5 bg-white p-3">
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Digital Object Identifier
              </span>
              <input
                className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                placeholder="10.58000/…"
                aria-label="Resolve DOI"
                enterKeyHint="go"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
            <p className="text-[11px] leading-relaxed text-[var(--muted)]">
              Paste a Nahda DOI to open the article page directly.
            </p>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ink)] px-3 py-2.5 text-sm font-semibold text-white"
            >
              Open article
            </button>
          </form>
        )}
      </div>
    </div>
  );

  if (variant === "mobile") {
    return mobilePanel;
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <form
        onSubmit={runSearch}
        className="flex min-w-0 flex-1 items-stretch"
        role="search"
      >
        <select
          className="h-9 max-w-[12rem] shrink-0 rounded-l-lg border border-[var(--line)] bg-[var(--surface)] px-2 text-[11px] font-semibold text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          value={journal}
          onChange={(e) => setJournal(e.target.value)}
          aria-label="Filter by journal"
          title="Choose a journal"
        >
          {journalOptions}
        </select>
        <input
          className="h-9 min-w-0 flex-1 border border-l-0 border-[var(--line)] bg-white px-2.5 text-sm outline-none focus:border-[var(--accent)]"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, author, keyword…"
          aria-label="Search articles"
        />
        <button
          type="submit"
          className="h-9 shrink-0 rounded-r-lg bg-[var(--accent)] px-4 text-xs font-semibold text-white hover:bg-[#0c5756]"
        >
          Search
        </button>
      </form>

      <form onSubmit={runDoi} className="flex shrink-0 items-stretch">
        <input
          className="h-9 w-[13rem] rounded-l-lg border border-[var(--line)] bg-white px-2.5 text-xs outline-none focus:border-[var(--accent)]"
          value={doi}
          onChange={(e) => setDoi(e.target.value)}
          placeholder="Paste DOI to open article"
          aria-label="Resolve DOI"
          title="Paste a DOI to open the article"
        />
        <button
          type="submit"
          className="h-9 shrink-0 rounded-r-lg border border-l-0 border-[var(--line)] bg-[var(--ink)] px-3 text-xs font-semibold text-white hover:bg-[#16324a]"
        >
          DOI
        </button>
      </form>
    </div>
  );
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
