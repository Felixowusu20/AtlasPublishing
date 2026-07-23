/** Distinct spine / card colors for journal icons. */
export const JOURNAL_COVER_COLORS = [
  "#0B3A53", // deep navy
  "#1A5F4A", // forest teal
  "#1E3A5F", // slate blue
  "#6B2D5B", // plum
  "#8B3A2A", // terracotta
  "#3D5A3D", // olive
  "#5C4A1F", // bronze
  "#2F4F6F", // steel
  "#7A3E1D", // rust
  "#264653", // charcoal teal
  "#4A306D", // indigo
  "#1F6F5B", // emerald
  "#9A3412", // burnt orange
  "#1D4E89", // royal blue
  "#5B2C6F", // purple
  "#0E7490", // cyan teal
] as const;

export const DEFAULT_JOURNAL_COVER = JOURNAL_COVER_COLORS[0];

function hashKey(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** List / card color — prefers stored color, else a stable palette slot by index. */
export function journalCardColor(
  coverColor: string | null | undefined,
  index: number,
): string {
  const color = coverColor?.trim();
  if (color && color.toLowerCase() !== DEFAULT_JOURNAL_COVER.toLowerCase()) {
    return color;
  }
  return JOURNAL_COVER_COLORS[index % JOURNAL_COVER_COLORS.length];
}

/** Detail page color — stable per journal slug when still on the default. */
export function journalColorFromKey(
  key: string,
  coverColor?: string | null,
): string {
  const color = coverColor?.trim();
  if (color && color.toLowerCase() !== DEFAULT_JOURNAL_COVER.toLowerCase()) {
    return color;
  }
  return JOURNAL_COVER_COLORS[hashKey(key) % JOURNAL_COVER_COLORS.length];
}

export function nextJournalCoverColor(used: string[]): string {
  const usedSet = new Set(used.map((c) => c.toLowerCase()));
  const free = JOURNAL_COVER_COLORS.find(
    (c) => !usedSet.has(c.toLowerCase()),
  );
  if (free) return free;
  return JOURNAL_COVER_COLORS[used.length % JOURNAL_COVER_COLORS.length];
}
