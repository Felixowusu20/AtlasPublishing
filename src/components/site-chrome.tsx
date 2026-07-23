import Link from "next/link";
import { currentUser } from "@/data/mock";

const links = [
  { href: "/journals", label: "Journals" },
  { href: "/dashboard", label: "My Dashboard" },
  { href: "/submissions/new", label: "Submit" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--ink)] text-sm font-semibold tracking-tight text-white">
            A
          </span>
          <span className="font-[family-name:var(--font-display)] text-lg tracking-tight text-[var(--ink)]">
            Atlas
            <span className="ml-1.5 hidden text-sm font-normal text-[var(--muted)] sm:inline">
              Academic Publishing
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-[var(--ink)]">{currentUser.name}</p>
            <p className="text-xs text-[var(--muted)]">{currentUser.role}</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
            AO
          </div>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-[var(--ink)] text-slate-300">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-[family-name:var(--font-display)] text-lg text-white">
            Atlas Academic Publishing
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Scholarly submission, peer review, and publishing.
          </p>
        </div>
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} Atlas Publishing House. Mock demo data.
        </p>
      </div>
    </footer>
  );
}
