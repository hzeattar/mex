// HTTP API client with retry and abort support
const BASE = '/api';
const activeControllers = new Set();

export async function api(path, options = {}) {
  const controller = new AbortController();
  activeControllers.add(controller);
  const onAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', onAbort, { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), options.timeout || 8000);

  try {
    const url = path.startsWith('http') ? path : `${BASE}${path}`;
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: { 'Accept': 'application/json', ...(options.headers || {}) },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      credentials: 'same-origin',
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw err;
    if (options.retry && options.retry > 0) {
      await sleep(Math.min(1000 * (4 - options.retry), 3000));
      return api(path, { ...options, retry: options.retry - 1 });
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
  const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);
  try {
    const res = await fetch(`${BASE}${path}`, { method: 'POST', body: formData, signal: controller.signal, credentials: 'same-origin' });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
    activeControllers.delete(controller);
  }
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
