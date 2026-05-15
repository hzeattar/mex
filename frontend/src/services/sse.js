let pollTimer = null;
let pollController = null;
let pollSeq = 0;
const DEFAULT_POLL_MS = 6500;

export function connectSSE(symbols, type, onUpdate, onError, options = {}) {
  disconnect();
  if (!symbols || !symbols.length) return disconnect;
  const seq = ++pollSeq;
  startPolling(symbols, type, onUpdate, onError, seq, options);
  return disconnect;
}

function startPolling(symbols, type, onUpdate, onError, seq, options) {
  stopPolling();
  const interval = Math.max(4000, Number(options.interval || DEFAULT_POLL_MS));
  const maxSymbols = Math.max(1, Number(options.maxSymbols || 18));
  const list = [...new Set(symbols.map(s => String(s || '').toUpperCase()).filter(Boolean))].slice(0, maxSymbols);
  const poll = async () => {
    if (seq !== pollSeq) return;
    pollController = new AbortController();
    try {
      const url = '/api/quotes.php?symbols=' + encodeURIComponent(list.join(',')) + '&type=' + encodeURIComponent(type) + '&visible=1&purpose=watchlist&_=' + Date.now();
      const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store', signal: pollController.signal });
      if (seq !== pollSeq) return;
      if (res.ok) {
        const data = await res.json();
        if (seq === pollSeq && data && data.items && onUpdate) onUpdate(data.items);
      }
    } catch (e) {
      if (e.name !== 'AbortError' && onError) onError(e);
    } finally {
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

export function disconnect() {
  pollSeq += 1;
  stopPolling();
}

export function isConnected() {
  return pollTimer !== null;
}
