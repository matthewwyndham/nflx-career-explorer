import type { JobDetail, NetflixPosition } from './types';

const API_BASE = 'https://explore.jobs.netflix.net/api/apply/v2/jobs';
const PAGE_SIZE = 10; // The API silently caps responses at 10 regardless of `num`.
const PAGE_DELAY_MS = 150; // Gap between listing pages so we don't hammer the API.
const USER_AGENT = 'netflix-careers-explorer/1.0 (+cloudflare-worker)';

// Back off and retry on throttling (429) and transient upstream errors so a
// burst of enrichment fetches self-heals instead of failing outright. Honors a
// Retry-After header when present, otherwise uses capped exponential backoff.
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 600;
const MAX_BACKOFF_MS = 8_000;

export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;
  const secs = Number(header);
  if (Number.isFinite(secs)) return Math.max(0, secs * 1000);
  const when = Date.parse(header);
  if (Number.isFinite(when)) return Math.max(0, when - Date.now());
  return null;
}

async function httpGetJson<T>(url: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    if (res.ok) return (await res.json()) as T;
    if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_ATTEMPTS) {
      const retryAfter = parseRetryAfter(res.headers.get('retry-after'));
      const backoff = retryAfter != null
        ? Math.min(retryAfter, MAX_BACKOFF_MS)
        : Math.min(MAX_BACKOFF_MS, BACKOFF_BASE_MS * 2 ** (attempt - 1));
      console.warn(`[netflix] HTTP ${res.status} for ${url}; retry ${attempt}/${MAX_ATTEMPTS - 1} in ${backoff}ms`);
      await sleep(backoff);
      continue;
    }
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  }
}

interface ListingResponse {
  count?: number;
  positions?: NetflixPosition[];
}

// Fetches the full listing. Pass a `team` to restrict to a single Netflix team
// (the `Teams` facet value); omit it to page through every team at once. Each
// returned position carries its team in `department`.
export async function fetchListing(team?: string): Promise<{ positions: NetflixPosition[]; total: number }> {
  const all: NetflixPosition[] = [];
  const seen = new Set<number>();
  let start = 0;
  let total = 0;
  while (true) {
    const params = new URLSearchParams({
      domain: 'netflix.com',
      start: String(start),
      num: String(PAGE_SIZE),
      sort_by: 'date',
    });
    if (team) params.set('Teams', team);
    const data = await httpGetJson<ListingResponse>(`${API_BASE}?${params.toString()}`);
    total = data.count ?? total ?? 0;
    const positions = data.positions ?? [];
    if (positions.length === 0) break;
    let added = 0;
    for (const p of positions) {
      if (p.id == null || seen.has(p.id)) continue;
      seen.add(p.id);
      all.push(p);
      added++;
    }
    if (added === 0 || all.length >= total) break;
    start += PAGE_SIZE;
    if (start > 5000) break; // hard safety cap, mirrors Python
    await sleep(PAGE_DELAY_MS);
  }
  return { positions: all, total };
}

export async function fetchJobDetail(id: string | number): Promise<JobDetail> {
  return httpGetJson<JobDetail>(`${API_BASE}/${id}?domain=netflix.com`);
}
