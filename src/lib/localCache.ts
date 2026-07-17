type CacheRecord<T> = {
  ts: number;
  ttl?: number | null;
  value: T;
};

export function setCache<T>(key: string, value: T, ttlMs?: number | null) {
  try {
    const rec: CacheRecord<T> = { ts: Date.now(), ttl: ttlMs ?? null, value };
    localStorage.setItem(key, JSON.stringify(rec));
  } catch (e) {
    // ignore storage errors (e.g., quota)
    // eslint-disable-next-line no-console
    console.warn('setCache error', e);
  }
}

export function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const rec = JSON.parse(raw) as CacheRecord<T> | null;
    if (!rec) return null;
    if (rec.ttl && Date.now() - rec.ts > rec.ttl) {
      try { localStorage.removeItem(key); } catch (_) {}
      return null;
    }
    return rec.value as T;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('getCache error', e);
    return null;
  }
}

export function removeCache(key: string) {
  try { localStorage.removeItem(key); } catch (_) {}
}
