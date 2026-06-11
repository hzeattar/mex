const ICONS = new Set([
  'ada', 'amzn', 'apple', 'arab', 'avax', 'bnb', 'btc', 'crypto', 'doge', 'dot',
  'eth', 'forex', 'future', 'googl', 'link', 'metal', 'microsoft', 'nvda', 'oil',
  'sol', 'stock', 'tsla', 'usdc', 'xrp',
]);

const ALIASES = {
  BTCUSDT: 'btc', BTCUSD: 'btc', ETHUSDT: 'eth', ETHUSD: 'eth', BNBUSDT: 'bnb',
  SOLUSDT: 'sol', XRPUSDT: 'xrp', ADAUSDT: 'ada', DOGEUSDT: 'doge', DOTUSDT: 'dot',
  AVAXUSDT: 'avax', LINKUSDT: 'link', USDCUSDT: 'usdc',
  AAPL: 'apple', MSFT: 'microsoft', NVDA: 'nvda', TSLA: 'tsla', AMZN: 'amzn', GOOGL: 'googl', GOOGLE: 'googl',
  XAUUSD: 'metal', XAGUSD: 'metal', XPTUSD: 'metal', XPDUSD: 'metal',
  USOIL: 'oil', UKOIL: 'oil', BRENT: 'oil', WTI: 'oil', NGAS: 'oil',
};

export function parseMarketMeta(meta) {
  if (!meta) return {};
  if (typeof meta === 'object') return meta;
  try {
    const parsed = JSON.parse(meta);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (_) {
    return {};
  }
}

export function marketIconPath(market, fallbackType = 'crypto') {
  const meta = parseMarketMeta(market?.meta);
  const direct = market?.icon_url || market?.icon || market?.logo || meta.icon_url || meta.icon || meta.logo;
  if (direct) {
    const value = String(direct);
    if (/^(https?:)?\/\//.test(value) || value.startsWith('/')) return value;
    const key = value.replace(/\.svg$/i, '').toLowerCase();
    if (ICONS.has(key)) return `/assets/img/markets/${key}.svg`;
  }

  const symbol = String(market?.symbol || market || '').toUpperCase().replace(/[^A-Z0-9_]/g, '');
  const compact = symbol.replace(/_/g, '');
  const alias = ALIASES[compact] || ALIASES[symbol];
  if (alias && ICONS.has(alias)) return `/assets/img/markets/${alias}.svg`;

  const base = compact.replace(/USDT$|USDC$|USD$|EUR$|GBP$|SAR$/g, '').toLowerCase();
  if (ICONS.has(base)) return `/assets/img/markets/${base}.svg`;

  const type = String(market?.type || market?.market_type || fallbackType || '').toLowerCase();
  if (type === 'commodities') return `/assets/img/markets/${compact.includes('OIL') || compact.includes('NGAS') ? 'oil' : 'metal'}.svg`;
  if (type === 'stocks') return '/assets/img/markets/stock.svg';
  if (type === 'forex') return '/assets/img/markets/forex.svg';
  if (type === 'futures' || type === 'perp') return '/assets/img/markets/future.svg';
  if (type === 'arab') return '/assets/img/markets/arab.svg';
  return '/assets/img/markets/crypto.svg';
}

export function marketInitial(symbol) {
  const value = String(symbol || '--').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return value.slice(0, 2) || '--';
}
