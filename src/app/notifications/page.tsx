"use client";

import { RequireAuth } from "@/components/require-auth";
import { notifications } from "@/data/mock";

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <div className="page-wrap">
        <h1 className="page-title">Notifications</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Workflow alerts and reminders (mock).
        </p>
        <ul className="mt-8 space-y-3">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`card p-5 ${n.unread ? "border-[var(--accent)]/30 bg-[var(--accent-soft)]/40" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--ink)]">{n.title}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{n.body}</p>
                </div>
                <span className="shrink-0 text-xs text-[var(--muted)]">
                  {n.time}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </RequireAuth>
  );
}
