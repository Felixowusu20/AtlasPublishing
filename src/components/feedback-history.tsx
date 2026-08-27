"use client";

import { useEffect, useState } from "react";
import {
  ReviewFileDownload,
  hasReviewFile,
  type ReviewFileFields,
} from "@/components/review-file-download";
import { uiStatus } from "@/lib/submission-utils";

export type HistoryFeedback = ReviewFileFields & {
  message: string;
  status: string;
  createdAt: string;
  reviewer: { name: string };
};

function Chevron({ open }: { open: boolean }) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted)] transition-transform ${
        open ? "rotate-180" : ""
      }`}
      aria-hidden
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}

export function FeedbackHistory({
  submissionId,
  items,
  title = "Feedback history",
  hint,
  emptyLabel = "No feedback yet.",
  fromLabel,
}: {
  submissionId: string;
  items: HistoryFeedback[];
  title?: string;
  hint?: string;
  emptyLabel?: string;
  fromLabel?: (item: HistoryFeedback) => string;
}) {
  const [sectionOpen, setSectionOpen] = useState(true);
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(items[0] ? [items[0].id] : []),
  );

  useEffect(() => {
    setOpenIds(new Set(items[0] ? [items[0].id] : []));
  }, [items[0]?.id]);

  const count = items.length;
  const allOpen = count > 0 && items.every((item) => openIds.has(item.id));

  function toggleItem(id: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allOpen) setOpenIds(new Set());
    else setOpenIds(new Set(items.map((item) => item.id)));
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
      <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3 sm:px-5">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left"
          aria-expanded={sectionOpen}
          onClick={() => setSectionOpen((open) => !open)}
        >
          <span>
            <span className="block text-sm font-semibold text-[var(--ink)]">
              {title}
            </span>
            <span className="mt-0.5 block text-xs text-[var(--muted)]">
              {count === 0
                ? "None yet"
                : `${count} ${count === 1 ? "update" : "updates"}`}
            </span>
          </span>
          <Chevron open={sectionOpen} />
        </button>
        {sectionOpen && count > 1 && (
          <button
            type="button"
            className="shrink-0 text-xs font-semibold text-[var(--accent)] hover:underline"
            onClick={toggleAll}
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      {sectionOpen && (
        <div className="space-y-2 p-3 sm:p-4">
          {hint && count > 0 && (
            <p className="px-1 text-xs text-[var(--muted)]">{hint}</p>
          )}
          {count === 0 && (
            <p className="px-1 text-sm text-[var(--muted)]">{emptyLabel}</p>
          )}
          {items.map((item, index) => {
            const open = openIds.has(item.id);
            const who = fromLabel?.(item) ?? item.reviewer.name;
            const status = uiStatus(
              item.status as Parameters<typeof uiStatus>[0],
            );
            const when = new Date(item.createdAt).toLocaleString();
            const attached = hasReviewFile(item);
            return (
              <article
                key={item.id}
                className="rounded-xl border border-[var(--line)] bg-white"
              >
                <button
                  type="button"
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[var(--surface)]/50"
                  aria-expanded={open}
                  onClick={() => toggleItem(item.id)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted)]">
                      <span className="font-medium text-[var(--ink)]">
                        {who}
                      </span>
                      <span>· {status}</span>
                      <span>· {when}</span>
                      {index === 0 && (
                        <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                          Latest
                        </span>
                      )}
                      {attached && (
                        <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-medium">
                          File
                        </span>
                      )}
                    </span>
                    {!open && (
                      <span className="mt-1 line-clamp-1 block text-sm text-[var(--muted)]">
                        {item.message}
                      </span>
                    )}
                  </span>
                  <Chevron open={open} />
                </button>
                {open && (
                  <div className="border-t border-[var(--line)] px-4 py-3">
                    <p className="whitespace-pre-wrap text-sm">{item.message}</p>
                    <ReviewFileDownload
                      submissionId={submissionId}
                      item={item}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
