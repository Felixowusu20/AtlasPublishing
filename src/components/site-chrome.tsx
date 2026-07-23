"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { journals } from "@/data/mock";
import { initials } from "@/lib/auth";

type NavChild = { label: string; href: string; hint?: string };

type NavItem = {
  label: string;
  href: string;
  children: NavChild[];
};

function useNavItems(): NavItem[] {
  return useMemo(
    () => [
      {
        label: "Journals",
        href: "/journals",
        children: [
          {
            label: "Browse all journals",
            href: "/journals",
            hint: "Titles, ISSN, scope",
          },
          ...journals.map((j) => ({
            label: j.title,
            href: `/journals/${j.slug}`,
          })),
        ],
      },
      {
        label: "Articles",
        href: "/articles",
        children: [
          {
            label: "Latest articles",
            href: "/articles",
            hint: "Published & Early View",
          },
          {
            label: "Search articles",
            href: "/search",
            hint: "Title, author, DOI, keyword",
          },
          { label: "Open access", href: "/articles?access=oa" },
        ],
      },
      {
        label: "For Authors",
        href: "/authors/guidelines",
        children: [
          {
            label: "Submit a manuscript",
            href: "/submissions/new",
            hint: "Start a new submission",
          },
          {
            label: "Author dashboard",
            href: "/dashboard",
            hint: "Track manuscripts",
          },
          { label: "Author guidelines", href: "/authors/guidelines" },
          { label: "Article types", href: "/authors/article-types" },
          { label: "Fees & waivers", href: "/authors/fees" },
        ],
      },
      {
        label: "Help",
        href: "/help",
        children: [
          { label: "Help centre & FAQ", href: "/help" },
          { label: "Contact support", href: "/help#contact" },
          { label: "About Atlas", href: "/about" },
        ],
      },
    ],
    [],
  );
}

