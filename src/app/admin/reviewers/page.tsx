"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";

type Reviewer = {
  id: string;
  name: string;
  email: string;
  institution: string;
};

export default function ReviewersPage() {
  const { user } = useAdminAuth();
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    institution: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/reviewers");
    const data = await res.json();
    if (res.ok) setReviewers(data.reviewers);
  }

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") void load();
  }, [user?.role]);

  if (user?.role !== "SUPER_ADMIN") {
    return <p className="text-sm text-[var(--muted)]">Super admin only.</p>;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/reviewers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed");
      return;
    }
    setForm({ name: "", email: "", password: "", institution: "" });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this reviewer?")) return;
    await fetch(`/api/admin/reviewers?id=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Reviewers
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Sub-admins who can review submissions and send feedback to authors.
        </p>
        <div className="mt-6 space-y-3">
          {reviewers.length === 0 && (
            <p className="text-sm text-[var(--muted)]">No reviewers yet.</p>
          )}
          {reviewers.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white px-4 py-3"
            >
              <div>
                <p className="font-semibold">{r.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {r.email}
                  {r.institution ? ` · ${r.institution}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void remove(r.id)}
                className="text-xs font-semibold text-rose-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="h-fit rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm"
      >
        <h2 className="text-sm font-semibold">Create reviewer</h2>
        <div className="mt-4 space-y-3">
          {(
            [
              ["name", "Full name"],
              ["email", "Email"],
              ["institution", "Institution"],
              ["password", "Temporary password"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="field">
              <span>{label}</span>
              <input
                type={key === "password" ? "password" : key === "email" ? "email" : "text"}
                required={key !== "institution"}
                value={form[key]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [key]: e.target.value }))
                }
              />
            </label>
          ))}
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating…" : "Create reviewer"}
          </button>
        </div>
      </form>
    </div>
  );
}
