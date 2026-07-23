"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";
import { initials } from "@/lib/session-client";

const nav = [
  { href: "/admin", label: "Overview", roles: ["SUPER_ADMIN", "REVIEWER"] },
  {
    href: "/admin/submissions",
    label: "Submission inbox",
    roles: ["SUPER_ADMIN", "REVIEWER"],
  },
  { href: "/admin/hero", label: "Hero CMS", roles: ["SUPER_ADMIN"] },
  {
    href: "/admin/articles",
    label: "Latest articles",
    roles: ["SUPER_ADMIN"],
  },
  {
    href: "/admin/announcements",
    label: "Announcements",
    roles: ["SUPER_ADMIN"],
  },
  { href: "/admin/journals", label: "Journals", roles: ["SUPER_ADMIN"] },
  { href: "/admin/reviewers", label: "Reviewers", roles: ["SUPER_ADMIN"] },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, ready, logout } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthPage =
    pathname === "/admin/login" || pathname === "/admin/register";

  useEffect(() => {
    if (!ready || isAuthPage) return;
    if (!user) router.replace("/admin/login");
  }, [ready, user, router, isAuthPage]);

  if (isAuthPage) return <>{children}</>;

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1f33] text-white">
        <p className="text-sm text-white/70">Loading admin…</p>
      </div>
    );
  }

  const links = nav.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-[#f3f6f9] text-[var(--ink)]">
      <aside className="hidden w-64 shrink-0 border-r border-[var(--line)] bg-[#0b1f33] text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-300">
            Atlas Admin
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-lg">
            Control panel
          </p>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {links.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-white/15 font-semibold text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-xs font-semibold">
              {initials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-[11px] text-white/50">
                {user.role === "SUPER_ADMIN" ? "Super admin" : "Reviewer"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout().then(() => router.push("/admin/login"))}
            className="mt-3 w-full rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--line)] bg-white px-4 py-3 lg:px-8">
          <div className="lg:hidden">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
              Atlas Admin
            </p>
          </div>
          <div className="hidden lg:block" aria-hidden />
          <Link href="/" className="text-xs font-semibold text-[var(--accent)]">
            View site →
          </Link>
        </header>
        <div className="flex gap-2 overflow-x-auto border-b border-[var(--line)] bg-white px-3 py-2 lg:hidden">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold"
            >
              {item.label}
            </Link>
          ))}
        </div>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