export function SiteHeader() {
  const nav = useNavItems();
  const { user, ready, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(null);
    setAccountOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (navRef.current && !navRef.current.contains(target)) {
        setOpen(null);
      }
      if (accountRef.current && !accountRef.current.contains(target)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function handleSignOut() {
    logout();
    setAccountOpen(false);
    setMobileOpen(false);
    setOpen(null);
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur">
      <div className="border-b border-[var(--line)] bg-[var(--ink)] text-xs text-slate-300">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1.5 sm:px-6">
          <p className="truncate">
            Atlas Publishing House | Peer reviewed journals | Demo environment
          </p>
          <div className="hidden items-center gap-4 sm:flex">
            <Link href="/search" className="hover:text-white">
              Search
            </Link>
            <Link href="/help" className="hover:text-white">
              Support
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--ink)] text-sm font-semibold text-white">
            A
          </span>
          <span className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--ink)]">
            Atlas
            <span className="ml-1.5 hidden font-[family-name:var(--font-body)] text-sm font-normal text-[var(--muted)] lg:inline">
              Academic Publishing
            </span>
          </span>
        </Link>

        <nav ref={navRef} className="relative hidden items-center gap-0.5 lg:flex">
          {nav.map((item) => {
            const isOpen = open === item.label;
            const active =
              pathname === item.href ||
              item.children.some((c) => pathname === c.href.split("?")[0]);

            return (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => setOpen(item.label)}
                onMouseLeave={() => setOpen(null)}
              >
                <div
                  className={`flex items-center rounded-md transition ${
                    isOpen || active
                      ? "bg-[var(--surface)] text-[var(--ink)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
                  }`}
                >
                  <Link
                    href={item.href}
                    className="px-3 py-2 text-sm font-medium"
                  >
                    {item.label}
                  </Link>
                  <button
                    type="button"
                    className="pr-2.5 pl-0.5 py-2"
                    aria-label={`${item.label} menu`}
                    aria-expanded={isOpen}
                    onClick={(e) => {
                      e.preventDefault();
                      setOpen((prev) =>
                        prev === item.label ? null : item.label,
                      );
                    }}
                  >
                    <Chevron open={isOpen} />
                  </button>
                </div>

                {isOpen && (
                  <div className="absolute left-0 top-full z-50 pt-1">
                    <div className="w-72 rounded-xl border border-[var(--line)] bg-white p-2 shadow-lg">
                      {item.children.map((child) => (
                        <Link
                          key={child.href + child.label}
                          href={child.href}
                          className="block rounded-lg px-3 py-2.5 hover:bg-[var(--surface)]"
                        >
                          <span className="block text-sm font-medium text-[var(--ink)]">
                            {child.label}
                          </span>
                          {child.hint && (
                            <span className="mt-0.5 block text-xs text-[var(--muted)]">
                              {child.hint}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/submissions/new"
            className="hidden rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0c5756] sm:inline-flex"
          >
            Submit
          </Link>

          {!ready ? (
            <div className="h-9 w-20 animate-pulse rounded-lg bg-[var(--surface)]" />
          ) : user ? (
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => {
                  setAccountOpen((v) => !v);
                  setOpen(null);
                }}
                className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white py-1.5 pl-1.5 pr-2.5 text-left hover:bg-[var(--surface)]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent)]">
                  {initials(user.name)}
                </span>
                <span className="hidden sm:block">
                  <span className="block max-w-[120px] truncate text-xs font-medium text-[var(--ink)]">
                    {user.name}
                  </span>
                  <span className="block text-[10px] capitalize text-[var(--muted)]">
                    {user.role}
                  </span>
                </span>
                <Chevron open={accountOpen} />
              </button>
              {accountOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-60 rounded-xl border border-[var(--line)] bg-white p-2 shadow-lg">
                  <div className="border-b border-[var(--line)] px-3 py-2">
                    <p className="truncate text-sm font-medium">{user.name}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {user.email}
                    </p>
                  </div>
                  <Link href="/dashboard" className="menu-link">
                    My dashboard
                  </Link>
                  <Link href="/profile" className="menu-link">
                    My profile
                  </Link>
                  <Link href="/notifications" className="menu-link">
                    Notifications
                  </Link>
                  <button
                    type="button"
                    className="menu-link w-full text-left text-rose-700"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="btn-secondary !px-3 !py-2 text-sm">
                Sign in
              </Link>
              <Link
                href="/register"
                className="hidden btn-primary !px-3 !py-2 text-sm md:inline-flex"
              >
                Register
              </Link>
            </div>
          )}

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] bg-white lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <span className="text-lg">{mobileOpen ? "×" : "☰"}</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[var(--line)] bg-white lg:hidden">
          <div className="mx-auto max-w-6xl space-y-1 px-4 py-3">
            {nav.map((item) => (
              <div key={item.label} className="border-b border-[var(--line)] py-2">
                <Link
                  href={item.href}
                  className="block px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--accent)]"
                >
                  {item.label}
                </Link>
                <div className="mt-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.href + child.label}
                      href={child.href}
                      className="block rounded-lg px-2 py-2 text-sm text-[var(--ink)] hover:bg-[var(--surface)]"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            {user ? (
              <div className="py-2">
                <p className="px-2 text-xs text-[var(--muted)]">{user.email}</p>
                <Link
                  href="/dashboard"
                  className="block rounded-lg px-2 py-2 text-sm text-[var(--ink)] hover:bg-[var(--surface)]"
                >
                  My dashboard
                </Link>
                <button
                  type="button"
                  className="block w-full rounded-lg px-2 py-2 text-left text-sm text-rose-700 hover:bg-[var(--surface)]"
                  onClick={handleSignOut}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex gap-2 py-3">
                <Link href="/login" className="btn-secondary flex-1 text-center">
                  Sign in
                </Link>
                <Link href="/register" className="btn-primary flex-1 text-center">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 text-[var(--muted)] transition ${open ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-[var(--ink)] text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <p className="font-[family-name:var(--font-display)] text-lg text-white">
            Atlas Academic Publishing
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Submission and publishing for researchers worldwide.
          </p>
        </div>
        <FooterCol
          title="Publish"
          links={[
            ["/journals", "Journals"],
            ["/submissions/new", "Submit manuscript"],
            ["/authors/guidelines", "Author guidelines"],
            ["/authors/fees", "Fees & waivers"],
          ]}
        />
        <FooterCol
          title="Discover"
          links={[
            ["/articles", "Articles"],
            ["/search", "Search"],
            ["/authors/article-types", "Article types"],
            ["/about", "About"],
          ]}
        />
        <FooterCol
          title="Account"
          links={[
            ["/login", "Sign in"],
            ["/register", "Register"],
            ["/dashboard", "Dashboard"],
            ["/help", "Help & FAQ"],
          ]}
        />
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500 sm:px-6">
          © {new Date().getFullYear()} Atlas Publishing House. Demo UI with mock
          data.
        </p>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="text-sm text-slate-400 hover:text-white">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
