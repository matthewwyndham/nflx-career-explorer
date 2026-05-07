import { parseLevels } from './parsers';
import { loadStore } from './store';
import { HTML_TEMPLATE } from './template';
import type { Env, JobRecord } from './types';

interface DisplayRecord {
  id: string;
  display_id: string;
  title: string;
  levels: number[];
  salary_low: number | null;
  salary_high: number | null;
  locations: string[];
  work_location_option: string;
  business_unit: string;
  t_create: number | null;
  t_update: number | null;
  status: 'open' | 'removed';
  first_seen: number | null;
  removed_at: number | null;
  url: string;
  description: string;
}

function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

function fmtUTC(ts: number): string {
  const d = new Date(ts * 1000);
  const Y = d.getUTCFullYear();
  const M = String(d.getUTCMonth() + 1).padStart(2, '0');
  const D = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${Y}-${M}-${D} ${h}:${m} UTC`;
}

function toRecord(jid: string, j: JobRecord): DisplayRecord {
  return {
    id: jid,
    display_id: j.display_job_id ?? jid,
    title: j.name ?? '',
    levels: parseLevels(j.name),
    salary_low: j._salary_low ?? null,
    salary_high: j._salary_high ?? null,
    locations: j.locations ?? (j.location ? [j.location] : []),
    work_location_option: j.work_location_option ?? '',
    business_unit: j.business_unit ?? '',
    t_create: j.t_create ?? null,
    t_update: j.t_update ?? null,
    status: j._status ?? 'open',
    first_seen: j._first_seen ?? null,
    removed_at: j._removed_at ?? null,
    url: j.canonicalPositionUrl ?? '',
    description: j._description_text ?? '',
  };
}

function buildPills(records: DisplayRecord[]): string {
  const pillOrder = ['L3', 'L4', 'L5', 'L6', 'L7', 'none'];
  const counts: Record<string, number> = {};
  let removedCount = 0;
  for (const r of records) {
    if (r.status !== 'open') {
      removedCount++;
      continue;
    }
    if (r.levels.length === 0) {
      counts['none'] = (counts['none'] ?? 0) + 1;
    } else {
      for (const l of r.levels) {
        const key = `L${l}`;
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
  }
  const parts: string[] = [];
  for (const k of pillOrder) {
    if (counts[k]) parts.push(`${k}: <b>${counts[k]}</b>`);
  }
  if (removedCount) parts.push(`removed: <b>${removedCount}</b>`);
  return parts.join(' · ');
}

export async function renderPage(env: Env): Promise<string> {
  const store = await loadStore(env);
  const jobs = store.jobs ?? {};
  const records: DisplayRecord[] = Object.entries(jobs)
    .map(([jid, j]) => toRecord(jid, j))
    .sort((a, b) => (b.t_create ?? 0) - (a.t_create ?? 0));

  const lastSynced = store.last_synced ?? 0;
  const lastLabel = lastSynced ? fmtUTC(lastSynced) : 'never';
  const pills = buildPills(records);
  // Avoid `</script>` injection from titles/descriptions. Mirrors Python.
  const dataJson = JSON.stringify(records).replace(/<\//g, '<\\/');

  return HTML_TEMPLATE
    .replace('__TEAM__', htmlEscape(store.team ?? 'Engineering'))
    .replace('__LAST_SYNCED__', htmlEscape(lastLabel))
    .replace('__LAST_SYNCED_TS__', String(Math.floor(lastSynced)))
    .replace('__PILLS__', pills)
    .replace('__DATA_JSON__', dataJson);
}

export function emptyPage(reason: string): string {
  return `<!doctype html><meta charset="utf-8"><title>Netflix Careers Explorer</title>
<style>body{background:#0a0a0a;color:#e6e6e6;font-family:ui-monospace,monospace;padding:40px;line-height:1.5}</style>
<h1 style="color:#e50914">Netflix Careers Explorer</h1>
<p>${htmlEscape(reason)}</p>
<p>The cron job runs once a day. If you just deployed, trigger a sync manually with the <code>/sync</code> endpoint or wait for the next scheduled run.</p>`;
}
