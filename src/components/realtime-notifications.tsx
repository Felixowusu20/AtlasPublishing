"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  unread: boolean;
  createdAt: string;
  submissionId?: string | null;
  submission?: {
    id?: string;
    manuscriptId?: string;
    title?: string;
    status?: string;
    publishedArticle?: {
      slug?: string;
      manuscriptUrl?: string | null;
    } | null;
  } | null;
};

type Props = {
  apiPath: string;
  storageKey: string;
  tagPrefix: string;
  hrefFor: (n: AppNotification) => string;
  enableLabel?: string;
  allLink?: string;
};

const POLL_MS = 20_000;

function loadSeenIds(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveSeenIds(key: string, ids: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify([...ids].slice(-200)));
  } catch {
    /* ignore */
  }
}

function playNotifySound() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const tone = (freq: number, start: number, dur: number, gain = 0.08) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(gain, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    };
    tone(880, now, 0.14, 0.07);
    tone(1175, now + 0.12, 0.18, 0.06);
    void ctx.resume();
    window.setTimeout(() => void ctx.close(), 600);
  } catch {
    /* ignore */
  }
}

function canUseDesktopNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

function showDesktopNotification(
  n: AppNotification,
  href: string,
  tagPrefix: string,
) {
  if (!canUseDesktopNotifications()) return;
  if (Notification.permission !== "granted") return;
  try {
    const note = new Notification(n.title, {
      body: n.body,
      icon: "/favicon.png",
      badge: "/favicon.png",
      tag: `${tagPrefix}-${n.id}`,
      data: { url: href },
    });
    note.onclick = () => {
      window.focus();
      window.location.href = href;
      note.close();
    };
  } catch {
    /* ignore */
  }
}

export function RealtimeNotifications({
  apiPath,
  storageKey,
  tagPrefix,
  hrefFor,
  enableLabel = "Enable alerts",
  allLink,
}: Props) {
  const seenKey = `${storageKey}-seen-ids`;
  const dismissKey = `${storageKey}-perm-dismissed`;

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [showPermBanner, setShowPermBanner] = useState(false);
  const [busy, setBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const primedRef = useRef(false);

  const refresh = useCallback(
    async (alertOnNew: boolean) => {
      try {
        const res = await fetch(apiPath);
        const data = await res.json();
        if (!res.ok) return;

        const list = (data.notifications ?? []) as AppNotification[];
        setItems(list);
        const count =
          typeof data.unreadCount === "number"
            ? data.unreadCount
            : list.filter((n) => n.unread).length;
        setUnreadCount(count);

        const seen = loadSeenIds(seenKey);
        if (!alertOnNew || !primedRef.current) {
          for (const n of list) seen.add(n.id);
          saveSeenIds(seenKey, seen);
          primedRef.current = true;
          return;
        }

        const fresh = list.filter((n) => n.unread && !seen.has(n.id));
        if (fresh.length === 0) return;

        playNotifySound();
        showDesktopNotification(fresh[0], hrefFor(fresh[0]), tagPrefix);
        for (const n of fresh) seen.add(n.id);
        saveSeenIds(seenKey, seen);
      } catch {
        /* ignore */
      }
    },
    [apiPath, hrefFor, seenKey, tagPrefix],
  );

  useEffect(() => {
    if (!canUseDesktopNotifications()) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    try {
      if (
        Notification.permission === "default" &&
        localStorage.getItem(dismissKey) !== "1"
      ) {
        setShowPermBanner(true);
      }
    } catch {
      setShowPermBanner(true);
    }
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/admin-sw.js").catch(() => {});
    }
  }, [dismissKey]);

  useEffect(() => {
    void refresh(false);
    const id = window.setInterval(() => void refresh(true), POLL_MS);
    const onFocus = () => void refresh(true);
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function enableDesktopAlerts() {
    if (!canUseDesktopNotifications()) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPermBanner(false);
      if (result === "granted") {
        new Notification("Nahda alerts enabled", {
          body: "You’ll get a desktop or mobile alert when something new happens.",
          icon: "/favicon.png",
        });
        playNotifySound();
      }
    } catch {
      /* ignore */
    }
  }

  function dismissPermBanner() {
    setShowPermBanner(false);
    try {
      localStorage.setItem(dismissKey, "1");
    } catch {
      /* ignore */
    }
  }

  async function markAllRead() {
    setBusy(true);
    try {
      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setUnreadCount(
          typeof data.unreadCount === "number" ? data.unreadCount : 0,
        );
        setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
      }
    } finally {
      setBusy(false);
    }
  }

  async function openItem(n: AppNotification) {
    if (n.unread) {
      void fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      }).then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setUnreadCount(
          typeof data.unreadCount === "number"
            ? data.unreadCount
            : Math.max(0, unreadCount - 1),
        );
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)),
        );
      });
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={panelRef}>
      {showPermBanner && permission === "default" && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-[var(--line)] bg-white p-3 shadow-lg">
          <p className="text-xs font-semibold text-[var(--ink)]">
            Enable desktop &amp; mobile alerts
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
            Allow notifications so updates appear in your system notification
            panel — like email or messaging apps.
          </p>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => void enableDesktopAlerts()}
              className="rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[11px] font-semibold text-white"
            >
              Allow alerts
            </button>
            <button
              type="button"
              onClick={dismissPermBanner}
              className="rounded-lg border border-[var(--line)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--muted)]"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setShowPermBanner(false);
        }}
        className="relative inline-flex items-center justify-center rounded-lg border border-[var(--line)] bg-white p-2 text-[var(--ink)] hover:bg-[var(--surface)]"
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={open}
      >
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
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-2.5">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">
                Notifications
              </p>
              <p className="text-[10px] text-[var(--muted)]">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : "You're all caught up"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {permission !== "granted" && permission !== "unsupported" && (
                <button
                  type="button"
                  onClick={() => void enableDesktopAlerts()}
                  className="text-[10px] font-semibold text-[var(--accent)]"
                >
                  {enableLabel}
                </button>
              )}
              <button
                type="button"
                disabled={busy || unreadCount === 0}
                onClick={() => void markAllRead()}
                className="text-[10px] font-semibold text-[var(--muted)] hover:text-[var(--ink)] disabled:opacity-40"
              >
                Mark all read
              </button>
            </div>
          </div>

          <ul className="max-h-[min(24rem,60vh)] overflow-y-auto">
            {items.length === 0 && (
              <li className="px-3 py-8 text-center text-xs text-[var(--muted)]">
                No notifications yet.
              </li>
            )}
            {items.map((n) => (
              <li
                key={n.id}
                className="border-b border-[var(--line)] last:border-0"
              >
                <Link
                  href={hrefFor(n)}
                  onClick={() => void openItem(n)}
                  className={`block px-3 py-3 transition hover:bg-[var(--surface)] ${
                    n.unread ? "bg-emerald-50/40" : ""
                  }`}
                >
                  <div className="flex gap-2">
                    {n.unread ? (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
                    ) : (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-transparent" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--ink)]">
                        {n.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted)]">
                        {n.body}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--muted)]">
                        {new Date(n.createdAt).toLocaleString()}
                        {n.submission?.manuscriptId
                          ? ` · ${n.submission.manuscriptId}`
                          : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {allLink && (
            <div className="border-t border-[var(--line)] px-3 py-2">
              <Link
                href={allLink}
                onClick={() => setOpen(false)}
                className="text-[11px] font-semibold text-[var(--accent)]"
              >
                View all notifications →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
