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
    <AuthSplitLayout
      imageSrc={AUTH_IMAGES.adminRegister}
      imageAlt="Focused workspace with laptop"
      brand="Atlas Admin"
      headline="Bootstrap the Atlas publishing control panel."
      subhead="Create the first super admin, then add reviewers."
    >
      <div className="auth-card shadow-xl">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Bootstrap
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Create super admin
        </h1>

        <form onSubmit={onSubmit} className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <label className="field sm:col-span-2">
            <span>Full name</span>
            <input
              required
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </label>
          <label className="field sm:col-span-2">
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
          <label className="field sm:col-span-2">
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
            <p className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700 sm:col-span-2">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn-primary w-full sm:col-span-2"
            disabled={loading}
          >
            {loading ? "Creating…" : "Create super admin"}
          </button>
        </form>
        <p className="mt-3 text-center text-xs text-[var(--muted)]">
          Already have access?{" "}
          <Link href="/admin/login" className="font-semibold text-[var(--accent)]">
            Sign in
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
