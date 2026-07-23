"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";
import { PasswordField } from "@/components/password-field";

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
          <label className="field">
            <span>Full name</span>
            <input
              required
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, email: e.target.value }))
              }
            />
          </label>
          <label className="field">
            <span>Institution</span>
            <input
              value={form.institution}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, institution: e.target.value }))
              }
            />
          </label>
          <PasswordField
            label="Temporary password"
            required
            value={form.password}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, password: e.target.value }))
            }
            autoComplete="new-password"
          />
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
