import { api } from './api.js';

let pollTimer = null;
let pollController = null;
let pollSeq = 0;
let eventSource = null;
const DEFAULT_POLL_MS = 2000;

// Delta state: holds the latest snapshot merged with deltas
let deltaState = {}; // symbol -> item
let isDeltaMode = false;

export function connectSSE(symbols, type, onUpdate, onError, options = {}) {
  disconnect();
  if (!symbols || !symbols.length) return disconnect;
  const seq = ++pollSeq;
  const list = normalizedSymbols(symbols, options.maxSymbols || 18);
  if (!list.length) return disconnect;
  if (!options.forcePolling && typeof EventSource === 'function') {
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
  isDeltaMode = true;
  deltaState = {};
  const url = '/api/stream/sse.php?symbols=' + encodeURIComponent(symbols.join(',')) + '&type=' + encodeURIComponent(type) + '&scope=watchlist&_=' + Date.now();
  let opened = false;
  let messageTimer = null;
  const fallbackMs = Math.max(5000, Number(options.fallbackAfter || 5000));
  const switchToPolling = () => {
    if (seq !== pollSeq) return;
    if (messageTimer) {
      clearTimeout(messageTimer);
      messageTimer = null;
    }
    isDeltaMode = false;
    deltaState = {};
    stopEventSource();
    startPolling(symbols, type, onUpdate, onError, seq, options);
  };
  const armMessageWatchdog = () => {
    if (messageTimer) clearTimeout(messageTimer);
    messageTimer = setTimeout(switchToPolling, Math.max(fallbackMs + 2500, 8000));
  };
  let fallbackTimer = setTimeout(() => {
    if (seq !== pollSeq || opened) return;
    switchToPolling();
  }, Math.max(3000, fallbackMs));

  eventSource = new EventSource(url, { withCredentials: true });
  eventSource.addEventListener('open', () => {
    opened = true;
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    armMessageWatchdog();
  });

  // Handle snapshot event (initial full data)
  eventSource.addEventListener('snapshot', (event) => {
    if (seq !== pollSeq) return;
    try {
      const items = JSON.parse(event.data || '[]');
      if (Array.isArray(items) && items.length) {
        const stateItems = [];
        for (const item of items) {
          const sym = String(item.symbol || '').toUpperCase();
          if (sym) {
            deltaState[sym] = item;
            stateItems.push(item);
          }
        }
        if (onUpdate) onUpdate(stateItems);
      }
      armMessageWatchdog();
    } catch (e) {
      if (onError) onError(e);
    }
  });

  // Handle delta event (only changed items)
  eventSource.addEventListener('delta', (event) => {
    if (seq !== pollSeq) return;
    try {
      const items = JSON.parse(event.data || '[]');
      if (Array.isArray(items) && items.length) {
        const mergedItems = [];
        for (const item of items) {
          const sym = String(item.symbol || '').toUpperCase();
          if (sym) {
            deltaState[sym] = Object.assign({}, deltaState[sym] || {}, item);
            mergedItems.push(deltaState[sym]);
          }
        }
        if (onUpdate) onUpdate(mergedItems);
      }
      armMessageWatchdog();
    } catch (e) {
      if (onError) onError(e);
    }
  });

  // Handle legacy message event (backward compat with old SSE endpoint)
  eventSource.addEventListener('message', (event) => {
    if (seq !== pollSeq) return;
    try {
      const items = JSON.parse(event.data || '[]');
      if (Array.isArray(items) && items.length && onUpdate) {
        for (const item of items) {
          const sym = String(item.symbol || '').toUpperCase();
          if (sym) deltaState[sym] = item;
        }
        onUpdate(items);
      }
      armMessageWatchdog();
    } catch (e) {
      if (onError) onError(e);
    }
  });

  eventSource.addEventListener('reconnect', () => {
    if (seq !== pollSeq) return;
    switchToPolling();
  });
  eventSource.addEventListener('error', (event) => {
    if (seq !== pollSeq) return;
    if (onError) onError(event);
    switchToPolling();
  });
}

function startPolling(symbols, type, onUpdate, onError, seq, options) {
  stopPolling();
  isDeltaMode = false;
  deltaState = {};
  const interval = Math.max(1500, Number(options.interval || DEFAULT_POLL_MS));
  const initialDelay = Math.max(0, Number(options.initialDelay || 0));
  const list = normalizedSymbols(symbols, options.maxSymbols || 18);
  const poll = async () => {
    if (seq !== pollSeq) return;
    pollController = new AbortController();
    const timeoutMs = Math.max(3000, Number(options.timeout || 10000));
    const timeout = setTimeout(() => { try { pollController?.abort(); } catch(e){} }, timeoutMs);
    try {
      // Cache-only fast path behind the nginx 1s micro-cache; no cache-buster
      // so concurrent users with the same list share one PHP execution.
      // NOTE: api() prepends '/api' — the old '/api/quotes.php' path here 404'd.
      const url = '/quote_focus.php?symbols=' + encodeURIComponent(list.join(',')) + '&type=' + encodeURIComponent(type);
      const data = await api(url, { timeout: timeoutMs, retry: 0, cacheTtl: 0, cache: 'no-store', signal: pollController.signal });
      if (seq === pollSeq && data && data.items && onUpdate) onUpdate(data.items);
    } catch (e) {
      if (e.name !== 'AbortError' && onError) onError(e);
    } finally {
      clearTimeout(timeout);
      if (seq === pollSeq) pollTimer = setTimeout(poll, interval);
    }
  };
  pollTimer = setTimeout(poll, initialDelay);
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
  isDeltaMode = false;
  deltaState = {};
  stopEventSource();
  stopPolling();
}

export function isConnected() {
  return eventSource !== null || pollTimer !== null;
}

export function getDeltaState() {
  return isDeltaMode ? Object.values(deltaState) : null;
}
