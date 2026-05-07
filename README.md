# netflix-careers-explorer

A Cloudflare Worker that scrapes Netflix's public jobs API on a daily cron, stores the cache in R2, and serves a self-contained HTML page for browsing, filtering, and searching the listings.

## Endpoints

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Rendered HTML page (edge-cached 10 min, ETag-invalidated on sync). |
| `/api/jobs.json` | GET | Raw store passthrough. |
| `/sync?max=N&skip-enrich=1` | POST | Manual sync. Requires `Authorization: Bearer $SYNC_TOKEN`. |
| `/healthz` | GET | Liveness check. |

The cron in `wrangler.toml` runs `scheduled()` once a day (`0 12 * * *`).

## Setup

```sh
npm install
npx wrangler r2 bucket create netflix-careers-data    # match bucket_name in wrangler.toml
npx wrangler secret put SYNC_TOKEN                     # optional, enables POST /sync
```

Set the team you want to track in `wrangler.toml` under `[vars]` (defaults to `Engineering`).

## Develop

```sh
npm run dev          # http://localhost:8787
npm run dev:cron     # also exposes /__scheduled?cron=*+*+*+*+* to fire scheduled()
npm run typecheck
```

On a fresh bucket the page returns 503 until the first sync. Trigger one with `curl -X POST -H "Authorization: Bearer $SYNC_TOKEN" http://localhost:8787/sync`, or hit `/__scheduled` under `dev:cron`.

## Deploy

```sh
npm run deploy
npm run tail         # stream logs
```

## Layout

```
src/
  index.ts      Worker entry: fetch() router + scheduled() cron handler
  sync.ts       Listing fetch, diff vs. cache, enrichment loop
  netflix.ts    Netflix jobs API client (paginated listing + per-job detail)
  parsers.ts    Salary / level / HTML→text / USA-Remote detection
  render.ts     Builds HTML response from the R2 store
  template.ts   Inline HTML/CSS/JS template
  store.ts      R2 read/write helpers
  types.ts      Store, JobRecord, Env
```

R2 keys: `jobs.json` (whole-store blob) and `descriptions/<id>.json` (raw per-job detail).
