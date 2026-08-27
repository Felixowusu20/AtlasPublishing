export type AuthorContact = {
  name: string;
  email: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeName(value: unknown, fallback: string) {
  const name = String(value ?? "").trim();
  return name || fallback;
}

/** Authors listed on the manuscript metadata (author 1, author 2, …). */
export function parseAuthorsJson(value: unknown): AuthorContact[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: AuthorContact[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const record = row as { name?: unknown; email?: unknown };
    const email = normalizeEmail(record.email);
    if (!EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    out.push({
      name: normalizeName(record.name, email),
      email,
    });
  }
  return out;
}

/**
 * Everyone who should get the “manuscript received” / “published” notice:
 * metadata authors, plus the submitting account if it is missing.
 */
export function notifyAuthorContacts(opts: {
  authorsJson?: unknown;
  fallback?: { name?: string | null; email?: string | null } | null;
}): AuthorContact[] {
  const listed = parseAuthorsJson(opts.authorsJson);
  const fallbackEmail = normalizeEmail(opts.fallback?.email);
  if (EMAIL_RE.test(fallbackEmail) && !listed.some((a) => a.email === fallbackEmail)) {
    listed.push({
      name: normalizeName(opts.fallback?.name, fallbackEmail),
      email: fallbackEmail,
    });
  }
  return listed;
}

export function jointAuthorGreeting(contacts: AuthorContact[]) {
  const names = contacts
    .map((c) => c.name.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (names.length === 0) return "authors";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function authorSearchHaystack(opts: {
  names?: string[];
  emails?: string[];
}) {
  return [...(opts.names ?? []), ...(opts.emails ?? [])]
    .join(" ")
    .toLowerCase();
}
