import type { JobDetail, NetflixPosition } from './types';

const API_BASE = 'https://explore.jobs.netflix.net/api/apply/v2/jobs';
const PAGE_SIZE = 10; // The API silently caps responses at 10 regardless of `num`.
const PAGE_DELAY_MS = 150; // Gap between listing pages so we don't hammer the API.
const USER_AGENT = 'netflix-careers-explorer/1.0 (+cloudflare-worker)';

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function httpGetJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    cf: { cacheTtl: 0, cacheEverything: false },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
  return (await res.json()) as T;
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
