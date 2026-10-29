import { ManuscriptViewer } from "@/components/manuscript-viewer";

type FileRef = {
  url: string;
  publicId?: string | null;
  fileName?: string | null;
  fileBytes?: number | null;
};

type Props = {
  manuscriptId: string;
  manuscript: FileRef;
  response?: FileRef | null;
  audience?: "author" | "reviewer";
};

function formatSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

function fileHref(file: FileRef, download?: string) {
  const params = new URLSearchParams({ url: file.url });
  if (file.publicId) params.set("publicId", file.publicId);
  if (download) params.set("download", download);
  return `/api/files/view?${params.toString()}`;
}

export function RevisionFiles({
  manuscriptId,
  manuscript,
  response,
  audience = "reviewer",
}: Props) {
  const revised = Boolean(response?.url);
  const responseSize = formatSize(response?.fileBytes);

  if (!revised || !response?.url) {
    return (
      <ManuscriptViewer
        url={manuscript.url}
        publicId={manuscript.publicId}
        title={`${manuscriptId} — manuscript`}
      />
    );
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
          Files for review
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Revised submission
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          {audience === "author"
            ? "Your revised manuscript replaced the file you first submitted. Reviewers can open and download both files."
            : "The revised manuscript replaced the file originally submitted. Open the response file to read how the comments were addressed."}
        </p>
      </div>

      <article className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-100 bg-amber-50 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
              Response to reviewers
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-[var(--ink)]">
              {response.fileName || "Author response"}
            </p>
            <p className="mt-0.5 text-xs text-amber-950/70">
              How the author addressed the comments
              {responseSize ? ` · ${responseSize}` : ""}
            </p>
          </div>
          <a
            href={fileHref(response, response.fileName || "response-to-reviewers")}
            className="shrink-0 rounded-lg bg-amber-800 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-900"
          >
            Download response
          </a>
        </div>
        <ManuscriptViewer
          url={response.url}
          publicId={response.publicId}
          title={response.fileName || "Response to reviewers"}
          className="rounded-none border-0 shadow-none"
        />
      </article>

      <article className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)]/70 px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Revised manuscript
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-[var(--ink)]">
              {manuscript.fileName || manuscriptId}
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Replaces the manuscript that was first submitted
            </p>
          </div>
          <a
            href={fileHref(
              manuscript,
              manuscript.fileName || `${manuscriptId}-revised`,
            )}
            className="btn-primary shrink-0 !px-3 !py-2 text-xs"
          >
            Download manuscript
          </a>
        </div>
        <ManuscriptViewer
          url={manuscript.url}
          publicId={manuscript.publicId}
          title={
            manuscript.fileName
              ? `${manuscript.fileName}`
              : `${manuscriptId} — revised manuscript`
          }
          className="rounded-none border-0 shadow-none"
        />
      </article>
    </section>
  );
}
