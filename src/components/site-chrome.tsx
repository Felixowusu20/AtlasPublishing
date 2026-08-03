"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { AuthorNotifications } from "@/components/author-notifications";
import { BrandLogo } from "@/components/brand-logo";
import { NavbarSearch } from "@/components/navbar-search";
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
          { label: "About Nahda", href: "/about" },
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
  const [mobileSection, setMobileSection] = useState<string | null>("Journals");
  const navRef = useRef<HTMLElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  // Hover menus stay inert until after hydration — a mouse already resting on a
  // nav item can replay onMouseEnter mid-hydration and cause a markup mismatch.
  const hydrated = useRef(false);

  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(null);
    setAccountOpen(false);
    setMobileOpen(false);
  }

  useEffect(() => {
    hydrated.current = true;
  }, []);

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

  if (pathname.startsWith("/admin")) return null;
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/reset-password")
  ) {
    return null;
  }

  function handleSignOut() {
    void logout().then(() => {
      setAccountOpen(false);
      setMobileOpen(false);
      setOpen(null);
      router.replace("/login");
    });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur">
      <div className="overflow-x-clip border-b border-[var(--line)] bg-[var(--ink)] text-xs text-slate-300">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-1.5 sm:px-6">
          <p className="min-w-0 truncate">
            Nahda Publications | Peer reviewed journals
          </p>
          <div className="hidden items-center gap-4 sm:flex">
            <Link href="/search" className="hover:text-white">
              Search articles
            </Link>
            <Link href="/help" className="hover:text-white">
              Support
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto flex h-16 w-full max-w-6xl min-w-0 items-center justify-between gap-3 px-4 sm:px-6">
        <BrandLogo variant="full" priority className="!max-w-[min(200px,52vw)]" />

        <nav ref={navRef} className="relative hidden items-center gap-0.5 lg:flex">
          {nav.map((item) => {
            const isOpen = open === item.label;
            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              item.children.some((c) => {
                const base = c.href.split("?")[0];
                return pathname === base || pathname.startsWith(`${base}/`);
              });

            return (
              <div
                key={item.label}
                className="group relative"
                onMouseEnter={() => {
                  if (hydrated.current) setOpen(item.label);
                }}
                onMouseLeave={() => setOpen(null)}
              >
                <div
                  className={`flex items-center rounded-md transition ${
                    active
                      ? "bg-[var(--surface)] text-[var(--ink)]"
                      : "text-[var(--muted)] group-hover:bg-[var(--surface)] group-hover:text-[var(--ink)]"
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
                      if (!hydrated.current) return;
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
          {!ready ? (
            <div className="h-9 w-20 animate-pulse rounded-lg bg-[var(--surface)]" />
          ) : user ? (
            <>
              <AuthorNotifications />
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
            </>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Link href="/login" className="btn-secondary !px-3 !py-2 text-sm">
                Sign in
              </Link>
              <Link
                href="/register"
                className="btn-primary !px-3 !py-2 text-sm"
              >
                Register
              </Link>
            </div>
          )}

          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition lg:hidden ${
              mobileOpen
                ? "border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--line)] bg-white text-[var(--ink)]"
            }`}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <HamburgerIcon open={mobileOpen} />
          </button>
        </div>
      </div>

      <div className="hidden border-t border-[var(--line)] bg-white md:block">
        <div className="mx-auto max-w-6xl px-3 py-2.5 sm:px-6 sm:py-2">
          <NavbarSearch variant="header" />
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[var(--line)] bg-[var(--surface)]/70 lg:hidden">
          <div className="mx-auto max-w-6xl space-y-3 px-3 py-4 sm:px-6">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Browse
            </p>

            <NavbarSearch variant="mobile" />

            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-sm">
              {nav.map((item, index) => {
                const sectionOpen = mobileSection === item.label;
                return (
                  <div
                    key={item.label}
                    className={
                      index > 0 ? "border-t border-[var(--line)]" : undefined
                    }
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                      aria-expanded={sectionOpen}
                      onClick={() =>
                        setMobileSection((prev) =>
                          prev === item.label ? null : item.label,
                        )
                      }
                    >
                      <span>
                        <span className="block text-sm font-semibold text-[var(--ink)]">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
                          {item.children.length} links
                        </span>
                      </span>
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                          sectionOpen
                            ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                            : "bg-[var(--surface)] text-[var(--muted)]"
                        }`}
                      >
                        <Chevron open={sectionOpen} />
                      </span>
                    </button>

                    {sectionOpen && (
                      <div className="space-y-1 bg-[var(--surface)]/50 px-2 pb-3">
                        <Link
                          href={item.href}
                          className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-[var(--accent)] ring-1 ring-[var(--line)]"
                          onClick={() => setMobileOpen(false)}
                        >
                          View all {item.label.toLowerCase()}
                          <span aria-hidden>→</span>
                        </Link>
                        {item.children.map((child) => (
                          <Link
                            key={child.href + child.label}
                            href={child.href}
                            className="block rounded-xl px-3 py-2.5 transition hover:bg-white"
                            onClick={() => setMobileOpen(false)}
                          >
                            <span className="block text-sm font-medium text-[var(--ink)]">
                              {child.label}
                            </span>
                            {child.hint ? (
                              <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
                                {child.hint}
                              </span>
                            ) : null}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {user ? (
              <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white p-3 shadow-sm">
                <p className="truncate px-1 text-sm font-semibold text-[var(--ink)]">
                  {user.name}
                </p>
                <p className="truncate px-1 text-xs text-[var(--muted)]">
                  {user.email}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    href="/dashboard"
                    className="rounded-xl bg-[var(--surface)] px-3 py-2.5 text-center text-sm font-semibold text-[var(--ink)]"
                    onClick={() => setMobileOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  className="rounded-xl border border-[var(--line)] bg-white px-3 py-3 text-center text-sm font-semibold text-[var(--ink)] shadow-sm"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-[var(--accent)] px-3 py-3 text-center text-sm font-semibold text-white shadow-sm"
                  onClick={() => setMobileOpen(false)}
                >
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

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block h-3.5 w-4" aria-hidden>
      <span
        className={`absolute left-0 block h-0.5 w-4 rounded-full bg-current transition duration-200 ${
          open ? "top-1.5 rotate-45" : "top-0"
        }`}
      />
      <span
        className={`absolute left-0 top-1.5 block h-0.5 w-4 rounded-full bg-current transition duration-200 ${
          open ? "scale-x-0 opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`absolute left-0 block h-0.5 w-4 rounded-full bg-current transition duration-200 ${
          open ? "top-1.5 -rotate-45" : "top-3"
        }`}
      />
    </span>
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
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/reset-password")
  ) {
    return null;
  }

  return (
    <footer className="mt-auto max-w-[100%] overflow-x-clip border-t border-[var(--line)] bg-[var(--ink)] text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-2 sm:gap-8 sm:px-6 sm:py-12 lg:grid-cols-4">
        <div>
          <BrandLogo href="/" variant="onDark" className="h-10 sm:h-11" />
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
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
          © {new Date().getFullYear()} Nahda Publications.
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
