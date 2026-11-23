/**
 * FreeNewsApi.io client (https://freenewsapi.io/).
 * Auth: x-api-key header. Free plan: 5,000/day, 2 req/sec.
 */

export const FREENEWS_BASE_URL =
  process.env.FREENEWS_BASE_URL?.replace(/\/$/, "") ||
  "https://api.freenewsapi.io";

/** Topics that fit Nahda’s academic / science publishing remit. */
export const NAHDA_NEWS_TOPICS = [
  "science",
  "social sciences",
  "higher education",
  "education",
  "medicine",
  "health",
  "public health",
  "neuroscience",
  "environment",
  "space",
  "physics",
  "geology",
  "paleontology",
  "technology",
] as const;

export type FreeNewsListItem = {
  uuid: string;
  title: string;
  published_at: string;
  publisher?: string;
};

export type FreeNewsArticle = {
  uuid: string;
  title: string;
  thumbnail?: string | null;
  publisher?: string | null;
  authors?: string[];
  topics?: string[];
  countries?: string[];
  languages?: string[];
  published_at: string;
  original_url?: string | null;
  incipit?: string | null;
  body?: string | null;
};

type ListResponse = {
  data?: FreeNewsListItem[];
  meta?: { returned?: number; has_more?: boolean; next_offset?: number };
  error?: string;
};

type DetailsResponse = {
  data?: FreeNewsArticle;
  error?: string;
};

function apiKey() {
  const key = process.env.FREENEWS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "FREENEWS_API_KEY is not set. Add it in .env / Vercel environment variables.",
    );
  }
  return key;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Stay under the free-plan 2 requests/second cap. */
let lastRequestAt = 0;
async function throttle() {
  const gap = 700;
  const wait = lastRequestAt + gap - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}

async function freenewsFetch<T>(path: string, query: Record<string, string>) {
  await throttle();
  const url = new URL(`${FREENEWS_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value) url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "x-api-key": apiKey(),
    },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(
      data.error || `FreeNews API error (${res.status}) on ${path}`,
    );
  }
  if (data.error) throw new Error(data.error);
  return data;
}

export async function listFreeNews(opts: {
  topic: string;
  language?: string;
  pageSize?: number;
  offset?: number;
}) {
  const json = await freenewsFetch<ListResponse>("/v1/news", {
    language: opts.language ?? "en",
    topic: opts.topic,
    page_size: String(opts.pageSize ?? 5),
    offset: String(opts.offset ?? 0),
    order_by: "archive",
  });
  return json.data ?? [];
}

export async function getFreeNewsDetails(uuid: string) {
  const json = await freenewsFetch<DetailsResponse>("/v1/details", { uuid });
  if (!json.data?.uuid) throw new Error(`No article for uuid ${uuid}`);
  return json.data;
}

export async function listFreeNewsTopics() {
  const json = await freenewsFetch<{ data?: string[] }>("/v1/topics", {});
  return json.data ?? [];
}
