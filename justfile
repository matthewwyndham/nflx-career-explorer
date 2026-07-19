set dotenv-load := true

WORKER := "https://netflix-career-explorer.matthewwyndham.workers.dev"

# Show available recipes (default when running `just`)
default:
    @just --list

# Refresh the listing across all teams (no enrichment). ~48 subrequests.
refresh:
    @curl -sS -X POST -H "Authorization: Bearer $SYNC_TOKEN" "{{ WORKER }}/sync?skip-enrich=1"
    @echo

# Enrich-only backfill: skip the listing, spend the whole budget on enrichment.
# Re-run until `enrichedOk` reads 0 — only un-enriched/updated jobs get picked up.
enrich max="45":
    @curl -sS -X POST -H "Authorization: Bearer $SYNC_TOKEN" "{{ WORKER }}/sync?enrich-only=1&max={{ max }}"
    @echo

# Manually trigger a full sync (listing + enrichment). On the free plan the
# ~48-request listing pass leaves almost no enrichment budget — prefer
# `just refresh` then repeated `just enrich`.
sync max="37":
    @curl -sS -X POST -H "Authorization: Bearer $SYNC_TOKEN" "{{ WORKER }}/sync?max={{ max }}"
    @echo
