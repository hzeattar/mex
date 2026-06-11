// HTTP API client with retry, abort support and lightweight GET de-dup/cache
const BASE = '/api';
const activeControllers = new Set();
const pendingGet = new Map();
const responseCache = new Map();
const transientQueryParams = new Set(['_', 'nocache', 'cacheBust', 'cache_bust']);

function cacheKeyFor(path) {
  const raw = String(path || '');
  if (!raw) return raw;
  try {
    const absolute = /^https?:\/\//i.test(raw);
    const url = absolute ? new URL(raw) : new URL(raw, 'http://local');
    const params = new URLSearchParams(url.search);
    transientQueryParams.forEach((name) => params.delete(name));
    const sorted = [...params.entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) return leftValue.localeCompare(rightValue);
      return leftKey.localeCompare(rightKey);
    });
    const search = sorted.length
      ? `?${sorted.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')}`
      : '';
    return `${absolute ? url.origin : ''}${url.pathname}${search}`;
  } catch (_error) {
    return raw
      .replace(/[?&](?:_|nocache|cacheBust|cache_bust)=[^&]*/g, '')
      .replace(/\?&/, '?')
      .replace(/&&+/g, '&')
      .replace(/[?&]$/, '');
  }
}

function defaultCacheTtl(path) {
  const p = String(path || '');
  if (p.includes('/markets.php')) return 15000;
  if (p.includes('/wallet/summary.php')) return 10000;
  if (p.includes('/trade/portfolio.php')) return 8000;
  if (p.includes('/trade/orders.php')) return 8000;
  if (p.includes('/invest/contracts.php') || p.includes('/signals.php')) return 15000;
  if (p.includes('/quotes.php')) {
    if (p.includes('cache_only=1')) return 3000;
    if (p.includes('purpose=watchlist')) return 1500;
  }
  return 0;
}

export async function api(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET' && !options.body;
  const key = isGet ? cacheKeyFor(path) : '';
  const ttl = isGet ? Math.max(0, Number(options.cacheTtl ?? defaultCacheTtl(path) ?? 0)) : 0;
  const now = Date.now();

  if (isGet && ttl > 0) {
    const cached = responseCache.get(key);
    if (cached && cached.expires > now) return structuredClone(cached.data);
    if (pendingGet.has(key)) return pendingGet.get(key).then((data) => structuredClone(data));
  }

  const request = doFetch(path, { ...options, method });
  if (isGet && ttl > 0) pendingGet.set(key, request);

  try {
    const data = await request;
    if (isGet && ttl > 0) responseCache.set(key, { data: structuredClone(data), expires: Date.now() + ttl });
    return data;
  } finally {
    if (isGet && ttl > 0) pendingGet.delete(key);
  }
}

async function doFetch(path, options = {}) {
  const controller = new AbortController();
  activeControllers.add(controller);
  const onAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', onAbort, { once: true });
  }
  const timeoutMs = options.timeout === 0 ? 0 : Math.max(1000, Number(options.timeout ?? 18000));
  let didTimeout = false;
  const timeout = timeoutMs > 0 ? setTimeout(() => { didTimeout = true; controller.abort(); }, timeoutMs) : null;

  try {
    const url = path.startsWith('http') ? path : `${BASE}${path}`;
    const headers = { 'Accept': 'application/json', ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      credentials: 'same-origin',
      cache: options.cache || 'default',
    });
    if (timeout) clearTimeout(timeout);
    const text = await res.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch (_e) { data = null; }
    }
    if (!res.ok) {
      const err = new Error(data?.error || data?.message || data?.code || `HTTP ${res.status}`);
      err.status = res.status;
      err.code = data?.code || '';
      err.payload = data;
      throw err;
    }
    return data || {};
  } catch (err) {
    if (timeout) clearTimeout(timeout);
    if (err.name === 'AbortError') {
      if (options.retry && options.retry > 0) {
        await sleep(350);
        return doFetch(path, { ...options, retry: options.retry - 1, timeout: Math.max(timeoutMs || 0, 16000) });
      }
      const friendly = new Error(didTimeout ? 'Request timed out. Please try again.' : 'Request was cancelled.');
      friendly.name = 'RequestAbortError';
      friendly.code = didTimeout ? 'timeout' : 'aborted';
      throw friendly;
    }
    if (options.retry && options.retry > 0) {
      await sleep(Math.min(1000 * (4 - options.retry), 3000));
      return doFetch(path, { ...options, retry: options.retry - 1 });
    }
    throw err;
  } finally {
    if (options.signal) options.signal.removeEventListener('abort', onAbort);
    activeControllers.delete(controller);
  }
}

export function abortAll() {
  activeControllers.forEach((c) => c.abort());
  activeControllers.clear();
}

export async function postApi(path, body, options = {}) {
  return api(path, { ...options, method: 'POST', body, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
}

export async function formApi(path, formData, options = {}) {
  const controller = new AbortController();
  activeControllers.add(controller);
  const timeoutMs = options.timeout === 0 ? 0 : Math.max(1000, Number(options.timeout ?? 22000));
  const timeout = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const res = await fetch(`${BASE}${path}`, { method: 'POST', body: formData, signal: controller.signal, credentials: 'same-origin' });
    if (timeout) clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    if (timeout) clearTimeout(timeout);
    activeControllers.delete(controller);
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
