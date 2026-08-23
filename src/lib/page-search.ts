const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "had",
  "has",
  "have",
  "how",
  "in",
  "into",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "our",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "were",
  "with",
  "you",
  "your",
]);

export type SearchSuggestion = {
  id: string;
  label: string;
  kind: "word" | "phrase";
};

export function queryTokens(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9.+-]+/)
    .filter(Boolean);
}

export function matchesQuery(haystack: string, query: string): boolean {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return true;
  const hay = haystack.toLowerCase();
  return tokens.every((token) => hay.includes(token));
}

export function wordsFromText(text: string): string[] {
  const seen = new Map<string, string>();
  for (const raw of text.split(/[^a-zA-Z0-9.+-]+/)) {
    const word = raw.trim();
    if (word.length < 3 || word.length > 40) continue;
    if (/^\d+(\.\d+)?$/.test(word)) continue;
    const key = word.toLowerCase();
    if (STOPWORDS.has(key)) continue;
    if (!seen.has(key)) seen.set(key, word);
  }
  return [...seen.values()];
}

export function suggestMatches(
  query: string,
  words: string[],
  phrases: string[],
  limit = 8,
): SearchSuggestion[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const last = trimmed.split(/\s+/).pop()?.toLowerCase() ?? "";
  if (last.length < 1) return [];

  const out: SearchSuggestion[] = [];
  const seen = new Set<string>();

  const needle = trimmed.toLowerCase();
  const rankedPhrases = phrases.filter((phrase) => {
    const lower = phrase.toLowerCase();
    return lower.includes(needle) || (last.length >= 2 && lower.includes(last));
  });

  for (const phrase of rankedPhrases) {
    const key = `p:${phrase.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: key, label: phrase, kind: "phrase" });
    if (out.length >= limit) return out;
  }

  const starts: string[] = [];
  const contains: string[] = [];
  for (const word of words) {
    const lower = word.toLowerCase();
    if (lower === last) continue;
    if (lower.startsWith(last)) starts.push(word);
    else if (last.length >= 2 && lower.includes(last)) contains.push(word);
  }

  for (const word of [...starts, ...contains]) {
    const key = `w:${word.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id: key, label: word, kind: "word" });
    if (out.length >= limit) return out;
  }

  return out;
}

export function applySuggestion(query: string, suggestion: SearchSuggestion): string {
  if (suggestion.kind === "phrase") return suggestion.label;
  const parts = query.replace(/\s+$/, "").split(/\s+/);
  parts[parts.length - 1] = suggestion.label;
  return parts.join(" ");
}
