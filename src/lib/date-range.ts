/** Local calendar-day helpers for admin date filters (avoid UTC shift on YYYY-MM-DD). */

export type DateRangePreset =
  | "daily"
  | "weekly"
  | "monthly"
  | "annual"
  | "custom";

export function parseLocalDateInput(
  value: string,
  endOfDay = false,
): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  if (endOfDay) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date;
}

export function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfLocalDay(date = new Date()) {
  const x = new Date(date);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfLocalDay(date = new Date()) {
  const x = new Date(date);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function resolveDateRange(
  preset: DateRangePreset,
  fromParam?: string | null,
  toParam?: string | null,
): { from: Date; to: Date; label: string; preset: DateRangePreset } {
  const now = new Date();
  const to = endOfLocalDay(now);

  if (preset === "custom" && fromParam && toParam) {
    const from = parseLocalDateInput(fromParam, false);
    const customTo = parseLocalDateInput(toParam, true);
    if (from && customTo) {
      const lo = from.getTime() <= customTo.getTime() ? from : customTo;
      const hi = from.getTime() <= customTo.getTime() ? customTo : from;
      return {
        from: lo,
        to: hi,
        preset,
        label: `${toDateInputValue(lo)} – ${toDateInputValue(hi)}`,
      };
    }
  }

  if (preset === "daily") {
    const from = startOfLocalDay(now);
    return { from, to, preset: "daily", label: "Today" };
  }
  if (preset === "weekly") {
    const from = startOfLocalDay(now);
    from.setDate(from.getDate() - 6);
    return { from, to, preset: "weekly", label: "Last 7 days" };
  }
  if (preset === "annual") {
    const from = startOfLocalDay(new Date(now.getFullYear(), 0, 1));
    return { from, to, preset: "annual", label: String(now.getFullYear()) };
  }

  const from = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), 1));
  return {
    from,
    to,
    preset: "monthly",
    label: now.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    }),
  };
}
