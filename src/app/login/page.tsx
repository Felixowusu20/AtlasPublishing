"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import {
  AUTH_IMAGES,
  AuthSplitLayout,
} from "@/components/auth-split-layout";
import { PasswordField } from "@/components/password-field";

function LoginForm() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, router, next]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await login(email, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Login failed");
      return;
    }
    router.push(next);
  }

  return (
    <AuthSplitLayout
      imageSrc={AUTH_IMAGES.authorLogin}
      imageAlt="Sunlit university library reading room"
      brand="Atlas Academic Publishing"
      headline="Manuscripts tracked from submission to publication."
      subhead="Manage revisions, feedback, and editorial progress."
    >
      <div className="auth-card">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Sign in
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Welcome back
        </h1>

        <form onSubmit={onSubmit} className="mt-4 space-y-2.5">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <PasswordField
            label="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-[var(--muted)]">
          New author?{" "}
          <Link href="/register" className="font-semibold text-[var(--accent)]">
            Create an account
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="grid h-dvh place-items-center text-sm">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
