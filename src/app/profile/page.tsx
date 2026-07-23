"use client";

import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/components/auth-provider";

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileInner />
    </RequireAuth>
  );
}

function ProfileInner() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="page-wrap">
      <h1 className="page-title">My profile</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Demo profile. Editable fields will sync to the database later.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xl font-semibold text-[var(--accent)]">
            {user.name
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")}
          </div>
          <h2 className="mt-4 text-lg font-semibold">{user.name}</h2>
          <p className="text-sm capitalize text-[var(--muted)]">{user.role}</p>
        </div>

        <div className="card p-6 lg:col-span-2">
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ["Email", user.email],
              ["Institution", user.institution],
              ["ORCID", user.orcid || "Not set"],
              ["Interests", user.researchInterests.join(", ") || "Not set"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wider text-[var(--muted)]">
                  {k}
                </dt>
                <dd className="mt-1 text-sm font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
