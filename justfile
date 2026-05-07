set dotenv-load := true

WORKER := "https://netflix-career-explorer.matthewwyndham.workers.dev"

# Show available recipes (default when running `just`)
default:
    @just --list

# Manually trigger a sync, capping enrichment at 45 jobs (Free-plan subrequest budget).

# Re-run until `enrichedOk` stops growing — only new/updated jobs get enriched.
sync max="37":
    @curl -sS -X POST -H "Authorization: Bearer $SYNC_TOKEN" "{{ WORKER }}/sync?max={{ max }}"
    @echo
