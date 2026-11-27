import { API_BASE_URL, API_WITH_CREDENTIALS } from '../../../config/api';
import { authService } from '../../auth/services/authService';

// One memory-only cache for all Admin API adapters. Never persist user data.
type Snapshot = { body: string; status: number; statusText: string; headers: [string, string][] };
type Entry = { value: Snapshot; expires: number };
const cache = new Map<string, Entry>();
const pending = new Map<string, Promise<Snapshot>>();
const MAX_ENTRIES = 128;
const MAX_BODY_CHARS = 500_000;
let scope: string | null = null;
let epoch = 0;
let writes = 0;

function syncScope() {
  const token = authService.getAccessToken();
  if (scope !== token) {
    scope = token;
    invalidateAdminReads();
  }
  return token;
}

/** Invalidate both completed and pending reads; old requests cannot refill the cache. */
export function invalidateAdminReads(prefix?: string) {
  // Bump generation even for targeted invalidation to prevent racing requests
  // from restoring stale entries. Unrelated completed entries remain valid.
  epoch++;
  if (!prefix) { cache.clear(); pending.clear(); return; }
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
  for (const key of pending.keys()) if (key.startsWith(prefix)) pending.delete(key);
}

if (typeof window !== 'undefined') {
  window.addEventListener('droneoptai-session-cleared', () => { scope = null; invalidateAdminReads(); });
  window.addEventListener('storage', event => {
    if (event.key === null || event.key === 'access_token') syncScope();
  });
}

function ttl(path: string): number {
  if (path.startsWith('/system/simulator-config')) return 0;
  if (path.startsWith('/notifications')) return 10_000;
  if (/logs|replacement-requests|parts-requests/.test(path)) return 20_000;
  if (path.startsWith('/payments/')) return 30_000;
  if (/^\/admin\/(fleet|system|dashboard|supplies)/.test(path)) return 30_000;
  return 60_000;
}

function keyFor(path: string) {
  const [base, query = ''] = path.split('?', 2);
  const params = new URLSearchParams(query);
  params.sort();
  return base + (params.size ? '?' + params.toString() : '');
}

function restore(value: Snapshot): Response {
  return new Response([204, 205, 304].includes(value.status) ? null : value.body, {
    status: value.status, statusText: value.statusText, headers: value.headers,
  });
}

async function send(path: string, init: RequestInit, token: string | null): Promise<Response> {
  const run = (access: string | null) => {
    const headers = new Headers(init.headers);
    if (access) headers.set('Authorization', `Bearer ${access}`);
    else headers.delete('Authorization');
    return fetch(`${API_BASE_URL}${path}`, {
      ...init, headers, credentials: API_WITH_CREDENTIALS ? 'include' : 'omit', cache: 'no-store',
    });
  };
  let response = await run(token);
  if (response.status === 401 && token) {
    // A different request may already have renewed this session's token.
    const renewed = await authService.refreshAccessToken(token);
    if (renewed) response = await run(renewed);
    // Do not replay a request with another login's credentials.
  }
  return response;
}

/** JSON reads share a short TTL and a single in-flight request per exact query. */
export async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = syncScope();
  const method = (init.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    writes++;
    invalidateAdminReads(path.startsWith('/notifications') ? '/notifications' : undefined);
    try { return await send(path, init, token); }
    finally {
      writes--;
      invalidateAdminReads(path.startsWith('/notifications') ? '/notifications' : undefined);
    }
  }
  const headers = new Headers(init.headers);
  const duration = ttl(path);
  // All existing adapters send Accept: application/json (CSV deliberately bypasses).
  const jsonRead = method === 'GET' && !!token && duration > 0 && !init.signal && !init.body &&
    (headers.get('Accept') ?? 'application/json') === 'application/json' && !headers.has('Range');
  if (!jsonRead || writes > 0) return send(path, init, token);
  const key = keyFor(path);
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) {
    cache.delete(key); cache.set(key, entry); // LRU
    return restore(entry.value);
  }
  cache.delete(key);
  const existing = pending.get(key);
  if (existing) return restore(await existing);
  const generation = epoch;
  const task = (async (): Promise<Snapshot> => {
    const response = await send(path, init, token);
    const body = await response.text();
    const responseHeaders: [string, string][] = [];
    response.headers.forEach((value, name) => responseHeaders.push([name, value]));
    const value = { body, status: response.status, statusText: response.statusText, headers: responseHeaders };
    // A token change, mutation, logout or explicit refresh invalidates old reads.
    if (response.ok && generation === epoch && token === authService.getAccessToken() && writes === 0 && body.length <= MAX_BODY_CHARS) {
      try {
        JSON.parse(body); // Do not cache malformed/HTML error responses.
        cache.set(key, { value, expires: Date.now() + duration });
        if (cache.size > MAX_ENTRIES) {
          const oldest = cache.keys().next().value;
          if (oldest !== undefined) cache.delete(oldest);
        }
      } catch { /* Preserve the adapter's original response/error handling. */ }
    }
    return value;
  })();
  pending.set(key, task);
  try { return restore(await task); }
  finally { if (pending.get(key) === task) pending.delete(key); }
}
