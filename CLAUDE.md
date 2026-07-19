# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Cloudflare Worker that scrapes Netflix's public jobs API on a daily cron, persists state in an R2 bucket, and serves a self-contained HTML page for browsing, filtering, and searching the listings. By default it scrapes **every** Netflix team (~470 jobs); set the `TEAM` env var to restrict to one. There is no test suite, no linter, no build step — `wrangler` handles bundling and deploy.

## Commands

```
npm run dev          # local Worker on http://localhost:8787
npm run dev:cron     # local Worker with the scheduled() handler exposed at /__scheduled
npm run typecheck    # tsc --noEmit (no other lint/test infra)
npm run deploy       # wrangler deploy
npm run tail         # stream production logs
npm run types        # regenerate worker-configuration.d.ts from wrangler.toml
```

First-time setup (once per Cloudflare account):
```
npx wrangler r2 bucket create netflix-careers-data    # name must match wrangler.toml
npx wrangler secret put SYNC_TOKEN                     # optional; enables POST /sync
```

## HTTP surface (`src/index.ts`)

- `GET /` → renders the HTML page from `jobs.json` in R2. Edge-cached for 10 min; ETag = R2 object's upload time, so a fresh sync invalidates the cache.
- `GET /api/jobs.json` → raw store passthrough.
- `POST /sync?max=N&skip-enrich=1` → manual sync. Requires `Authorization: Bearer $SYNC_TOKEN`; returns 404 if the secret is unset (manual sync disabled).
- `GET /healthz` → `ok`.
- `scheduled()` runs `syncJobs(env)` daily at the cron in `wrangler.toml` (`0 12 * * *` by default).

## Data layout (R2 bucket `DATA`)

- `jobs.json` — single `Store` blob `{ jobs: { [id]: JobRecord }, last_synced, team }`. Whole file rewritten each sync via `saveStore`.
- `descriptions/<numeric_id>.json` — raw detail-API response per job, written by `saveDescription` during enrichment.

`JobRecord` (see `src/types.ts`) carries underscore-prefixed internal fields used by sync bookkeeping: `_status` (`"open"` or `"removed"`), `_first_seen`, `_last_seen`, `_removed_at`, `_enriched_at`, `_enrich_error`, `_salary_low`, `_salary_high`, and `_description_text` (plaintext rendering of `job_description`, inlined so `renderPage` produces the full HTML from a single R2 read instead of N description fetches).

Sync is idempotent and incremental: each run diffs the listing against the cached store. New ids are added with `_status: "open"`; existing open ids have their listing fields overwritten in place (`Object.assign`) so edits propagate daily while history fields survive; ids that disappear from the listing flip to `"removed"` (and stay in the store — that's the removal history); ids that reappear flip back to `"open"`. A job is re-enriched (salary + description refreshed) when `t_update > _enriched_at`.

`store.team` is now a display label (`"All teams"`, or the single team name when `TEAM` is set), not a filter key. Each job's Netflix "team" is its `department` field (verified 1:1 with the API's `Teams` facet); `render.ts` exposes it as `team` on each display record.

## Non-obvious behaviors — preserve these

1. **`isUSARemote` (`src/parsers.ts`) checks the `locations` strings, not `work_location_option`.** The API mislabels USA-Remote jobs as a mix of `onsite` and `remote_local`, so the WLO field is unreliable. The only trustworthy signal is `"USA - Remote"` appearing in `locations`. The page's location filter surfaces both: `USA - Remote` (via `isUSARemote`) and the raw `onsite`/`remote_local` WLO values as separate selectable work-type options.
2. **`PAGE_SIZE = 10` in `src/netflix.ts`** is a hard cap from Netflix's API — passing larger `num` is silently truncated to 10. Don't "optimize" the pagination loop by raising it. `fetchListing(team?)` omits the `Teams` param entirely when no team is given, paging through all teams in one pass; there's a `PAGE_DELAY_MS` gap between pages to stay polite. Enrichment is capped per scheduled run by `ENRICH_PER_RUN` (default 250) so one all-teams run stays under the paid subrequest budget; the daily cron catches up on the rest since un-enriched jobs keep `_enriched_at: null`.
3. **`parseSalary` sanity-checks the range to `30_000 ≤ low ≤ high ≤ 5_000_000`** to skip stray dollar pairs that aren't annual comp. `parseLevels` deliberately ignores numbers in parentheses unless prefixed by `L` (so "Summer 2026" doesn't match as level 6).
4. **`HTML_TEMPLATE` in `src/template.ts`** is a single inline string with five placeholders substituted by `render.ts`: `__TEAM__`, `__LAST_SYNCED__`, `__LAST_SYNCED_TS__`, `__PILLS__`, `__DATA_JSON__`. The page is fully self-contained — no network, no build. The embedded JS reimplements server-side helpers (`fmtSalary`, `fmtLevels`, `shortLoc`, `summarizeLocs`, `isUSARemote`, `daysAgo`, `fmtDate`); **if you change formatting/filtering logic on the server, change the embedded JS too** or the API and the rendered page will disagree. The team dropdown and the location multi-select (a custom checkbox dropdown, inclusive OR) are built **client-side** from the embedded data — no new placeholders. The `≤6mo` toggle (on by default, `SIX_MONTHS = 182d`) hides older postings and also bounds the timeline chart so old events don't skew the axis.
5. **`__DATA_JSON__` is injected with `</` rewritten to `<\/`** to prevent `</script>` injection from job titles or descriptions. Preserve that escape if you touch the injection in `render.ts`.

## Worker-specific concerns

- **Subrequest budget.** Free plan = 50 subrequests per invocation, paid = 1000. Each enrichment is one outbound fetch + one R2 put. `syncJobs` accepts `maxEnrich` to cap a single run; remaining jobs get picked up next cron because their `_enriched_at` stays null. Newest-created jobs are enriched first so the visible page fills in quickly when capped.
- **Concurrency** is fixed at `ENRICH_CONCURRENCY = 6` in `src/sync.ts`.
- **Edge cache** for `/` is keyed on the request URL; `handleIndex` does `cache.match` / `cache.put` against `caches.default`. Bumping the ETag via R2 upload time is the invalidation mechanism.

## Adding a route

Add a `case` to the switch in `src/index.ts` and a handler function. There's no router — the app is small enough that the switch is fine.
