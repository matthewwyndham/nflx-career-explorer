import { emptyPage, renderPage } from './render';
import { STORE_KEY } from './store';
import { syncJobs } from './sync';
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
    ctx.waitUntil(syncJobs(env).then(
      r => console.log('[scheduled] sync ok', r),
      e => console.error('[scheduled] sync failed', e),
    ));
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
  const result = await syncJobs(env, {
    maxEnrich: max ? parseInt(max, 10) : undefined,
    skipEnrich: url.searchParams.get('skip-enrich') === '1',
  });
  return Response.json(result);
}
