import type { Env, JobDetail, Store } from './types';

export const STORE_KEY = 'jobs.json';
export const DESC_PREFIX = 'descriptions/';

const DEFAULT_TEAM = 'Engineering';

export async function loadStore(env: Env): Promise<Store> {
  const obj = await env.DATA.get(STORE_KEY);
  if (!obj) return { jobs: {}, last_synced: null, team: env.TEAM ?? DEFAULT_TEAM };
  return (await obj.json()) as Store;
}

export async function saveStore(env: Env, store: Store): Promise<void> {
  await env.DATA.put(STORE_KEY, JSON.stringify(store, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  });
}

export async function saveDescription(env: Env, id: string, detail: JobDetail): Promise<void> {
  await env.DATA.put(`${DESC_PREFIX}${id}.json`, JSON.stringify(detail, null, 2), {
    httpMetadata: { contentType: 'application/json; charset=utf-8' },
  });
}
