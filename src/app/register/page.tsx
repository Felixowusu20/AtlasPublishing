"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  AUTH_IMAGES,
  AuthSplitLayout,
} from "@/components/auth-split-layout";
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
    <AuthSplitLayout
      imageSrc={AUTH_IMAGES.authorRegister}
      imageAlt="Writer’s desk with notebook and coffee"
      brand="Atlas Academic Publishing"
      headline="Join authors publishing across Atlas journals."
      subhead="Submit manuscripts and track peer review."
    >
      <div className="auth-card">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Create account
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Register as an author
        </h1>

        <form onSubmit={onSubmit} className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <label className="field sm:col-span-2">
            <span>Full name</span>
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Dr. Jane Example"
            />
          </label>
          <label className="field sm:col-span-2">
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
            <p className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700 sm:col-span-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary w-full sm:col-span-2"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-[var(--muted)]">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-[var(--accent)]">
            Sign in
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
