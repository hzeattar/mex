let pollTimer = null;
const POLL_MS = 2500;
export function connectSSE(symbols, type, onUpdate, onError) {
  disconnect();
  if (!symbols || !symbols.length) return disconnect;
  startPolling(symbols, type, onUpdate);
  return disconnect;
}
function startPolling(symbols, type, onUpdate) {
  stopPolling();
  const poll = async () => {
    try {
      const url = '/api/quotes.php?symbols=' + encodeURIComponent(symbols.join(',')) + '&type=' + encodeURIComponent(type) + '&visible=1&fresh=1';
      const res = await fetch(url, { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.items && onUpdate) onUpdate(data.items);
      }
    } catch (e) {}
    pollTimer = setTimeout(poll, POLL_MS);
  };
  poll();
}
function stopPolling() { if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; } }
export function disconnect() { stopPolling(); }
export function isConnected() { return pollTimer !== null; }
