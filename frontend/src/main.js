// VertexPluse Frontend v2 - Main Entry Point
import './styles/main.css';
import { createStore, set, get, subscribe } from './state/store.js';
import { defineRoute, startRouter, navigate } from './router.js';
import { api } from './services/api.js';
import { renderShell } from './components/layout/Shell.js';

// Initial state
const initialState = {
  booted: false,
  user: null,
  brand: { name: 'VertexPluse', tagline: 'Professional trading workspace' },
  mode: localStorage.getItem('vp_mode') || 'demo',
  route: 'home',
  // Markets
  type: localStorage.getItem('vp_type') || 'crypto',
  symbol: localStorage.getItem('vp_symbol') || 'BTCUSDT',
  market: localStorage.getItem('vp_market') || 'spot',
  tf: localStorage.getItem('vp_tf') || '1m',
  marketTab: localStorage.getItem('vp_tab') || 'crypto',
  search: '',
  markets: {},
  activeQuote: null,
  visibleQuotes: {},
  // Trading
  orderType: 'MARKET',
  amount: 100,
  leverage: 10,
  portfolio: null,
  orders: [],
  // Finance
  wallet: null,
  finance: { deposits: [], withdrawals: [] },
  kyc: null,
  level: null,
  // Earn
  invest: { tab: 'copy', signals: [], copies: [], contracts: [], mine: [] },
  // Other
  news: { items: [], loaded: false },
  support: { items: [] },
  notifications: { items: [], unread: 0, open: false },
};

const store = createStore(initialState);

// Register routes (lazy-loaded)
defineRoute('home', () => import('./views/home.js'));
defineRoute('trade', () => import('./views/trade.js'));
defineRoute('portfolio', () => import('./views/portfolio.js'));
defineRoute('wallet', () => import('./views/wallet.js'));
defineRoute('deposit', () => import('./views/funding.js'));
defineRoute('withdraw', () => import('./views/funding.js'));
defineRoute('kyc', () => import('./views/kyc.js'));
defineRoute('invest', () => import('./views/invest.js'));
defineRoute('news', () => import('./views/news.js'));
defineRoute('support', () => import('./views/support.js'));
defineRoute('account', () => import('./views/account.js'));

// Bootstrap
async function boot() {
  const app = document.getElementById('app');
  try {
    const data = await api('/bootstrap.php', { timeout: 9000 });
    if (!data || data.ok === false) throw new Error(data?.error || 'Bootstrap failed');

    set('user', data.user || null);
    set('brand', { ...get('brand'), ...(data.brand || {}) });
    set('wallet', data.wallet || null);
    set('level', data.level || null);
    set('kyc', data.kyc || null);
    if (data.markets) set('markets', data.markets);
    set('booted', true);

    // Render shell
    renderShell(app);

    // Start router
    const view = app.querySelector('#view');
    await startRouter(view);
  } catch (err) {
    app.innerHTML = `
      <div class="min-h-screen flex items-center justify-center p-8">
        <div class="card max-w-md text-center space-y-4">
          <h1 class="text-xl font-bold text-red">Connection Failed</h1>
          <p class="text-muted text-sm">${err.message}</p>
          <button class="btn-primary" onclick="location.reload()">Retry</button>
        </div>
      </div>`;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

export { store, navigate };
