import { emptyPage, renderPage } from './render';
import { loadStore, saveStore, STORE_KEY } from './store';
import { enrichJobs, needsEnrich, syncJobs } from './sync';
import type { Env } from './types';

const HTML_CACHE_SECONDS = 600;

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#e50914" stroke="#e50914" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12a10.06 10.06 0 0 0-20 0Z"/><path d="M12 12v8a2 2 0 0 0 4 0" fill="none"/></svg>`;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    try {
      switch (url.pathname) {
        case '/':
        case '/index.html':
          return await handleIndex(request, env, ctx);
        case '/api/jobs.json':
          return await handleRawJobs(env);
        case '/sync':
          return await handleSync(request, env);
        case '/favicon.svg':
        case '/favicon.ico':
          return new Response(FAVICON_SVG, {
            headers: {
              'content-type': 'image/svg+xml',
              'cache-control': 'public, max-age=86400',
            },
          });
        case '/healthz':
          return new Response('ok', { headers: { 'content-type': 'text/plain' } });
        default:
          return new Response('not found', { status: 404 });
      }
    } catch (err) {
      console.error('[fetch] error', err);
      const msg = err instanceof Error ? err.message : String(err);
      return new Response(`error: ${msg}`, { status: 500 });
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[scheduled] cron=${event.cron} scheduledTime=${new Date(event.scheduledTime).toISOString()}`);
    // Refresh the listing (new/removed detection) and enqueue jobs needing
    // enrichment. The all-teams listing alone is ~48 of the free plan's 50
    // external subrequests, so enrichment happens separately in queue() below.
    ctx.waitUntil(syncJobs(env, { skipEnrich: true, enqueue: true }).then(
      r => console.log('[scheduled] sync ok', r),
      e => console.error('[scheduled] sync failed', e),
    ));
  },

  // Queue consumer: drains ENRICH_QUEUE, enriching jobs in batches. Runs at
  // max_concurrency = 1 (see wrangler.toml) so writes to the single jobs.json
  // blob never interleave. Failed messages retry with a backoff delay; whatever
  // still fails after max_retries is re-enqueued by the next daily cron.
  async queue(batch: MessageBatch<{ id: string }>, env: Env, _ctx: ExecutionContext): Promise<void> {
    const store = await loadStore(env);
    const ids = batch.messages
      .map(m => String(m.body.id))
      .filter(jid => needsEnrich(store.jobs[jid]));
    if (ids.length === 0) {
      batch.ackAll(); // all already enriched / removed — nothing to fetch
      return;
    }
    console.log(`[queue] enriching ${ids.length}/${batch.messages.length} message(s)…`);
    const { failedIds } = await enrichJobs(env, store, ids);
    await saveStore(env, store);
    const failed = new Set(failedIds);
    for (const m of batch.messages) {
      if (failed.has(String(m.body.id))) m.retry({ delaySeconds: 30 });
      else m.ack();
    }
    if (failed.size) console.warn(`[queue] ${failed.size} enrichment(s) failed; will retry`);
  },
};

async function handleIndex(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const cache = caches.default;
  const cached = await cache.match(request);
  if (cached) return cached;

  const head = await env.DATA.head(STORE_KEY);
  if (!head) {
    return new Response(emptyPage('No data has been synced yet.'), {
      status: 503,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }
  const body = await renderPage(env);
  const response = new Response(body, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': `public, max-age=${HTML_CACHE_SECONDS}`,
      // ETag based on the last-modified time of jobs.json so the edge cache
      // invalidates whenever sync writes a new store.
      'etag': `"${head.uploaded.getTime()}"`,
    },
  });
  ctx.waitUntil(cache.put(request, response.clone()));
  return response;
}

async function handleRawJobs(env: Env): Promise<Response> {
  const obj = await env.DATA.get(STORE_KEY);
  if (!obj) return new Response('{}', { status: 503, headers: { 'content-type': 'application/json' } });
  return new Response(obj.body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${HTML_CACHE_SECONDS}`,
    },
  });
}

async function handleSync(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return new Response('use POST', { status: 405 });
  const expected = env.SYNC_TOKEN;
  if (!expected) {
    return new Response('manual sync disabled (set SYNC_TOKEN secret to enable)', { status: 404 });
  }
  const auth = request.headers.get('authorization') ?? '';
  const got = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (got !== expected) return new Response('unauthorized', { status: 401 });

  const url = new URL(request.url);
  const max = url.searchParams.get('max');
  const skipEnrich = url.searchParams.get('skip-enrich') === '1';
  const result = await syncJobs(env, {
    maxEnrich: max ? parseInt(max, 10) : undefined,
    skipEnrich,
    // A listing-only refresh hands enrichment to the queue consumer.
    enqueue: skipEnrich,
    // Skip the listing fetch and spend the whole subrequest budget on
    // enrichment — used to backfill descriptions/salaries directly.
    enrichOnly: url.searchParams.get('enrich-only') === '1',
  });
  return Response.json(result);
}
