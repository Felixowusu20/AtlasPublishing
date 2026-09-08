"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";

type NidRecord = {
  id: string;
  slug: string;
  title: string;
  authors: string[];
  doi: string | null;
  nid?: string | null;
  publishedAt: string;
  isActive: boolean;
  journal: { id: string; title: string; shortTitle: string };
  landingPath: string | null;
  landingUrl: string | null;
  articleUrl: string;
  scholarReady: boolean;
};

type Settings = {
  prefix: string;
  label: string;
  publisherName: string;
  notes: string | null;
};

export default function NidRegistryPage() {
  const { user } = useAdminAuth();
  const [settings, setSettings] = useState<Settings>({
    prefix: "nid",
    label: "Nahda Identifier (NID)",
    publisherName: "Nahda Publications",
    notes: "",
  });
  const [records, setRecords] = useState<NidRecord[]>([]);
  const [missingCount, setMissingCount] = useState(0);
  const [assignedCount, setAssignedCount] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "assigned" | "missing">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNid, setEditNid] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const isSuper = user?.role === "SUPER_ADMIN";

  async function load() {
    const res = await fetch("/api/admin/nids");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not load NID registry");
      return;
    }
    setSettings({
      prefix: data.settings.prefix,
      label: data.settings.label,
      publisherName: data.settings.publisherName,
      notes: data.settings.notes ?? "",
    });
    setRecords(data.records ?? []);
    setMissingCount(data.missingCount ?? 0);
    setAssignedCount(data.assignedCount ?? 0);
  }

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN" || user?.role === "REVIEWER") {
      void load();
    }
  }, [user?.role]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      const id = r.nid ?? r.doi;
      if (filter === "assigned" && !id) return false;
      if (filter === "missing" && id) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        (id ?? "").includes(q) ||
        r.journal.shortTitle.toLowerCase().includes(q) ||
        r.authors.join(" ").toLowerCase().includes(q)
      );
    });
  }, [records, query, filter]);

  if (user?.role !== "SUPER_ADMIN" && user?.role !== "REVIEWER") {
    return <p className="text-sm text-[var(--muted)]">Admin only.</p>;
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    if (!isSuper) return;
    setSavingSettings(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/nids", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "settings", ...settings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSuccess("NID settings saved. New publishes will use this prefix.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingSettings(false);
    }
  }

  async function backfill() {
    if (!isSuper) return;
    if (
      !confirm(
        `Assign free NIDs to ${missingCount} article(s) that are missing one?`,
      )
    ) {
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/nids", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "backfill" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSuccess(`Assigned ${data.updated} NID(s).`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(row: NidRecord) {
    setEditingId(row.id);
    setEditNid(row.nid ?? row.doi ?? `${settings.prefix}/`);
    setError("");
    setSuccess("");
  }

  async function saveNid(id: string) {
    if (!isSuper) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/nids", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "article", id, doi: editNid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setSuccess(`Updated NID to ${data.article.nid ?? data.article.doi}`);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl">
          NID registry
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Nahda Identifiers (NIDs) are free IDs Nahda mints for published papers
          — not Crossref DOIs. Pattern{" "}
          <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-xs">
            {settings.prefix}/journal.year.####
          </code>
          . Authors and Google Scholar find papers via article HTML meta tags +
          sitemaps; each NID resolves on this site at{" "}
          <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-xs">
            /nid/…
          </code>
          .
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Assigned
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            {assignedCount}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Missing NID
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            {missingCount}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Scholar-ready
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            {records.filter((r) => r.scholarReady).length}
          </p>
        </div>
      </div>

      {isSuper ? (
        <form
          onSubmit={saveSettings}
          className="grid gap-4 rounded-2xl border border-[var(--line)] bg-white p-5 lg:grid-cols-2"
        >
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-[var(--ink)]">
              House NID settings
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Customize the free NID prefix. These are Nahda Identifiers you
              register and give to authors — not DOI Agency numbers.
            </p>
          </div>
          <label className="field">
            <span>NID prefix</span>
            <input
              required
              value={settings.prefix}
              onChange={(e) =>
                setSettings((p) => ({
                  ...p,
                  prefix: e.target.value.trim().toLowerCase(),
                }))
              }
              placeholder="nid"
            />
          </label>
          <label className="field">
            <span>Label</span>
            <input
              required
              value={settings.label}
              onChange={(e) =>
                setSettings((p) => ({ ...p, label: e.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Publisher name (citations)</span>
            <input
              required
              value={settings.publisherName}
              onChange={(e) =>
                setSettings((p) => ({ ...p, publisherName: e.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Internal notes</span>
            <input
              value={settings.notes ?? ""}
              onChange={(e) =>
                setSettings((p) => ({ ...p, notes: e.target.value }))
              }
              placeholder="Optional"
            />
          </label>
          <div className="flex flex-wrap gap-3 lg:col-span-2">
            <button
              type="submit"
              className="btn-primary"
              disabled={savingSettings}
            >
              {savingSettings ? "Saving…" : "Save settings"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={loading || missingCount === 0}
              onClick={() => void backfill()}
            >
              {loading
                ? "Assigning…"
                : `Assign missing NIDs (${missingCount})`}
            </button>
          </div>
        </form>
      ) : null}

      {(error || success) && (
        <div className="space-y-2">
          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {success}
            </p>
          ) : null}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="field min-w-[220px] flex-1">
          <span>Search registry</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Title, NID, author, journal…"
          />
        </label>
        <div className="flex gap-2 pb-1">
          {(
            [
              ["all", "All"],
              ["assigned", "Assigned"],
              ["missing", "Missing"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                filter === key
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface)] text-[var(--muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-[var(--surface)]/70 text-[11px] uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Article</th>
                <th className="px-4 py-3 font-semibold">NID</th>
                <th className="px-4 py-3 font-semibold">Landing / Scholar</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-[var(--muted)]"
                  >
                    No NID records match.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const id = row.nid ?? row.doi;
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--line)] align-top last:border-0"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--ink)]">
                          {row.title}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {row.journal.shortTitle} ·{" "}
                          {new Date(row.publishedAt).toLocaleDateString()}
                          {!row.isActive ? " · inactive" : ""}
                        </p>
                        <Link
                          href={row.articleUrl}
                          target="_blank"
                          className="mt-1 inline-block text-xs font-semibold text-[var(--accent)]"
                        >
                          Open article →
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {editingId === row.id ? (
                          <input
                            className="w-full min-w-[220px] rounded-lg border border-[var(--line)] px-2 py-1.5 font-mono text-xs"
                            value={editNid}
                            onChange={(e) => setEditNid(e.target.value)}
                          />
                        ) : id ? (
                          <code className="break-all font-mono text-xs text-[var(--accent)]">
                            {id}
                          </code>
                        ) : (
                          <span className="text-xs font-semibold text-amber-700">
                            Not assigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--muted)]">
                        {row.landingUrl ? (
                          <>
                            <a
                              href={row.landingPath ?? "#"}
                              className="break-all font-medium text-[var(--accent)] hover:underline"
                            >
                              {row.landingUrl}
                            </a>
                            <p className="mt-1">
                              {row.scholarReady
                                ? "Article meta + NID landing ready for Scholar crawl"
                                : "Inactive — hidden from Scholar crawl set"}
                            </p>
                          </>
                        ) : (
                          <span>
                            Assign an NID to enable landing + discovery tags
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isSuper ? (
                          editingId === row.id ? (
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                className="text-xs font-semibold text-[var(--accent)]"
                                disabled={loading}
                                onClick={() => void saveNid(row.id)}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="text-xs font-semibold text-[var(--muted)]"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="text-xs font-semibold text-[var(--accent)]"
                              onClick={() => startEdit(row)}
                            >
                              {id ? "Customize" : "Assign"}
                            </button>
                          )
                        ) : (
                          <span className="text-xs text-[var(--muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
