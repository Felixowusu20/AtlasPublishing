"use client";

import { useState } from "react";

type Props = {
  citation: string;
  doiHref: string | null;
};

export function CiteActions({ citation, doiHref }: Props) {
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
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void copyCitation()}
        className="btn-secondary w-full text-center text-sm"
      >
        {copied ? "Copied citation" : "Copy citation"}
      </button>
      {doiHref ? (
        <a
          href={doiHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-xs font-medium text-[var(--accent)] hover:underline"
        >
          Open DOI record →
        </a>
      ) : null}
    </div>
  );
}
