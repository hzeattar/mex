// MEX Group Frontend v2 - Main Entry Point
import './styles/main.css';
import { createStore, set, get, subscribe } from './state/store.js';
import { defineRoute, startRouter, navigate } from './router.js';
import { api } from './services/api.js';
import { renderShell } from './components/layout/Shell.js';
import { initI18n, t, translateDom } from './utils/i18n.js';

// Initial state
const initialState = {
  booted: false,
  user: null,
  brand: { name: 'MEX Global', product: 'Trading Platform', tagline: 'Professional trading workspace', logo_url: '/assets/img/mex_global_logo.png' },
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
defineRoute('wallet', () => import('./views/funding.js'));
defineRoute('deposit', () => import('./views/funding.js'));
defineRoute('withdraw', () => import('./views/funding.js'));
defineRoute('funding', () => import('./views/funding.js'));
defineRoute('kyc', () => import('./views/kyc.js'));
defineRoute('invest', () => import('./views/invest.js'));
defineRoute('news', () => import('./views/news.js'));
defineRoute('support', () => import('./views/support.js'));
defineRoute('account', () => import('./views/account.js'));

// Bootstrap
async function boot() {
  const app = document.getElementById('app');

  // Stripe Checkout returns to /app.php?stripe=...&deposit=... (Stripe forbids URL
  // fragments in success_url). Convert that query into the SPA hash route.
  try {
    const sp = new URLSearchParams(window.location.search);
    const stripeRet = sp.get('stripe');
    if (stripeRet) {
      const dep = sp.get('deposit') || '';
      const q = `stripe=${encodeURIComponent(stripeRet)}${dep ? `&deposit=${encodeURIComponent(dep)}` : ''}`;
      window.history.replaceState(null, '', window.location.pathname + `#/wallet?${q}`);
    }
  } catch (_e) {}

  // ── Phase 1: Instant skeleton shell (no API wait) ──────────────────
  try {
    await initI18n();
  } catch (i18nErr) {
    console.warn('[boot] i18n initialization failed:', i18nErr);
  }

  set('booted', true);
  renderShell(app);
  translateDom(app);
  const view = app.querySelector('#view');
  startRouter(view);

  // ── Phase 2: Load i18n + critical data in parallel ─────────────────
  let bootTimedOut = false;
  const safetyTimer = setTimeout(() => {
    bootTimedOut = true;
    console.warn('[boot] Bootstrap took too long');
  }, 15000);

  try {
    translateDom(app);

    // Load bootstrap data (user, wallet, brand, level, kyc)
    let data = null;
    try {
      data = await api('/bootstrap.php', { timeout: 0, retry: 1 });
    } catch (apiErr) {
      console.error('[boot] Bootstrap API failed:', apiErr.message);
      try {
        data = await api('/bootstrap.php', { timeout: 0, retry: 0 });
      } catch (retryErr) {
        console.error('[boot] Bootstrap retry failed:', retryErr.message);
      }
    }

    clearTimeout(safetyTimer);

    if (data && data.ok !== false) {
      set('user', data.user || null);
      const remoteBrand = data.brand || {};
      set('brand', {
        ...get('brand'),
        product: window.__BRAND_PRODUCT || remoteBrand.name || get('brand').product || 'Trading Platform',
        tagline: remoteBrand.tagline || get('brand').tagline,
        name: window.__BRAND_NAME || remoteBrand.name || 'MEX Group',
        support_email: remoteBrand.support_email || get('brand').support_email || '',
        whatsapp_support_url: remoteBrand.whatsapp_support_url || data.support?.whatsapp_url || '',
        logo_url: remoteBrand.logo_url || get('brand').logo_url || '/assets/img/mex_global_logo.png',
        avalon_stats: remoteBrand.avalon_stats || get('brand').avalon_stats || null,
      });
      if (data.support) set('support', { ...get('support'), ...data.support });
      set('wallet', data.wallet || null);
      set('level', data.level || null);
      set('kyc', data.kyc || null);
      if (data.markets) set('markets', data.markets);
    } else if (data && data.ok === false) {
      console.warn('[boot] Bootstrap returned error:', data.error);
    }

    // Re-render with real data
    renderShell(app);
    translateDom(app);
    const view2 = app.querySelector('#view');
    if (view2) startRouter(view2);

    // ── Phase 3: Prefetch next-route data in background ─────────────
    prefetchCommonData();

  } catch (err) {
    if (bootTimedOut) return;
    clearTimeout(safetyTimer);
    console.error('[boot] Fatal error:', err);
    app.innerHTML = `      <div class="min-h-screen flex items-center justify-center p-8">        <div class="card max-w-md text-center space-y-4">          <h1 class="text-xl font-bold text-red">${t('common.connection_failed', 'Connection failed')}</h1>          <p class="text-muted text-sm">${err.message}</p>          <button class="btn-primary" onclick="location.reload()">${t('common.retry', 'Retry')}</button>        </div>      </div>`;
    translateDom(app);
  }
}

/** Pre-warm API cache for pages the user is likely to visit next */
function prefetchCommonData() {
  // Fire and forget - these populate the in-memory cache
  setTimeout(() => {
    api('/trade/portfolio.php', { timeout: 5000 }).catch(() => {});
  }, 2000);
  setTimeout(() => {
    api('/markets.php?type=crypto&purpose=watchlist', { timeout: 5000 }).catch(() => {});
  }, 3000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

export { store, navigate };
