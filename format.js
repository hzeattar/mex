// Formatting utilities
export function money(value, decimals = 2) {
  const n = Number(value || 0);
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e4) return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
  return n.toFixed(decimals);
}

export function price(value, type = 'crypto') {
  const n = Number(value || 0);
  if (n === 0) return '--';
  if (type === 'crypto') {
    if (n >= 1000) return n.toFixed(2);
    if (n >= 1) return n.toFixed(4);
    return n.toFixed(6);
  }
  if (type === 'forex') return n.toFixed(5);
  return n.toFixed(2);
}

export function pct(value) {
  const n = Number(value || 0);
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export function timeAgo(ts) {
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

export function escAttr(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
}

export function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
