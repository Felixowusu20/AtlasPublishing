"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { PasswordField } from "@/components/password-field";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }
    void fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => setTokenValid(Boolean(data.valid)))
      .catch(() => setTokenValid(false));
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not reset password");
        return;
      }
      setMessage(data.message ?? "Password updated.");
      window.setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError("Could not reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="card p-7 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
          Password help
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Reset password
        </h1>

        {tokenValid === null && (
          <p className="mt-4 text-sm text-[var(--muted)]">Checking link…</p>
        )}

        {tokenValid === false && (
          <div className="mt-4 space-y-4">
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              This reset link is invalid or has expired.
            </p>
            <Link
              href="/forgot-password"
              className="btn-primary inline-flex w-full justify-center"
            >
              Request a new link
            </Link>
          </div>
        )}

        {tokenValid && (
          <>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Choose a new password for your author account.
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <PasswordField
                label="New password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <PasswordField
                label="Confirm new password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />

              {error && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </p>
              )}
              {message && (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {message}
                </p>
              )}

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={loading}
              >
                {loading ? "Saving…" : "Update password"}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          <Link href="/login" className="font-semibold text-[var(--accent)]">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
