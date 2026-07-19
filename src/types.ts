export interface NetflixPosition {
  id: number;
  display_job_id?: string;
  ats_job_id?: string | number;
  name?: string;
  business_unit?: string;
  department?: string;
  location?: string;
  locations?: string[];
  work_location_option?: string;
  canonicalPositionUrl?: string;
  t_create?: number;
  t_update?: number;
  // The API returns many other fields; we keep them via spread.
  [key: string]: unknown;
}

export interface JobRecord extends NetflixPosition {
  _first_seen?: number;
  _last_seen?: number;
  _status?: 'open' | 'removed';
  _removed_at?: number;
  _enriched_at?: number;
  _enrich_error?: string;
  _salary_low?: number | null;
  _salary_high?: number | null;
  // Plaintext rendering of detail.job_description, inlined here so the page
  // renders from a single R2 read instead of N description files.
  _description_text?: string;
}

export interface Store {
  jobs: Record<string, JobRecord>;
  last_synced: number | null;
  team: string;
}

export interface JobDetail {
  id?: number;
  name?: string;
  job_description?: string;
  business_unit?: string;
  department?: string;
  locations?: string[];
  location?: string;
  work_location_option?: string;
  display_job_id?: string;
  canonicalPositionUrl?: string;
  [key: string]: unknown;
}

export interface SyncResult {
  total: number;
  newCount: number;
  removedCount: number;
  updatedCount: number;
  reappearedCount: number;
  enrichedOk: number;
  enrichedFailed: number;
}

export interface Env {
  DATA: R2Bucket;
  // Queue of job ids awaiting enrichment. The listing cron / manual refresh
  // produces to it; the queue() consumer in index.ts drains it.
  ENRICH_QUEUE: Queue<{ id: string }>;
  // Restrict sync to a single Netflix team (the `Teams` facet value). Unset =
  // sync every team.
  TEAM?: string;
  SYNC_TOKEN?: string;
  // Max jobs to enrich in one direct (non-queue) enrich pass — e.g. the manual
  // `POST /sync?enrich-only=1`. Kept under the free plan's 50-subrequest budget
  // (each enrichment is 1 fetch; retries may add a few). Default 40.
  ENRICH_PER_RUN?: string;
}
