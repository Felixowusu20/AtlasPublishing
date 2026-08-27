const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type IssueArticleInput = {
  volume?: string | null;
  issue?: string | null;
  publishedAt: Date | string;
  journal: {
    id: string;
    slug: string;
    title: string;
    shortTitle: string;
    frequency?: string | null;
    foundedYear?: number | null;
    issn?: string | null;
  };
};

export type IssueRecord = {
  key: string;
  journalId: string;
  journalSlug: string;
  journalTitle: string;
  journalShortTitle: string;
  frequency: string | null;
  issn: string | null;
  volume: string | null;
  issue: string | null;
  title: string;
  articleCount: number;
  firstPublishedAt: string;
  lastPublishedAt: string;
  intervalLabel: string;
  year: number;
  isCurrent: boolean;
  href: string;
};

function asDate(value: Date | string): Date {
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function monthYear(date: Date) {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function slugPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

/** Stable issue key used in URLs: vol-1-issue-2 */
export function issueKey(volume?: string | null, issue?: string | null) {
  const v = (volume || "").trim();
  const i = (issue || "").trim();
  if (isPlaceholderVolume(v) && isPlaceholderIssue(i)) {
    return "early-view";
  }
  const vol = !isPlaceholderVolume(v) ? `vol-${slugPart(v)}` : "vol-x";
  const iss = !isPlaceholderIssue(i) ? `issue-${slugPart(i)}` : "issue-x";
  return `${vol}-${iss}`;
}

export function parseIssueKey(key: string): {
  volume: string | null;
  issue: string | null;
  earlyView: boolean;
} {
  if (key === "early-view") {
    return { volume: null, issue: null, earlyView: true };
  }
  const m = key.match(/^vol-([a-z0-9-]+)-issue-([a-z0-9-]+)$/i);
  if (!m) return { volume: null, issue: null, earlyView: false };
  return {
    volume: m[1] === "x" ? null : m[1].replace(/-/g, " "),
    issue: m[2] === "x" ? null : m[2].replace(/-/g, " "),
    earlyView: false,
  };
}

export function issueHref(
  journalSlug: string,
  volume?: string | null,
  issue?: string | null,
) {
  return `/journals/${journalSlug}/issues/${issueKey(volume, issue)}`;
}

export function issueTitle(volume?: string | null, issue?: string | null) {
  const v = (volume || "").trim();
  const i = (issue || "").trim();
  return (
    [
      v && v !== "—" ? `Vol. ${v}` : null,
      i && i !== "—" ? `Issue ${i}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Issue"
  );
}

export function isPlaceholderIssue(issue?: string | null) {
  const value = (issue || "").trim();
  return !value || value === "—" || /^early view$/i.test(value);
}

export function isPlaceholderVolume(volume?: string | null) {
  const value = (volume || "").trim();
  return !value || value === "—";
}

function issuesPerVolume(frequency?: string | null) {
  const freq = (frequency ?? "").toLowerCase();
  if (freq.includes("annual") || freq.includes("yearly")) return 1;
  if (freq.includes("quarter")) return 4;
  if (
    freq.includes("bimonth") ||
    freq.includes("bi-month") ||
    freq.includes("bi monthly")
  ) {
    return 6;
  }
  if (freq.includes("month") || freq.includes("continuous")) return 12;
  return 4;
}

export function issueNumberFromDate(
  publishedAt: Date | string,
  frequency?: string | null,
) {
  const month = asDate(publishedAt).getUTCMonth();
  const perVolume = issuesPerVolume(frequency);
  if (perVolume <= 1) return 1;
  return Math.floor(month / (12 / perVolume)) + 1;
}

/** Volume and issue number from the journal schedule and publish date. */
export function numberedIssuePlacement(opts: {
  publishedAt: Date | string;
  frequency?: string | null;
  foundedYear?: number | null;
}): { volume: string; issue: string } {
  const date = asDate(opts.publishedAt);
  const year = date.getUTCFullYear();
  const founded =
    opts.foundedYear && opts.foundedYear > 1800 && opts.foundedYear <= year
      ? opts.foundedYear
      : null;
  return {
    volume: String(founded ? year - founded + 1 : year),
    issue: String(issueNumberFromDate(date, opts.frequency)),
  };
}

export function resolveArticleIssue(input: {
  volume?: string | null;
  issue?: string | null;
  publishedAt: Date | string;
  frequency?: string | null;
  foundedYear?: number | null;
}): { volume: string; issue: string } {
  const placement = numberedIssuePlacement(input);
  return {
    volume: isPlaceholderVolume(input.volume)
      ? placement.volume
      : String(input.volume).trim(),
    issue: isPlaceholderIssue(input.issue)
      ? placement.issue
      : String(input.issue).trim(),
  };
}

/** Date span for an issue, shaped by the journal’s publishing frequency. */
export function formatDateInterval(
  from: Date | string,
  to: Date | string,
  frequency?: string | null,
): string {
  const startDate = asDate(from);
  const endDate = asDate(to);
  const start =
    startDate.getTime() <= endDate.getTime() ? startDate : endDate;
  const end = startDate.getTime() <= endDate.getTime() ? endDate : startDate;
  const freq = (frequency ?? "").toLowerCase();

  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() &&
    start.getUTCMonth() === end.getUTCMonth();
  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();

  if (freq.includes("quarter")) {
    const qStart = Math.floor(start.getUTCMonth() / 3);
    const qEnd = Math.floor(end.getUTCMonth() / 3);
    if (sameYear && qStart === qEnd) {
      const first = qStart * 3;
      return `${MONTHS[first]}–${MONTHS[first + 2]} ${start.getUTCFullYear()}`;
    }
  }

  if (
    (freq.includes("bimonth") ||
      freq.includes("bi-month") ||
      freq.includes("bi monthly")) &&
    sameYear &&
    end.getUTCMonth() - start.getUTCMonth() <= 1
  ) {
    return `${MONTHS[start.getUTCMonth()]}–${MONTHS[end.getUTCMonth()]} ${start.getUTCFullYear()}`;
  }

  if (freq.includes("annual") || freq.includes("yearly")) {
    if (sameYear) return String(start.getUTCFullYear());
    return `${start.getUTCFullYear()}–${end.getUTCFullYear()}`;
  }

  if (sameMonth) return monthYear(start);
  if (sameYear) {
    return `${MONTHS[start.getUTCMonth()]}–${MONTHS[end.getUTCMonth()]} ${start.getUTCFullYear()}`;
  }
  return `${monthYear(start)}–${monthYear(end)}`;
}

export function deriveIssueRecords(
  articles: IssueArticleInput[],
): IssueRecord[] {
  type Acc = Omit<IssueRecord, "isCurrent" | "intervalLabel" | "year"> & {
    first: Date;
    last: Date;
  };

  const map = new Map<string, Acc>();

  for (const article of articles) {
    const resolved = resolveArticleIssue({
      volume: article.volume,
      issue: article.issue,
      publishedAt: article.publishedAt,
      frequency: article.journal.frequency,
      foundedYear: article.journal.foundedYear,
    });
    const key = issueKey(resolved.volume, resolved.issue);
    const id = `${article.journal.id}::${key}`;
    const publishedAt = asDate(article.publishedAt);
    const existing = map.get(id);
    if (!existing) {
      map.set(id, {
        key,
        journalId: article.journal.id,
        journalSlug: article.journal.slug,
        journalTitle: article.journal.title,
        journalShortTitle: article.journal.shortTitle,
        frequency: article.journal.frequency ?? null,
        issn: article.journal.issn ?? null,
        volume: resolved.volume,
        issue: resolved.issue,
        title: issueTitle(resolved.volume, resolved.issue),
        articleCount: 1,
        firstPublishedAt: publishedAt.toISOString(),
        lastPublishedAt: publishedAt.toISOString(),
        href: issueHref(article.journal.slug, resolved.volume, resolved.issue),
        first: publishedAt,
        last: publishedAt,
      });
      continue;
    }
    existing.articleCount += 1;
    if (publishedAt < existing.first) existing.first = publishedAt;
    if (publishedAt > existing.last) existing.last = publishedAt;
  }

  const latestByJournal = new Map<string, number>();
  for (const row of map.values()) {
    const prev = latestByJournal.get(row.journalId) ?? 0;
    if (row.last.getTime() > prev) {
      latestByJournal.set(row.journalId, row.last.getTime());
    }
  }

  return [...map.values()]
    .map((row) => ({
      key: row.key,
      journalId: row.journalId,
      journalSlug: row.journalSlug,
      journalTitle: row.journalTitle,
      journalShortTitle: row.journalShortTitle,
      frequency: row.frequency,
      issn: row.issn,
      volume: row.volume,
      issue: row.issue,
      title: row.title,
      articleCount: row.articleCount,
      firstPublishedAt: row.first.toISOString(),
      lastPublishedAt: row.last.toISOString(),
      intervalLabel: formatDateInterval(row.first, row.last, row.frequency),
      year: row.last.getUTCFullYear(),
      isCurrent: row.last.getTime() === (latestByJournal.get(row.journalId) ?? 0),
      href: row.href,
    }))
    .sort((a, b) => {
      const byDate =
        new Date(b.lastPublishedAt).getTime() -
        new Date(a.lastPublishedAt).getTime();
      if (byDate !== 0) return byDate;
      return a.journalTitle.localeCompare(b.journalTitle);
    });
}

export function currentIssues(records: IssueRecord[]) {
  return records.filter((issue) => issue.isCurrent);
}

export function pastIssues(records: IssueRecord[]) {
  return records.filter((issue) => !issue.isCurrent);
}

export function issuesForJournal(records: IssueRecord[], journalId: string) {
  return records.filter((issue) => issue.journalId === journalId);
}

export function findIssueRecord(
  records: IssueRecord[],
  journalId: string,
  volume?: string | null,
  issue?: string | null,
) {
  const key = issueKey(volume, issue);
  return (
    records.find((row) => row.journalId === journalId && row.key === key) ??
    null
  );
}

export function groupIssuesByYear(records: IssueRecord[]) {
  const years = new Map<number, IssueRecord[]>();
  for (const issue of records) {
    const list = years.get(issue.year) ?? [];
    list.push(issue);
    years.set(issue.year, list);
  }
  return [...years.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, issues]) => ({ year, issues }));
}
