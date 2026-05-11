// Server-Sent Events price stream manager with HTTP polling fallback
let source = null;
let reconnectTimer = null;
let pollTimer = null;
const RECONNECT_MS = 3000;
const POLL_MS = 3000;

export function connectSSE(symbols, type, onUpdate, onError) {
  disconnect();

  if (!symbols || !symbols.length) return disconnect;

  const url = `/api/stream/sse.php?symbols=${encodeURIComponent(symbols.join(','))}&type=${encodeURIComponent(type)}`;

  try {
    source = new EventSource(url);
  } catch (e) {
    // EventSource not supported or URL issue, fall back immediately
    startPolling(symbols, type, onUpdate);
    return disconnect;
  }

  let errorCount = 0;

  source.onmessage = (event) => {
    try {
      errorCount = 0; // Reset on success
      const data = JSON.parse(event.data);
      if (onUpdate) onUpdate(data);
    } catch (e) { /* ignore parse errors */ }
  };

  source.onerror = () => {
    errorCount++;
    if (errorCount >= 3) {
      // SSE failed repeatedly, switch to HTTP polling
      console.warn('SSE failed, switching to HTTP polling');
      disconnect();
      startPolling(symbols, type, onUpdate);
    }
  };

  // If SSE doesn't deliver data within 5s, start polling as backup
  const sseTimeout = setTimeout(() => {
    if (source && source.readyState !== EventSource.OPEN) {
      disconnect();
      startPolling(symbols, type, onUpdate);
    }
  }, 5000);

  return () => {
    clearTimeout(sseTimeout);
    disconnect();
  };
}

function startPolling(symbols, type, onUpdate) {
  stopPolling();
  const poll = async () => {
    try {
      const url = `/api/quotes.php?symbols=${encodeURIComponent(symbols.join(','))}&type=${encodeURIComponent(type)}&visible=1&fresh=1`;
      const res = await fetch(url, { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.items && onUpdate) onUpdate(data.items);
      }
    } catch (e) { /* silent */ }
    pollTimer = setTimeout(poll, POLL_MS);
  };
  poll(); // Immediate first poll
}

function stopPolling() {
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
}

export function disconnect() {
  if (source) { source.close(); source = null; }
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  stopPolling();
}

export function isConnected() {
  return (source && source.readyState === EventSource.OPEN) || pollTimer !== null;
}
