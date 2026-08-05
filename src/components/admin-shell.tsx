"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";
import { AdminNotifications } from "@/components/admin-notifications";
import { NahdaLoader } from "@/components/nahda-loader";
import { initials } from "@/lib/session-client";

type NavIcon =
  | "overview"
  | "inbox"
  | "manuscripts"
  | "publish"
  | "hero"
  | "articles"
  | "news"
  | "journals"
  | "reviewers"
  | "recycle"
  | "cms";

const nav: {
  href: string;
  label: string;
  short: string;
  icon: NavIcon;
  roles: string[];
}[] = [
  {
    href: "/admin",
    label: "Overview",
    short: "Home",
    icon: "overview",
    roles: ["SUPER_ADMIN", "REVIEWER"],
  },
  {
    href: "/admin/submissions",
    label: "Submission inbox",
    short: "Inbox",
    icon: "inbox",
    roles: ["SUPER_ADMIN", "REVIEWER"],
  },
  {
    href: "/admin/manuscripts",
    label: "Full manuscripts",
    short: "Manuscripts",
    icon: "manuscripts",
    roles: ["SUPER_ADMIN", "REVIEWER"],
  },
  {
    href: "/admin/publishedArticles",
    label: "Publish papers",
    short: "Publish",
    icon: "publish",
    roles: ["SUPER_ADMIN", "REVIEWER"],
  },
  {
    href: "/admin/hero",
    label: "Hero CMS",
    short: "Hero",
    icon: "hero",
    roles: ["SUPER_ADMIN"],
  },
  {
    href: "/admin/cms",
    label: "Site pages CMS",
    short: "Pages",
    icon: "cms",
    roles: ["SUPER_ADMIN"],
  },
  {
    href: "/admin/articles",
    label: "Latest articles",
    short: "Articles",
    icon: "articles",
    roles: ["SUPER_ADMIN", "REVIEWER"],
  },
  {
    href: "/admin/announcements",
    label: "Announcements",
    short: "News",
    icon: "news",
    roles: ["SUPER_ADMIN"],
  },
  {
    href: "/admin/journals",
    label: "Journals",
    short: "Journals",
    icon: "journals",
    roles: ["SUPER_ADMIN"],
  },
  {
    href: "/admin/reviewers",
    label: "Reviewers",
    short: "Reviewers",
    icon: "reviewers",
    roles: ["SUPER_ADMIN"],
  },
  {
    href: "/admin/recycle-bin",
    label: "Recycle bin",
    short: "Bin",
    icon: "recycle",
    roles: ["SUPER_ADMIN", "REVIEWER"],
  },
];

const SIDEBAR_KEY = "atlas-admin-sidebar-collapsed";

function NavGlyph({
  name,
  className = "h-4 w-4",
}: {
  name: NavIcon;
  className?: string;
}) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "overview":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "inbox":
      return (
        <svg {...common}>
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
      );
    case "manuscripts":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="13" y2="17" />
        </svg>
      );
    case "publish":
      return (
        <svg {...common}>
          <path d="M12 19V5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      );
    case "hero":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      );
    case "articles":
      return (
        <svg {...common}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      );
    case "news":
      return (
        <svg {...common}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case "journals":
      return (
        <svg {...common}>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          <line x1="8" y1="7" x2="16" y2="7" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      );
    case "reviewers":
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "cms":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="12" y2="17" />
          <circle cx="17" cy="17" r="3" />
        </svg>
      );
    case "recycle":
      return (
        <svg {...common}>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      );
  }
}

function CollapseGlyph({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {collapsed ? (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16" />
          <polyline points="14 9 17 12 14 15" />
        </>
      ) : (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M9 4v16" />
          <polyline points="15 9 12 12 15 15" />
        </>
      )}
    </svg>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, ready, logout } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isAuthPage =
    pathname === "/admin/login" || pathname === "/admin/register";

  useEffect(() => {
    if (!ready || isAuthPage) return;
    if (!user) router.replace("/admin/login");
  }, [ready, user, router, isAuthPage]);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  if (isAuthPage) return <>{children}</>;

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b1f33] text-white">
        <NahdaLoader variant="dark" label="Loading admin…" />
      </div>
    );
  }

  const links = nav.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-[#f3f6f9] text-[var(--ink)]">
      <aside
        className={`hidden shrink-0 border-r border-[var(--line)] bg-[#0b1f33] text-white transition-[width] duration-200 lg:flex lg:flex-col ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        <div
          className={`border-b border-white/10 ${collapsed ? "px-3 py-4" : "px-5 py-5"}`}
        >
          {collapsed ? (
            <Image
              src="/favicon.png"
              alt="Nahda"
              width={32}
              height={32}
              className="mx-auto h-8 w-8 rounded-md"
            />
          ) : (
            <div className="flex items-center gap-2.5">
              <Image
                src="/favicon.png"
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-md"
              />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Nahda Admin
                </p>
                <p className="font-[family-name:var(--font-display)] text-lg leading-tight">
                  Control panel
                </p>
              </div>
            </div>
          )}
        </div>

        <nav className={`flex-1 space-y-0.5 ${collapsed ? "p-2" : "p-3"}`}>
          {links.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className={`flex items-center rounded-lg text-sm transition ${
                  collapsed
                    ? "justify-center px-2 py-2.5"
                    : "gap-3 px-3 py-2.5"
                } ${
                  active
                    ? "bg-white/15 font-semibold text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <NavGlyph name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`border-t border-white/10 ${collapsed ? "p-2" : "p-4"}`}>
          <button
            type="button"
            onClick={toggleSidebar}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="mb-3 flex w-full items-center justify-center rounded-lg border border-white/15 px-2 py-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <CollapseGlyph collapsed={collapsed} />
          </button>

          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-xs font-semibold"
                title={user.name}
              >
                {initials(user.name)}
              </div>
              <button
                type="button"
                title="Sign out"
                aria-label="Sign out"
                onClick={() => void logout().then(() => router.push("/admin/login"))}
                className="rounded-lg border border-white/15 px-2 py-1.5 text-[10px] font-semibold text-white/80 hover:bg-white/10"
              >
                Out
              </button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-white px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden items-center rounded-lg border border-[var(--line)] p-2 text-[var(--ink)] hover:bg-[var(--surface)] lg:inline-flex"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <CollapseGlyph collapsed={collapsed} />
            </button>
            <div className="lg:hidden">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">
                Nahda Admin
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <AdminNotifications />
            <Link href="/" className="text-xs font-semibold text-[var(--accent)]">
              View site →
            </Link>
          </div>
        </header>
        <div className="flex gap-2 overflow-x-auto border-b border-[var(--line)] bg-white px-3 py-2 lg:hidden">
          {links.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                  active
                    ? "bg-[#0b1f33] text-white"
                    : "bg-[var(--surface)] text-[var(--ink)]"
                }`}
              >
                <NavGlyph name={item.icon} className="h-3.5 w-3.5" />
                {item.short}
              </Link>
            );
          })}
        </div>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
