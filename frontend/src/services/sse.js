// Server-Sent Events price stream manager
let source = null;
let reconnectTimer = null;
const RECONNECT_MS = 3000;

export function connectSSE(symbols, type, onUpdate, onError) {
  disconnect();
  const url = `/api/stream/sse.php?symbols=${encodeURIComponent(symbols.join(','))}&type=${encodeURIComponent(type)}`;
  source = new EventSource(url);

  source.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (onUpdate) onUpdate(data);
    } catch (e) { /* ignore parse errors */ }
  };

  source.onerror = () => {
    if (onError) onError();
    scheduleReconnect(symbols, type, onUpdate, onError);
  };

  return disconnect;
}

function scheduleReconnect(symbols, type, onUpdate, onError) {
  disconnect();
  reconnectTimer = setTimeout(() => connectSSE(symbols, type, onUpdate, onError), RECONNECT_MS);
}

export function disconnect() {
  if (source) { source.close(); source = null; }
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
}

export function isConnected() { return source && source.readyState === EventSource.OPEN; }
