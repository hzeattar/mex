import { api } from './api.js';

let pollTimer = null;
let pollController = null;
let pollSeq = 0;
let eventSource = null;
const DEFAULT_POLL_MS = 3000;

export function connectSSE(symbols, type, onUpdate, onError, options = {}) {
  disconnect();
  if (!symbols || !symbols.length) return disconnect;
  const seq = ++pollSeq;
  const list = normalizedSymbols(symbols, options.maxSymbols || 18);
  if (!list.length) return disconnect;
  if (typeof EventSource === 'function') {
    startEventSource(list, type, onUpdate, onError, seq, options);
  } else {
    startPolling(list, type, onUpdate, onError, seq, options);
  }
  return disconnect;
}

function normalizedSymbols(symbols, maxSymbols) {
  const max = Math.max(1, Number(maxSymbols || 18));
  return [...new Set((symbols || []).map(s => String(s || '').toUpperCase()).filter(Boolean))].slice(0, max);
}

function startEventSource(symbols, type, onUpdate, onError, seq, options) {
  stopEventSource();
  const url = '/api/stream/sse.php?symbols=' + encodeURIComponent(symbols.join(',')) + '&type=' + encodeURIComponent(type) + '&scope=watchlist';
  let opened = false;
  let fallbackTimer = setTimeout(() => {
    if (seq !== pollSeq || opened) return;
    stopEventSource();
    startPolling(symbols, type, onUpdate, onError, seq, options);
  }, Math.max(3000, Number(options.fallbackAfter || 5000)));

  eventSource = new EventSource(url, { withCredentials: true });
  eventSource.addEventListener('open', () => {
    opened = true;
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
  });
  eventSource.addEventListener('message', (event) => {
    if (seq !== pollSeq) return;
    try {
      const items = JSON.parse(event.data || '[]');
      if (Array.isArray(items) && items.length && onUpdate) onUpdate(items);
    } catch (e) {
      if (onError) onError(e);
    }
  });
  eventSource.addEventListener('reconnect', () => {
    if (seq !== pollSeq) return;
    stopEventSource();
    startPolling(symbols, type, onUpdate, onError, seq, options);
  });
  eventSource.addEventListener('error', (event) => {
    if (seq !== pollSeq) return;
    if (onError) onError(event);
    stopEventSource();
    startPolling(symbols, type, onUpdate, onError, seq, options);
  });
}

function startPolling(symbols, type, onUpdate, onError, seq, options) {
  stopPolling();
  const interval = Math.max(1500, Number(options.interval || DEFAULT_POLL_MS));
  const list = normalizedSymbols(symbols, options.maxSymbols || 18);
  const poll = async () => {
    if (seq !== pollSeq) return;
    pollController = new AbortController();
    const timeoutMs = Math.max(3000, Number(options.timeout || 15000));
    const timeout = setTimeout(() => pollController?.abort(), timeoutMs);
    try {
      const url = '/api/quotes.php?symbols=' + encodeURIComponent(list.join(',')) + '&type=' + encodeURIComponent(type) + '&visible=1&purpose=watchlist&_=' + Date.now();
      const data = await api(url, { timeout: timeoutMs, retry: 0, cacheTtl: 500, cache: 'no-store', signal: pollController.signal });
      if (seq === pollSeq && data && data.items && onUpdate) onUpdate(data.items);
    } catch (e) {
      if (e.name !== 'AbortError' && onError) onError(e);
    } finally {
      clearTimeout(timeout);
      if (seq === pollSeq) pollTimer = setTimeout(poll, interval);
    }
  };
  poll();
}

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  if (pollController) {
    pollController.abort();
    pollController = null;
  }
}

function stopEventSource() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

export function disconnect() {
  pollSeq += 1;
  stopEventSource();
  stopPolling();
}

export function isConnected() {
  return eventSource !== null || pollTimer !== null;
}
