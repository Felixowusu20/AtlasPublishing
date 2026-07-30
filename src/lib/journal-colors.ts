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

/** ACS-style cite accent (warm) — kept distinct from journal brand blues/teals. */
export const CITE_ACCENT = "#e08a2e";
export const OPEN_ACCESS_GOLD = "#c4a35a";

function hashKey(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const raw = hex.trim().replace(/^#/, "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Mix hex toward white (amount 0–1). */
export function lightenHex(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return toHex(
    rgb.r + (255 - rgb.r) * amount,
    rgb.g + (255 - rgb.g) * amount,
    rgb.b + (255 - rgb.b) * amount,
  );
}

/** Mix hex toward black (amount 0–1). */
export function darkenHex(hex: string, amount: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;
  return toHex(rgb.r * (1 - amount), rgb.g * (1 - amount), rgb.b * (1 - amount));
}

export type JournalArticlePalette = {
  /** Primary brand (Perspective badge, rules, Read Online). */
  primary: string;
  /** Hyperlink / medium brand. */
  link: string;
  /** Soft ACCESS label / light fills. */
  softLink: string;
  /** Very light panel background. */
  soft: string;
  /** Wordmark / muted journal title color. */
  wordmark: string;
  cite: string;
  openAccess: string;
  ink: string;
  muted: string;
  rule: string;
};

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

/** Derive ACS-style article chrome colors from a journal cover color. */
export function journalArticlePalette(
  coverColor?: string | null,
  fallbackKey = "atlas",
): JournalArticlePalette {
  const primary = journalColorFromKey(fallbackKey, coverColor);
  return {
    primary,
    link: lightenHex(primary, 0.28),
    softLink: lightenHex(primary, 0.55),
    soft: lightenHex(primary, 0.92),
    wordmark: lightenHex(primary, 0.22),
    cite: CITE_ACCENT,
    openAccess: OPEN_ACCESS_GOLD,
    ink: "#0b1f33",
    muted: "#5b6b7c",
    rule: "#c5ced8",
  };
}

export function nextJournalCoverColor(used: string[]): string {
  const usedSet = new Set(used.map((c) => c.toLowerCase()));
  const free = JOURNAL_COVER_COLORS.find(
    (c) => !usedSet.has(c.toLowerCase()),
  );
  if (free) return free;
  return JOURNAL_COVER_COLORS[used.length % JOURNAL_COVER_COLORS.length];
}
