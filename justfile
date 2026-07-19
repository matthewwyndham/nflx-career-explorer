set dotenv-load := true

WORKER := "https://netflix-career-explorer.matthewwyndham.workers.dev"

# Show available recipes (default when running `just`)
default:
    @just --list

# Refresh the listing across all teams (~48 subrequests) and enqueue every job
# needing enrichment. The queue consumer then drains it — this is the normal path.
refresh:
    @curl -sS -X POST -H "Authorization: Bearer $SYNC_TOKEN" "{{ WORKER }}/sync?skip-enrich=1"
    @echo

# Direct enrich fallback (bypasses the queue): skip the listing, enrich up to
# `max` jobs inline. Handy if the queue is backed up or you want an immediate pass.
enrich max="45":
    @curl -sS -X POST -H "Authorization: Bearer $SYNC_TOKEN" "{{ WORKER }}/sync?enrich-only=1&max={{ max }}"
    @echo

# Full sync in one invocation (listing + inline enrichment). On the free plan the
# ~48-request listing pass leaves almost no enrichment budget — prefer `just refresh`
# (which enqueues for the consumer). Useful on the paid plan.
sync max="37":
    @curl -sS -X POST -H "Authorization: Bearer $SYNC_TOKEN" "{{ WORKER }}/sync?max={{ max }}"
    @echo
