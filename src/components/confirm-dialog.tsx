"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export type ConfirmTone = "accent" | "danger" | "neutral";

type Props = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Optional meta line under the title (e.g. article name) */
  eyebrow?: string;
};

const toneStyles: Record<
  ConfirmTone,
  { iconBg: string; iconColor: string; confirmBtn: string }
> = {
  accent: {
    iconBg: "bg-[var(--accent-soft)]",
    iconColor: "text-[var(--accent)]",
    confirmBtn: "btn-primary",
  },
  danger: {
    iconBg: "bg-rose-50",
    iconColor: "text-rose-700",
    confirmBtn:
      "inline-flex items-center justify-center rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:opacity-60",
  },
  neutral: {
    iconBg: "bg-[var(--surface)]",
    iconColor: "text-[var(--ink)]",
    confirmBtn: "btn-primary",
  },
};

function Icon({ tone }: { tone: ConfirmTone }) {
  if (tone === "danger") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  if (tone === "accent") {
    return (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "neutral",
  busy = false,
  onConfirm,
  onCancel,
  eyebrow,
}: Props) {
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const styles = toneStyles[tone];

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => confirmRef.current?.focus(), 20);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-[var(--ink)]/45 backdrop-blur-[2px] transition"
        disabled={busy}
        onClick={() => {
          if (!busy) onCancel();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-2xl shadow-[var(--ink)]/20"
        style={{ animation: "atlas-dialog-in 160ms ease-out" }}
      >
        <div className="h-1 w-full bg-gradient-to-r from-[var(--accent)] via-[var(--accent)]/70 to-transparent" />
        <div className="p-6">
          <div className="flex gap-4">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.iconBg} ${styles.iconColor}`}
            >
              <Icon tone={tone} />
            </div>
            <div className="min-w-0 flex-1">
              {eyebrow && (
                <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {eyebrow}
                </p>
              )}
              <h2
                id={titleId}
                className="mt-0.5 font-[family-name:var(--font-display)] text-xl leading-snug text-[var(--ink)]"
              >
                {title}
              </h2>
              <div
                id={descId}
                className="mt-2 text-sm leading-relaxed text-[var(--muted)]"
              >
                {description}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary !px-4 !py-2.5 text-sm"
              disabled={busy}
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type="button"
              className={`${styles.confirmBtn} !px-4 !py-2.5 text-sm`}
              disabled={busy}
              onClick={onConfirm}
            >
              {busy ? "Working…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes atlas-dialog-in {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
