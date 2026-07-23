"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/require-auth";

type Notification = {
  id: string;
  title: string;
  body: string;
  unread: boolean;
  createdAt: string;
  submissionId?: string | null;
};

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationsInner />
    </RequireAuth>
  );
}

function NotificationsInner() {
  const [items, setItems] = useState<Notification[]>([]);

  async function load() {
    const res = await fetch("/api/notifications");
    const data = await res.json();
    if (res.ok) setItems(data.notifications ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function markAll() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAll: true }),
    });
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Review updates also arrive by email.
          </p>
        </div>
        <button type="button" className="btn-secondary text-xs" onClick={() => void markAll()}>
          Mark all read
        </button>
      </div>
      <ul className="mt-8 space-y-3">
        {items.length === 0 && (
          <li className="card p-6 text-sm text-[var(--muted)]">No notifications yet.</li>
        )}
        {items.map((n) => (
          <li key={n.id} className="card p-4">
            <div className="flex items-start gap-2">
              {n.unread && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
              )}
              <div>
                <p className="text-sm font-semibold">{n.title}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{n.body}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
                {n.submissionId && (
                  <Link
                    href={`/submissions/${n.submissionId}`}
                    className="mt-2 inline-flex text-xs font-semibold text-[var(--accent)]"
                  >
                    Open manuscript →
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
