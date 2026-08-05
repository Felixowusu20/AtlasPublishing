"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAdminAuth } from "@/components/admin-auth-provider";
import {
  ChartCard,
  EngagementChart,
  JournalDonut,
  RankingChart,
  TrendChart,
  type EngagementBar,
  type JournalSlice,
  type MonthPoint,
} from "@/components/admin-analytics-charts";
import { PaymentAnalyticsPanel } from "@/components/payment-analytics-panel";

type Counts = {
  submissions: number;
  journals: number;
  articles: number;
  announcements: number;
  reviewers: number;
  publishQueue: number;
};

type ArticleStat = {
  id: string;
  slug: string;
  title: string;
  doi?: string | null;
  views: number;
  downloads: number;
  journal: { shortTitle: string };
};

type Analytics = {
  totals: {
    articles: number;
    views: number;
    downloads: number;
    citations: number;
  };
  topViews: ArticleStat[];
  topDownloads: ArticleStat[];
  byJournal: JournalSlice[];
  months: MonthPoint[];
  engagement: EngagementBar[];
};

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function listLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function formatNum(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString();
}

export default function AdminHomePage() {
  const { user } = useAdminAuth();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const [subs, journals, articles, announcements, reviewers, publish, stats] =
          await Promise.all([
            fetch("/api/admin/submissions").then(readJson),
            fetch("/api/admin/journals").then(readJson),
            fetch("/api/admin/articles").then(readJson),
            fetch("/api/admin/announcements").then(readJson),
            user.role === "SUPER_ADMIN"
              ? fetch("/api/admin/reviewers").then(readJson)
              : Promise.resolve({ reviewers: [] as unknown[] }),
            fetch("/api/admin/publish-queue").then(readJson),
            fetch("/api/admin/analytics").then(readJson),
          ]);
        if (cancelled) return;
        setCounts({
          submissions: listLength(subs.submissions),
          journals: listLength(journals.journals),
          articles: listLength(articles.articles),
          announcements: listLength(announcements.announcements),
          reviewers: listLength(reviewers.reviewers),
          publishQueue: listLength(publish.queue),
        });
        if (stats.totals && typeof stats.totals === "object") {
          setAnalytics({
            totals: stats.totals as Analytics["totals"],
            topViews: (stats.topViews as ArticleStat[]) ?? [],
            topDownloads: (stats.topDownloads as ArticleStat[]) ?? [],
            byJournal: (stats.byJournal as JournalSlice[]) ?? [],
            months: (stats.months as MonthPoint[]) ?? [],
            engagement: (stats.engagement as EngagementBar[]) ?? [],
          });
        }
      } catch {
        if (!cancelled) {
          setCounts({
            submissions: 0,
            journals: 0,
            articles: 0,
            announcements: 0,
            reviewers: 0,
            publishQueue: 0,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            Admin overview
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)] sm:text-3xl">
            Welcome, {user.name}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
            {user.role === "SUPER_ADMIN"
              ? "Manage CMS content, journals, reviewers, and track article reach."
              : "Review manuscripts, prepare full articles, and publish accepted papers."}
          </p>
        </div>
      </div>

      {/* Reach analytics */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--ink)]">
            Reach &amp; analytics
          </h2>
          <Link
            href="/admin/articles"
            className="text-xs font-semibold text-[var(--accent)] hover:underline"
          >
            All articles →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Published articles"
            value={formatNum(analytics?.totals.articles ?? counts?.articles)}
            hint="Live on the site"
            tone="teal"
            icon={<ArticlesIcon />}
          />
          <MetricCard
            label="Total views"
            value={formatNum(analytics?.totals.views)}
            hint="Article page visits"
            tone="sky"
            icon={<ViewsIcon />}
          />
          <MetricCard
            label="PDF downloads"
            value={formatNum(analytics?.totals.downloads)}
            hint="Tracked downloads"
            tone="amber"
            icon={<DownloadsIcon />}
          />
          <MetricCard
            label="Citations logged"
            value={formatNum(analytics?.totals.citations)}
            hint="Recorded citations"
            tone="violet"
            icon={<CiteIcon />}
          />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
          <ChartCard
            title="6-month reach trend"
            subtitle="Views, downloads, and publishes by month"
          >
            <TrendChart months={analytics?.months ?? []} />
          </ChartCard>
          <ChartCard
            title="Share by journal"
            subtitle="Views distributed across titles"
          >
            <JournalDonut journals={analytics?.byJournal ?? []} />
          </ChartCard>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Views vs downloads"
            subtitle="Engagement on top papers"
          >
            <EngagementChart items={analytics?.engagement ?? []} />
          </ChartCard>
          <div className="grid gap-4">
            <ChartCard title="Most viewed" subtitle="Ranking by page views">
              <RankingChart
                items={analytics?.topViews ?? []}
                metric="views"
              />
            </ChartCard>
            <ChartCard
              title="Most downloaded"
              subtitle="Ranking by PDF downloads"
            >
              <RankingChart
                items={analytics?.topDownloads ?? []}
                metric="downloads"
              />
            </ChartCard>
          </div>
        </div>
      </section>

      <PaymentAnalyticsPanel />

      {/* Workspace shortcuts */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold text-[var(--ink)]">
          Workspace
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label="Inbox"
            value={counts?.submissions}
            href="/admin/submissions"
            hint="Submissions to review"
            icon={<InboxIcon />}
          />
          <Stat
            label="Full manuscripts"
            value={counts?.publishQueue}
            href="/admin/manuscripts"
            hint="Production drafts"
            icon={<ManuscriptIcon />}
          />
          <Stat
            label="Publish queue"
            value={counts?.publishQueue}
            href="/admin/publishedArticles"
            hint="Ready to publish"
            icon={<PublishIcon />}
          />
          {user.role === "SUPER_ADMIN" && (
            <>
              <Stat
                label="Journals"
                value={counts?.journals}
                href="/admin/journals"
                hint="Active titles"
                icon={<JournalsIcon />}
              />
              <Stat
                label="Latest articles"
                value={counts?.articles}
                href="/admin/articles"
                hint="Published catalogue"
                icon={<ArticlesIcon />}
              />
              <Stat
                label="Announcements"
                value={counts?.announcements}
                href="/admin/announcements"
                hint="Homepage news"
                icon={<NewsIcon />}
              />
              <Stat
                label="Reviewers"
                value={counts?.reviewers}
                href="/admin/reviewers"
                hint="Editorial accounts"
                icon={<ReviewersIcon />}
              />
              <Stat
                label="Hero slides"
                value="CMS"
                href="/admin/hero"
                hint="Homepage carousel"
                icon={<HeroIcon />}
              />
              <Stat
                label="Recycle bin"
                value="Bin"
                href="/admin/recycle-bin"
                hint="Restore or purge"
                icon={<RecycleIcon />}
              />
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "teal" | "sky" | "amber" | "violet";
  icon: ReactNode;
}) {
  const tones = {
    teal: "bg-teal-50 text-teal-700 ring-teal-100",
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
    amber: "bg-amber-50 text-amber-800 ring-amber-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
  };
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            {label}
          </p>
          <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--ink)]">
            {value}
          </p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">{hint}</p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  hint,
  icon,
}: {
  label: string;
  value: number | string | null | undefined;
  href: string;
  hint: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)]/35 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold text-[var(--ink)]">
            {value ?? "—"}
          </p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">{hint}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] transition group-hover:bg-[var(--accent)] group-hover:text-white">
          {icon}
        </span>
      </div>
    </Link>
  );
}

