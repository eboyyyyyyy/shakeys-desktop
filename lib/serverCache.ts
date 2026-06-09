type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

declare global {
  var __shakeysApiCache: Map<string, CacheEntry<unknown>> | undefined;
}

const cache = globalThis.__shakeysApiCache ?? new Map<string, CacheEntry<unknown>>();
if (!globalThis.__shakeysApiCache) {
  globalThis.__shakeysApiCache = cache;
}

export async function getOrSetCache<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const existing = cache.get(key) as CacheEntry<T> | undefined;

  if (existing && existing.expiresAt > now) {
    return existing.value;
  }

  const value = await loader();
  cache.set(key, {
    value,
    expiresAt: now + ttlMs,
  });
  return value;
}

export function invalidateCache(key: string) {
  cache.delete(key);
}

export function invalidateCacheByPrefix(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
