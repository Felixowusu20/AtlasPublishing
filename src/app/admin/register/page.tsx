"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";
import { PasswordField } from "@/components/password-field";

export default function AdminRegisterPage() {
  const { register, user, ready } = useAdminAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    institution: "Atlas Publishing House",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/admin");
  }, [ready, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const result = await register({
      name: form.name,
      email: form.email,
      password: form.password,
      institution: form.institution,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Registration failed");
      return;
    }
    router.push("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b1f33] px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Bootstrap
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Create super admin
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Available only when no super admin exists yet. Afterwards, use Reviewers
          to add sub-admins.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
              required
              value={form.institution}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, institution: e.target.value }))
              }
            />
          </label>
          <PasswordField
            label="Password"
            required
            value={form.password}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, password: e.target.value }))
            }
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm password"
            required
            value={form.confirm}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, confirm: e.target.value }))
            }
            autoComplete="new-password"
          />
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating…" : "Create super admin"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          Already have access?{" "}
          <Link href="/admin/login" className="font-semibold text-[var(--accent)]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
