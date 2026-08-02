"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  citation: string;
  /** Hosted Nahda DOI path, e.g. /doi/10.58000/... */
  doiHref: string | null;
  doiLabel?: string | null;
};

export function CiteActions({ citation, doiHref, doiLabel }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyCitation() {
    try {
      await navigator.clipboard.writeText(citation);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={() => void copyCitation()}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
          copied
            ? "bg-[var(--accent)] text-white"
            : "border border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface)]"
        }`}
      >
        {copied ? (
          <>
            <CheckIcon />
            Copied
          </>
        ) : (
          <>
            <CopyIcon />
            Copy citation
          </>
        )}
      </button>
      {doiHref ? (
        <Link
          href={doiHref}
          className="group inline-flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-[var(--accent)] hover:underline"
        >
          Open DOI record
          <span aria-hidden className="transition group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      ) : null}
      {doiLabel ? (
        <p className="break-all text-center font-mono text-[10px] text-[var(--muted)]">
          {doiLabel}
        </p>
      ) : null}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