function svgProps(className = "h-5 w-5") {
  return {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
}

function ViewsIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function DownloadsIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function CiteIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M10 11H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M20 11h-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M6 11v3a6 6 0 0 0 6 6" />
      <path d="M16 11v3a6 6 0 0 1-6 6" />
    </svg>
  );
}
function InboxIcon() {
  return (
    <svg {...svgProps()}>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}
function ManuscriptIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
function PublishIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M12 19V5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}
function JournalsIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
function ArticlesIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h10" />
    </svg>
  );
}
function NewsIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" />
      <path d="M15 18h-5" />
      <path d="M10 6h8v4h-8V6Z" />
    </svg>
  );
}
function ReviewersIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function HeroIcon() {
  return (
    <svg {...svgProps()}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
function RecycleIcon() {
  return (
    <svg {...svgProps()}>
      <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5" />
      <path d="M11 19h8.203a1.83 1.83 0 0 0 1.556-.89 1.784 1.784 0 0 0 0-1.775l-1.226-2.12" />
      <path d="m14 16-3 3 3 3" />
      <path d="M8.293 13.596 7.196 9.5 3.1 10.598" />
      <path d="m9.344 5.811 1.093-1.892A1.83 1.83 0 0 1 11.985 3a1.784 1.784 0 0 1 1.546.888l3.943 6.843" />
      <path d="m13.378 9.633 4.005 1.098 1.098-4.005" />
    </svg>
  );
}
