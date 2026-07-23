"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { journals, publishedArticles } from "@/data/mock";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const arts = publishedArticles.filter((a) => {
      if (!query) return true;
      const hay = [
        a.title,
        a.abstract,
        a.doi,
        a.authors.join(" "),
        a.journalTitle,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
    const jrns = journals.filter((j) => {
      if (!query) return true;
      return (
        j.title.toLowerCase().includes(query) ||
        j.subjects.join(" ").toLowerCase().includes(query)
      );
    });
    if (type === "articles") return { articles: arts, journals: [] };
    if (type === "journals") return { articles: [], journals: jrns };
    return { articles: arts, journals: jrns };
  }, [q, type]);

  return (
    <div className="page-wrap">
      <h1 className="page-title">Search</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Find articles, authors, DOIs, keywords, and journals.
      </p>

      <div className="mt-6 card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="flex-1 rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            placeholder="Search title, author, DOI, keyword…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="all">All</option>
            <option value="articles">Articles</option>
            <option value="journals">Journals</option>
          </select>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {results.journals.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
              Journals ({results.journals.length})
            </h2>
            <ul className="mt-3 space-y-2">
              {results.journals.map((j) => (
                <li key={j.id} className="card px-4 py-3">
                  <Link
                    href={`/journals/${j.slug}`}
                    className="font-medium text-[var(--ink)] hover:text-[var(--accent)]"
                  >
                    {j.title}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">
                    {j.subjects.join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {results.articles.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
              Articles ({results.articles.length})
            </h2>
            <ul className="mt-3 space-y-2">
              {results.articles.map((a) => (
                <li key={a.id} className="card px-4 py-3">
                  <Link
                    href={`/articles/${a.slug}`}
                    className="font-medium text-[var(--ink)] hover:text-[var(--accent)]"
                  >
                    {a.title}
                  </Link>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {a.authors.join(", ")}, {a.doi}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {q &&
          results.articles.length === 0 &&
          results.journals.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              No results for “{q}”. Try another keyword.
            </p>
          )}
      </div>
    </div>
  );
}
