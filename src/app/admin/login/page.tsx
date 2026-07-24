"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";
import {
  AUTH_IMAGES,
  AuthSplitLayout,
} from "@/components/auth-split-layout";
import { PasswordField } from "@/components/password-field";

export default function AdminLoginPage() {
  const { login, user, ready } = useAdminAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/admin");
  }, [ready, user, router]);

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
    router.push("/admin");
  }

  return (
    <AuthSplitLayout
      imageSrc={AUTH_IMAGES.adminLogin}
      imageAlt="Bright modern editorial office"
      brand="Atlas Admin"
      headline="Editorial control for journals and submissions."
      subhead="Review manuscripts and manage CMS content."
    >
      <div className="auth-card shadow-xl">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Admin access
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Sign in to Atlas Admin
        </h1>
        <form onSubmit={onSubmit} className="mt-4 space-y-2.5">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <PasswordField
            label="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
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
          First setup?{" "}
          <Link href="/admin/register" className="font-semibold text-[var(--accent)]">
            Create super admin
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
