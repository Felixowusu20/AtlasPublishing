"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { PasswordField } from "@/components/password-field";

export default function RegisterPage() {
  const { register, user, ready } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    institution: "",
    orcid: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  function update(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

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
      orcid: form.orcid,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Registration failed");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="card p-7 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Create account
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Register as an author
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          You will receive a welcome email after registration. Sign-ins also
          trigger an email notification.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="field">
            <span>Full name</span>
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Dr. Jane Example"
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </label>
          <label className="field">
            <span>Institution</span>
            <input
              required
              value={form.institution}
              onChange={(e) => update("institution", e.target.value)}
            />
          </label>
          <label className="field">
            <span>ORCID (optional)</span>
            <input
              value={form.orcid}
              onChange={(e) => update("orcid", e.target.value)}
              placeholder="0000-0000-0000-0000"
            />
          </label>
          <PasswordField
            label="Password"
            required
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm password"
            required
            value={form.confirm}
            onChange={(e) => update("confirm", e.target.value)}
            autoComplete="new-password"
          />

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-[var(--accent)]">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
