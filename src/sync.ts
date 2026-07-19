import { fetchJobDetail, fetchListing, sleep } from './netflix';
import { htmlToText, parseSalary } from './parsers';
import { loadStore, saveDescription, saveStore } from './store';
import type { Env, SyncResult } from './types';

// Enrichment hits Netflix's detail API once per job. Keep the pressure modest:
// at most ENRICH_CONCURRENCY in flight, with a short gap between batches. This
// (plus the Retry-After backoff in netflix.ts) is what keeps automatic syncs
// from getting throttled.
const ENRICH_CONCURRENCY = 4;
const ENRICH_BATCH_DELAY_MS = 300;

async function chunkedForEach<T>(
  items: T[],
  n: number,
  fn: (item: T) => Promise<void>,
  delayMs = 0,
): Promise<void> {
  for (let i = 0; i < items.length; i += n) {
    await Promise.all(items.slice(i, i + n).map(fn));
    if (delayMs && i + n < items.length) await sleep(delayMs);
  }
}

export interface SyncOptions {
  team?: string;
  skipEnrich?: boolean;
  // Enrich only: skip the listing fetch and the new/removed diff entirely, and
  // just enrich jobs already in the store. On the free plan the ~48-request
  // all-teams listing pass nearly exhausts the 50-subrequest budget, leaving no
  // room to enrich in the same invocation; enrich-only spends the whole budget
  // on enrichment so a backfill can proceed ~45 jobs at a time.
  enrichOnly?: boolean;
  // Cap on how many jobs to enrich in a single run. Useful when the worker's
  // subrequest budget is tight (free plan = 50, paid = 1000). Remaining jobs
  // get picked up by the next cron run because their _enriched_at stays null.
  maxEnrich?: number;
}

export async function syncJobs(env: Env, opts: SyncOptions = {}): Promise<SyncResult> {
  const store = await loadStore(env);
  const jobs = store.jobs;
  const now = Math.floor(Date.now() / 1000);

  const newIds: string[] = [];
  const updatedIds: string[] = [];
  const reappearedIds: string[] = [];
  const removedNow: string[] = [];
  let listedCount = 0;

  if (opts.enrichOnly) {
    listedCount = Object.values(jobs).filter(j => j._status === 'open').length;
    console.log(`[sync] enrich-only run over ${listedCount} open job(s) (skipping listing fetch)…`);
  } else {
    // Default: no team filter → fetch every team in one paginated pass. Set
    // opts.team or the TEAM env var to restrict to a single team.
    const team = opts.team ?? env.TEAM ?? undefined;
    const teamLabel = team ?? 'All teams';
    console.log(`[sync] fetching ${teamLabel} jobs from Netflix…`);
    const { positions, total } = await fetchListing(team);
    listedCount = positions.length;
    if (total && positions.length < total) {
      console.warn(`[sync] API reports ${total} jobs but only ${positions.length} returned`);
    }

    const fetchedIds = new Set<string>(positions.map(p => String(p.id)));
    for (const p of positions) {
      const jid = String(p.id);
      const existing = jobs[jid];
      if (!existing) {
        jobs[jid] = { ...p, _first_seen: now, _last_seen: now, _status: 'open' };
        newIds.push(jid);
      } else {
        const prevStatus = existing._status ?? 'open';
        const prevTUpdate = existing.t_update;
        Object.assign(existing, p);
        existing._last_seen = now;
        existing._status = 'open';
        delete existing._removed_at;
        if (prevStatus === 'removed') reappearedIds.push(jid);
        else if (prevTUpdate && p.t_update && p.t_update !== prevTUpdate) updatedIds.push(jid);
      }
    }

    for (const [jid, j] of Object.entries(jobs)) {
      if (!fetchedIds.has(jid) && j._status === 'open') {
        j._status = 'removed';
        j._removed_at = now;
        removedNow.push(jid);
      }
    }

    store.last_synced = now;
    store.team = teamLabel;
  }

  let enrichedOk = 0;
  let enrichedFailed = 0;
  if (!opts.skipEnrich) {
    const needsEnrich: string[] = [];
    for (const [jid, j] of Object.entries(jobs)) {
      if (j._status !== 'open') continue;
      const enrichedAt = j._enriched_at;
      const tUpdate = j.t_update ?? 0;
      if (enrichedAt == null || (tUpdate && tUpdate > enrichedAt)) {
        needsEnrich.push(jid);
      }
    }
    // Prioritise newest creations first so visible content fills in quickly
    // when we're capped under maxEnrich.
    needsEnrich.sort((a, b) => (jobs[b]!.t_create ?? 0) - (jobs[a]!.t_create ?? 0));
    const target = opts.maxEnrich ? needsEnrich.slice(0, opts.maxEnrich) : needsEnrich;

    if (target.length) {
      console.log(`[sync] enriching ${target.length}/${needsEnrich.length} job(s)…`);
      await chunkedForEach(target, ENRICH_CONCURRENCY, async jid => {
        const job = jobs[jid]!;
        try {
          const detail = await fetchJobDetail(jid);
          await saveDescription(env, jid, detail);
          const sal = parseSalary(detail.job_description ?? '');
          job._enriched_at = now;
          delete job._enrich_error;
          job._salary_low = sal ? sal[0] : null;
          job._salary_high = sal ? sal[1] : null;
          job._description_text = htmlToText(detail.job_description ?? '');
          enrichedOk++;
        } catch (e) {
          job._enrich_error = e instanceof Error ? e.message : String(e);
          enrichedFailed++;
        }
      }, ENRICH_BATCH_DELAY_MS);
      if (enrichedFailed) console.warn(`[sync] ${enrichedFailed} enrichment(s) failed; will retry next run`);
    }
  }

  await saveStore(env, store);

  const result: SyncResult = {
    total: listedCount,
    newCount: newIds.length,
    removedCount: removedNow.length,
    updatedCount: updatedIds.length,
    reappearedCount: reappearedIds.length,
    enrichedOk,
    enrichedFailed,
  };
  console.log(`[sync] done: ${JSON.stringify(result)}`);
  return result;
}
