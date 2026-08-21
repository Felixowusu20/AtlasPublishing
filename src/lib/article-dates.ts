/** Calendar date (YYYY-MM-DD) helpers for article Received / Accepted / Published. */

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Value for `<input type="date">`. */
export function toDateInputValue(
  value: Date | string | null | undefined,
): string {
  if (!value) return "";
  if (typeof value === "string") {
    const exact = value.trim().match(/^(\d{4}-\d{2}-\d{2})$/);
    if (exact) return exact[1];
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return ymdLocal(parsed);
  }
  return ymdLocal(value);
}

/** Display label, e.g. "Aug 21, 2026". Empty string when missing. */
export function formatArticleDate(
  value: Date | string | null | undefined,
): string {
  const ymd = toDateInputValue(value);
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Parse a date-only string as UTC noon so the calendar day does not shift
 * across timezones when stored as DateTime.
 */
export function parseArticleDate(
  value: string | null | undefined,
): Date | undefined {
  if (!value?.trim()) return undefined;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(
      Date.UTC(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        12,
        0,
        0,
      ),
    );
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function articleDateYear(
  value: Date | string | null | undefined,
  fallback = new Date().getFullYear(),
): number {
  const ymd = toDateInputValue(value);
  if (!ymd) return fallback;
  return Number(ymd.slice(0, 4));
}
